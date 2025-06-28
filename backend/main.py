import os
import uvicorn
import json

from fastapi import FastAPI, UploadFile, File, Form, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi import HTTPException
import pandas as pd
import traceback
import io
import math
import uuid
# --- Importaciones de nuestros nuevos módulos ---
from firebase_admin import firestore
import firebase_config # Importar para asegurar que se inicialice
from firebase_helpers import db, upload_to_storage, log_analysis_in_firestore, extraer_metadatos_df, log_file_upload_in_firestore, descargar_contenido_de_storage, log_report_generation
from pydantic import BaseModel, Field
import firebase_config 
from io import StringIO
import openpyxl
from typing import Optional, Dict, Any, Literal # Any para pd.ExcelWriter
from datetime import datetime, timezone # Para pd.Timestamp.now()
from track_expenses import process_csv, summarise_expenses, clean_data, get_top_expenses_by_month
from track_expenses import process_csv_abc, procesar_stock_muerto
from track_expenses import process_csv_puntos_alerta_stock, process_csv_reponer_stock
from track_expenses import process_csv_lista_basica_reposicion_historico, process_csv_analisis_estrategico_rotacion
from track_expenses import generar_reporte_maestro_inventario
from report_config import REPORTS_CONFIG

INITIAL_CREDITS = 35

app = FastAPI(
    title="Ferretero.IA API",
    description="API para análisis de datos de ferreterías.",
    version="1.0.0"
)

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

@app.get("/reports-config", summary="Obtiene la configuración de los reportes disponibles", tags=["Configuración"])
async def get_reports_configuration():
    """
    Devuelve la lista de reportes disponibles con sus propiedades (costo, si es Pro, etc.).
    El frontend usará esto para construir dinámicamente la interfaz.
    """
    return JSONResponse(content=REPORTS_CONFIG)

# ===================================================================================
# --- NUEVO MODELO DE DATOS PARA ONBOARDING ---
# ===================================================================================
class OnboardingData(BaseModel):
    """Define la estructura de datos que esperamos recibir del formulario de onboarding."""
    rol: str = Field(..., description="El rol seleccionado por el usuario (e.g., 'dueño', 'consultor').")


# ===================================================================================
# --- NUEVO ENDPOINT PARA CREAR SESIONES ---
# ===================================================================================
@app.post("/sessions", summary="Crea una nueva sesión de análisis anónima con créditos", tags=["Sesión"])
async def create_analysis_session(onboarding_data: OnboardingData):
    """
    Inicia una nueva sesión de análisis.
    1. Genera un ID de sesión único (UUID).
    2. Crea un documento en Firestore para registrar la sesión.
    3. INICIALIZA EL MONEDERO con los créditos por defecto.
    4. Devuelve el ID de la sesión al cliente.
    """
    try:
        session_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc) # Usamos UTC para consistencia

        session_ref = db.collection('sesiones_anonimas').document(session_id)
        
        # --- Datos a guardar (ahora incluye los créditos) ---
        session_log = {
            "fechaCreacion": now,
            "onboardingData": {
                "rol": onboarding_data.rol
            },
            "ultimoAcceso": now,
            
            # --- NUEVOS CAMPOS PARA EL MONEDERO DE CRÉDITOS ---
            "creditos_iniciales": INITIAL_CREDITS,
            "creditos_restantes": INITIAL_CREDITS
        }
        
        session_ref.set(session_log)
        
        print(f"✅ Nueva sesión creada con {INITIAL_CREDITS} créditos. ID: {session_id}")
        
        return JSONResponse(content={"sessionId": session_id})

    except Exception as e:
        print(f"🔥 Error al crear la sesión en Firestore: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"No se pudo crear la sesión en el servidor. Error: {e}"
        )


# ===================================================================================
# --- NUEVO ENDPOINT PARA RECUPERAR EL ESTADO DE LA SESIÓN ---
# ===================================================================================
@app.get("/session-state", summary="Recupera los créditos y el historial para una sesión", tags=["Sesión"])
async def get_session_state(
    X_Session_ID: str = Header(..., alias="X-Session-ID")
):
    """
    Busca en Firestore el estado actual de una sesión, incluyendo el saldo de
    créditos y el historial de reportes generados, para restaurar el estado en el frontend.
    """
    if not X_Session_ID:
        raise HTTPException(status_code=400, detail="La cabecera X-Session-ID es requerida.")

    try:
        # --- 1. Obtener el estado del "monedero" ---
        session_ref = db.collection('sesiones_anonimas').document(X_Session_ID)
        session_doc = session_ref.get()

        if not session_doc.exists:
            # Es importante manejar el caso en que el frontend envíe un ID de sesión antiguo o inválido
            raise HTTPException(status_code=404, detail="La sesión no existe o ha expirado.")

        session_data = session_doc.to_dict()
        creditos_restantes = session_data.get("creditos_restantes", 0)
        creditos_usados = session_data.get("creditos_iniciales", 20) - creditos_restantes

        # --- 2. Obtener el historial de reportes ---
        historial_ref = session_ref.collection('reportes_generados')
        # Pedimos los reportes ordenados por fecha, del más reciente al más antiguo
        query = historial_ref.order_by("fechaGeneracion", direction=firestore.Query.DESCENDING).limit(5)
        
        docs_historial = query.stream()
        
        historial_list = []
        for doc in docs_historial:
            doc_data = doc.to_dict()

            if 'fechaGeneracion' in doc_data and isinstance(doc_data['fechaGeneracion'], datetime):
                # Convertimos la fecha a un string en formato ISO 8601, que es compatible con JSON
                doc_data['fechaGeneracion'] = doc_data['fechaGeneracion'].isoformat()
        
            historial_list.append(doc_data)

        # --- 3. Construir y devolver la respuesta ---
        return JSONResponse(content={
            "credits": {
                "used": creditos_usados,
                "remaining": creditos_restantes
            },
            "history": historial_list
        })

    except HTTPException as http_exc:
        # Relanzamos los errores HTTP que nosotros mismos generamos (ej: 404)
        raise http_exc
    except Exception as e:
        # Capturamos cualquier otro error inesperado con Firebase
        print(f"🔥 Error al recuperar estado de sesión para {X_Session_ID}: {e}")
        raise HTTPException(status_code=500, detail="No se pudo recuperar el estado de la sesión desde el servidor.")


