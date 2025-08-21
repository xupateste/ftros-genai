import re
# from datetime import datetime
import pandas as pd
import numpy as np
# from typing import Optional,  # Necesario para Optional
from typing import Optional, Dict, Any, Tuple, List # Any para pd.ExcelWriter
from datetime import datetime # Para pd.Timestamp.now()
from dateutil.relativedelta import relativedelta
from audit_knowledge_base import AUDIT_KNOWLEDGE_BASE
from report_config import REPORTS_CONFIG

# Narrative Filters
INCLUDE_CODES = [
    re.compile(r'DEBIT CARD PURCHASE', re.IGNORECASE), # debit card purchases from checking account
    re.compile(r'EFTPOS DEBIT', re.IGNORECASE), # checking account debit transaction via Beem
    re.compile(r'EFTPOS CREDIT', re.IGNORECASE), # checking account credit transactions via Beem
]

REMOVE_KEYWORDS = ['DEBIT', 'CARD', 'PURCHASE', 'EFTPOS', 'CREDIT']

# Define keyword-to-category mappings
CATEGORY_KEYWORDS = {
    "speedway": "Fuel / Transport",
    "opal": "Fuel / Transport",
    "dentistry": "Health / Personal Care",
    "allans": "Health / Personal Care",
    "woolworths": "Groceries",
    "coles": "Groceries",
    "parking": "Fuel / Transport",
    "beem": "University / Societies (Beem)",
    "tennis": "Sport / Exercise",
    "golf": "Sport / Exercise",
    "mcdonalds": "Food / Takeout",
    "yo-chi": "Food / Takeout",
    "guzman": "Food / Takeout",
    "supermarket": "Groceries",
}

def is_valid_expense(narrative):
    narrative_upper = narrative.upper()
    return any(label.search(narrative_upper) for label in INCLUDE_CODES)

def clean_narrative(narrative):
    # Handle Beem case
    narrative_upper = narrative.upper()
    if "BEEM" in narrative_upper:
        if "EFTPOS CREDIT" in narrative_upper:
            return "Beem Credit"
        elif "EFTPOS DEBIT" in narrative_upper:
            return "Beem Debit"
        else:
            return "Beem"
    
    # Handle regular case
    for word in REMOVE_KEYWORDS:
        narrative = re.sub(r'\b' + word + r'\b', '', narrative, flags=re.IGNORECASE)
    return re.sub(r'\s+', ' ', narrative).strip()

def standardise_categories(df):
    if 'Category' not in df.columns:
        return df

    def match_category(original):
        # check for empty record
        if pd.isna(original):
            return original
        # convert category value to a string
        text = str(original).lower()
        for keyword, mapped_category in CATEGORY_KEYWORDS.items():
            if re.search(rf"\b{re.escape(keyword)}\b", text):
                return mapped_category
        return 'General / Miscellaneous';

    df['Category'] = df['Category'].apply(match_category)
    return df

def get_top_expenses_by_month(df):
    if df.empty:
        return {}

    df['Month'] = pd.to_datetime(df['Date']).dt.to_period('M').astype(str)
    monthly_top_expenses = {}

    for month, group in df.groupby('Month'):
        top_3 = group.sort_values(by='Amount', ascending=False).head(3)
        monthly_top_expenses[month] = top_3[['Date', 'Category', 'Amount']].to_dict(orient='records')

    return monthly_top_expenses


def process_csv(df):
    records = []
    
    if {'Date', 'Narrative', 'Debit Amount', 'Credit Amount'}.issubset(df.columns):
        format_type = 'westpac'
    elif {'Date', 'Description', 'Amount'}.issubset(df.columns):
        format_type = 'simple'
    else:
        raise ValueError("Unrecognized CSV format")

    for _, row in df.iterrows():
        try:
            date_str = row['Date']
            date = datetime.strptime(date_str, "%d/%m/%Y")
        except Exception:
            continue  # skip rows with bad dates

        if format_type == 'westpac':
            narrative = row['Narrative']
            if not is_valid_expense(narrative):
                continue
            debit = float(row['Debit Amount']) if pd.notna(row['Debit Amount']) else 0.0
            credit = float(row['Credit Amount']) if pd.notna(row['Credit Amount']) else 0.0
            amount = debit if debit > 0 else -credit
            cleaned_narrative = clean_narrative(narrative)

        elif format_type == 'simple':
            narrative = row['Description']
            if not is_valid_expense(narrative):
                continue
            amount = float(row['Amount'])
            cleaned_narrative = clean_narrative(narrative)
            debit = amount if amount > 0 else 0.0
            credit = -amount if amount < 0 else 0.0

        records.append({
            'Date': date,
            'Category': cleaned_narrative,
            'Debit': debit,
            'Credit': credit,
            'Amount': amount,
        })

    processed_df = pd.DataFrame(records)

    # Enrich with time periods
    processed_df['WeekStart'] = processed_df['Date'].dt.to_period('W').apply(lambda r: r.start_time)
    processed_df['MonthStart'] = processed_df['Date'].dt.to_period('M').apply(lambda r: r.start_time)
    processed_df['Week'] = processed_df['WeekStart'].dt.strftime('%d %b %Y')
    processed_df['Month'] = processed_df['MonthStart'].dt.strftime('%B %Y')

    return processed_df

# ===================================================
# ===================================================
# ===================================================
# ===================================================
# ============== INICIO: FULL REPORTES ==============
# ===================================================

def process_csv_abc(
    df_ventas: pd.DataFrame,
    df_inventario: pd.DataFrame,
    criterio_abc: str,
    periodo_abc: int,
    # --- CAMBIO CLAVE: Recibimos los scores en lugar de los pesos ---
    score_ventas: int = 8,
    score_ingreso: int = 6,
    score_margen: int = 4,
    # Mantenemos pesos_combinado por si se usa en otro lugar, pero priorizamos los scores
    # pesos_combinado: Optional[Dict[str, float]] = None,
    filtro_categorias: Optional[List[str]] = None,
    filtro_marcas: Optional[List[str]] = None,
    **kwargs # Acepta argumentos extra para compatibilidad
) -> Dict[str, Any]:
    """
    Procesa los datos para realizar un análisis ABC, ahora calculando los
    pesos para el criterio 'combinado' a partir de los scores de la estrategia.
    """

    # --- 1. Limpieza Inicial de Nombres de Columnas ---
    df_ventas.columns = df_ventas.columns.str.strip()
    df_inventario.columns = df_inventario.columns.str.strip()

    # Verificar columnas requeridas en df_ventas
    required_sales_cols = ['SKU / Código de producto', 'Nombre del producto', 'Fecha de venta', 'Cantidad vendida', 'Precio de venta unitario (S/.)']
    for col in required_sales_cols:
        if col not in df_ventas.columns:
            raise ValueError(f"Columna requerida '{col}' no encontrada en el archivo de ventas.")

    # Verificar columnas requeridas en df_inventario
    required_inventory_cols = ['SKU / Código de producto', 'Precio de compra actual (S/.)', 'Categoría', 'Subcategoría', 'Marca', 'Cantidad en stock actual']
    for col in required_inventory_cols:
        if col not in df_inventario.columns:
            raise ValueError(f"Columna requerida '{col}' no encontrada en el archivo de inventario.")

    # --- 2. Conversión de Tipos y Filtrado por Período ---
    try:
        df_ventas['Fecha de venta'] = pd.to_datetime(df_ventas['Fecha de venta'], format='%d/%m/%Y', errors='coerce')
    except Exception as e:
        raise ValueError(f"Error al convertir 'Fecha de venta' a datetime: {e}. Asegúrate que el formato sea reconocible.")
    
    df_ventas.dropna(subset=['Fecha de venta'], inplace=True) # Eliminar filas donde la fecha no se pudo convertir

    if periodo_abc > 0:
        try:
            cutoff_date = pd.Timestamp.now(tz='UTC').normalize() - pd.DateOffset(months=periodo_abc)
            # Asegurarse que 'Fecha de venta' también sea tz-aware (o naive si cutoff_date es naive) para la comparación
            df_ventas['Fecha de venta'] = df_ventas['Fecha de venta'].dt.tz_convert(None) if df_ventas['Fecha de venta'].dt.tz is not None else df_ventas['Fecha de venta']
            cutoff_date = cutoff_date.tz_convert(None) if cutoff_date.tz is not None else cutoff_date

            df_ventas = df_ventas[df_ventas['Fecha de venta'] >= cutoff_date].copy() # Usar .copy() para evitar SettingWithCopyWarning
        except Exception as e:
            raise ValueError(f"Error al filtrar por período: {e}")


    if df_ventas.empty:
        return pd.DataFrame(columns=required_sales_cols + ['Categoría', 'Subcategoría', '% Participación', '% Acumulado', 'Clasificación ABC'])


    # --- 3. Pre-cómputo de Métricas y Merge ---
    df_ventas['Precio de venta unitario (S/.)'] = pd.to_numeric(df_ventas['Precio de venta unitario (S/.)'], errors='coerce').fillna(0)
    df_ventas['Cantidad vendida'] = pd.to_numeric(df_ventas['Cantidad vendida'], errors='coerce').fillna(0)
    df_ventas['Venta total'] = df_ventas['Cantidad vendida'] * df_ventas['Precio de venta unitario (S/.)']

    # Seleccionar y limpiar df_inventario
    df_inventario_subset = df_inventario[required_inventory_cols].copy()
    df_inventario_subset['Precio de compra actual (S/.)'] = pd.to_numeric(df_inventario_subset['Precio de compra actual (S/.)'], errors='coerce').fillna(0)
    df_inventario_subset.drop_duplicates(subset=['SKU / Código de producto'], inplace=True)

    # Asegurar que SKU sea string para el merge
    df_ventas['SKU / Código de producto'] = df_ventas['SKU / Código de producto'].astype(str)
    df_inventario_subset['SKU / Código de producto'] = df_inventario_subset['SKU / Código de producto'].astype(str)

    df_merged = pd.merge(df_ventas, df_inventario_subset, on='SKU / Código de producto', how='left')
    
    # Llenar NaN en Categoría/Subcategoría después del merge
    df_merged['Categoría'] = df_merged['Categoría'].fillna('Desconocida')
    df_merged['Subcategoría'] = df_merged['Subcategoría'].fillna('Desconocida')
    df_merged['Precio de compra actual (S/.)'] = df_merged['Precio de compra actual (S/.)'].fillna(0)


    df_merged['Margen unitario'] = df_merged['Precio de venta unitario (S/.)'] - df_merged['Precio de compra actual (S/.)']
    df_merged['Margen total'] = df_merged['Margen unitario'] * df_merged['Cantidad vendida']

    # --- 4. Agrupar por Producto y Agregar Métricas ---
    agg_funcs = {
        'Venta total': 'sum',
        'Cantidad vendida': 'sum',
        'Margen total': 'sum',
        'Categoría': 'first', # Tomar la primera categoría (debería ser única por SKU)
        'Subcategoría': 'first', # Tomar la primera subcategoría
        'Marca': 'first',
        'Cantidad en stock actual': 'first'
    }
    ventas_agrupadas = df_merged.groupby(
        ['SKU / Código de producto', 'Nombre del producto'], as_index=False
    ).agg(agg_funcs)

    if ventas_agrupadas.empty:
         return pd.DataFrame() # Devolver DataFrame vacío si no hay datos agrupados


    # --- 5. Determinar y Calcular `valor_criterio` para ABC ---
    columna_criterio_display_name = "" # Nombre para mostrar en el Excel

    if criterio_abc == 'ingresos':
        ventas_agrupadas['valor_criterio'] = ventas_agrupadas['Venta total']
        columna_criterio_display_name = 'Venta Total (S/.)'
    elif criterio_abc == 'unidades':
        ventas_agrupadas['valor_criterio'] = ventas_agrupadas['Cantidad vendida']
        columna_criterio_display_name = 'Cantidad Vendida (Und)'
    elif criterio_abc == 'margen':
        ventas_agrupadas['valor_criterio'] = ventas_agrupadas['Margen total']
        columna_criterio_display_name = 'Margen Total (S/.)'
    elif criterio_abc == 'combinado':
        total_scores = score_ventas + score_ingreso + score_margen
        if total_scores == 0: # Evitar división por cero
            pesos_calculados = {'unidades': 0.33, 'ingresos': 0.33, 'margen': 0.34}
        else:
            pesos_calculados = {
                'unidades': score_ventas / total_scores,
                'ingresos': score_ingreso / total_scores,
                'margen': score_margen / total_scores
            }

        # if not pesos_combinado or not all(k in pesos_combinado for k in ['ingresos', 'margen', 'unidades']):
        #     raise ValueError("Pesos para criterio combinado no provistos o incompletos.")
        
        # Normalización Min-Max para cada métrica
        for col_norm in ['Venta total', 'Cantidad vendida', 'Margen total']:
            min_val = ventas_agrupadas[col_norm].min()
            max_val = ventas_agrupadas[col_norm].max()
            if (max_val - min_val) == 0: # Evitar división por cero si todos los valores son iguales
                ventas_agrupadas[f'{col_norm}_norm'] = 0.5 if max_val != 0 else 0 # O 0 o 1, dependiendo del caso
            else:
                ventas_agrupadas[f'{col_norm}_norm'] = (ventas_agrupadas[col_norm] - min_val) / (max_val - min_val)
        
        ventas_agrupadas['valor_criterio'] = (
            pesos_calculados['ingresos'] * ventas_agrupadas['Venta total_norm'] +
            pesos_calculados['margen'] * ventas_agrupadas['Margen total_norm'] +
            pesos_calculados['unidades'] * ventas_agrupadas['Cantidad vendida_norm']
        )
        columna_criterio_display_name = 'Valor Ponderado (Estrategia)'
    else:
        raise ValueError(f"Criterio ABC '{criterio_abc}' no reconocido.")

    # --- 6. Clasificación ABC ---
    ventas_agrupadas = ventas_agrupadas.sort_values(by='valor_criterio', ascending=False, ignore_index=True)
    
    total_valor_criterio = ventas_agrupadas['valor_criterio'].sum()
    if total_valor_criterio == 0: # Evitar división por cero si todos los valores del criterio son 0
        ventas_agrupadas['% Participación'] = 0.0
    else:
        ventas_agrupadas['% Participación'] = 100 * ventas_agrupadas['valor_criterio'] / total_valor_criterio
    
    ventas_agrupadas['% Acumulado'] = ventas_agrupadas['% Participación'].cumsum()

    def clasificar_abc(porcentaje_acumulado: float) -> str:
        if porcentaje_acumulado <= 80:
            return 'A'
        elif porcentaje_acumulado <= 95:
            return 'B'
        else:
            return 'C'
    ventas_agrupadas['Clasificación ABC'] = ventas_agrupadas['% Acumulado'].apply(clasificar_abc)

    # --- 7. Selección Final de Columnas y Renombrado ---
    # Renombrar la columna 'valor_criterio' a su nombre descriptivo
    ventas_agrupadas.rename(columns={'valor_criterio': columna_criterio_display_name}, inplace=True)

    columnas_finales = [
        'SKU / Código de producto',
        'Nombre del producto',
        'Categoría',
        'Subcategoría',
        'Marca',
        'Cantidad en stock actual',
        columna_criterio_display_name, # La métrica principal del ABC
    ]
    # Añadir otras métricas relevantes para contexto, si no son la principal
    if 'Venta total' not in ventas_agrupadas.columns and 'Venta Total (S/.)' != columna_criterio_display_name :
         ventas_agrupadas.rename(columns={'Venta total': 'Venta Total (S/.)'}, inplace=True) # Renombrar para consistencia
         if 'Venta Total (S/.)' not in columnas_finales: columnas_finales.append('Venta Total (S/.)')
    elif 'Venta total' in ventas_agrupadas.columns and 'Venta Total (S/.)' != columna_criterio_display_name:
         ventas_agrupadas.rename(columns={'Venta total': 'Venta Total (S/.)'}, inplace=True)
         if 'Venta Total (S/.)' not in columnas_finales: columnas_finales.append('Venta Total (S/.)')


    if 'Cantidad vendida' not in ventas_agrupadas.columns and 'Cantidad Vendida (Und)' != columna_criterio_display_name:
        ventas_agrupadas.rename(columns={'Cantidad vendida': 'Cantidad Vendida (Und)'}, inplace=True)
        if 'Cantidad Vendida (Und)' not in columnas_finales: columnas_finales.append('Cantidad Vendida (Und)')
    elif 'Cantidad vendida' in ventas_agrupadas.columns and 'Cantidad Vendida (Und)' != columna_criterio_display_name:
        ventas_agrupadas.rename(columns={'Cantidad vendida': 'Cantidad Vendida (Und)'}, inplace=True)
        if 'Cantidad Vendida (Und)' not in columnas_finales: columnas_finales.append('Cantidad Vendida (Und)')


    if 'Margen total' not in ventas_agrupadas.columns and 'Margen Total (S/.)' != columna_criterio_display_name:
        ventas_agrupadas.rename(columns={'Margen total': 'Margen Total (S/.)'}, inplace=True)
        if 'Margen Total (S/.)' not in columnas_finales: columnas_finales.append('Margen Total (S/.)')
    elif 'Margen total' in ventas_agrupadas.columns and 'Margen Total (S/.)' != columna_criterio_display_name:
        ventas_agrupadas.rename(columns={'Margen total': 'Margen Total (S/.)'}, inplace=True)
        if 'Margen Total (S/.)' not in columnas_finales: columnas_finales.append('Margen Total (S/.)')


    columnas_finales.extend(['% Participación', '% Acumulado', 'Clasificación ABC'])
    
    # Asegurar que todas las columnas existan y eliminar duplicados si los hubiera
    columnas_existentes = [col for col in columnas_finales if col in ventas_agrupadas.columns]
    resultado = ventas_agrupadas[list(dict.fromkeys(columnas_existentes))].copy() # Usar dict.fromkeys para mantener orden y unicidad

    # Formatear columnas numéricas a dos decimales para la salida Excel
    cols_to_format = [col for col in [columna_criterio_display_name, 'Venta Total (S/.)', 'Margen Total (S/.)', '% Participación', '% Acumulado'] if col in resultado.columns]
    for col in cols_to_format:
        resultado[col] = resultado[col].round(2)
    if 'Cantidad Vendida (Und)' in resultado.columns:
        resultado['Cantidad Vendida (Und)'] = resultado['Cantidad Vendida (Und)'].round(0).astype(int)

    if filtro_categorias and "Categoría" in resultado.columns:
        resultado = resultado[resultado["Categoría"].isin(filtro_categorias)]
    if filtro_marcas and "Marca" in resultado.columns:
        resultado = resultado[resultado["Marca"].isin(filtro_marcas)]
    
    # print(f"filtro_categorias {filtro_categorias}")

    # --- PASO 8: CÁLCULO DE KPIs Y RESUMEN ---
    
    # Calculamos la distribución para el insight
    total_productos = len(resultado)
    productos_a = resultado[resultado['Clasificación ABC'] == 'A']
    productos_c = resultado[resultado['Clasificación ABC'] == 'C']
    
    porcentaje_skus_a = (len(productos_a) / total_productos * 100) if total_productos > 0 else 0
    porcentaje_skus_c = (len(productos_c) / total_productos * 100) if total_productos > 0 else 0
    
    # Usamos la columna del criterio principal para el valor
    col_valor = columna_criterio_display_name
    porcentaje_valor_a = (productos_a[col_valor].sum() / resultado[col_valor].sum() * 100) if resultado[col_valor].sum() > 0 else 0
    porcentaje_valor_c = (productos_c[col_valor].sum() / resultado[col_valor].sum() * 100) if resultado[col_valor].sum() > 0 else 0

    insight_text = (
        f"Tu inventario se distribuye así: "
        f"el {porcentaje_skus_a:.0f}% de tus productos (Clase A) generan el {porcentaje_valor_a:.0f}% de tu valor, "
        f"mientras que el {porcentaje_skus_c:.0f}% de tus productos (Clase C) solo aportan el {porcentaje_valor_c:.0f}%."
    )
    if total_productos == 0:
        insight_text = "No se encontraron datos de ventas para realizar el análisis ABC con los filtros seleccionados."

    kpis = {
        "SKUs Clase A (Vitales)": len(productos_a),
        f"% del Valor (Clase A)": f"{porcentaje_valor_a:.1f}%",
        "SKUs Clase C (Triviales)": len(productos_c),
        f"% del Valor (Clase C)": f"{porcentaje_valor_c:.1f}%"
    }

    # --- PASO 9: LIMPIEZA FINAL PARA JSON ---
    if not resultado.empty:
        resultado = resultado.replace([np.inf, -np.inf], np.nan).where(pd.notna(resultado), None)

    # --- FIN DE LA NUEVA LÓGICA ---

    # Devolvemos la estructura de diccionario estandarizada
    return {
        "data": resultado,
        "summary": {
            "insight": insight_text,
            "kpis": kpis
        }
    }


def generar_reporte_maestro_inventario(
    df_ventas: pd.DataFrame,
    df_inventario: pd.DataFrame,
    # Parámetros que vienen de la UI y la estrategia del usuario
    criterio_abc: str = 'margen',
    periodo_abc: int = 6,
    dias_sin_venta_muerto: int = 180,
    # meses_analisis: Optional[int] = 1,
    meses_analisis_salud: int = 3,
    # Pesos para el criterio combinado (se obtienen de la estrategia)
    score_ventas: int = 8,
    score_ingreso: int = 6,
    score_margen: int = 4,
    # score_dias_venta: int = 2,
    ordenar_por: str = 'prioridad',
    incluir_solo_categorias: Optional[List[str]] = None,
    incluir_solo_marcas: Optional[List[str]] = None,
    filtro_skus: Optional[List[str]] = None,
    **kwargs
) -> Dict[str, Any]:
    """
    Genera un reporte maestro 360° del inventario, combinando análisis ABC,
    diagnóstico de salud (stock muerto/exceso) y métricas clave de rendimiento.
    """
    print("Iniciando generación de Reporte Maestro de Inventario...")
    
    sku_col = 'SKU / Código de producto'
    
    # Forzamos la columna de unión a ser string
    df_ventas[sku_col] = df_ventas[sku_col].astype(str).str.strip()
    df_inventario[sku_col] = df_inventario[sku_col].astype(str).str.strip()

    if filtro_skus:
        print(f"Ejecutando reporte en modo contextual para {len(filtro_skus)} SKUs.")
        df_inventario = df_inventario[df_inventario[sku_col].isin(filtro_skus)]
        df_ventas = df_ventas[df_ventas[sku_col].isin(filtro_skus)]

    # --- PASO 1: Ejecutar Análisis de Salud del Stock ---
    # Usamos una versión simplificada de la lógica de stock muerto para obtener la clasificación
    print("Paso 1/5: Ejecutando análisis de salud del stock...")
    resultado_salud = procesar_stock_muerto(
        df_ventas.copy(), 
        df_inventario.copy(),
        meses_analisis=meses_analisis_salud,
        dias_sin_venta_muerto=dias_sin_venta_muerto
    )
    df_salud = resultado_salud.get("data")


    # --- PASO 2: Ejecutar Análisis de Importancia (ABC) ---
    print("Paso 2/5: Ejecutando análisis de importancia (ABC)...")
    pesos_combinado = {
        "ingresos": score_ingreso,
        "margen": score_margen,
        "unidades": score_ventas
    }
    resultado_abc = process_csv_abc(
        df_ventas.copy(), 
        df_inventario.copy(), 
        criterio_abc, 
        periodo_abc, 
        pesos_combinado=pesos_combinado
    )
    df_importancia = resultado_abc.get("data")
    columna_criterio_abc = [col for col in df_importancia.columns if '(S/.)' in col or '(Und)' in col or 'Ponderado' in col][0]
    df_importancia_subset = df_importancia[['SKU / Código de producto', 'Clasificación ABC', columna_criterio_abc]].copy()
    # df_importancia = process_csv_abc(df_ventas.copy(), df_inventario.copy(), criterio_abc, periodo_abc, pesos_combinado)
    # columna_criterio_abc = df_importancia.columns[4] if len(df_importancia.columns) > 4 else None
    # df_importancia_subset = df_importancia[['SKU / Código de producto', 'Clasificación ABC']].copy()


    # --- PASO 3: Combinar y Enriquecer los Datos ---
    print("Paso 3/5: Combinando y enriqueciendo los datos...")
    df_salud['SKU / Código de producto'] = df_salud['SKU / Código de producto'].astype(str)
    df_importancia_subset['SKU / Código de producto'] = df_importancia_subset['SKU / Código de producto'].astype(str)
    df_maestro = pd.merge(df_salud, df_importancia_subset, on='SKU / Código de producto', how='left')
    df_maestro['Clasificación ABC'] = df_maestro['Clasificación ABC'].fillna('Sin Ventas Recientes')

    if incluir_solo_categorias and "Categoría" in df_maestro.columns:
        # Normalizamos la lista de categorías a minúsculas y sin espacios
        categorias_normalizadas = [cat.strip().lower() for cat in incluir_solo_categorias]
        
        # Comparamos contra la columna del DataFrame también normalizada
        # El .str.lower() y .str.strip() se aplican a cada valor de la columna antes de la comparación
        df_maestro = df_maestro[
            df_maestro["Categoría"].str.strip().str.lower().isin(categorias_normalizadas)
        ].copy()
    print(f"DEBUG: 3. Después de filtrar por categorías, quedan {len(df_maestro)} filas.")

    if incluir_solo_marcas and "Marca" in df_maestro.columns:
        # Normalizamos la lista de marcas
        marcas_normalizadas = [marca.strip().lower() for marca in incluir_solo_marcas]
        
        # Comparamos contra la columna de marcas normalizada
        df_maestro = df_maestro[
            df_maestro["Marca"].str.strip().str.lower().isin(marcas_normalizadas)
        ].copy()
    print(f"DEBUG: 4. Después de filtrar por marcas, quedan {len(df_maestro)} filas.")
    


    # --- PASO 4: CÁLCULO DE KPIs Y RESUMEN EJECUTIVO ---
    print("Paso 4/5: Calculando KPIs y resumen ejecutivo...")
    valor_total_inventario = df_maestro['Valor stock (S/.)'].sum()

    df_stock_muerto = df_maestro[df_maestro['Clasificación Diagnóstica'] == 'Stock Muerto']
    valor_stock_muerto = df_stock_muerto['Valor stock (S/.)'].sum()
    porcentaje_muerto = (valor_stock_muerto / valor_total_inventario * 100) if valor_total_inventario > 0 else 0

    df_exceso_stock = df_maestro[df_maestro['Clasificación Diagnóstica'] == 'Exceso de Stock']
    valor_exceso_stock = df_exceso_stock['Valor stock (S/.)'].sum()
    porcentaje_exceso = (valor_exceso_stock / valor_total_inventario * 100) if valor_total_inventario > 0 else 0
    
    valor_en_riesgo = valor_stock_muerto + valor_exceso_stock
    porcentaje_saludable = 100 - porcentaje_muerto - porcentaje_exceso

    productos_a = df_maestro[df_maestro['Clasificación ABC'] == 'A']
    valor_clase_a = productos_a[columna_criterio_abc].sum() if columna_criterio_abc in productos_a.columns else 0
    porcentaje_valor_a = (valor_clase_a / df_maestro[columna_criterio_abc].sum() * 100) if df_maestro[columna_criterio_abc].sum() > 0 else 0

    insight_text = (
        f"Tu inventario tiene un valor de S/ {valor_total_inventario:,.2f}. "
        f"El {porcentaje_saludable:.1f}% es saludable, pero ¡atención!, "
        f"tienes S/ {valor_en_riesgo:,.2f} en riesgo ({porcentaje_muerto + porcentaje_exceso:.1f}%) entre stock muerto y exceso."
    )

    kpis = {
        "Valor Total del Inventario": f"S/ {valor_total_inventario:,.2f}",
        "Valor en Riesgo (Muerto/Exceso)": f"S/ {valor_en_riesgo:,.2f}",
        "% Inventario Saludable": f"{porcentaje_saludable:.1f}%",
        f"% del Valor (Clase A)": f"{porcentaje_valor_a:.1f}%"
    }


    # --- PASO 5: FORMATEO FINAL DE SALIDA ---
    print("Paso 5/5: Definiendo prioridad estratégica y formateando reporte final...")
    
    # Aplicar la lógica de priorización estratégica
    prioridades = df_maestro.apply(_definir_prioridad_estrategica, axis=1)
    df_maestro['cod_prioridad'] = [p[0] for p in prioridades]
    df_maestro['Prioridad Estratégica'] = [p[1] for p in prioridades]
    
    # Ordenar el DataFrame para mostrar los problemas más críticos primero
    print(f"Ordenando reporte maestro por: '{ordenar_por}'")
    
    df_maestro_ordenado = df_maestro.copy()

    if ordenar_por == 'prioridad':
        # Ordena por el código de prioridad (más urgente primero) y luego por valor
        df_maestro_ordenado.sort_values(by=['cod_prioridad', 'Valor stock (S/.)'], ascending=[True, False], inplace=True)
    
    elif ordenar_por == 'valor_riesgo':
        # Ordena por el valor del stock, pero solo para productos no saludables
        df_maestro_ordenado['valor_riesgo_sort'] = np.where(
            df_maestro_ordenado['Clasificación Diagnóstica'] != 'Saludable',
            df_maestro_ordenado['Valor stock (S/.)'],
            -1 # Ponemos los saludables al final
        )
        df_maestro_ordenado.sort_values(by='valor_riesgo_sort', ascending=False, inplace=True)
        df_maestro_ordenado.drop(columns=['valor_riesgo_sort'], inplace=True)

    elif ordenar_por == 'importancia':
        # Ordena por la clasificación ABC y luego por el valor del criterio usado
        col_criterio = [col for col in df_maestro_ordenado.columns if '(S/.)' in col or '(Und)' in col or 'Ponderado' in col][0]
        df_maestro_ordenado.sort_values(by=['Clasificación ABC', col_criterio], ascending=[True, False], inplace=True)

    elif ordenar_por == 'salud':
        # Ordena por la clasificación de salud para agrupar problemas
        df_maestro_ordenado.sort_values(by=['Clasificación Diagnóstica', 'Valor stock (S/.)'], ascending=[True, False], inplace=True)
    
    
    # Selección y reordenamiento final de columnas para máxima claridad
    columnas_finales_ordenadas = [
        # Identificación y Prioridad
        'SKU / Código de producto', 'Nombre del producto', 'Categoría', 'Subcategoría', 'Marca',
        # Métricas de Inventario y Salud
        'Valor stock (S/.)', 'Stock Actual (Unds)', 'Días sin venta', df_maestro_ordenado.columns[11], # Nombre dinámico de DPS
        # Métricas de Venta e Importancia
        columna_criterio_abc if columna_criterio_abc in df_maestro_ordenado else None,
        'Ventas últimos ' + str(meses_analisis_salud if meses_analisis_salud else 'X') + 'm (Unds)', 'Última venta',
        # Contexto y Acción
         'Clasificación ABC', 'Prioridad Estratégica', 'Clasificación Diagnóstica',
         df_maestro_ordenado.columns[13], # Nombre dinámico de Prioridad y Acción
        # 'cod_prioridad' # Mantener para posible uso, pero se puede quitar
    ]
    # Filtrar Nones y columnas que no existan
    columnas_finales_ordenadas = [col for col in columnas_finales_ordenadas if col and col in df_maestro_ordenado.columns]
    

    # --- NUEVO PASO 6: LIMPIEZA FINAL ANTES DE DEVOLVER ---
    print("Paso 6/6: Limpiando datos para compatibilidad JSON...")

    # 1. Eliminar columnas duplicadas de forma segura, manteniendo la primera aparición
    df_maestro_limpio = df_maestro_ordenado.loc[:, ~df_maestro_ordenado.columns.duplicated()]

    # 2. Reemplazar valores infinitos (inf, -inf) con NaN
    df_maestro_limpio = df_maestro_limpio.replace([np.inf, -np.inf], np.nan)

    # 3. Reemplazar todos los NaN con None (que es compatible con JSON y se convierte en 'null')
    # Usamos .to_dict() y pd.DataFrame() para asegurar una conversión profunda de tipos
    resultado_final = pd.DataFrame(df_maestro_limpio.to_dict('records')).fillna(np.nan).replace({np.nan: None})

    print("¡Reporte Maestro generado exitosamente!")
    
    # return resultado_final[columnas_finales_ordenadas]
    return {
            "data": resultado_final[columnas_finales_ordenadas],
            "summary": {
                "insight": insight_text,
                "kpis": kpis
            }
        }

