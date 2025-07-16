# firebase_helpers.py
import pandas as pd
from firebase_admin import firestore

from fastapi import UploadFile
from datetime import datetime, timezone
from typing import Optional, Dict, Any, Literal
from firebase_config import db, bucket
import os

def upload_to_storage(
    user_id: Optional[str],
    workspace_id: Optional[str],
    session_id: Optional[str],
    file_contents: bytes, 
    # --- CAMBIOS EN LA FIRMA ---
    tipo_archivo: Literal['inventario', 'ventas'],
    original_filename: str, # Aún lo necesitamos para la extensión
    content_type: str, 
    timestamp_str: str
) -> str:
    """
    Sube un archivo a Firebase Storage con un nombre estandarizado
    (ej: timestamp_inventario.csv) en lugar del nombre original.
    """
    try:
        # Extraemos la extensión del archivo original (ej: .csv, .xlsx)
        _, file_extension = os.path.splitext(original_filename)

        # CAMBIO CLAVE: Construimos el nombre del archivo estandarizado
        standard_filename = f"{timestamp_str}_{tipo_archivo}{file_extension}"
        
        blob_path = None

        if user_id and workspace_id:
            # Ruta para usuarios registrados
            blob_path = f"uploads/{user_id}/{standard_filename}"
        elif session_id:
            # Ruta para sesiones anónimas
            blob_path = f"uploads/{session_id}/{standard_filename}"
            base_ref = db.collection('sesiones_anonimas').document(session_id)
        else:
            print("🔥 Error de logging: No se proporcionó contexto (usuario/workspace o sesión).")
            return

        blob = bucket.blob(blob_path)

        # Sube el contenido directamente
        blob.upload_from_string(file_contents, content_type=content_type)

        print(f"Archivo estandarizado '{standard_filename}' subido a '{blob_path}'")
        return blob_path
    except Exception as e:
        print(f"Error al subir archivo a Storage: {e}")
        raise e

# --- NUEVA FUNCIÓN para extraer metadatos de forma robusta ---
def extraer_metadatos_df(df: pd.DataFrame, tipo_archivo: str) -> Dict[str, Any]:
    """
    Extrae un diccionario de metadatos de un DataFrame, limpiando los nombres de
    las columnas y generando tanto las listas completas como las vistas previas.
    """
    metadata = {}
    if df.empty:
        return metadata

    try:
        # --- SOLUCIÓN CLAVE: Limpiamos los nombres de las columnas ---
        # Esto elimina espacios en blanco al inicio o al final (ej: " Categoría " -> "Categoría")
        df.columns = df.columns.str.strip()

        if tipo_archivo == 'inventario':
            metadata['num_filas_total'] = int(len(df))
            
            col_sku = 'SKU / Código de producto'
            if col_sku in df.columns:
                metadata['num_skus_unicos'] = int(df[col_sku].nunique())

            col_cat = 'Categoría'
            if col_cat in df.columns:
                # Calculamos la lista completa una vez
                categorias_unicas = sorted(df[col_cat].dropna().unique().tolist())
                metadata['num_categorias_unicas'] = len(categorias_unicas)
                # Guardamos tanto la lista completa (para el frontend) como la vista previa (para el log)
                metadata['lista_completa_categorias'] = categorias_unicas
                # metadata['preview_categorias'] = categorias_unicas[:5]

            col_marca = 'Marca'
            if col_marca in df.columns:
                # Hacemos lo mismo para las marcas
                marcas_unicas = sorted(df[col_marca].dropna().unique().tolist())
                metadata['num_marcas_unicas'] = len(marcas_unicas)
                metadata['lista_completa_marcas'] = marcas_unicas
                # metadata['preview_marcas'] = marcas_unicas[:5]

        elif tipo_archivo == 'ventas':
            # La lógica para ventas se mantiene, pero se beneficia de la limpieza de columnas
            metadata['num_transacciones'] = int(len(df))
            
            col_receipt = 'N° de comprobante / boleta'
            if col_receipt in df.columns:
                metadata['num_receipts'] = int(df[col_receipt].nunique())

            col_fecha = 'Fecha de venta'
            if col_fecha in df.columns:
                fechas = pd.to_datetime(df[col_fecha], format='%d/%m/%Y', errors='coerce')
                fechas_validas = fechas.dropna()
                
                if not fechas_validas.empty:
                    fecha_min = fechas_validas.min()
                    fecha_max = fechas_validas.max()
                    metadata['fecha_primera_venta'] = fecha_min
                    metadata['fecha_ultima_venta'] = fecha_max
                    metadata['rango_dias_historico'] = int((fecha_max - fecha_min).days)
    
    except Exception as e:
        print(f"Advertencia: Ocurrió un error al extraer metadatos de tipo '{tipo_archivo}': {e}")
    
    return metadata