# ===================================================================================
# --- NUEVO ENDPOINT PARA LA CARGA DE ARCHIVOS DEDICADA ---
# ===================================================================================
@app.post("/upload-file", summary="Sube, registra y extrae metadatos de un archivo", tags=["Archivos"])
async def upload_file(
    X_Session_ID: str = Header(..., alias="X-Session-ID"),
    tipo_archivo: Literal['inventario', 'ventas'] = Form(...),
    file: UploadFile = File(...)
):
    if not X_Session_ID:
        raise HTTPException(status_code=400, detail="La cabecera X-Session-ID es requerida.")

    # Leemos el contenido del archivo una sola vez al principio
    contents = await file.read()
    df = None
    
    # --- LÓGICA DE LECTURA CORREGIDA ---
    # Probamos las configuraciones en orden
    try:
        # Intento 1: UTF-8, separado por comas
        df = pd.read_csv(io.BytesIO(contents), sep=',')
    except Exception:
        print("Intento 1 falló. Reintentando...")
        try:
            # Intento 2: Latin-1, separado por comas
            df = pd.read_csv(io.BytesIO(contents), sep=',', encoding='latin1')
        except Exception:
            print("Intento 2 falló. Reintentando...")
            try:
                # Intento 3: UTF-8, separado por punto y coma
                df = pd.read_csv(io.BytesIO(contents), sep=';', encoding='utf-8')
            except Exception:
                print("Intento 3 falló. Reintentando...")
                try:
                    # Intento 4 (Final): Latin-1, separado por punto y coma
                    df = pd.read_csv(io.BytesIO(contents), sep=';', encoding='latin1')
                except Exception as e:
                    # Si todos los intentos fallan
                    raise HTTPException(
                        status_code=400,
                        detail=f"No se pudo leer el archivo CSV. Verifique su formato. Error: {e}"
                    )

    if df is None or df.empty:
        raise HTTPException(status_code=400, detail="El archivo se leyó pero está vacío o no se pudo interpretar.")
    
    # Limpiamos los nombres de las columnas
    df.columns = df.columns.str.strip()

    # --- El resto de tu lógica se mantiene igual ---
    try:
        metadata = extraer_metadatos_df(df, tipo_archivo)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error al procesar el contenido del archivo: {e}")

    try:
        now = datetime.now(timezone.utc)
        timestamp_str = now.strftime('%Y-%m-%d_%H%M%S')
        
        ruta_storage = upload_to_storage(
            session_id=X_Session_ID,
            file_contents=contents,
            tipo_archivo=tipo_archivo,
            original_filename=file.filename,
            content_type=file.content_type,
            timestamp_str=timestamp_str
        )
        
        file_id = f"{timestamp_str}_{tipo_archivo}"

        log_file_upload_in_firestore(
            session_id=X_Session_ID,
            file_id=file_id,
            tipo_archivo=tipo_archivo,
            nombre_original=file.filename,
            ruta_storage=ruta_storage,
            metadata=metadata,
            timestamp_obj=now
        )
        
        response_content = {
            "message": f"Archivo de {tipo_archivo} subido y registrado exitosamente.",
            "file_id": file_id,
            "tipo_archivo": tipo_archivo,
            "nombre_original": file.filename
        }

        if tipo_archivo == 'inventario':
            response_content["available_filters"] = {
                "categorias": metadata.get("lista_completa_categorias", []),
                "marcas": metadata.get("lista_completa_marcas", [])
            }
        
        return JSONResponse(content=response_content)

    except Exception as e:
        print(f"🔥 Error en la fase de guardado para la sesión {X_Session_ID}: {e}")
        raise HTTPException(status_code=500, detail="Ocurrió un error al guardar el archivo en el servidor.")


# ===================================================================================
# --- TUS ENDPOINTS EXISTENTES (EJEMPLO) ---
# ===================================================================================
# Por ahora, mantenemos tu endpoint /extract-metadata como estaba,
# ya que lo refactorizaremos en el siguiente paso para usar el nuevo flujo.

