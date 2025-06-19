import os
import uvicorn


from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi import HTTPException
import pandas as pd
import io
from io import StringIO
import openpyxl
from typing import Optional, Dict, Any # Any para pd.ExcelWriter
from datetime import datetime # Para pd.Timestamp.now()
from track_expenses import process_csv, summarise_expenses, clean_data, get_top_expenses_by_month
from track_expenses import process_csv_abc, procesar_stock_muerto, process_csv_rotacion_general
from track_expenses import process_csv_puntos_alerta_stock, generar_reporte_stock_minimo_sugerido, process_csv_reponer_stock
from track_expenses import process_csv_lista_basica_reposicion_historico

app = FastAPI()

# allow frontend to connect to backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://rentabilizate.ferreteros.app",
        "https://inteligencia.ferreteros.app",
        "https://ia.ferreteros.app"
        # "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Backend is running"}

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000)) # Default to 8000 if not set
    uvicorn.run(app, host="0.0.0.0", port=port)
    
# ===================================================
# ===================================================
# ===================================================
# ===================================================
# ============== INICIO: FULL REPORTES ==============
# ===================================================

@app.post("/extract-metadata", summary="Extrae metadatos (categorías, marcas) de un archivo de inventario", tags=["Utilidades"])
async def extract_metadata(
    inventario: UploadFile = File(..., description="Archivo CSV con datos de inventario.")
):
    """
    Lee un archivo de inventario y devuelve una lista de todas las categorías y marcas únicas.
    Este endpoint es robusto e intenta leer el CSV con diferentes codificaciones y separadores.
    """
    contents = await inventario.read()
    
    # --- LÓGICA DE LECTURA ROBUSTA ---
    try:
        # Intento 1: La configuración más común (UTF-8, separado por comas)
        df_inventario = pd.read_csv(io.BytesIO(contents), sep=',')
    except (UnicodeDecodeError, pd.errors.ParserError):
        try:
            # Intento 2: Codificación Latin-1 (muy común en Excel de Windows/Español)
            print("Intento 1 (UTF-8, coma) falló. Reintentando con latin-1 y coma.")
            df_inventario = pd.read_csv(io.BytesIO(contents), sep=',', encoding='latin1')
        except (UnicodeDecodeError, pd.errors.ParserError):
            try:
                # Intento 3: Codificación UTF-8 con punto y coma como separador
                print("Intento 2 (latin-1, coma) falló. Reintentando con UTF-8 y punto y coma.")
                df_inventario = pd.read_csv(io.BytesIO(contents), sep=';', encoding='utf-8')
            except Exception as e:
                # Si todos los intentos fallan, entonces sí lanzamos el error.
                print(f"Todos los intentos de lectura de CSV fallaron. Error final: {e}")
                raise HTTPException(
                    status_code=400, 
                    detail=f"No se pudo leer el archivo CSV. Verifique que esté delimitado por comas o punto y coma y tenga una codificación estándar (UTF-8 o Latin-1). Error: {e}"
                )

    # --- El resto de la lógica es la misma ---
    try:
        categoria_col = 'Categoría'
        marca_col = 'Marca'
        categorias_disponibles = []
        marcas_disponibles = []

        if categoria_col in df_inventario.columns:
            categorias_disponibles = sorted(df_inventario[categoria_col].dropna().unique().tolist())
        if marca_col in df_inventario.columns:
            marcas_disponibles = sorted(df_inventario[marca_col].dropna().unique().tolist())
        
        return JSONResponse(content={
            "categorias_disponibles": categorias_disponibles,
            "marcas_disponibles": marcas_disponibles
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"El archivo se leyó, pero hubo un error al procesar las columnas: {e}")



@app.post("/abc", summary="Realizar Análisis ABC", tags=["Análisis"])
async def upload_csvs_abc_analysis(
    ventas: UploadFile = File(..., description="Archivo CSV con datos de ventas."),
    inventario: UploadFile = File(..., description="Archivo CSV con datos de inventario."),
    criterio_abc: str = Form(..., description="Criterio para el análisis ABC: 'ingresos', 'unidades', 'margen', 'combinado'.", examples=["ingresos"]),
    periodo_abc: int = Form(..., description="Período de análisis en meses (0 para todo el historial, ej: 3, 6, 12).", examples=[6])
):
    """
    Sube archivos CSV de ventas e inventario, y realiza un análisis ABC
    según los criterios y período especificados.
    """

    peso_ingresos = 0.5
    peso_margen = 0.3
    peso_unidades = 0.2

    # --- Leer archivo de ventas ---
    ventas_contents = await ventas.read()
    try:
        df_ventas = pd.read_csv(io.BytesIO(ventas_contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error al leer el archivo CSV de ventas: {e}. Verifique el formato.")

    # --- Leer archivo de inventario ---
    inventario_contents = await inventario.read()
    try:
        df_inventario = pd.read_csv(io.BytesIO(inventario_contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error al leer el archivo CSV de inventario: {e}. Verifique el formato.")

    # --- Validar y preparar pesos para criterio combinado ---
    pesos_combinado_dict: Optional[Dict[str, float]] = None
    if criterio_abc.lower() == "combinado":
        # if peso_ingresos is None or peso_margen is None or peso_unidades is None:
        #     raise HTTPException(status_code=400, detail="Para criterio 'combinado', se requieren los pesos: peso_ingresos, peso_margen, peso_unidades.")
        
        # if not (0 <= peso_ingresos <= 1 and 0 <= peso_margen <= 1 and 0 <= peso_unidades <= 1):
        #      raise HTTPException(status_code=400, detail="Los pesos deben estar entre 0.0 y 1.0.")
        
        # total_pesos = peso_ingresos + peso_margen + peso_unidades
        # if not (0.99 < total_pesos < 1.01): # Permitir pequeña imprecisión de flotantes
        #     raise HTTPException(status_code=400, detail=f"La suma de los pesos ({total_pesos:.2f}) debe ser aproximadamente 1.0.")

        pesos_combinado_dict = {
            "ingresos": peso_ingresos,
            "margen": peso_margen,
            "unidades": peso_unidades
        }
    elif criterio_abc.lower() not in ["ingresos", "unidades", "margen"]:
        raise HTTPException(status_code=400, detail=f"Criterio ABC '{criterio_abc}' no es válido. Opciones: ingresos, unidades, margen, combinado.")


    # --- Procesamiento de los datos ---
    try:
        processed_df = process_csv_abc(
            df_ventas,
            df_inventario,
            criterio_abc.lower(), # Usar minúsculas para consistencia
            periodo_abc,
            pesos_combinado_dict
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=f"Error de validación: {str(ve)}")
    except Exception as e:
        # En un entorno de producción, se debería loggear este error de forma más robusta.
        print(f"Error interno durante el procesamiento: {e}") # Log para debugging
        raise HTTPException(status_code=500, detail=f"Error interno al procesar los datos. Por favor, contacte al administrador. Detalles: {str(e)}")

    # --- Manejo de DataFrame vacío ---
    if processed_df.empty:
        empty_excel = to_excel_with_autofit(pd.DataFrame(), sheet_name='Analisis_ABC')
        return StreamingResponse(
            empty_excel,
            media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            headers={
                "Content-Disposition": f"attachment; filename=analisis_abc_vacio_{datetime.now().strftime('%Y%m%d')}.xlsx",
                "X-Status-Message": "No se encontraron datos para los criterios o período seleccionados."
            }
        )

    # --- Exportar a Excel ---
    try:
        excel_output = to_excel_with_autofit(processed_df, sheet_name='Analisis_ABC')
    except Exception as e:
        print(f"Error al generar el archivo Excel: {e}") # Log para debugging
        raise HTTPException(status_code=500, detail=f"Error al generar el archivo Excel: {str(e)}")

    filename_period = "todo_historial" if periodo_abc == 0 else f"ultimos_{periodo_abc}_meses"
    final_filename = f"analisis_abc_{criterio_abc.lower()}_{filename_period}_{datetime.now().strftime('%Y%m%d')}.xlsx"

    return StreamingResponse(
        excel_output,
        media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        headers={"Content-Disposition": f"attachment; filename={final_filename}"}
    )

    # ####### Exportar a CSV
    # stream = StringIO()
    # processed_df.to_csv(stream, index=False)
    # stream.seek(0)
    # return StreamingResponse(stream, media_type="text/csv", headers={
    #     "Content-Disposition": "attachment; filename=analisis_abc.csv"
    # })

@app.post("/rotacion-general")
async def upload_csv_rotacion_general(
    ventas: UploadFile = File(...),
    inventario: UploadFile = File(...)
):
    # Leer archivo de ventas
    ventas_contents = await ventas.read()
    df_ventas = pd.read_csv(io.BytesIO(ventas_contents))

    # Leer archivo de inventario
    inventario_contents = await inventario.read()
    df_inventario = pd.read_csv(io.BytesIO(inventario_contents))

    # Procesamiento conjunto
    # processed_df = process_csv_reponer_stock(df_ventas, df_inventario)
    processed_df = process_csv_rotacion_general(
        df_ventas,
        df_inventario,
        # Parámetros de periodos para análisis de ventas
        dias_analisis_ventas_recientes=30, #(P/FRONTEND) Anteriormente dias_importancia
        dias_analisis_ventas_general=240,   #(P/FRONTEND) Anteriormente dias_promedio
        # Parámetros para cálculo de Stock Ideal
        dias_cobertura_ideal_base=10, #(P/FRONTEND) Días base para cobertura ideal
        coef_importancia_para_cobertura_ideal=0.25, # e.g., 0.25 (0 a 1), aumenta días de cobertura ideal por importancia
        coef_rotacion_para_stock_ideal=0.20,       # e.g., 0.2 (0 a 1), aumenta stock ideal por rotación
        # Parámetros para Pedido Mínimo
        dias_cubrir_con_pedido_minimo=3, #(P/FRONTEND) Días de venta que un pedido mínimo debería cubrir
        coef_importancia_para_pedido_minimo=0.5, # e.g., 0.5 (0 a 1), escala el pedido mínimo por importancia
        # Otros parámetros de comportamiento
        importancia_minima_para_redondeo_a_1=0.1, # e.g. 0.1, umbral de importancia para redondear pedidos pequeños a 1
        incluir_productos_pasivos=True,
        cantidad_reposicion_para_pasivos=1, # e.g., 1 o 2, cantidad a reponer para productos pasivos
        excluir_productos_sin_sugerencia_ideal=True # Filtro para el resultado final
    )


    # output = io.BytesIO()
    # processed_df.to_excel(output, index=False, engine='openpyxl')
    # output.seek(0)

    # return StreamingResponse(output, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=analisis_abc.xls"})
    return StreamingResponse(
        # output,
        to_excel_with_autofit(processed_df, sheet_name='Analisis_Rotacion_General'),
        media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        headers={
            "Content-Disposition": "attachment; filename=reposicion-stock.xlsx"
        }
    )


@app.post("/reposicion-stock")
async def upload_csvs(
    ventas: UploadFile = File(...),
    inventario: UploadFile = File(...)
):
    # Leer archivo de ventas
    ventas_contents = await ventas.read()
    df_ventas = pd.read_csv(io.BytesIO(ventas_contents))

    # Leer archivo de inventario
    inventario_contents = await inventario.read()
    df_inventario = pd.read_csv(io.BytesIO(inventario_contents))

    # Procesamiento conjunto
    # processed_df = process_csv_reponer_stock(df_ventas, df_inventario)
    processed_df = process_csv_reponer_stock(
        df_ventas,
        df_inventario,
        # Parámetros de periodos para análisis de ventas
        dias_analisis_ventas_recientes=30, #(P/FRONTEND) Anteriormente dias_importancia
        dias_analisis_ventas_general=240,   #(P/FRONTEND) Anteriormente dias_promedio
        # Parámetros para cálculo de Stock Ideal
        dias_cobertura_ideal_base=10, #(P/FRONTEND) Días base para cobertura ideal
        coef_importancia_para_cobertura_ideal=0.25, # e.g., 0.25 (0 a 1), aumenta días de cobertura ideal por importancia
        coef_rotacion_para_stock_ideal=0.20,       # e.g., 0.2 (0 a 1), aumenta stock ideal por rotación
        # Parámetros para Pedido Mínimo
        dias_cubrir_con_pedido_minimo=3, #(P/FRONTEND) Días de venta que un pedido mínimo debería cubrir
        coef_importancia_para_pedido_minimo=0.5, # e.g., 0.5 (0 a 1), escala el pedido mínimo por importancia
        # Otros parámetros de comportamiento
        importancia_minima_para_redondeo_a_1=0.1, # e.g. 0.1, umbral de importancia para redondear pedidos pequeños a 1
        incluir_productos_pasivos=True,
        cantidad_reposicion_para_pasivos=1, # e.g., 1 o 2, cantidad a reponer para productos pasivos
        excluir_productos_sin_sugerencia_ideal=True # Filtro para el resultado final
    )


    # output = io.BytesIO()
    # processed_df.to_excel(output, index=False, engine='openpyxl')
    # output.seek(0)

    # return StreamingResponse(output, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=analisis_abc.xls"})
    return StreamingResponse(
        # output,
        to_excel_with_autofit(processed_df, sheet_name='Hoja 1'),
        media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        headers={
            "Content-Disposition": "attachment; filename=reposicion-stock.xlsx"
        }
    )

@app.post("/diagnostico-stock-muerto")
async def diagnostico_stock_muerto(
    ventas: UploadFile = File(...),
    inventario: UploadFile = File(...),
    # meses_analisis: int = Form(...)
    # meses: int = Query(6, description="Cantidad de meses hacia atrás para analizar")
):
    # Leer archivo de ventas
    ventas_contents = await ventas.read()
    # Intentar detectar el separador para CSVs
    try:
        df_ventas = pd.read_csv(io.BytesIO(ventas_contents), sep=None, engine='python', encoding='utf-8')
    except Exception as e_utf8:
        try:
            # print(f"Fallo al leer CSV de ventas con UTF-8: {e_utf8}. Intentando con Latin-1...")
            ventas_contents.seek(0) # Resetear el puntero del stream
            df_ventas = pd.read_csv(io.BytesIO(ventas_contents), sep=None, engine='python', encoding='latin1')
        except Exception as e_latin1:
            # print(f"Fallo al leer CSV de ventas con Latin-1 también: {e_latin1}.")
            raise # Relanzar la última excepción si ambas fallan
            
    # Leer archivo de inventario
    inventario_contents = await inventario.read()
    try:
        df_inventario = pd.read_csv(io.BytesIO(inventario_contents), sep=None, engine='python', encoding='utf-8')
    except Exception as e_utf8_inv:
        try:
            # print(f"Fallo al leer CSV de inventario con UTF-8: {e_utf8_inv}. Intentando con Latin-1...")
            inventario_contents.seek(0) # Resetear el puntero del stream
            df_inventario = pd.read_csv(io.BytesIO(inventario_contents), sep=None, engine='python', encoding='latin1')
        except Exception as e_latin1_inv:
            # print(f"Fallo al leer CSV de inventario con Latin-1 también: {e_latin1_inv}.")
            raise

    inventario_contents = await inventario.read()

    # df_ventas = pd.read_csv(io.BytesIO(ventas_contents))
    # df_inventario = pd.read_csv(io.BytesIO(inventario_contents))

    # Procesar
    resultado = procesar_stock_muerto(
        df_ventas,
        df_inventario,
        # meses_analisis,
        # dias_sin_venta_baja = 90,
        # dias_sin_venta_muerto = 180,
        # umbral_valor_stock_alto = 3000
        )

    # Exportar a Excel
    # output = io.BytesIO()
    # resultado.to_excel(output, index=False, engine='openpyxl')
    # output.seek(0)

    return StreamingResponse(
        to_excel_with_autofit(resultado, sheet_name='Diagnostico_Stock_Muerto'),
        media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        headers={"Content-Disposition": "attachment; filename=diagnostico_baja_rotacion.xlsx"}
    )

@app.post("/reporte-puntos-alerta-stock", summary="Recomendación Puntos de Alerta de Stock", tags=["Análisis"])
async def reporte_puntos_alerta_stock(
    ventas: UploadFile = File(..., description="Archivo CSV con datos de ventas."),
    inventario: UploadFile = File(..., description="Archivo CSV con datos de inventario."),
    lead_time_dias: int = Form(...),
    dias_seguridad_base: int = Form(...)
):
    """
    Sube archivos CSV de ventas e inventario, y realiza un análisis ABC
    según los criterios y período especificados.
    """

    # --- Leer archivo de ventas ---
    ventas_contents = await ventas.read()
    try:
        df_ventas = pd.read_csv(io.BytesIO(ventas_contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error al leer el archivo CSV de ventas: {e}. Verifique el formato.")

    # --- Leer archivo de inventario ---
    inventario_contents = await inventario.read()
    try:
        df_inventario = pd.read_csv(io.BytesIO(inventario_contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error al leer el archivo CSV de inventario: {e}. Verifique el formato.")

    # --- Procesamiento de los datos ---
    try:
        processed_df = process_csv_puntos_alerta_stock(
            df_ventas,
            df_inventario,
            # Parámetros de periodos para análisis de ventas
            # dias_analisis_ventas_recientes=30, #(P/FRONTEND) Anteriormente dias_importancia
            # dias_analisis_ventas_general=240,   #(P/FRONTEND) Anteriormente dias_promedio
            peso_ventas_historicas=0.6, # 0.0 = 100% reciente; 1.0 = 100% histórico
            # Parámetros para cálculo de Stock Ideal
            dias_cobertura_ideal_base=10, #(P/FRONTEND) Días base para cobertura ideal
            coef_importancia_para_cobertura_ideal=0.05, # e.g., 0.25 (0 a 1), aumenta días de cobertura ideal por importancia
            coef_rotacion_para_stock_ideal=0.10,       # e.g., 0.2 (0 a 1), aumenta stock ideal por rotación
            coef_rotacion_para_stock_minimo=0.15,
            # Parámetros para Pedido Mínimo
            dias_cubrir_con_pedido_minimo=5, #(P/FRONTEND) Días de venta que un pedido mínimo debería cubrir
            coef_importancia_para_pedido_minimo=0.1, # e.g., 0.5 (0 a 1), escala el pedido mínimo por importancia
            # Otros parámetros de comportamiento
            importancia_minima_para_redondeo_a_1=0.1, # e.g. 0.1, umbral de importancia para redondear pedidos pequeños a 1
            incluir_productos_pasivos=True,
            cantidad_reposicion_para_pasivos=1, # e.g., 1 o 2, cantidad a reponer para productos pasivos
            excluir_productos_sin_sugerencia_ideal=False, # Filtro para el resultado final
            # --- NUEVOS PARÁMETROS PARA EL PUNTO DE ALERTA ---
            lead_time_dias=lead_time_dias,
            dias_seguridad_base=dias_seguridad_base,
            factor_importancia_seguridad=1.0
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=f"Error de validación: {str(ve)}")
    except Exception as e:
        # En un entorno de producción, se debería loggear este error de forma más robusta.
        print(f"Error interno durante el procesamiento: {e}") # Log para debugging
        raise HTTPException(status_code=500, detail=f"Error interno al procesar los datos. Por favor, contacte al administrador. Detalles: {str(e)}")

    # --- Manejo de DataFrame vacío ---
    if processed_df.empty:
        empty_excel = to_excel_with_autofit(pd.DataFrame(), sheet_name='Sin Datos')
        return StreamingResponse(
            empty_excel,
            media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            headers={
                "Content-Disposition": f"attachment; filename=stock_minimo_sugerido_{datetime.now().strftime('%Y%m%d')}.xlsx",
                "X-Status-Message": "No se encontraron datos para los criterios o período seleccionados."
            }
        )

    # --- Exportar a Excel ---
    try:
        excel_output = to_excel_with_autofit(processed_df, sheet_name='Puntos_Alerta_Stock')
    except Exception as e:
        print(f"Error al generar el archivo Excel: {e}") # Log para debugging
        raise HTTPException(status_code=500, detail=f"Error al generar el archivo Excel: {str(e)}")

    # filename_period = "todo_historial" if periodo_abc == 0 else f"ultimos_{periodo_abc}_meses"
    final_filename = f"stock_minimo_sugerido_{datetime.now().strftime('%Y%m%d')}.xlsx"

    return StreamingResponse(
        excel_output,
        media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        headers={"Content-Disposition": f"attachment; filename={final_filename}"}
    )



@app.post("/lista-basica-reposicion-historico", summary="Recomendación de Lista básica de reposición en funcion del histórico de ventas", tags=["Análisis"])
async def lista_basica_reposicion_historico(
    ventas: UploadFile = File(..., description="Archivo CSV con datos de ventas."),
    inventario: UploadFile = File(..., description="Archivo CSV con datos de inventario."),
    # --- 2. RECIBIR LOS NUEVOS PARÁMETROS DEL FORMULARIO ---
    # Se definen con un valor por defecto por si el frontend no los envía.
    ordenar_por: str = Form("Importancia", description="Criterio para ordenar el reporte final."),
    excluir_sin_ventas: str = Form("true", description="String 'true' o 'false' para excluir productos sin ventas."),
    incluir_solo_categorias: str = Form("", description="String de categorías separadas por comas."),
    incluir_solo_marcas: str = Form("", description="String de marcas separadas por comas.")
):
    """
    Sube archivos CSV de ventas e inventario y genera una lista de reposición.
    Acepta parámetros adicionales para filtrar y ordenar el análisis.
    """

    # --- Leer archivo de ventas (sin cambios) ---
    ventas_contents = await ventas.read()
    try:
        df_ventas = pd.read_csv(io.BytesIO(ventas_contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error al leer el archivo CSV de ventas: {e}. Verifique el formato.")

    # --- Leer archivo de inventario (sin cambios) ---
    inventario_contents = await inventario.read()
    try:
        df_inventario = pd.read_csv(io.BytesIO(inventario_contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error al leer el archivo CSV de inventario: {e}. Verifique el formato.")
        
    # --- 3. PROCESAR PARÁMETROS RECIBIDOS DEL FRONTEND ---
    # Convertir el string 'true'/'false' a un booleano real
    excluir_bool = excluir_sin_ventas.lower() == 'true'

    # Convertir el string de categorías separado por comas a una lista
    # Esto también limpia espacios en blanco y omite valores vacíos.
    categorias_list = [cat.strip() for cat in incluir_solo_categorias.split(',') if cat.strip()] if incluir_solo_categorias else None
    
    # Convertir el string de marcas separado por comas a una lista
    marcas_list = [marca.strip() for marca in incluir_solo_marcas.split(',') if marca.strip()] if incluir_solo_marcas else None


    # --- Procesamiento de los datos ---
    try:
        # --- 4. LLAMAR A LA FUNCIÓN DE PROCESAMIENTO CON LOS PARÁMETROS DINÁMICOS ---
        processed_df = process_csv_lista_basica_reposicion_historico(
            df_ventas=df_ventas,
            df_stock=df_inventario,
            ordenar_por=ordenar_por,
            excluir_sin_ventas=excluir_bool,
            incluir_solo_categorias=categorias_list,
            incluir_solo_marcas=marcas_list
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=f"Error de validación: {str(ve)}")
    except Exception as e:
        print(f"Error interno durante el procesamiento: {e}")
        raise HTTPException(status_code=500, detail=f"Error interno al procesar los datos. Por favor, contacte al administrador. Detalles: {str(e)}")

    # --- Manejo de DataFrame vacío y exportación a Excel (sin cambios) ---
    if processed_df.empty:
        # ... (código sin cambios)
        pass # Reemplaza este pass con tu código de manejo de DF vacío

    try:
        excel_output = to_excel_with_autofit(processed_df, sheet_name='Reposicion_Sugerida')
    except Exception as e:
        print(f"Error al generar el archivo Excel: {e}")
        raise HTTPException(status_code=500, detail=f"Error al generar el archivo Excel: {str(e)}")

    final_filename = f"lista_reposicion_{datetime.now().strftime('%Y%m%d_%H%M')}.xlsx"

    return StreamingResponse(
        excel_output,
        media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        headers={"Content-Disposition": f"attachment; filename={final_filename}"}
    )




@app.post("/reporte-stock-minimo-sugerido", summary="Recomendación Stock de Alerta ó Mínimo Sugerido", tags=["Análisis"])
async def reporte_stock_minimo_sugerido(
    ventas: UploadFile = File(..., description="Archivo CSV con datos de ventas."),
    inventario: UploadFile = File(..., description="Archivo CSV con datos de inventario."),
    dias_cobertura_deseados: int = Form(...),
    meses_analisis_historicos: int = Form(...)
):
    """
    Sube archivos CSV de ventas e inventario, y realiza un análisis ABC
    según los criterios y período especificados.
    """

    # --- Leer archivo de ventas ---
    ventas_contents = await ventas.read()
    try:
        df_ventas = pd.read_csv(io.BytesIO(ventas_contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error al leer el archivo CSV de ventas: {e}. Verifique el formato.")

    # --- Leer archivo de inventario ---
    inventario_contents = await inventario.read()
    try:
        df_inventario = pd.read_csv(io.BytesIO(inventario_contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error al leer el archivo CSV de inventario: {e}. Verifique el formato.")

    # --- Procesamiento de los datos ---
    try:
        processed_df = process_csv_puntos_alerta_stock(
            df_ventas,
            df_inventario,
            # Parámetros de periodos para análisis de ventas
            # dias_analisis_ventas_recientes=30, #(P/FRONTEND) Anteriormente dias_importancia
            # dias_analisis_ventas_general=240,   #(P/FRONTEND) Anteriormente dias_promedio
            peso_ventas_historicas=0.6, # 0.0 = 100% reciente; 1.0 = 100% histórico
            # Parámetros para cálculo de Stock Ideal
            dias_cobertura_ideal_base=10, #(P/FRONTEND) Días base para cobertura ideal
            coef_importancia_para_cobertura_ideal=0.05, # e.g., 0.25 (0 a 1), aumenta días de cobertura ideal por importancia
            coef_rotacion_para_stock_ideal=0.10,       # e.g., 0.2 (0 a 1), aumenta stock ideal por rotación
            coef_rotacion_para_stock_minimo=0.15,
            # Parámetros para Pedido Mínimo
            dias_cubrir_con_pedido_minimo=5, #(P/FRONTEND) Días de venta que un pedido mínimo debería cubrir
            coef_importancia_para_pedido_minimo=0.1, # e.g., 0.5 (0 a 1), escala el pedido mínimo por importancia
            # Otros parámetros de comportamiento
            importancia_minima_para_redondeo_a_1=0.1, # e.g. 0.1, umbral de importancia para redondear pedidos pequeños a 1
            incluir_productos_pasivos=True,
            cantidad_reposicion_para_pasivos=1, # e.g., 1 o 2, cantidad a reponer para productos pasivos
            excluir_productos_sin_sugerencia_ideal=False, # Filtro para el resultado final
            # --- NUEVOS PARÁMETROS PARA EL PUNTO DE ALERTA ---
            lead_time_dias=10.0,
            dias_seguridad_base=0,
            factor_importancia_seguridad=1.0
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=f"Error de validación: {str(ve)}")
    except Exception as e:
        # En un entorno de producción, se debería loggear este error de forma más robusta.
        print(f"Error interno durante el procesamiento: {e}") # Log para debugging
        raise HTTPException(status_code=500, detail=f"Error interno al procesar los datos. Por favor, contacte al administrador. Detalles: {str(e)}")

    # --- Manejo de DataFrame vacío ---
    if processed_df.empty:
        empty_excel = to_excel_with_autofit(pd.DataFrame(), sheet_name='Sin Datos')
        return StreamingResponse(
            empty_excel,
            media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            headers={
                "Content-Disposition": f"attachment; filename=stock_minimo_sugerido_{datetime.now().strftime('%Y%m%d')}.xlsx",
                "X-Status-Message": "No se encontraron datos para los criterios o período seleccionados."
            }
        )

    # --- Exportar a Excel ---
    try:
        excel_output = to_excel_with_autofit(processed_df, sheet_name='Analisis_ABC')
    except Exception as e:
        print(f"Error al generar el archivo Excel: {e}") # Log para debugging
        raise HTTPException(status_code=500, detail=f"Error al generar el archivo Excel: {str(e)}")

    # filename_period = "todo_historial" if periodo_abc == 0 else f"ultimos_{periodo_abc}_meses"
    final_filename = f"stock_minimo_sugerido_{datetime.now().strftime('%Y%m%d')}.xlsx"

    return StreamingResponse(
        excel_output,
        media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        headers={"Content-Disposition": f"attachment; filename={final_filename}"}
    )

# ----------------------------------------------------------
# ------------------ FUNCIONES AUXILIARES ------------------
# ----------------------------------------------------------
# alternativa mas optima?
# def to_excel_with_autofit(df: pd.DataFrame, sheet_name: str = 'Sheet1') -> io.BytesIO:
#     """
#     Exports a DataFrame to an Excel file in memory with column widths autofitted.
#     """
#     output = io.BytesIO()
#     # Especificar el tipo para writer para ayudar a la inferencia de tipos si es necesario
#     writer: Any = pd.ExcelWriter(output, engine='openpyxl')
#     df.to_excel(writer, index=False, sheet_name=sheet_name)
    
#     # Lógica de Autoajuste
#     worksheet = writer.sheets[sheet_name]
#     for idx, col in enumerate(df):  # Itera sobre las columnas del DataFrame
#         series = df[col]
#         max_len = max(
#             series.astype(str).map(len).max(),  # Longitud máxima de los datos en la columna
#             len(str(series.name))  # Longitud del nombre de la columna
#         ) + 2  # Añade un poco de padding
#         worksheet.column_dimensions[chr(65 + idx)].width = max_len  # 65 es 'A' en ASCII

#     writer.save() # Guarda los cambios en el buffer de BytesIO
#     output.seek(0)
#     return output

def to_excel_with_autofit(df, sheet_name='Sheet1'):
    """
    Writes a pandas DataFrame to an Excel file in BytesIO, 
    autofitting column widths.

    Args:
        df (pd.DataFrame): The DataFrame to write.
        sheet_name (str, optional): Name of the sheet. Defaults to 'Sheet1'.

    Returns:
         io.BytesIO: In-memory Excel file.
    """
    output = io.BytesIO()
    writer = pd.ExcelWriter(output, engine='xlsxwriter')
    df.to_excel(writer, sheet_name=sheet_name, index=False, startrow=1, header=False)

    workbook = writer.book
    worksheet = writer.sheets[sheet_name]

    worksheet.freeze_panes(1, 2)

    # worksheet.set_row(0, 50, None, {'align':'vcenter', 'center_across':True, 'bold': True})

    # Add a header format.
    header_format = workbook.add_format({
        'bold': True,
        'text_wrap': True,
        'valign': 'vcenter',
        'align': 'center',
        'font_color': 'black',
        'fg_color': '#E5E0EC',
        'border_color': 'white',
        'border': 1})

    # Write the column headers with the defined format.
    for col_num, value in enumerate(df.columns.values):
        worksheet.write(0, col_num, value, header_format)

    worksheet.set_row(0, 52)

    worksheet.autofilter(0, 0, df.shape[0], df.shape[1])

    for i, column in enumerate(df.columns):
        # column_width = max(df[column].astype(str).map(len).max(), len(column))
        column_width = 13
        if (i == 0):
            column_width = 8
        if (i == 1):
            column_width = 50
        if (i == 2):
            column_width = 24
        if (i == 3):
            column_width = 24
        worksheet.set_column(i, i, column_width + 2)

    # Hide columns based on sheet_name
    if (sheet_name == 'Puntos_Alerta_Stock'):
        worksheet.set_column('C:C', 26, None, {'hidden': True})
        worksheet.set_column('D:D', 26, None, {'hidden': True})
        worksheet.set_column('E:E', 15, None, {'hidden': True})


    writer.close()
    output.seek(0)
    return output

# ===================================================
# ============== FINAL: FULL REPORTES ===============
# ===================================================
# ===================================================
# ===================================================
# ===================================================