def log_file_upload_in_firestore(
    # --- Parámetros de contexto (todos opcionales) ---
    user_id: Optional[str],
    workspace_id: Optional[str],
    session_id: Optional[str],
    # --- Parámetros del archivo ---
    file_id: str,
    tipo_archivo: str,
    nombre_original: str,
    ruta_storage: str,
    metadata: dict,
    timestamp_obj: datetime,
) -> None:
    """
    Crea un documento para un archivo subido, construyendo la ruta correcta
    dependiendo si es un usuario registrado o una sesión anónima.
    """
    base_ref = None
    log_context_id = ""

    if user_id and workspace_id:
        # Ruta para usuarios registrados
        base_ref = db.collection('usuarios').document(user_id).collection('espacios_trabajo').document(workspace_id)
        log_context_id = f"usuario {user_id}"
    elif session_id:
        # Ruta para sesiones anónimas
        base_ref = db.collection('sesiones_anonimas').document(session_id)
        log_context_id = f"sesión {session_id}"
    else:
        print("🔥 Error de logging: No se proporcionó contexto (usuario/workspace o sesión).")
        return

    try:
        # La sub-colección siempre se llamará 'archivos_cargados'
        files_ref = base_ref.collection('archivos_cargados')

        file_data = {
            "fechaCarga": timestamp_obj,
            "tipoArchivo": tipo_archivo,
            "nombreOriginal": nombre_original,
            "rutaStorage": ruta_storage,
            "metadata": metadata
        }
        
        files_ref.document(file_id).set(file_data)
        
        print(f"✅ Registro de archivo '{file_id}' guardado en Firestore para {log_context_id}")

    except Exception as e:
        print(f"🔥 Error al registrar el archivo en Firestore para {log_context_id}: {e}")
        raise e


# --- FUNCIÓN DE LOGGING MODIFICADA para aceptar los metadatos ---
def log_analysis_in_firestore(
    session_id: str,
    report_name: str,
    timestamp_obj: datetime,
    sales_path: Optional[str] = None,
    inventory_path: Optional[str] = None,
    metadata_ventas: Optional[Dict[str, Any]] = None,
    metadata_inventario: Optional[Dict[str, Any]] = None
):
    """
    Registra los metadatos de un análisis, incluyendo la información extraída
    de los archivos, en una sub-colección de Firestore.
    """
    try:
        doc_id = f"{timestamp_obj.strftime('%Y-%m-%d_%H%M%S')}_{report_name}"
        historial_ref = db.collection('sesiones_anonimas').document(session_id).collection('historial_analisis')
        
        log_data = {
            "fecha": timestamp_obj,
            "reporteGenerado": report_name,
        }
        
        # Construye el objeto de metadatos de forma dinámica
        if inventory_path and metadata_inventario is not None:
            log_data['metadataInventario'] = {
                "rutaArchivo": inventory_path,
                **metadata_inventario # Desempaqueta el diccionario de metadatos aquí
            }
        
        if sales_path and metadata_ventas is not None:
            log_data['metadataVentas'] = {
                "rutaArchivo": sales_path,
                **metadata_ventas # Desempaqueta el diccionario de metadatos aquí
            }
        
        historial_ref.document(doc_id).set(log_data)
        print(f"Log de análisis enriquecido guardado en Firestore para la sesión '{session_id}'")

    except Exception as e:
        print(f"Error al registrar log enriquecido en Firestore: {e}")
        raise e