@app.post("/extract-metadata", summary="Extrae metadatos (categorías, marcas) de un archivo de inventario", tags=["Utilidades"])
async def extract_metadata(
    inventario: UploadFile = File(..., description="Archivo CSV con datos de inventario."),
    X_Session_ID: str = Header(..., alias="X-Session-ID", description="ID de sesión anónima único del cliente.")
):
    if not X_Session_ID:
            raise HTTPException(status_code=400, detail="La cabecera X-Session-ID es requerida.")
    """
    Lee un archivo de inventario y devuelve una lista de todas las categorías y marcas únicas.
    Este endpoint es robusto e intenta leer el CSV con diferentes codificaciones y separadores.
    """

    inventory_contents = await inventario.read()

    # --- LÓGICA DE LECTURA ROBUSTA ---
    try:
        # Intento 1: La configuración más común (UTF-8, separado por comas)
        df_inventario = pd.read_csv(io.BytesIO(inventory_contents), sep=',')
    except (UnicodeDecodeError, pd.errors.ParserError):
        try:
            # Intento 2: Codificación Latin-1 (muy común en Excel de Windows/Español)
            print("Intento 1 (UTF-8, coma) falló. Reintentando con latin-1 y coma.")
            df_inventario = pd.read_csv(io.BytesIO(inventory_contents), sep=',', encoding='latin1')
        except (UnicodeDecodeError, pd.errors.ParserError):
            try:
                # Intento 3: Codificación UTF-8 con punto y coma como separador
                print("Intento 2 (latin-1, coma) falló. Reintentando con UTF-8 y punto y coma.")
                df_inventario = pd.read_csv(io.BytesIO(inventory_contents), sep=';', encoding='utf-8')
            except Exception as e:
                # Si todos los intentos fallan, entonces sí lanzamos el error.
                print(f"Todos los intentos de lectura de CSV fallaron. Error final: {e}")
                raise HTTPException(
                    status_code=400, 
                    detail=f"No se pudo leer el archivo CSV. Verifique que esté delimitado por comas o punto y coma y tenga una codificación estándar (UTF-8 o Latin-1). Error: {e}"
                )

    # --- 2. Extracción de Metadatos del DataFrame ---
    metadata_inventario = extraer_metadatos_df(df_inventario, 'inventario')


    # --- 3. Guardado Asíncrono en Firebase ---
    # Esto puede correr en segundo plano si se desea, pero por simplicidad lo hacemos secuencial.
    try:
        now = datetime.now(timezone.utc)

        timestamp_str = now.strftime('%Y-%m-%d_%H%M%S')
        
        inventory_file_path = upload_to_storage(
            session_id=X_Session_ID,
            file_contents=inventory_contents,
            tipo_archivo='inventario', # <--- Le indicamos que es un archivo de inventario
            original_filename=inventario.filename, # Pasamos el nombre para obtener la extensión
            content_type=inventario.content_type,
            timestamp_str=timestamp_str
        )
        
        log_analysis_in_firestore(
            session_id=X_Session_ID,
            report_name="ExtractMetadata",
            timestamp_obj=now,
            inventory_path=inventory_file_path,
            metadata_inventario=metadata_inventario
        )
    except Exception as e:
        # Advertencia: No detenemos el flujo si falla el guardado, el usuario aún
        # necesita su respuesta. Podríamos loggear este error internamente.
        print(f"ADVERTENCIA: Falló el guardado en Firebase para la sesión {X_Session_ID}: {e}")

    # --- 4. Devolver la Respuesta al Cliente ---
    # Devolvemos los metadatos que el frontend necesita para los filtros.
    categorias = metadata_inventario.get("preview_categorias", [])
    marcas = [m for m in df_inventario['Marca'].dropna().unique().tolist() if m] if 'Marca' in df_inventario.columns else []

    return JSONResponse(content={
        "categorias_disponibles": categorias,
        "marcas_disponibles": sorted(marcas)
    })



@app.post("/abc", summary="Realizar Análisis ABC", tags=["Análisis"])
async def upload_csvs_abc_analysis(
    # Inyectamos el request para el logging
    request: Request, 
    # Definimos explícitamente los parámetros que la LÓGICA necesit
    X_Session_ID: str = Header(..., alias="X-Session-ID"),
    ventas_file_id: str = Form(...),
    inventario_file_id: str = Form(...),
    criterio_abc: str = Form(..., description="Criterio para el análisis ABC: 'ingresos', 'unidades', 'margen', 'combinado'.", examples=["ingresos"]),
    periodo_abc: int = Form(..., description="Período de análisis en meses (0 para todo el historial, ej: 3, 6, 12).", examples=[6]),
    peso_ingresos: Optional[float] = Form(0.5), # Recibimos los pesos opcionales
    peso_margen: Optional[float] = Form(0.3),
    peso_unidades: Optional[float] = Form(0.2)
):
    pesos_combinado_dict = None
    if criterio_abc.lower() == "combinado":
        pesos_combinado_dict = {
            "ingresos": peso_ingresos,
            "margen": peso_margen,
            "unidades": peso_unidades
        }
    
    # Preparamos el diccionario de parámetros para la función de lógica
    processing_params = {
        "criterio_abc": criterio_abc.lower(),
        "periodo_abc": periodo_abc,
        "pesos_combinado": pesos_combinado_dict
    }

    full_params_for_logging = dict(await request.form())

    # Llamamos a la función manejadora central
    return await _handle_report_generation(
        full_params_for_logging=full_params_for_logging,
        session_id=X_Session_ID,
        user_id=None, # Para sesiones anónimas, siempre es None
        ventas_file_id=ventas_file_id,
        inventario_file_id=inventario_file_id,
        report_key="ReporteABC",
        processing_function=process_csv_abc, # Pasamos la función de lógica como argumento
        processing_params=processing_params,
        output_filename="reporte_abc.xlsx"
    )