def process_csv_analisis_estrategico_rotacion(
    df_ventas: pd.DataFrame,
    df_inventario: pd.DataFrame,
    # Parámetros de periodos
    dias_analisis_ventas_recientes: Optional[int] = 30,
    dias_analisis_ventas_general: Optional[int] = 180,
    # Parámetros de cálculo estratégico
    pesos_importancia: Optional[Dict[str, float]] = None,
    umbral_sobre_stock_dias: int = 180,
    umbral_stock_bajo_dias: int = 15,
    # Parámetros de Filtro
    filtro_categorias: Optional[List[str]] = None,
    filtro_marcas: Optional[List[str]] = None,
    min_importancia: Optional[float] = None,
    max_dias_cobertura: Optional[float] = None,
    min_dias_cobertura: Optional[float] = None,
    # Parámetros de Ordenamiento
    sort_by: str = 'Importancia_Dinamica',
    sort_ascending: bool = False,

    filtro_bcg: Optional[List[str]] = None,
    min_valor_stock: Optional[float] = None,
    filtro_skus: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Genera un análisis estratégico de portafolio utilizando una adaptación de la
    Matriz BCG, clasificando los productos en Estrellas, Vacas Lecheras,
    Interrogantes y Perros.
    """
    print("Iniciando Análisis Estratégico de Rotación (Matriz BCG)...")
    
    # --- FASE 1: PRE-PROCESAMIENTO Y CÁLCULO DE MÉTRICAS BASE ---
    print("Fase 1: PRE-PROCESAMIENTO Y CÁLCULO DE MÉTRICAS BASE...")
    # --- 1. Definición y Limpieza de Datos ---

    sku_col = 'SKU / Código de producto'
    fecha_col_ventas = 'Fecha de venta'
    cantidad_col_ventas = 'Cantidad vendida'
    precio_venta_col_ventas = 'Precio de venta unitario (S/.)'
    marca_col_stock = 'Marca'
    stock_actual_col_stock = 'Cantidad en stock actual'
    nombre_prod_col_stock = 'Nombre del producto'
    categoria_col_stock = 'Categoría'
    subcategoria_col_stock = 'Subcategoría'
    precio_compra_actual_col_stock = 'Precio de compra actual (S/.)'

    df_ventas_proc = df_ventas.copy()
    df_inventario_proc = df_inventario.copy()

    # Forzamos la columna de unión a ser string
    df_ventas_proc[sku_col] = df_ventas_proc[sku_col].astype(str).str.strip()
    df_inventario_proc[sku_col] = df_inventario_proc[sku_col].astype(str).str.strip()


    # Normalización de datos (igual que antes)
    df_inventario_proc[stock_actual_col_stock] = pd.to_numeric(df_inventario_proc[stock_actual_col_stock], errors='coerce').fillna(0)
    df_inventario_proc[precio_compra_actual_col_stock] = pd.to_numeric(df_inventario_proc[precio_compra_actual_col_stock], errors='coerce').fillna(0)
    df_ventas_proc[cantidad_col_ventas] = pd.to_numeric(df_ventas_proc[cantidad_col_ventas], errors='coerce').fillna(0)
    df_ventas_proc[precio_venta_col_ventas] = pd.to_numeric(df_ventas_proc[precio_venta_col_ventas], errors='coerce').fillna(0)
    df_ventas_proc[fecha_col_ventas] = pd.to_datetime(df_ventas_proc[fecha_col_ventas], format='%d/%m/%Y', errors='coerce')
    df_ventas_proc.dropna(subset=[fecha_col_ventas], inplace=True)

    if df_ventas_proc.empty: return pd.DataFrame()
    fecha_max_venta = df_ventas_proc[fecha_col_ventas].max()
    if pd.isna(fecha_max_venta): return pd.DataFrame()

    # La lógica de sugerencia/ajuste de periodos permanece igual...
    final_dias_recientes = dias_analisis_ventas_recientes
    final_dias_general = dias_analisis_ventas_general

    # Si el usuario no proporciona los periodos, los sugerimos
    if dias_analisis_ventas_recientes is None or dias_analisis_ventas_general is None:
        print("\nInformación: Calculando periodos de análisis sugeridos...")
        # Asegúrate de que la función _sugerir_periodos_analisis esté disponible
        sug_rec, sug_gen = _sugerir_periodos_analisis(df_ventas_proc, fecha_col_ventas)
        
        if final_dias_recientes is None:
            final_dias_recientes = sug_rec
            print(f"  - Periodo de análisis reciente sugerido y utilizado: {final_dias_recientes} días.")
        
        if final_dias_general is None:
            final_dias_general = sug_gen
            print(f"  - Periodo de análisis general sugerido y utilizado: {final_dias_general} días.")

    # Se realizan validaciones para asegurar que los periodos sean lógicos
    final_dias_recientes = max(1, final_dias_recientes)
    final_dias_general = max(1, final_dias_general)
    if final_dias_general < final_dias_recientes:
        print(f"Advertencia: El periodo general ({final_dias_general}) es menor que el reciente ({final_dias_recientes}). Ajustando general para igualar a reciente.")
        final_dias_general = final_dias_recientes

    # --- 2. Cálculo de Métricas de Ventas Agregadas ---
    def agregar_ventas_periodo(df_v, periodo_dias, fecha_max, sku_c, fecha_c, cant_c, p_venta_c, sufijo):
        fecha_inicio = fecha_max - pd.Timedelta(days=periodo_dias)
        df_periodo = df_v[df_v[fecha_c] >= fecha_inicio]
        if df_periodo.empty:
             return pd.DataFrame(columns=[sku_c, f'Ventas_Total{sufijo}', f'Dias_Con_Venta{sufijo}', f'Precio_Venta_Prom{sufijo}'])
        agg_ventas = df_periodo.groupby(sku_c).agg(
            Ventas_Total=(cant_c, 'sum'),
            Dias_Con_Venta=(fecha_c, 'nunique'),
            Precio_Venta_Prom=(p_venta_c, 'mean')
        ).reset_index()
        agg_ventas.columns = [sku_c] + [f'{col}{sufijo}' for col in agg_ventas.columns[1:]]
        return agg_ventas

    df_ventas_rec_agg = agregar_ventas_periodo(df_ventas_proc, final_dias_recientes, fecha_max_venta, sku_col, fecha_col_ventas, cantidad_col_ventas, precio_venta_col_ventas, '_Reciente')
    df_ventas_gen_agg = agregar_ventas_periodo(df_ventas_proc, dias_analisis_ventas_general, fecha_max_venta, sku_col, fecha_col_ventas, cantidad_col_ventas, precio_venta_col_ventas, '_General')
   
    # --- 3. Merge y Enriquecimiento de Datos ---
    df_analisis = pd.merge(df_inventario_proc, df_ventas_rec_agg, on=sku_col, how='left')
    df_analisis = pd.merge(df_analisis, df_ventas_gen_agg, on=sku_col, how='left')
    
    cols_a_rellenar = ['Ventas_Total_Reciente', 'Dias_Con_Venta_Reciente', 'Precio_Venta_Prom_Reciente', "Ventas_Total_General"]
    for col in cols_a_rellenar:
        if col not in df_analisis.columns: df_analisis[col] = 0.0
        else: df_analisis[col] = df_analisis[col].fillna(0)

    # EJE X (Participación/Importancia): Usamos su 'Índice de Importancia'
    # --- 4. Cálculo de Métricas Financieras y de Importancia ---
    df_analisis['Inversion_Stock_Actual'] = df_analisis[stock_actual_col_stock] * df_analisis[precio_compra_actual_col_stock]
    
    df_analisis['Margen_Bruto_Reciente'] = df_analisis['Precio_Venta_Prom_Reciente'] - df_analisis[precio_compra_actual_col_stock]
    df_analisis['Ingreso_Total_Reciente'] = df_analisis['Ventas_Total_Reciente'] * df_analisis['Precio_Venta_Prom_Reciente']
    
    pesos_default = {'ventas': 0.4, 'ingreso': 0.3, 'margen': 0.2, 'dias_venta': 0.1}
    pesos_finales = pesos_default
    if pesos_importancia:
        pesos_finales = {**pesos_default, **pesos_importancia}

    df_analisis['Importancia_Dinamica'] = (
        df_analisis['Ventas_Total_Reciente'].rank(pct=True) * pesos_finales['ventas'] +
        df_analisis['Ingreso_Total_Reciente'].rank(pct=True) * pesos_finales['ingreso'] +
        df_analisis['Margen_Bruto_Reciente'].rank(pct=True) * pesos_finales['margen'] +
        df_analisis['Dias_Con_Venta_Reciente'].rank(pct=True) * pesos_finales['dias_venta']
    ).fillna(0)

     # EJE Y (Crecimiento/Velocidad): Calculamos la "Tendencia de Ventas"
    velocidad_reciente = df_analisis['Ventas_Total_Reciente'] / dias_analisis_ventas_recientes
    velocidad_general = df_analisis['Ventas_Total_General'] / dias_analisis_ventas_general
    
    # Un producto tiene "alta tendencia" si su velocidad reciente es al menos un 10% mayor
    df_analisis['Alta_Tendencia_Crecimiento'] = velocidad_reciente > (velocidad_general * 1.1)

    # Calculamos la tendencia porcentual, manejando la división por cero.
    df_analisis['Tendencia de Crecimiento (%)'] = (
        (velocidad_reciente / velocidad_general.replace(0, np.nan) - 1)
        .fillna(0) * 100
    )

    # --- FASE 3: CLASIFICACIÓN BCG ---
    print("Fase 3: Clasificando productos en la Matriz BCG...")

    # Definimos los umbrales. "Alta Importancia" es estar por encima de la mediana.
    umbral_importancia = df_analisis['Importancia_Dinamica'].median()

    def clasificar_bcg(row):
        es_importante = row['Importancia_Dinamica'] >= umbral_importancia
        esta_creciendo = row['Alta_Tendencia_Crecimiento']

        if es_importante and esta_creciendo:
            return '🌟 Estrella'
        elif es_importante and not esta_creciendo:
            return '🐄 Vaca Lechera'
        elif not es_importante and esta_creciendo:
            return '❓ Dilema'
        else:
            return '🐕 Perro'

    df_analisis['Clasificacion_BCG'] = df_analisis.apply(clasificar_bcg, axis=1)


    # --- 5. (NUEVO) Clasificación por Importancia ---
    condiciones_clasificacion = [
        df_analisis['Importancia_Dinamica'] > 0.8,
        df_analisis['Importancia_Dinamica'] > 0.5,
        df_analisis['Importancia_Dinamica'] > 0.2
    ]
    
    # El PDA Calendario ahora es la fuente de verdad para la velocidad.
    pda_calendario_reciente = df_analisis['Ventas_Total_Reciente'] / final_dias_recientes if final_dias_recientes > 0 else 0

    # El PDA Efectivo se calcula como una métrica de "intensidad" para análisis, pero no para el pronóstico principal.
    pda_efectivo_reciente = np.where(df_analisis['Dias_Con_Venta_Reciente'] > 0, df_analisis['Ventas_Total_Reciente'] / df_analisis['Dias_Con_Venta_Reciente'], 0)

    # El PDA Final se basa en la velocidad promedio real.
    df_analisis['PDA_Final'] = pda_efectivo_reciente

    df_analisis['PDA_Demanda_Estrategica'] = pda_calendario_reciente
    

    df_analisis['Dias_Cobertura_Stock_Actual'] = np.where(
        df_analisis['PDA_Final'] > 1e-6,
        df_analisis[stock_actual_col_stock] / df_analisis['PDA_Final'],
        np.inf
    )
    df_analisis.loc[df_analisis[stock_actual_col_stock] == 0, 'Dias_Cobertura_Stock_Actual'] = 0




    # --- 7. (NUEVO) Clasificación de Alerta de Stock ---
    condiciones_alerta = [
        df_analisis[stock_actual_col_stock] == 0,
        df_analisis['Dias_Cobertura_Stock_Actual'] <= umbral_stock_bajo_dias,
        df_analisis['Dias_Cobertura_Stock_Actual'] > umbral_sobre_stock_dias
    ]
    opciones_alerta = ['Agotado', 'Stock Bajo', 'Sobre-stock']
    df_analisis['Alerta_Stock'] = np.select(condiciones_alerta, opciones_alerta, default='Saludable')

    # --- 8. Filtros y Ordenamiento Final ---
    df_resultado = df_analisis.copy()

    # Aplicamos el filtro de SKUs si viene desde la auditoría
    if filtro_skus:
        df_resultado = df_resultado[df_resultado[sku_col].isin(filtro_skus)]

    # Aplicación de filtros dinámicos...
    if filtro_categorias and categoria_col_stock in df_resultado.columns:
        df_resultado = df_resultado[df_resultado[categoria_col_stock].isin(filtro_categorias)]
    if filtro_marcas and marca_col_stock in df_resultado.columns:
        df_resultado = df_resultado[df_resultado[marca_col_stock].isin(filtro_marcas)]
    if filtro_bcg:
        df_resultado = df_resultado[df_resultado['Clasificacion_BCG'].isin(filtro_bcg)]
    
    if min_valor_stock is not None and min_valor_stock > 0:
        df_resultado = df_resultado[df_resultado['Inversion_Stock_Actual'] >= min_valor_stock]
    
    if min_importancia is not None:
        df_resultado = df_resultado[df_resultado['Importancia_Dinamica'] >= min_importancia]
    if max_dias_cobertura is not None:
        cond_cobertura = (df_resultado['Dias_Cobertura_Stock_Actual'] <= max_dias_cobertura) & (df_resultado['Dias_Cobertura_Stock_Actual'] != np.inf)
        df_resultado = df_resultado[cond_cobertura]
    if min_dias_cobertura is not None:
        df_resultado = df_resultado[df_resultado['Dias_Cobertura_Stock_Actual'] >= min_dias_cobertura]
    
    print(f"Ordenando resultados por: '{sort_by}'")
    # Mapeo de los valores del `sort_by` a los nombres de columna internos
    sort_column_map = {
        'Importancia_Dinamica': 'Importancia_Dinamica',
        'Tendencia de Crecimiento (%)': 'Tendencia de Crecimiento (%)',
        'Inversion_Stock_Actual': 'Inversion_Stock_Actual',
        'Dias_Cobertura_Stock_Actual': 'Dias_Cobertura_Stock_Actual'
    }
    # Definimos la dirección del ordenamiento para cada criterio
    ascending_map = {
        'Importancia_Dinamica': False,       # Mayor importancia primero
        'Tendencia de Crecimiento (%)': False, # Mayor crecimiento primero
        'Inversion_Stock_Actual': False,     # Mayor inversión primero
        'Dias_Cobertura_Stock_Actual': True  # Menor cobertura (próximo a agotarse) primero
    }

    sort_column = sort_column_map.get(sort_by, 'Importancia_Dinamica') # Default seguro
    is_ascending = ascending_map.get(sort_by, False)
    
    # Nos aseguramos de que la columna de ordenamiento exista antes de usarla
    if sort_column in df_resultado.columns:
        df_resultado.sort_values(by=sort_column, ascending=is_ascending, inplace=True)
    else:
        # Si la columna no existe por alguna razón, usamos un ordenamiento por defecto
        print(f"Advertencia: La columna de ordenamiento '{sort_column}' no se encontró. Usando orden por defecto.")
        df_resultado.sort_values(by='Importancia_Dinamica', ascending=False, inplace=True)
  

    # if sort_by in df_resultado.columns:
    #     df_resultado = df_resultado.sort_values(by=sort_by, ascending=sort_ascending)
    # else:
    #     df_resultado = df_resultado.sort_values(by='Importancia_Dinamica', ascending=False)
    
    # --- FASE 4: CÁLCULO DE KPIs Y RESUMEN ---
    print("Fase 4: Generando KPIs y resumen ejecutivo...")

    total_productos = len(df_analisis)
    estrellas = df_analisis[df_analisis['Clasificacion_BCG'] == '🌟 Estrella']
    vacas = df_analisis[df_analisis['Clasificacion_BCG'] == '🐄 Vaca Lechera']
    dilemas = df_analisis[df_analisis['Clasificacion_BCG'] == '❓ Dilema']
    perros = df_analisis[df_analisis['Clasificacion_BCG'] == '🐕 Perro']

    insight_text = f"Tu portafolio se compone de {len(estrellas)} Estrellas (motores de crecimiento) y {len(vacas)} Vacas Lecheras (pilares de rentabilidad). Presta atención a los {len(dilemas)} Dilemas."
    
    kpis = {
        "# de Estrellas 🌟": len(estrellas),
        "# de Vacas Lecheras 🐄": len(vacas),
        "# de Dilemas ❓": len(dilemas),
        "# de Perros 🐕": len(perros)
    }

    # --- 9. Selección y Renombrado de Columnas Finales ---
    # columnas_salida_optimas = [
    #     # Identificación
    #     sku_col, nombre_prod_col_stock, categoria_col_stock, subcategoria_col_stock, marca_col_stock,
    #     # Situación Actual y Financiera
    #     stock_actual_col_stock, precio_compra_actual_col_stock, "Precio de venta actual (S/.)", 'Inversion_Stock_Actual',
    #     # Diagnóstico y Rendimiento
    #     'Ventas_Total_Reciente', 'Ventas_Total_General', 'Alta_Tendencia_Crecimiento', 'Dias_Cobertura_Stock_Actual', 'Alerta_Stock',
    #     'Importancia_Dinamica', 'Clasificacion', 'Clasificacion_BCG', 'PDA_Final', 'PDA_Demanda_Estrategica', 'Precio_Venta_Prom_Reciente'
    # ]
    columnas_salida_optimas = [
        # Identificación
        sku_col, nombre_prod_col_stock, categoria_col_stock, subcategoria_col_stock, marca_col_stock,
        # Situación Actual y Financiera
        'Clasificacion_BCG', 'Importancia_Dinamica', 'Tendencia de Crecimiento (%)', stock_actual_col_stock, precio_compra_actual_col_stock, "Precio de venta actual (S/.)", 'Inversion_Stock_Actual',
        # Diagnóstico y Rendimiento
        'Dias_Cobertura_Stock_Actual', 'Alerta_Stock',  'Ventas_Total_Reciente', 'Ventas_Total_General', 
        'PDA_Final', 'PDA_Demanda_Estrategica', 'Precio_Venta_Prom_Reciente', 'Ingreso_Total_Reciente'
    ]
    
    df_final = df_resultado[[col for col in columnas_salida_optimas if col in df_resultado.columns]].copy()
    
    # REEMPLAZO DE 'inf' POR UN NÚMERO ALTO Y ENTENDIBLE
    df_final['Dias_Cobertura_Stock_Actual'] = df_final['Dias_Cobertura_Stock_Actual'].replace(np.inf, 9999)

    column_rename_map = {
        stock_actual_col_stock: 'Stock Actual (Unds)',
        precio_compra_actual_col_stock: 'Precio Compra (S/.)',
        'Precio de venta actual (S/.)': 'Precio Venta (S/.)',
        'Inversion_Stock_Actual': 'Inversión Stock Actual (S/.)',
        'Ventas_Total_Reciente': f'Ventas Recientes ({final_dias_recientes}d) (Unds)',
        'Ventas_Total_General' : f'Ventas Periodo General ({final_dias_general}d) (Unds)',
        'Dias_Cobertura_Stock_Actual': 'Cobertura Actual (Días)',
        'Alerta_Stock': 'Alerta de Stock',
        'Importancia_Dinamica': 'Índice de Importancia',
        'Clasificacion': 'Clasificación',
        'Precio_Venta_Prom_Reciente': 'Precio de Venta Promedio Reciente',
        'Clasificacion_BCG': 'Clasificación BCG'
    }

    df_final = df_final.rename(columns=column_rename_map)
    
    # Redondeo final para mejor visualización
    df_final['Inversión Stock Actual (S/.)'] = df_final['Inversión Stock Actual (S/.)'].round(2)
    df_final['Índice de Importancia'] = df_final['Índice de Importancia'].round(3)
    df_final['Cobertura Actual (Días)'] = df_final['Cobertura Actual (Días)'].round(1)

     # Redondeo final para mejor visualización
    if 'Inversión Stock Actual (S/.)' in df_final.columns:
        df_final['Inversión Stock Actual (S/.)'] = df_final['Inversión Stock Actual (S/.)'].round(2)
    if 'Índice de Importancia' in df_final.columns:
        df_final['Índice de Importancia'] = df_final['Índice de Importancia'].round(3)
    if 'Cobertura Actual (Días)' in df_final.columns:
        df_final['Cobertura Actual (Días)'] = df_final['Cobertura Actual (Días)'].round(1)

    # --- NUEVO PASO FINAL: LIMPIEZA PARA COMPATIBILIDAD CON JSON ---
    print("Limpiando DataFrame de análisis estratégico para JSON...")

    # Redondeo final para una presentación limpia
    if 'Tendencia de Crecimiento (%)' in df_final.columns:
        df_final['Tendencia de Crecimiento (%)'] = df_final['Tendencia de Crecimiento (%)'].round(1)
    
    # Si el dataframe está vacío, lo devolvemos tal cual.
    if df_final.empty:
        return df_final

    # 1. Reemplazar valores infinitos (inf, -inf) con NaN.
    df_limpio = df_final.replace([np.inf, -np.inf], np.nan)

    # 2. Reemplazar todos los NaN restantes con None (que se convierte en 'null' en JSON).
    # El método .where() es muy eficiente para esto.
    resultado_final_json_safe = df_limpio.where(pd.notna(df_limpio), None)
    
    return {
        "data": resultado_final_json_safe,
        "summary": {
            "insight": insight_text,
            "kpis": kpis
        }
    }

# def process_csv_analisis_estrategico_rotacion(
#     df_ventas: pd.DataFrame,
#     df_inventario: pd.DataFrame,
#     # Parámetros de periodos
#     dias_analisis_ventas_recientes: Optional[int] = 30,
#     dias_analisis_ventas_general: Optional[int] = 180,
#     # Parámetros de cálculo estratégico
#     pesos_importancia: Optional[Dict[str, float]] = None,
#     umbral_sobre_stock_dias: int = 180,
#     umbral_stock_bajo_dias: int = 15,
#     # Parámetros de Filtro
#     filtro_categorias: Optional[List[str]] = None,
#     filtro_marcas: Optional[List[str]] = None,
#     min_importancia: Optional[float] = None,
#     max_dias_cobertura: Optional[float] = None,
#     min_dias_cobertura: Optional[float] = None,
#     # Parámetros de Ordenamiento
#     sort_by: str = 'Importancia_Dinamica',
#     sort_ascending: bool = False
# ) -> Dict[str, Any]:
#     """
#     Genera un análisis estratégico de rotación de inventario (Radar Estratégico).
#     Se enfoca en diagnosticar la salud y la importancia de los productos,
#     omitiendo los detalles operativos de la reposición.
#     """
    
#     # --- 1. Definición y Limpieza de Datos ---
#     sku_col = 'SKU / Código de producto'
#     fecha_col_ventas = 'Fecha de venta'
#     cantidad_col_ventas = 'Cantidad vendida'
#     precio_venta_col_ventas = 'Precio de venta unitario (S/.)'
#     marca_col_stock = 'Marca'
#     stock_actual_col_stock = 'Cantidad en stock actual'
#     nombre_prod_col_stock = 'Nombre del producto'
#     categoria_col_stock = 'Categoría'
#     subcategoria_col_stock = 'Subcategoría'
#     precio_compra_actual_col_stock = 'Precio de compra actual (S/.)'

#     df_ventas_proc = df_ventas.copy()
#     df_inventario_proc = df_inventario.copy()

#     # Normalización de datos (igual que antes)
#     df_ventas_proc[sku_col] = df_ventas_proc[sku_col].astype(str).str.strip()
#     df_inventario_proc[sku_col] = df_inventario_proc[sku_col].astype(str).str.strip()
#     df_inventario_proc[stock_actual_col_stock] = pd.to_numeric(df_inventario_proc[stock_actual_col_stock], errors='coerce').fillna(0)
#     df_inventario_proc[precio_compra_actual_col_stock] = pd.to_numeric(df_inventario_proc[precio_compra_actual_col_stock], errors='coerce').fillna(0)
#     df_ventas_proc[cantidad_col_ventas] = pd.to_numeric(df_ventas_proc[cantidad_col_ventas], errors='coerce').fillna(0)
#     df_ventas_proc[precio_venta_col_ventas] = pd.to_numeric(df_ventas_proc[precio_venta_col_ventas], errors='coerce').fillna(0)
#     df_ventas_proc[fecha_col_ventas] = pd.to_datetime(df_ventas_proc[fecha_col_ventas], format='%d/%m/%Y', errors='coerce')
#     df_ventas_proc.dropna(subset=[fecha_col_ventas], inplace=True)

#     if df_ventas_proc.empty: return pd.DataFrame()
#     fecha_max_venta = df_ventas_proc[fecha_col_ventas].max()
#     if pd.isna(fecha_max_venta): return pd.DataFrame()

#     # La lógica de sugerencia/ajuste de periodos permanece igual...
#     final_dias_recientes = dias_analisis_ventas_recientes
#     final_dias_general = dias_analisis_ventas_general

#     # Si el usuario no proporciona los periodos, los sugerimos
#     if dias_analisis_ventas_recientes is None or dias_analisis_ventas_general is None:
#         print("\nInformación: Calculando periodos de análisis sugeridos...")
#         # Asegúrate de que la función _sugerir_periodos_analisis esté disponible
#         sug_rec, sug_gen = _sugerir_periodos_analisis(df_ventas_proc, fecha_col_ventas)
        
#         if final_dias_recientes is None:
#             final_dias_recientes = sug_rec
#             print(f"  - Periodo de análisis reciente sugerido y utilizado: {final_dias_recientes} días.")
        
#         if final_dias_general is None:
#             final_dias_general = sug_gen
#             print(f"  - Periodo de análisis general sugerido y utilizado: {final_dias_general} días.")

#     # Se realizan validaciones para asegurar que los periodos sean lógicos
#     final_dias_recientes = max(1, final_dias_recientes)
#     final_dias_general = max(1, final_dias_general)
#     if final_dias_general < final_dias_recientes:
#         print(f"Advertencia: El periodo general ({final_dias_general}) es menor que el reciente ({final_dias_recientes}). Ajustando general para igualar a reciente.")
#         final_dias_general = final_dias_recientes

#     # --- 2. Cálculo de Métricas de Ventas Agregadas ---
#     def agregar_ventas_periodo(df_v, periodo_dias, fecha_max, sku_c, fecha_c, cant_c, p_venta_c, sufijo):
#         fecha_inicio = fecha_max - pd.Timedelta(days=periodo_dias)
#         df_periodo = df_v[df_v[fecha_c] >= fecha_inicio]
#         if df_periodo.empty:
#              return pd.DataFrame(columns=[sku_c, f'Ventas_Total{sufijo}', f'Dias_Con_Venta{sufijo}', f'Precio_Venta_Prom{sufijo}'])
#         agg_ventas = df_periodo.groupby(sku_c).agg(
#             Ventas_Total=(cant_c, 'sum'),
#             Dias_Con_Venta=(fecha_c, 'nunique'),
#             Precio_Venta_Prom=(p_venta_c, 'mean')
#         ).reset_index()
#         agg_ventas.columns = [sku_c] + [f'{col}{sufijo}' for col in agg_ventas.columns[1:]]
#         return agg_ventas

#     df_ventas_rec_agg = agregar_ventas_periodo(df_ventas_proc, final_dias_recientes, fecha_max_venta, sku_col, fecha_col_ventas, cantidad_col_ventas, precio_venta_col_ventas, '_Reciente')
    
#     # --- 3. Merge y Enriquecimiento de Datos ---
#     df_analisis = pd.merge(df_inventario_proc, df_ventas_rec_agg, on=sku_col, how='left')
#     cols_a_rellenar = ['Ventas_Total_Reciente', 'Dias_Con_Venta_Reciente', 'Precio_Venta_Prom_Reciente']
#     for col in cols_a_rellenar:
#         if col not in df_analisis.columns: df_analisis[col] = 0.0
#         else: df_analisis[col] = df_analisis[col].fillna(0)

#     # --- 4. Cálculo de Métricas Financieras y de Importancia ---
#     df_analisis['Inversion_Stock_Actual'] = df_analisis[stock_actual_col_stock] * df_analisis[precio_compra_actual_col_stock]
    
#     df_analisis['Margen_Bruto_Reciente'] = df_analisis['Precio_Venta_Prom_Reciente'] - df_analisis[precio_compra_actual_col_stock]
#     df_analisis['Ingreso_Total_Reciente'] = df_analisis['Ventas_Total_Reciente'] * df_analisis['Precio_Venta_Prom_Reciente']
    
#     pesos_default = {'ventas': 0.4, 'ingreso': 0.3, 'margen': 0.2, 'dias_venta': 0.1}
#     pesos_finales = pesos_default
#     if pesos_importancia:
#         pesos_finales = {**pesos_default, **pesos_importancia}

#     df_analisis['Importancia_Dinamica'] = (
#         df_analisis['Ventas_Total_Reciente'].rank(pct=True) * pesos_finales['ventas'] +
#         df_analisis['Ingreso_Total_Reciente'].rank(pct=True) * pesos_finales['ingreso'] +
#         df_analisis['Margen_Bruto_Reciente'].rank(pct=True) * pesos_finales['margen'] +
#         df_analisis['Dias_Con_Venta_Reciente'].rank(pct=True) * pesos_finales['dias_venta']
#     ).fillna(0)

#     # --- 5. (NUEVO) Clasificación por Importancia ---
#     condiciones_clasificacion = [
#         df_analisis['Importancia_Dinamica'] > 0.8,
#         df_analisis['Importancia_Dinamica'] > 0.5,
#         df_analisis['Importancia_Dinamica'] > 0.2
#     ]
#     opciones_clasificacion = ['Clase A (Crítico)', 'Clase B (Importante)', 'Clase C (Regular)']
#     df_analisis['Clasificacion'] = np.select(condiciones_clasificacion, opciones_clasificacion, default='Clase D (Baja Prioridad)')
  
#     # El PDA Calendario ahora es la fuente de verdad para la velocidad.
#     pda_calendario_reciente = df_analisis['Ventas_Total_Reciente'] / final_dias_recientes if final_dias_recientes > 0 else 0

#     # El PDA Efectivo se calcula como una métrica de "intensidad" para análisis, pero no para el pronóstico principal.
#     pda_efectivo_reciente = np.where(df_analisis['Dias_Con_Venta_Reciente'] > 0, df_analisis['Ventas_Total_Reciente'] / df_analisis['Dias_Con_Venta_Reciente'], 0)

#     # El PDA Final se basa en la velocidad promedio real.
#     df_analisis['PDA_Final'] = pda_efectivo_reciente

#     df_analisis['PDA_Demanda_Estrategica'] = pda_calendario_reciente
    

#     df_analisis['Dias_Cobertura_Stock_Actual'] = np.where(
#         df_analisis['PDA_Final'] > 1e-6,
#         df_analisis[stock_actual_col_stock] / df_analisis['PDA_Final'],
#         np.inf
#     )
#     df_analisis.loc[df_analisis[stock_actual_col_stock] == 0, 'Dias_Cobertura_Stock_Actual'] = 0




#     # --- 7. (NUEVO) Clasificación de Alerta de Stock ---
#     condiciones_alerta = [
#         df_analisis[stock_actual_col_stock] == 0,
#         df_analisis['Dias_Cobertura_Stock_Actual'] <= umbral_stock_bajo_dias,
#         df_analisis['Dias_Cobertura_Stock_Actual'] > umbral_sobre_stock_dias
#     ]
#     opciones_alerta = ['Agotado', 'Stock Bajo', 'Sobre-stock']
#     df_analisis['Alerta_Stock'] = np.select(condiciones_alerta, opciones_alerta, default='Saludable')

#     # --- 8. Filtros y Ordenamiento Final ---
#     df_resultado = df_analisis.copy()

#     # Aplicación de filtros dinámicos...
#     if filtro_categorias and categoria_col_stock in df_resultado.columns:
#         df_resultado = df_resultado[df_resultado[categoria_col_stock].isin(filtro_categorias)]
#     if filtro_marcas and marca_col_stock in df_resultado.columns:
#         df_resultado = df_resultado[df_resultado[marca_col_stock].isin(filtro_marcas)]
#     if min_importancia is not None:
#         df_resultado = df_resultado[df_resultado['Importancia_Dinamica'] >= min_importancia]
#     if max_dias_cobertura is not None:
#         cond_cobertura = (df_resultado['Dias_Cobertura_Stock_Actual'] <= max_dias_cobertura) & (df_resultado['Dias_Cobertura_Stock_Actual'] != np.inf)
#         df_resultado = df_resultado[cond_cobertura]
#     if min_dias_cobertura is not None:
#         df_resultado = df_resultado[df_resultado['Dias_Cobertura_Stock_Actual'] >= min_dias_cobertura]
    
#     # Aplicación de ordenamiento dinámico...
#     if sort_by in df_resultado.columns:
#         df_resultado = df_resultado.sort_values(by=sort_by, ascending=sort_ascending)
#     else:
#         df_resultado = df_resultado.sort_values(by='Importancia_Dinamica', ascending=False)
    

#     # --- PASO 9: CÁLCULO DE KPIs Y RESUMEN ---
#     # Usamos el DataFrame ya filtrado y ordenado para los KPIs
    
#     # SKUs "Estrella": Clase A o B, con stock saludable o bajo (no sobre-stock y no agotado)
#     estrellas_mask = df_resultado['Clasificacion'].isin(['Clase A (Crítico)', 'Clase B (Importante)']) & \
#                      df_resultado['Alerta_Stock'].isin(['Saludable', 'Stock Bajo'])
#     skus_estrella = len(df_resultado[estrellas_mask])

#     # SKUs "Problemáticos": Clase A o B, pero con sobre-stock
#     problematicos_mask = df_resultado['Clasificacion'].isin(['Clase A (Crítico)', 'Clase B (Importante)']) & \
#                          (df_resultado['Alerta_Stock'] == 'Sobre-stock')
#     skus_problematicos = len(df_resultado[problematicos_mask])

#     # Valor en Sobre-stock
#     valor_sobre_stock = df_resultado[df_resultado['Alerta_Stock'] == 'Sobre-stock']['Inversion_Stock_Actual'].sum()

#     insight_text = f"Se han identificado {skus_estrella} SKUs 'Estrella' que necesitan vigilancia. ¡Alerta! Tienes S/ {valor_sobre_stock:,.2f} inmovilizados en productos importantes con sobre-stock."
#     if skus_estrella == 0 and valor_sobre_stock == 0:
#         insight_text = "No se encontraron productos con actividad de venta reciente que cumplan los criterios."

#     kpis = {
#         "SKUs Estrella": skus_estrella,
#         "SKUs Problemáticos (Sobre-stock)": skus_problematicos,
#         "Valor en Sobre-stock": f"S/ {valor_sobre_stock:,.2f}",
#         "Rotación Promedio (Ejemplo)": "90 días" # Placeholder para un futuro cálculo
#     }

#     # --- 9. Selección y Renombrado de Columnas Finales ---
#     columnas_salida_optimas = [
#         # Identificación
#         sku_col, nombre_prod_col_stock, categoria_col_stock, subcategoria_col_stock, marca_col_stock,
#         # Situación Actual y Financiera
#         stock_actual_col_stock, precio_compra_actual_col_stock, "Precio de venta actual (S/.)", 'Inversion_Stock_Actual',
#         # Diagnóstico y Rendimiento
#         'Ventas_Total_Reciente', 'Dias_Cobertura_Stock_Actual', 'Alerta_Stock',
#         'Importancia_Dinamica', 'Clasificacion', 'PDA_Final', 'PDA_Demanda_Estrategica', 'Precio_Venta_Prom_Reciente'
#     ]
    
#     df_final = df_resultado[[col for col in columnas_salida_optimas if col in df_resultado.columns]].copy()
    
#     # REEMPLAZO DE 'inf' POR UN NÚMERO ALTO Y ENTENDIBLE
#     df_final['Dias_Cobertura_Stock_Actual'] = df_final['Dias_Cobertura_Stock_Actual'].replace(np.inf, 9999)


#     column_rename_map = {
#         stock_actual_col_stock: 'Stock Actual (Unds)',
#         precio_compra_actual_col_stock: 'Precio Compra (S/.)',
#         'Precio de venta actual (S/.)': 'Precio Venta (S/.)',
#         'Inversion_Stock_Actual': 'Inversión Stock Actual (S/.)',
#         'Ventas_Total_Reciente': f'Ventas Recientes ({final_dias_recientes}d)',
#         'Dias_Cobertura_Stock_Actual': 'Cobertura Actual (Días)',
#         'Alerta_Stock': 'Alerta de Stock',
#         'Importancia_Dinamica': 'Índice de Importancia',
#         'Clasificacion': 'Clasificación',
#         'Precio_Venta_Prom_Reciente': 'Precio de Venta Promedio Reciente'
#     }

#     df_final = df_final.rename(columns=column_rename_map)
    
#     # Redondeo final para mejor visualización
#     df_final['Inversión Stock Actual (S/.)'] = df_final['Inversión Stock Actual (S/.)'].round(2)
#     df_final['Índice de Importancia'] = df_final['Índice de Importancia'].round(3)
#     df_final['Cobertura Actual (Días)'] = df_final['Cobertura Actual (Días)'].round(1)

#      # Redondeo final para mejor visualización
#     if 'Inversión Stock Actual (S/.)' in df_final.columns:
#         df_final['Inversión Stock Actual (S/.)'] = df_final['Inversión Stock Actual (S/.)'].round(2)
#     if 'Índice de Importancia' in df_final.columns:
#         df_final['Índice de Importancia'] = df_final['Índice de Importancia'].round(3)
#     if 'Cobertura Actual (Días)' in df_final.columns:
#         df_final['Cobertura Actual (Días)'] = df_final['Cobertura Actual (Días)'].round(1)

#     # --- NUEVO PASO FINAL: LIMPIEZA PARA COMPATIBILIDAD CON JSON ---
#     print("Limpiando DataFrame de análisis estratégico para JSON...")

#     # Si el dataframe está vacío, lo devolvemos tal cual.
#     if df_final.empty:
#         return df_final

#     # 1. Reemplazar valores infinitos (inf, -inf) con NaN.
#     df_limpio = df_final.replace([np.inf, -np.inf], np.nan)

#     # 2. Reemplazar todos los NaN restantes con None (que se convierte en 'null' en JSON).
#     # El método .where() es muy eficiente para esto.
#     resultado_final_json_safe = df_limpio.where(pd.notna(df_limpio), None)
    
#     return {
#         "data": resultado_final_json_safe,
#         "summary": {
#             "insight": insight_text,
#             "kpis": kpis
#         }
#     }



def process_csv_puntos_alerta_stock(
    df_ventas: pd.DataFrame,
    df_inventario: pd.DataFrame,
    dias_analisis_ventas_recientes: Optional[int] = None,
    dias_analisis_ventas_general: Optional[int] = None,
    peso_ventas_historicas: float = 0.6,
    dias_cobertura_ideal_base: int = 10,
    coef_importancia_para_cobertura_ideal: float = 0.05,
    coef_rotacion_para_stock_ideal: float = 0.1,
    dias_cubrir_con_pedido_minimo: int = 5,
    coef_importancia_para_pedido_minimo: float = 0.1,
    coef_rotacion_para_stock_minimo: float = 0.15,
    importancia_minima_para_redondeo_a_1: float = 0.1,
    incluir_productos_pasivos: bool = True,
    cantidad_reposicion_para_pasivos: int = 1,
    excluir_productos_sin_sugerencia_ideal: bool = False,
    # --- PARÁMETROS PARA EL PUNTO DE ALERTA ---
    excluir_sin_ventas: bool = True,
    lead_time_dias: float = 7.0,
    dias_seguridad_base: float = 0,
    factor_importancia_seguridad: float = 1.0,
    ordenar_por: str = 'Importancia',
    filtro_categorias: Optional[List[str]] = None,
    filtro_marcas: Optional[List[str]] = None,
    **kwargs
) -> Dict[str, Any]:
    """
    Calcula los Puntos de Alerta de Stock siguiendo un flujo de procesamiento
    de datos lógico y ordenado para garantizar la consistencia y corrección.
    """
    print("Iniciando análisis de Puntos de Alerta de Stock...")

    # --- PASO 1: DEFINICIÓN DE NOMBRES Y PRE-PROCESAMIENTO ---
    sku_col = 'SKU / Código de producto'
    fecha_col_ventas = 'Fecha de venta'
    cantidad_col_ventas = 'Cantidad vendida'
    precio_venta_col_ventas = 'Precio de venta unitario (S/.)'
    stock_actual_col_stock = 'Cantidad en stock actual'
    precio_compra_actual_col_stock = 'Precio de compra actual (S/.)'
    categoria_col_stock = 'Categoría'

    df_ventas_proc = df_ventas.copy()
    df_inventario_proc = df_inventario.copy()

    # Limpieza y conversión de tipos
    for df in [df_ventas_proc, df_inventario_proc]:
        df.columns = df.columns.str.strip()
        if sku_col in df.columns:
            df[sku_col] = df[sku_col].astype(str).str.strip()
    
    for col in [stock_actual_col_stock, precio_compra_actual_col_stock]:
        if col in df_inventario_proc.columns:
            df_inventario_proc[col] = pd.to_numeric(df_inventario_proc[col], errors='coerce').fillna(0)
    
    for col in [cantidad_col_ventas, precio_venta_col_ventas]:
        if col in df_ventas_proc.columns:
            df_ventas_proc[col] = pd.to_numeric(df_ventas_proc[col], errors='coerce').fillna(0)
    
    df_ventas_proc[fecha_col_ventas] = pd.to_datetime(df_ventas_proc[fecha_col_ventas], format='%d/%m/%Y', errors='coerce')
    df_ventas_proc.dropna(subset=[fecha_col_ventas], inplace=True)
    
    if df_ventas_proc.empty: return pd.DataFrame()
    fecha_max_venta = df_ventas_proc[fecha_col_ventas].max()
    if pd.isna(fecha_max_venta): return pd.DataFrame()


    # --- PASO 2: CÁLCULO DE MÉTRICAS BASE (Ventas, PDA, Importancia) ---
    # (Esta sección contiene tu lógica existente para calcular las métricas necesarias)
    
    # ... (Tu lógica para `agregar_ventas_periodo` y `df_ventas_rec_agg`, `df_ventas_gen_agg`)
    # ... (Tu lógica para el `merge` y crear `df_analisis`)
    # ... (Tu lógica para calcular `PDA_Final` e `Importancia_Dinamica`)
    final_dias_recientes = dias_analisis_ventas_recientes
    final_dias_general = dias_analisis_ventas_general
    if dias_analisis_ventas_recientes is None or dias_analisis_ventas_general is None:
        sug_rec, sug_gen = _sugerir_periodos_analisis(df_ventas_proc, fecha_col_ventas)
        if final_dias_recientes is None: final_dias_recientes = sug_rec
        if final_dias_general is None: final_dias_general = sug_gen
        final_dias_recientes = max(1, final_dias_recientes)
        final_dias_general = max(1, max(final_dias_general, final_dias_recientes))
        if dias_analisis_ventas_recientes is not None and final_dias_general < final_dias_recientes : final_dias_general = final_dias_recientes
        elif dias_analisis_ventas_general is not None and final_dias_recientes > final_dias_general: final_dias_recientes = final_dias_general
    else:
        final_dias_recientes = max(1, final_dias_recientes)
        final_dias_general = max(1, final_dias_general)
        if final_dias_general < final_dias_recientes: final_dias_general = final_dias_recientes

    def agregar_ventas_periodo(df_v, periodo_dias, fecha_max, sku_c, fecha_c, cant_c, p_venta_c, sufijo):
        if pd.isna(fecha_max) or periodo_dias <= 0: return pd.DataFrame(columns=[sku_c, f'Ventas_Total{sufijo}', f'Dias_Con_Venta{sufijo}', f'Precio_Venta_Prom{sufijo}'])
        fecha_inicio = fecha_max - pd.Timedelta(days=periodo_dias)
        df_periodo = df_v[df_v[fecha_c] >= fecha_inicio].copy()
        if df_periodo.empty: return pd.DataFrame(columns=[sku_c, f'Ventas_Total{sufijo}', f'Dias_Con_Venta{sufijo}', f'Precio_Venta_Prom{sufijo}'])
        agg_ventas = df_periodo.groupby(sku_c).agg(Ventas_Total=(cant_c, 'sum'), Dias_Con_Venta=(fecha_c, 'nunique'), Precio_Venta_Prom=(p_venta_c, 'mean')).reset_index()
        agg_ventas.columns = [sku_c] + [f'{col}{sufijo}' for col in agg_ventas.columns[1:]]
        return agg_ventas



    df_ventas_rec_agg = agregar_ventas_periodo(df_ventas_proc, final_dias_recientes, fecha_max_venta, sku_col, fecha_col_ventas, cantidad_col_ventas, precio_venta_col_ventas, '_Reciente')
    df_ventas_gen_agg = agregar_ventas_periodo(df_ventas_proc, final_dias_general, fecha_max_venta, sku_col, fecha_col_ventas, cantidad_col_ventas, precio_venta_col_ventas, '_General')
    df_analisis = pd.merge(df_inventario_proc, df_ventas_rec_agg, on=sku_col, how='left')
    if not df_ventas_gen_agg.empty: df_analisis = pd.merge(df_analisis, df_ventas_gen_agg, on=sku_col, how='left')
    cols_a_rellenar_de_ventas_agg = ['Ventas_Total_Reciente', 'Dias_Con_Venta_Reciente', 'Precio_Venta_Prom_Reciente', 'Ventas_Total_General', 'Dias_Con_Venta_General', 'Precio_Venta_Prom_General']
    for col_fill in cols_a_rellenar_de_ventas_agg:
        if col_fill not in df_analisis.columns: df_analisis[col_fill] = 0.0
        else: df_analisis[col_fill] = df_analisis[col_fill].fillna(0)
    df_analisis[precio_compra_actual_col_stock] = pd.to_numeric(df_analisis[precio_compra_actual_col_stock], errors='coerce').fillna(0)
    df_analisis['Precio_Venta_Prom_Reciente'] = pd.to_numeric(df_analisis.get('Precio_Venta_Prom_Reciente', 0), errors='coerce').fillna(0)
    df_analisis['Ventas_Total_Reciente'] = pd.to_numeric(df_analisis.get('Ventas_Total_Reciente', 0), errors='coerce').fillna(0)
    df_analisis['Dias_Con_Venta_Reciente'] = pd.to_numeric(df_analisis.get('Dias_Con_Venta_Reciente', 0), errors='coerce').fillna(0)
    df_analisis['Ventas_Total_General'] = pd.to_numeric(df_analisis.get('Ventas_Total_General', 0), errors='coerce').fillna(0)
    df_analisis['Dias_Con_Venta_General'] = pd.to_numeric(df_analisis.get('Dias_Con_Venta_General', 0), errors='coerce').fillna(0)

    df_analisis['Margen_Bruto_con_PCA'] = df_analisis['Precio_Venta_Prom_Reciente'] - df_analisis[precio_compra_actual_col_stock]
    df_analisis['Ingreso_Total_Reciente'] = df_analisis['Ventas_Total_Reciente'] * df_analisis['Precio_Venta_Prom_Reciente']
    df_analisis['Margen_Bruto_con_PCA'] = df_analisis['Margen_Bruto_con_PCA'].fillna(0)
    df_analisis['Ingreso_Total_Reciente'] = df_analisis['Ingreso_Total_Reciente'].fillna(0)

    ventas_diarias_recientes = df_analisis['Ventas_Total_Reciente'] / final_dias_recientes if final_dias_recientes > 0 else 0
    ventas_diarias_generales = df_analisis['Ventas_Total_General'] / final_dias_general if final_dias_general > 0 else 0
    df_analisis['Ventas_Ponderadas_para_Importancia'] = (ventas_diarias_recientes * (1 - peso_ventas_historicas) + ventas_diarias_generales * peso_ventas_historicas)
    cols_for_rank = ['Ventas_Ponderadas_para_Importancia', 'Ingreso_Total_Reciente', 'Margen_Bruto_con_PCA', 'Dias_Con_Venta_Reciente']
    for col_rank in cols_for_rank:
        if col_rank not in df_analisis.columns: df_analisis[col_rank] = 0.0
        df_analisis[col_rank] = pd.to_numeric(df_analisis[col_rank], errors='coerce').fillna(0)
    if not df_analisis.empty:
        rank_cols_exist = all(col in df_analisis.columns for col in cols_for_rank)
        if rank_cols_exist:
            df_analisis['Importancia_Dinamica'] = (df_analisis['Ventas_Ponderadas_para_Importancia'].rank(pct=True) * 0.4 + df_analisis['Ingreso_Total_Reciente'].rank(pct=True) * 0.3 + df_analisis['Margen_Bruto_con_PCA'].rank(pct=True) * 0.2 + df_analisis['Dias_Con_Venta_Reciente'].rank(pct=True) * 0.1).fillna(0).round(3)
        else: df_analisis['Importancia_Dinamica'] = 0.0
    else: df_analisis['Importancia_Dinamica'] = 0.0
    df_analisis['Importancia_Dinamica'] = df_analisis.get('Importancia_Dinamica', 0.0).fillna(0)

    df_analisis['PDA_Efectivo_Reciente'] = np.where(df_analisis['Dias_Con_Venta_Reciente'] > 0, df_analisis['Ventas_Total_Reciente'] / df_analisis['Dias_Con_Venta_Reciente'], 0)
    df_analisis['PDA_Efectivo_General'] = np.where(df_analisis['Dias_Con_Venta_General'] > 0, df_analisis['Ventas_Total_General'] / df_analisis['Dias_Con_Venta_General'], 0)
    pda_reciente_a_usar = np.where(df_analisis['PDA_Efectivo_Reciente'] > 0, df_analisis['PDA_Efectivo_Reciente'], df_analisis['PDA_Efectivo_General'])
    pda_general_a_usar = df_analisis['PDA_Efectivo_General']
    df_analisis['PDA_Calendario_General'] = df_analisis['Ventas_Total_General'] / final_dias_general if final_dias_general > 0 else 0
    pda_general_a_usar = np.where(pda_general_a_usar > 0, pda_general_a_usar, df_analisis['PDA_Calendario_General'])
    resultado_pda_array = (pda_reciente_a_usar * (1 - peso_ventas_historicas) + pda_general_a_usar * peso_ventas_historicas)
    df_analisis['PDA_Final'] = pd.Series(resultado_pda_array, index=df_analisis.index).fillna(0).round(2)
    
    # --- CÁLCULOS PREVIOS A LOS PUNTOS DE ALERTA ---
    factores_por_categoria_default = {'DEFAULT': 1.0}
    factores_por_categoria_ej = {'Herramientas manuales': 1.1, 'Herramientas eléctricas': 1.05, 'Material eléctrico': 1.3, 'Tornillería': 1.5, 'Adhesivos y selladores': 1.2}
    factores_por_categoria_final = {**factores_por_categoria_default, **factores_por_categoria_ej}
    if categoria_col_stock in df_analisis.columns: df_analisis['Factor_Reposicion_Categoria'] = df_analisis[categoria_col_stock].map(factores_por_categoria_final).fillna(factores_por_categoria_final['DEFAULT'])
    else: df_analisis['Factor_Reposicion_Categoria'] = factores_por_categoria_final['DEFAULT']
    df_analisis['Factor_Rotacion_Crudo'] = df_analisis['Ventas_Total_Reciente'] / (df_analisis[stock_actual_col_stock] + 1e-6)
    df_analisis['Factor_Rotacion_Ajustado_Ideal'] = 1 + (df_analisis['Factor_Rotacion_Crudo'].rank(pct=True).fillna(0) * coef_rotacion_para_stock_ideal)
    df_analisis['Factor_Rotacion_Ajustado_Minimo'] = 1 + (df_analisis['Factor_Rotacion_Crudo'].rank(pct=True).fillna(0) * coef_rotacion_para_stock_minimo)
    df_analisis['Factor_Ajuste_Cobertura_Por_Importancia'] = 1 + (df_analisis['Importancia_Dinamica'] * coef_importancia_para_cobertura_ideal)
    df_analisis['Dias_Cobertura_Ideal_Ajustados'] = (dias_cobertura_ideal_base * df_analisis['Factor_Ajuste_Cobertura_Por_Importancia']).round(1)
    df_analisis['Stock_Ideal_Unds'] = (df_analisis['PDA_Final'] * df_analisis['Dias_Cobertura_Ideal_Ajustados'] * df_analisis['Factor_Reposicion_Categoria'] * df_analisis['Factor_Rotacion_Ajustado_Ideal']).round().clip(lower=0)
    df_analisis['Stock_Minimo_Unds'] = (df_analisis['PDA_Final'] * dias_cubrir_con_pedido_minimo * df_analisis['Factor_Rotacion_Ajustado_Minimo']).round().clip(lower=0)
    

    # --- PASO 3: CÁLCULO DE PUNTOS DE ALERTA (Lógica Central) ---
    print("Calculando puntos de alerta...")
    
    # Stock de Seguridad en unidades
    dias_seguridad_adicionales = df_analisis['Importancia_Dinamica'] * factor_importancia_seguridad
    dias_seguridad_totales = dias_seguridad_base + dias_seguridad_adicionales
    df_analisis['Stock_de_Seguridad_Unds'] = (df_analisis['PDA_Final'] * dias_seguridad_totales).round()

    # Demanda Durante el Tiempo de Entrega (Lead Time)
    df_analisis['Demanda_Lead_Time_Unds'] = (df_analisis['PDA_Final'] * lead_time_dias).round()

    # Punto de Alerta IDEAL (El nivel al que deberías pedir para no usar tu stock de seguridad)
    df_analisis['Punto_de_Alerta_Ideal_Unds'] = df_analisis['Demanda_Lead_Time_Unds'] + df_analisis['Stock_de_Seguridad_Unds']
    
    # Punto de Alerta MÍNIMO (El nivel crítico, cuando ya estás consumiendo tu seguridad)
    # Usamos el Stock de Seguridad como el punto mínimo absoluto.
    df_analisis['Punto_de_Alerta_Minimo_Unds'] = df_analisis['Stock_de_Seguridad_Unds'].round()



    # --- PASO 3: Cálculo de Puntos de Alerta ---
    dias_seguridad_adicionales = df_analisis['Importancia_Dinamica'] * factor_importancia_seguridad
    dias_seguridad_totales = dias_seguridad_base + dias_seguridad_adicionales
    df_analisis['Stock_de_Seguridad_Unds'] = (df_analisis['PDA_Final'] * dias_seguridad_totales).round()
    df_analisis['Demanda_Lead_Time_Unds'] = (df_analisis['PDA_Final'] * lead_time_dias).round()
    df_analisis['Punto_de_Alerta_Ideal_Unds'] = df_analisis['Demanda_Lead_Time_Unds'] + df_analisis['Stock_de_Seguridad_Unds']
    df_analisis['Punto_de_Alerta_Minimo_Unds'] = df_analisis['Stock_de_Seguridad_Unds'].round()
    
    # Determinamos si se necesita una acción de pedido AHORA MISMO
    df_analisis['Accion_Requerida'] = np.where(
        df_analisis['Cantidad en stock actual'] < df_analisis['Punto_de_Alerta_Minimo_Unds'], 'Sí, URGENTE',
        np.where(df_analisis['Cantidad en stock actual'] < df_analisis['Punto_de_Alerta_Ideal_Unds'], 'Sí, Recomendado', 'No')
    )
    # df_analisis['Accion_Requerida'] = np.where(
    #     df_analisis['Cantidad en stock actual'] < df_analisis['Punto_de_Alerta_Minimo_Unds'], 'Sí, URGENTE', 'No')
    
    # Calculamos la sugerencia de pedido mínimo, necesaria para los KPIs
    cantidad_base_pedido_minimo = df_analisis['PDA_Final'] * dias_cubrir_con_pedido_minimo
    factor_ajuste_importancia_pedido_minimo = 1 + (df_analisis['Importancia_Dinamica'] * coef_importancia_para_pedido_minimo)
    df_analisis['Sugerencia_Pedido_Minimo_Unds'] = (cantidad_base_pedido_minimo * factor_ajuste_importancia_pedido_minimo * df_analisis['Factor_Rotacion_Ajustado_Minimo']).round().clip(lower=0)

    # Calculamos la diferencia para ver qué tan por debajo (o por encima) estamos
    df_analisis['Diferencia_vs_Alerta_Minima'] = df_analisis[stock_actual_col_stock] - df_analisis['Punto_de_Alerta_Minimo_Unds']



    # --- PASO 4: Filtrado y Cálculo de KPIs ---
    # # 4.1 Filtramos por categorías si el usuario lo proporcionó
    # if filtro_categorias and 'categoria' in df_analisis.columns:
    #     df_analisis = df_analisis[df_analisis['categoria'].str.strip().str.lower().isin([cat.lower() for cat in filtro_categorias])]
    

    # # 4.2 Filtramos por marcas si el usuario lo proporcionó
    # if filtro_marcas and 'marca' in df_analisis.columns:
    #     df_analisis = df_analisis[df_analisis['marca'].str.strip().str.lower().isin([marca.lower() for marca in filtro_marcas])]

    if excluir_sin_ventas:
        df_analisis = df_analisis[df_analisis['Ventas_Total_General'] > 0].copy()
    # print(f"DEBUG: 2. Después de filtrar por 'sin ventas', quedan {len(df_analisis)} filas.")
    

    if filtro_categorias and 'Categoría' in df_analisis.columns:
        # Normalizamos la lista de categorías a minúsculas y sin espacios
        categorias_normalizadas = [cat.strip().lower() for cat in filtro_categorias]
        
        # Comparamos contra la columna del DataFrame también normalizada
        # El .str.lower() y .str.strip() se aplican a cada valor de la columna antes de la comparación
        df_analisis = df_analisis[
            df_analisis['Categoría'].str.strip().str.lower().isin(categorias_normalizadas)
        ].copy()
    # print(f"DEBUG: 3. Después de filtrar por categorías, quedan {len(df_analisis)} filas.")

    if filtro_marcas and 'Marca' in df_analisis.columns:
        # Normalizamos la lista de marcas
        marcas_normalizadas = [marca.strip().lower() for marca in filtro_marcas]
        
        # Comparamos contra la columna de marcas normalizada
        df_analisis = df_analisis[
            df_analisis['Marca'].str.strip().str.lower().isin(marcas_normalizadas)
        ].copy()


    df_alerta = df_analisis[df_analisis['Accion_Requerida'] == 'Sí, URGENTE'].copy()

    skus_en_alerta_roja = len(df_alerta)
    inversion_urgente = 0
    proximo_quiebre_critico = "Ninguno"

    if not df_alerta.empty:
        inversion_urgente = (df_alerta['Sugerencia_Pedido_Minimo_Unds'] * df_alerta['Precio de compra actual (S/.)']).sum()
        
        df_alerta['dias_para_quiebre'] = (df_alerta['Cantidad en stock actual'] - df_alerta['Punto_de_Alerta_Minimo_Unds']) / df_alerta['PDA_Final'].replace(0, np.nan)
        productos_clase_a_en_alerta = df_alerta[df_alerta['Importancia_Dinamica'] > 0.8]
        
        if not productos_clase_a_en_alerta.empty:
            producto_urgente = productos_clase_a_en_alerta.sort_values(by='dias_para_quiebre').iloc[0]
            proximo_quiebre_critico = producto_urgente['Nombre del producto']

    insight_text = f"¡Atención! Tienes {skus_en_alerta_roja} productos en Alerta Roja (por debajo del stock de seguridad). Se recomienda una inversión urgente de S/ {inversion_urgente:,.2f} para evitar quiebres de stock."
    if skus_en_alerta_roja == 0:
        insight_text = "¡Todo en orden! Ningún producto se encuentra por debajo de su punto de alerta mínimo."

    kpis = {
        "SKUs en Alerta Roja": skus_en_alerta_roja,
        "Inversión Urgente Requerida": f"S/ {inversion_urgente:,.2f}",
        "Próximo Quiebre Crítico": proximo_quiebre_critico,
    }

    ascending_map = {
        'Diferencia_vs_Alerta_Minima': True, # Menor diferencia (más negativo) primero
        'Importancia_Dinamica': False,       # Mayor importancia primero
        'Inversion_Urgente': False           # Mayor inversión primero
    }
    
    if ordenar_por in df_alerta.columns:
        df_alerta.sort_values(by=ordenar_por, ascending=ascending_map.get(ordenar_por, True), inplace=True)
    

    print("Formateando el reporte final...")
    # --- PASO 5: FORMATEO FINAL DE SALIDA ---
    df_alerta['Diferencia (Stock vs Alerta)'] = df_alerta['Cantidad en stock actual'] - df_alerta['Punto_de_Alerta_Minimo_Unds']


    # # --- COLUMNAS DE SALIDA ACTUALIZADAS ---
    # columnas_salida_deseadas = [
    #     sku_col, nombre_prod_col_stock, categoria_col_stock, subcategoria_col_stock, marca_col_stock, 
    #     precio_compra_actual_col_stock, stock_actual_col_stock,
    #     # 'Dias_Cobertura_Stock_Actual', 
    #     'Punto_de_Alerta_Minimo_Unds', 'Punto_de_Alerta_Ideal_Unds',
    #     # 'Accion_Requerida',
    #     # 'Stock_de_Seguridad_Unds',
    #     # 'Stock_Minimo_Unds', 'Stock_Ideal_Unds', 
    #     # 'Sugerencia_Pedido_Minimo_Unds', 'Sugerencia_Pedido_Ideal_Unds', 
    #     'Importancia_Dinamica',
    #     'Ventas_Total_General', 'Ventas_Total_Reciente'
    #     # 'PDA_Final'
    # ]
    
    # Seleccionamos solo las columnas relevantes para ESTE reporte
    columnas_finales = [
        'SKU / Código de producto', 'Nombre del producto', 'Categoría', 'Marca',
        'Cantidad en stock actual', 'Punto_de_Alerta_Minimo_Unds', 'Punto_de_Alerta_Ideal_Unds',
        'Diferencia_vs_Alerta_Minima', 'Accion_Requerida', 'Importancia_Dinamica', 'PDA_Final'
    ]

    # columnas_finales_presentes = []
    # df_resultado_final_dict = {}
    # for col_s in columnas_salida_deseadas:
    #     if col_s in df_resultado.columns:
    #         df_resultado_final_dict[col_s] = df_resultado[col_s]
    #         columnas_finales_presentes.append(col_s)
    # if not df_resultado.empty:
    #     df_resultado_final = pd.DataFrame(df_resultado_final_dict)
    #     df_resultado_final = df_resultado_final[columnas_finales_presentes]
    # else: df_resultado_final = pd.DataFrame(columns=columnas_finales_presentes)
    

    df_final = df_analisis[[col for col in columnas_finales if col in df_analisis.columns]].copy()

    # Renombramos las columnas a un formato amigable para el usuario
    df_final.rename(columns={
        'sku': 'SKU / Código de producto',
        'nombre_producto': 'Nombre del producto',
        'categoria': 'Categoría',
        'marca': 'Marca',
        'stock_actual_col_stock': 'Stock Actual (Unds)',
        'Punto_de_Alerta_Minimo_Unds': 'Punto de Alerta Mínimo (Unds)',
        'Punto_de_Alerta_Ideal_Unds': 'Punto de Alerta Ideal (Unds)',
        'Diferencia_vs_Alerta_Minima': 'Diferencia (Stock vs Alerta Mín.)',
        'Accion_Requerida': '¿Pedir Ahora?',
        'Importancia_Dinamica': 'Índice de Importancia',
        'PDA_Final': 'Promedio Venta Diaria (Unds)'
    }, inplace=True)
    
    # Ordenamos por los productos más urgentes
    df_final = df_final.sort_values(by='Diferencia (Stock vs Alerta Mín.)', ascending=True)

    # Limpieza final para compatibilidad con JSON
    df_final = df_final.replace([np.inf, -np.inf], np.nan).where(pd.notna(df_final), None)
    
    # ... (Tu lógica para seleccionar y renombrar las columnas finales del `df_alerta`)
    
    return {
        "data": df_final,
        "summary": { "insight": insight_text, "kpis": kpis }
    }




# def process_csv_lista_basica_reposicion_historico(
#     df_ventas: pd.DataFrame,
#     df_inventario: pd.DataFrame,
#     dias_analisis_ventas_recientes: Optional[int] = 30,
#     dias_analisis_ventas_general: Optional[int] = 180,
#     peso_ventas_historicas: float = 0.6,
#     dias_cobertura_ideal_base: int = 10,
#     coef_importancia_para_cobertura_ideal: float = 0.05,
#     coef_rotacion_para_stock_ideal: float = 0.1,
#     dias_cubrir_con_pedido_minimo: int = 3,
#     coef_importancia_para_pedido_minimo: float = 0.1,
#     coef_rotacion_para_stock_minimo: float = 0.15,
#     importancia_minima_para_redondeo_a_1: float = 0.1,
#     incluir_productos_pasivos: bool = True,
#     cantidad_reposicion_para_pasivos: int = 1,
#     excluir_productos_sin_sugerencia_ideal: bool = False,
#     lead_time_dias: float = 7.0,
#     dias_seguridad_base: float = 0,
#     factor_importancia_seguridad: float = 1.0,
#     # --- NUEVOS PARÁMETROS ---
#     pesos_importancia: Optional[Dict[str, float]] = None,
#     excluir_sin_ventas: bool = True,
#     incluir_solo_categorias: Optional[List[str]] = None,
#     incluir_solo_marcas: Optional[List[str]] = None,
#     ordenar_por: str = 'Importancia',
#     filtro_skus: Optional[List[str]] = None,
# ) -> pd.DataFrame:
#     # --- 1. Definición de Nombres de Columna Única y Clara ---
#     sku_col = 'SKU / Código de producto'
#     fecha_col_ventas = 'Fecha de venta'
#     cantidad_col_ventas = 'Cantidad vendida'
#     precio_venta_col_ventas = 'Precio de venta unitario (S/.)'
#     marca_col_stock = 'Marca'
#     stock_actual_col_stock = 'Cantidad en stock actual'
#     nombre_prod_col_stock = 'Nombre del producto'
#     categoria_col_stock = 'Categoría'
#     subcategoria_col_stock = 'Subcategoría'
#     precio_compra_actual_col_stock = 'Precio de compra actual (S/.)'
#     precio_venta_actual_col_stock = 'Precio de venta actual (S/.)' # Columna del inventario
    
#     # Nombres para columnas calculadas
#     precio_venta_prom_col = 'Precio_Venta_Prom_Reciente'
#     sugerencia_ideal_col = 'Sugerencia_Pedido_Ideal_Unds'

#     # --- 2. Pre-procesamiento y Estandarización de Tipos ---
#     df_ventas_proc = df_ventas.copy()
#     df_inventario_proc = df_inventario.copy()

#     # Forzamos la columna de unión a ser string
#     df_ventas_proc[sku_col] = df_ventas_proc[sku_col].astype(str).str.strip()
#     df_inventario_proc[sku_col] = df_inventario_proc[sku_col].astype(str).str.strip()

#     if filtro_skus:
#         print(f"Ejecutando reporte en modo contextual para {len(filtro_skus)} SKUs.")
#         df_inventario_proc = df_inventario_proc[df_inventario_proc[sku_col].isin(filtro_skus)]
#         df_ventas_proc = df_ventas_proc[df_ventas_proc[sku_col].isin(filtro_skus)]


#     # Forzamos las columnas numéricas a un tipo que soporta negativos (float)
#     numeric_cols_inv = [stock_actual_col_stock, precio_compra_actual_col_stock, precio_venta_actual_col_stock]
#     for col in numeric_cols_inv:
#         if col in df_inventario_proc.columns:
#             df_inventario_proc[col] = pd.to_numeric(df_inventario_proc[col], errors='coerce')

#     numeric_cols_ventas = [cantidad_col_ventas, precio_venta_col_ventas]
#     for col in numeric_cols_ventas:
#         if col in df_ventas_proc.columns:
#             df_ventas_proc[col] = pd.to_numeric(df_ventas_proc[col], errors='coerce')
    
#     df_ventas_proc[fecha_col_ventas] = pd.to_datetime(df_ventas_proc[fecha_col_ventas], format='%d/%m/%Y', errors='coerce')
#     df_ventas_proc.dropna(subset=[fecha_col_ventas], inplace=True)
#     if df_ventas_proc.empty: return pd.DataFrame()
#     fecha_max_venta = df_ventas_proc[fecha_col_ventas].max()
#     if pd.isna(fecha_max_venta): return pd.DataFrame()
    
#     final_dias_recientes, final_dias_general = dias_analisis_ventas_recientes, dias_analisis_ventas_general
#     if dias_analisis_ventas_recientes is None or dias_analisis_ventas_general is None:
#         sug_rec, sug_gen = _sugerir_periodos_analisis(df_ventas_proc, fecha_col_ventas)
#         if final_dias_recientes is None: final_dias_recientes = sug_rec
#         if final_dias_general is None: final_dias_general = sug_gen
    
#     final_dias_recientes = max(1, final_dias_recientes)
#     final_dias_general = max(1, final_dias_general)
#     if final_dias_general < final_dias_recientes: final_dias_general = final_dias_recientes

#     def agregar_ventas_periodo(df_v, periodo_dias, fecha_max, sku_c, fecha_c, cant_c, p_venta_c, sufijo):
#         if pd.isna(fecha_max) or periodo_dias <= 0: return pd.DataFrame(columns=[sku_c, f'Ventas_Total{sufijo}', f'Dias_Con_Venta{sufijo}', f'Precio_Venta_Prom{sufijo}'])
#         fecha_inicio = fecha_max - pd.Timedelta(days=periodo_dias)
#         df_periodo = df_v[df_v[fecha_c] >= fecha_inicio].copy()
#         if df_periodo.empty: return pd.DataFrame(columns=[sku_c, f'Ventas_Total{sufijo}', f'Dias_Con_Venta{sufijo}', f'Precio_Venta_Prom{sufijo}'])
#         agg_ventas = df_periodo.groupby(sku_c).agg(Ventas_Total=(cant_c, 'sum'), Dias_Con_Venta=(fecha_c, 'nunique'), Precio_Venta_Prom=(p_venta_c, 'mean')).reset_index()
#         agg_ventas.columns = [sku_c] + [f'{col}{sufijo}' for col in agg_ventas.columns[1:]]
#         return agg_ventas

#     df_ventas_rec_agg = agregar_ventas_periodo(df_ventas_proc, final_dias_recientes, fecha_max_venta, sku_col, fecha_col_ventas, cantidad_col_ventas, precio_venta_col_ventas, '_Reciente')
#     df_ventas_gen_agg = agregar_ventas_periodo(df_ventas_proc, final_dias_general, fecha_max_venta, sku_col, fecha_col_ventas, cantidad_col_ventas, precio_venta_col_ventas, '_General')

#     df_analisis = pd.merge(df_inventario_proc, df_ventas_rec_agg, on=sku_col, how='left')
#     if not df_ventas_gen_agg.empty: df_analisis = pd.merge(df_analisis, df_ventas_gen_agg, on=sku_col, how='left')
#     # print(f"DEBUG: 1. Después del merge inicial, el DataFrame tiene {len(df_analisis)} filas.")

#     cols_a_rellenar = ['Ventas_Total_Reciente', 'Dias_Con_Venta_Reciente', 'Precio_Venta_Prom_Reciente', 'Ventas_Total_General', 'Dias_Con_Venta_General', 'Precio_Venta_Prom_General']
#     for col in cols_a_rellenar:
#         if col not in df_analisis.columns: df_analisis[col] = 0.0
#         else: df_analisis[col] = df_analisis[col].fillna(0)
    
#     if excluir_sin_ventas:
#         df_analisis = df_analisis[df_analisis['Ventas_Total_General'] > 0].copy()
#     # print(f"DEBUG: 2. Después de filtrar por 'sin ventas', quedan {len(df_analisis)} filas.")
    

#     if incluir_solo_categorias and categoria_col_stock in df_analisis.columns:
#         # Normalizamos la lista de categorías a minúsculas y sin espacios
#         categorias_normalizadas = [cat.strip().lower() for cat in incluir_solo_categorias]
        
#         # Comparamos contra la columna del DataFrame también normalizada
#         # El .str.lower() y .str.strip() se aplican a cada valor de la columna antes de la comparación
#         df_analisis = df_analisis[
#             df_analisis[categoria_col_stock].str.strip().str.lower().isin(categorias_normalizadas)
#         ].copy()
#     # print(f"DEBUG: 3. Después de filtrar por categorías, quedan {len(df_analisis)} filas.")

#     if incluir_solo_marcas and marca_col_stock in df_analisis.columns:
#         # Normalizamos la lista de marcas
#         marcas_normalizadas = [marca.strip().lower() for marca in incluir_solo_marcas]
        
#         # Comparamos contra la columna de marcas normalizada
#         df_analisis = df_analisis[
#             df_analisis[marca_col_stock].str.strip().str.lower().isin(marcas_normalizadas)
#         ].copy()
#     # print(f"DEBUG: 4. Después de filtrar por marcas, quedan {len(df_analisis)} filas.")
    
#     if df_analisis.empty:
#         # print("❌ DEBUG: El DataFrame está vacío ANTES del último filtro. La función terminará aquí.")
#         return {
#             "data": pd.DataFrame(),
#             "summary": {
#                 "insight": "No se encontraron productos que coincidan con los filtros aplicados.",
#                 "kpis": {}
#             }
#         }
    
#     df_analisis['Margen_Bruto_con_PCA'] = df_analisis['Precio_Venta_Prom_Reciente'] - df_analisis[precio_compra_actual_col_stock]
#     df_analisis['Ingreso_Total_Reciente'] = df_analisis['Ventas_Total_Reciente'] * df_analisis['Precio_Venta_Prom_Reciente']
    
#     ventas_diarias_recientes = df_analisis['Ventas_Total_Reciente'] / final_dias_recientes
#     ventas_diarias_generales = df_analisis['Ventas_Total_General'] / final_dias_general
#     df_analisis['Ventas_Ponderadas_para_Importancia'] = (ventas_diarias_recientes * (1 - peso_ventas_historicas) + ventas_diarias_generales * peso_ventas_historicas)
    
#     cols_for_rank = ['Ventas_Ponderadas_para_Importancia', 'Ingreso_Total_Reciente', 'Margen_Bruto_con_PCA', 'Dias_Con_Venta_Reciente']
#     for col_rank in cols_for_rank:
#         df_analisis[col_rank] = pd.to_numeric(df_analisis[col_rank], errors='coerce').fillna(0)

#     pesos_default = {'ventas': 0.4, 'ingreso': 0.3, 'margen': 0.2, 'dias_venta': 0.1}
#     pesos_finales = pesos_default
#     if pesos_importancia:
#         pesos_finales = {**pesos_default, **pesos_importancia}

#     df_analisis['Importancia_Dinamica'] = (
#         df_analisis['Ventas_Ponderadas_para_Importancia'].rank(pct=True) * pesos_finales['ventas'] +
#         df_analisis['Ingreso_Total_Reciente'].rank(pct=True) * pesos_finales['ingreso'] +
#         df_analisis['Margen_Bruto_con_PCA'].rank(pct=True) * pesos_finales['margen'] +
#         df_analisis['Dias_Con_Venta_Reciente'].rank(pct=True) * pesos_finales['dias_venta']
#     ).fillna(0).round(3)

#     # --- SECCIÓN CRÍTICA #1 CORREGIDA ---
#     # pda_efectivo_reciente_array = np.where(df_analisis['Dias_Con_Venta_Reciente'] > 0, df_analisis['Ventas_Total_Reciente'] / df_analisis['Dias_Con_Venta_Reciente'], 0)
#     # pda_efectivo_general_array = np.where(df_analisis['Dias_Con_Venta_General'] > 0, df_analisis['Ventas_Total_General'] / df_analisis['Dias_Con_Venta_General'], 0)
#     # pda_calendario_general_series = df_analisis['Ventas_Total_General'] / final_dias_general if final_dias_general > 0 else 0
    
#     # pda_reciente_a_usar = np.where(pda_efectivo_reciente_array > 0, pda_efectivo_reciente_array, pda_efectivo_general_array)
#     # pda_general_a_usar = np.where(pda_efectivo_general_array > 0, pda_efectivo_general_array, pda_calendario_general_series)
    
#     # resultado_pda_array = (pda_reciente_a_usar * (1 - peso_ventas_historicas) + pda_general_a_usar * peso_ventas_historicas)
#     # # Conversión explícita a Serie de Pandas ANTES de llamar a .fillna()
#     # df_analisis['PDA_Final'] = pd.Series(resultado_pda_array, index=df_analisis.index).fillna(0).round(2)

#     # factores_por_categoria_default = {'DEFAULT': 1.0}
#     # factores_por_categoria_ej = {'Herramientas manuales': 1.1, 'Herramientas eléctricas': 1.05, 'Material eléctrico': 1.3, 'Tornillería': 1.5, 'Adhesivos y selladores': 1.2}
#     # factores_por_categoria_final = {**factores_por_categoria_default, **factores_por_categoria_ej}
#     # df_analisis['Factor_Reposicion_Categoria'] = df_analisis[categoria_col_stock].map(factores_por_categoria_final).fillna(factores_por_categoria_final['DEFAULT'])
    
#     # df_analisis['Factor_Rotacion_Crudo'] = df_analisis['Ventas_Total_Reciente'] / (df_analisis[stock_actual_col_stock] + 1e-6)
#     # df_analisis['Factor_Rotacion_Ajustado_Ideal'] = 1 + (df_analisis['Factor_Rotacion_Crudo'].rank(pct=True).fillna(0) * coef_rotacion_para_stock_ideal)
#     # df_analisis['Factor_Rotacion_Ajustado_Minimo'] = 1 + (df_analisis['Factor_Rotacion_Crudo'].rank(pct=True).fillna(0) * coef_rotacion_para_stock_minimo)
#     # df_analisis['Factor_Ajuste_Cobertura_Por_Importancia'] = 1 + (df_analisis['Importancia_Dinamica'] * coef_importancia_para_cobertura_ideal)
    
#     # df_analisis['Dias_Cobertura_Ideal_Ajustados'] = (dias_cobertura_ideal_base * df_analisis['Factor_Ajuste_Cobertura_Por_Importancia']).round(1)
#     # df_analisis['Stock_Ideal_Unds'] = (df_analisis['PDA_Final'] * df_analisis['Dias_Cobertura_Ideal_Ajustados'] * df_analisis['Factor_Reposicion_Categoria'] * df_analisis['Factor_Rotacion_Ajustado_Ideal']).round().clip(lower=0)
#     # df_analisis['Stock_Minimo_Unds'] = (df_analisis['PDA_Final'] * dias_cubrir_con_pedido_minimo * df_analisis['Factor_Rotacion_Ajustado_Minimo']).round().clip(lower=0)
    
#     # dias_seguridad_adicionales = df_analisis['Importancia_Dinamica'] * factor_importancia_seguridad
#     # dias_seguridad_totales = dias_seguridad_base + dias_seguridad_adicionales
#     # df_analisis['Stock_de_Seguridad_Unds'] = (df_analisis['PDA_Final'] * dias_seguridad_totales).round()
#     # df_analisis['Demanda_Lead_Time_Unds'] = (df_analisis['PDA_Final'] * lead_time_dias).round()
#     # df_analisis['Punto_de_Alerta_Ideal_Unds'] = df_analisis['Demanda_Lead_Time_Unds'] + df_analisis['Stock_de_Seguridad_Unds']
    
#     # valor_si_verdadero = np.ceil(df_analisis['Stock_de_Seguridad_Unds'] + df_analisis['PDA_Final'])
#     # alerta_minimo_calculado_array = np.where((df_analisis['Ventas_Total_Reciente'] > 1) | (df_analisis['PDA_Final'] > 0), valor_si_verdadero, df_analisis['Stock_de_Seguridad_Unds'])
#     # df_analisis['Punto_de_Alerta_Minimo_Unds'] = np.minimum(alerta_minimo_calculado_array, df_analisis['Stock_Minimo_Unds'])
    
#     # df_analisis['Accion_Requerida'] = np.where(df_analisis[stock_actual_col_stock] < df_analisis['Punto_de_Alerta_Minimo_Unds'], 'Sí', 'No')
#     # df_analisis['Sugerencia_Pedido_Ideal_Unds'] = (df_analisis['Stock_Ideal_Unds'] - df_analisis[stock_actual_col_stock]).clip(lower=0).round()
#     # df_analisis['Sugerencia_Pedido_Minimo_Unds'] = (df_analisis['PDA_Final'] * dias_cubrir_con_pedido_minimo * (1 + df_analisis['Importancia_Dinamica'] * coef_importancia_para_pedido_minimo) * df_analisis['Factor_Rotacion_Ajustado_Minimo']).round().clip(lower=0)
    
#     # cond_importancia_alta = df_analisis['Importancia_Dinamica'] >= importancia_minima_para_redondeo_a_1
#     # df_analisis.loc[cond_importancia_alta & (df_analisis['Sugerencia_Pedido_Ideal_Unds'] > 0) & (df_analisis['Sugerencia_Pedido_Ideal_Unds'] < 1), 'Sugerencia_Pedido_Ideal_Unds'] = 1
#     # df_analisis.loc[cond_importancia_alta & (df_analisis['Sugerencia_Pedido_Minimo_Unds'] > 0) & (df_analisis['Sugerencia_Pedido_Minimo_Unds'] < 1), 'Sugerencia_Pedido_Minimo_Unds'] = 1
    
#     # cond_pasivo = (df_analisis['PDA_Final'] <= 1e-6) & (df_analisis[stock_actual_col_stock] == 0) & (df_analisis['Ventas_Total_Reciente'] > 0)
#     # if incluir_productos_pasivos:
#     #     df_analisis.loc[cond_pasivo, ['Sugerencia_Pedido_Ideal_Unds', 'Stock_Ideal_Unds', 'Sugerencia_Pedido_Minimo_Unds', 'Stock_Minimo_Unds']] = cantidad_reposicion_para_pasivos

#     # cobertura_array = np.where(df_analisis['PDA_Final'] > 1e-6, df_analisis[stock_actual_col_stock] / df_analisis['PDA_Final'], np.inf)
#     # df_analisis['Dias_Cobertura_Stock_Actual'] = pd.Series(cobertura_array, index=df_analisis.index).fillna(np.inf)
#     # df_analisis.loc[df_analisis[stock_actual_col_stock] == 0, 'Dias_Cobertura_Stock_Actual'] = 0
#     # df_analisis['Dias_Cobertura_Stock_Actual'] = df_analisis['Dias_Cobertura_Stock_Actual'].round(1)
#     # df_analisis['Dias_Cobertura_Stock_Actual'] = df_analisis['Dias_Cobertura_Stock_Actual'].replace(np.inf, 9999)

#     # --- FASE 3: LA LÓGICA DE DOBLE PDA ---
#     print("Fase 3: Calculando PDA Estratégico y Táctico...")

#     # Herramienta 1: PDA Estratégico (Demanda Real)
#     # Basado en días calendario. Es la fuente de verdad para la salud del inventario.
#     pda_demanda_reciente = df_analisis['Ventas_Total_Reciente'] / final_dias_recientes if final_dias_recientes > 0 else 0
#     pda_demanda_general = df_analisis['Ventas_Total_General'] / final_dias_general if final_dias_general > 0 else 0
#     df_analisis['PDA_Demanda_Estrategica'] = (pda_demanda_reciente * (1 - peso_ventas_historicas) + pda_demanda_general * peso_ventas_historicas)

#     # Herramienta 2: PDA Táctico (Velocidad de Venta)
#     # Basado en días de venta efectivos. Es optimista, ideal para no subestimar pedidos.
#     pda_velocidad_reciente = np.where(df_analisis['Dias_Con_Venta_Reciente'] > 0, df_analisis['Ventas_Total_Reciente'] / df_analisis['Dias_Con_Venta_Reciente'], 0)
#     pda_velocidad_general = np.where(df_analisis['Dias_Con_Venta_General'] > 0, df_analisis['Ventas_Total_General'] / df_analisis['Dias_Con_Venta_General'], 0)
#     df_analisis['PDA_Velocidad_Tactica'] = np.where(pda_velocidad_reciente > 0, pda_velocidad_reciente, pda_velocidad_general)

#     # --- FASE 4: CÁLCULOS ESTRATÉGICOS (USANDO PDA DE DEMANDA) ---
#     print("Fase 4: Calculando métricas estratégicas...")

#     # La Cobertura y el Stock de Seguridad AHORA se basan en la demanda real.
#     df_analisis['Dias_Cobertura_Stock_Actual'] = np.where(
#         df_analisis['PDA_Demanda_Estrategica'] > 1e-6,
#         df_analisis[stock_actual_col_stock] / df_analisis['PDA_Demanda_Estrategica'],
#         np.inf # Si no hay demanda, la cobertura es infinita
#     )
#     df_analisis.loc[df_analisis[stock_actual_col_stock] == 0, 'Dias_Cobertura_Stock_Actual'] = 0

#     dias_seguridad_adicionales = df_analisis['Importancia_Dinamica'] * factor_importancia_seguridad
#     dias_seguridad_totales = dias_seguridad_base + dias_seguridad_adicionales
#     df_analisis['Stock_de_Seguridad_Unds'] = (df_analisis['PDA_Demanda_Estrategica'] * dias_seguridad_totales).round(2)
    
#     df_analisis['Demanda_Lead_Time_Unds'] = (df_analisis['PDA_Demanda_Estrategica'] * lead_time_dias).round(2)
#     df_analisis['Punto_de_Alerta_Ideal_Unds'] = df_analisis['Demanda_Lead_Time_Unds'] + df_analisis['Stock_de_Seguridad_Unds']
#     df_analisis['Punto_de_Alerta_Minimo_Unds'] = df_analisis['Stock_de_Seguridad_Unds'] # Simplificado para claridad

#     df_resultado = df_analisis.copy()

#     if excluir_productos_sin_sugerencia_ideal:
#         df_resultado = df_resultado[df_resultado[SUGERENCIA_IDEAL_COL] > 0]
#         if df_resultado.empty: 
#             return {"data": pd.DataFrame(), "summary": {"insight": "No se encontraron productos para reponer con los filtros aplicados.", "kpis": {}}}

#     print("Calculando el Índice de Urgencia para todos los productos...")

#     # # 1. Identificamos los productos que están en un estado de urgencia.
#     # condicion_urgencia = df_resultado[stock_actual_col_stock] < df_resultado['Punto_de_Alerta_Minimo_Unds']

#     # # 2. Calculamos la "Severidad del Faltante" (de 0 a 1+).
#     # #    Usamos .replace() para evitar la división por cero de forma segura.
#     # punto_alerta_minimo_safe = df_resultado['Punto_de_Alerta_Minimo_Unds'].replace(0, 1e-6)
#     # score_necesidad = 1 - (df_resultado[stock_actual_col_stock] / punto_alerta_minimo_safe)
    
#     # # 3. Calculamos el Índice de Urgencia ponderado por la importancia.
#     # urgency_score_series = score_necesidad * df_resultado['Importancia_Dinamica']

#     # # 4. Creamos la nueva columna permanente.
#     # #    Tendrá un valor solo para los productos que cumplen la condición; el resto será 0.
#     # temp_urgency_array = np.where(condicion_urgencia, urgency_score_series, 0)
#     # df_resultado['Índice de Urgencia'] = pd.Series(temp_urgency_array, index=df_resultado.index).fillna(0)

#     # El Índice de Urgencia ahora es fiable para productos con stock cero.
#     condicion_urgencia = df_resultado[stock_actual_col_stock] < df_resultado['Punto_de_Alerta_Minimo_Unds']
#     punto_alerta_minimo_safe = df_resultado['Punto_de_Alerta_Minimo_Unds'].replace(0, 1e-6)
#     score_necesidad = 1 - (df_resultado[stock_actual_col_stock] / punto_alerta_minimo_safe)
#     urgency_score_series = score_necesidad * df_resultado['Importancia_Dinamica']
#     temp_urgency_array = np.where(condicion_urgencia, urgency_score_series, 0)
#     df_resultado['Índice de Urgencia'] = pd.Series(temp_urgency_array, index=df_resultado.index).fillna(0)
#     # df_resultado['Índice de Urgencia'] = np.where(condicion_urgencia, urgency_score_series, 0).fill(0)

#     # --- FASE 5: CÁLCULOS TÁCTICOS (USANDO PDA DE VELOCIDAD) ---
#     print("Fase 5: Calculando sugerencias de pedido...")
#     factores_por_categoria_default = {'DEFAULT': 1.0}
#     factores_por_categoria_ej = {'Herramientas manuales': 1.1, 'Herramientas eléctricas': 1.05, 'Material eléctrico': 1.3, 'Tornillería': 1.5, 'Adhesivos y selladores': 1.2}
#     factores_por_categoria_final = {**factores_por_categoria_default, **factores_por_categoria_ej}
#     df_resultado['Factor_Reposicion_Categoria'] = df_resultado[categoria_col_stock].map(factores_por_categoria_final).fillna(factores_por_categoria_final['DEFAULT'])
    
#     df_resultado['Factor_Rotacion_Crudo'] = df_resultado['Ventas_Total_Reciente'] / (df_resultado[stock_actual_col_stock] + 1e-6)
#     df_resultado['Factor_Rotacion_Ajustado_Ideal'] = 1 + (df_resultado['Factor_Rotacion_Crudo'].rank(pct=True).fillna(0) * coef_rotacion_para_stock_ideal)
#     # df_analisis['Factor_Rotacion_Ajustado_Minimo'] = 1 + (df_analisis['Factor_Rotacion_Crudo'].rank(pct=True).fillna(0) * coef_rotacion_para_stock_minimo)
#     # df_analisis['Factor_Ajuste_Cobertura_Por_Importancia'] = 1 + (df_analisis['Importancia_Dinamica'] * coef_importancia_para_cobertura_ideal)
    
#     # Las cantidades a pedir pueden seguir usando el PDA Táctico para ser más optimistas.
#     df_resultado['Factor_Ajuste_Cobertura_Por_Importancia'] = 1 + (df_resultado['Importancia_Dinamica'] * coef_importancia_para_cobertura_ideal)
#     df_resultado['Dias_Cobertura_Ideal_Ajustados'] = (dias_cobertura_ideal_base * df_resultado['Factor_Ajuste_Cobertura_Por_Importancia']).round(1)
#     df_resultado['Accion_Requerida'] = np.where(df_resultado[stock_actual_col_stock] < df_resultado['Punto_de_Alerta_Minimo_Unds'], 'Sí', 'No')
#     df_resultado['Stock_Ideal_Unds'] = (df_resultado['PDA_Velocidad_Tactica'] * df_resultado['Dias_Cobertura_Ideal_Ajustados'] * df_resultado['Factor_Reposicion_Categoria'] * df_resultado['Factor_Rotacion_Ajustado_Ideal']).round().clip(lower=0)
#     # df_resultado['Stock_Ideal_Unds'] = (df_resultado['PDA_Velocidad_Tactica'] * df_resultado['Dias_Cobertura_Ideal_Ajustados'] * ...).round().clip(lower=0)
#     df_resultado['Sugerencia_Pedido_Ideal_Unds'] = (df_resultado['Stock_Ideal_Unds'] - df_resultado[stock_actual_col_stock]).clip(lower=0).round()
   










#     # --- SECCIÓN DE ORDENAMIENTO DINÁMICO ---
#     if ordenar_por == 'Inversion Requerida':
#         df_resultado['temp_sort_col'] = df_resultado['Sugerencia_Pedido_Ideal_Unds'] * df_resultado[precio_compra_actual_col_stock]
#         df_resultado = df_resultado.sort_values(by='temp_sort_col', ascending=False)
#     elif ordenar_por == 'Cantidad a Comprar':
#         df_resultado = df_resultado.sort_values(by='Sugerencia_Pedido_Ideal_Unds', ascending=False)
#     elif ordenar_por == 'Margen Potencial':
#         df_resultado['temp_sort_col'] = (df_resultado['Precio_Venta_Prom_Reciente'] - df_resultado[precio_compra_actual_col_stock]) * df_resultado['Sugerencia_Pedido_Ideal_Unds']
#         df_resultado = df_resultado.sort_values(by='temp_sort_col', ascending=False)
#     elif ordenar_por == 'Categoría' and categoria_col_stock in df_resultado.columns:
#         df_resultado = df_resultado.sort_values(by=[categoria_col_stock, 'Importancia_Dinamica'], ascending=[True, False])
#     elif ordenar_por == 'Próximos a Agotarse':
#         df_resultado = df_resultado.sort_values(by='Dias_Cobertura_Stock_Actual', ascending=True)
#     elif ordenar_por == 'Índice de Urgencia':
#          df_resultado.sort_values(by='Índice de Urgencia', ascending=False, inplace=True)
#     elif ordenar_por == 'rotacion':
#         df_resultado = df_resultado.sort_values(by='Factor_Rotacion_Crudo', ascending=False)
#     else: # Por defecto, 'Importancia'
#         df_resultado = df_resultado.sort_values(by='Importancia_Dinamica', ascending=False)
    
#     print(f"df_resultado.columns 2 {df_resultado.columns}")


#     # --- INICIO DE LA NUEVA LÓGICA DE RESUMEN ---

#     # --- PASO 9: CÁLCULO Y EXPOSICIÓN DE MÁRGENES PARA DEBUG ---
#     print("Calculando márgenes detallados para auditoría...")

#     # Aseguramos que las columnas necesarias existan y sean numéricas antes de usarlas
#     for col in [precio_venta_actual_col_stock, precio_compra_actual_col_stock, precio_venta_prom_col]:
#         if col in df_resultado.columns:
#             df_resultado[col] = pd.to_numeric(df_resultado[col], errors='coerce').fillna(0)
#         else:
#             df_resultado[col] = 0 # Si no existe, la creamos con ceros para evitar errores

#     # Margen Teórico: Basado en el precio de lista actual del inventario.
#     df_resultado['debug_margen_lista'] = df_resultado[precio_venta_actual_col_stock] - df_resultado[precio_compra_actual_col_stock]
    
#     # Margen Real: Basado en el precio promedio de las ventas recientes.
#     df_resultado['debug_margen_promedio'] = df_resultado[precio_venta_prom_col] - df_resultado[precio_compra_actual_col_stock]


#     # --- PASO 10: CÁLCULO DE KPIs Y RESUMEN (usando los márgenes auditados) ---
    
#     df_a_reponer = df_resultado[df_resultado[sugerencia_ideal_col] > 0].copy()

#     if not df_a_reponer.empty:
#         inversion_total = (df_a_reponer[sugerencia_ideal_col] * df_a_reponer[precio_compra_actual_col_stock]).sum()
#         skus_a_reponer = int(df_a_reponer[sku_col].nunique())
#         unidades_a_pedir = int(df_a_reponer[sugerencia_ideal_col].sum())
        
#         # CÁLCULO CORREGIDO: Para el margen potencial, solo sumamos los productos que generan ganancia real.
#         # Usamos .clip(lower=0) para tratar cualquier margen negativo como 0 en la suma.
#         # margen_potencial = (df_a_reponer[sugerencia_ideal_col] * df_a_reponer['debug_margen_promedio'].clip(lower=0)).sum()
#         margen_potencial = (df_a_reponer[sugerencia_ideal_col] * df_a_reponer['debug_margen_lista'].clip(lower=0)).sum()
#     else:
#         inversion_total, skus_a_reponer, unidades_a_pedir, margen_potencial = 0, 0, 0, 0

#     insight_text = f"Hemos identificado {skus_a_reponer} productos que necesitan una inversión de S/ {inversion_total:,.2f} para optimizar tu inventario."
#     if skus_a_reponer == 0:
#         insight_text = "¡Buen trabajo! Tu inventario parece estar bien abastecido."

#     kpis = {
#         "Inversión Total Sugerida": f"S/ {inversion_total:,.2f}",
#         "SKUs a Reponer": skus_a_reponer,
#         "Unidades Totales a Pedir": unidades_a_pedir,
#         "Margen Potencial de la Compra": f"S/ {margen_potencial:,.2f}"
#     }
#     # --- FIN DE LA NUEVA LÓGICA DE RESUMEN ---


#     columnas_salida_deseadas = [
#         sku_col, nombre_prod_col_stock, categoria_col_stock, subcategoria_col_stock, marca_col_stock, 
#         precio_compra_actual_col_stock, stock_actual_col_stock,
#         'Dias_Cobertura_Stock_Actual',
#         'Punto_de_Alerta_Minimo_Unds', 'Punto_de_Alerta_Ideal_Unds',
#         'Accion_Requerida', 'Stock_de_Seguridad_Unds',
#         'Stock_Minimo_Unds', 'Stock_Ideal_Unds', 
#         'Sugerencia_Pedido_Minimo_Unds', 'Sugerencia_Pedido_Ideal_Unds', 
#         'Importancia_Dinamica', 'Índice de Urgencia',
#         'PDA_Demanda_Estrategica', 'PDA_Velocidad_Tactica',
#         'Ventas_Total_Reciente', 'Ventas_Total_General'
#         # precio_venta_prom_col,
#         # 'debug_margen_promedio',
#         # precio_venta_actual_col_stock,
#         # 'debug_margen_lista'
#     ]
       
#     df_resultado_final = df_resultado[[col for col in columnas_salida_deseadas if col in df_resultado.columns]].copy()
    
#     if 'temp_sort_col' in df_resultado_final.columns:
#         df_resultado_final = df_resultado_final.drop(columns=['temp_sort_col'])
    
#     if not df_resultado_final.empty:
#         column_rename_map = {
#             stock_actual_col_stock: 'Stock Actual (Unds)',
#             precio_compra_actual_col_stock: 'Precio Compra Actual (S/.)',
#             'PDA_Final': 'Promedio Venta Diaria (Unds)',
#             'Dias_Cobertura_Stock_Actual': 'Cobertura Actual (Días)',
#             'Punto_de_Alerta_Ideal_Unds': 'Punto de Alerta Ideal (Unds)',
#             'Punto_de_Alerta_Minimo_Unds': 'Punto de Alerta Mínimo (Unds)',
#             'Accion_Requerida': '¿Pedir Ahora?',
#             'Stock_de_Seguridad_Unds': 'Stock de Seguridad (Unds)',
#             'Stock_Minimo_Unds': 'Stock Mínimo Sugerido (Unds)',
#             'Stock_Ideal_Unds': 'Stock Ideal Sugerido (Unds)',
#             'Sugerencia_Pedido_Ideal_Unds': 'Pedido Ideal Sugerido (Unds)',
#             'Sugerencia_Pedido_Minimo_Unds': 'Pedido Mínimo Sugerido (Unds)',
#             'Importancia_Dinamica': 'Índice de Importancia',
#             'Ventas_Total_Reciente': f'Ventas Recientes ({final_dias_recientes}d) (Unds)',
#             'Ventas_Total_General' : f'Ventas Periodo General ({final_dias_general}d) (Unds)',
#             # 'debug_margen_lista': '[Debug] Margen s/ P. Lista',
#             # 'debug_margen_promedio': '[Debug] Margen s/ P. Promedio',
#             # precio_venta_prom_col: '[Debug] Precio Venta Promedio',
#             # precio_venta_actual_col_stock: '[Debug] Precio Venta Lista',
#         }
#         df_resultado_final.rename(columns=column_rename_map, inplace=True)

#     # --- PASO 11: LIMPIEZA FINAL PARA COMPATIBILIDAD CON JSON ---
#     # Este bloque ahora se aplica de forma segura al final.
#     if not df_resultado_final.empty:
#         # Reemplazamos infinitos con NaN
#         df_resultado_final = df_resultado_final.replace([np.inf, -np.inf], np.nan)
#         # Reemplazamos NaN con None, que es compatible con JSON (se convierte en 'null')
#         df_resultado_final = df_resultado_final.where(pd.notna(df_resultado_final), None)
   
#     # return resultado_final_json_safe
#     return {
#         "data": df_resultado_final,
#         "summary": {
#             "insight": insight_text,
#             "kpis": kpis
#         }
#     }



def process_csv_lista_basica_reposicion_historico(
    df_ventas: pd.DataFrame,
    df_inventario: pd.DataFrame,
    dias_analisis_ventas_recientes: Optional[int] = 30,
    dias_analisis_ventas_general: Optional[int] = 180,
    peso_ventas_historicas: float = 0.6,
    dias_cobertura_ideal_base: int = 10,
    coef_importancia_para_cobertura_ideal: float = 0.05,
    coef_rotacion_para_stock_ideal: float = 0.1,
    dias_cubrir_con_pedido_minimo: int = 3,
    coef_importancia_para_pedido_minimo: float = 0.1,
    coef_rotacion_para_stock_minimo: float = 0.15,
    importancia_minima_para_redondeo_a_1: float = 0.1,
    incluir_productos_pasivos: bool = True,
    cantidad_reposicion_para_pasivos: int = 1,
    excluir_productos_sin_sugerencia_ideal: bool = False,
    lead_time_dias: float = 7.0,
    dias_seguridad_base: float = 0,
    factor_importancia_seguridad: float = 1.0,
    # --- NUEVOS PARÁMETROS ---
    pesos_importancia: Optional[Dict[str, float]] = None,
    excluir_sin_ventas: bool = True,
    incluir_solo_categorias: Optional[List[str]] = None,
    incluir_solo_marcas: Optional[List[str]] = None,
    ordenar_por: str = 'Importancia',
    filtro_skus: Optional[List[str]] = None,
) -> pd.DataFrame:
    # --- 1. Definición de Nombres de Columna Única y Clara ---
    sku_col = 'SKU / Código de producto'
    fecha_col_ventas = 'Fecha de venta'
    cantidad_col_ventas = 'Cantidad vendida'
    precio_venta_col_ventas = 'Precio de venta unitario (S/.)'
    marca_col_stock = 'Marca'
    stock_actual_col_stock = 'Cantidad en stock actual'
    nombre_prod_col_stock = 'Nombre del producto'
    categoria_col_stock = 'Categoría'
    subcategoria_col_stock = 'Subcategoría'
    precio_compra_actual_col_stock = 'Precio de compra actual (S/.)'
    precio_venta_actual_col_stock = 'Precio de venta actual (S/.)' # Columna del inventario
    
    # Nombres para columnas calculadas
    precio_venta_prom_col = 'Precio_Venta_Prom_Reciente'
    sugerencia_ideal_col = 'Sugerencia_Pedido_Ideal_Unds'

    # --- 2. Pre-procesamiento y Estandarización de Tipos ---
    df_ventas_proc = df_ventas.copy()
    df_inventario_proc = df_inventario.copy()

    # Forzamos la columna de unión a ser string
    df_ventas_proc[sku_col] = df_ventas_proc[sku_col].astype(str).str.strip()
    df_inventario_proc[sku_col] = df_inventario_proc[sku_col].astype(str).str.strip()
    df_inventario_proc[stock_actual_col_stock] = pd.to_numeric(df_inventario_proc[stock_actual_col_stock], errors='coerce').fillna(0)

    if filtro_skus:
        print(f"Ejecutando reporte en modo contextual para {len(filtro_skus)} SKUs.")
        df_inventario_proc = df_inventario_proc[df_inventario_proc[sku_col].isin(filtro_skus)]
        df_ventas_proc = df_ventas_proc[df_ventas_proc[sku_col].isin(filtro_skus)]


    # Forzamos las columnas numéricas a un tipo que soporta negativos (float)
    numeric_cols_inv = [stock_actual_col_stock, precio_compra_actual_col_stock, precio_venta_actual_col_stock]
    for col in numeric_cols_inv:
        if col in df_inventario_proc.columns:
            df_inventario_proc[col] = pd.to_numeric(df_inventario_proc[col], errors='coerce')

    numeric_cols_ventas = [cantidad_col_ventas, precio_venta_col_ventas]
    for col in numeric_cols_ventas:
        if col in df_ventas_proc.columns:
            df_ventas_proc[col] = pd.to_numeric(df_ventas_proc[col], errors='coerce')
    
    df_ventas_proc[fecha_col_ventas] = pd.to_datetime(df_ventas_proc[fecha_col_ventas], format='%d/%m/%Y', errors='coerce')
    df_ventas_proc.dropna(subset=[fecha_col_ventas], inplace=True)
    if df_ventas_proc.empty: return pd.DataFrame()
    fecha_max_venta = df_ventas_proc[fecha_col_ventas].max()
    if pd.isna(fecha_max_venta): return pd.DataFrame()
    
    final_dias_recientes, final_dias_general = dias_analisis_ventas_recientes, dias_analisis_ventas_general
    if dias_analisis_ventas_recientes is None or dias_analisis_ventas_general is None:
        sug_rec, sug_gen = _sugerir_periodos_analisis(df_ventas_proc, fecha_col_ventas)
        if final_dias_recientes is None: final_dias_recientes = sug_rec
        if final_dias_general is None: final_dias_general = sug_gen
    
    final_dias_recientes = max(1, final_dias_recientes)
    final_dias_general = max(1, final_dias_general)
    if final_dias_general < final_dias_recientes: final_dias_general = final_dias_recientes

    def agregar_ventas_periodo(df_v, periodo_dias, fecha_max, sku_c, fecha_c, cant_c, p_venta_c, sufijo):
        if pd.isna(fecha_max) or periodo_dias <= 0: return pd.DataFrame(columns=[sku_c, f'Ventas_Total{sufijo}', f'Dias_Con_Venta{sufijo}', f'Precio_Venta_Prom{sufijo}'])
        fecha_inicio = fecha_max - pd.Timedelta(days=periodo_dias)
        df_periodo = df_v[df_v[fecha_c] >= fecha_inicio].copy()
        if df_periodo.empty: return pd.DataFrame(columns=[sku_c, f'Ventas_Total{sufijo}', f'Dias_Con_Venta{sufijo}', f'Precio_Venta_Prom{sufijo}'])
        agg_ventas = df_periodo.groupby(sku_c).agg(Ventas_Total=(cant_c, 'sum'), Dias_Con_Venta=(fecha_c, 'nunique'), Precio_Venta_Prom=(p_venta_c, 'mean')).reset_index()
        agg_ventas.columns = [sku_c] + [f'{col}{sufijo}' for col in agg_ventas.columns[1:]]
        return agg_ventas

    df_ventas_rec_agg = agregar_ventas_periodo(df_ventas_proc, final_dias_recientes, fecha_max_venta, sku_col, fecha_col_ventas, cantidad_col_ventas, precio_venta_col_ventas, '_Reciente')
    df_ventas_gen_agg = agregar_ventas_periodo(df_ventas_proc, final_dias_general, fecha_max_venta, sku_col, fecha_col_ventas, cantidad_col_ventas, precio_venta_col_ventas, '_General')

    df_analisis = pd.merge(df_inventario_proc, df_ventas_rec_agg, on=sku_col, how='left')
    if not df_ventas_gen_agg.empty: df_analisis = pd.merge(df_analisis, df_ventas_gen_agg, on=sku_col, how='left')
    # print(f"DEBUG: 1. Después del merge inicial, el DataFrame tiene {len(df_analisis)} filas.")

    cols_a_rellenar = ['Ventas_Total_Reciente', 'Dias_Con_Venta_Reciente', 'Precio_Venta_Prom_Reciente', 'Ventas_Total_General', 'Dias_Con_Venta_General', 'Precio_Venta_Prom_General']
    for col in cols_a_rellenar:
        if col not in df_analisis.columns: df_analisis[col] = 0.0
        else: df_analisis[col] = df_analisis[col].fillna(0)
    
    if excluir_sin_ventas:
        df_analisis = df_analisis[df_analisis['Ventas_Total_General'] > 0].copy()
    # print(f"DEBUG: 2. Después de filtrar por 'sin ventas', quedan {len(df_analisis)} filas.")
    

    if incluir_solo_categorias and categoria_col_stock in df_analisis.columns:
        # Normalizamos la lista de categorías a minúsculas y sin espacios
        categorias_normalizadas = [cat.strip().lower() for cat in incluir_solo_categorias]
        
        # Comparamos contra la columna del DataFrame también normalizada
        # El .str.lower() y .str.strip() se aplican a cada valor de la columna antes de la comparación
        df_analisis = df_analisis[
            df_analisis[categoria_col_stock].str.strip().str.lower().isin(categorias_normalizadas)
        ].copy()
    # print(f"DEBUG: 3. Después de filtrar por categorías, quedan {len(df_analisis)} filas.")

    if incluir_solo_marcas and marca_col_stock in df_analisis.columns:
        # Normalizamos la lista de marcas
        marcas_normalizadas = [marca.strip().lower() for marca in incluir_solo_marcas]
        
        # Comparamos contra la columna de marcas normalizada
        df_analisis = df_analisis[
            df_analisis[marca_col_stock].str.strip().str.lower().isin(marcas_normalizadas)
        ].copy()
    # print(f"DEBUG: 4. Después de filtrar por marcas, quedan {len(df_analisis)} filas.")
    
    if df_analisis.empty:
        # print("❌ DEBUG: El DataFrame está vacío ANTES del último filtro. La función terminará aquí.")
        return {
            "data": pd.DataFrame(),
            "summary": {
                "insight": "No se encontraron productos que coincidan con los filtros aplicados.",
                "kpis": {}
            }
        }
    
    df_analisis['Margen_Bruto_con_PCA'] = df_analisis['Precio_Venta_Prom_Reciente'] - df_analisis[precio_compra_actual_col_stock]
    df_analisis['Ingreso_Total_Reciente'] = df_analisis['Ventas_Total_Reciente'] * df_analisis['Precio_Venta_Prom_Reciente']
    
    ventas_diarias_recientes = df_analisis['Ventas_Total_Reciente'] / final_dias_recientes
    ventas_diarias_generales = df_analisis['Ventas_Total_General'] / final_dias_general
    df_analisis['Ventas_Ponderadas_para_Importancia'] = (ventas_diarias_recientes * (1 - peso_ventas_historicas) + ventas_diarias_generales * peso_ventas_historicas)
    
    cols_for_rank = ['Ventas_Ponderadas_para_Importancia', 'Ingreso_Total_Reciente', 'Margen_Bruto_con_PCA', 'Dias_Con_Venta_Reciente']
    for col_rank in cols_for_rank:
        df_analisis[col_rank] = pd.to_numeric(df_analisis[col_rank], errors='coerce').fillna(0)

    pesos_default = {'ventas': 0.4, 'ingreso': 0.3, 'margen': 0.2, 'dias_venta': 0.1}
    pesos_finales = pesos_default
    if pesos_importancia:
        pesos_finales = {**pesos_default, **pesos_importancia}

    df_analisis['Importancia_Dinamica'] = (
        df_analisis['Ventas_Ponderadas_para_Importancia'].rank(pct=True) * pesos_finales['ventas'] +
        df_analisis['Ingreso_Total_Reciente'].rank(pct=True) * pesos_finales['ingreso'] +
        df_analisis['Margen_Bruto_con_PCA'].rank(pct=True) * pesos_finales['margen'] +
        df_analisis['Dias_Con_Venta_Reciente'].rank(pct=True) * pesos_finales['dias_venta']
    ).fillna(0).round(3)

    # --- SECCIÓN CRÍTICA #1 CORREGIDA ---
    pda_efectivo_reciente_array = np.where(df_analisis['Dias_Con_Venta_Reciente'] > 0, df_analisis['Ventas_Total_Reciente'] / df_analisis['Dias_Con_Venta_Reciente'], 0)
    pda_efectivo_general_array = np.where(df_analisis['Dias_Con_Venta_General'] > 0, df_analisis['Ventas_Total_General'] / df_analisis['Dias_Con_Venta_General'], 0)
    pda_calendario_general_series = df_analisis['Ventas_Total_General'] / final_dias_general if final_dias_general > 0 else 0
    
    pda_reciente_a_usar = np.where(pda_efectivo_reciente_array > 0, pda_efectivo_reciente_array, pda_efectivo_general_array)
    pda_general_a_usar = np.where(pda_efectivo_general_array > 0, pda_efectivo_general_array, pda_calendario_general_series)
    
    resultado_pda_array = (pda_reciente_a_usar * (1 - peso_ventas_historicas) + pda_general_a_usar * peso_ventas_historicas)
    # Conversión explícita a Serie de Pandas ANTES de llamar a .fillna()
    df_analisis['PDA_Final'] = pd.Series(resultado_pda_array, index=df_analisis.index).fillna(0).round(2)

    factores_por_categoria_default = {'DEFAULT': 1.0}
    factores_por_categoria_ej = {'Herramientas manuales': 1.1, 'Herramientas eléctricas': 1.05, 'Material eléctrico': 1.3, 'Tornillería': 1.5, 'Adhesivos y selladores': 1.2}
    factores_por_categoria_final = {**factores_por_categoria_default, **factores_por_categoria_ej}
    df_analisis['Factor_Reposicion_Categoria'] = df_analisis[categoria_col_stock].map(factores_por_categoria_final).fillna(factores_por_categoria_final['DEFAULT'])
    
    df_analisis['Factor_Rotacion_Crudo'] = df_analisis['Ventas_Total_Reciente'] / (df_analisis[stock_actual_col_stock] + 1e-6)
    df_analisis['Factor_Rotacion_Ajustado_Ideal'] = 1 + (df_analisis['Factor_Rotacion_Crudo'].rank(pct=True).fillna(0) * coef_rotacion_para_stock_ideal)
    df_analisis['Factor_Rotacion_Ajustado_Minimo'] = 1 + (df_analisis['Factor_Rotacion_Crudo'].rank(pct=True).fillna(0) * coef_rotacion_para_stock_minimo)
    df_analisis['Factor_Ajuste_Cobertura_Por_Importancia'] = 1 + (df_analisis['Importancia_Dinamica'] * coef_importancia_para_cobertura_ideal)
    
    df_analisis['Dias_Cobertura_Ideal_Ajustados'] = (dias_cobertura_ideal_base * df_analisis['Factor_Ajuste_Cobertura_Por_Importancia']).round(1)
    df_analisis['Stock_Ideal_Unds'] = (df_analisis['PDA_Final'] * df_analisis['Dias_Cobertura_Ideal_Ajustados'] * df_analisis['Factor_Reposicion_Categoria'] * df_analisis['Factor_Rotacion_Ajustado_Ideal']).round().clip(lower=0)
    df_analisis['Stock_Minimo_Unds'] = (df_analisis['PDA_Final'] * dias_cubrir_con_pedido_minimo * df_analisis['Factor_Rotacion_Ajustado_Minimo']).round().clip(lower=0)
    
    dias_seguridad_adicionales = df_analisis['Importancia_Dinamica'] * factor_importancia_seguridad
    dias_seguridad_totales = dias_seguridad_base + dias_seguridad_adicionales
    df_analisis['Stock_de_Seguridad_Unds'] = (df_analisis['PDA_Final'] * dias_seguridad_totales).round()
    df_analisis['Demanda_Lead_Time_Unds'] = (df_analisis['PDA_Final'] * lead_time_dias).round()
    df_analisis['Punto_de_Alerta_Ideal_Unds'] = df_analisis['Demanda_Lead_Time_Unds'] + df_analisis['Stock_de_Seguridad_Unds']
    
    valor_si_verdadero = np.ceil(df_analisis['Stock_de_Seguridad_Unds'] + df_analisis['PDA_Final'])
    alerta_minimo_calculado_array = np.where((df_analisis['Ventas_Total_Reciente'] > 1) | (df_analisis['PDA_Final'] > 0), valor_si_verdadero, df_analisis['Stock_de_Seguridad_Unds'])
    df_analisis['Punto_de_Alerta_Minimo_Unds'] = np.minimum(alerta_minimo_calculado_array, df_analisis['Stock_Minimo_Unds'])
    
    df_analisis['Accion_Requerida'] = np.where(df_analisis[stock_actual_col_stock] < df_analisis['Punto_de_Alerta_Minimo_Unds'], 'Sí', 'No')
    df_analisis['Sugerencia_Pedido_Ideal_Unds'] = (df_analisis['Stock_Ideal_Unds'] - df_analisis[stock_actual_col_stock]).clip(lower=0).round()
    df_analisis['Sugerencia_Pedido_Minimo_Unds'] = (df_analisis['PDA_Final'] * dias_cubrir_con_pedido_minimo * (1 + df_analisis['Importancia_Dinamica'] * coef_importancia_para_pedido_minimo) * df_analisis['Factor_Rotacion_Ajustado_Minimo']).round().clip(lower=0)
    
    cond_importancia_alta = df_analisis['Importancia_Dinamica'] >= importancia_minima_para_redondeo_a_1
    df_analisis.loc[cond_importancia_alta & (df_analisis['Sugerencia_Pedido_Ideal_Unds'] > 0) & (df_analisis['Sugerencia_Pedido_Ideal_Unds'] < 1), 'Sugerencia_Pedido_Ideal_Unds'] = 1
    df_analisis.loc[cond_importancia_alta & (df_analisis['Sugerencia_Pedido_Minimo_Unds'] > 0) & (df_analisis['Sugerencia_Pedido_Minimo_Unds'] < 1), 'Sugerencia_Pedido_Minimo_Unds'] = 1
    
    cond_pasivo = (df_analisis['PDA_Final'] <= 1e-6) & (df_analisis[stock_actual_col_stock] == 0) & (df_analisis['Ventas_Total_Reciente'] > 0)
    if incluir_productos_pasivos:
        df_analisis.loc[cond_pasivo, ['Sugerencia_Pedido_Ideal_Unds', 'Stock_Ideal_Unds', 'Sugerencia_Pedido_Minimo_Unds', 'Stock_Minimo_Unds']] = cantidad_reposicion_para_pasivos

    cobertura_array = np.where(df_analisis['PDA_Final'] > 1e-6, df_analisis[stock_actual_col_stock] / df_analisis['PDA_Final'], np.inf)
    df_analisis['Dias_Cobertura_Stock_Actual'] = pd.Series(cobertura_array, index=df_analisis.index).fillna(np.inf)
    df_analisis.loc[df_analisis[stock_actual_col_stock] == 0, 'Dias_Cobertura_Stock_Actual'] = 0
    df_analisis['Dias_Cobertura_Stock_Actual'] = df_analisis['Dias_Cobertura_Stock_Actual'].round(1)
    df_analisis['Dias_Cobertura_Stock_Actual'] = df_analisis['Dias_Cobertura_Stock_Actual'].replace(np.inf, 9999)

    df_resultado = df_analisis.copy()

    if excluir_productos_sin_sugerencia_ideal:
        df_resultado = df_resultado[df_resultado[sugerencia_ideal_col] > 0]
        if df_resultado.empty: 
            return {"data": pd.DataFrame(), "summary": {"insight": "No se encontraron productos para reponer con los filtros aplicados.", "kpis": {}}}

    print("Calculando el Índice de Urgencia para todos los productos...")

    # 1. Identificamos los productos que están en un estado de urgencia.
    condicion_urgencia = df_resultado[stock_actual_col_stock] < df_resultado['Punto_de_Alerta_Minimo_Unds']

    # 2. Calculamos la "Severidad del Faltante" (de 0 a 1+).
    #    Usamos .replace() para evitar la división por cero de forma segura.
    punto_alerta_minimo_safe = df_resultado['Punto_de_Alerta_Minimo_Unds'].replace(0, 1e-6)
    score_necesidad = 1 - (df_resultado[stock_actual_col_stock] / punto_alerta_minimo_safe)
    
    # 3. Calculamos el Índice de Urgencia ponderado por la importancia.
    urgency_score_series = score_necesidad * df_resultado['Importancia_Dinamica']

    # 4. Creamos la nueva columna permanente.
    #    Tendrá un valor solo para los productos que cumplen la condición; el resto será 0.
    temp_urgency_array = np.where(condicion_urgencia, urgency_score_series, 0)
    df_resultado['Índice de Urgencia'] = pd.Series(temp_urgency_array, index=df_resultado.index).fillna(0)

    # --- SECCIÓN DE ORDENAMIENTO DINÁMICO ---
    if ordenar_por == 'Inversion Requerida':
        df_resultado['temp_sort_col'] = df_resultado['Sugerencia_Pedido_Ideal_Unds'] * df_resultado[precio_compra_actual_col_stock]
        df_resultado = df_resultado.sort_values(by='temp_sort_col', ascending=False)
    elif ordenar_por == 'Cantidad a Comprar':
        df_resultado = df_resultado.sort_values(by='Sugerencia_Pedido_Ideal_Unds', ascending=False)
    elif ordenar_por == 'Margen Potencial':
        df_resultado['temp_sort_col'] = (df_resultado['Precio_Venta_Prom_Reciente'] - df_resultado[precio_compra_actual_col_stock]) * df_resultado['Sugerencia_Pedido_Ideal_Unds']
        df_resultado = df_resultado.sort_values(by='temp_sort_col', ascending=False)
    elif ordenar_por == 'Categoría' and categoria_col_stock in df_resultado.columns:
        df_resultado = df_resultado.sort_values(by=[categoria_col_stock, 'Importancia_Dinamica'], ascending=[True, False])
    elif ordenar_por == 'Próximos a Agotarse':
        df_resultado = df_resultado.sort_values(by='Dias_Cobertura_Stock_Actual', ascending=True)
    elif ordenar_por == 'Índice de Urgencia':
         df_resultado.sort_values(by='Índice de Urgencia', ascending=False, inplace=True)
    elif ordenar_por == 'rotacion':
        df_resultado = df_resultado.sort_values(by='Factor_Rotacion_Crudo', ascending=False)
    else: # Por defecto, 'Importancia'
        df_resultado = df_resultado.sort_values(by='Importancia_Dinamica', ascending=False)
    
    print(f"df_resultado.columns 2 {df_resultado.columns}")


    # --- INICIO DE LA NUEVA LÓGICA DE RESUMEN ---

    # --- PASO 9: CÁLCULO Y EXPOSICIÓN DE MÁRGENES PARA DEBUG ---
    print("Calculando márgenes detallados para auditoría...")

    # Aseguramos que las columnas necesarias existan y sean numéricas antes de usarlas
    for col in [precio_venta_actual_col_stock, precio_compra_actual_col_stock, precio_venta_prom_col]:
        if col in df_resultado.columns:
            df_resultado[col] = pd.to_numeric(df_resultado[col], errors='coerce').fillna(0)
        else:
            df_resultado[col] = 0 # Si no existe, la creamos con ceros para evitar errores

    # Margen Teórico: Basado en el precio de lista actual del inventario.
    df_resultado['debug_margen_lista'] = df_resultado[precio_venta_actual_col_stock] - df_resultado[precio_compra_actual_col_stock]
    
    # Margen Real: Basado en el precio promedio de las ventas recientes.
    df_resultado['debug_margen_promedio'] = df_resultado[precio_venta_prom_col] - df_resultado[precio_compra_actual_col_stock]


    # --- PASO 10: CÁLCULO DE KPIs Y RESUMEN (usando los márgenes auditados) ---
    
    df_a_reponer = df_resultado[df_resultado[sugerencia_ideal_col] > 0].copy()

    if not df_a_reponer.empty:
        inversion_total = (df_a_reponer[sugerencia_ideal_col] * df_a_reponer[precio_compra_actual_col_stock]).sum()
        skus_a_reponer = int(df_a_reponer[sku_col].nunique())
        unidades_a_pedir = int(df_a_reponer[sugerencia_ideal_col].sum())
        
        # CÁLCULO CORREGIDO: Para el margen potencial, solo sumamos los productos que generan ganancia real.
        # Usamos .clip(lower=0) para tratar cualquier margen negativo como 0 en la suma.
        # margen_potencial = (df_a_reponer[sugerencia_ideal_col] * df_a_reponer['debug_margen_promedio'].clip(lower=0)).sum()
        margen_potencial = (df_a_reponer[sugerencia_ideal_col] * df_a_reponer['debug_margen_lista'].clip(lower=0)).sum()
    else:
        inversion_total, skus_a_reponer, unidades_a_pedir, margen_potencial = 0, 0, 0, 0

    insight_text = f"Hemos identificado {skus_a_reponer} productos que necesitan una inversión de S/ {inversion_total:,.2f} para optimizar tu inventario."
    if skus_a_reponer == 0:
        insight_text = "¡Buen trabajo! Tu inventario parece estar bien abastecido."

    kpis = {
        "Inversión Total Sugerida": f"S/ {inversion_total:,.2f}",
        "SKUs a Reponer": skus_a_reponer,
        "Unidades Totales a Pedir": unidades_a_pedir,
        "Margen Potencial de la Compra": f"S/ {margen_potencial:,.2f}"
    }
    # --- FIN DE LA NUEVA LÓGICA DE RESUMEN ---


    columnas_salida_deseadas = [
        sku_col, nombre_prod_col_stock, categoria_col_stock, subcategoria_col_stock, marca_col_stock, 
        precio_compra_actual_col_stock, stock_actual_col_stock,
        'Dias_Cobertura_Stock_Actual',
        'Punto_de_Alerta_Minimo_Unds', 'Punto_de_Alerta_Ideal_Unds',
        'Accion_Requerida', 'Stock_de_Seguridad_Unds',
        'Stock_Minimo_Unds', 'Stock_Ideal_Unds', 
        'Sugerencia_Pedido_Minimo_Unds', 'Sugerencia_Pedido_Ideal_Unds', 
        'Importancia_Dinamica', 'Índice de Urgencia', 'PDA_Final',
        'Ventas_Total_Reciente', 'Ventas_Total_General'
        # precio_venta_prom_col,
        # 'debug_margen_promedio',
        # precio_venta_actual_col_stock,
        # 'debug_margen_lista'
    ]
       
    df_resultado_final = df_resultado[[col for col in columnas_salida_deseadas if col in df_resultado.columns]].copy()
    
    if 'temp_sort_col' in df_resultado_final.columns:
        df_resultado_final = df_resultado_final.drop(columns=['temp_sort_col'])
    
    if not df_resultado_final.empty:
        column_rename_map = {
            stock_actual_col_stock: 'Stock Actual (Unds)',
            precio_compra_actual_col_stock: 'Precio Compra Actual (S/.)',
            'PDA_Final': 'Promedio Venta Diaria (Unds)',
            'Dias_Cobertura_Stock_Actual': 'Cobertura Actual (Días)',
            'Punto_de_Alerta_Ideal_Unds': 'Punto de Alerta Ideal (Unds)',
            'Punto_de_Alerta_Minimo_Unds': 'Punto de Alerta Mínimo (Unds)',
            'Accion_Requerida': '¿Pedir Ahora?',
            'Stock_de_Seguridad_Unds': 'Stock de Seguridad (Unds)',
            'Stock_Minimo_Unds': 'Stock Mínimo Sugerido (Unds)',
            'Stock_Ideal_Unds': 'Stock Ideal Sugerido (Unds)',
            'Sugerencia_Pedido_Ideal_Unds': 'Pedido Ideal Sugerido (Unds)',
            'Sugerencia_Pedido_Minimo_Unds': 'Pedido Mínimo Sugerido (Unds)',
            'Importancia_Dinamica': 'Índice de Importancia',
            'Ventas_Total_Reciente': f'Ventas Recientes ({final_dias_recientes}d) (Unds)',
            'Ventas_Total_General' : f'Ventas Periodo General ({final_dias_general}d) (Unds)',
            # 'debug_margen_lista': '[Debug] Margen s/ P. Lista',
            # 'debug_margen_promedio': '[Debug] Margen s/ P. Promedio',
            # precio_venta_prom_col: '[Debug] Precio Venta Promedio',
            # precio_venta_actual_col_stock: '[Debug] Precio Venta Lista',
        }
        df_resultado_final.rename(columns=column_rename_map, inplace=True)

    # --- PASO 11: LIMPIEZA FINAL PARA COMPATIBILIDAD CON JSON ---
    # Este bloque ahora se aplica de forma segura al final.
    if not df_resultado_final.empty:
        # Reemplazamos infinitos con NaN
        df_resultado_final = df_resultado_final.replace([np.inf, -np.inf], np.nan)
        # Reemplazamos NaN con None, que es compatible con JSON (se convierte en 'null')
        df_resultado_final = df_resultado_final.where(pd.notna(df_resultado_final), None)
   
    # return resultado_final_json_safe
    return {
        "data": df_resultado_final,
        "summary": {
            "insight": insight_text,
            "kpis": kpis
        }
    }




def procesar_stock_muerto(
    df_ventas: pd.DataFrame,
    df_inventario: pd.DataFrame,
    # --- Parámetros actualizados que vienen desde la UI ---
    dias_sin_venta_muerto: Optional[int] = 180,
    umbral_valor_stock: Optional[float] = 0.0,
    # Mantenemos los otros por si se usan en el futuro
    meses_analisis: Optional[int] = 3,
    dias_sin_venta_baja: Optional[int] = 90,
    dps_umbral_exceso_stock: Optional[int] = 120,
    ordenar_por: str = 'valor_stock_s',
    incluir_solo_categorias: Optional[List[str]] = None,
    incluir_solo_marcas: Optional[List[str]] = None,
    filtro_skus: Optional[List[str]] = None,
    **kwargs # Acepta argumentos extra para compatibilidad
) -> Dict[str, Any]:
    """
    Calcula el análisis de diagnóstico de baja rotación y stock muerto.
    Los parámetros clave de análisis (meses, días sin venta) pueden ser 
    calculados dinámicamente si no se proveen.

    Args:
        df_ventas: DataFrame con el historial de ventas.
        df_inventario: DataFrame con el stock actual.
        meses_analisis: (Opcional) Meses para analizar ventas recientes. Si es None, se calcula dinámicamente.
        dias_sin_venta_baja: (Opcional) Umbral para "Baja Rotación". Si es None, se calcula dinámicamente.
        dias_sin_venta_muerto: (Opcional) Umbral para "Stock Muerto". Si es None, se calcula dinámicamente.
        dps_umbral_exceso_stock: (Opcional) Umbral de DPS para "Exceso de Stock". Si es None, se calcula dinámicamente.
        umbral_valor_stock: Umbral en S/. para destacar inventario inmovilizado.

    Returns:
        DataFrame con el análisis completo.
    """

    # --- PASO 1: Definición de Nombres de Columna y Pre-procesamiento ---
    # --- 0. Renombrar y Preprocesar Datos ---
    sku_col = 'SKU / Código de producto'

    df_ventas[sku_col] = df_ventas[sku_col].astype(str).str.strip()
    df_inventario[sku_col] = df_inventario[sku_col].astype(str).str.strip()

    if filtro_skus:
        print(f"Ejecutando reporte en modo contextual para {len(filtro_skus)} SKUs.")
        df_inventario = df_inventario[df_inventario[sku_col].isin(filtro_skus)]
        df_ventas = df_ventas[df_ventas[sku_col].isin(filtro_skus)]



    df_ventas = df_ventas.rename(columns={
        'Fecha de venta': 'fecha_venta',
        'SKU / Código de producto': 'sku',
        'Cantidad vendida': 'cantidad_vendida',
    })
    df_inventario = df_inventario.rename(columns={
        'SKU / Código de producto': 'sku',
        'Nombre del producto': 'nombre_producto',
        'Cantidad en stock actual': 'stock_actual_unds',
        'Precio de compra actual (S/.)': 'precio_compra_actual',
        'Categoría': 'categoria',
        'Subcategoría': 'subcategoria',
        'Marca': 'marca'
    })

    categoria_col_stock = 'Categoría'
    marca_col_stock = 'Marca'

    df_ventas['fecha_venta'] = pd.to_datetime(df_ventas['fecha_venta'], format='%d/%m/%Y', errors='coerce')
    df_ventas = df_ventas.dropna(subset=['fecha_venta', 'sku'])

    # --- 1. Cálculo de Parámetros Dinámicos ---
    # Si los parámetros no son provistos, se calculan dinámicamente
    parametros_dinamicos = _calcular_parametros_dinamicos_stock_muerto(df_ventas)
    
    meses_analisis_calc = meses_analisis if meses_analisis is not None else parametros_dinamicos['meses_analisis']
    dias_sin_venta_baja_calc = dias_sin_venta_baja if dias_sin_venta_baja is not None else parametros_dinamicos['dias_sin_venta_baja']
    dias_sin_venta_muerto_calc = dias_sin_venta_muerto if dias_sin_venta_muerto is not None else parametros_dinamicos['dias_sin_venta_muerto']
    dps_umbral_exceso_stock_calc = dps_umbral_exceso_stock if dps_umbral_exceso_stock is not None else parametros_dinamicos['dps_umbral_exceso_stock']
    
    # Asegurar que meses_analisis sea al menos 0 para evitar errores
    meses_analisis_calc = max(0, meses_analisis_calc)

    # --- 2. Agregación de Datos de Ventas por SKU ---
    hoy = pd.to_datetime(datetime.now().date())
    fecha_inicio_analisis_reciente = hoy - relativedelta(months=meses_analisis_calc)
    
    ventas_totales_sku = df_ventas.groupby('sku')['cantidad_vendida'].sum().reset_index(name='ventas_totales_unds')
    ultima_venta_sku = df_ventas.groupby('sku')['fecha_venta'].max().reset_index(name='ultima_venta')
    
    col_ventas_recientes_nombre = f'total_vendido_ultimos_{meses_analisis_calc}_meses_unds'
    df_ventas_recientes = df_ventas[df_ventas['fecha_venta'] >= fecha_inicio_analisis_reciente]
    ventas_ultimos_x_meses_sku = df_ventas_recientes.groupby('sku')['cantidad_vendida'].sum().reset_index(name=col_ventas_recientes_nombre)

    # --- PASO 2: Cálculo de Métricas y Clasificación ---
    # --- 3. Combinar datos y Calcular Métricas Derivadas ---
    df_resultado = pd.merge(df_inventario, ventas_totales_sku, on='sku', how='left')
    df_resultado = pd.merge(df_resultado, ultima_venta_sku, on='sku', how='left')
    df_resultado = pd.merge(df_resultado, ventas_ultimos_x_meses_sku, on='sku', how='left')

    # Rellenar NaNs y asegurar tipos de datos correctos
    df_resultado['ventas_totales_unds'] = df_resultado['ventas_totales_unds'].fillna(0).astype(int)
    df_resultado[col_ventas_recientes_nombre] = df_resultado[col_ventas_recientes_nombre].fillna(0).astype(int)
    df_resultado['stock_actual_unds'] = pd.to_numeric(df_resultado['stock_actual_unds'], errors='coerce').fillna(0)
    df_resultado['precio_compra_actual'] = pd.to_numeric(df_resultado['precio_compra_actual'], errors='coerce').fillna(0)
    
    # Calcular métricas
    df_resultado['valor_stock_s'] = (df_resultado['stock_actual_unds'] * df_resultado['precio_compra_actual']).round(2)
    df_resultado['dias_sin_venta'] = (hoy - df_resultado['ultima_venta']).dt.days

    # Calcular Días para Agotar Stock (DPS)
    dias_periodo_analisis = meses_analisis_calc * 30.44
    ventas_diarias_promedio = df_resultado[col_ventas_recientes_nombre] / dias_periodo_analisis if dias_periodo_analisis > 0 else 0
    df_resultado['ventas_diarias_promedio'] = ventas_diarias_promedio
    df_resultado['dias_para_agotar_stock'] = np.where(
        ventas_diarias_promedio > 0,
        df_resultado['stock_actual_unds'] / ventas_diarias_promedio,
        np.inf # Si no hay ventas recientes, los días para agotar son infinitos
    )
    # Si no hay stock, los días para agotar son 0
    df_resultado.loc[df_resultado['stock_actual_unds'] == 0, 'dias_para_agotar_stock'] = 0
    
    # --- 4. Clasificación Diagnóstica ---
    def clasificar_producto(row):
        if row['stock_actual_unds'] <= 0:
            return "Sin Stock"
        if pd.isna(row['ultima_venta']):
            return "Nunca Vendido con Stock"
        if row['dias_sin_venta'] > dias_sin_venta_muerto_calc:
            return "Stock Muerto"
        if row['dias_para_agotar_stock'] > dps_umbral_exceso_stock_calc:
            return "Exceso de Stock"
        if row['dias_sin_venta'] > dias_sin_venta_baja_calc:
            return "Baja Rotación"
        return "Saludable"

    df_resultado['clasificacion'] = df_resultado.apply(clasificar_producto, axis=1)

    # --- 5. Prioridad y Acción (basada en DPS) ---
    def generar_accion(row):
        clasif = row['clasificacion']
        dps = row['dias_para_agotar_stock']
        
        if clasif == "Sin Stock":
            return "SIN STOCK. Evaluar reposición."
        if clasif == "Nunca Vendido con Stock":
            return "NUNCA VENDIDO. Investigar y definir plan."
        
        if dps == np.inf:
            return "STOCK ESTANCADO (0 ventas rec.). ¡ACCIÓN URGENTE!"
        if dps > dps_umbral_exceso_stock_calc:
            return f"EXCESO SEVERO (~{dps:.0f}d). ¡ACCIÓN INMEDIATA!"
        if dps > 90:
            return f"ROTACIÓN LENTA (~{dps:.0f}d). Considerar promoción."
        if dps > 45:
            return f"ROTACIÓN SALUDABLE (~{dps:.0f}d). Vigilar."
        if dps > 15:
            return f"ROTACIÓN ÓPTIMA (~{dps:.0f}d). Monitorear."
        if dps > 0:
            return f"ALERTA QUIEBRE STOCK (~{dps:.0f}d). Reponer."
        return "Revisar" # Caso por defecto

    df_resultado['prioridad_accion_dps'] = df_resultado.apply(generar_accion, axis=1)
    
    # --- PASO 3: Filtrado Principal (El Corazón del Reporte) ---
    valor_total_inventario_antes_de_filtros = df_resultado['valor_stock_s'].sum()

    # print(f"Filtrando por productos con más de {dias_sin_venta_muerto} días sin venta.")
    # df_muerto = df_resultado[df_resultado['clasificacion'].isin(["Stock Muerto", "Nunca Vendido con Stock"])].copy()
    df_muerto = df_resultado[df_resultado['clasificacion'].isin(["Stock Muerto", "Nunca Vendido con Stock"])].copy()

    # Aplicamos el filtro de valor si el usuario lo especificó
    if umbral_valor_stock and umbral_valor_stock > 0:
        # print(f"Filtrando adicionalmente por valor de stock >= S/ {umbral_valor_stock}")
        df_resultado = df_resultado[df_resultado['valor_stock_s'] >= umbral_valor_stock]

    if incluir_solo_categorias and "categoria" in df_resultado.columns:
        # Normalizamos la lista de categorías a minúsculas y sin espacios
        categorias_normalizadas = [cat.strip().lower() for cat in incluir_solo_categorias]
        
        # Comparamos contra la columna del DataFrame también normalizada
        # El .str.lower() y .str.strip() se aplican a cada valor de la columna antes de la comparación
        df_resultado = df_resultado[
            df_resultado["categoria"].str.strip().str.lower().isin(categorias_normalizadas)
        ].copy()
    # print(f"DEBUG: 3. Después de filtrar por categorías, quedan {len(df_resultado)} filas.")

    if incluir_solo_marcas and "marca" in df_resultado.columns:
        # Normalizamos la lista de marcas
        marcas_normalizadas = [marca.strip().lower() for marca in incluir_solo_marcas]
        
        # Comparamos contra la columna de marcas normalizada
        df_resultado = df_resultado[
            df_resultado["marca"].str.strip().str.lower().isin(marcas_normalizadas)
        ].copy()
    # print(f"DEBUG: 4. Después de filtrar por marcas, quedan {len(df_resultado)} filas.")
    

    # --- PASO 4: CÁLCULO DE KPIs Y RESUMEN (Ahora se hace sobre los datos ya filtrados) ---
    valor_total_muerto = df_muerto['valor_stock_s'].sum()
    # Para el %, necesitamos el valor total del inventario ANTES de filtrar
    valor_total_inventario = valor_total_inventario_antes_de_filtros
    # valor_total_inventario = df_resultado['valor_stock_s'].sum()
    skus_en_riesgo = int(df_muerto['sku'].nunique())
    
    porcentaje_afectado = (valor_total_muerto / valor_total_inventario * 100) if valor_total_inventario > 0 else 0
    producto_mas_antiguo = int(df_muerto['dias_sin_venta'].max()) if not df_muerto.empty else 0

    insight_text = f"¡Alerta! Se detectaron S/ {valor_total_muerto:,.2f} en capital inmovilizado ({porcentaje_afectado:.1f}% del total), afectando a {skus_en_riesgo} productos distintos."
    if skus_en_riesgo == 0:
        insight_text = "¡Felicidades! No se ha detectado stock muerto significativo con los criterios actuales."

    kpis = {
        "Valor Total en Stock Muerto": f"S/ {valor_total_muerto:,.2f}",
        "% del Inventario Afectado": f"{porcentaje_afectado:.1f}%",
        "SKUs en Riesgo": skus_en_riesgo,
        "Producto Más Antiguo": f"{producto_mas_antiguo} días"
    }


    # --- PASO 5: ORDENAMIENTO DINÁMICO (Ahora se aplica sobre el resultado filtrado) ---
    # print(f"Ordenando resultados por: '{ordenar_por}'")
    # Definimos la dirección del ordenamiento para cada criterio
    ascending_map = {
        'valor_stock_s': False,       # Mayor valor primero
        'dias_sin_venta': False,      # Más antiguo primero
        'stock_actual_unds': False,   # Mayor cantidad primero
        'categoria': True             # Alfabético A-Z
    }
    
    # Usamos el valor por defecto si el criterio no está en el mapa
    is_ascending = ascending_map.get(ordenar_por, False)
    
    # Nos aseguramos de que la columna de ordenamiento exista antes de usarla
    if ordenar_por in df_resultado.columns:
        # Para categoría, usamos un ordenamiento secundario para consistencia
        if ordenar_por == 'categoria':
            df_resultado.sort_values(by=['categoria', 'valor_stock_s'], ascending=[True, False], inplace=True)
        else:
            df_resultado.sort_values(by=ordenar_por, ascending=is_ascending, inplace=True)
    else:
        # Si la columna no existe, usamos un ordenamiento por defecto seguro
        df_resultado.sort_values(by='valor_stock_s', ascending=False, inplace=True)


    # --- PASO 6: FORMATEO FINAL DE SALIDA ---
    col_dps_nombre_final = f'Días para Agotar Stock (Est.{meses_analisis_calc}m)'
    col_prioridad_nombre_final = f'Prioridad y Acción (DAS {meses_analisis_calc}m)'
    col_ventas_recientes_final = f'Ventas últimos {meses_analisis_calc}m (Unds)'

    df_resultado.rename(columns={
        'dias_para_agotar_stock': col_dps_nombre_final,
        'prioridad_accion_dps': col_prioridad_nombre_final,
        col_ventas_recientes_nombre: col_ventas_recientes_final
    }, inplace=True)
    
    def format_dps_display(dps_value):
        if pd.isna(dps_value): return "N/A"
        if dps_value == np.inf: return "Inf. (0 ventas rec.)"
        return f"{dps_value:.0f}"
    
    df_resultado[col_dps_nombre_final] = df_resultado[col_dps_nombre_final].apply(format_dps_display)
    
    columnas_finales = [
        'sku', 'nombre_producto', 'categoria', 'subcategoria', 'marca',
        'precio_compra_actual', 'stock_actual_unds', 'valor_stock_s',
        'ventas_totales_unds', col_ventas_recientes_final,
        'ultima_venta', 'dias_sin_venta',
        col_dps_nombre_final,
        'clasificacion', col_prioridad_nombre_final,
        'ventas_diarias_promedio'
    ]
    # # Añadir columnas opcionales si existen en el dataframe de inventario
    # for col_opcional in ['Marca']:
    #     if col_opcional in df_resultado.columns and col_opcional not in columnas_finales:
    #         columnas_finales.insert(4, col_opcional)

    df_final = df_resultado[[col for col in columnas_finales if col in df_resultado.columns]].copy()
    
    # Renombrar columnas a formato final
    df_final.rename(columns={
        'sku': 'SKU / Código de producto',
        'nombre_producto': 'Nombre del producto',
        'categoria': 'Categoría',
        'marca': 'Marca',
        'subcategoria': 'Subcategoría',
        'precio_compra_actual': 'Precio de compra actual (S/.)',
        'stock_actual_unds': 'Stock Actual (Unds)',
        'valor_stock_s': 'Valor stock (S/.)',
        'ventas_totales_unds': 'Ventas totales (Unds)',
        'ultima_venta': 'Última venta',
        'dias_sin_venta': 'Días sin venta',
        'clasificacion': 'Clasificación Diagnóstica'
    }, inplace=True)

    df_final['Última venta'] = pd.to_datetime(df_final['Última venta'], errors='coerce').dt.strftime('%Y-%m-%d').fillna('Nunca vendido')
    df_final['Días sin venta'] = df_final['Días sin venta'].astype('Int64')
    df_final['SKU / Código de producto'] = df_final['SKU / Código de producto'].astype(str).str.strip()
    
    # --- PASO 7: LIMPIEZA PARA JSON (El último paso antes de devolver) ---
    # print("Limpiando DataFrame de stock muerto para JSON...")
    if not df_final.empty:
        df_final = df_final.replace([np.inf, -np.inf], np.nan).where(pd.notna(df_final), None)
    
    return {
        "data": df_final,
        "summary": {
            "insight": insight_text,
            "kpis": kpis
        }
    }

    # # 2. Reemplazar todos los NaN restantes con None (que se convierte en 'null' en JSON).
    # # El método .where() es muy eficiente para esto.
    # resultado_final_json_safe = df_limpio.where(pd.notna(df_limpio), None)
    
    # return resultado_final_json_safe


# ----------------------------------------------------------
# ------------------ FUNCIONES AUXILIARES ------------------
# ----------------------------------------------------------
# --- Función Auxiliar para Sugerir Periodos de Análisis ---
def _sugerir_periodos_analisis(
    df_ventas_interno: pd.DataFrame, 
    fecha_col_ventas_interno: str
) -> Tuple[int, int]:
    """
    Sugiere periodos de análisis (reciente y general) basados en la duración 
    del historial de ventas.
    Devuelve: Tuple[int, int] con (sugerencia_reciente, sugerencia_general)
    """
    default_reciente = 30
    default_general = 90

    if df_ventas_interno.empty or fecha_col_ventas_interno not in df_ventas_interno.columns:
        # print("Advertencia (sugerencia): No hay datos de ventas para sugerir periodos. Usando defaults.")
        return default_reciente, default_general

    # Trabajar con una copia para no afectar el DataFrame original dentro de esta función auxiliar
    df_temp = df_ventas_interno.copy()
    df_temp[fecha_col_ventas_interno] = pd.to_datetime(df_temp[fecha_col_ventas_interno], errors='coerce')
    df_temp.dropna(subset=[fecha_col_ventas_interno], inplace=True)

    if df_temp.empty:
        # print("Advertencia (sugerencia): No hay fechas válidas. Usando defaults.")
        return default_reciente, default_general

    fecha_min = df_temp[fecha_col_ventas_interno].min()
    fecha_max = df_temp[fecha_col_ventas_interno].max()
    
    if pd.isna(fecha_min) or pd.isna(fecha_max):
        # print("Advertencia (sugerencia): Fechas min/max no válidas. Usando defaults.")
        return default_reciente, default_general

    duracion_dias = (fecha_max - fecha_min).days

    sugerencia_reciente = default_reciente
    sugerencia_general = default_general

    if duracion_dias < 1: # Historial muy corto o inválido
        sugerencia_reciente = 1
        sugerencia_general = 1
    elif duracion_dias <= 15: # ej. hasta 2 semanas
        sugerencia_reciente = duracion_dias 
        sugerencia_general = duracion_dias
    elif duracion_dias <= 30: # ej. ~1 mes
        sugerencia_reciente = 15
        sugerencia_general = duracion_dias
    elif duracion_dias <= 60: # ej. ~2 meses
        sugerencia_reciente = 30
        sugerencia_general = duracion_dias
    elif duracion_dias <= 90: # ej. ~1 trimestre
        sugerencia_reciente = 30 
        sugerencia_general = 90 # O duracion_dias si es un poco mayor
    elif duracion_dias <= 180: # ej. ~1 semestre
        sugerencia_reciente = 60 
        sugerencia_general = min(duracion_dias, 180) 
    elif duracion_dias <= 365: # ej. ~1 año
        sugerencia_reciente = 90
        sugerencia_general = min(duracion_dias, 270) 
    else: # Más de un año
        sugerencia_reciente = 90
        sugerencia_general = 365
        
    # Asegurar que general >= reciente y que no sean cero si la duración es positiva
    if duracion_dias > 0:
        sugerencia_reciente = max(1, int(sugerencia_reciente))
        sugerencia_general = max(1, int(sugerencia_general))
        sugerencia_general = max(sugerencia_general, sugerencia_reciente) # General siempre >= reciente
    else: # Si duración es 0 o negativa, forzar a 1 para evitar división por cero después
        sugerencia_reciente = 1
        sugerencia_general = 1
        
    return sugerencia_reciente, sugerencia_general



def _definir_prioridad_estrategica(row) -> tuple[int, str]:
    """
    Define un nivel de prioridad y una descripción basados en la combinación
    de la clasificación ABC y la de salud del stock.

    Returns:
        Una tupla (código_prioridad, descripcion_prioridad).
    """
    abc = row.get('Clasificación ABC', 'Sin Ventas')
    diagnostico = row.get('Clasificación Diagnóstica', 'Desconocido')

    # Diccionario de mapeo: (ABC, Diagnóstico) -> (Prioridad, Descripción)
    # Prioridad 1 es la más alta.
    mapa_prioridad = {
        ('A', 'Stock Muerto'):           (1, '1 - CRÍTICO: Stock importante totalmente detenido'),
        ('A', 'Nunca Vendido con Stock'):(1, '1 - CRÍTICO: Stock importante sin historia de ventas'),
        ('A', 'Exceso de Stock'):        (2, '2 - ALERTA MÁXIMA: Sobre-stock en producto clave'),
        ('B', 'Stock Muerto'):           (3, '3 - URGENTE: Stock relevante detenido'),
        ('B', 'Nunca Vendido con Stock'):(3, '3 - URGENTE: Stock relevante sin historia de ventas'),
        ('A', 'Baja Rotación'):          (4, '4 - ATENCIÓN: Producto clave desacelerando'),
        ('B', 'Exceso de Stock'):        (5, '5 - ACCIÓN REQUERIDA: Sobre-stock en producto secundario'),
        ('C', 'Stock Muerto'):           (6, '6 - LIMPIEZA: Eliminar stock sin importancia'),
        ('C', 'Nunca Vendido con Stock'):(6, '6 - LIMPIEZA: Eliminar stock sin importancia'),
        ('B', 'Baja Rotación'):          (7, '7 - REVISAR: Producto secundario desacelerando'),
        ('A', 'Saludable'):             (8, '8 - ESTRELLA: Proteger y monitorear'),
        ('C', 'Exceso de Stock'):        (9, '9 - OPTIMIZAR: Reducir stock de baja importancia'),
        ('B', 'Saludable'):             (10, '10 - SÓLIDO: Mantener rendimiento'),
        ('C', 'Baja Rotación'):         (11, '11 - BAJO RIESGO: Vigilar o descontinuar'),
        ('C', 'Saludable'):             (12, '12 - RUTINARIO: Gestión mínima'),
    }
    
    # Casos especiales (Sin Ventas o Sin Stock)
    if diagnostico == "Sin Stock":
        return (13, '13 - REPOSICIÓN: Evaluar compra')
    if abc == 'Sin Ventas' and diagnostico == "Nunca Vendido con Stock":
         return (3, '3 - URGENTE: Stock relevante sin historia de ventas') # Elevar prioridad si nunca se ha vendido

    return mapa_prioridad.get((abc, diagnostico), (99, '99 - Revisar caso'))



def _calcular_parametros_dinamicos_stock_muerto(
    df_ventas: pd.DataFrame
) -> Dict[str, int]:
    """
    Calcula dinámicamente los parámetros de análisis basados en la duración 
    del historial de ventas.

    Args:
        df_ventas: DataFrame con el historial de ventas. Debe tener una columna 'fecha_venta'.

    Returns:
        Un diccionario con los parámetros calculados: 
        'meses_analisis', 'dias_sin_venta_baja', 'dias_sin_venta_muerto', 
        y 'dps_umbral_exceso_stock'.
    """
    # Valores por defecto si no hay suficientes datos
    defaults = {
        'meses_analisis': 6,
        'dias_sin_venta_baja': 90,
        'dias_sin_venta_muerto': 180,
        'dps_umbral_exceso_stock': 180
    }

    if df_ventas.empty or 'fecha_venta' not in df_ventas.columns:
        return defaults

    df_temp = df_ventas.copy()
    df_temp['fecha_venta'] = pd.to_datetime(df_temp['fecha_venta'], errors='coerce')
    df_temp.dropna(subset=['fecha_venta'], inplace=True)

    if df_temp.empty:
        return defaults

    fecha_min = df_temp['fecha_venta'].min()
    fecha_max = df_temp['fecha_venta'].max()
    duracion_dias = (fecha_max - fecha_min).days

    if duracion_dias < 30: # Menos de 1 mes de historia
        return {
            'meses_analisis': 1,
            'dias_sin_venta_baja': 15,
            'dias_sin_venta_muerto': 30,
            'dps_umbral_exceso_stock': 45
        }
    elif duracion_dias < 90: # Entre 1 y 3 meses
        return {
            'meses_analisis': 1,
            'dias_sin_venta_baja': 30,
            'dias_sin_venta_muerto': 60,
            'dps_umbral_exceso_stock': 90
        }
    elif duracion_dias < 180: # Entre 3 y 6 meses
        return {
            'meses_analisis': 3,
            'dias_sin_venta_baja': 60,
            'dias_sin_venta_muerto': 90,
            'dps_umbral_exceso_stock': 120
        }
    elif duracion_dias < 365: # Entre 6 meses y 1 año
        return defaults # Los valores por defecto son apropiados para este rango
    else: # Más de 1 año de historia
        return {
            'meses_analisis': 6, # Analizar el último semestre es estándar
            'dias_sin_venta_baja': 120, # 4 meses
            'dias_sin_venta_muerto': 270, # 9 meses
            'dps_umbral_exceso_stock': 270 # Coincide con stock muerto
        }

    # print("Fecha inicio:", fecha_inicio);
    # print("Fecha max:", fecha_max);
    # print("Fechas no válidas:", df_ventas['Fecha de venta'].isna().sum())
    # print("Ventas filtradas:", df_ventas_filtradas.shape)

    # print(df_ventas.columns.tolist())

    # print("Stock SKUs:", df_stock['SKU / Código de producto'].nunique())
    # print("Ventas SKUs:", df_ventas['SKU / Código de producto'].nunique())
    # print("Coincidencias después del merge:", df_merge['Promedio diario de ventas'].notnull().sum())

    # print(df_merge[['Promedio diario de ventas', 'Días de cobertura', 'Cantidad en stock actual', 'Importancia dinámica']].describe())
    # print(df_merge[['SKU / Código de producto', 'Promedio diario de ventas', 'Cantidad mínima para reposición', 'Cantidad ideal para reposición']].head(10))

    # return df_ventas_filtradas

    # print("Productos con rotación > 0:", (df['Promedio diario de ventas'] > 0).sum())
    # print("Productos con cobertura < 15 días:", (df['Días de cobertura'] < 15).sum())
    # print("Productos con stock = 0 e importantes:", ((df['Cantidad en stock actual'] == 0) & (df['Importancia del producto'] > 0)).sum())


def auditar_margenes_de_productos(
    df_ventas: pd.DataFrame,
    df_inventario: pd.DataFrame,
    **kwargs # Acepta argumentos extra para mantener la compatibilidad
) -> Dict[str, Any]:
    """
    Genera un reporte de auditoría para identificar productos con márgenes negativos,
    asegurando que los nombres de las columnas sean consistentes y el resultado sea
    compatible con JSON.
    """
    print("Iniciando auditoría de márgenes...")

    # --- 1. Definición y Limpieza de Nombres de Columna ---
    sku_col = 'SKU / Código de producto'
    cantidad_col_ventas = 'Cantidad vendida' # <-- Nombre correcto
    precio_venta_col_ventas = 'Precio de venta unitario (S/.)'
    nombre_prod_col_stock = 'Nombre del producto'
    precio_compra_actual_col_stock = 'Precio de compra actual (S/.)'
    precio_venta_actual_col_stock = 'Precio de venta actual (S/.)'

    # --- 2. Pre-procesamiento de Datos ---
    df_ventas_proc = df_ventas.copy()
    df_inventario_proc = df_inventario.copy()

    df_ventas_proc[sku_col] = df_ventas_proc[sku_col].astype(str).str.strip()
    df_inventario_proc[sku_col] = df_inventario_proc[sku_col].astype(str).str.strip()
    
    numeric_cols_inv = [
        'Cantidad en stock actual', 
        'Precio de compra actual (S/.)', 
        'Precio de venta actual (S/.)'
    ]
    for col in numeric_cols_inv:
        if col in df_inventario_proc.columns:
            df_inventario_proc[col] = pd.to_numeric(df_inventario_proc[col], errors='coerce')

    numeric_cols_ventas = [
        'Cantidad vendida',
        'Precio de venta unitario (S/.)'
    ]
    for col in numeric_cols_ventas:
        if col in df_ventas_proc.columns:
            df_ventas_proc[col] = pd.to_numeric(df_ventas_proc[col], errors='coerce')


    # --- 3. Cálculo del Precio de Venta Promedio ---
    df_ventas_proc['ingreso_total_linea'] = df_ventas_proc[cantidad_col_ventas] * df_ventas_proc[precio_venta_col_ventas]
    
    agg_ventas = df_ventas_proc.groupby(sku_col).agg(
        total_ingresos=('ingreso_total_linea', 'sum'),
        total_unidades=(cantidad_col_ventas, 'sum') # <-- Usando la variable correcta
    ).reset_index()

    agg_ventas['Precio_Venta_Prom_Calculado'] = agg_ventas['total_ingresos'] / agg_ventas['total_unidades']

    # --- 4. Combinar Datos y Calcular Márgenes ---
    df_auditoria = pd.merge(
        df_inventario_proc[[sku_col, nombre_prod_col_stock, precio_compra_actual_col_stock, precio_venta_actual_col_stock]],
        agg_ventas[[sku_col, 'Precio_Venta_Prom_Calculado']],
        on=sku_col,
        how='left'
    )

    df_auditoria['Margen_Unitario_Calculado'] = df_auditoria['Precio_Venta_Prom_Calculado'] - df_auditoria[precio_compra_actual_col_stock]

    # --- 5. Filtrar para Encontrar Problemas ---
    df_problemas = df_auditoria[df_auditoria['Margen_Unitario_Calculado'] < 0].copy()
    
    # --- PASO 6: Formateo y Limpieza Final (sin cambios en la lógica, solo en el return) ---
    if df_problemas.empty:
        print("✅ Auditoría completada. No se encontraron productos con márgenes negativos.")
        # Devolvemos la estructura de diccionario esperada, con un DataFrame vacío
        return {
            "data": pd.DataFrame({"Resultado": ["No se encontraron productos con márgenes de venta negativos."]}),
            "summary": {
                "insight": "¡Excelente! No se detectaron productos vendidos por debajo de su costo actual.",
                "kpis": {}
            }
        }

    print(f"⚠️ Auditoría completada. Se encontraron {len(df_problemas)} productos con márgenes negativos.")
    
    df_problemas.rename(columns={
        'Precio Venta de Lista (Inventario)': 'Precio Venta Lista',
        'Precio Venta Promedio (Ventas)': 'Precio Venta Promedio',
        'Precio Compra Actual': 'Costo Actual',
        'Margen Unitario Real (Negativo)': 'Margen Calculado'
    }, inplace=True)
    
    # Limpieza final para compatibilidad con JSON
    df_limpio = df_problemas.replace([np.inf, -np.inf], np.nan)
    resultado_final = df_limpio.where(pd.notna(df_limpio), None)

    # --- CAMBIO CLAVE: Construimos el diccionario de respuesta final ---
    return {
        "data": resultado_final,
        "summary": {
            "insight": f"Se encontraron {len(resultado_final)} productos con un margen de venta negativo. Revisa la tabla para más detalles.",
            "kpis": {
                "Productos con Pérdida": len(resultado_final)
            }
        }
    }



def auditar_margenes_de_productos_nuevo(
    df_ventas: pd.DataFrame,
    df_inventario: pd.DataFrame,
    tipo_analisis_margen: str = "desviacion_negativa",
    umbral_desviacion_porcentaje: float = 10.0,
    filtro_categorias: Optional[List[str]] = None,
    filtro_marcas: Optional[List[str]] = None,
    periodo_analisis_dias: int = 30,
    ordenar_por: str = 'impacto_financiero',
    **kwargs
) -> Dict[str, Any]:
    """
    Genera un reporte de auditoría para identificar productos con desviaciones
    de margen, comparando el precio de venta promedio con el precio de lista.
    """
    # --- 1. Pre-procesamiento y cálculo de precios ---
    # ... (Tu lógica para limpiar datos, calcular `Precio_Venta_Prom_Reciente` y hacer merge)

    """
    Genera un reporte de auditoría para identificar productos con márgenes negativos,
    asegurando que los nombres de las columnas sean consistentes y el resultado sea
    compatible con JSON.
    """
    print("Iniciando auditoría de márgenes...")

    # --- 1. Definición y Limpieza de Nombres de Columna ---
    sku_col = 'SKU / Código de producto'
    cantidad_col_ventas = 'Cantidad vendida' # <-- Nombre correcto
    precio_venta_col_ventas = 'Precio de venta unitario (S/.)'
    nombre_prod_col_stock = 'Nombre del producto'
    precio_compra_actual_col_stock = 'Precio de compra actual (S/.)'
    precio_venta_actual_col_stock = 'Precio de venta actual (S/.)'

    # --- 2. Pre-procesamiento de Datos ---
    df_ventas_proc = df_ventas.copy()
    df_inventario_proc = df_inventario.copy()

    df_ventas_proc[sku_col] = df_ventas_proc[sku_col].astype(str).str.strip()
    df_inventario_proc[sku_col] = df_inventario_proc[sku_col].astype(str).str.strip()

    # 0. Filtramos el DataFrame de ventas según el período seleccionado
    FECHA_VENTA = 'Fecha de venta'
    df_ventas_proc[FECHA_VENTA] = pd.to_datetime(df_ventas_proc[FECHA_VENTA], format='%d/%m/%Y', errors='coerce')
    df_ventas_proc.dropna(subset=[FECHA_VENTA], inplace=True)
    fecha_max_venta = df_ventas_proc[FECHA_VENTA].max()
    if periodo_analisis_dias > 0 and pd.notna(fecha_max_venta):
        fecha_inicio = fecha_max_venta - pd.Timedelta(days=periodo_analisis_dias)
        df_ventas_proc = df_ventas_proc[df_ventas_proc[FECHA_VENTA] >= fecha_inicio]
    
    numeric_cols_inv = [
        'Cantidad en stock actual', 
        'Precio de compra actual (S/.)', 
        'Precio de venta actual (S/.)'
    ]
    for col in numeric_cols_inv:
        if col in df_inventario_proc.columns:
            df_inventario_proc[col] = pd.to_numeric(df_inventario_proc[col], errors='coerce')

    numeric_cols_ventas = [
        'Cantidad vendida',
        'Precio de venta unitario (S/.)'
    ]
    for col in numeric_cols_ventas:
        if col in df_ventas_proc.columns:
            df_ventas_proc[col] = pd.to_numeric(df_ventas_proc[col], errors='coerce')


    # --- 3. Cálculo del Precio de Venta Promedio ---
    df_ventas_proc['ingreso_total_linea'] = df_ventas_proc[cantidad_col_ventas] * df_ventas_proc[precio_venta_col_ventas]
    
    agg_ventas = df_ventas_proc.groupby(sku_col).agg(
        total_ingresos=('ingreso_total_linea', 'sum'),
        total_unidades=(cantidad_col_ventas, 'sum') # <-- Usando la variable correcta
    ).reset_index()

    agg_ventas['Precio_Venta_Prom_Calculado'] = agg_ventas['total_ingresos'] / agg_ventas['total_unidades']

    # --- 4. Combinar Datos y Calcular Márgenes ---
    df_auditoria = pd.merge(
        df_inventario_proc[[sku_col, nombre_prod_col_stock, "Categoría", "Marca", precio_compra_actual_col_stock, precio_venta_actual_col_stock]],
        agg_ventas[[sku_col, 'Precio_Venta_Prom_Calculado']],
        on=sku_col,
        how='left'
    )


    # --- 2. Cálculo de Márgenes y Desviación ---
    df_auditoria['Margen Teórico (S/.)'] = df_auditoria['Precio de venta actual (S/.)'] - df_auditoria['Precio de compra actual (S/.)']
    df_auditoria['Margen Real (S/.)'] = (df_auditoria['Precio_Venta_Prom_Calculado'] - df_auditoria['Precio de compra actual (S/.)']).round(2)
    
    # Calculamos la desviación solo si el margen teórico es positivo para evitar divisiones por cero o resultados extraños
    df_auditoria['Desviación de Margen (%)'] = np.where(
        df_auditoria['Margen Teórico (S/.)'] > 0,
        ((df_auditoria['Margen Real (S/.)'] - df_auditoria['Margen Teórico (S/.)']) / df_auditoria['Margen Teórico (S/.)']) * 100,
        0
    )

    # --- 3. Filtrado según los parámetros del usuario ---
    if tipo_analisis_margen == 'desviacion_negativa':
        df_resultado = (df_auditoria[df_auditoria['Desviación de Margen (%)'] < -umbral_desviacion_porcentaje]).round(2)
    elif tipo_analisis_margen == 'margen_negativo':
        df_resultado = (df_auditoria[df_auditoria['Margen Real (S/.)'] < 0]).round(2)
    else: # 'todas_las_desviaciones'
        df_resultado = (df_auditoria[abs(df_auditoria['Desviación de Margen (%)']) >= umbral_desviacion_porcentaje]).round(2)

    print(f"colums for df_resultado {df_resultado.columns}")

    if filtro_categorias and "Categoría" in df_resultado.columns:
        # Normalizamos la lista de categorías a minúsculas y sin espacios
        categorias_normalizadas = [cat.strip().lower() for cat in filtro_categorias]
        
        # Comparamos contra la columna del DataFrame también normalizada
        # El .str.lower() y .str.strip() se aplican a cada valor de la columna antes de la comparación
        df_resultado = df_resultado[
            df_resultado["Categoría"].str.strip().str.lower().isin(categorias_normalizadas)
        ].copy()

    if filtro_marcas and "Marca" in df_resultado.columns:
        # Normalizamos la lista de marcas
        marcas_normalizadas = [marca.strip().lower() for marca in filtro_marcas]
        
        # Comparamos contra la columna de marcas normalizada
        df_resultado = df_resultado[
            df_resultado["Marca"].str.strip().str.lower().isin(marcas_normalizadas)
        ].copy()
   
    print(f"colums for filtro_categorias {filtro_categorias}")

    unidades_vendidas = df_ventas_proc.groupby('SKU / Código de producto')['Cantidad vendida'].sum()
    df_resultado = pd.merge(df_resultado, unidades_vendidas, on='SKU / Código de producto', how='left')
    
    df_resultado['Impacto Financiero Total (S/.)'] = (df_resultado['Margen Teórico (S/.)'] - df_resultado['Margen Real (S/.)']) * df_resultado['Cantidad vendida']
    


    # --- 4. Cálculo de KPIs y Resumen ---
    if not df_resultado.empty:
        ganancia_perdida = (df_resultado['Margen Teórico (S/.)'] - df_resultado['Margen Real (S/.)']).sum()
        skus_con_desviacion = df_resultado['SKU / Código de producto'].nunique()
        peor_infractor = df_resultado.sort_values(by='Desviación de Margen (%)').iloc[0]
        skus_con_perdida = len(df_resultado[df_resultado['Margen Real (S/.)'] < 0])
    else:
        ganancia_perdida, skus_con_desviacion, peor_infractor, skus_con_perdida = 0, 0, None, 0

    insight_text = f"Auditoría completada. Se encontraron {skus_con_desviacion} productos con desviaciones significativas, representando S/ {ganancia_perdida:,.2f} en ganancias no realizadas."
    kpis = {
        "Ganancia 'Perdida' (S/.)": f"S/ {ganancia_perdida:,.2f}",
        "# SKUs con Desviación": skus_con_desviacion,
        "Peor Infractor (%)": f"{peor_infractor['Desviación de Margen (%)']:.1f}% ({peor_infractor['Nombre del producto']})" if peor_infractor is not None else "N/A",
        "# SKUs con Pérdida": skus_con_perdida
    }


    if ordenar_por == 'impacto_financiero':
        df_resultado.sort_values(by='Impacto Financiero Total (S/.)', ascending=False, inplace=True)
    elif ordenar_por == 'desviacion_porcentual':
        df_resultado.sort_values(by='Desviación de Margen (%)', ascending=True, inplace=True) # La desviación más negativa primero
    elif ordenar_por == 'peor_margen_real':
        df_resultado.sort_values(by='Margen Real (S/.)', ascending=True, inplace=True) # El margen más bajo/negativo primero
    elif ordenar_por == 'categoria':
        df_resultado.sort_values(by=['Categoría', 'Impacto Financiero Total (S/.)'], ascending=[True, False], inplace=True)
    

    # --- 5. Formateo y Limpieza Final ---
    # ... (Tu lógica para seleccionar, renombrar y limpiar el `df_resultado` para JSON)
    # --- PASO 6: Formateo y Limpieza Final (sin cambios en la lógica, solo en el return) ---
    if df_resultado.empty:
        print("✅ Auditoría completada. No se encontraron productos con márgenes negativos.")
        # Devolvemos la estructura de diccionario esperada, con un DataFrame vacío
        return {
            "data": pd.DataFrame({"Resultado": ["No se encontraron productos con márgenes de venta negativos."]}),
            "summary": {
                "insight": "¡Excelente! No se detectaron productos vendidos por debajo de su costo actual.",
                "kpis": {}
            }
        }

    print(f"⚠️ Auditoría completada. Se encontraron {len(df_resultado)} productos con márgenes negativos.")
    
    df_resultado.rename(columns={
        'Precio Venta de Lista (Inventario)': 'Precio Venta Lista',
        'Precio Venta Promedio (Ventas)': 'Precio Venta Promedio',
        'Precio Compra Actual': 'Costo Actual',
        'Margen Unitario Real (Negativo)': 'Margen Calculado',
        'Precio de venta actual (S/.)': 'Precio Venta de Lista (S/.)',
        'Precio_Venta_Prom_Calculado': 'Precio Venta Promedio (S/.)',
    }, inplace=True)
    
    # Limpieza final para compatibilidad con JSON
    df_limpio = df_resultado.replace([np.inf, -np.inf], np.nan)
    resultado_final = df_limpio.where(pd.notna(df_limpio), None)

    
    return {
        "data": resultado_final,
        "summary": { "insight": insight_text, "kpis": kpis }
    }


def diagnosticar_catalogo(
    df_ventas: pd.DataFrame,
    df_inventario: pd.DataFrame,
    tipo_diagnostico_catalogo: str,
    filtro_stock: str,
    dias_inactividad: int,
    ordenar_por: str,
    filtro_categorias: Optional[List[str]],
    filtro_marcas: Optional[List[str]],
    **kwargs
) -> Dict[str, Any]:
    """
    Analiza el catálogo para encontrar productos "fantasma" o "obsoletos",
    con un flujo de datos robusto para evitar errores y advertencias.
    """
    # --- PASO 1: Definición de Nombres y Pre-procesamiento ---
    # Usamos un único conjunto de nombres internos para toda la función.
    SKU = 'sku'
    NOMBRE_PROD = 'nombre_producto'
    CATEGORIA = 'categoria'
    STOCK_ACTUAL = 'stock_actual_unds'
    PRECIO_COMPRA = 'precio_compra_actual'
    FECHA_VENTA = 'fecha_venta'
    VALOR_STOCK = 'valor_stock_s'
    MARCA = 'marca'

    # Renombramos a nombres internos consistentes
    df_ventas_proc = df_ventas.rename(columns={'SKU / Código de producto': SKU, 'Fecha de venta': FECHA_VENTA})
    df_inventario_proc = df_inventario.rename(columns={
        'SKU / Código de producto': SKU, 'Nombre del producto': NOMBRE_PROD,
        'Cantidad en stock actual': STOCK_ACTUAL, 'Precio de compra actual (S/.)': PRECIO_COMPRA,
        'Categoría': CATEGORIA, 'Marca': MARCA
    })

    # Limpieza y conversión de tipos
    df_inventario_proc[STOCK_ACTUAL] = pd.to_numeric(df_inventario_proc[STOCK_ACTUAL], errors='coerce').fillna(0)
    df_inventario_proc[PRECIO_COMPRA] = pd.to_numeric(df_inventario_proc[PRECIO_COMPRA], errors='coerce').fillna(0)
    df_ventas_proc[FECHA_VENTA] = pd.to_datetime(df_ventas_proc[FECHA_VENTA], format='%d/%m/%Y', errors='coerce')
    
    # Calculamos el valor del stock aquí para que esté disponible en todo momento
    df_inventario_proc[VALOR_STOCK] = df_inventario_proc[STOCK_ACTUAL] * df_inventario_proc[PRECIO_COMPRA]

    # --- PASO 2: Lógica del Diagnóstico ---
    df_resultado = pd.DataFrame()

    if tipo_diagnostico_catalogo == 'nunca_vendidos':
        skus_vendidos = df_ventas_proc[SKU].unique()
        # Usamos .copy() para evitar el SettingWithCopyWarning
        df_nunca_vendidos = df_inventario_proc[~df_inventario_proc[SKU].isin(skus_vendidos)].copy()
        df_nunca_vendidos['Diagnóstico'] = 'Nunca Vendido'
        
        # Aplicamos el filtro de stock sobre la columna con el nombre interno correcto
        if filtro_stock == 'con_stock':
            df_resultado = df_nunca_vendidos[df_nunca_vendidos[STOCK_ACTUAL] > 0].copy()
        elif filtro_stock == 'sin_stock':
            df_resultado = df_nunca_vendidos[df_nunca_vendidos[STOCK_ACTUAL] == 0].copy()
        else: # 'todos'
            df_resultado = df_nunca_vendidos.copy()

    elif tipo_diagnostico_catalogo == 'agotados_inactivos':
        ultima_venta_por_sku = df_ventas_proc.groupby(SKU)[FECHA_VENTA].max()
        df_inventario_con_ultima_venta = pd.merge(df_inventario_proc, ultima_venta_por_sku, on=SKU, how='left')
        
        hoy = pd.to_datetime(datetime.now().date())
        df_inventario_con_ultima_venta['dias_sin_venta'] = (hoy - df_inventario_con_ultima_venta[FECHA_VENTA]).dt.days
        
        condicion = (df_inventario_con_ultima_venta[STOCK_ACTUAL] == 0) & \
                    (df_inventario_con_ultima_venta['dias_sin_venta'] > dias_inactividad)
        df_resultado = df_inventario_con_ultima_venta[condicion].copy()
        df_resultado['Diagnóstico'] = 'Agotado e Inactivo'

    # --- INICIO DE LA NUEVA LÓGICA ---
    df_filtrado = df_resultado.copy()

    if filtro_categorias and CATEGORIA in df_filtrado.columns:
        # Normalizamos la lista de categorías a minúsculas y sin espacios
        categorias_normalizadas = [cat.strip().lower() for cat in filtro_categorias]
        
        # Comparamos contra la columna del DataFrame también normalizada
        # El .str.lower() y .str.strip() se aplican a cada valor de la columna antes de la comparación
        df_filtrado = df_filtrado[
            df_filtrado[CATEGORIA].str.strip().str.lower().isin(categorias_normalizadas)
        ].copy()

    if filtro_marcas and MARCA in df_filtrado.columns:
        # Normalizamos la lista de marcas
        marcas_normalizadas = [marca.strip().lower() for marca in filtro_marcas]
        
        # Comparamos contra la columna de marcas normalizada
        df_filtrado = df_filtrado[
            df_filtrado[MARCA].str.strip().str.lower().isin(marcas_normalizadas)
        ].copy()
    # print(f"filtro_categorias {filtro_categorias}")

    # --- 3. Cálculo de KPIs y Resumen ---
    kpis = {}
    insight_text = "Diagnóstico completado."
    df_filtrado['valor_stock_s'] = (df_filtrado[STOCK_ACTUAL] * df_filtrado[PRECIO_COMPRA]).round(2)

    if tipo_diagnostico_catalogo == 'nunca_vendidos':
        kpis["# SKUs 'Fantasma' (Nunca Vendidos)"] = len(df_filtrado)
        valor_oculto = df_filtrado[df_filtrado[STOCK_ACTUAL] > 0]['valor_stock_s'].sum()
        kpis["Valor Potencial Oculto"] = f"S/ {valor_oculto:,.2f}"
        insight_text = f"Se encontraron {len(df_filtrado)} productos 'fantasma' que nunca han registrado una venta. De estos, S/ {valor_oculto:,.2f} corresponden a capital inmovilizado en stock."

    elif tipo_diagnostico_catalogo == 'agotados_inactivos':
        kpis["# SKUs Obsoletos"] = len(df_filtrado)
        insight_text = f"Se encontraron {len(df_filtrado)} productos obsoletos (agotados y sin ventas por más de {dias_inactividad} días) que podrías depurar de tu catálogo."

    # --- PASO 5: ORDENAMIENTO DINÁMICO ---
    print(f"Ordenando resultados por: '{ordenar_por}'")
    ascending_map = {
        'valor_stock_s': False,
        'stock_actual_unds': False,
        'categoria': True
    }
    is_ascending = ascending_map.get(ordenar_por, False)
    
    if ordenar_por in df_filtrado.columns:
        df_filtrado.sort_values(by=ordenar_por, ascending=is_ascending, inplace=True)
    
    # --- PASO 4: FORMATEO FINAL DE SALIDA ---
    columnas_finales = [SKU, NOMBRE_PROD, CATEGORIA, MARCA, STOCK_ACTUAL, VALOR_STOCK, 'Diagnóstico']
    df_final = df_filtrado[[col for col in columnas_finales if col in df_filtrado.columns]].copy()
    
    df_final.rename(columns={
        SKU: 'SKU / Código de producto', NOMBRE_PROD: 'Nombre del producto',
        CATEGORIA: 'Categoría', MARCA: 'Marca', STOCK_ACTUAL: 'Stock Actual (Unds)',
        VALOR_STOCK: 'Valor stock (S/.)'
    }, inplace=True)

    # Limpieza para JSON
    df_final = df_final.replace([np.inf, -np.inf], np.nan).where(pd.notna(df_final), None)
    
    return {
        "data": df_final,
        "summary": { "insight": insight_text, "kpis": kpis }
    }



def auditar_calidad_datos(
    df_inventario: pd.DataFrame,
    criterios_auditoria: List[str],
    df_ventas: pd.DataFrame = None, # Acepta df_ventas pero no lo usa
    filtro_categorias: Optional[List[str]] = None,
    filtro_marcas: Optional[List[str]] = None,
    ordenar_por: str = 'valor_stock_s',
    filtro_skus: Optional[List[str]] = None,
    **kwargs
) -> Dict[str, Any]:
    """
    Analiza el DataFrame de inventario para encontrar una variedad de problemas de
    calidad de datos, incluyendo datos faltantes, problemas de rentabilidad y duplicados.
    """
    print("Iniciando Auditoría de Calidad de Datos Avanzada...")

    # --- PASO 1: Definición de Nombres y Pre-procesamiento ---
    SKU = 'SKU / Código de producto'
    NOMBRE_PROD = 'Nombre del producto'
    CATEGORIA = 'Categoría'
    MARCA = 'Marca'
    PRECIO_COMPRA = 'Precio de compra actual (S/.)'
    PRECIO_VENTA = 'Precio de venta actual (S/.)' # Nueva columna necesaria
    STOCK_ACTUAL = 'Cantidad en stock actual'
    VALOR_STOCK = 'valor_stock_s'

    df_audit = df_inventario.copy()
    df_audit.columns = df_audit.columns.str.strip()
    
    # Aseguramos que todas las columnas necesarias existan
    for col in [SKU, NOMBRE_PROD, CATEGORIA, MARCA, PRECIO_COMPRA, PRECIO_VENTA, STOCK_ACTUAL]:
        if col not in df_audit.columns:
            df_audit[col] = np.nan
    
    df_audit[SKU] = df_audit[SKU].astype(str).str.strip()

    if filtro_skus:
        print(f"Ejecutando reporte en modo contextual para {len(filtro_skus)} SKUs.")
        df_audit = df_audit[df_audit[SKU].isin(filtro_skus)]

    # Limpieza de tipos
    for col in [PRECIO_COMPRA, PRECIO_VENTA, STOCK_ACTUAL]:
        df_audit[col] = pd.to_numeric(df_audit[col], errors='coerce')
    
    df_audit[VALOR_STOCK] = df_audit[STOCK_ACTUAL].fillna(0) * df_audit[PRECIO_COMPRA].fillna(0)

    # --- PASO 2: Aplicación de Criterios de Auditoría ---
    problem_dfs = [] # Lista para almacenar los DataFrames de cada problema detectado

    if 'marca_faltante' in criterios_auditoria:
        df_problema = df_audit[pd.isna(df_audit[MARCA]) | (df_audit[MARCA].astype(str).str.strip() == '')].copy()
        df_problema['Problema Detectado'] = 'Marca Faltante'
        problem_dfs.append(df_problema)
        
    if 'categoria_faltante' in criterios_auditoria:
        df_problema = df_audit[pd.isna(df_audit[CATEGORIA]) | (df_audit[CATEGORIA].astype(str).str.strip() == '')].copy()
        df_problema['Problema Detectado'] = 'Categoría Faltante'
        problem_dfs.append(df_problema)

    if 'precio_compra_cero' in criterios_auditoria:
        df_problema = df_audit[df_audit[PRECIO_COMPRA].fillna(0) == 0].copy()
        df_problema['Problema Detectado'] = 'Precio Compra en Cero'
        problem_dfs.append(df_problema)
    
    if 'precio_venta_menor_costo' in criterios_auditoria:
        df_problema = df_audit[df_audit[PRECIO_VENTA] < df_audit[PRECIO_COMPRA]].copy()
        df_problema['Problema Detectado'] = 'Precio Venta < Costo'
        problem_dfs.append(df_problema)

    if 'nombres_duplicados' in criterios_auditoria:
        # Buscamos nombres de producto que correspondan a más de un SKU
        duplicated_names = df_audit.groupby(NOMBRE_PROD)[SKU].nunique()
        duplicated_names = duplicated_names[duplicated_names > 1].index
        if not duplicated_names.empty:
            df_problema = df_audit[df_audit[NOMBRE_PROD].isin(duplicated_names)].copy()
            df_problema['Problema Detectado'] = 'Nombre Duplicado'
            problem_dfs.append(df_problema)

    if not problem_dfs:
        return {"data": pd.DataFrame(), "summary": {"insight": "¡Excelente! No se encontraron problemas de calidad de datos con los criterios seleccionados.", "kpis": {}}}

    df_resultado = pd.concat(problem_dfs).drop_duplicates(subset=[SKU])

    # --- PASO 3: Aplicación de Filtros Adicionales ---
    if filtro_categorias and CATEGORIA in df_resultado.columns:
        # Normalizamos la lista de categorías a minúsculas y sin espacios
        categorias_normalizadas = [cat.strip().lower() for cat in filtro_categorias]
        
        # Comparamos contra la columna del DataFrame también normalizada
        # El .str.lower() y .str.strip() se aplican a cada valor de la columna antes de la comparación
        df_resultado = df_resultado[
            df_resultado[CATEGORIA].str.strip().str.lower().isin(categorias_normalizadas)
        ].copy()

    if filtro_marcas and MARCA in df_resultado.columns:
        # Normalizamos la lista de marcas
        marcas_normalizadas = [marca.strip().lower() for marca in filtro_marcas]
        
        # Comparamos contra la columna de marcas normalizada
        df_resultado = df_resultado[
            df_resultado[MARCA].str.strip().str.lower().isin(marcas_normalizadas)
        ].copy()

    # --- 4. Cálculo de KPIs y Resumen ---
    skus_con_problemas = len(df_resultado)
    valor_en_riesgo = df_resultado[VALOR_STOCK].sum()
    insight_text = f"Se encontraron {skus_con_problemas} productos con problemas de calidad de datos. Corregirlos mejorará la precisión de todos tus análisis."
    kpis = {
        "# SKUs con Problemas": skus_con_problemas,
        "Valor de Stock Afectado": f"S/ {valor_en_riesgo:,.2f}"
    }

    # --- PASO 5: ORDENAMIENTO DINÁMICO ---
    ascending_map = {
        'valor_stock_s': False,       # Mayor valor primero
        'stock_actual_unds': False    # Mayor cantidad primero
    }
    is_ascending = ascending_map.get(ordenar_por, False)
    
    if ordenar_por in df_resultado.columns:
        df_resultado.sort_values(by=ordenar_por, ascending=is_ascending, inplace=True)
    
    
    # ... (Tu lógica para seleccionar, renombrar y limpiar el `df_resultado` para JSON)
        # --- PASO 4: FORMATEO FINAL DE SALIDA ---
    columnas_finales = [SKU, NOMBRE_PROD, CATEGORIA, MARCA, STOCK_ACTUAL, VALOR_STOCK, 'Problema Detectado']
    df_final = df_resultado[[col for col in columnas_finales if col in df_resultado.columns]].copy()
    

    df_final.rename(columns={
        SKU: 'SKU / Código de producto', NOMBRE_PROD: 'Nombre del producto',
        CATEGORIA: 'Categoría', MARCA: 'Marca',
        STOCK_ACTUAL: 'Stock Actual (Unds)', VALOR_STOCK: 'Valor stock (S/.)'
    }, inplace=True)

    df_final = df_final.replace([np.inf, -np.inf], np.nan).where(pd.notna(df_final), None)
    
    return {
        "data": df_final,
        "summary": { "insight": insight_text, "kpis": kpis }
    }

def _clean_preview_data(df: pd.DataFrame) -> list:
    """Función auxiliar para limpiar un DataFrame para la vista previa en JSON."""
    if df.empty:
        return []
    # Reemplaza infinitos con NaN, luego NaN con None, y convierte a dict
    df_clean = df.replace([np.inf, -np.inf], np.nan)
    df_clean = df_clean.infer_objects(copy=False)
    return df_clean.where(pd.notna(df_clean), None).to_dict(orient='records')


def generar_auditoria_inventario(
    df_ventas: pd.DataFrame,
    df_inventario: pd.DataFrame,
    **kwargs
) -> Dict[str, Any]:
    """
    Función orquestadora que ejecuta una auditoría de 360°, reutilizando la
    inteligencia de otros reportes para generar un plan de acción priorizado.
    """
    # --- INICIO DE LA SOLUCIÓN: ESTANDARIZACIÓN DE TIPOS ---
    
    # 1. Definimos los nombres de las columnas clave
    SKU_COL = 'SKU / Código de producto'

    # 2. Hacemos una copia para trabajar de forma segura
    df_ventas_proc = df_ventas.copy()
    df_inventario_proc = df_inventario.copy()

    # 3. Forzamos la columna SKU a ser de tipo string y sin espacios en AMBOS DataFrames.
    # Esta es la política de consistencia que evita errores de merge.
    if SKU_COL in df_ventas_proc.columns:
        df_ventas_proc[SKU_COL] = df_ventas_proc[SKU_COL].astype(str).str.strip()
    if SKU_COL in df_inventario_proc.columns:
        df_inventario_proc[SKU_COL] = df_inventario_proc[SKU_COL].astype(str).str.strip()

    # --- FIN DE LA SOLUCIÓN ---

    print("Iniciando Auditoría de Eficiencia de Inventario de 360 Grados...")
    tasks = []

    # --- FASE 1: La "Mesa de Preparación" - Enriquecimiento de Datos ---
    print("Fase 1: Ejecutando análisis fundamentales...")
    
    # 1.1 Ejecutamos el Análisis de Rotación para obtener el DataFrame base
    resultado_rotacion = process_csv_analisis_estrategico_rotacion(df_ventas.copy(), df_inventario.copy())
    df_maestro = resultado_rotacion.get("data")
    
    if df_maestro is None or df_maestro.empty:
        return {"puntaje_salud": 0, "kpis_dolor": {}, "plan_de_accion": []}

    # 1.2 Ejecutamos el Plan de Compra para obtener métricas de reposición
    resultado_reposicion = process_csv_lista_basica_reposicion_historico(df_ventas.copy(), df_inventario.copy(), ordenar_por = "Índice de Urgencia")
    df_reposicion = resultado_reposicion.get("data")
    if df_reposicion is not None and not df_reposicion.empty:
        cols_a_unir = [SKU_COL, 'Pedido Mínimo Sugerido (Unds)', '¿Pedir Ahora?', 'Ventas Recientes (30) (Unds)', 'Ventas Periodo General (180d) (Unds)', 'Punto de Alerta Mínimo (Unds)', 'Stock Ideal Sugerido (Unds)', 'Accion_Requerida', 'Stock Mínimo Sugerido (Unds)', 'Precio Compra Actual (S/.)', 'Pedido Ideal Sugerido (Unds)', 'Índice de Urgencia']
        df_maestro = pd.merge(df_maestro, df_reposicion[[col for col in cols_a_unir if col in df_reposicion.columns]], on=SKU_COL, how='left', suffixes=('', '_right'))
        # df_maestro = pd.merge(df_maestro, df_reposicion[cols_a_unir], on='SKU / Código de producto', how='left')
        df_maestro['Stock Ideal Sugerido (Unds)'].fillna(0, inplace=True)


    # 1.3 Ejecutamos la Auditoría de Márgenes para obtener la rentabilidad real
    resultado_margenes = auditar_margenes_de_productos_nuevo(df_ventas.copy(), df_inventario.copy())
    df_margenes = resultado_margenes.get("data")
    if df_margenes is not None and not df_margenes.empty:
        cols_a_unir = [SKU_COL, 'Margen Real (S/.)', 'Precio Venta de Lista (S/.)', 'Margen Teórico (S/.)', 'Desviación de Margen (%)', 'Precio de compra actual (S/.)', 'Precio Venta Promedio (S/.)', 'Cantidad vendida', 'Impacto Financiero Total (S/.)']
        df_maestro = pd.merge(df_maestro, df_margenes[[col for col in cols_a_unir if col in df_margenes.columns]], on=SKU_COL, how='left', suffixes=('', '_right'))
        df_maestro['Margen Real (S/.)'].fillna(0, inplace=True)
    else:
        # Si el reporte de márgenes no devuelve nada, creamos la columna con ceros
        df_maestro['Margen Real (S/.)'] = 0

    # 1.4. Ejecutamos el Análisis de Salud del Stock
    # La función `procesar_stock_muerto` devuelve un diccionario.
    resultado_salud = procesar_stock_muerto(df_ventas.copy(), df_inventario.copy())
    # --- CAMBIO CLAVE: Extraemos el DataFrame de la clave "data" ---
    df_salud = resultado_salud.get("data")
    if df_salud is not None and not df_salud.empty:
        cols_a_unir = [SKU_COL, 'Clasificación Diagnóstica', 'Valor stock (S/.)', "Ventas totales (Unds)", "Ventas últimos 3m (Unds)", "Última venta", "Días sin venta"]
        df_maestro = pd.merge(df_maestro, df_salud[[col for col in cols_a_unir if col in df_salud.columns]], on=SKU_COL, how='left', suffixes=('', '_right'))

    # 1.5. Ejecutamos el Análisis de Calidad de Datos
    # La función `auditar_calidad_datos` devuelve un diccionario.
    criterios_auditoria_json = ["marca_faltante","categoria_faltante","precio_compra_cero","nombres_duplicados","precio_venta_menor_costo"]
    resultado_audit = auditar_calidad_datos(df_ventas=None, df_inventario=df_inventario.copy(), ordenar_por='valor_stock_s', criterios_auditoria= criterios_auditoria_json)
    # --- CAMBIO CLAVE: Extraemos el DataFrame de la clave "data" ---
    df_audit = resultado_audit.get("data")
    # print(f"df_audit {df_audit}")
    if df_audit is not None and not df_audit.empty:
        cols_a_unir = [SKU_COL, "Problema Detectado"]
        df_maestro = pd.merge(df_maestro, df_audit[[col for col in cols_a_unir if col in df_audit.columns]], on=SKU_COL, how='left', suffixes=('', '_right'))


    # print(f"df_maestro {df_maestro.columns.tolist()}")
    # print(f"{df_maestro}")

    dynamic_params = {'dias_recientes': 30, 'dias_general': 180}

    # --- FASE 2: Detección de Alertas ---
    print("Fase 2: Detectando alertas y oportunidades...")

    # Alerta 0: Quiebre de Stock en "Vacas Lecheras"
    alerta1_df = df_maestro[(df_maestro['Clasificación BCG'].isin(['🌟 Estrella'])) & (df_maestro['Alerta de Stock'].isin(['Agotado', 'Stock Bajo']))].copy()

    if not alerta1_df.empty:
        skus_afectados = alerta1_df['SKU / Código de producto'].tolist()

        target_report_key = "ReporteListaBasicaReposicionHistorica"

        if 'Índice de Urgencia' in alerta1_df.columns:
            alerta1_df.sort_values(by='Índice de Urgencia', ascending=False, inplace=True)
       
        column_templates = REPORTS_CONFIG.get(target_report_key, {}).get('detalle_columns', [])
        preview_cols = [
            col.format(**dynamic_params) for col in column_templates
        ]

        preview_df = alerta1_df[[col for col in preview_cols if col in alerta1_df.columns]].head(3)
        preview_data = _clean_preview_data(preview_df) # _clean_preview_data ahora devuelve una lista        

        preview_headers = [
            col for col in preview_df.columns 
            if col not in ['SKU / Código de producto', 'Nombre del producto']
        ]
        
        venta_perdida_estimada = (alerta1_df['PDA_Demanda_Estrategica'] * alerta1_df['Precio Venta (S/.)'] * 25).sum()
        tasks.append({
            "id": "task_quiebre_stock_a", "type": "error",
            "title": f"Tienes {len(alerta1_df)} productos '🌟 Estrella' en riesgo de quiebre de stock.",
            "impact": f"Riesgo de pérdida de ventas: S/ {venta_perdida_estimada:,.2f} este mes.",
            "solution_button_text": "Ver y Reponer Urgentes",
            "target_report": target_report_key,
            "knowledge": AUDIT_KNOWLEDGE_BASE.get("quiebre_stock_clase_a"),
            "preview_data": preview_data,
            "preview_headers": preview_headers, # <-- LA LISTA ORDENADA
            "skus_afectados": skus_afectados
        })

    # Primero, identificamos todo el stock muerto
    df_stock_muerto_general = df_maestro[df_maestro['Clasificación Diagnóstica'] == 'Stock Muerto'].copy()

    # Alerta 3 (Advertencia): "Capital Inmovilizado en Productos 'Perro'"
    alerta3_df = df_stock_muerto_general[df_stock_muerto_general['Clasificación BCG'] == '🐕 Perro'].copy()
    # print(f"alerta3_df.colums {alerta3_df.columns}")
    # print(f"alerta3_df {alerta3_df}")
    if not alerta3_df.empty:
        capital_inmovilizado = alerta3_df['Valor stock (S/.)'].sum()
        skus_afectados_3 = alerta3_df['SKU / Código de producto'].tolist()
        
        target_report_key_3 = "ReporteDiagnosticoStockMuerto"

        if 'Valor stock (S/.)' in alerta3_df.columns:
            alerta3_df.sort_values(by='Valor stock (S/.)', ascending=False, inplace=True)

        preview_cols_3 = REPORTS_CONFIG.get(target_report_key_3, {}).get('detalle_columns', [])
        preview_df_3 = alerta3_df[[col for col in preview_cols_3 if col in alerta3_df.columns]].head(3)
        
        preview_headers_3 = [
            col for col in preview_df_3.columns 
            if col not in ['SKU / Código de producto', 'Nombre del producto']
        ]

        tasks.append({
            "id": "task_stock_muerto_perro",
            "type": "warning",
            "title": f"Tienes {len(alerta3_df)} productos '🐕 Perro' (baja importancia) como stock muerto.",
            "impact": f"Capital inmovilizado: S/ {capital_inmovilizado:,.2f}.",
            "solution_button_text": "Ver y Crear Plan de Liquidación",
            "target_report": target_report_key_3,
            "knowledge": AUDIT_KNOWLEDGE_BASE.get("stock_muerto_perro"),
            "preview_data": _clean_preview_data(preview_df_3),
            "preview_headers": preview_headers_3, # <-- LA LISTA ORDENADA
            "skus_afectados": skus_afectados_3
        })
   
    # Alerta 4 (Error Crítico): "Héroes Caídos: Productos Importantes en Riesgo"
    alerta4_df = df_stock_muerto_general[df_stock_muerto_general['Clasificación BCG'].isin(['🐄 Vaca Lechera', '🌟 Estrella'])].copy()
    if not alerta4_df.empty:
        valor_estrategico_riesgo = alerta4_df['Valor stock (S/.)'].sum()
        skus_afectados_4 = alerta4_df['SKU / Código de producto'].tolist()

        target_report_key_4 = "ReporteMaestro"

        if 'Valor stock (S/.)' in alerta3_df.columns:
            alerta4_df.sort_values(by=['Valor stock (S/.)'], ascending=[False], inplace=True)
        

        preview_cols_4 = REPORTS_CONFIG.get(target_report_key_4, {}).get('detalle_columns', [])
        preview_df_4 = alerta4_df[[col for col in preview_cols_4 if col in alerta4_df.columns]].head(3)

        preview_headers_4 = [
            col for col in preview_df_4.columns 
            if col not in ['SKU / Código de producto', 'Nombre del producto']
        ]

        tasks.append({
            "id": "task_stock_muerto_heroe_caido",
            "type": "error",
            "title": f"¡Alerta Crítica! {len(alerta4_df)} de tus productos importantes se han convertido en stock muerto.",
            "impact": f"Valor estratégico en riesgo: S/ {valor_estrategico_riesgo:,.2f}.",
            "solution_button_text": "Investigar Causa Raíz",
            "target_report": target_report_key_4,
            "knowledge": AUDIT_KNOWLEDGE_BASE.get("stock_muerto_heroe_caido"),
            "preview_data": _clean_preview_data(preview_df_4),
            "preview_headers": preview_headers_4, # <-- LA LISTA ORDENADA
            "skus_afectados": skus_afectados_4
        })


    # Primero, identificamos todo el exceso de stock en productos importantes
    df_exceso_stock_general = df_maestro[
        (df_maestro['Clasificación BCG'].isin(['🌟 Estrella', '🐄 Vaca Lechera'])) &
        (df_maestro['Alerta de Stock'] == 'Sobre-stock')
    ].copy()

    # Nueva Alerta #4 (Oportunidad): "Optimizar Inversión en 'Estrellas'"
    alerta5_df = df_exceso_stock_general[df_exceso_stock_general['Clasificación BCG'] == '🌟 Estrella'].copy()
    if not alerta5_df.empty:
        # Asumimos que 'Stock Ideal Sugerido (Unds)' y 'Precio Compra (S/.)' existen en df_maestro
        capital_excedente = ((alerta5_df['Stock Actual (Unds)'] - alerta5_df['Stock Ideal Sugerido (Unds)']) * alerta5_df['Precio Compra (S/.)']).sum()
        skus_afectados_5 = alerta5_df['SKU / Código de producto'].tolist()

        target_report_key_5 = "ReporteListaBasicaReposicionHistorica"

        preview_cols_5 = REPORTS_CONFIG.get(target_report_key_5, {}).get('detalle_columns', [])
        preview_df_5 = alerta5_df[[col for col in preview_cols_5 if col in alerta5_df.columns]].head(3)

        preview_headers_5 = [
            col for col in preview_df_5.columns 
            if col not in ['SKU / Código de producto', 'Nombre del producto']
        ]
        
        tasks.append({
            "id": "task_exceso_stock_estrella",
            "type": "opportunity",
            "title": f"Tienes {len(alerta5_df)} productos '🌟 Estrella' con exceso de stock.",
            "impact": f"Capital excedente que puedes optimizar: S/ {capital_excedente:,.2f}.",
            "solution_button_text": "Ajustar Plan de Compra",
            "target_report": target_report_key_5,
            "knowledge": AUDIT_KNOWLEDGE_BASE.get("exceso_stock_estrella"),
            "preview_data": _clean_preview_data(alerta5_df.head(3)),
            "preview_headers": preview_headers_5, # <-- LA LISTA ORDENADA
            "skus_afectados": skus_afectados_5
        })

    # Nueva Alerta #6 (Advertencia): "Liberar Capital de 'Vacas Lecheras'"
    alerta6_df = df_exceso_stock_general[df_exceso_stock_general['Clasificación BCG'] == '🐄 Vaca Lechera'].copy()
    if not alerta6_df.empty:
        capital_perezoso = alerta6_df['Inversión Stock Actual (S/.)'].sum()
        skus_afectados_6 = alerta6_df['SKU / Código de producto'].tolist()

        target_report_key_6 = "ReporteAnalisisEstrategicoRotacion"

        preview_cols_6 = REPORTS_CONFIG.get(target_report_key_6, {}).get('detalle_columns', [])
        preview_df_6 = alerta6_df[[col for col in preview_cols_6 if col in alerta6_df.columns]].head(3)

        preview_headers_6 = [
            col for col in preview_df_6.columns 
            if col not in ['SKU / Código de producto', 'Nombre del producto']
        ]

        tasks.append({
            "id": "task_exceso_stock_vaca",
            "type": "warning",
            "title": f"Tienes {len(alerta6_df)} productos '🐄 Vacas Lecheras' con exceso de stock.",
            "impact": f"Capital perezoso inmovilizado: S/ {capital_perezoso:,.2f}.",
            "solution_button_text": "Analizar Rotación y Cobertura",
            "target_report": target_report_key_6,
            "knowledge": AUDIT_KNOWLEDGE_BASE.get("exceso_stock_vaca"),
            "preview_data": _clean_preview_data(alerta6_df.head(3)),
            "preview_headers": preview_headers_6, # <-- LA LISTA ORDENADA
            "skus_afectados": skus_afectados_6
        })

    # Alerta 7 (Oportunidad): Potenciales "Estrellas" Emergentes
    print("Ejecutando Alerta 7: Potenciales Estrellas Emergentes...")
    # Nos aseguramos de que las columnas necesarias para el cálculo de tendencia existan
    # required_cols_alert7 = ['Clasificación BCG', 'Ventas Recientes (30d) (Unds)', 'Ventas Periodo General (180d) (Unds)']
    # if all(col in df_maestro.columns for col in required_cols_alert7):
        
    # Filtramos para obtener solo los productos de Clase B
    # alerta7_df = df_maestro[df_maestro['Clasificación BCG'].isin(['🌟 Estrella', '🐄 Vaca Lechera'])].copy()
    alerta7_df = df_maestro[df_maestro['Clasificación BCG'] == '🐄 Vaca Lechera'].copy()
    if not alerta7_df.empty:
        # Calculamos la velocidad de venta para ambos períodos
        velocidad_reciente = alerta7_df['Ventas Recientes (30d) (Unds)'] / 30
        velocidad_general = alerta7_df['Ventas Periodo General (180d) (Unds)'] / 180
        
        # Identificamos los productos cuya velocidad reciente es al menos 50% mayor que la general
        estrellas_emergentes = alerta7_df[velocidad_reciente > (velocidad_general * 0.9)].copy()
        # print(f"estrellas_emergentes {estrellas_emergentes}")
        if not estrellas_emergentes.empty:
            # Calculamos la tendencia para poder ordenarlos y mostrarla
            estrellas_emergentes['Tendencia de Crecimiento (%)'] = ((velocidad_reciente / velocidad_general.replace(0, np.nan) - 1) * 100).fillna(1000) # Usamos un valor alto para los que no tenían ventas antes
            estrellas_emergentes.sort_values(by='Tendencia de Crecimiento (%)', ascending=False, inplace=True)

            skus_afectados_7 = estrellas_emergentes['SKU / Código de producto'].tolist()
            target_report_key_7 = "ReporteAnalisisEstrategicoRotacion"

            preview_cols_7 = REPORTS_CONFIG.get(target_report_key_7, {}).get('detalle_columns', [])
            preview_df_7 = estrellas_emergentes[preview_cols_7].head(3)

            preview_headers_7 = [
                col for col in preview_df_7.columns 
                if col not in ['SKU / Código de producto', 'Nombre del producto']
            ]

            tasks.append({
                "id": "task_estrellas_emergentes",
                "type": "opportunity",
                "title": f"Se han detectado {len(estrellas_emergentes)} productos '🐄 Vacas Lecheras' con aceleración en ventas.",
                "impact": "Potencial de convertirse en tus nuevas '🌟 Estrellas'.",
                "solution_button_text": "Analizar Productos de Alto Potencial",
                "target_report": target_report_key_7,
                "knowledge": AUDIT_KNOWLEDGE_BASE.get("oportunidad_clase_b"),
                "preview_data": _clean_preview_data(preview_df_7),
                "preview_headers": preview_headers_7, # <-- LA LISTA ORDENADA
                "skus_afectados": skus_afectados_7
            })
    else:
        print("Advertencia: Faltan columnas para ejecutar la Alerta 5. Se omitirá.")

    # Alerta 6 (Advertencia): "Héroes en Declive"
    print("Ejecutando Alerta 8: Héroes en Declive...")
    # Nos aseguramos de que las columnas necesarias existan
    # required_cols_alert6 = ['Clasificacion_BCG', 'Tendencia de Crecimiento (%)', 'Ingreso_Total_Reciente']
    # if all(col in df_maestro.columns for col in required_cols_alert6):
        
    # Filtramos para obtener solo los productos importantes
    alerta8_df = df_maestro[df_maestro['Clasificación BCG'].isin(['🌟 Estrella', '🐄 Vaca Lechera'])].copy()
    
    if not alerta8_df.empty:
        # Identificamos los productos cuya tendencia de crecimiento es fuertemente negativa
        heroes_en_declive = alerta8_df[alerta8_df['Tendencia de Crecimiento (%)'] < -20].copy()

        if not heroes_en_declive.empty:
            # Calculamos el impacto: la caída en los ingresos mensuales proyectados
            # (Necesitaríamos el ingreso del período general para un cálculo preciso,
            # por ahora, usaremos el ingreso reciente como referencia del impacto)
            caida_venta_mensual = heroes_en_declive['Ingreso_Total_Reciente'].sum() # Simplificación del impacto

            skus_afectados_8 = heroes_en_declive['SKU / Código de producto'].tolist()
            target_report_key_8 = "ReporteAnalisisEstrategicoRotacion"
            preview_cols_8 = REPORTS_CONFIG.get(target_report_key_8, {}).get('detalle_columns', [])
            preview_df_8 = heroes_en_declive[preview_cols_8].head(3)

            preview_headers_8 = [
                col for col in preview_df_8.columns 
                if col not in ['SKU / Código de producto', 'Nombre del producto']
            ]

            tasks.append({
                "id": "task_heroes_en_declive",
                "type": "warning",
                "title": f"Se han detectado {len(heroes_en_declive)} productos importantes con ventas en declive.",
                "impact": f"Caída de ingresos de S/ {caida_venta_mensual:,.2f} en el último período.",
                "solution_button_text": "Investigar Causa de la Caída",
                "target_report": target_report_key_8,
                "knowledge": AUDIT_KNOWLEDGE_BASE.get("heroes_en_declive"),
                "preview_data": _clean_preview_data(preview_df_8),
                "preview_headers": preview_headers_8, # <-- LA LISTA ORDENADA
                "skus_afectados": skus_afectados_8
            })
    else:
        print("Advertencia: Faltan columnas para ejecutar la Alerta 6. Se omitirá.")

    print("Ejecutando Alerta 9: Inversión Ineficiente en Productos 'Perro'...")
    # Nos aseguramos de que las columnas necesarias existan
    # required_cols_alert6 = ['Accion_Requerida', 'Clasificacion_BCG', 'Sugerencia_Pedido_Minimo_Unds', 'Precio Compra (S/.)']
    # if all(col in df_maestro.columns for col in required_cols_alert6):

    # Filtramos para encontrar productos 'Perro' que el sistema sugiere reponer
    alerta9_df = df_maestro[
        (df_maestro['¿Pedir Ahora?'].str.contains('Sí', na=False)) & 
        (df_maestro['Clasificación BCG'] == '🐕 Perro')
    ].copy()

    if not alerta9_df.empty:
        # Calculamos el impacto: la inversión sugerida en estos productos de bajo rendimiento
        inversion_ineficiente = (alerta9_df['Pedido Mínimo Sugerido (Unds)'] * alerta9_df['Precio Compra (S/.)']).sum()
        
        skus_afectados_9 = alerta9_df['SKU / Código de producto'].tolist()
        target_report_key_9 = "ReporteListaBasicaReposicionHistorica"

        if 'Índice de Urgencia' in alerta9_df.columns:
            alerta9_df.sort_values(by='Índice de Urgencia', ascending=False, inplace=True)
       
        column_templates = REPORTS_CONFIG.get(target_report_key_9, {}).get('detalle_columns', [])
        preview_cols_9 = [
            col.format(**dynamic_params) for col in column_templates
        ]

        preview_df_9 = alerta9_df[[col for col in preview_cols_9 if col in alerta9_df.columns]].head(3)
        preview_data_9 = _clean_preview_data(preview_df_9) # _clean_preview_data ahora devuelve una lista        

        preview_headers_9 = [
            col for col in preview_df_9.columns 
            if col not in ['SKU / Código de producto', 'Nombre del producto']
        ]

        tasks.append({
            "id": "task_inversion_ineficiente_perro",
            "type": "opportunity",
            "title": f"Se sugiere reponer {len(alerta9_df)} productos '🐕 Perro' (baja importancia).",
            "impact": f"Inversión de baja prioridad sugerida: S/ {inversion_ineficiente:,.2f}.",
            "solution_button_text": "Optimizar Plan de Compra",
            "target_report": target_report_key_9,
            "knowledge": AUDIT_KNOWLEDGE_BASE.get("inversion_ineficiente_perro"),
            "preview_data": preview_data_9,
            "preview_headers": preview_headers_9, # <-- LA LISTA ORDENADA
            "skus_afectados": skus_afectados_9
        })
    else:
        print("Advertencia: Faltan columnas para ejecutar la Alerta 6. Se omitirá.")

    # Alerta 10: Eficiencia de Margen
    df_con_ventas_recientes = df_maestro[df_maestro['Ventas Recientes (30d) (Unds)'] > 0].copy()

    if not df_con_ventas_recientes.empty:
        df_con_ventas_recientes['margen_teorico_total'] = (
            (df_con_ventas_recientes['Precio Venta de Lista (S/.)'] - df_con_ventas_recientes['Precio de compra actual (S/.)']) * df_con_ventas_recientes['Ventas Recientes (30d) (Unds)']
        )

        df_con_ventas_recientes['margen_real_total'] = (
            df_con_ventas_recientes['Margen Real (S/.)'] * df_con_ventas_recientes['Ventas Recientes (30d) (Unds)']
        )

        suma_margen_teorico = df_con_ventas_recientes['margen_teorico_total'].sum()
        suma_margen_real = df_con_ventas_recientes['margen_real_total'].sum()
        
        eficiencia_de_margen = (suma_margen_real / suma_margen_teorico * 100) if suma_margen_teorico > 0 else 100.0

        if eficiencia_de_margen < 95:
            # ganancia_perdida = suma_margen_teorico - suma_margen_real
            ganancia_perdida = (df_con_ventas_recientes['Margen Teórico (S/.)'] - df_con_ventas_recientes['Margen Real (S/.)']).sum()
            
            # 1. Identificar a los "culpables" y priorizarlos
            df_culpables = df_maestro[df_maestro['Margen Real (S/.)'] < df_maestro['Margen Teórico (S/.)']].copy()
            df_culpables.sort_values(by='Desviación de Margen (%)', ascending=True, inplace=True)
            
            # 2. Extraer la lista de SKUs
            skus_afectados = df_culpables['SKU / Código de producto'].tolist()
            
            # 3. Crear la Vista Previa "A Medida"
            target_report_key = "ReporteAuditoriaMargenes"

            if 'Impacto Financiero Total (S/.)' in df_culpables.columns:
                df_culpables.sort_values(by='Impacto Financiero Total (S/.)', ascending=False, inplace=True)
       

            preview_cols = REPORTS_CONFIG.get(target_report_key, {}).get('detalle_columns', [])
            preview_df = df_culpables[preview_cols].head(3)
            preview_data = _clean_preview_data(preview_df)
            preview_headers = [col for col in preview_df.columns if col not in ['SKU / Código de producto', 'Nombre del producto']]

            tasks.append({
                "id": "task_eficiencia_margen",
                "type": "warning",
                "title": f"Tu eficiencia de margen es del {eficiencia_de_margen:.1f}%.",
                "impact": f"Has dejado de ganar un estimado de S/ {ganancia_perdida:,.2f} en el último período.",
                "solution_button_text": "💸 Auditar Desviaciones de Margen",
                "target_report": target_report_key,
                "knowledge": AUDIT_KNOWLEDGE_BASE.get("eficiencia_margen_baja"),
                "context_params": { "periodo_analisis_dias": 30 },
                "preview_data": preview_data,
                "preview_headers": preview_headers,
                "skus_afectados": skus_afectados
            })


    # Alerta 11 (Advertencia): "Inconsistencias de Datos Críticas"
    print("Ejecutando Alerta 11: Inconsistencias de Datos Críticas...")

    # Nos aseguramos de que las columnas necesarias existan
    required_cols_alert11 = ['Clasificación BCG', 'Precio Compra (S/.)', 'Categoría', 'Marca', 'Problema Detectado']
    if all(col in df_maestro.columns for col in required_cols_alert11):
        
        # Filtramos para obtener solo los productos importantes (Clase A y B)
        df_importantes = df_maestro[df_maestro['Clasificación BCG'].isin(['🐄 Vaca Lechera', '🌟 Estrella'])].copy()
        
        # Definimos las condiciones de los problemas de datos
        condicion_precio_cero = df_importantes['Precio Compra (S/.)'].fillna(0) == 0
        condicion_categoria_faltante = pd.isna(df_importantes['Categoría']) | (df_importantes['Categoría'].str.strip() == '')
        condicion_marca_faltante = pd.isna(df_importantes['Marca']) | (df_importantes['Marca'].str.strip() == '')

        # Combinamos las condiciones con un OR lógico
        alerta11_df = df_importantes[condicion_precio_cero | condicion_categoria_faltante | condicion_marca_faltante].copy()

        if not alerta11_df.empty:
            skus_afectados_11 = alerta11_df['SKU / Código de producto'].tolist()
            target_report_key_11 = "ReporteAuditoriaCalidadDatos"

            preview_cols_11 = REPORTS_CONFIG.get(target_report_key_11, {}).get('detalle_columns', [])
            preview_df_11 = alerta11_df[preview_cols_11].head(3)
            preview_data_11 = _clean_preview_data(preview_df_11)
            preview_headers = [col for col in preview_df_11.columns if col not in ['SKU / Código de producto', 'Nombre del producto']]

            tasks.append({
                "id": "task_datos_criticos",
                "type": "warning",
                "title": f"Tienes {len(alerta11_df)} productos importantes con datos críticos faltantes.",
                "impact": "La falta de estos datos afecta la precisión de todos tus análisis.",
                "solution_button_text": "Corregir Datos del Catálogo",
                "target_report": target_report_key_11,
                "knowledge": AUDIT_KNOWLEDGE_BASE.get("inconsistencias_datos_criticos"),
                "preview_data": preview_data_11,
                "preview_headers": preview_headers,
                "skus_afectados": skus_afectados_11
            })
    else:
        print("Advertencia: Faltan columnas para ejecutar la Alerta 7. Se omitirá.")

    # ... (Aquí iría la lógica para las otras 5 alertas que diseñamos)
    # --- FASE 3: Cálculo de KPIs y Puntaje ---
    print("Fase 3: Calculando resumen ejecutivo...")

    # KPI #1: Capital en Riesgo (S/.)
    df_stock_muerto = df_maestro[df_maestro['Clasificación Diagnóstica'] == 'Stock Muerto']
    df_exceso_stock = df_maestro[df_maestro['Alerta de Stock'] == 'Sobre-stock']
    capital_inmovilizado = df_stock_muerto['Inversión Stock Actual (S/.)'].sum()
    capital_excedente = ( (df_exceso_stock['Stock Actual (Unds)'] - df_exceso_stock['Stock Ideal Sugerido (Unds)']) * df_exceso_stock['Precio Compra (S/.)'] ).sum()
    capital_en_riesgo = capital_inmovilizado + capital_excedente

    # KPI #2: Venta Perdida Potencial (S/.)
    df_quiebre_clase_a = df_maestro[(df_maestro['Clasificación BCG'].str.startswith('🌟 Estrella')) & (df_maestro['Alerta de Stock'] == 'Agotado')]
    venta_perdida_potencial = (df_quiebre_clase_a['PDA_Demanda_Estrategica'] * df_quiebre_clase_a['Precio de Venta Promedio Reciente'] * 30).sum()

    # KPI #3: Eficiencia de Margen (%)
    df_con_ventas_recientes = df_maestro[df_maestro['Ventas Recientes (30d) (Unds)'] > 0].copy()
    if not df_con_ventas_recientes.empty:
        # Calculamos el margen teórico para cada transacción reciente
        df_con_ventas_recientes['margen_teorico_total'] = (
            (df_con_ventas_recientes['Precio Venta de Lista (S/.)'] - df_con_ventas_recientes['Precio de compra actual (S/.)']) * df_con_ventas_recientes['Ventas Recientes (30d) (Unds)']
            # (df_con_ventas_recientes['Precio Venta (S/.)'] - df_con_ventas_recientes['Precio Compra (S/.)']) * df_con_ventas_recientes['Ventas Recientes (30d) (Unds)']
        )
        # Calculamos el margen real para cada transacción reciente
        df_con_ventas_recientes['margen_real_total'] = (
            df_con_ventas_recientes['Margen Real (S/.)'] * df_con_ventas_recientes['Ventas Recientes (30d) (Unds)']
        )
        suma_margen_teorico = df_con_ventas_recientes['margen_teorico_total'].sum()
        suma_margen_real = df_con_ventas_recientes['margen_real_total'].sum()
        eficiencia_de_margen = (suma_margen_real / suma_margen_teorico * 100) if suma_margen_teorico > 0 else 100.0
    else:
        eficiencia_de_margen = 100.0

    # KPI #4: Rotación Anual Estimada
    costo_total_vendido_anual = (df_maestro['PDA_Demanda_Estrategica'] * df_maestro['Precio Compra (S/.)'] * 365).sum()
    valor_total_inventario = df_maestro['Inversión Stock Actual (S/.)'].sum()
    rotacion_anual = (costo_total_vendido_anual / valor_total_inventario) if valor_total_inventario > 0 else 0


    puntaje_salud = 65 # Placeholder

    kpis_dolor = {
        "Capital en Riesgo (S/.)": f"S/ {capital_en_riesgo:,.2f}",
        "Venta Perdida Potencial (S/.)": f"S/ {venta_perdida_potencial:,.2f}",
        "Eficiencia de Margen (%)": f"{eficiencia_de_margen:.1f}%",
        "Rotación Anual Estimada": f"{rotacion_anual:.1f} veces"
    }

    insight_text = f"Tu inventario tiene un puntaje de eficiencia de {puntaje_salud}/100. Se ha identificado un capital en riesgo de S/ {capital_en_riesgo:,.2f} y una venta perdida potencial de S/ {venta_perdida_potencial:,.2f} para este mes."

    # --- FASE 4: Ensamblaje Final ---
    print("Fase 4: Ensamblando respuesta final.")
    return {
        "puntaje_salud": puntaje_salud,
        "kpis_dolor": kpis_dolor,
        "plan_de_accion": tasks,
        "insight": insight_text # Aseguramos que el insight se actualice
    }



# ===================================================
# ============== FINAL: FULL REPORTES ===============
# ===================================================
# ===================================================
# ===================================================
# ===================================================

def summarise_expenses(df):
    if df.empty:
        print("No valid expense data found.")
        return

    months = (
        df.groupby(['MonthStart', 'Month'])['Amount']
        .sum()
        .sort_index(ascending=False)
        .round(2)
    )

    weeks = (
        df.groupby(['WeekStart', 'Week'])['Amount']
        .sum()
        .sort_index(ascending=False)
        .round(2)
    )

    # Drop datetime index and keep only display strings for output
    monthly_dict = dict(months.droplevel(0))
    weekly_dict = dict(weeks.droplevel(0))

    return {
        "weekly": weekly_dict,
        "monthly": monthly_dict,
        "records": df.to_dict(orient="records")
    }



def clean_data(df):
    if df.empty:
        print("No records to export.")
        return

    # Select only relevant columns
    export_df = df[['Date', 'Category', 'Amount', 'Month', 'Week']].copy()
    export_df = standardise_categories(export_df)

    # Sort by Date
    export_df.sort_values(by='Date', ascending=False, inplace=True)

    return export_df
    