def descargar_contenido_de_storage(
    user_email: Optional[str],
    workspace_id: Optional[str],
    session_id: str,
    file_id: str
) -> bytes:
    """
    Descarga un archivo desde Storage, construyendo la ruta correcta
    dependiendo si es un usuario registrado o una sesión anónima.
    """
    if user_email and workspace_id:
        # Ruta para usuarios registrados
        base_path = db.collection('usuarios').document(user_email).collection('espacios_trabajo').document(workspace_id)
    elif session_id:
        # Ruta para sesiones anónimas
        base_path = db.collection('sesiones_anonimas').document(session_id)
    else:
        raise ValueError("Se debe proporcionar un contexto (usuario/workspace o sesión).")

    try:
        # 1. Obtener la ruta del archivo desde Firestore
        file_ref = base_path.collection('archivos_cargados').document(file_id).get()
        if not file_ref.exists:
            raise ValueError(f"No se encontró el archivo con ID '{file_id}' para esta sesión.")
        
        ruta_storage = file_ref.to_dict().get('rutaStorage')
        if not ruta_storage:
             raise ValueError(f"El registro del archivo con ID '{file_id}' no tiene una ruta de almacenamiento.")

        # 2. Descargar el contenido desde Storage
        blob = bucket.blob(ruta_storage)
        contents = blob.download_as_bytes()
        return contents

    except Exception as e:
        print(f"🔥 Error al descargar '{file_id}' desde Storage: {e}")
        raise e


def log_report_generation(
    report_name: str,
    params: Dict[str, Any],
    ventas_file_id: str,
    inventario_file_id: str,
    creditos_consumidos: int,
    estado: str,
    user_id: Optional[str] = None,
    workspace_id: Optional[str] = None,
    session_id: Optional[str] = None,
    error_details: Optional[Dict[str, str]] = None 
    # user_email: Optional[str], 
):
    """
    Registra la ejecución de un reporte, construyendo la ruta correcta en Firestore
    dependiendo si es un usuario registrado o una sesión anónima.
    """
    base_ref = None
    log_context_id = ""
    
    # --- LÓGICA DE DETERMINACIÓN DE CONTEXTO ---
    if user_id and workspace_id:
        # Ruta para usuarios registrados
        base_ref = db.collection('usuarios').document(user_id).collection('espacios_trabajo').document(workspace_id)
        log_context_id = f"usuario {user_id}"
    elif session_id:
        # Ruta para sesiones anónimas
        base_ref = db.collection('sesiones_anonimas').document(session_id)
        log_context_id = f"sesión {session_id}"
    else:
        # Si no hay contexto, no podemos registrar. Imprimimos una advertencia y salimos.
        print("🔥 Advertencia de Logging: No se proporcionó contexto (usuario/workspace o sesión) para registrar el reporte.")
        return

    try:
        now = datetime.now(timezone.utc)
        doc_id = f"{now.strftime('%Y-%m-%d_%H%M%S')}_{report_name}"
        
        # La sub-colección siempre se llamará 'reportes_generados'
        reports_ref = base_ref.collection('reportes_generados')

        log_data = {
            "fechaGeneracion": now,
            "nombreReporte": report_name,
            "parametrosUsados": params,
            "id_archivo_ventas": ventas_file_id,
            "id_archivo_inventario": inventario_file_id,
            "creditosConsumidos": creditos_consumidos,
            "estado": estado
        }
        
        if error_details:
            log_data["error_details"] = error_details
        
        reports_ref.document(doc_id).set(log_data)
        
        print(f"✅ Log de reporte '{report_name}' guardado para {log_context_id}. Estado: {estado}")

    except Exception as e:
        print(f"🔥 Error al registrar la generación del reporte para {log_context_id}: {e}")