@app.post("/rotacion-general-estrategico") # Endpoint renombrado para mayor claridad
async def run_analisis_estrategico_rotacion(
    # Inyectamos el request para el logging
    request: Request, 
    # Definimos explícitamente los parámetros que la LÓGICA necesit
    X_Session_ID: str = Header(..., alias="X-Session-ID"),
    ventas_file_id: str = Form(...),
    inventario_file_id: str = Form(...),

    # --- Parámetros Básicos (Controles Principales) ---
    dias_analisis_ventas_recientes: Optional[int] = Form(30, description="Ventana principal de análisis en días. Ej: 30, 60, 90."),
    sort_by: str = Form('Importancia_Dinamica', description="Columna para ordenar el resultado."),
    sort_ascending: bool = Form(False, description="True para orden ascendente (ej: ver lo más bajo en cobertura)."),
    filtro_categorias_json: Optional[str] = Form(None, description='Filtra por una o más categorías. Formato JSON: \'["Tornillería"]\''),
    filtro_marcas_json: Optional[str] = Form(None, description='Filtra por una o más marcas. Formato JSON: \'["Marca A"]\''),
    min_importancia: Optional[float] = Form(None, description="Filtro para ver productos con importancia >= a este valor (0 a 1)."),
    max_dias_cobertura: Optional[float] = Form(None, description="Filtro para encontrar productos con bajo stock (cobertura <= X días)."),
    min_dias_cobertura: Optional[float] = Form(None, description="Filtro para encontrar productos con sobre-stock (cobertura >= X días)."),

    # --- Parámetros Avanzados (Ajustes del Modelo) ---
    dias_analisis_ventas_general: Optional[int] = Form(None, description="Ventana secundaria de análisis para productos sin ventas recientes."),
    umbral_sobre_stock_dias: int = Form(180, description="Días a partir de los cuales un producto se considera 'Sobre-stock'."),
    umbral_stock_bajo_dias: int = Form(15, description="Días por debajo de los cuales un producto se considera con 'Stock Bajo'."),
    pesos_importancia_json: Optional[str] = Form(None, description='(Avanzado) Redefine los pesos del Índice de Importancia. Formato JSON.')
):
    # --- 2. Procesar Parámetros Complejos desde JSON ---
    pesos_importancia = json.loads(pesos_importancia_json) if pesos_importancia_json else None
    filtro_categorias = json.loads(filtro_categorias_json) if filtro_categorias_json else None
    filtro_marcas = json.loads(filtro_marcas_json) if filtro_marcas_json else None
    # (Se podría añadir un try-except más robusto aquí si se desea)

    # Preparamos el diccionario de parámetros para la función de lógica
    processing_params = {
        "pesos_importancia": pesos_importancia,
        "dias_analisis_ventas_recientes": dias_analisis_ventas_recientes,
        "dias_analisis_ventas_general": dias_analisis_ventas_general,
        "umbral_sobre_stock_dias": umbral_sobre_stock_dias,
        "umbral_stock_bajo_dias": umbral_stock_bajo_dias,
        "filtro_categorias": filtro_categorias,
        "filtro_marcas": filtro_marcas,
        "min_importancia": min_importancia,
        "max_dias_cobertura": max_dias_cobertura,
        "min_dias_cobertura": min_dias_cobertura,
        "sort_by": sort_by,
        "sort_ascending": sort_ascending
    }

    full_params_for_logging = dict(await request.form())

    # Llamamos a la función manejadora central
    return await _handle_report_generation(
        full_params_for_logging=full_params_for_logging,
        session_id=X_Session_ID,
        ventas_file_id=ventas_file_id,
        inventario_file_id=inventario_file_id,
        report_key="ReporteAnalisisEstrategicoRotacion",
        processing_function=process_csv_analisis_estrategico_rotacion, # Pasamos la función de lógica como argumento
        processing_params=processing_params,
        output_filename="ReporteAnalisisEstrategicoRotacion.xlsx"
    )


@app.post("/diagnostico-stock-muerto")
async def diagnostico_stock_muerto(
    # Inyectamos el request para el logging
    request: Request, 
    # Definimos explícitamente los parámetros que la LÓGICA necesit
    X_Session_ID: str = Header(..., alias="X-Session-ID"),
    ventas_file_id: str = Form(...),
    inventario_file_id: str = Form(...),
    # meses_analisis: int = Form(...)
    # meses: int = Query(6, description="Cantidad de meses hacia atrás para analizar")
):
    processing_params = {}
    full_params_for_logging = dict(await request.form())

    # Llamamos a la función manejadora central
    return await _handle_report_generation(
        full_params_for_logging=full_params_for_logging,
        session_id=X_Session_ID,
        ventas_file_id=ventas_file_id,
        inventario_file_id=inventario_file_id,
        report_key="ReporteDiagnosticoStockMuerto",
        processing_function=procesar_stock_muerto, # Pasamos la función de lógica como argumento
        processing_params=processing_params,
        output_filename="ReporteDiagnosticoStockMuerto.xlsx"
    )


