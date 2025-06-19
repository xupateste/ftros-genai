import re
# from datetime import datetime
import pandas as pd
import numpy as np
# from typing import Optional,  # Necesario para Optional
from typing import Optional, Dict, Any, Tuple, List # Any para pd.ExcelWriter
from datetime import datetime # Para pd.Timestamp.now()
from dateutil.relativedelta import relativedelta

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
    pesos_combinado: Optional[Dict[str, float]] = None
) -> pd.DataFrame:
    """
    Procesa los DataFrames de ventas e inventario para realizar un análisis ABC.

    Args:
        df_ventas: DataFrame con datos de ventas.
                   Columnas esperadas: 'SKU / Código de producto', 'Nombre del producto',
                                     'Fecha de venta', 'Cantidad vendida', 
                                     'Precio de venta unitario (S/.)'.
        df_inventario: DataFrame con datos de inventario.
                       Columnas esperadas: 'SKU / Código de producto', 'Precio de compra actual (S/.)',
                                         'Categoría', 'Subcategoría'.
        criterio_abc: Criterio para el análisis ('ingresos', 'unidades', 'margen', 'combinado').
        periodo_abc: Número de meses hacia atrás para el análisis (0 para todo el historial).
        pesos_combinado: Diccionario con pesos si criterio_abc es 'combinado'.
                         Ej: {"ingresos": 0.5, "margen": 0.3, "unidades": 0.2}

    Returns:
        DataFrame con el análisis ABC.
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
    required_inventory_cols = ['SKU / Código de producto', 'Precio de compra actual (S/.)', 'Categoría', 'Subcategoría']
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
        'Subcategoría': 'first' # Tomar la primera subcategoría
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
        if not pesos_combinado or not all(k in pesos_combinado for k in ['ingresos', 'margen', 'unidades']):
            raise ValueError("Pesos para criterio combinado no provistos o incompletos.")
        
        # Normalización Min-Max para cada métrica
        for col_norm in ['Venta total', 'Cantidad vendida', 'Margen total']:
            min_val = ventas_agrupadas[col_norm].min()
            max_val = ventas_agrupadas[col_norm].max()
            if (max_val - min_val) == 0: # Evitar división por cero si todos los valores son iguales
                ventas_agrupadas[f'{col_norm}_norm'] = 0.5 if max_val != 0 else 0 # O 0 o 1, dependiendo del caso
            else:
                ventas_agrupadas[f'{col_norm}_norm'] = (ventas_agrupadas[col_norm] - min_val) / (max_val - min_val)
        
        ventas_agrupadas['valor_criterio'] = (
            pesos_combinado['ingresos'] * ventas_agrupadas['Venta total_norm'] +
            pesos_combinado['margen'] * ventas_agrupadas['Margen total_norm'] +
            pesos_combinado['unidades'] * ventas_agrupadas['Cantidad vendida_norm']
        )
        columna_criterio_display_name = 'Valor Ponderado (ABC)'
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


    return resultado

def process_csv_rotacion_general(
    df_ventas: pd.DataFrame,
    df_stock: pd.DataFrame,
    # Parámetros de periodos para análisis de ventas - AHORA OPCIONALES
    dias_analisis_ventas_recientes: Optional[int] = None,
    dias_analisis_ventas_general: Optional[int] = None,
    # Parámetros para cálculo de Stock Ideal
    dias_cobertura_ideal_base: int = 10, # Ejemplo de default
    coef_importancia_para_cobertura_ideal: float = 0.25,
    coef_rotacion_para_stock_ideal: float = 0.2,
    # Parámetros para Pedido Mínimo
    dias_cubrir_con_pedido_minimo: int = 3, # Ejemplo de default
    coef_importancia_para_pedido_minimo: float = 0.5,
    # Otros parámetros de comportamiento
    importancia_minima_para_redondeo_a_1: float = 0.1,
    incluir_productos_pasivos: bool = True, # Ejemplo de default
    cantidad_reposicion_para_pasivos: int = 1,
    excluir_productos_sin_sugerencia_ideal: bool = True # Ejemplo de default
) -> pd.DataFrame:

    sku_col = 'SKU / Código de producto'
    fecha_col_ventas = 'Fecha de venta'
    cantidad_col_ventas = 'Cantidad vendida'
    precio_venta_col_ventas = 'Precio de venta unitario (S/.)'
    # precio_compra_col_ventas (de df_ventas) ya no se usará.

    marca_col_stock = 'Marca'
    stock_actual_col_stock = 'Cantidad en stock actual'
    nombre_prod_col_stock = 'Nombre del producto'
    categoria_col_stock = 'Categoría'
    subcategoria_col_stock = 'Subcategoría'
    precio_compra_actual_col_stock = 'Precio de compra actual (S/.)' # Este es el único precio de compra a usar

    df_ventas_proc = df_ventas.copy()
    df_stock_proc = df_stock.copy()

    df_ventas_proc[sku_col] = df_ventas_proc[sku_col].astype(str).str.strip()
    df_stock_proc[sku_col] = df_stock_proc[sku_col].astype(str).str.strip()

    df_stock_proc[stock_actual_col_stock] = pd.to_numeric(df_stock_proc[stock_actual_col_stock], errors='coerce').fillna(0)
    df_stock_proc[precio_compra_actual_col_stock] = pd.to_numeric(df_stock_proc[precio_compra_actual_col_stock], errors='coerce').fillna(0)
    
    df_ventas_proc[cantidad_col_ventas] = pd.to_numeric(df_ventas_proc[cantidad_col_ventas], errors='coerce').fillna(0)
    df_ventas_proc[precio_venta_col_ventas] = pd.to_numeric(df_ventas_proc[precio_venta_col_ventas], errors='coerce').fillna(0)
    # Eliminada la línea que procesaba precio_compra_col_ventas de df_ventas_proc
    
    df_ventas_proc[fecha_col_ventas] = pd.to_datetime(df_ventas_proc[fecha_col_ventas], format='%d/%m/%Y', errors='coerce')
    df_ventas_proc.dropna(subset=[fecha_col_ventas], inplace=True)

    if df_ventas_proc.empty:
        print("Advertencia: No hay datos de ventas válidos después de la limpieza inicial.")
        return pd.DataFrame() 

    fecha_max_venta = df_ventas_proc[fecha_col_ventas].max()
    if pd.isna(fecha_max_venta):
        print("Advertencia: No se pudo determinar la fecha máxima de venta.")
        return pd.DataFrame()

    final_dias_recientes = dias_analisis_ventas_recientes
    final_dias_general = dias_analisis_ventas_general

    if dias_analisis_ventas_recientes is None or dias_analisis_ventas_general is None:
        print("\nInformación: Calculando periodos de análisis sugeridos...")
        sug_rec, sug_gen = _sugerir_periodos_analisis(df_ventas_proc, fecha_col_ventas)
        
        if final_dias_recientes is None:
            final_dias_recientes = sug_rec
            print(f"  - Periodo de análisis reciente sugerido y utilizado: {final_dias_recientes} días.")
        else: 
            print(f"  - Periodo de análisis reciente proporcionado: {final_dias_recientes} días.")
            
        if final_dias_general is None:
            final_dias_general = sug_gen
            print(f"  - Periodo de análisis general sugerido y utilizado: {final_dias_general} días.")
        else: 
            print(f"  - Periodo de análisis general proporcionado: {final_dias_general} días.")
        
        final_dias_recientes = max(1, final_dias_recientes)
        final_dias_general = max(1, max(final_dias_general, final_dias_recientes))

        if dias_analisis_ventas_recientes is not None and final_dias_general < final_dias_recientes : 
             print(f"  - Ajuste (post-sugerencia): Periodo general ({final_dias_general}) no puede ser menor que reciente ({final_dias_recientes}). Igualando general a reciente.")
             final_dias_general = final_dias_recientes
        elif dias_analisis_ventas_general is not None and final_dias_recientes > final_dias_general: 
             print(f"  - Ajuste (post-sugerencia): Periodo reciente ({final_dias_recientes}) no puede ser mayor que general ({final_dias_general}). Igualando reciente a general.")
             final_dias_recientes = final_dias_general
        print(f"  - Periodos finales: Reciente={final_dias_recientes}, General={final_dias_general}")
    else: 
        final_dias_recientes = max(1, final_dias_recientes) 
        final_dias_general = max(1, final_dias_general)   
        if final_dias_general < final_dias_recientes:
            print(f"Advertencia: El periodo general ({final_dias_general}) es menor que el reciente ({final_dias_recientes}). Ajustando general ({final_dias_recientes}) para igualar a reciente.")
            final_dias_general = final_dias_recientes
        print(f"\nInformación: Utilizando periodos de análisis proporcionados: Reciente={final_dias_recientes} días, General={final_dias_general} días.")
    print("-" * 30) 

    # --- 2. Cálculo de Métricas de Ventas Agregadas (Modificada) ---
    def agregar_ventas_periodo(df_v, periodo_dias, fecha_max, sku_c, fecha_c, cant_c, p_venta_c, sufijo):
        # Ya no recibe p_compra_c
        if pd.isna(fecha_max) or periodo_dias <= 0:
            return pd.DataFrame(columns=[sku_c, f'Ventas_Total{sufijo}', f'Dias_Con_Venta{sufijo}',
                                         f'Precio_Venta_Prom{sufijo}']) 
        
        fecha_inicio = fecha_max - pd.Timedelta(days=periodo_dias)
        df_periodo = df_v[df_v[fecha_c] >= fecha_inicio].copy()

        if df_periodo.empty:
             return pd.DataFrame(columns=[sku_c, f'Ventas_Total{sufijo}', f'Dias_Con_Venta{sufijo}',
                                          f'Precio_Venta_Prom{sufijo}'])

        agg_ventas = df_periodo.groupby(sku_c).agg(
            Ventas_Total=(cant_c, 'sum'),
            Dias_Con_Venta=(fecha_c, 'nunique'),
            Precio_Venta_Prom=(p_venta_c, 'mean') 
        ).reset_index()
        
        agg_ventas.columns = [sku_c] + [f'{col}{sufijo}' for col in agg_ventas.columns[1:]]
        return agg_ventas

    # Llamada a agregar_ventas_periodo modificada (sin el argumento de precio de compra de ventas)
    df_ventas_rec_agg = agregar_ventas_periodo(df_ventas_proc, final_dias_recientes, fecha_max_venta, 
                                               sku_col, fecha_col_ventas, cantidad_col_ventas, 
                                               precio_venta_col_ventas, '_Reciente')
    
    df_ventas_gen_agg = agregar_ventas_periodo(df_ventas_proc, final_dias_general, fecha_max_venta,
                                               sku_col, fecha_col_ventas, cantidad_col_ventas,
                                               precio_venta_col_ventas, '_General')

    # --- 3. Merge de Datos y Preparación para Importancia Dinámica ---
    # Se fusiona df_stock_proc primero para tener acceso a precio_compra_actual_col_stock
    df_analisis = pd.merge(df_stock_proc, df_ventas_rec_agg, on=sku_col, how='left')
    if not df_ventas_gen_agg.empty:
        df_analisis = pd.merge(df_analisis, df_ventas_gen_agg, on=sku_col, how='left')

    # Columnas a rellenar provenientes de las agregaciones de ventas
    # (ya no incluye columnas de precio de compra histórico)
    cols_a_rellenar_de_ventas_agg = [
        'Ventas_Total_Reciente', 'Dias_Con_Venta_Reciente', 'Precio_Venta_Prom_Reciente',
        'Ventas_Total_General', 'Dias_Con_Venta_General', 'Precio_Venta_Prom_General'
    ]
    for col_fill in cols_a_rellenar_de_ventas_agg:
        if col_fill not in df_analisis.columns: 
            df_analisis[col_fill] = 0.0
        else:
            df_analisis[col_fill] = df_analisis[col_fill].fillna(0)
            
    # Asegurar que las columnas base para cálculos posteriores existan y sean numéricas
    df_analisis[precio_compra_actual_col_stock] = pd.to_numeric(df_analisis[precio_compra_actual_col_stock], errors='coerce').fillna(0)
    df_analisis['Precio_Venta_Prom_Reciente'] = pd.to_numeric(df_analisis.get('Precio_Venta_Prom_Reciente', 0), errors='coerce').fillna(0)
    df_analisis['Ventas_Total_Reciente'] = pd.to_numeric(df_analisis.get('Ventas_Total_Reciente', 0), errors='coerce').fillna(0)
    df_analisis['Dias_Con_Venta_Reciente'] = pd.to_numeric(df_analisis.get('Dias_Con_Venta_Reciente', 0), errors='coerce').fillna(0)

    # --- 4. Cálculo de Importancia Dinámica (directamente en df_analisis) ---
    df_analisis['Margen_Bruto_con_PCA'] = df_analisis['Precio_Venta_Prom_Reciente'] - df_analisis[precio_compra_actual_col_stock]
    df_analisis['Ingreso_Total_Reciente'] = df_analisis['Ventas_Total_Reciente'] * df_analisis['Precio_Venta_Prom_Reciente']
    
    df_analisis['Margen_Bruto_con_PCA'].fillna(0, inplace=True)
    df_analisis['Ingreso_Total_Reciente'].fillna(0, inplace=True)

    cols_for_rank = ['Ventas_Total_Reciente', 'Ingreso_Total_Reciente', 'Margen_Bruto_con_PCA', 'Dias_Con_Venta_Reciente']
    for col_rank in cols_for_rank: 
        if col_rank not in df_analisis.columns: df_analisis[col_rank] = 0.0
        df_analisis[col_rank] = pd.to_numeric(df_analisis[col_rank], errors='coerce').fillna(0)

    if not df_analisis.empty:
        # Verificar que las columnas para rank existen antes de intentar acceder a ellas
        rank_cols_exist = all(col in df_analisis.columns for col in cols_for_rank)
        if rank_cols_exist:
            df_analisis['Importancia_Dinamica'] = (
                df_analisis['Ventas_Total_Reciente'].rank(pct=True) * 0.4 +
                df_analisis['Ingreso_Total_Reciente'].rank(pct=True) * 0.3 +
                df_analisis['Margen_Bruto_con_PCA'].rank(pct=True) * 0.2 +
                df_analisis['Dias_Con_Venta_Reciente'].rank(pct=True) * 0.1
            ).fillna(0).round(3)
        else:
            print("Advertencia: Faltan una o más columnas para calcular Importancia Dinámica. Se asignará 0.")
            df_analisis['Importancia_Dinamica'] = 0.0
    else:
        df_analisis['Importancia_Dinamica'] = 0.0
    
    df_analisis['Importancia_Dinamica'] = df_analisis.get('Importancia_Dinamica', 0.0).fillna(0)


    # --- 5. Cálculo de PDA_final ---
    df_analisis['PDA_Efectivo_Reciente'] = np.where(df_analisis['Dias_Con_Venta_Reciente'] > 0, df_analisis['Ventas_Total_Reciente'] / df_analisis['Dias_Con_Venta_Reciente'], 0)
    # Usar .get() para seguridad si las columnas generales no se formaron
    dias_con_venta_general_col = df_analisis.get('Dias_Con_Venta_General', pd.Series(0, index=df_analisis.index))
    ventas_total_general_col = df_analisis.get('Ventas_Total_General', pd.Series(0, index=df_analisis.index))
    df_analisis['PDA_Efectivo_General'] = np.where(dias_con_venta_general_col > 0, ventas_total_general_col / dias_con_venta_general_col, 0)
    
    df_analisis['PDA_Calendario_Reciente'] = df_analisis['Ventas_Total_Reciente'] / final_dias_recientes if final_dias_recientes > 0 else 0
    df_analisis['PDA_Calendario_General'] = ventas_total_general_col / final_dias_general if final_dias_general > 0 else 0

    df_analisis['PDA_Final'] = df_analisis['PDA_Efectivo_Reciente']
    df_analisis.loc[df_analisis['PDA_Final'] <= 1e-6, 'PDA_Final'] = df_analisis['PDA_Efectivo_General'] 
    df_analisis.loc[df_analisis['PDA_Final'] <= 1e-6, 'PDA_Final'] = df_analisis['PDA_Calendario_Reciente']
    df_analisis.loc[df_analisis['PDA_Final'] <= 1e-6, 'PDA_Final'] = df_analisis['PDA_Calendario_General']
    df_analisis['PDA_Final'] = df_analisis['PDA_Final'].fillna(0).round(2)

    # --- 6. Cálculo de Factores Adicionales ---
    factores_por_categoria_default = {'DEFAULT': 1.0} 
    factores_por_categoria_ej = { 
        'Herramientas manuales': 1.1, 'Herramientas eléctricas': 1.05,
        'Material eléctrico': 1.3, 'Tornillería': 1.5,
        'Adhesivos y selladores': 1.2 
    }
    factores_por_categoria_final = {**factores_por_categoria_default, **factores_por_categoria_ej}
    if categoria_col_stock in df_analisis.columns:
      df_analisis['Factor_Reposicion_Categoria'] = df_analisis[categoria_col_stock].map(factores_por_categoria_final).fillna(factores_por_categoria_final['DEFAULT'])
    else:
      print(f"Advertencia: Columna de categoría '{categoria_col_stock}' no encontrada. Usando factor de reposición por defecto para todos los productos.")
      df_analisis['Factor_Reposicion_Categoria'] = factores_por_categoria_final['DEFAULT']

    df_analisis['Factor_Rotacion_Crudo'] = df_analisis['Ventas_Total_Reciente'] / (df_analisis[stock_actual_col_stock] + 1e-6) 
    df_analisis['Factor_Rotacion_Ajustado'] = 1 + (df_analisis['Factor_Rotacion_Crudo'].rank(pct=True).fillna(0) * coef_rotacion_para_stock_ideal)
    df_analisis['Factor_Ajuste_Cobertura_Por_Importancia'] = 1 + (df_analisis['Importancia_Dinamica'] * coef_importancia_para_cobertura_ideal)

    # --- 7. Cálculo de Niveles y Cantidades de Reposición ---
    df_analisis['Dias_Cobertura_Ideal_Ajustados'] = (dias_cobertura_ideal_base * df_analisis['Factor_Ajuste_Cobertura_Por_Importancia']).round(1)
    df_analisis['Stock_Ideal_Unds'] = (
        df_analisis['PDA_Final'] *
        df_analisis['Dias_Cobertura_Ideal_Ajustados'] *
        df_analisis['Factor_Reposicion_Categoria'] *
        df_analisis['Factor_Rotacion_Ajustado']
    ).round().clip(lower=0)
    df_analisis['Sugerencia_Pedido_Ideal_Unds'] = (df_analisis['Stock_Ideal_Unds'] - df_analisis[stock_actual_col_stock]).clip(lower=0).round()
    cantidad_base_pedido_minimo = df_analisis['PDA_Final'] * dias_cubrir_con_pedido_minimo
    factor_ajuste_importancia_pedido_minimo = 1 + (df_analisis['Importancia_Dinamica'] * coef_importancia_para_pedido_minimo)
    df_analisis['Sugerencia_Pedido_Minimo_Unds'] = (cantidad_base_pedido_minimo * factor_ajuste_importancia_pedido_minimo).round().clip(lower=0)

    # --- 8. Ajustes Finales de Cantidades ---
    cond_importancia_alta = df_analisis['Importancia_Dinamica'] >= importancia_minima_para_redondeo_a_1
    df_analisis.loc[cond_importancia_alta & (df_analisis['Sugerencia_Pedido_Ideal_Unds'] > 0) & (df_analisis['Sugerencia_Pedido_Ideal_Unds'] < 1), 'Sugerencia_Pedido_Ideal_Unds'] = 1
    df_analisis.loc[cond_importancia_alta & (df_analisis['Sugerencia_Pedido_Minimo_Unds'] > 0) & (df_analisis['Sugerencia_Pedido_Minimo_Unds'] < 1), 'Sugerencia_Pedido_Minimo_Unds'] = 1
    
    # --- 9. Manejo de Productos Pasivos ---
    cond_pasivo = (
        (df_analisis['PDA_Final'] <= 1e-6) & 
        (df_analisis[stock_actual_col_stock] == 0) &
        (df_analisis['Ventas_Total_Reciente'] > 0) 
    )
    if incluir_productos_pasivos:
        df_analisis.loc[cond_pasivo, 'Sugerencia_Pedido_Ideal_Unds'] = np.maximum(
            df_analisis.loc[cond_pasivo, 'Sugerencia_Pedido_Ideal_Unds'].fillna(0), 
            cantidad_reposicion_para_pasivos
        )
        df_analisis.loc[cond_pasivo, 'Stock_Ideal_Unds'] = np.maximum(
            df_analisis.loc[cond_pasivo, 'Stock_Ideal_Unds'].fillna(0),
            cantidad_reposicion_para_pasivos
        )
        df_analisis.loc[cond_pasivo, 'Sugerencia_Pedido_Minimo_Unds'] = np.maximum(
            df_analisis.loc[cond_pasivo, 'Sugerencia_Pedido_Minimo_Unds'].fillna(0),
            cantidad_reposicion_para_pasivos 
        )

    # --- 10. Cálculo de Días de Cobertura Actual ---
    df_analisis['Dias_Cobertura_Stock_Actual'] = np.where(
        df_analisis['PDA_Final'] > 1e-6,
        df_analisis[stock_actual_col_stock] / df_analisis['PDA_Final'],
        np.inf 
    )
    df_analisis.loc[df_analisis[stock_actual_col_stock] == 0, 'Dias_Cobertura_Stock_Actual'] = 0
    df_analisis['Dias_Cobertura_Stock_Actual'] = df_analisis['Dias_Cobertura_Stock_Actual'].round(1)

    # --- 11. Filtros y Selección de Columnas Finales ---
    df_resultado = df_analisis.copy()

    if excluir_productos_sin_sugerencia_ideal:
        # Asegurarse de que la columna existe antes de filtrar
        if 'Sugerencia_Pedido_Ideal_Unds' in df_resultado.columns:
             df_resultado = df_resultado[df_resultado['Sugerencia_Pedido_Ideal_Unds'] > 0]
        else:
            print("Advertencia: La columna 'Sugerencia_Pedido_Ideal_Unds' no existe para el filtro de exclusión.")


    # Asegurar que Importancia_Dinamica exista para ordenar
    if 'Importancia_Dinamica' in df_resultado.columns:
        df_resultado = df_resultado.sort_values(by='Importancia_Dinamica', ascending=False)
    else:
        print("Advertencia: La columna 'Importancia_Dinamica' no existe para ordenar los resultados.")


    columnas_salida_deseadas = [
        sku_col, nombre_prod_col_stock, categoria_col_stock, subcategoria_col_stock,
        marca_col_stock, precio_compra_actual_col_stock, stock_actual_col_stock,
        'Dias_Cobertura_Stock_Actual',
        # 'Stock_Ideal_Unds', 'Sugerencia_Pedido_Minimo_Unds', 'Sugerencia_Pedido_Ideal_Unds', 
        'Importancia_Dinamica', 'Ventas_Total_General', 'Ventas_Total_Reciente'
        # 'PDA_Final', 'Ventas_Total_Reciente', 'Dias_Con_Venta_Reciente'
    ]
    
    columnas_finales_presentes = []
    df_resultado_final_dict = {} # Crear un nuevo DataFrame para evitar problemas con columnas faltantes

    for col_s in columnas_salida_deseadas:
        if col_s in df_resultado.columns:
            df_resultado_final_dict[col_s] = df_resultado[col_s]
            columnas_finales_presentes.append(col_s) # Mantener un registro de las columnas que sí se pudieron añadir
        else:
             print(f"Advertencia: Columna de salida '{col_s}' no encontrada en el resultado. Será omitida o rellenada con NaN si es esencial.")
             # Opcional: añadir la columna con NaNs si es crucial mantener la estructura
             # df_resultado_final_dict[col_s] = pd.Series(index=df_resultado.index, name=col_s)


    if not df_resultado.empty:
        df_resultado_final = pd.DataFrame(df_resultado_final_dict)
        df_resultado_final = df_resultado_final[columnas_finales_presentes] # Asegurar el orden
    else: # Si df_resultado está vacío (ej. por filtros), crear un df vacío con las columnas esperadas
        print("Información: El DataFrame de resultado está vacío antes de la selección final de columnas.")
        df_resultado_final = pd.DataFrame(columns=columnas_finales_presentes)


    # Solo intentar renombrar si el DataFrame no está vacío y las columnas existen
    if not df_resultado_final.empty:
        column_rename_map = {
            stock_actual_col_stock: 'Stock Actual (Unds)',
            precio_compra_actual_col_stock: 'Precio Compra Actual (S/.)',
            'PDA_Final': 'Promedio Venta Diaria (Unds)',
            'Dias_Cobertura_Stock_Actual': 'Cobertura Actual (Días)',
            'Stock_Ideal_Unds': 'Stock Ideal Sugerido (Unds)',
            'Sugerencia_Pedido_Ideal_Unds': 'Pedido Ideal Sugerido (Unds)',
            'Sugerencia_Pedido_Minimo_Unds': 'Pedido Mínimo Sugerido (Unds)',
            'Importancia_Dinamica': 'Índice de Importancia',
            'Ventas_Total_Reciente': f'Ventas Recientes ({final_dias_recientes}d) (Unds)',
            'Dias_Con_Venta_Reciente': f'Días con Venta ({final_dias_recientes}d)',
            'Ventas_Total_General' : f'Ventas Periodo General ({final_dias_general}d) (Unds)'
        }
        # Renombrar solo las columnas que existen en df_resultado_final
        actual_rename_map = {k: v for k, v in column_rename_map.items() if k in df_resultado_final.columns}
        df_resultado_final = df_resultado_final.rename(columns=actual_rename_map)
    elif not columnas_finales_presentes: # Si df_resultado estaba vacío y no se pudieron determinar columnas
        # En este caso, df_resultado_final ya es un DataFrame vacío,
        # podrías querer que tenga los nombres renombrados si es una expectativa
        # Esto es más complejo si el df está totalmente vacío sin las columnas originales
        # Por ahora, se devuelve vacío si no hay datos.
        pass


    return df_resultado_final

def process_csv_reponer_stock(
    df_ventas: pd.DataFrame,
    df_stock: pd.DataFrame,
    dias_analisis_ventas_recientes: Optional[int] = None,
    dias_analisis_ventas_general: Optional[int] = None,
    peso_ventas_historicas: float = 0.3,
    dias_cobertura_ideal_base: int = 10,
    coef_importancia_para_cobertura_ideal: float = 0.25,
    coef_rotacion_para_stock_ideal: float = 0.2,
    dias_cubrir_con_pedido_minimo: int = 3,
    coef_importancia_para_pedido_minimo: float = 0.5,
    coef_rotacion_para_stock_minimo: float = 0.1,
    importancia_minima_para_redondeo_a_1: float = 0.1,
    incluir_productos_pasivos: bool = True,
    cantidad_reposicion_para_pasivos: int = 1,
    excluir_productos_sin_sugerencia_ideal: bool = True,
    # --- NUEVOS PARÁMETROS PARA EL PUNTO DE ALERTA ---
    lead_time_dias: float = 7.0,
    dias_seguridad_base: float = 3.0,
    factor_importancia_seguridad: float = 5.0
) -> pd.DataFrame:
    # ... (código de inicialización sin cambios) ...
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
    df_stock_proc = df_stock.copy()
    df_ventas_proc[sku_col] = df_ventas_proc[sku_col].astype(str).str.strip()
    df_stock_proc[sku_col] = df_stock_proc[sku_col].astype(str).str.strip()
    df_stock_proc[stock_actual_col_stock] = pd.to_numeric(df_stock_proc[stock_actual_col_stock], errors='coerce').fillna(0)
    df_stock_proc[precio_compra_actual_col_stock] = pd.to_numeric(df_stock_proc[precio_compra_actual_col_stock], errors='coerce').fillna(0)
    df_ventas_proc[cantidad_col_ventas] = pd.to_numeric(df_ventas_proc[cantidad_col_ventas], errors='coerce').fillna(0)
    df_ventas_proc[precio_venta_col_ventas] = pd.to_numeric(df_ventas_proc[precio_venta_col_ventas], errors='coerce').fillna(0)
    df_ventas_proc[fecha_col_ventas] = pd.to_datetime(df_ventas_proc[fecha_col_ventas], format='%d/%m/%Y', errors='coerce')
    df_ventas_proc.dropna(subset=[fecha_col_ventas], inplace=True)
    if df_ventas_proc.empty: return pd.DataFrame()
    fecha_max_venta = df_ventas_proc[fecha_col_ventas].max()
    if pd.isna(fecha_max_venta): return pd.DataFrame()
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
    df_analisis = pd.merge(df_stock_proc, df_ventas_rec_agg, on=sku_col, how='left')
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

    ventas_diarias_recientes = df_analisis['Ventas_Total_Reciente'] / final_dias_recientes
    ventas_diarias_generales = df_analisis['Ventas_Total_General'] / final_dias_general
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
    
    # --- CÁLCULO DEL PUNTO DE ALERTA DE STOCK (NUEVA LÓGICA) ---
    # 1. Calcular el Stock de Seguridad en unidades.
    # Se calcula dinámicamente: días base + días extra según la importancia del producto.
    dias_seguridad_adicionales = df_analisis['Importancia_Dinamica'] * factor_importancia_seguridad
    dias_seguridad_totales = dias_seguridad_base + dias_seguridad_adicionales
    df_analisis['Stock_de_Seguridad_Unds'] = (df_analisis['PDA_Final'] * dias_seguridad_totales).round()

    # 2. Calcular la Demanda Durante el Tiempo de Entrega (Lead Time) en unidades.
    df_analisis['Demanda_Lead_Time_Unds'] = (df_analisis['PDA_Final'] * lead_time_dias).round()

    # 3. Calcular el Punto de Alerta final.
    # Es el nivel de stock que activa la necesidad de reponer.
    # Punto de Alerta = Demanda durante Lead Time + Stock de Seguridad
    df_analisis['Punto_de_Alerta_Unds'] = df_analisis['Demanda_Lead_Time_Unds'] + df_analisis['Stock_de_Seguridad_Unds']
    
    # 4. Añadir columna de acción para saber si pedir ahora.
    # Si el stock actual es menor o igual al punto de alerta, se debe pedir.
    df_analisis['Accion_Requerida'] = np.where(
        df_analisis[stock_actual_col_stock] <= df_analisis['Punto_de_Alerta_Unds'], 'Sí', 'No'
    )
    # -----------------------------------------------------------------

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
    df_analisis['Sugerencia_Pedido_Ideal_Unds'] = (df_analisis['Stock_Ideal_Unds'] - df_analisis[stock_actual_col_stock]).clip(lower=0).round()
    cantidad_base_pedido_minimo = df_analisis['PDA_Final'] * dias_cubrir_con_pedido_minimo
    factor_ajuste_importancia_pedido_minimo = 1 + (df_analisis['Importancia_Dinamica'] * coef_importancia_para_pedido_minimo)
    df_analisis['Sugerencia_Pedido_Minimo_Unds'] = (cantidad_base_pedido_minimo * factor_ajuste_importancia_pedido_minimo * df_analisis['Factor_Rotacion_Ajustado_Minimo']).round().clip(lower=0)
    cond_importancia_alta = df_analisis['Importancia_Dinamica'] >= importancia_minima_para_redondeo_a_1
    df_analisis.loc[cond_importancia_alta & (df_analisis['Sugerencia_Pedido_Ideal_Unds'] > 0) & (df_analisis['Sugerencia_Pedido_Ideal_Unds'] < 1), 'Sugerencia_Pedido_Ideal_Unds'] = 1
    df_analisis.loc[cond_importancia_alta & (df_analisis['Sugerencia_Pedido_Minimo_Unds'] > 0) & (df_analisis['Sugerencia_Pedido_Minimo_Unds'] < 1), 'Sugerencia_Pedido_Minimo_Unds'] = 1
    cond_pasivo = ((df_analisis['PDA_Final'] <= 1e-6) & (df_analisis[stock_actual_col_stock] == 0) & (df_analisis['Ventas_Total_Reciente'] > 0))
    if incluir_productos_pasivos:
        df_analisis.loc[cond_pasivo, 'Sugerencia_Pedido_Ideal_Unds'] = np.maximum(df_analisis.loc[cond_pasivo, 'Sugerencia_Pedido_Ideal_Unds'].fillna(0), cantidad_reposicion_para_pasivos)
        df_analisis.loc[cond_pasivo, 'Stock_Ideal_Unds'] = np.maximum(df_analisis.loc[cond_pasivo, 'Stock_Ideal_Unds'].fillna(0), cantidad_reposicion_para_pasivos)
        df_analisis.loc[cond_pasivo, 'Sugerencia_Pedido_Minimo_Unds'] = np.maximum(df_analisis.loc[cond_pasivo, 'Sugerencia_Pedido_Minimo_Unds'].fillna(0), cantidad_reposicion_para_pasivos)
        df_analisis.loc[cond_pasivo, 'Stock_Minimo_Unds'] = np.maximum(df_analisis.loc[cond_pasivo, 'Stock_Minimo_Unds'].fillna(0), cantidad_reposicion_para_pasivos)
    df_analisis['Dias_Cobertura_Stock_Actual'] = np.where(df_analisis['PDA_Final'] > 1e-6, df_analisis[stock_actual_col_stock] / df_analisis['PDA_Final'], np.inf)
    df_analisis.loc[df_analisis[stock_actual_col_stock] == 0, 'Dias_Cobertura_Stock_Actual'] = 0
    df_analisis['Dias_Cobertura_Stock_Actual'] = df_analisis['Dias_Cobertura_Stock_Actual'].round(1)
    df_resultado = df_analisis.copy()
    if excluir_productos_sin_sugerencia_ideal:
        if 'Sugerencia_Pedido_Ideal_Unds' in df_resultado.columns: df_resultado = df_resultado[df_resultado['Sugerencia_Pedido_Ideal_Unds'] > 0]
    if 'Importancia_Dinamica' in df_resultado.columns: df_resultado = df_resultado.sort_values(by='Importancia_Dinamica', ascending=False)
    
    # --- COLUMNAS DE SALIDA ACTUALIZADAS ---
    columnas_salida_deseadas = [
        sku_col, nombre_prod_col_stock, categoria_col_stock, subcategoria_col_stock, marca_col_stock, 
        precio_compra_actual_col_stock, stock_actual_col_stock, 'Dias_Cobertura_Stock_Actual', 
        'Punto_de_Alerta_Unds', 'Accion_Requerida', # <-- Nuevas columnas añadidas aquí para visibilidad
        'Stock_Minimo_Unds', 'Stock_Ideal_Unds', 
        'Sugerencia_Pedido_Minimo_Unds', 'Sugerencia_Pedido_Ideal_Unds', 
        'Importancia_Dinamica', 'Ventas_Total_General', 'Ventas_Total_Reciente', 'PDA_Final'
    ]
    
    columnas_finales_presentes = []
    df_resultado_final_dict = {}
    for col_s in columnas_salida_deseadas:
        if col_s in df_resultado.columns:
            df_resultado_final_dict[col_s] = df_resultado[col_s]
            columnas_finales_presentes.append(col_s)
    if not df_resultado.empty:
        df_resultado_final = pd.DataFrame(df_resultado_final_dict)
        df_resultado_final = df_resultado_final[columnas_finales_presentes]
    else: df_resultado_final = pd.DataFrame(columns=columnas_finales_presentes)
    
    if not df_resultado_final.empty:
        # --- MAPA DE RENOMBRE DE COLUMNAS ACTUALIZADO ---
        column_rename_map = {
            stock_actual_col_stock: 'Stock Actual (Unds)',
            precio_compra_actual_col_stock: 'Precio Compra Actual (S/.)',
            'PDA_Final': 'Promedio Venta Diaria (Unds)',
            'Dias_Cobertura_Stock_Actual': 'Cobertura Actual (Días)',
            'Punto_de_Alerta_Unds': 'Punto de Alerta (Unds)', # <-- Nuevo nombre de columna
            'Accion_Requerida': '¿Pedir Ahora?', # <-- Nuevo nombre de columna
            'Stock_Minimo_Unds': 'Stock Mínimo Sugerido (Unds)',
            'Stock_Ideal_Unds': 'Stock Ideal Sugerido (Unds)',
            'Sugerencia_Pedido_Ideal_Unds': 'Pedido Ideal Sugerido (Unds)',
            'Sugerencia_Pedido_Minimo_Unds': 'Pedido Mínimo Sugerido (Unds)',
            'Importancia_Dinamica': 'Índice de Importancia',
            'Ventas_Total_Reciente': f'Ventas Recientes ({final_dias_recientes}d) (Unds)',
            'Dias_Con_Venta_Reciente': f'Días con Venta ({final_dias_recientes}d)',
            'Ventas_Total_General' : f'Ventas Periodo General ({final_dias_general}d) (Unds)'
        }
        actual_rename_map = {k: v for k, v in column_rename_map.items() if k in df_resultado_final.columns}
        df_resultado_final = df_resultado_final.rename(columns=actual_rename_map)

    return df_resultado_final

def process_csv_puntos_alerta_stock(
    df_ventas: pd.DataFrame,
    df_stock: pd.DataFrame,
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
    lead_time_dias: float = 7.0,
    dias_seguridad_base: float = 0,
    factor_importancia_seguridad: float = 1.0
) -> pd.DataFrame:
    # ... (código de inicialización sin cambios hasta la sección de cálculo de PDA_Final) ...
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
    df_stock_proc = df_stock.copy()
    df_ventas_proc[sku_col] = df_ventas_proc[sku_col].astype(str).str.strip()
    df_stock_proc[sku_col] = df_stock_proc[sku_col].astype(str).str.strip()
    df_stock_proc[stock_actual_col_stock] = pd.to_numeric(df_stock_proc[stock_actual_col_stock], errors='coerce').fillna(0)
    df_stock_proc[precio_compra_actual_col_stock] = pd.to_numeric(df_stock_proc[precio_compra_actual_col_stock], errors='coerce').fillna(0)
    df_ventas_proc[cantidad_col_ventas] = pd.to_numeric(df_ventas_proc[cantidad_col_ventas], errors='coerce').fillna(0)
    df_ventas_proc[precio_venta_col_ventas] = pd.to_numeric(df_ventas_proc[precio_venta_col_ventas], errors='coerce').fillna(0)
    df_ventas_proc[fecha_col_ventas] = pd.to_datetime(df_ventas_proc[fecha_col_ventas], format='%d/%m/%Y', errors='coerce')
    df_ventas_proc.dropna(subset=[fecha_col_ventas], inplace=True)
    if df_ventas_proc.empty: return pd.DataFrame()
    fecha_max_venta = df_ventas_proc[fecha_col_ventas].max()
    if pd.isna(fecha_max_venta): return pd.DataFrame()
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
    df_analisis = pd.merge(df_stock_proc, df_ventas_rec_agg, on=sku_col, how='left')
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
    
    # --- CÁLCULO DE PUNTOS DE ALERTA (LÓGICA ACTUALIZADA) ---
    
    # 1. Calcular el Stock de Seguridad en unidades.
    dias_seguridad_adicionales = df_analisis['Importancia_Dinamica'] * factor_importancia_seguridad
    dias_seguridad_totales = dias_seguridad_base + dias_seguridad_adicionales
    df_analisis['Stock_de_Seguridad_Unds'] = (df_analisis['PDA_Final'] * dias_seguridad_totales).round()

    # 2. Calcular la Demanda Durante el Tiempo de Entrega (Lead Time)
    df_analisis['Demanda_Lead_Time_Unds'] = (df_analisis['PDA_Final'] * lead_time_dias).round()

    # 3. Calcular el Punto de Alerta IDEAL (antes llamado Punto de Alerta)
    df_analisis['Punto_de_Alerta_Ideal_Unds'] = df_analisis['Demanda_Lead_Time_Unds'] + df_analisis['Stock_de_Seguridad_Unds']
    
    # 4. Calcular el Punto de Alerta MÍNIMO (NUEVA LÓGICA)
    # Condición: Si hay ventas recientes (>1) O si el promedio de venta es positivo.
    condicion_min = (df_analisis['Ventas_Total_Reciente'] > 1) | (df_analisis['PDA_Final'] > 0)
    # Valor si es verdad: Se suma el stock de seguridad y las ventas recientes, redondeando hacia arriba.
    valor_si_verdadero = np.ceil(df_analisis['Stock_de_Seguridad_Unds'] + df_analisis['PDA_Final'])
    # Valor si es falso: Solo se usa el stock de seguridad.
    valor_si_falso = df_analisis['Stock_de_Seguridad_Unds']
    # Aplicar la condición
    alerta_minimo_calculado = np.where(condicion_min, valor_si_verdadero, valor_si_falso)
    # Aplicar el tope máximo: el valor no puede ser mayor que el Stock Mínimo Sugerido.
    df_analisis['Punto_de_Alerta_Minimo_Unds'] = np.minimum(alerta_minimo_calculado, df_analisis['Stock_Minimo_Unds'])

    # 5. Añadir columna de acción para saber si pedir ahora (basado en el Punto de Alerta Ideal)
    df_analisis['Accion_Requerida'] = np.where(
        df_analisis[stock_actual_col_stock] < df_analisis['Punto_de_Alerta_Minimo_Unds'], 'Sí', 'No'
    )
    # -----------------------------------------------------------------
    
    # ... (resto del código sin cambios hasta las columnas de salida) ...
    df_analisis['Sugerencia_Pedido_Ideal_Unds'] = (df_analisis['Stock_Ideal_Unds'] - df_analisis[stock_actual_col_stock]).clip(lower=0).round()
    cantidad_base_pedido_minimo = df_analisis['PDA_Final'] * dias_cubrir_con_pedido_minimo
    factor_ajuste_importancia_pedido_minimo = 1 + (df_analisis['Importancia_Dinamica'] * coef_importancia_para_pedido_minimo)
    df_analisis['Sugerencia_Pedido_Minimo_Unds'] = (cantidad_base_pedido_minimo * factor_ajuste_importancia_pedido_minimo * df_analisis['Factor_Rotacion_Ajustado_Minimo']).round().clip(lower=0)
    cond_importancia_alta = df_analisis['Importancia_Dinamica'] >= importancia_minima_para_redondeo_a_1
    df_analisis.loc[cond_importancia_alta & (df_analisis['Sugerencia_Pedido_Ideal_Unds'] > 0) & (df_analisis['Sugerencia_Pedido_Ideal_Unds'] < 1), 'Sugerencia_Pedido_Ideal_Unds'] = 1
    df_analisis.loc[cond_importancia_alta & (df_analisis['Sugerencia_Pedido_Minimo_Unds'] > 0) & (df_analisis['Sugerencia_Pedido_Minimo_Unds'] < 1), 'Sugerencia_Pedido_Minimo_Unds'] = 1
    cond_pasivo = ((df_analisis['PDA_Final'] <= 1e-6) & (df_analisis[stock_actual_col_stock] == 0) & (df_analisis['Ventas_Total_Reciente'] > 0))
    if incluir_productos_pasivos:
        df_analisis.loc[cond_pasivo, 'Sugerencia_Pedido_Ideal_Unds'] = np.maximum(df_analisis.loc[cond_pasivo, 'Sugerencia_Pedido_Ideal_Unds'].fillna(0), cantidad_reposicion_para_pasivos)
        df_analisis.loc[cond_pasivo, 'Stock_Ideal_Unds'] = np.maximum(df_analisis.loc[cond_pasivo, 'Stock_Ideal_Unds'].fillna(0), cantidad_reposicion_para_pasivos)
        df_analisis.loc[cond_pasivo, 'Sugerencia_Pedido_Minimo_Unds'] = np.maximum(df_analisis.loc[cond_pasivo, 'Sugerencia_Pedido_Minimo_Unds'].fillna(0), cantidad_reposicion_para_pasivos)
        df_analisis.loc[cond_pasivo, 'Stock_Minimo_Unds'] = np.maximum(df_analisis.loc[cond_pasivo, 'Stock_Minimo_Unds'].fillna(0), cantidad_reposicion_para_pasivos)
    df_analisis['Dias_Cobertura_Stock_Actual'] = np.where(df_analisis['PDA_Final'] > 1e-6, df_analisis[stock_actual_col_stock] / df_analisis['PDA_Final'], np.inf)
    df_analisis.loc[df_analisis[stock_actual_col_stock] == 0, 'Dias_Cobertura_Stock_Actual'] = 0
    df_analisis['Dias_Cobertura_Stock_Actual'] = df_analisis['Dias_Cobertura_Stock_Actual'].round(1)
    df_resultado = df_analisis.copy()
    if excluir_productos_sin_sugerencia_ideal:
        if 'Sugerencia_Pedido_Ideal_Unds' in df_resultado.columns: df_resultado = df_resultado[df_resultado['Sugerencia_Pedido_Ideal_Unds'] > 0]
    if 'Importancia_Dinamica' in df_resultado.columns: df_resultado = df_resultado.sort_values(by='Importancia_Dinamica', ascending=False)
    
    # --- COLUMNAS DE SALIDA ACTUALIZADAS ---
    columnas_salida_deseadas = [
        sku_col, nombre_prod_col_stock, categoria_col_stock, subcategoria_col_stock, marca_col_stock, 
        precio_compra_actual_col_stock, stock_actual_col_stock,
        # 'Dias_Cobertura_Stock_Actual', 
        'Punto_de_Alerta_Minimo_Unds', 'Punto_de_Alerta_Ideal_Unds',
        # 'Accion_Requerida',
        # 'Stock_de_Seguridad_Unds',
        # 'Stock_Minimo_Unds', 'Stock_Ideal_Unds', 
        # 'Sugerencia_Pedido_Minimo_Unds', 'Sugerencia_Pedido_Ideal_Unds', 
        'Importancia_Dinamica',
        'Ventas_Total_General', 'Ventas_Total_Reciente'
        # 'PDA_Final'
    ]
    
    columnas_finales_presentes = []
    df_resultado_final_dict = {}
    for col_s in columnas_salida_deseadas:
        if col_s in df_resultado.columns:
            df_resultado_final_dict[col_s] = df_resultado[col_s]
            columnas_finales_presentes.append(col_s)
    if not df_resultado.empty:
        df_resultado_final = pd.DataFrame(df_resultado_final_dict)
        df_resultado_final = df_resultado_final[columnas_finales_presentes]
    else: df_resultado_final = pd.DataFrame(columns=columnas_finales_presentes)
    
    if not df_resultado_final.empty:
        # --- MAPA DE RENOMBRE DE COLUMNAS ACTUALIZADO ---
        column_rename_map = {
            stock_actual_col_stock: 'Stock Actual (Unds)',
            precio_compra_actual_col_stock: 'Precio Compra Actual (S/.)',
            'PDA_Final': 'Promedio Venta Diaria (Unds)',
            'Dias_Cobertura_Stock_Actual': 'Cobertura Actual (Días)',
            'Punto_de_Alerta_Ideal_Unds': 'Punto de Alerta Ideal (Unds)',   # <-- RENOMBRADO
            'Punto_de_Alerta_Minimo_Unds': 'Punto de Alerta Mínimo (Unds)', # <-- NUEVO
            'Accion_Requerida': '¿Pedir Ahora?',
            'Stock_de_Seguridad_Unds': 'Stock de Seguridad (Unds)',
            'Stock_Minimo_Unds': 'Stock Mínimo Sugerido (Unds)',
            'Stock_Ideal_Unds': 'Stock Ideal Sugerido (Unds)',
            'Sugerencia_Pedido_Ideal_Unds': 'Pedido Ideal Sugerido (Unds)',
            'Sugerencia_Pedido_Minimo_Unds': 'Pedido Mínimo Sugerido (Unds)',
            'Importancia_Dinamica': 'Índice de Importancia',
            'Ventas_Total_Reciente': f'Ventas Recientes ({final_dias_recientes}d) (Unds)',
            'Dias_Con_Venta_Reciente': f'Días con Venta ({final_dias_recientes}d)',
            'Ventas_Total_General' : f'Ventas Periodo General ({final_dias_general}d) (Unds)'
        }
        # También se renombrará la columna de Stock de Seguridad para mayor claridad
        actual_rename_map = {k: v for k, v in column_rename_map.items() if k in df_resultado_final.columns}
        df_resultado_final = df_resultado_final.rename(columns=actual_rename_map)

    return df_resultado_final





def process_csv_lista_basica_reposicion_historico(
    df_ventas: pd.DataFrame,
    df_stock: pd.DataFrame,
    dias_analisis_ventas_recientes: Optional[int] = None,
    dias_analisis_ventas_general: Optional[int] = None,
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
    excluir_sin_ventas: bool = True,
    incluir_solo_categorias: Optional[List[str]] = None,
    incluir_solo_marcas: Optional[List[str]] = None,
    ordenar_por: str = 'Importancia'
) -> pd.DataFrame:
    
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
    df_stock_proc = df_stock.copy()
    df_ventas_proc[sku_col] = df_ventas_proc[sku_col].astype(str).str.strip()
    df_stock_proc[sku_col] = df_stock_proc[sku_col].astype(str).str.strip()
    df_stock_proc[stock_actual_col_stock] = pd.to_numeric(df_stock_proc[stock_actual_col_stock], errors='coerce').fillna(0)
    df_stock_proc[precio_compra_actual_col_stock] = pd.to_numeric(df_stock_proc[precio_compra_actual_col_stock], errors='coerce').fillna(0)
    df_ventas_proc[cantidad_col_ventas] = pd.to_numeric(df_ventas_proc[cantidad_col_ventas], errors='coerce').fillna(0)
    df_ventas_proc[precio_venta_col_ventas] = pd.to_numeric(df_ventas_proc[precio_venta_col_ventas], errors='coerce').fillna(0)
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

    df_analisis = pd.merge(df_stock_proc, df_ventas_rec_agg, on=sku_col, how='left')
    if not df_ventas_gen_agg.empty: df_analisis = pd.merge(df_analisis, df_ventas_gen_agg, on=sku_col, how='left')

    cols_a_rellenar = ['Ventas_Total_Reciente', 'Dias_Con_Venta_Reciente', 'Precio_Venta_Prom_Reciente', 'Ventas_Total_General', 'Dias_Con_Venta_General', 'Precio_Venta_Prom_General']
    for col in cols_a_rellenar:
        if col not in df_analisis.columns: df_analisis[col] = 0.0
        else: df_analisis[col] = df_analisis[col].fillna(0)
    
    if excluir_sin_ventas:
        df_analisis = df_analisis[df_analisis['Ventas_Total_General'] > 0].copy()
    if incluir_solo_categorias and categoria_col_stock in df_analisis.columns:
        # Normalizamos la lista de categorías a minúsculas y sin espacios
        categorias_normalizadas = [cat.strip().lower() for cat in incluir_solo_categorias]
        
        # Comparamos contra la columna del DataFrame también normalizada
        # El .str.lower() y .str.strip() se aplican a cada valor de la columna antes de la comparación
        df_analisis = df_analisis[
            df_analisis[categoria_col_stock].str.strip().str.lower().isin(categorias_normalizadas)
        ].copy()
    if incluir_solo_marcas and marca_col_stock in df_analisis.columns:
        # Normalizamos la lista de marcas
        marcas_normalizadas = [marca.strip().lower() for marca in incluir_solo_marcas]
        
        # Comparamos contra la columna de marcas normalizada
        df_analisis = df_analisis[
            df_analisis[marca_col_stock].str.strip().str.lower().isin(marcas_normalizadas)
        ].copy()

    if df_analisis.empty: return pd.DataFrame()
    
    df_analisis['Margen_Bruto_con_PCA'] = df_analisis['Precio_Venta_Prom_Reciente'] - df_analisis[precio_compra_actual_col_stock]
    df_analisis['Ingreso_Total_Reciente'] = df_analisis['Ventas_Total_Reciente'] * df_analisis['Precio_Venta_Prom_Reciente']
    
    ventas_diarias_recientes = df_analisis['Ventas_Total_Reciente'] / final_dias_recientes
    ventas_diarias_generales = df_analisis['Ventas_Total_General'] / final_dias_general
    df_analisis['Ventas_Ponderadas_para_Importancia'] = (ventas_diarias_recientes * (1 - peso_ventas_historicas) + ventas_diarias_generales * peso_ventas_historicas)
    
    cols_for_rank = ['Ventas_Ponderadas_para_Importancia', 'Ingreso_Total_Reciente', 'Margen_Bruto_con_PCA', 'Dias_Con_Venta_Reciente']
    for col_rank in cols_for_rank:
        df_analisis[col_rank] = pd.to_numeric(df_analisis[col_rank], errors='coerce').fillna(0)

    df_analisis['Importancia_Dinamica'] = (df_analisis['Ventas_Ponderadas_para_Importancia'].rank(pct=True) * 0.4 + 
                                           df_analisis['Ingreso_Total_Reciente'].rank(pct=True) * 0.3 + 
                                           df_analisis['Margen_Bruto_con_PCA'].rank(pct=True) * 0.2 + 
                                           df_analisis['Dias_Con_Venta_Reciente'].rank(pct=True) * 0.1).fillna(0).round(3)

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

    df_resultado = df_analisis.copy()

    if excluir_productos_sin_sugerencia_ideal:
        df_resultado = df_resultado[df_resultado['Sugerencia_Pedido_Ideal_Unds'] > 0]
        if df_resultado.empty: return pd.DataFrame()

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
        # --- SECCIÓN CRÍTICA #2 CORREGIDA ---
        condicion_urgencia = df_resultado[stock_actual_col_stock] < df_resultado['Punto_de_Alerta_Minimo_Unds']
        punto_alerta_minimo_safe = df_resultado['Punto_de_Alerta_Minimo_Unds'].replace(0, 1e-6)
        urgency_score_series = (1 - (df_resultado[stock_actual_col_stock] / punto_alerta_minimo_safe)) * df_resultado['Importancia_Dinamica']
        # 'np.where' devuelve un array de numpy
        temp_array = np.where(condicion_urgencia, urgency_score_series, 0)
        # Convertir explícitamente a Serie de Pandas, rellenar NaNs y asignar
        df_resultado['temp_sort_col'] = pd.Series(temp_array, index=df_resultado.index).fillna(0)
        df_resultado = df_resultado.sort_values(by='temp_sort_col', ascending=False)
    elif ordenar_por == 'rotacion':
        df_resultado = df_resultado.sort_values(by='Factor_Rotacion_Crudo', ascending=False)
    else: # Por defecto, 'Importancia'
        df_resultado = df_resultado.sort_values(by='Importancia_Dinamica', ascending=False)
        
    columnas_salida_deseadas = [
        sku_col, nombre_prod_col_stock, categoria_col_stock, subcategoria_col_stock, marca_col_stock, 
        precio_compra_actual_col_stock, stock_actual_col_stock,
        'Dias_Cobertura_Stock_Actual',
        'Punto_de_Alerta_Minimo_Unds', 'Punto_de_Alerta_Ideal_Unds',
        'Accion_Requerida', 'Stock_de_Seguridad_Unds',
        'Stock_Minimo_Unds', 'Stock_Ideal_Unds', 
        'Sugerencia_Pedido_Minimo_Unds', 'Sugerencia_Pedido_Ideal_Unds', 
        'Importancia_Dinamica', 'PDA_Final',
        'Ventas_Total_General', 'Ventas_Total_Reciente'
    ]
    
    columnas_finales_presentes = [col for col in columnas_salida_deseadas if col in df_resultado.columns]
    df_resultado_final = df_resultado[columnas_finales_presentes].copy()
    
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
            'Ventas_Total_General' : f'Ventas Periodo General ({final_dias_general}d) (Unds)'
        }
        df_resultado_final.rename(columns=column_rename_map, inplace=True)

    return df_resultado_final




def procesar_stock_muerto(
    df_ventas: pd.DataFrame,
    df_inventario: pd.DataFrame,
    meses_analisis: Optional[int] = None,
    dias_sin_venta_baja: Optional[int] = None,
    dias_sin_venta_muerto: Optional[int] = None,
    dps_umbral_exceso_stock: Optional[int] = None,
    umbral_valor_stock_alto: float = 3000.0
) -> pd.DataFrame:
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
        umbral_valor_stock_alto: Umbral en S/. para destacar inventario inmovilizado.

    Returns:
        DataFrame con el análisis completo.
    """

    # --- 0. Renombrar y Preprocesar Datos ---
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
        'Subcategoría': 'subcategoria'
    })

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
    df_resultado['valor_stock_s'] = df_resultado['stock_actual_unds'] * df_resultado['precio_compra_actual']
    df_resultado['dias_sin_venta'] = (hoy - df_resultado['ultima_venta']).dt.days

    # Calcular Días para Agotar Stock (DPS)
    dias_periodo_analisis = meses_analisis_calc * 30.44
    ventas_diarias_promedio = df_resultado[col_ventas_recientes_nombre] / dias_periodo_analisis if dias_periodo_analisis > 0 else 0
    
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
    
    # --- 6. Formatear DataFrame de Salida ---
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
        'sku', 'nombre_producto', 'categoria', 'subcategoria',
        'precio_compra_actual', 'stock_actual_unds', 'valor_stock_s',
        'ventas_totales_unds', col_ventas_recientes_final,
        'ultima_venta', 'dias_sin_venta',
        col_dps_nombre_final,
        'clasificacion', col_prioridad_nombre_final
    ]
    # Añadir columnas opcionales si existen en el dataframe de inventario
    for col_opcional in ['Marca', 'Rol de categoría', 'Rol del producto']:
        if col_opcional in df_resultado.columns and col_opcional not in columnas_finales:
            columnas_finales.insert(4, col_opcional)

    df_final = df_resultado[[col for col in columnas_finales if col in df_resultado.columns]].copy()
    
    # Renombrar columnas a formato final
    df_final.rename(columns={
        'sku': 'SKU / Código de producto',
        'nombre_producto': 'Nombre del producto',
        'categoria': 'Categoría',
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
    df_final = df_final.sort_values(by='Valor stock (S/.)', ascending=False, na_position='last')

    return df_final


def generar_reporte_stock_minimo_sugerido(
    df_ventas: pd.DataFrame,
    df_stock: pd.DataFrame,
    dias_cobertura_deseados: int,
    meses_analisis_historicos: int
) -> pd.DataFrame:
    """
    Genera un reporte de stock mínimo sugerido para cada producto.

    Args:
        df_ventas (pd.DataFrame): DataFrame con datos de ventas.
            Columnas esperadas: 'Nombre del producto', 'SKU / Código de producto', 
                               'N° de comprobante / boleta', 'Fecha de venta', 
                               'Cantidad vendida', 'Precio de venta unitario (S/.)'.
        df_stock (pd.DataFrame): DataFrame con datos de stock actual.
            Columnas esperadas: 'Nombre del producto', 'Rol de categoría', 
                               'Precio de compra actual (S/.)', 'Precio de venta actual (S/.)',
                               'Cantidad en stock actual', 'Rol del producto', 'Categoría',
                               'Subcategoría', 'Marca', 'SKU / Código de producto'.
        dias_cobertura_deseados (int): Número de días de ventas que el stock mínimo debe cubrir.
        meses_analisis_historicos (int): Número de meses hacia atrás para analizar el historial de ventas.

    Returns:
        pd.DataFrame: Reporte con SKU, Producto, Categoría, Stock actual, 
                      Stock mínimo sugerido, ¿Reponer?, Precio de compra (S/.), 
                      Margen (%), y VPD (Ventas Promedio Diarias).
    """

    # 1. Preprocesar df_ventas
    df_ventas_proc = df_ventas.copy()
    # Asegurar que 'Fecha de venta' es datetime
    df_ventas_proc['Fecha de venta'] = pd.to_datetime(df_ventas_proc['Fecha de venta'], errors='coerce')
    # Asegurar que 'Cantidad vendida' es numérica
    df_ventas_proc['Cantidad vendida'] = pd.to_numeric(df_ventas_proc['Cantidad vendida'], errors='coerce').fillna(0)
    
    # Eliminar filas donde la fecha no pudo ser parseada
    df_ventas_proc.dropna(subset=['Fecha de venta'], inplace=True)


    # 2. Filtrar ventas por el periodo de análisis
    # Usamos pd.Timestamp.now() para obtener la fecha y hora actual con zona horaria si está configurada,
    # o pd.to_datetime(datetime.now()) para fecha y hora naive.
    # Normalizar a medianoche para consistencia si se compara con fechas sin hora.
    fecha_actual = pd.Timestamp.now() 
    fecha_inicio_analisis = fecha_actual - pd.DateOffset(months=meses_analisis_historicos)
    
    ventas_periodo = df_ventas_proc[
        (df_ventas_proc['Fecha de venta'] >= fecha_inicio_analisis) &
        (df_ventas_proc['Fecha de venta'] <= fecha_actual)
    ].copy()

    # 3. Calcular ventas totales por SKU en el periodo
    if not ventas_periodo.empty:
        ventas_agrupadas = ventas_periodo.groupby('SKU / Código de producto')['Cantidad vendida'].sum().reset_index()
        ventas_agrupadas.rename(columns={'Cantidad vendida': 'Total Vendido Periodo'}, inplace=True)

        # Calcular el número de días en el periodo de análisis.
        # Se considera la duración real del intervalo.
        dias_en_periodo_analisis = (fecha_actual - fecha_inicio_analisis).days
        if dias_en_periodo_analisis <= 0: 
            dias_en_periodo_analisis = 1 # Evitar división por cero o negativa si el periodo es instantáneo o inválido.

        # Calcular Promedio Diario de Ventas (VPD)
        ventas_agrupadas['Promedio diario de ventas'] = ventas_agrupadas['Total Vendido Periodo'] / dias_en_periodo_analisis
    else:
        # Si no hay ventas en el periodo, crear un DataFrame vacío con las columnas esperadas
        ventas_agrupadas = pd.DataFrame(columns=['SKU / Código de producto', 'Total Vendido Periodo', 'Promedio diario de ventas'])

    # 4. Unir con df_stock
    df_reporte = pd.merge(df_stock, ventas_agrupadas, on='SKU / Código de producto', how='left')

    # Llenar NaN para productos sin ventas en el periodo
    df_reporte['Total Vendido Periodo'].fillna(0, inplace=True)
    df_reporte['Promedio diario de ventas'].fillna(0, inplace=True)
    df_reporte['Cantidad en stock actual'] = pd.to_numeric(df_reporte['Cantidad en stock actual'], errors='coerce').fillna(0)


    # 5. Calcular Stock Mínimo Sugerido
    df_reporte['Stock mínimo sugerido'] = np.ceil(df_reporte['Promedio diario de ventas'] * dias_cobertura_deseados)
    df_reporte['Stock mínimo sugerido'] = df_reporte['Stock mínimo sugerido'].astype(int)

    # 6. Determinar si se necesita reponer
    df_reporte['¿Reponer?'] = df_reporte['Cantidad en stock actual'] < df_reporte['Stock mínimo sugerido']

    # 7. Calcular Margen
    df_reporte['Precio de venta actual (S/.)'] = pd.to_numeric(df_reporte['Precio de venta actual (S/.)'], errors='coerce')
    df_reporte['Precio de compra actual (S/.)'] = pd.to_numeric(df_reporte['Precio de compra actual (S/.)'], errors='coerce')
    
    # Evitar división por cero o NaN si el precio de venta es 0, nulo o no numérico
    df_reporte['Margen (%)'] = np.where(
        (df_reporte['Precio de venta actual (S/.)'].notna()) & 
        (df_reporte['Precio de venta actual (S/.)'] != 0) & 
        (df_reporte['Precio de compra actual (S/.)'].notna()),
        ((df_reporte['Precio de venta actual (S/.)'] - df_reporte['Precio de compra actual (S/.)']) / df_reporte['Precio de venta actual (S/.)']) * 100,
        0  # Margen 0 si no se puede calcular
    )
    df_reporte['Margen (%)'] = df_reporte['Margen (%)'].round(2)

    # 8. Seleccionar y renombrar columnas para el reporte final
    columnas_finales_map = {
        'SKU / Código de producto': 'SKU',
        'Nombre del producto': 'Producto',
        'Categoría': 'Categoría',
        'Cantidad en stock actual': 'Stock actual',
        'Stock mínimo sugerido': 'Stock mínimo sugerido',
        '¿Reponer?': '¿Reponer?',
        'Precio de compra actual (S/.)': 'Precio de compra (S/.)',
        'Margen (%)': 'Margen (%)',
        'Promedio diario de ventas': f'VPD (últ. {meses_analisis_historicos}m)'
    }
    
    # Asegurarse que todas las columnas fuente existen antes de intentar acceder a ellas
    columnas_a_seleccionar = [col for col in columnas_finales_map.keys() if col in df_reporte.columns]
    df_resultado = df_reporte[columnas_a_seleccionar].rename(columns=columnas_finales_map)
    
    # Añadir columnas faltantes si no se generaron (ej. si df_stock no las tenía)
    for target_col in columnas_finales_map.values():
        if target_col not in df_resultado.columns:
            df_resultado[target_col] = np.nan # o 0 según el caso

    # Ordenar para mejor visualización (opcional)
    # Asegurarse que las columnas de ordenamiento existen
    sort_cols = []
    if '¿Reponer?' in df_resultado.columns:
        sort_cols.append('¿Reponer?')
    if 'SKU' in df_resultado.columns:
        sort_cols.append('SKU')
    
    if sort_cols:
        ascending_order = [False] * len(sort_cols) # ¿Reponer? False (True primero)
        if 'SKU' in sort_cols:
            idx_sku = sort_cols.index('SKU')
            ascending_order[idx_sku] = True # SKU True (A-Z)
        df_resultado = df_resultado.sort_values(by=sort_cols, ascending=ascending_order)


    return df_resultado


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
    