@app.post("/reporte-maestro-inventario")
async def generar_reporte_maestro_endpoint(
    # Inyectamos el request para el logging
    request: Request, 
    # Definimos explícitamente los parámetros que la LÓGICA necesit
    X_Session_ID: str = Header(..., alias="X-Session-ID"),
    ventas_file_id: str = Form(...),
    inventario_file_id: str = Form(...),
    
    # --- Parámetros para el Análisis ABC (con valores por defecto) ---
    criterio_abc: str = Form("margen", description="Criterio para el análisis ABC: 'ingresos', 'unidades', 'margen', o 'combinado'."),
    periodo_abc: int = Form(6, description="Número de meses hacia atrás para el análisis ABC."),
    
    # --- Parámetros Opcionales para el Criterio 'Combinado' ---
    peso_ingresos: Optional[float] = Form(None, description="Peso para ingresos (ej: 0.5) si el criterio es 'combinado'."),
    peso_margen: Optional[float] = Form(None, description="Peso para margen (ej: 0.3) si el criterio es 'combinado'."),
    peso_unidades: Optional[float] = Form(None, description="Peso para unidades (ej: 0.2) si el criterio es 'combinado'."),

    # --- Parámetros Opcionales para el Análisis de Salud ---
    meses_analisis_salud: Optional[int] = Form(None, description="Meses para analizar ventas recientes en el diagnóstico de salud."),
    dias_sin_venta_muerto: Optional[int] = Form(None, description="Umbral de días para clasificar un producto como 'Stock Muerto'.")
):
    # --- Validación de Parámetros ---
    pesos_combinado = None
    if criterio_abc == 'combinado':
        if not all([peso_ingresos, peso_margen, peso_unidades]):
            raise HTTPException(status_code=400, detail="Para el criterio 'combinado', se deben proveer los tres pesos: peso_ingresos, peso_margen y peso_unidades.")
        
        total_pesos = peso_ingresos + peso_margen + peso_unidades
        if not math.isclose(total_pesos, 1.0):
            raise HTTPException(status_code=400, detail=f"La suma de los pesos debe ser 1.0, pero es {total_pesos}.")
            
        pesos_combinado = {
            "ingresos": peso_ingresos,
            "margen": peso_margen,
            "unidades": peso_unidades
        }


    # 1. Preparamos el diccionario de parámetros para la función de lógica
    processing_params = {
        "criterio_abc": criterio_abc,
        "periodo_abc": periodo_abc,
        "pesos_combinado": pesos_combinado,
        "meses_analisis": meses_analisis_salud,
        "dias_sin_venta_muerto": dias_sin_venta_muerto
    }

    full_params_for_logging = dict(await request.form())

    # 2. Llamamos a la función manejadora central con toda la información
    return await _handle_report_generation(
        full_params_for_logging=full_params_for_logging,
        session_id=X_Session_ID,
        user_id=None, # Para sesiones anónimas, siempre es None
        ventas_file_id=ventas_file_id,
        inventario_file_id=inventario_file_id,
        report_key="ReporteMaestro", # La clave única que definimos en la configuración
        processing_function=generar_reporte_maestro_inventario, # Tu función de lógica real
        # processing_function=lambda df_v, df_i, **kwargs: df_i.head(10), # Simulación
        processing_params=processing_params,
        output_filename="ReporteMaestro.xlsx"
    )


@app.post("/reporte-puntos-alerta-stock", summary="Recomendación Puntos de Alerta de Stock", tags=["Análisis"])
async def reporte_puntos_alerta_stock(
    # Inyectamos el request para el logging
    request: Request, 
    # Definimos explícitamente los parámetros que la LÓGICA necesit
    X_Session_ID: str = Header(..., alias="X-Session-ID"),
    ventas_file_id: str = Form(...),
    inventario_file_id: str = Form(...),
    lead_time_dias: int = Form(...),
    dias_seguridad_base: int = Form(...)
):
    # Preparamos el diccionario de parámetros para la función de lógica
    processing_params = {
        # Parámetros de periodos para análisis de ventas
        # dias_analisis_ventas_recientes=30, #(P/FRONTEND) Anteriormente dias_importancia
        # dias_analisis_ventas_general=240,   #(P/FRONTEND) Anteriormente dias_promedio
        "peso_ventas_historicas": 0.6,
        # Parámetros para cálculo de Stock Ideal
        "dias_cobertura_ideal_base": 10,
        "coef_importancia_para_cobertura_ideal": 0.05, # e.g., 0.25 (0 a 1), aumenta días de cobertura ideal por importancia
        "coef_rotacion_para_stock_ideal": 0.10,       # e.g., 0.2 (0 a 1), aumenta stock ideal por rotación
        "coef_rotacion_para_stock_minimo": 0.15,
        # Parámetros para Pedido Mínimo
        "dias_cubrir_con_pedido_minimo": 5, #(P/FRONTEND) Días de venta que un pedido mínimo debería cubrir
        "coef_importancia_para_pedido_minimo": 0.1, # e.g., 0.5 (0 a 1), escala el pedido mínimo por importancia
        # Otros parámetros de comportamiento
        "importancia_minima_para_redondeo_a_1": 0.1, # e.g. 0.1, umbral de importancia para redondear pedidos pequeños a 1
        "incluir_productos_pasivos": True,
        "cantidad_reposicion_para_pasivos": 1, # e.g., 1 o 2, cantidad a reponer para productos pasivos
        "excluir_productos_sin_sugerencia_ideal": False, # Filtro para el resultado final
        # --- NUEVOS PARÁMETROS PARA EL PUNTO DE ALERTA ---
        "lead_time_dias": lead_time_dias,
        "dias_seguridad_base": dias_seguridad_base,
        "factor_importancia_seguridad": 1.0
    }
    
    full_params_for_logging = dict(await request.form())

    # Llamamos a la función manejadora central
    return await _handle_report_generation(
        full_params_for_logging=full_params_for_logging,
        session_id=X_Session_ID,
        ventas_file_id=ventas_file_id,
        inventario_file_id=inventario_file_id,
        report_key="ReportePuntosAlertaStock",
        processing_function=process_csv_puntos_alerta_stock, # Pasamos la función de lógica como argumento
        processing_params=processing_params,
        output_filename="ReportePuntosAlertaStock.xlsx"
    )


@app.post("/lista-basica-reposicion-historico", summary="Recomendación de Lista básica de reposición en funcion del histórico de ventas", tags=["Análisis"])
async def lista_basica_reposicion_historico(
    # Inyectamos el request para el logging
    request: Request, 
    # Definimos explícitamente los parámetros que la LÓGICA necesit
    X_Session_ID: str = Header(..., alias="X-Session-ID"),
    ventas_file_id: str = Form(...),
    inventario_file_id: str = Form(...),

    # --- Parámetros Básicos ---
    ordenar_por: str = Form("Importancia", description="Criterio para ordenar el reporte final."),
    incluir_solo_categorias: str = Form("", description="String de categorías separadas por comas."),
    incluir_solo_marcas: str = Form("", description="String de marcas separadas por comas."),

    # --- Parámetros Avanzados ---
    # dias_analisis_ventas_recientes=30,
    # dias_analisis_ventas_general=180,
    dias_analisis_ventas_recientes: Optional[int] = Form(None, description="Ventana principal de análisis en días. Ej: 30, 60, 90."),
    dias_analisis_ventas_general: Optional[int] = Form(None, description="Ventana secundaria de análisis para productos sin ventas recientes."),

    excluir_sin_ventas: str = Form("true", description="String 'true' o 'false' para excluir productos sin ventas."),
    # Usamos float e int para que FastAPI convierta los tipos automáticamente
    lead_time_dias: float = Form(7.0),
    dias_cobertura_ideal_base: int = Form(10),
    peso_ventas_historicas: float = Form(0.6),
    pesos_importancia_json: Optional[str] = Form(None, description='(Avanzado) Redefine los pesos del Índice de Importancia. Formato JSON.')
):
    try:
        excluir_bool = excluir_sin_ventas.lower() == 'true'
        
        # Parseamos los strings JSON para convertirlos en listas de Python
        categorias_list = json.loads(incluir_solo_categorias) if incluir_solo_categorias else None
        marcas_list = json.loads(incluir_solo_marcas) if incluir_solo_marcas else None
        pesos_importancia = json.loads(pesos_importancia_json) if pesos_importancia_json else None
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Formato de filtros (categorías/marcas) inválido. Se esperaba un string JSON.")

    # Preparamos el diccionario de parámetros para la función de lógica
    processing_params = {
        "dias_analisis_ventas_recientes": 30,
        "dias_analisis_ventas_general": 180,
        "ordenar_por": ordenar_por,
        "incluir_solo_categorias": categorias_list,
        "incluir_solo_marcas": marcas_list,
        "excluir_sin_ventas": excluir_bool,
        "lead_time_dias": lead_time_dias,
        "dias_cobertura_ideal_base": dias_cobertura_ideal_base,
        "peso_ventas_historicas": peso_ventas_historicas,
        "pesos_importancia": pesos_importancia
    }

    full_params_for_logging = dict(await request.form())

    # Llamamos a la función manejadora central
    return await _handle_report_generation(
        full_params_for_logging=full_params_for_logging,
        session_id=X_Session_ID,
        ventas_file_id=ventas_file_id,
        inventario_file_id=inventario_file_id,
        report_key="ReporteListaBasicaReposicionHistorica",
        processing_function=process_csv_lista_basica_reposicion_historico, # Pasamos la función de lógica como argumento
        processing_params=processing_params,
        output_filename="ReporteListaBasicaReposicionHistorica.xlsx"
    )



# ===================================================================================
# --- OTROS ENDPOINTS DE PRUEBA (EJEMPLO) ---
# ===================================================================================
# Por ahora, mantenemos estos endpoints
# ya que lo refactorizaremos en el siguiente paso para usar el nuevo flujo.

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

async def _handle_report_generation(
    full_params_for_logging: Dict[str, Any], 
    session_id: str,
    ventas_file_id: str,
    inventario_file_id: str,
    report_key: str, # <-- Ahora usamos una clave única para identificar el reporte
    processing_function: callable,
    processing_params: dict,
    output_filename: str,
    user_id: Optional[str] = None # <-- Parámetro para el futuro (usuarios registrados)
):
    """
    Función central final que primero valida permisos y créditos, y luego procesa,
    asegurando que el cobro solo se realice si la generación del archivo es exitosa.
    """
    # --- PASO 1: CONFIGURACIÓN Y PARÁMETROS ---
    report_config = REPORTS_CONFIG.get(report_key)
    if not report_config:
        raise HTTPException(status_code=404, detail=f"La configuración para el reporte '{report_key}' no fue encontrada.")
    
    report_cost = report_config['costo']
    is_pro_report = report_config['isPro']
    session_ref = db.collection('sesiones_anonimas').document(session_id)

    # --- PASO 2: VALIDACIONES DE NEGOCIO (FUERA DEL TRY/EXCEPT PRINCIPAL) ---
    # Si estas validaciones fallan, se lanza una excepción HTTP específica (403, 402, 404)
    # que el frontend puede interpretar para mostrar el modal correcto.

    # Guardián de Acceso Pro
    if is_pro_report and user_id is None:
        print(f"🚫 Acceso denegado: Sesión anónima ({session_id}) intentó acceder al reporte PRO '{report_key}'.")
        raise HTTPException(status_code=403, detail="Este es un reporte 'Pro'. Debes registrarte para acceder.")

    # Cajero (Verificación de Créditos)
    session_doc = session_ref.get()
    if not session_doc.exists:
        raise HTTPException(status_code=404, detail="La sesión no existe.")
    
    creditos_restantes = session_doc.to_dict().get("creditos_restantes", 0)
    if creditos_restantes < report_cost:
        raise HTTPException(status_code=402, detail=f"Créditos insuficientes. Este reporte requiere {report_cost} créditos y solo tienes {creditos_restantes}.")

    # --- PASO 3: PROCESAMIENTO Y GENERACIÓN (DENTRO DE UN TRY/EXCEPT) ---
    # Si algo falla aquí, es un error de ejecución. Lo registraremos como "fallido" sin cobrar.
    try:
        # Descarga y lectura de archivos
        ventas_contents = descargar_contenido_de_storage(session_id, ventas_file_id)
        inventario_contents = descargar_contenido_de_storage(session_id, inventario_file_id)
        df_ventas = pd.read_csv(io.BytesIO(ventas_contents), sep=',')
        df_inventario = pd.read_csv(io.BytesIO(inventario_contents), sep=',')
        
        # Ejecución de la lógica de negocio
        resultado_df = processing_function(df_ventas, df_inventario, **processing_params)

        columnas = resultado_df.columns
        columnas_duplicadas = columnas[columnas.duplicated()].unique().tolist()
        
        if columnas_duplicadas:
            print("\n--- 🕵️  DEBUG: ¡ADVERTENCIA DE COLUMNAS DUPLICADAS! ---")
            print(f"El DataFrame final para el reporte '{report_key}' tiene nombres de columna repetidos:")
            print(f"Columnas duplicadas encontradas: {columnas_duplicadas}")
            print("Esto causará que se omitan datos en el frontend. Revisa tu función de procesamiento para renombrar o eliminar estas columnas antes de devolver el DataFrame.")
            print("-----------------------------------------------------------\n")
            # Opcional: Podrías decidir lanzar un error aquí para forzar la corrección
            # raise ValueError(f"Columnas duplicadas detectadas: {columnas_duplicadas}")
        # --- FIN DEL BLOQUE DE DEPURACIÓN ---
        
        insight_text = f"Análisis completado. Se encontraron {len(resultado_df)} productos que cumplen los criterios."
        if resultado_df.empty:
            insight_text = "El análisis se completó, pero no se encontraron productos con los filtros seleccionados."
        
        # Convertimos el DataFrame a un formato JSON (lista de diccionarios)
        data_for_frontend = resultado_df.to_dict(orient='records')

        # output = to_excel_with_autofit(resultado_df, sheet_name=report_key[:31])
        
        # --- Transacción Final ---
        if resultado_df.empty:
            log_report_generation(
                session_id=session_id, report_name=report_key, params=full_params_for_logging,
                ventas_file_id=ventas_file_id, inventario_file_id=inventario_file_id,
                creditos_consumidos=0, estado="exitoso_vacio"
            )
        else:
            session_ref.update({"creditos_restantes": firestore.Increment(-report_cost)})
            log_report_generation(
                session_id=session_id, report_name=report_key, params=full_params_for_logging,
                ventas_file_id=ventas_file_id, inventario_file_id=inventario_file_id,
                creditos_consumidos=report_cost, estado="exitoso"
            )

        # Devolvemos la respuesta JSON
        return JSONResponse(content={
            "insight": insight_text,
            "data": data_for_frontend,
            "report_key": report_key # Enviamos la clave para que el frontend sepa qué hacer
        })


    except Exception as e:
        # Si CUALQUIER COSA falla durante el procesamiento...
        # --- BLOQUE DE MANEJO DE ERRORES MEJORADO ---
        print("\n" + "="*50)
        print("🔥🔥🔥 OCURRIÓ UN ERROR CRÍTICO DURANTE EL PROCESAMIENTO 🔥🔥🔥")
        
        # Esta línea imprimirá el traceback completo, diciéndonos el archivo,
        # la línea y el tipo de error exacto.
        traceback.print_exc() 
        
        print("="*50 + "\n")
        # ... registramos el intento fallido SIN descontar créditos.
        user_message, error_type, tech_details = "Error inesperado al procesar", type(e).__name__, str(e)
        if isinstance(e, KeyError): user_message = f"Columna requerida no encontrada: {e}"
        
        log_report_generation(
            session_id=session_id, report_name=report_key, params=full_params_for_logging,
            ventas_file_id=ventas_file_id, inventario_file_id=inventario_file_id,
            creditos_consumidos=0, estado="fallido",
            error_details={"user_message": user_message, "error_type": error_type, "technical_details": tech_details}
        )
        raise HTTPException(status_code=500, detail=user_message)

# async def _handle_report_generation(
#     request: Request,
#     session_id: str,
#     ventas_file_id: str,
#     inventario_file_id: str,
#     report_key: str, # <-- Ahora usamos una clave única para identificar el reporte
#     processing_function: callable,
#     processing_params: dict,
#     output_filename: str,
#     user_id: Optional[str] = None # <-- Parámetro para el futuro (usuarios registrados)
# ):
#     """
#     Función central reutilizable que maneja la generación de CUALQUIER reporte.
#     """
#     # 1. Obtener la configuración y costo del reporte desde nuestra fuente de verdad
#     report_config = REPORTS_CONFIG.get(report_key)
#     if not report_config:
#         raise HTTPException(status_code=404, detail=f"La configuración para el reporte '{report_key}' no fue encontrada.")
    
#     report_cost = report_config['costo']
#     is_pro_report = report_config['isPro']

#     # --- INICIO DE LA LÓGICA DE NEGOCIO Y SEGURIDAD ---

#     # 2. **GUARDIÁN DE ACCESO PRO:**
#     # Si el reporte es 'Pro' y no hay un 'user_id' (es decir, es un usuario anónimo), denegamos el acceso.
#     if is_pro_report and user_id is None:
#         print(f"🚫 Acceso denegado: Sesión anónima ({session_id}) intentó acceder al reporte PRO '{report_key}'.")
#         raise HTTPException(
#             status_code=403, # 403 Forbidden es el código correcto para "no tienes permiso"
#             detail="Este es un reporte 'Pro'. Debes registrarte y tener un plan activo para acceder."
#         )

#     # 3. **CAJERO:** Verificar créditos (esta lógica se mantiene, pero ahora es el segundo paso)
#     session_ref = db.collection('sesiones_anonimas').document(session_id)
#     session_doc = session_ref.get()
#     if not session_doc.exists:
#         raise HTTPException(status_code=404, detail="La sesión no existe.")
    
#     creditos_restantes = session_doc.to_dict().get("creditos_restantes", 0)
#     if creditos_restantes < report_cost:
#         raise HTTPException(status_code=402, detail=f"Créditos insuficientes. Este reporte requiere {report_cost} créditos y solo tienes {creditos_restantes}.")

#     # --- FIN DE LA LÓGICA DE NEGOCIO. PROCEDEMOS CON EL PROCESAMIENTO. ---
    
#     full_params_for_logging = dict(await request.form())
#     try:
#         # Descarga, lectura de archivos, y ejecución de la lógica de pandas
#         ventas_contents = descargar_contenido_de_storage(session_id, ventas_file_id)
#         inventario_contents = descargar_contenido_de_storage(session_id, inventario_file_id)
#         df_ventas = pd.read_csv(io.BytesIO(ventas_contents), sep=',')
#         df_inventario = pd.read_csv(io.BytesIO(inventario_contents), sep=',')

#         # Ejecutamos la función de procesamiento específica que nos pasaron
#         resultado_df = processing_function(df_ventas, df_inventario, **processing_params)
        
#         # # Transacción Exitosa: Descontar créditos y registrar
#         # session_ref.update({"creditos_restantes": firestore.Increment(-report_cost)})
#         # log_report_generation(
#         #     session_id=session_id, report_name=report_key, params=full_params_for_logging,
#         #     ventas_file_id=ventas_file_id, inventario_file_id=inventario_file_id,
#         #     creditos_consumidos=report_cost, estado="exitoso"
#         # )

#         if resultado_df.empty:
#             # Si el DataFrame está vacío, el reporte no tiene resultados.
#             print(f"⚠️ Reporte '{report_key}' generado pero sin resultados. No se cobrarán créditos.")
            
#             # Registramos el evento con costo 0.
#             log_report_generation(
#                 session_id=session_id, report_name=report_key, params=full_params_for_logging,
#                 ventas_file_id=ventas_file_id, inventario_file_id=inventario_file_id,
#                 creditos_consumidos=0, estado="exitoso_vacio"
#             )
#         else:
#             # Si el DataFrame SÍ tiene datos, procedemos con el cobro.
#             print(f"✅ Reporte '{report_key}' generado con {len(resultado_df)} filas. Cobrando {report_cost} créditos.")
            
#             # Descontamos créditos de forma atómica.
#             session_ref.update({"creditos_restantes": firestore.Increment(-report_cost)})
            
#             # Registramos la ejecución exitosa con su costo.
#             log_report_generation(
#                 session_id=session_id, report_name=report_key, params=full_params_for_logging,
#                 ventas_file_id=ventas_file_id, inventario_file_id=inventario_file_id,
#                 creditos_consumidos=report_cost, estado="exitoso"
#             )

#         # Llamamos a tu función personalizada, que ya devuelve un objeto BytesIO
#         output = to_excel_with_autofit(resultado_df, sheet_name=report_key)
        
#         return StreamingResponse(
#             output,
#             media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
#             headers={"Content-Disposition": f"attachment; filename={output_filename}"}
#         )

#     except Exception as e:
#         print(f"🔥 Error durante la generación del reporte para la sesión {session_id}: {e}")

#         user_message = "Ocurrió un error inesperado al procesar el reporte." # Mensaje por defecto
#         error_type = type(e).__name__
#         technical_details = str(e)

#         # "Traductor" de errores técnicos a mensajes amigables
#         if isinstance(e, KeyError):
#             user_message = f"La columna {technical_details} es necesaria pero no se encontró en uno de tus archivos. Por favor, revisa que el nombre de la columna sea exacto."
#         elif isinstance(e, ValueError):
#             user_message = "El formato de los datos en una de las columnas no es correcto. Revisa que las fechas (dd/mm/aaaa) y los valores numéricos sean válidos."
#         elif isinstance(e, FileNotFoundError): # Este podría venir de descargar_contenido_de_storage
#             user_message = "No se pudo encontrar uno de los archivos de datos en el servidor. Intenta volver a subirlo."
        
#         error_details = {
#             "user_message": user_message,
#             "error_type": error_type,
#             "technical_details": technical_details
#         }
        
#         # Registramos el intento fallido con los detalles del error
#         log_report_generation(
#             session_id=session_id, report_name=report_key, params=full_params_for_logging,
#             ventas_file_id=ventas_file_id, inventario_file_id=inventario_file_id,
#             creditos_consumidos=0, estado="fallido", error_details=error_details
#         )
        
#         # Devolvemos SOLO el mensaje amigable al usuario
#         raise HTTPException(status_code=500, detail=user_message)



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

