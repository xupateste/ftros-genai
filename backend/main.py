import os
import uvicorn
import json
import asyncio
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm

from fastapi import Depends, FastAPI, UploadFile, File, Form, status, Header, Request, Body, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi import HTTPException
import pandas as pd
import traceback
import io
import math
import uuid
import httpx
import numpy as np
# --- Importaciones de nuestros nuevos módulos ---
from firebase_admin import firestore
from google.cloud.firestore_v1.base_query import FieldFilter
import firebase_config # Importar para asegurar que se inicialice
from firebase_helpers import db, upload_to_storage, log_analysis_in_firestore, extraer_metadatos_df, log_file_upload_in_firestore, descargar_contenido_de_storage, log_report_generation
from pydantic import BaseModel, Field
from io import StringIO
import openpyxl
from typing import Optional, Dict, Any, Literal, Callable # Any para pd.ExcelWriter
from datetime import datetime, timedelta, timezone # Para pd.Timestamp.now()
from track_expenses import process_csv, summarise_expenses, clean_data, get_top_expenses_by_month
from track_expenses import process_csv_abc, procesar_stock_muerto
from track_expenses import process_csv_puntos_alerta_stock, process_csv_reponer_stock
from track_expenses import process_csv_lista_basica_reposicion_historico, process_csv_analisis_estrategico_rotacion
from track_expenses import generar_reporte_maestro_inventario, auditar_margenes_de_productos_nuevo
from track_expenses import auditar_margenes_de_productos, diagnosticar_catalogo, auditar_calidad_datos
from track_expenses import generar_auditoria_inventario
from report_config import REPORTS_CONFIG
from plan_config import PLANS_CONFIG
from strategy_config import DEFAULT_STRATEGY
from tooltips_config import TOOLTIPS_GLOSSARY, KPI_TOOLTIPS_GLOSSARY

INITIAL_CREDITS = 25



# Leemos la variable de entorno. Si no existe, asumimos que estamos en 'development'.
ENVIRONMENT = os.environ.get("ENVIRONMENT", "development")

# Preparamos los argumentos para FastAPI
fastapi_kwargs = {
    "title": "Ferretero.IA API",
    "description": "API para análisis de datos de ferreterías.",
    "version": "1.0.0"
}

# Si estamos en producción, desactivamos la documentación
if ENVIRONMENT == "production":
    print("🚀 Iniciando en modo PRODUCCIÓN: La documentación de la API está desactivada.")
    fastapi_kwargs["docs_url"] = None
    fastapi_kwargs["redoc_url"] = None
    fastapi_kwargs["openapi_url"] = None
else:
    print("🔧 Iniciando en modo DESARROLLO: La documentación de la API está activa en /docs.")

# Inicializamos la aplicación con los argumentos correctos
app = FastAPI(**fastapi_kwargs)

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

# En tu main.py
@app.get("/healthcheck", status_code=200, tags=["Health"])
async def health_check():
    return {"status": "ok"}

@app.get("/reports-config", summary="Obtiene la configuración de los reportes disponibles", tags=["Configuración"])
async def get_reports_configuration():
    """
    Devuelve la lista de reportes disponibles con sus propiedades (costo, si es Pro, etc.).
    El frontend usará esto para construir dinámicamente la interfaz.
    """
    return JSONResponse(content={
            "reports": REPORTS_CONFIG,
            "tooltips": TOOLTIPS_GLOSSARY,
            "kpi_tooltips": KPI_TOOLTIPS_GLOSSARY
        })


# ===================================================================================
# --- CONFIGURACIÓN DE SEGURIDAD ---
# ===================================================================================

# Clave secreta para firmar los tokens. En producción, ¡debe estar en una variable de entorno!
SECRET_KEY = os.getenv("SECRET_KEY", "una-clave-secreta-muy-segura-para-desarrollo")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # Token válido por 7 días

# Configuración para el hasheo de contraseñas
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)

# ===================================================================================
# --- MODELOS DE DATOS (PYDANTIC) PARA USUARIOS Y TOKENS ---
# ===================================================================================
class User(BaseModel):
    email: str
    rol: str

class UserInDB(User):
    hashed_password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None


# ===================================================================================
# --- FUNCIONES AUXILIARES DE SEGURIDAD ---
# ===================================================================================

def verify_password(plain_password, hashed_password):
    """Verifica si una contraseña en texto plano coincide con su hash."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    """Genera el hash de una contraseña."""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Crea un nuevo token de acceso (JWT)."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

   
# ===================================================================================
# --- NUEVOS ENDPOINTS PARA GESTIONAR LOS WORKSPACES ---
# ===================================================================================
async def get_current_user(token: str = Depends(oauth2_scheme)):
    """
    Decodifica el token JWT para obtener la información del usuario.
    Esta función se usará en todos los endpoints protegidos.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudieron validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=email)
    except JWTError:
        raise credentials_exception
    
    user_ref = db.collection('usuarios').document(token_data.email)
    user_doc = user_ref.get()
    if not user_doc.exists:
        raise credentials_exception
        
    return user_doc.to_dict()

async def get_current_user_optional(token: Optional[str] = Depends(oauth2_scheme)) -> Optional[dict]:
    """
    Intenta obtener el usuario autenticado desde el token.
    Si no hay token, devuelve None sin causar un error.
    """
    # Si el frontend no envió una cabecera de autorización, el token será None
    if token is None:
        return None

    # Si hay un token, intentamos validarlo como antes
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token inválido o expirado",
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            return None # El token es válido pero no contiene la información esperada
        
        user_ref = db.collection('usuarios').document(email)
        user_doc = user_ref.get()
        if not user_doc.exists:
            return None # El usuario en el token ya no existe en la base de datos
            
        return user_doc.to_dict()
    except JWTError:
        # El token es inválido o ha expirado
        return None

def get_metadata_from_context(base_ref):
    """
    Lee los metadatos cacheados directamente desde los documentos de Firestore
    para una carga de estado ultra-rápida.
    """
    state = {
        "files": {"ventas": None, "inventario": None},
        "files_metadata": {"ventas": None, "inventario": None}
    }
    files_ref = base_ref.collection('archivos_cargados')

    # Buscamos el último archivo de ventas y leemos su metadata
    query_ventas = files_ref.where(filter=FieldFilter("tipoArchivo", "==", "ventas")).order_by("fechaCarga", direction="DESCENDING").limit(1).stream()
    last_venta_doc = next(query_ventas, None)
    if last_venta_doc:
        state["files"]["ventas"] = last_venta_doc.id
        ventas_metadata = last_venta_doc.to_dict().get("metadata", {})
        # --- CAMBIO CLAVE: Convertimos las fechas en los metadatos ANTES de guardarlos ---
        if 'fecha_primera_venta' in ventas_metadata and hasattr(ventas_metadata['fecha_primera_venta'], 'isoformat'):
            ventas_metadata['fecha_primera_venta'] = ventas_metadata['fecha_primera_venta'].isoformat()
        if 'fecha_ultima_venta' in ventas_metadata and hasattr(ventas_metadata['fecha_ultima_venta'], 'isoformat'):
            ventas_metadata['fecha_ultima_venta'] = ventas_metadata['fecha_ultima_venta'].isoformat()

        state["files_metadata"]["ventas"] = ventas_metadata
            
    # Buscamos el último archivo de inventario y leemos su metadata
    query_inventario = files_ref.where(filter=FieldFilter("tipoArchivo", "==", "inventario")).order_by("fechaCarga", direction="DESCENDING").limit(1).stream()
    last_inventario_doc = next(query_inventario, None)
    if last_inventario_doc:
        state["files"]["inventario"] = last_inventario_doc.id
        state["files_metadata"]["inventario"] = last_inventario_doc.to_dict().get("metadata", {})
        
    return state


# ===================================================================================
# --- FUNCIÓN DE AUDITORÍA ---
# ===================================================================================
# Esta sería tu función principal que genera la lista de tareas.
# La modificamos para que adjunte el conocimiento.
# def generar_auditoria_inventario(
#     df_ventas: pd.DataFrame,
#     df_inventario: pd.DataFrame,
#     **kwargs
# ) -> Dict[str, Any]:
#     """
#     Función principal que ejecuta una auditoría completa del inventario,
#     manejando correctamente la estructura de retorno de las sub-funciones.
#     """
#     tasks = []
    
#     # --- Lógica para detectar problemas ---

#     # 1. Análisis de Salud del Stock
#     # La función `procesar_stock_muerto` devuelve un diccionario.
#     resultado_salud = procesar_stock_muerto(df_ventas.copy(), df_inventario.copy())
#     # --- CAMBIO CLAVE: Extraemos el DataFrame de la clave "data" ---
#     df_salud = resultado_salud.get("data") if isinstance(resultado_salud, dict) else resultado_salud

#     # 2. Análisis de Importancia (ABC)
#     resultado_abc = process_csv_abc(df_ventas.copy(), df_inventario.copy(), criterio_abc='margen', periodo_abc=6)
#     df_abc = resultado_abc.get("data") if isinstance(resultado_abc, dict) else resultado_abc
#     # print(f"df_abc {df_abc}")

#     # --- Tarea 1: Encontrar productos Clase A sin stock ---
#     if df_abc is not None and not df_abc.empty:
#         # df_inventario['SKU / Código de producto'] = df_inventario['SKU / Código de producto'].astype(str).str.strip()
#         # df_abc['SKU / Código de producto'] = df_abc['SKU / Código de producto'].astype(str).str.strip()
#         productos_clase_a = df_abc[df_abc['Clasificación ABC'] == 'A']['SKU / Código de producto']
#         df_inventario_a = df_abc[df_abc['SKU / Código de producto'].isin(productos_clase_a)].copy()
#         df_inventario_a['Cantidad en stock actual'] = pd.to_numeric(df_inventario_a['Cantidad en stock actual'], errors='coerce').fillna(0)
#         clase_a_sin_stock = df_inventario_a[df_inventario_a['Cantidad en stock actual'] <= 0]
#         if not clase_a_sin_stock.empty:
#             preview_df = clase_a_sin_stock.head(3)
#             preview_df_clean = preview_df.replace([np.inf, -np.inf], np.nan)
#             preview_data_safe = preview_df_clean.where(pd.notna(preview_df_clean), None).to_dict(orient='records')
#             venta_perdida_estimada = 5800 # Placeholder
#             tasks.append({
#                 "id": "task_quiebre_stock_a", "type": "error",
#                 "title": f"Tienes {len(clase_a_sin_stock)} productos 'Clase A' con stock en cero.",
#                 "impact": f"Riesgo de venta perdida: S/ {venta_perdida_estimada:,.2f} este mes.",
#                 "solution_button_text": "Ver Productos y Generar Plan de Compra",
#                 "target_report": "ReporteListaBasicaReposicionHistorica",
#                 "knowledge": AUDIT_KNOWLEDGE_BASE.get("quiebre_stock_clase_a"),
#                 "preview_data": preview_data_safe # Usamos los datos ya limpios
#             })

#     # --- Tarea 2: Encontrar stock muerto de alto valor ---
#     if df_salud is not None and not df_salud.empty:
#         # Usamos el nombre de columna interno 'clasificacion' que devuelve la función
#         # df_muerto = df_resultado[df_resultado['clasificacion'].isin(["Stock Muerto", "Nunca Vendido con Stock"])].copy()
#         df_stock_muerto = df_salud[df_salud['Clasificación Diagnóstica'].isin(["Stock Muerto", "Nunca Vendido con Stock"])].copy()
#         if not df_stock_muerto.empty:
#             capital_inmovilizado = df_stock_muerto['Valor stock (S/.)'].sum()
#             task = {
#                 "id": "task_stock_muerto_valor", "type": "warning",
#                 "title": f"Tienes {len(df_stock_muerto)} productos con más de 180 días sin ventas.",
#                 "impact": f"Capital inmovilizado: S/ {capital_inmovilizado:,.2f}.",
#                 "solution_button_text": "Ver Productos y Crear Plan de Liquidación",
#                 "target_report": "ReporteDiagnosticoStockMuerto",
#                 "knowledge": AUDIT_KNOWLEDGE_BASE.get("stock_muerto_alto_valor"),
#                 "preview_data": df_stock_muerto.head(3).to_dict(orient='records')
#             }
#             tasks.append(task)

#     # --- CÁLCULO DE KPIs Y PUNTAJE ---
#     puntaje_salud = 62 # Placeholder
#     kpis_dolor = {
#         "Capital Inmovilizado": f"S/ {capital_inmovilizado:,.2f}" if 'capital_inmovilizado' in locals() else "S/ 0.00",
#         "Venta Perdida Potencial": f"S/ {venta_perdida_estimada:,.2f}" if 'venta_perdida_estimada' in locals() else "S/ 0.00",
#         "Margen Bruto Congelado": "S/ 9,200" # Placeholder
#     }

#     return {
#         "puntaje_salud": puntaje_salud,
#         "kpis_dolor": kpis_dolor,
#         "plan_de_accion": tasks
#     }

# @app.post("/auditoria-inventario", summary="Ejecuta la auditoría de eficiencia de inventario", tags=["Auditoría"])
# async def ejecutar_auditoria_inventario(
#     # ... (tus parámetros de contexto y file_ids)
#     request: Request, 
#     current_user: Optional[dict] = Depends(get_current_user_optional),
#     X_Session_ID: str = Header(..., alias="X-Session-ID"),
#     workspace_id: Optional[str] = Form(None),
#     ventas_file_id: str = Form(...),
#     inventario_file_id: str = Form(...)
# ):
#     # ... (tu lógica para cargar los DataFrames)
#     df_ventas = pd.DataFrame() # Default: DataFrame vacío
#     df_inventario = pd.DataFrame() # Default: DataFrame vacío
        
#     # Llamamos a la función que genera las tareas enriquecidas
#     auditoria_result = generar_auditoria_inventario(df_ventas, df_inventario)
#     print(f"auditoria_result {auditoria_result}")
    
#     return JSONResponse(content=auditoria_result)

def clean_for_json(obj: Any) -> Any:
    """
    Recorre recursivamente un objeto (diccionarios, listas) y reemplaza
    los valores no compatibles con JSON (NaN, inf) por None.
    """
    if isinstance(obj, dict):
        return {k: clean_for_json(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [clean_for_json(elem) for elem in obj]
    # Usamos pd.isna() porque es más robusto y maneja NaN de numpy, float y pandas
    elif pd.isna(obj):
        return None
    elif isinstance(obj, float) and np.isinf(obj):
        return None
    return obj

def _parse_kpi_value(kpi_string: str) -> float:
    """Extrae el valor numérico de un string de KPI (ej. 'S/ 1,234.56' -> 1234.56)."""
    try:
        # Elimina el prefijo 'S/ ', las comas y convierte a float.
        return float(kpi_string.replace("S/ ", "").replace(",", ""))
    except (ValueError, AttributeError):
        # Si no es un string de moneda o ya es un número, lo devuelve tal cual.
        return float(kpi_string) if isinstance(kpi_string, (int, float, str)) and str(kpi_string).replace('.','',1).isdigit() else 0.0


def comparar_auditorias(actual: Dict[str, Any], previa: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Compara dos resultados de auditoría y genera el 'Informe de Evolución'.
    """
    if not previa:
        # Si no hay auditoría previa, devolvemos un informe base sin comparación.
        return {
            "tipo": "inicial",
            "puntaje_actual": actual.get("puntaje_salud"),
            "kpis_con_delta": {k: {"actual": v, "delta": None} for k, v in actual.get("kpis_dolor", {}).items()},
            # "log_eventos": {
            #     "nuevos_problemas": actual.get("plan_de_accion", []),
            #     "problemas_resueltos": []
            # },
            "plan_de_accion": actual.get("plan_de_accion", [])
        }

    # --- Componente 1: El "Antes y Después" Cuantificado ---
    kpis_con_delta = {}
    kpis_actuales = actual.get("kpis_dolor", {})
    kpis_previos = previa.get("kpis_dolor", {})

    for key, current_value_str in kpis_actuales.items():
        previous_value_str = kpis_previos.get(key, "0")
        
        current_value = _parse_kpi_value(current_value_str)
        previous_value = _parse_kpi_value(previous_value_str)
        
        delta = current_value - previous_value
        
        kpis_con_delta[key] = {
            "actual": current_value_str,
            "delta": f"{delta:,.2f}"
        }

    puntaje_delta = actual.get("puntaje_salud", 0) - previa.get("puntaje_salud", 0)

    # --- Componente 2: El "Log de Eventos de Negocio" ---
    tareas_actuales_ids = {task['id'] for task in actual.get("plan_de_accion", [])}
    tareas_previas_ids = {task['id'] for task in previa.get("plan_de_accion", [])}

    nuevos_problemas_ids = tareas_actuales_ids - tareas_previas_ids
    problemas_resueltos_ids = tareas_previas_ids - tareas_actuales_ids

    nuevos_problemas = [task for task in actual.get("plan_de_accion", []) if task['id'] in nuevos_problemas_ids]
    problemas_resueltos = [task for task in previa.get("plan_de_accion", []) if task['id'] in problemas_resueltos_ids]

    return {
        "tipo": "evolucion",
        "puntaje_actual": actual.get("puntaje_salud"),
        "puntaje_delta": f"{puntaje_delta:+}", # Añade el signo + o -
        "kpis_con_delta": kpis_con_delta,
        "log_eventos": {
            "nuevos_problemas": nuevos_problemas,
            "problemas_resueltos": problemas_resueltos
        },
        "plan_de_accion": actual.get("plan_de_accion", [])
    }

# Funcionando antes del push
# @app.post("/auditoria-inicial", summary="Ejecuta la auditoría de eficiencia inicial", tags=["Auditoría"])
# async def ejecutar_auditoria_inicial(
#     request: Request,
#     current_user: Optional[dict] = Depends(get_current_user_optional),
#     X_Session_ID: Optional[str] = Header(None, alias="X-Session-ID"),
#     workspace_id: Optional[str] = Form(None),
#     ventas_file_id: str = Form(...),
#     inventario_file_id: str = Form(...)
# ):
#     """
#     Este endpoint se dedica a ejecutar la auditoría inicial.
#     Llama a la función de lógica directamente porque su formato de respuesta es diferente.
#     """
#     # 1. Determinamos el contexto
#     user_id = current_user['email'] if current_user else None
#     if user_id and not workspace_id:
#         raise HTTPException(status_code=400, detail="Se requiere un 'workspace_id' para usuarios autenticados.")
    
#     try:
#         # 2. Cargamos los DataFrames
#         ventas_contents = await descargar_contenido_de_storage(user_id, workspace_id, X_Session_ID, ventas_file_id)
#         inventario_contents = await descargar_contenido_de_storage(user_id, workspace_id, X_Session_ID, inventario_file_id)
#         df_ventas = pd.read_csv(io.BytesIO(ventas_contents))
#         df_inventario = pd.read_csv(io.BytesIO(inventario_contents))

#         # 3. Llamamos a la función de lógica que devuelve el resumen
#         auditoria_result_raw = generar_auditoria_inventario(df_ventas, df_inventario)
        
#         auditoria_result_clean = clean_for_json(auditoria_result_raw)

#         return JSONResponse(content=auditoria_result_clean)

#     except Exception as e:
#         traceback.print_exc()
#         raise HTTPException(status_code=500, detail=f"Ocurrió un error crítico durante la auditoría: {e}")
#

@app.post("/auditoria-inicial", summary="Ejecuta la auditoría de eficiencia inicial", tags=["Auditoría"])
async def ejecutar_auditoria_inicial(
    request: Request,
    current_user: Optional[dict] = Depends(get_current_user_optional),
    X_Session_ID: Optional[str] = Header(None, alias="X-Session-ID"),
    workspace_id: Optional[str] = Form(None),
    ventas_file_id: str = Form(...),
    inventario_file_id: str = Form(...)
):
    """
    Este endpoint se dedica a ejecutar la auditoría inicial.
    Llama a la función de lógica directamente porque su formato de respuesta es diferente.
    """
    # 1. Determinamos el contexto
    user_id = current_user['email'] if current_user else None
    if user_id and not workspace_id:
        raise HTTPException(status_code=400, detail="Se requiere un 'workspace_id' para usuarios autenticados.")
    
    try:
        # 2. Cargamos los DataFrames
        ventas_contents = await descargar_contenido_de_storage(user_id, workspace_id, X_Session_ID, ventas_file_id)
        inventario_contents = await descargar_contenido_de_storage(user_id, workspace_id, X_Session_ID, inventario_file_id)
        df_ventas = pd.read_csv(io.BytesIO(ventas_contents))
        df_inventario = pd.read_csv(io.BytesIO(inventario_contents))

        # 3. Llamamos a la función de lógica que devuelve el resumen
        auditoria_actual = generar_auditoria_inventario(df_ventas, df_inventario)
        now_iso = datetime.now(timezone.utc).isoformat()
        auditoria_actual["fecha"] = now_iso

        # --- FASE 2: Búsqueda de la Auditoría Previa ---
        if user_id and workspace_id:
            base_ref = db.collection('usuarios').document(user_id).collection('espacios_trabajo').document(workspace_id)
        elif X_Session_ID:
            base_ref = db.collection('sesiones_anonimas').document(X_Session_ID)
        
        auditorias_ref = base_ref.collection('auditorias_historicas')
        query = auditorias_ref.order_by("fecha", direction=firestore.Query.DESCENDING).limit(1)
        
        auditoria_previa_doc = next(query.stream(), None)
        auditoria_previa = auditoria_previa_doc.to_dict() if auditoria_previa_doc else None

        # 3. Comparamos y generamos el informe de evolución
        informe_evolucion_raw = comparar_auditorias(auditoria_actual, auditoria_previa)

        # --- CAMBIO CLAVE: Aplicamos el "Control de Calidad" Final ---
        print("Ejecutando limpieza profunda en el Informe de Evolución...")
        informe_evolucion_clean = clean_for_json(informe_evolucion_raw)
        print("✅ Limpieza completada.")
        
        # 4. Guardamos la auditoría actual (la versión "cruda", antes de la limpieza)
        auditorias_ref.document(now_iso.replace(":", "-")).set(auditoria_actual)
        
        # 5. Devolvemos el resultado ya limpio
        return JSONResponse(content=informe_evolucion_clean)

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Ocurrió un error crítico durante la auditoría: {e}")




# --- ENDPOINT 1: El "Comparador de Versiones" (Rápido) ---
@app.get("/auditoria/status", summary="Verifica si la última auditoría está actualizada", tags=["Auditoría"])
async def get_audit_status(
    # La firma de la función recibe el contexto del usuario
    current_user: Optional[dict] = Depends(get_current_user_optional),
    X_Session_ID: Optional[str] = Header(None, alias="X-Session-ID"),
    workspace_id: Optional[str] = Query(None)
):
    """
    Compara los archivos actuales con los usados en la última auditoría guardada
    y devuelve el estado: 'up_to_date' (con datos) o 'outdated'.
    """
    try:
        # 1. Identificar el contexto y la referencia base
        user_id = current_user['email'] if current_user else None
        if user_id and not workspace_id:
            raise HTTPException(status_code=400, detail="Se requiere un 'workspace_id' para usuarios autenticados.")
        
        if user_id:
            base_ref = db.collection('usuarios').document(user_id).collection('espacios_trabajo').document(workspace_id)
        elif X_Session_ID:
            base_ref = db.collection('sesiones_anonimas').document(X_Session_ID)
        else:
            raise HTTPException(status_code=401, detail="No se proporcionó contexto de autenticación.")

        # 2. Buscar los IDs de los últimos archivos subidos
        files_ref = base_ref.collection('archivos_cargados')
        last_venta_doc = next(files_ref.where("tipoArchivo", "==", "ventas").order_by("fechaCarga", direction="DESCENDING").limit(1).stream(), None)
        last_inventario_doc = next(files_ref.where("tipoArchivo", "==", "inventario").order_by("fechaCarga", direction="DESCENDING").limit(1).stream(), None)
        
        current_venta_id = last_venta_doc.id if last_venta_doc else None
        current_inventario_id = last_inventario_doc.id if last_inventario_doc else None

        # 3. Buscar la última auditoría guardada
        audit_ref = base_ref.collection('auditorias').document('latest')
        last_audit_doc = audit_ref.get()

        if not last_audit_doc.exists:
            return JSONResponse(content={"status": "outdated", "data": None})

        last_audit_data_raw = last_audit_doc.to_dict()
        
        # --- CAMBIO CLAVE: Aplicamos el "Control de Calidad" a los datos del caché ---
        print("Limpiando datos de la auditoría cacheada...")
        last_audit_data_clean = clean_for_json(last_audit_data_raw)
        print("✅ Limpieza completada.")

        source_files = last_audit_data_clean.get("source_files", {})

        # 4. La Comparación Inteligente
        if source_files.get("ventas_id") == current_venta_id and source_files.get("inventario_id") == current_inventario_id:
            return JSONResponse(content={"status": "up_to_date", "data": last_audit_data_clean})
        else:
            return JSONResponse(content={"status": "outdated", "data": last_audit_data_clean})

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error al verificar estado de auditoría: {e}")



# --- ENDPOINT 2: La Ejecución "Bajo Demanda" (Pesado) ---
@app.post("/auditoria/run", summary="Ejecuta una nueva auditoría, la compara y la guarda", tags=["Auditoría"])
async def run_new_audit(
    request: Request,
    current_user: Optional[dict] = Depends(get_current_user_optional),
    X_Session_ID: Optional[str] = Header(None, alias="X-Session-ID"),
    workspace_id: Optional[str] = Form(None),
    ventas_file_id: str = Form(...),
    inventario_file_id: str = Form(...)
):
    """
    Ejecuta la función pesada `generar_auditoria_inventario`, la compara con la
    versión anterior, guarda el nuevo resultado y lo devuelve al frontend.
    """
    user_id = current_user['email'] if current_user else None
    if user_id and not workspace_id:
        raise HTTPException(status_code=400, detail="Se requiere un 'workspace_id' para usuarios autenticados.")
    
    try:
        # 1. Cargar los DataFrames
        # ... (tu lógica para `descargar_contenido_de_storage` y crear `df_ventas` y `df_inventario`)
        ventas_contents = await descargar_contenido_de_storage(user_id, workspace_id, X_Session_ID, ventas_file_id)
        inventario_contents = await descargar_contenido_de_storage(user_id, workspace_id, X_Session_ID, inventario_file_id)
        df_ventas = pd.read_csv(io.BytesIO(ventas_contents))
        df_inventario = pd.read_csv(io.BytesIO(inventario_contents))
        
        # 2. Ejecutar la auditoría actual
        auditoria_actual = generar_auditoria_inventario(df_ventas, df_inventario)
        now_iso = datetime.now(timezone.utc).isoformat()
        auditoria_actual["fecha"] = now_iso
        auditoria_actual["source_files"] = { "ventas_id": ventas_file_id, "inventario_id": inventario_file_id }

        # 3. Buscar la auditoría previa para la comparación
        if user_id and workspace_id:
            base_ref = db.collection('usuarios').document(user_id).collection('espacios_trabajo').document(workspace_id)
        elif X_Session_ID:
            base_ref = db.collection('sesiones_anonimas').document(X_Session_ID)
        
        audit_ref = base_ref.collection('auditorias').document('latest')
        auditoria_previa = audit_ref.get().to_dict() if audit_ref.get().exists else None

        # 4. Generar el Informe de Evolución
        informe_evolucion_raw = comparar_auditorias(auditoria_actual, auditoria_previa)
        informe_evolucion_clean = clean_for_json(informe_evolucion_raw)

        # 5. Guardar el nuevo resultado, sobrescribiendo el anterior
        audit_ref.set(auditoria_actual)

        return JSONResponse(content=informe_evolucion_clean)

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Ocurrió un error crítico durante la auditoría: {e}")


# ===================================================================================
# --- MODELOS DE DATOS ---
# ===================================================================================

# --- NUEVO MODELO DE DATOS PARA ONBOARDING ---
class OnboardingData(BaseModel):
    """Define la estructura de datos que esperamos recibir del formulario de onboarding."""
    rol: str = Field(..., description="El rol seleccionado por el usuario (e.g., 'dueño', 'consultor').")

# --- MODELO DE DATOS PARA VALIDAR LA ESTRATEGIA ---
class StrategyData(BaseModel):
    score_ventas: int = Field(..., ge=1, le=10)
    score_ingreso: int = Field(..., ge=1, le=10)
    score_margen: int = Field(..., ge=1, le=10)
    score_dias_venta: int = Field(..., ge=1, le=10)
    lead_time_dias: int = Field(..., ge=0)
    dias_cobertura_ideal_base: int = Field(..., ge=1)
    dias_seguridad_base: int = Field(..., ge=0)
    dias_analisis_ventas_recientes: int = Field(..., ge=1)
    dias_analisis_ventas_general: int = Field(..., ge=1)
    excluir_sin_ventas: str
    peso_ventas_historicas: float = Field(..., ge=0, le=1)


# ===================================================================================
# --- AUDITORIA DE CREDITOS ---
# ===================================================================================
@app.post("/admin/recharge", summary="[ADMIN] Recarga créditos a un usuario", tags=["Administración"])
async def admin_recharge_credits(
    secret_key: str = Form(...),
    user_email: str = Form(...),
    credits_to_add: int = Form(...),
    reason: Optional[str] = Form("Recarga manual de administrador")
):
    """
    Endpoint privado para que el administrador añada créditos a una cuenta de usuario.
    Requiere una clave secreta para la autorización.
    """
    # 1. Verificación de la "Llave Maestra"
    # La clave se lee de una variable de entorno para máxima seguridad.
    ADMIN_KEY = os.environ.get("ADMIN_SECRET_KEY")
    if not ADMIN_KEY or secret_key != ADMIN_KEY:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado: Clave secreta inválida.")

    # 2. Lógica de Recarga
    try:
        user_ref = db.collection('usuarios').document(user_email)
        user_doc = user_ref.get()

        if not user_doc.exists:
            raise HTTPException(status_code=404, detail=f"Usuario '{user_email}' no encontrado.")

        # Usamos una transacción para seguridad y consistencia
        @firestore.transactional
        def recharge_transaction(transaction, user_ref):
            # Incrementamos los créditos del usuario
            transaction.update(user_ref, {
                "creditos_iniciales": firestore.Increment(credits_to_add),
                "creditos_restantes": firestore.Increment(credits_to_add)
            })
            
            # Creamos un registro de auditoría
            audit_ref = user_ref.collection('auditoria_creditos').document()
            transaction.set(audit_ref, {
                "fecha": datetime.now(timezone.utc),
                "cantidad": credits_to_add,
                "motivo": reason,
                "tipo": "recarga_admin"
            })

        transaction = db.transaction()
        recharge_transaction(transaction, user_ref)
        
        print(f"✅ RECARGA ADMIN: Se añadieron {credits_to_add} créditos a {user_email}.")
        return {"message": f"Éxito: Se han añadido {credits_to_add} créditos a la cuenta de {user_email}."}

    except Exception as e:
        print(f"🔥 ERROR ADMIN RECHARGE: {e}")
        raise HTTPException(status_code=500, detail="Ocurrió un error al procesar la recarga.")



# ===================================================================================
# --- ENDPOINTS DE AUTENTICACIÓN ---
# ===================================================================================
@app.post("/register", summary="Registra un nuevo usuario y crea su primer espacio de trabajo", tags=["Usuarios"])
async def register_user(
    request: Request,
    email: str = Form(...),
    password: str = Form(...),
    rol: str = Form(...),
    # La sesión anónima sigue siendo opcional, para una futura migración de datos
    X_Session_ID: Optional[str] = Header(None, alias="X-Session-ID")
):
    """
    Crea una nueva cuenta de usuario y, crucialmente, inicializa su primer
    espacio de trabajo con una estrategia por defecto.
    """
    user_ref = db.collection('usuarios').document(email)
    if user_ref.get().exists:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe un usuario con este correo electrónico.",
        )

    # --- Lógica de Geolocalización (idéntica a la de sesiones anónimas) ---
    client_ip = request.client.host
    geoloc_data = {"ip": client_ip, "status": "desconocido"}
    if client_ip and client_ip not in ["127.0.0.1", "testclient"]:
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"http://ip-api.com/json/{client_ip}")
                response.raise_for_status()
                api_data = response.json()
                if api_data.get("status") == "success":
                    geoloc_data = {
                        "ip": api_data.get("query"), "pais": api_data.get("country"),
                        "ciudad": api_data.get("city"), "region": api_data.get("regionName"),
                        "isp": api_data.get("isp"), "status": "exitoso"
                    }
        except httpx.RequestError as e:
            print(f"🔥 Advertencia: No se pudo geolocalizar al nuevo usuario {email}. Error: {e}")
      
        
    hashed_password = get_password_hash(password)
    now_utc = datetime.now(timezone.utc)

    # Datos principales del usuario
    new_user_data = {
        "email": email,
        "rol": rol,
        "hashed_password": hashed_password,
        "fechaRegistro": now_utc,
        "creditos_iniciales": 25, # Bono de bienvenida para usuarios registrados
        "creditos_restantes": 25, # Bono de bienvenida para usuarios registrados
        "plan": "gratis",
        "estrategia_global": DEFAULT_STRATEGY,
        "geolocalizacion_registro": geoloc_data
    }
    
    # --- LÓGICA CLAVE: CREACIÓN DEL PRIMER ESPACIO DE TRABAJO ---
    # Creamos la referencia al nuevo documento del usuario
    batch = db.batch()
    batch.set(user_ref, new_user_data)

    # Creamos la referencia a la sub-colección de espacios de trabajo
    workspaces_ref = user_ref.collection('espacios_trabajo')
    
    # Creamos el primer espacio de trabajo por defecto
    default_workspace_data = {
        "nombre": "Mi Primera Ferretería",
        "fechaCreacion": now_utc,
        "fechaUltimoAcceso": now_utc,
        "fechaUltimoAcceso": now_utc,
        "isPinned": False # Inicializamos el campo de fijado
    }
    # Creamos un nuevo documento para el espacio de trabajo
    # (podríamos usar un ID autogenerado o uno predecible)
    new_workspace_ref = workspaces_ref.document("default_workspace")
    batch.set(new_workspace_ref, default_workspace_data)
    
    # Aquí iría la lógica para migrar los archivos de la sesión anónima (si existe X_Session_ID)
    # a la sub-colección 'archivos_cargados' de este nuevo espacio de trabajo.
    
    # Ejecutamos todas las operaciones en una sola transacción
    batch.commit()

    return {"message": "Usuario registrado exitosamente. Tu primer espacio de trabajo 'Mi Primera Ferretería' ha sido creado."}


@app.post("/token", response_model=Token, summary="Inicia sesión y obtiene un token", tags=["Usuarios"])
async def login_for_access_token(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends()
):
    """
    Autentica a un usuario y devuelve un token JWT para usar en las siguientes peticiones.
    FastAPI usa el campo 'username' para el email.
    """
    email = form_data.username
    password = form_data.password

    user_ref = db.collection('usuarios').document(email)
    user_doc = user_ref.get()

    if not user_doc.exists:
        raise HTTPException(status_code=400, detail="Correo o contraseña incorrectos")

    # --- Lógica de Geolocalización al iniciar sesión ---
    client_ip = request.client.host
    if client_ip and client_ip not in ["127.0.0.1", "testclient"]:
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"http://ip-api.com/json/{client_ip}")
                if response.status_code == 200:
                    api_data = response.json()
                    if api_data.get("status") == "success":
                        geoloc_data = {
                            "ip": api_data.get("query"), "pais": api_data.get("country"),
                            "ciudad": api_data.get("city"), "region": api_data.get("regionName"),
                            "timestamp": datetime.now(timezone.utc) # <-- Añadimos un timestamp
                        }
                        # Actualizamos el documento del usuario con la nueva ubicación
                        user_ref.update({"geolocalizacion_ultimo_login": geoloc_data})
                        print(f"✅ Ubicación de login actualizada para {email}.")
        except httpx.RequestError as e:
            print(f"🔥 Advertencia: No se pudo geolocalizar el login del usuario {email}. Error: {e}")

    user_data = user_doc.to_dict()
    if not verify_password(password, user_data.get("hashed_password")):
        raise HTTPException(status_code=400, detail="Correo o contraseña incorrectos")

    # Si la autenticación es exitosa, creamos el token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user_data["email"]}, expires_delta=access_token_expires
    )

    return {"access_token": access_token, "token_type": "bearer"}



# ===================================================================================
# --- NUEVO ENDPOINT PARA CREAR SESIONES ---
# ===================================================================================
@app.post("/sessions", summary="Crea una sesión y devuelve su estado inicial", tags=["Sesión"])
async def create_analysis_session(
    request: Request, # Inyectamos el objeto Request para obtener la IP
    onboarding_data: OnboardingData
):
    """
    Inicia una nueva sesión, la guarda en Firestore, y devuelve el ID
    junto con la estrategia por defecto para evitar una segunda llamada a la API.
    """
    try:
        session_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)


        # --- INICIO DE LA LÓGICA DE GEOLOCALIZACIÓN ---
    
        # Obtenemos la IP del cliente desde el objeto Request
        client_ip = request.client.host
        geoloc_data = {"ip": client_ip, "status": "desconocido"}

        # Evitamos llamar a la API para IPs locales o de prueba
        if client_ip and client_ip not in ["127.0.0.1", "testclient"]:
            try:
                # Usamos httpx para hacer una llamada asíncrona a la API de geolocalización
                async with httpx.AsyncClient() as client:
                    response = await client.get(f"http://ip-api.com/json/{client_ip}")
                    response.raise_for_status() # Lanza un error si la respuesta no es 2xx
                    
                    # Guardamos los datos si la petición fue exitosa
                    api_data = response.json()
                    if api_data.get("status") == "success":
                        geoloc_data = {
                            "ip": api_data.get("query"),
                            "pais": api_data.get("country"),
                            "ciudad": api_data.get("city"),
                            "region": api_data.get("regionName"),
                            "isp": api_data.get("isp"),
                            "status": "exitoso"
                        }
                    else:
                        geoloc_data["status"] = "fallido_api"
                        geoloc_data["error_message"] = api_data.get("message")

            except httpx.RequestError as e:
                print(f"🔥 Error de red al consultar la API de geolocalización: {e}")
                geoloc_data["status"] = "fallido_red"
                geoloc_data["error_message"] = str(e)
        
        # --- FIN DE LA LÓGICA DE GEOLOCALIZACIÓN ---


        session_ref = db.collection('sesiones_anonimas').document(session_id)
        
        session_log = {
            "fechaCreacion": now,
            "onboardingData": {"rol": onboarding_data.rol},
            "ultimoAcceso": now,
            "creditos_iniciales": INITIAL_CREDITS,
            "creditos_restantes": INITIAL_CREDITS,
            "estrategia": DEFAULT_STRATEGY,
            "geolocalizacion": geoloc_data # <-- Guardamos el nuevo objeto en Firestore
        }
        
        session_ref.set(session_log)
        
        print(f"✅ Nueva sesión creada para IP {client_ip} desde {geoloc_data.get('ciudad', 'N/A')}. ID: {session_id}")
        
        # --- CAMBIO CLAVE: Devolvemos tanto el ID como la estrategia ---
        return JSONResponse(content={
            "sessionId": session_id,
            "strategy": DEFAULT_STRATEGY
        })

    except Exception as e:
        print(f"🔥 Error al crear la sesión en Firestore: {e}")
        raise HTTPException(status_code=500, detail="No se pudo crear la sesión en el servidor.")

# ===================================================================================
# --- NUEVO ENDPOINT PARA RECUPERAR EL ESTADO DE LA SESIÓN ---
# ===================================================================================
@app.get("/session-state", summary="Recupera los créditos y el historial para una sesión", tags=["Sesión"])
async def get_session_state(
    X_Session_ID: str = Header(..., alias="X-Session-ID")
):
    """
    Obtiene el estado completo de una sesión anónima, incluyendo créditos,
    historial y metadatos de archivos, con un manejo de fechas robusto.
    """
    if not X_Session_ID:
        raise HTTPException(status_code=400, detail="La cabecera X-Session-ID es requerida.")

    try:
        session_ref = db.collection('sesiones_anonimas').document(X_Session_ID)
        session_doc = session_ref.get()

        if not session_doc.exists:
            raise HTTPException(status_code=404, detail="La sesión no existe o ha expirado.")

        session_data = session_doc.to_dict()
        
        # --- 1. Obtener créditos ---
        creditos_restantes = session_data.get("creditos_restantes", 0)
        creditos_usados = session_data.get("creditos_iniciales", 20) - creditos_restantes
        credits_data = {"used": creditos_usados, "remaining": creditos_restantes}

        # --- 2. Obtener el historial de reportes ---
        historial_ref = session_ref.collection('reportes_generados')
        query = historial_ref.order_by("fechaGeneracion", direction=firestore.Query.DESCENDING).limit(10)
        
        historial_list = []
        for doc in query.stream():
            doc_data = doc.to_dict()
            # Usamos hasattr para una conversión de fecha segura
            if 'fechaGeneracion' in doc_data and hasattr(doc_data['fechaGeneracion'], 'isoformat'):
                doc_data['fechaGeneracion'] = doc_data['fechaGeneracion'].isoformat()
            historial_list.append(doc_data)

        # --- 3. Obtener metadatos de archivos (Lógica Optimizada) ---
        files_ref = session_ref.collection('archivos_cargados')
        
        files_map = {"ventas": None, "inventario": None}
        date_range_bounds = None
        available_filters = {"categorias": [], "marcas": []}

        # Usamos la sintaxis posicional estable para las consultas
        query_ventas = files_ref.where(filter=FieldFilter("tipoArchivo", "==", "ventas")).order_by("fechaCarga", direction="DESCENDING").limit(1).stream()
        last_venta_doc = next(query_ventas, None)
        if last_venta_doc:
            files_map["ventas"] = last_venta_doc.id
            metadata = last_venta_doc.to_dict().get("metadata", {})
        
        query_inventario = files_ref.where(filter=FieldFilter("tipoArchivo", "==", "inventario")).order_by("fechaCarga", direction="DESCENDING").limit(1).stream()
        last_inventario_doc = next(query_inventario, None)
        if last_inventario_doc:
            files_map["inventario"] = last_inventario_doc.id
            metadata = last_inventario_doc.to_dict().get("metadata", {})
            available_filters = {"categorias": metadata.get("lista_completa_categorias", []), "marcas": metadata.get("lista_completa_marcas", [])}

        # --- 4. Construir y devolver la respuesta completa ---

        date_range_bounds = session_data.get("fechas_disponibles") # Asumiendo que se guarda aquí

        # --- INICIO DEL BLOQUE DE AUDITORÍA DE SERIALIZACIÓN ---
        # print("\n--- DEBUG: Auditoría de Serialización JSON ---")
        metadata_payload = get_metadata_from_context(session_ref)
        final_content = {
            "credits": credits_data,
            "history": historial_list,
            "files": files_map,
            "available_filters": available_filters,
            "date_range_bounds": date_range_bounds,
            **metadata_payload
        }
        
        # for key, value in final_content.items():
        #     try:
        #         json.dumps(value, default=str) # Usamos `default=str` como un fallback seguro
        #         print(f"✅ La sección '{key}' se puede serializar correctamente.")
        #         print(f"{value}")
        #     except TypeError as e:
        #         print(f"🔥🔥🔥 ¡ERROR ENCONTRADO! La sección '{key}' no se puede serializar. Causa: {e}")
        #         print(f"Datos problemáticos en '{key}': {value}")
        # print("--------------------------------------------\n")
        # --- FIN DEL BLOQUE DE AUDITORÍA ---



        return JSONResponse(content=final_content)

    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        print(f"🔥 Error al recuperar estado de sesión para {X_Session_ID}: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="No se pudo recuperar el estado de la sesión desde el servidor.")



# ===================================================================================
# --- NUEVO ENDPOINT PARA OBTENER EL ESTADO DE UN WORKSPACE ESPECÍFICO ---
# ===================================================================================
@app.get("/workspaces/{workspace_id}/state", summary="Recupera el estado de un espacio de trabajo (con caché de filtros)", tags=["Espacios de Trabajo"])
async def get_workspace_state(
    workspace_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Obtiene el estado completo de un workspace, con un bloque de depuración
    para auditar la serialización de cada componente de la respuesta.
    """
    try:
        user_email = current_user.get("email")
        
        # --- Lógica de obtención de datos (sin cambios) ---
        user_ref = db.collection('usuarios').document(user_email)
        workspace_ref = user_ref.collection('espacios_trabajo').document(workspace_id)
        
        user_doc = user_ref.get()
        workspace_doc = workspace_ref.get()

        if not user_doc.exists or not workspace_doc.exists:
            raise HTTPException(status_code=404, detail="Usuario o espacio de trabajo no encontrado.")
        
        user_data = user_doc.to_dict()
        workspace_data = workspace_doc.to_dict()

        creditos_restantes = user_data.get("creditos_restantes", 0)
        creditos_usados = user_data.get("creditos_iniciales", 0) - creditos_restantes
        credits_data = {"used": creditos_usados, "remaining": creditos_restantes}

        historial_ref = workspace_ref.collection('reportes_generados')
        query_historial = historial_ref.order_by("fechaGeneracion", direction=firestore.Query.DESCENDING).limit(10)
        historial_list = []
        for doc in query_historial.stream():
            doc_data = doc.to_dict()
            for field in ['fechaGeneracion', 'fechaUltimoAcceso', 'fechaCreacion']:
                if field in doc_data and hasattr(doc_data[field], 'isoformat'):
                    doc_data[field] = doc_data[field].isoformat()
            historial_list.append(doc_data)

        files_ref = workspace_ref.collection('archivos_cargados')
        # --- CORRECCIÓN PROACTIVA: Volvemos a la sintaxis que sabemos que es estable ---
        query_ventas = files_ref.where(filter=FieldFilter("tipoArchivo", "==", "ventas")).order_by("fechaCarga", direction=firestore.Query.DESCENDING).limit(1).stream()
        query_inventario = files_ref.where(filter=FieldFilter("tipoArchivo", "==", "inventario")).order_by("fechaCarga", direction=firestore.Query.DESCENDING).limit(1).stream()
        
        last_venta_doc = next(query_ventas, None)
        last_inventario_doc = next(query_inventario, None)
        files_map = {"ventas": last_venta_doc.id if last_venta_doc else None, "inventario": last_inventario_doc.id if last_inventario_doc else None}
        
        available_filters = workspace_data.get("filtros_disponibles", {"categorias": [], "marcas": []})
        date_range_bounds = workspace_data.get("fechas_disponibles") # Asumiendo que se guarda aquí

        # --- INICIO DEL BLOQUE DE AUDITORÍA DE SERIALIZACIÓN ---
        # print("\n--- DEBUG: Auditoría de Serialización JSON ---")
        metadata_payload = get_metadata_from_context(workspace_ref)

        final_content = {
            "credits": credits_data,
            "history": historial_list,
            "files": files_map,
            "available_filters": available_filters,
            "date_range_bounds": date_range_bounds,
            **metadata_payload
        }
        
        # for key, value in final_content.items():
        #     try:
        #         json.dumps(value, default=str) # Usamos `default=str` como un fallback seguro
        #         print(f"✅ La sección '{key}' se puede serializar correctamente.")
        #         print(f"{value}")
        #     except TypeError as e:
        #         print(f"🔥🔥🔥 ¡ERROR ENCONTRADO! La sección '{key}' no se puede serializar. Causa: {e}")
        #         print(f"Datos problemáticos en '{key}': {value}")
        # print("--------------------------------------------\n")
        # # --- FIN DEL BLOQUE DE AUDITORÍA ---

        return JSONResponse(content=final_content)

    except Exception as e:
        print(f"🔥 Error al recuperar estado del workspace {workspace_id}: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="No se pudo recuperar el estado del espacio de trabajo.")


# @app.get("/workspaces/{workspace_id}/state", summary="Recupera el estado de un espacio de trabajo específico", tags=["Espacios de Trabajo"])
# async def get_workspace_state(
#     workspace_id: str,
#     current_user: dict = Depends(get_current_user)
# ):
#     """
#     Busca en Firestore el estado de un workspace, incluyendo los archivos cargados
#     y el historial de reportes. Solo el dueño puede acceder.
#     """
#     try:
#         user_email = current_user.get("email")
#         base_ref = db.collection('usuarios').document(user_email).collection('espacios_trabajo').document(workspace_id)
        
#         # 1. Obtener archivos cargados
#         files_ref = base_ref.collection('archivos_cargados')
#         docs_files = files_ref.order_by("fechaCarga", direction=firestore.Query.DESCENDING).stream()
#         files_map = {}
#         for doc in docs_files:
#             file_data = doc.to_dict()
#             # Guardamos solo el último archivo de cada tipo
#             if not files_map.get(file_data.get("tipoArchivo")):
#                 files_map[file_data.get("tipoArchivo")] = doc.id
        
#         # 2. Obtener historial de reportes
#         historial_ref = base_ref.collection('reportes_generados')
#         query = historial_ref.order_by("fechaGeneracion", direction=firestore.Query.DESCENDING).limit(10)
#         docs_historial = query.stream()
#         historial_list = []
#         for doc in docs_historial:
#             # ... (tu lógica para convertir fechas a ISO string) ...
#             historial_list.append(doc.to_dict())

#         # 3. Obtenemos los créditos del documento del usuario principal
#         user_doc = db.collection('usuarios').document(user_email).get()
#         user_data = user_doc.to_dict()
#         creditos_restantes = user_data.get("creditos_restantes", 0)
#         creditos_usados = user_data.get("creditos_iniciales", 50) - creditos_restantes

#         return JSONResponse(content={
#             "credits": {"used": creditos_usados, "remaining": creditos_restantes},
#             "history": historial_list,
#             "files": { "ventas": files_map.get("ventas"), "inventario": files_map.get("inventario") }
#         })

#     except Exception as e:
#         print(f"🔥 Error al recuperar estado del workspace {workspace_id}: {e}")
#         raise HTTPException(status_code=500, detail="No se pudo recuperar el estado del espacio de trabajo.")


# ===================================================================================
# --- MODELOS DE DATOS (PYDANTIC) PARA LA CREACIÓN DE WORKSPACES ---
# ===================================================================================
class WorkspaceCreate(BaseModel):
    nombre: str = Field(..., min_length=3, max_length=50, description="El nombre del nuevo espacio de trabajo.")

class WorkspaceUpdate(BaseModel):
    nombre: str = Field(..., min_length=3, max_length=50, description="El nuevo nombre para el espacio de trabajo.")


# ===================================================================================
# --- API PARA GESTIÓN DE ESPACIOS DE TRABAJO ---
# ===================================================================================
@app.get("/workspaces", summary="Obtiene los espacios de trabajo del usuario", tags=["Espacios de Trabajo"])
async def get_workspaces(current_user: dict = Depends(get_current_user)):
    """
    Devuelve una lista de todos los espacios de trabajo pertenecientes
    al usuario autenticado. La autenticación es obligatoria.
    """
    try:
        user_email = current_user.get("email")
        
        workspaces_ref = db.collection('usuarios').document(user_email).collection('espacios_trabajo')
        # Ordenamos por el campo que ahora sabemos que existe y se actualiza
        query = workspaces_ref.order_by("fechaUltimoAcceso", direction=firestore.Query.DESCENDING)
        
        workspaces_list = []
        for doc in query.stream():
            workspace_data = doc.to_dict()
            workspace_data['id'] = doc.id
            
            # --- CONVERSIÓN DE FECHAS COMPLETA Y ROBUSTA ---
            # Iteramos sobre una lista de campos de fecha conocidos para convertirlos
            date_fields_to_convert = ['fechaCreacion', 'fechaUltimoAcceso', 'fechaModificacion']
            
            for field in date_fields_to_convert:
                if field in workspace_data and hasattr(workspace_data[field], 'isoformat'):
                    workspace_data[field] = workspace_data[field].isoformat()
            
            workspaces_list.append(workspace_data)

        # --- Lógica para obtener los créditos (sin cambios) ---
        creditos_restantes = current_user.get("creditos_restantes", 0)
        creditos_iniciales = current_user.get("creditos_iniciales", 50)
        creditos_usados = creditos_iniciales - creditos_restantes

        return JSONResponse(content={
            "workspaces": workspaces_list,
            "credits": {
                "used": creditos_usados,
                "remaining": creditos_restantes
            },
            "user": {
                "email": user_email
                # Aquí podrías añadir otros datos del perfil si los necesitas en el futuro
            }
        })

    except Exception as e:
        print(f"🔥 Error al obtener workspaces para el usuario {user_email}: {e}")
        raise HTTPException(status_code=500, detail="No se pudieron obtener los espacios de trabajo.")

@app.post("/workspaces", summary="Crea un nuevo espacio de trabajo (con validación de plan)", tags=["Espacios de Trabajo"])
async def create_workspace(
    workspace: WorkspaceCreate,
    current_user: dict = Depends(get_current_user)
):
    user_email = current_user.get("email")
    if not user_email:
        raise HTTPException(status_code=403, detail="No se pudo identificar al usuario desde el token.")

    try:
        user_plan = current_user.get("plan", "gratis")
        plan_config = PLANS_CONFIG.get(user_plan, PLANS_CONFIG["gratis"])
        limit = plan_config["workspace_limit"]
        
        workspaces_ref = db.collection('usuarios').document(user_email).collection('espacios_trabajo')
        
        # --- LÓGICA DE VALIDACIÓN DE LÍMITES (CON DEPURACIÓN) ---
        if limit != -1: # -1 significa ilimitado
            # Contamos los workspaces existentes
            existing_workspaces = list(workspaces_ref.stream())
            workspaces_count = len(existing_workspaces)
            
            # --- DEBUGGING LOGS ---
            print("\n--- DEBUG: Verificación de Límite de Workspaces ---")
            print(f"Usuario: {user_email}, Plan: {user_plan}")
            print(f"Límite del plan: {limit}")
            print(f"Workspaces existentes encontrados: {workspaces_count}")
            # --- FIN DEBUGGING ---

            if workspaces_count >= limit:
                # Si se alcanza el límite, lanzamos el error 403 y la función debe detenerse aquí.
                print(f"🚫 Límite alcanzado para {user_email}. Lanzando error 403.")
                raise HTTPException(
                    status_code=403, 
                    detail=f"Has alcanzado el límite de {limit} espacios de trabajo para el plan '{plan_config['plan_name']}'. Considera mejorar tu plan."
                )
        
        # --- La creación solo ocurre si la validación anterior no lanzó un error ---
        print(f"✅ Límite verificado. Procediendo a crear workspace para {user_email}.")
        new_workspace_data = {
            "nombre": workspace.nombre,
            "fechaCreacion": datetime.now(timezone.utc),
            "fechaUltimoAcceso": datetime.now(timezone.utc), # Inicializamos el campo de ordenamiento
            "isPinned": False # Inicializamos el campo de fijado
        }
        
        update_time, new_workspace_ref = workspaces_ref.add(new_workspace_data)
        
        # Preparamos la respuesta para que sea compatible con JSON
        response_data = new_workspace_data.copy()
        response_data['id'] = new_workspace_ref.id
        response_data['fechaCreacion'] = response_data['fechaCreacion'].isoformat()
        response_data['fechaUltimoAcceso'] = response_data['fechaUltimoAcceso'].isoformat()
        
        return JSONResponse(
            status_code=201,
            content={"message": "Espacio de trabajo creado exitosamente.", "workspace": response_data}
        )

    # --- MANEJO DE ERRORES CORREGIDO ---
    # 1. Capturamos nuestra propia excepción HTTP primero y la relanzamos.
    except HTTPException as http_exc:
        raise http_exc
    # 2. Capturamos cualquier otro error inesperado después.
    except Exception as e:
        print(f"🔥 Error inesperado al crear workspace para el usuario {user_email}: {e}")
        raise HTTPException(status_code=500, detail="No se pudo crear el espacio de trabajo debido a un error interno.")

@app.put("/workspaces/{workspace_id}", summary="Actualiza el nombre de un espacio de trabajo", tags=["Espacios de Trabajo"])
async def update_workspace(
    workspace_id: str,
    workspace_update: WorkspaceUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Permite a un usuario autenticado renombrar uno de sus espacios de trabajo.
    """
    try:
        user_email = current_user.get("email")
        # La referencia al documento verifica implícitamente la propiedad
        workspace_ref = db.collection('usuarios').document(user_email).collection('espacios_trabajo').document(workspace_id)
        
        # Verificamos que el workspace exista antes de intentar actualizarlo
        if not workspace_ref.get().exists:
            raise HTTPException(status_code=404, detail="El espacio de trabajo no fue encontrado o no te pertenece.")
            
        # Actualizamos solo el campo 'nombre'
        workspace_ref.update({"nombre": workspace_update.nombre})
        
        print(f"✅ Workspace '{workspace_id}' renombrado a '{workspace_update.nombre}' para el usuario {user_email}.")
        return {"message": "Espacio de trabajo actualizado exitosamente.", "id": workspace_id, "nuevo_nombre": workspace_update.nombre}

    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        print(f"🔥 Error al actualizar workspace '{workspace_id}': {e}")
        raise HTTPException(status_code=500, detail="No se pudo actualizar el espacio de trabajo.")


@app.delete("/workspaces/{workspace_id}", summary="Elimina un espacio de trabajo", tags=["Espacios de Trabajo"])
async def delete_workspace(
    workspace_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Permite a un usuario autenticado eliminar uno de sus espacios de trabajo.
    ADVERTENCIA: En esta versión MVP, esto solo elimina el documento del workspace,
    pero las sub-colecciones (archivos, reportes) pueden quedar huérfanas.
    """
    try:
        user_email = current_user.get("email")
        workspace_ref = db.collection('usuarios').document(user_email).collection('espacios_trabajo').document(workspace_id)

        if not workspace_ref.get().exists:
            raise HTTPException(status_code=404, detail="El espacio de trabajo no fue encontrado o no te pertenece.")

        # Eliminamos el documento del espacio de trabajo
        workspace_ref.delete()
        
        print(f"✅ Workspace '{workspace_id}' eliminado para el usuario {user_email}.")
        return {"message": "Espacio de trabajo eliminado exitosamente."}
        
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        print(f"🔥 Error al eliminar workspace '{workspace_id}': {e}")
        raise HTTPException(status_code=500, detail="No se pudo eliminar el espacio de trabajo.")


@app.put("/workspaces/{workspace_id}/pin", summary="Fija o desfija un espacio de trabajo", tags=["Espacios de Trabajo"])
async def pin_workspace(
    workspace_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Invierte el estado 'isPinned' de un espacio de trabajo.
    Esta es una funcionalidad Pro.
    """
    user_email = current_user.get("email")
    
    # # Lógica de Permisos (Ejemplo)
    # if current_user.get("plan") not in ["pro", "diamond"]:
    #     raise HTTPException(status_code=403, detail="Fijar espacios de trabajo es una funcionalidad Pro.")
        
    try:
        workspace_ref = db.collection('usuarios').document(user_email).collection('espacios_trabajo').document(workspace_id)
        workspace_doc = workspace_ref.get()
        
        if not workspace_doc.exists:
            raise HTTPException(status_code=404, detail="Espacio de trabajo no encontrado.")
        
        # Obtenemos el estado actual de 'isPinned' y lo invertimos
        current_pin_status = workspace_doc.to_dict().get("isPinned", False)
        new_pin_status = not current_pin_status
        
        workspace_ref.update({"isPinned": new_pin_status})
        
        return {"message": "Estado de fijado actualizado.", "id": workspace_id, "isPinned": new_pin_status}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"No se pudo actualizar el estado: {e}")


# --- NUEVO ENDPOINT PARA REGISTRAR EL ACCESO A UN WORKSPACE ---
@app.put("/workspaces/{workspace_id}/touch", summary="Actualiza la fecha de último acceso de un workspace", tags=["Espacios de Trabajo"])
async def touch_workspace(
    workspace_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Actualiza el timestamp 'fechaUltimoAcceso' de un espacio de trabajo.
    Esta acción se llama cada vez que un usuario entra a un espacio,
    para que la lista se pueda ordenar por "abiertos recientemente".
    """
    try:
        user_email = current_user.get("email")
        workspace_ref = db.collection('usuarios').document(user_email).collection('espacios_trabajo').document(workspace_id)
        
        # Usamos .update() para establecer o actualizar el campo
        workspace_ref.update({"fechaUltimoAcceso": datetime.now(timezone.utc)})
        
        return {"message": f"Timestamp de acceso actualizado para {workspace_id}."}

    except Exception as e:
        # No queremos que un fallo aquí rompa la experiencia del usuario,
        # así que en lugar de un error 500, podríamos solo registrarlo.
        print(f"🔥 Advertencia: No se pudo actualizar el timestamp de acceso para el workspace {workspace_id}: {e}")
        # Devolvemos una respuesta exitosa de todas formas para no bloquear al frontend.
        return {"message": "La operación continuó aunque no se pudo actualizar el timestamp."}


# ===================================================================================
# --- 4. NUEVOS ENDPOINTS PARA GESTIONAR LA ESTRATEGIA ---
# ===================================================================================

@app.get("/strategy/default", summary="Obtiene la estrategia de negocio por defecto", tags=["Estrategia"])
async def get_default_strategy():
    """Devuelve la configuración base recomendada para los parámetros de análisis."""
    return JSONResponse(content=DEFAULT_STRATEGY)

@app.get("/strategy", summary="Obtiene la estrategia global del usuario", tags=["Estrategia"])
async def get_global_strategy(current_user: dict = Depends(get_current_user)):
    """Devuelve la estrategia global guardada para el usuario autenticado."""
    return JSONResponse(content=current_user.get("estrategia_global", DEFAULT_STRATEGY))

@app.put("/strategy", summary="Actualiza la estrategia global del usuario", tags=["Estrategia"])
async def update_global_strategy(strategy_data: StrategyData, current_user: dict = Depends(get_current_user)):
    """Actualiza la estrategia global para el usuario autenticado."""
    user_email = current_user.get("email")
    user_ref = db.collection('usuarios').document(user_email)
    user_ref.update({"estrategia_global": strategy_data.dict()})
    return {"message": "Estrategia global actualizada."}

@app.get("/workspaces/{workspace_id}/strategy", summary="Obtiene la estrategia efectiva para un workspace", tags=["Estrategia"])
async def get_workspace_strategy(workspace_id: str, current_user: dict = Depends(get_current_user)):
    """
    Devuelve la estrategia para un workspace, aplicando la jerarquía:
    1. Estrategia personalizada del workspace (si existe).
    2. Estrategia global del usuario.
    """
    user_email = current_user.get("email")
    workspace_ref = db.collection('usuarios').document(user_email).collection('espacios_trabajo').document(workspace_id)
    workspace_doc = workspace_ref.get()

    if not workspace_doc.exists:
        raise HTTPException(status_code=404, detail="Espacio de trabajo no encontrado.")

    workspace_data = workspace_doc.to_dict()
    
    # Lógica de cascada
    if "estrategia_personalizada" in workspace_data:
        return JSONResponse(content=workspace_data["estrategia_personalizada"])
    else:
        return JSONResponse(content=current_user.get("estrategia_global", DEFAULT_STRATEGY))

@app.put("/workspaces/{workspace_id}/strategy", summary="Guarda una estrategia personalizada para un workspace", tags=["Estrategia"])
async def save_workspace_strategy(workspace_id: str, strategy_data: StrategyData, current_user: dict = Depends(get_current_user)):
    """Guarda o actualiza la estrategia personalizada para un workspace específico."""
    user_email = current_user.get("email")
    workspace_ref = db.collection('usuarios').document(user_email).collection('espacios_trabajo').document(workspace_id)
    workspace_ref.update({"estrategia_personalizada": strategy_data.dict()})
    return {"message": "Estrategia del espacio de trabajo guardada."}

@app.delete("/workspaces/{workspace_id}/strategy", summary="Restaura la estrategia de un workspace a la global", tags=["Estrategia"])
async def reset_workspace_strategy(workspace_id: str, current_user: dict = Depends(get_current_user)):
    """
    Elimina la estrategia personalizada de un workspace, haciendo que vuelva a
    heredar la estrategia global del usuario.
    """
    user_email = current_user.get("email")
    workspace_ref = db.collection('usuarios').document(user_email).collection('espacios_trabajo').document(workspace_id)
    workspace_ref.update({"estrategia_personalizada": firestore.DELETE_FIELD})
    return {"message": "Estrategia del espacio de trabajo restaurada a la global."}




# # ===================================================================================
# # --- NUEVOS ENDPOINTS PARA GESTIONAR LA ESTRATEGIA ---
# # ===================================================================================

@app.get("/sessions/{session_id}/strategy", summary="Obtiene la estrategia guardada para una sesión", tags=["Estrategia"])
async def get_session_strategy(session_id: str):
    """
    Devuelve la configuración de estrategia personalizada que está guardada
    para una sesión específica en Firestore.
    """
    try:
        session_ref = db.collection('sesiones_anonimas').document(session_id)
        session_doc = session_ref.get()

        if not session_doc.exists:
            # Si la sesión no existe, es un error del cliente.
            raise HTTPException(status_code=404, detail="La sesión no existe.")

        # Buscamos el campo 'estrategia' dentro del documento de la sesión.
        strategy_data = session_doc.to_dict().get("estrategia")

        if not strategy_data:
            # Como plan B, si por alguna razón el campo no existe,
            # devolvemos la estrategia por defecto para que la app no se rompa.
            print(f"Advertencia: No se encontró estrategia para la sesión {session_id}. Devolviendo default.")
            return JSONResponse(content=DEFAULT_STRATEGY)

        return JSONResponse(content=strategy_data)

    except HTTPException as http_exc:
        # Relanzamos los errores HTTP que nosotros mismos generamos
        raise http_exc
    except Exception as e:
        print(f"🔥 Error al obtener la estrategia para la sesión {session_id}: {e}")
        raise HTTPException(status_code=500, detail=f"No se pudo obtener la estrategia: {e}")

# @app.post("/sessions/{session_id}/strategy", summary="Guarda la estrategia de negocio para una sesión", tags=["Estrategia"])
# async def save_strategy(session_id: str, strategy_data: StrategyData):
#     """
#     Actualiza la configuración de la estrategia para una sesión dada en Firestore.
#     """
#     try:
#         session_ref = db.collection('sesiones_anonimas').document(session_id)

#         # --- CAMBIO CLAVE: LÓGICA DE ESCRITURA ---
#         # Usamos .set() con merge=True. Esto añadirá el campo 'estrategia' si no existe,
#         # o lo sobrescribirá por completo si ya existe, sin tocar otros campos
#         # como los créditos.
#         # El método .dict() de Pydantic convierte el objeto strategy_data en un diccionario
#         # que Firestore puede entender.
#         session_ref.set({"estrategia": strategy_data.dict()}, merge=True)
        
#         print(f"✅ Estrategia actualizada exitosamente para la sesión: {session_id}")
        
#         return JSONResponse(
#             status_code=200,
#             content={"message": "Estrategia guardada exitosamente."}
#         )
        
#     except Exception as e:
#         print(f"🔥 Error al guardar la estrategia para la sesión {session_id}: {e}")
#         raise HTTPException(status_code=500, detail=f"No se pudo guardar la estrategia: {e}")


# @app.get("/workspaces/{workspace_id}/strategy", summary="Obtiene la estrategia guardada para un workspace", tags=["Estrategia"])
# async def get_workspace_strategy(
#     workspace_id: str,
#     current_user: dict = Depends(get_current_user)
# ):
#     """
#     Devuelve la configuración de estrategia para un workspace específico.
#     Si el workspace no tiene una estrategia personalizada, busca la global del usuario.
#     Si el usuario no tiene una, devuelve la de por defecto.
#     """
#     try:
#         user_email = current_user.get("email")
        
#         # 1. Intenta obtener la estrategia específica del workspace
#         workspace_ref = db.collection('usuarios').document(user_email).collection('espacios_trabajo').document(workspace_id)
#         workspace_doc = workspace_ref.get()
#         if workspace_doc.exists and "estrategia" in workspace_doc.to_dict():
#             return JSONResponse(content=workspace_doc.to_dict()["estrategia"])

#         # 2. Si no existe, intenta obtener la estrategia global del usuario
#         user_ref = db.collection('usuarios').document(user_email)
#         user_doc = user_ref.get()
#         if user_doc.exists and "estrategia_global" in user_doc.to_dict():
#             return JSONResponse(content=user_doc.to_dict()["estrategia_global"])
            
#         # 3. Como último recurso, devuelve la de por defecto
#         return JSONResponse(content=DEFAULT_STRATEGY)

#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"No se pudo obtener la estrategia: {e}")


@app.post("/upload-file", summary="Sube, registra y cachea los filtros de un archivo", tags=["Archivos"])
async def upload_file(
    # --- Parámetros de contexto (sin cambios) ---
    current_user: Optional[dict] = Depends(get_current_user_optional),
    X_Session_ID: Optional[str] = Header(None, alias="X-Session-ID"),
    workspace_id: Optional[str] = Form(None),
    # --- Parámetros de la petición (sin cambios) ---
    tipo_archivo: Literal['inventario', 'ventas'] = Form(...),
    file: UploadFile = File(...)
):
    user_id = None
    session_id_to_use = None

    # --- Lógica de Determinación de Contexto (sin cambios) ---
    if current_user:
        # if not workspace_id:
        #     raise HTTPException(status_code=400, detail="Se requiere un 'workspace_id' para usuarios autenticados.")
        user_id = current_user['email']
        print(f"Contexto de carga: Usuario Registrado ({user_id}), Workspace ({workspace_id})")
    elif X_Session_ID:
        session_id_to_use = X_Session_ID
        print(f"Contexto de carga: Sesión Anónima ({session_id_to_use})")
    else:
        raise HTTPException(status_code=401, detail="No se proporcionó autenticación ni ID de sesión.")

    contents = await file.read()
    df = None
    last_error = None

    # Lista de configuraciones a intentar, en orden de probabilidad
    configs_to_try = [
        {'sep': ',', 'encoding': 'utf-8', 'skiprows': 0},
        {'sep': ',', 'encoding': 'latin1', 'skiprows': 0},
        {'sep': ';', 'encoding': 'utf-8', 'skiprows': 0},
        {'sep': ';', 'encoding': 'latin1', 'skiprows': 0},
        # Como plan B, intentamos leer sin saltar ninguna fila, por si el formato cambia
        {'sep': ',', 'encoding': 'utf-8'},
    ]

    for config in configs_to_try:
        try:
            # Creamos un nuevo flujo de bytes en cada intento para empezar desde el principio
            df = pd.read_csv(io.BytesIO(contents), **config)
            print(f"✅ Archivo leído exitosamente con la configuración: {config}")
            break # Si tiene éxito, salimos del bucle
        except Exception as e:
            last_error = e
            # Si falla, simplemente continuamos con la siguiente configuración
            continue
    
    # Si después de todos los intentos no se pudo leer, lanzamos el error final
    if df is None:
        raise HTTPException(
            status_code=400,
            detail=f"No se pudo leer el archivo CSV. Verifique su formato. Error final: {last_error}"
        )

    # El resto de tu lógica no cambia
    df.columns = df.columns.str.strip()


    try:
        metadata = extraer_metadatos_df(df, tipo_archivo)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error al procesar el contenido del archivo: {e}")
    
    try:
        # --- Guardado en Firebase y Registro ---
        now = datetime.now(timezone.utc)
        timestamp_str = now.strftime('%Y-%m-%d_%H%M%S')
        
        ruta_storage = upload_to_storage(
            user_id=user_id,
            workspace_id=workspace_id,
            session_id=session_id_to_use,
            file_contents=contents,
            tipo_archivo=tipo_archivo,
            original_filename=file.filename,
            content_type=file.content_type,
            timestamp_str=timestamp_str
        ) # Tu llamada a upload_to_storage
        
        file_id = f"{timestamp_str}_{tipo_archivo}"

        log_file_upload_in_firestore(
            user_id=user_id,
            workspace_id=workspace_id,
            session_id=session_id_to_use,
            file_id=file_id,
            tipo_archivo=tipo_archivo,
            nombre_original=file.filename,
            ruta_storage=ruta_storage,
            metadata=metadata,
            timestamp_obj=now
        )

        # print(f"✅ Metadata en '{metadata}'.")

        # --- INICIO DE LA NUEVA LÓGICA DE CACHÉ PARA INVENTARIO---
        # Si la carga es de un usuario registrado y el archivo es un inventario...
        if user_id and workspace_id and tipo_archivo == 'inventario':
            print(f"Detectado archivo de inventario para usuario registrado. Cacheando filtros...")
            
            # Obtenemos las listas de filtros desde los metadatos que ya extrajimos
            filtros_a_guardar = {
                "categorias": metadata.get("lista_completa_categorias", []),
                "marcas": metadata.get("lista_completa_marcas", [])
            }

            # Obtenemos la referencia al documento del ESPACIO DE TRABAJO
            workspace_ref = db.collection('usuarios').document(user_id).collection('espacios_trabajo').document(workspace_id)
            
            # Actualizamos el documento del workspace con los filtros disponibles
            workspace_ref.update({"filtros_disponibles": filtros_a_guardar})
            
            print(f"✅ Filtros cacheados exitosamente en el workspace '{workspace_id}'.")
        # --- FIN DE LA NUEVA LÓGICA DE CACHÉ ---

        # --- INICIO DE LA NUEVA LÓGICA DE CACHÉ PARA VENTAS---
        # Si la carga es de un usuario registrado y el archivo es un inventario...
        if user_id and workspace_id and tipo_archivo == 'ventas':
            print(f"Detectado archivo de ventas para usuario registrado. Cacheando fechas...")
            
            # Obtenemos las listas de filtros desde los metadatos que ya extrajimos
            fechas_a_guardar = {
                "min_date": metadata["fecha_primera_venta"].isoformat(),
                "max_date": metadata["fecha_ultima_venta"].isoformat()
            }

            # Obtenemos la referencia al documento del ESPACIO DE TRABAJO
            workspace_ref = db.collection('usuarios').document(user_id).collection('espacios_trabajo').document(workspace_id)
            
            # Actualizamos el documento del workspace con los filtros disponibles
            workspace_ref.update({"fechas_disponibles": fechas_a_guardar})
            
            print(f"✅ Fechas cacheados exitosamente en el workspace '{workspace_id}'.")
        # --- FIN DE LA NUEVA LÓGICA DE CACHÉ ---

        # --- INICIO DE LA NUEVA LÓGICA DE CACHÉ PARA VENTAS - ANONIMAS ---
        # Si la carga es de un usuario registrado y el archivo es un inventario...
        if session_id_to_use and tipo_archivo == 'ventas':
            print(f"Detectado archivo de ventas para usuario anonimo. Cacheando fechas...")
            
            # Obtenemos las listas de filtros desde los metadatos que ya extrajimos
            fechas_a_guardar = {
                "min_date": metadata["fecha_primera_venta"].isoformat(),
                "max_date": metadata["fecha_ultima_venta"].isoformat()
            }

            # Obtenemos la referencia al documento del ESPACIO DE TRABAJO
            workspace_anonimo_ref = db.collection('sesiones_anonimas').document(session_id_to_use)
            
            # Actualizamos el documento del workspace con los filtros disponibles
            workspace_anonimo_ref.update({"fechas_disponibles": fechas_a_guardar})
            
            print(f"✅ Fechas cacheados exitosamente para anonimo en '{session_id_to_use}'.")
        # --- FIN DE LA NUEVA LÓGICA DE CACHÉ ---

        response_content = {}

        # Devolvemos los metadatos extraídos para que la UI se actualice al instante
        if tipo_archivo == 'ventas' and metadata.get("fecha_primera_venta"):
            response_content["date_range_bounds"] = {
                "min_date": metadata["fecha_primera_venta"].isoformat(),
                "max_date": metadata["fecha_ultima_venta"].isoformat()
            }
        

        # Si es un inventario (para cualquier tipo de usuario), devolvemos los filtros para uso inmediato
        if tipo_archivo == 'inventario':
            response_content["available_filters"] = {
                "categorias": metadata.get("lista_completa_categorias", []),
                "marcas": metadata.get("lista_completa_marcas", [])
            }

        # --- CAMBIO CLAVE: Convertimos las fechas en los metadatos ANTES de guardarlos ---
        if 'fecha_primera_venta' in metadata and hasattr(metadata['fecha_primera_venta'], 'isoformat'):
            metadata['fecha_primera_venta'] = metadata['fecha_primera_venta'].isoformat()
        if 'fecha_ultima_venta' in metadata and hasattr(metadata['fecha_ultima_venta'], 'isoformat'):
            metadata['fecha_ultima_venta'] = metadata['fecha_ultima_venta'].isoformat()

        # La construcción de la respuesta no cambia
        response_content = {
            "message": f"Archivo de {tipo_archivo} subido exitosamente.",
            "file_id": file_id,
            "tipo_archivo": tipo_archivo,
            "nombre_original": file.filename,
            "metadata": metadata
        }

        # --- CAMBIO CLAVE: Añadimos el rango de fechas a la respuesta ---
        if tipo_archivo == 'ventas':
            if metadata.get("fecha_primera_venta") and metadata.get("fecha_ultima_venta"):
                response_content["date_range_bounds"] = {
                    "min_date": metadata["fecha_primera_venta"],
                    "max_date": metadata["fecha_ultima_venta"]
                }

        # Si es un inventario (para cualquier tipo de usuario), devolvemos los filtros para uso inmediato
        if tipo_archivo == 'inventario':
            response_content["available_filters"] = {
                "categorias": metadata.get("lista_completa_categorias", []),
                "marcas": metadata.get("lista_completa_marcas", [])
            }
        
        return JSONResponse(content=response_content)

    except Exception as e:
        print(f"🔥 Error en la fase de guardado: {e}")
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
    current_user: Optional[dict] = Depends(get_current_user_optional),
    X_Session_ID: str = Header(..., alias="X-Session-ID"),
    workspace_id: Optional[str] = Form(None),

    ventas_file_id: str = Form(...),
    inventario_file_id: str = Form(...),
    criterio_abc: str = Form(..., description="Criterio para el análisis ABC: 'ingresos', 'unidades', 'margen', 'combinado'.", examples=["ingresos"]),
    periodo_abc: int = Form(..., description="Período de análisis en meses (0 para todo el historial, ej: 3, 6, 12).", examples=[6]),

    # --- NUEVO: Recibimos los scores de la estrategia ---
    score_ventas: Optional[int] = Form(None),
    score_ingreso: Optional[int] = Form(None),
    score_margen: Optional[int] = Form(None),
    incluir_solo_categorias: str = Form("", description="String de categorías separadas por comas."),
    incluir_solo_marcas: str = Form("", description="String de marcas separadas por comas.")

):
    user_id = None
    
    # --- LÓGICA DE DETERMINACIÓN DE CONTEXTO ---
    if current_user:
        # CASO 1: Usuario Registrado
        if not workspace_id:
            raise HTTPException(status_code=400, detail="Se requiere un 'workspace_id' para usuarios autenticados.")
        user_id = current_user['email']
        print(f"Petición de usuario registrado: {user_id} para workspace: {workspace_id}")
        # Para el logging y descarga, pasamos el contexto del usuario
        log_session_id = None # No usamos el ID de sesión anónima
    
    elif X_Session_ID:
        # CASO 2: Usuario Anónimo
        print(f"Petición de usuario anónimo: {X_Session_ID}")
        log_session_id = X_Session_ID
    else:
        # CASO 3: No hay identificador, denegamos el acceso
        raise HTTPException(status_code=401, detail="No se proporcionó autenticación ni ID de sesión.")

    # pesos_combinado_dict = None
    # if criterio_abc.lower() == "combinado":
    #     pesos_combinado_dict = {
    #         "ingresos": peso_ingresos,
    #         "margen": peso_margen,
    #         "unidades": score_ventas
    #     }
    
    # Preparamos el diccionario de parámetros para la función de lógica
    try:
        # Parseamos los strings JSON para convertirlos en listas de Python
        categorias_list = json.loads(incluir_solo_categorias) if incluir_solo_categorias else None
        marcas_list = json.loads(incluir_solo_marcas) if incluir_solo_marcas else None
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Formato de filtros (categorías/marcas) inválido. Se esperaba un string JSON.")

    processing_params = {
        "criterio_abc": criterio_abc.lower(),
        "periodo_abc": periodo_abc,
        # "pesos_combinado": pesos_combinado_dict,
        "criterio_abc": criterio_abc,
        "periodo_abc": periodo_abc,
        "score_ventas": score_ventas,
        "score_ingreso": score_ingreso,
        "score_margen": score_margen,
        "filtro_categorias": categorias_list,
        "filtro_marcas": marcas_list
    }

    full_params_for_logging = dict(await request.form())

    # Llamamos a la función manejadora central
    return await _handle_report_generation(
        full_params_for_logging=full_params_for_logging,
        ventas_file_id=ventas_file_id,
        inventario_file_id=inventario_file_id,
        report_key="ReporteABC",
        processing_function=process_csv_abc, # Pasamos la función de lógica como argumento
        processing_params=processing_params,
        output_filename="reporte_abc.xlsx",
        user_id=user_id,
        workspace_id=workspace_id,
        session_id=log_session_id
    )


@app.post("/rotacion-general-estrategico") # Endpoint renombrado para mayor claridad
async def run_analisis_estrategico_rotacion(
    # Inyectamos el request para el logging
    request: Request, 
    # Definimos explícitamente los parámetros que la LÓGICA necesit
    current_user: Optional[dict] = Depends(get_current_user_optional),
    X_Session_ID: str = Header(..., alias="X-Session-ID"),
    workspace_id: Optional[str] = Form(None),
    
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
    # pesos_importancia_json: Optional[str] = Form(None, description='(Avanzado) Redefine los pesos del Índice de Importancia. Formato JSON.')
    # --- NUEVO: Recibimos los scores de la estrategia desde el frontend ---
    score_ventas: int = Form(...),
    score_ingreso: int = Form(...),
    score_margen: int = Form(...),
    score_dias_venta: int = Form(...)
):
    user_id = None
    
    # --- LÓGICA DE DETERMINACIÓN DE CONTEXTO ---
    if current_user:
        # CASO 1: Usuario Registrado
        if not workspace_id:
            raise HTTPException(status_code=400, detail="Se requiere un 'workspace_id' para usuarios autenticados.")
        user_id = current_user['email']
        print(f"Petición de usuario registrado: {user_id} para workspace: {workspace_id}")
        # Para el logging y descarga, pasamos el contexto del usuario
        log_session_id = None # No usamos el ID de sesión anónima
    
    elif X_Session_ID:
        # CASO 2: Usuario Anónimo
        print(f"Petición de usuario anónimo: {X_Session_ID}")
        log_session_id = X_Session_ID
    else:
        # CASO 3: No hay identificador, denegamos el acceso
        raise HTTPException(status_code=401, detail="No se proporcionó autenticación ni ID de sesión.")

    # --- 2. Procesar Parámetros Complejos desde JSON ---
    filtro_categorias = json.loads(filtro_categorias_json) if filtro_categorias_json else None
    filtro_marcas = json.loads(filtro_marcas_json) if filtro_marcas_json else None
    # (Se podría añadir un try-except más robusto aquí si se desea)

    # pesos_importancia = json.loads(pesos_importancia_json) if pesos_importancia_json else None
    # 1. Sumamos los scores recibidos
    total_scores = score_ventas + score_ingreso + score_margen + score_dias_venta

    # 2. Calculamos los pesos prorrateados, manejando el caso de división por cero
    if total_scores == 0:
        # Si todos los scores son 0, asignamos un peso equitativo
        pesos_calculados = {'ventas': 0.25, 'ingreso': 0.25, 'margen': 0.25, 'dias_venta': 0.25}
    else:
        pesos_calculados = {
            'ventas': score_ventas / total_scores,
            'ingreso': score_ingreso / total_scores,
            'margen': score_margen / total_scores,
            'dias_venta': score_dias_venta / total_scores
        }
    

    # Preparamos el diccionario de parámetros para la función de lógica
    processing_params = {
        "pesos_importancia": pesos_calculados,
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
        ventas_file_id=ventas_file_id,
        inventario_file_id=inventario_file_id,
        report_key="ReporteAnalisisEstrategicoRotacion",
        processing_function=process_csv_analisis_estrategico_rotacion, # Pasamos la función de lógica como argumento
        processing_params=processing_params,
        output_filename="ReporteAnalisisEstrategicoRotacion.xlsx",
        user_id=user_id,
        workspace_id=workspace_id,
        session_id=log_session_id
    )


@app.post("/diagnostico-stock-muerto", summary="Genera el reporte de Diagnóstico de Stock Muerto", tags=["Reportes"])
async def diagnostico_stock_muerto(
    # Inyectamos el request para el logging
    request: Request, 
    current_user: Optional[dict] = Depends(get_current_user_optional),
    X_Session_ID: Optional[str] = Header(None, alias="X-Session-ID"),
    workspace_id: Optional[str] = Form(None),

    # Definimos explícitamente los parámetros que la LÓGICA necesit
    ventas_file_id: str = Form(...),
    inventario_file_id: str = Form(...),

    # --- Recibimos los nuevos parámetros del formulario ---
    dias_sin_venta_muerto: int = Form(180),
    umbral_valor_stock: float = Form(0.0),
    ordenar_por: str = Form(...),
    incluir_solo_categorias: str = Form("", description="String de categorías separadas por comas."),
    incluir_solo_marcas: str = Form("", description="String de marcas separadas por comas.")
):
    # --- LÓGICA DE DETERMINACIÓN DE CONTEXTO ---
    # --- Determinación del Contexto ---
    # user_id = current_user['email'] if current_user else None
    user_id = None
    
    # --- LÓGICA DE DETERMINACIÓN DE CONTEXTO ---
    if current_user:
        # CASO 1: Usuario Registrado
        if not workspace_id:
            raise HTTPException(status_code=400, detail="Se requiere un 'workspace_id' para usuarios autenticados.")
        user_id = current_user['email']
        print(f"Petición de usuario registrado: {user_id} para workspace: {workspace_id}")
        # Para el logging y descarga, pasamos el contexto del usuario
        log_session_id = None # No usamos el ID de sesión anónima
    
    elif X_Session_ID:
        # CASO 2: Usuario Anónimo
        print(f"Petición de usuario anónimo: {X_Session_ID}")
        log_session_id = X_Session_ID
    else:
        # CASO 3: No hay identificador, denegamos el acceso
        raise HTTPException(status_code=401, detail="No se proporcionó autenticación ni ID de sesión.")

    try:
        # Parseamos los strings JSON para convertirlos en listas de Python
        categorias_list = json.loads(incluir_solo_categorias) if incluir_solo_categorias else None
        marcas_list = json.loads(incluir_solo_marcas) if incluir_solo_marcas else None
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Formato de filtros (categorías/marcas) inválido. Se esperaba un string JSON.")

    processing_params = {
        "dias_sin_venta_muerto": dias_sin_venta_muerto,
        "umbral_valor_stock": umbral_valor_stock,
        "ordenar_por": ordenar_por,
        "incluir_solo_categorias": categorias_list,
        "incluir_solo_marcas": marcas_list
    }

    full_params_for_logging = dict(await request.form())

    return await _handle_report_generation(
        full_params_for_logging=full_params_for_logging,
        ventas_file_id=ventas_file_id,
        inventario_file_id=inventario_file_id,
        report_key="ReporteDiagnosticoStockMuerto",
        processing_function=procesar_stock_muerto,
        processing_params=processing_params,
        output_filename="Diagnostico_Stock_Muerto.xlsx",
        # --- Pasamos el contexto correcto al manejador ---
        user_id=user_id,
        workspace_id=workspace_id,
        session_id=log_session_id,
    )

@app.post("/reporte-maestro-inventario")
async def generar_reporte_maestro_endpoint(
    # Inyectamos el request para el logging
    request: Request, 
    # Definimos explícitamente los parámetros que la LÓGICA necesit
    current_user: Optional[dict] = Depends(get_current_user_optional),
    X_Session_ID: str = Header(..., alias="X-Session-ID"),
    workspace_id: Optional[str] = Form(None),

    ventas_file_id: str = Form(...),
    inventario_file_id: str = Form(...),
    
    # --- Parámetros para el Análisis ABC (con valores por defecto) ---
    criterio_abc: str = Form("margen", description="Criterio para el análisis ABC: 'ingresos', 'unidades', 'margen', o 'combinado'."),
    periodo_abc: int = Form(6, description="Número de meses hacia atrás para el análisis ABC."),
    
    ordenar_por: str = Form("prioridad"),
    incluir_solo_categorias: str = Form("", description="String de categorías separadas por comas."),
    incluir_solo_marcas: str = Form("", description="String de marcas separadas por comas."),
    # --- Parámetros Opcionales para el Criterio 'Combinado' ---
    # peso_ingresos: Optional[float] = Form(None, description="Peso para ingresos (ej: 0.5) si el criterio es 'combinado'."),
    # peso_margen: Optional[float] = Form(None, description="Peso para margen (ej: 0.3) si el criterio es 'combinado'."),
    # peso_unidades: Optional[float] = Form(None, description="Peso para unidades (ej: 0.2) si el criterio es 'combinado'."),  
    score_ventas: int = Form(...),
    score_ingreso: int = Form(...),
    score_margen: int = Form(...),
    # score_dias_venta: int = Form(...),

    # --- Parámetros Opcionales para el Análisis de Salud ---
    meses_analisis_salud: Optional[int] = Form(None, description="Meses para analizar ventas recientes en el diagnóstico de salud."),
    dias_sin_venta_muerto: Optional[int] = Form(None, description="Umbral de días para clasificar un producto como 'Stock Muerto'.")
):
    user_id = None
    
    # --- LÓGICA DE DETERMINACIÓN DE CONTEXTO ---
    if current_user:
        # CASO 1: Usuario Registrado
        if not workspace_id:
            raise HTTPException(status_code=400, detail="Se requiere un 'workspace_id' para usuarios autenticados.")
        user_id = current_user['email']
        print(f"Petición de usuario registrado: {user_id} para workspace: {workspace_id}")
        # Para el logging y descarga, pasamos el contexto del usuario
        log_session_id = None # No usamos el ID de sesión anónima
    
    elif X_Session_ID:
        # CASO 2: Usuario Anónimo
        print(f"Petición de usuario anónimo: {X_Session_ID}")
        log_session_id = X_Session_ID
    else:
        # CASO 3: No hay identificador, denegamos el acceso
        raise HTTPException(status_code=401, detail="No se proporcionó autenticación ni ID de sesión.")

    # --- Validación de Parámetros ---
    # pesos_combinado = None
    # if criterio_abc == 'combinado':
    #     if not all([peso_ingresos, peso_margen, peso_unidades]):
    #         raise HTTPException(status_code=400, detail="Para el criterio 'combinado', se deben proveer los tres pesos: peso_ingresos, peso_margen y peso_unidades.")
        
    #     total_pesos = peso_ingresos + peso_margen + peso_unidades
    #     if not math.isclose(total_pesos, 1.0):
    #         raise HTTPException(status_code=400, detail=f"La suma de los pesos debe ser 1.0, pero es {total_pesos}.")
            
    #     pesos_combinado = {
    #         "ingresos": peso_ingresos,
    #         "margen": peso_margen,
    #         "unidades": peso_unidades
    #     }
    try:
        # Parseamos los strings JSON para convertirlos en listas de Python
        categorias_list = json.loads(incluir_solo_categorias) if incluir_solo_categorias else None
        marcas_list = json.loads(incluir_solo_marcas) if incluir_solo_marcas else None
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Formato de filtros (categorías/marcas) inválido. Se esperaba un string JSON.")

   

    # 1. Preparamos el diccionario de parámetros para la función de lógica
    processing_params = {
        "criterio_abc": criterio_abc,
        "periodo_abc": periodo_abc,
        # "pesos_combinado": pesos_combinado,
        "score_ventas": score_ventas,
        "score_ingreso": score_ingreso,
        "score_margen": score_margen,
        # "score_dias_venta": score_dias_venta,
        "meses_analisis_salud": meses_analisis_salud,
        "dias_sin_venta_muerto": dias_sin_venta_muerto,
        "ordenar_por": ordenar_por,
        "incluir_solo_categorias": categorias_list,
        "incluir_solo_marcas": marcas_list
    }

    full_params_for_logging = dict(await request.form())

    # 2. Llamamos a la función manejadora central con toda la información
    return await _handle_report_generation(
        full_params_for_logging=full_params_for_logging,
        ventas_file_id=ventas_file_id,
        inventario_file_id=inventario_file_id,
        report_key="ReporteMaestro", # La clave única que definimos en la configuración
        processing_function=generar_reporte_maestro_inventario, # Tu función de lógica real
        # processing_function=lambda df_v, df_i, **kwargs: df_i.head(10), # Simulación
        processing_params=processing_params,
        output_filename="ReporteMaestro.xlsx",
        user_id=user_id,
        workspace_id=workspace_id,
        session_id=log_session_id
    )


@app.post("/reporte-puntos-alerta-stock", summary="Recomendación Puntos de Alerta de Stock", tags=["Análisis"])
async def reporte_puntos_alerta_stock(
    # Inyectamos el request para el logging
    request: Request, 
    # Definimos explícitamente los parámetros que la LÓGICA necesit
    current_user: Optional[dict] = Depends(get_current_user_optional),
    X_Session_ID: str = Header(..., alias="X-Session-ID"),
    workspace_id: Optional[str] = Form(None),
    ventas_file_id: str = Form(...),
    inventario_file_id: str = Form(...),
    lead_time_dias: int = Form(7.0),
    dias_seguridad_base: int = Form(0),
    factor_importancia_seguridad: float = Form(1.12),
    ordenar_por: str = Form("Diferencia_vs_Alerta_Minima"),
    excluir_sin_ventas: str = Form("true", description="String 'true' o 'false' para excluir productos sin ventas."),
    filtro_categorias_json: Optional[str] = Form(None),
    filtro_marcas_json: Optional[str] = Form(None)
):
    user_id = None
    
    # --- LÓGICA DE DETERMINACIÓN DE CONTEXTO ---
    if current_user:
        # CASO 1: Usuario Registrado
        if not workspace_id:
            raise HTTPException(status_code=400, detail="Se requiere un 'workspace_id' para usuarios autenticados.")
        user_id = current_user['email']
        print(f"Petición de usuario registrado: {user_id} para workspace: {workspace_id}")
        # Para el logging y descarga, pasamos el contexto del usuario
        log_session_id = None # No usamos el ID de sesión anónima
    
    elif X_Session_ID:
        # CASO 2: Usuario Anónimo
        print(f"Petición de usuario anónimo: {X_Session_ID}")
        log_session_id = X_Session_ID
    else:
        # CASO 3: No hay identificador, denegamos el acceso
        raise HTTPException(status_code=401, detail="No se proporcionó autenticación ni ID de sesión.")

    try:
        excluir_bool = excluir_sin_ventas.lower() == 'true'
        filtro_categorias = json.loads(filtro_categorias_json) if filtro_categorias_json else None
        filtro_marcas = json.loads(filtro_marcas_json) if filtro_marcas_json else None
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Formato de filtro inválido.")


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
        "factor_importancia_seguridad": factor_importancia_seguridad,
        "ordenar_por": ordenar_por,
        "excluir_sin_ventas": excluir_bool,
        "filtro_categorias": filtro_categorias,
        "filtro_marcas": filtro_marcas,
    }
    
    full_params_for_logging = dict(await request.form())

    # Llamamos a la función manejadora central
    return await _handle_report_generation(
        full_params_for_logging=full_params_for_logging,
        ventas_file_id=ventas_file_id,
        inventario_file_id=inventario_file_id,
        report_key="ReportePuntosAlertaStock",
        processing_function=process_csv_puntos_alerta_stock, # Pasamos la función de lógica como argumento
        processing_params=processing_params,
        output_filename="ReportePuntosAlertaStock.xlsx",
        user_id=user_id,
        workspace_id=workspace_id,
        session_id=log_session_id
    )


@app.post("/lista-basica-reposicion-historico", summary="Recomendación de Lista básica de reposición en funcion del histórico de ventas", tags=["Análisis"])
async def lista_basica_reposicion_historico(
    # Inyectamos el request para el logging
    request: Request, 
    # Definimos explícitamente los parámetros que la LÓGICA necesit
    current_user: Optional[dict] = Depends(get_current_user_optional),
    X_Session_ID: str = Header(..., alias="X-Session-ID"),
    workspace_id: Optional[str] = Form(None),

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
    # pesos_importancia_json: Optional[str] = Form(None, description='(Avanzado) Redefine los pesos del Índice de Importancia. Formato JSON.')
    # --- NUEVO: Recibimos los scores de la estrategia desde el frontend ---
    score_ventas: int = Form(...),
    score_ingreso: int = Form(...),
    score_margen: int = Form(...),
    score_dias_venta: int = Form(...)
):
    user_id = None
    
    # --- LÓGICA DE DETERMINACIÓN DE CONTEXTO ---
    if current_user:
        # CASO 1: Usuario Registrado
        if not workspace_id:
            raise HTTPException(status_code=400, detail="Se requiere un 'workspace_id' para usuarios autenticados.")
        user_id = current_user['email']
        print(f"Petición de usuario registrado: {user_id} para workspace: {workspace_id}")
        # Para el logging y descarga, pasamos el contexto del usuario
        log_session_id = None # No usamos el ID de sesión anónima
    
    elif X_Session_ID:
        # CASO 2: Usuario Anónimo
        print(f"Petición de usuario anónimo: {X_Session_ID}")
        log_session_id = X_Session_ID
    else:
        # CASO 3: No hay identificador, denegamos el acceso
        raise HTTPException(status_code=401, detail="No se proporcionó autenticación ni ID de sesión.")


    try:
        excluir_bool = excluir_sin_ventas.lower() == 'true'
        
        # Parseamos los strings JSON para convertirlos en listas de Python
        categorias_list = json.loads(incluir_solo_categorias) if incluir_solo_categorias else None
        marcas_list = json.loads(incluir_solo_marcas) if incluir_solo_marcas else None
        # pesos_importancia = json.loads(pesos_importancia_json) if pesos_importancia_json else None
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Formato de filtros (categorías/marcas) inválido. Se esperaba un string JSON.")

    # pesos_importancia = json.loads(pesos_importancia_json) if pesos_importancia_json else None
    # 1. Sumamos los scores recibidos
    total_scores = score_ventas + score_ingreso + score_margen + score_dias_venta

    # 2. Calculamos los pesos prorrateados, manejando el caso de división por cero
    if total_scores == 0:
        # Si todos los scores son 0, asignamos un peso equitativo
        pesos_calculados = {'ventas': 0.25, 'ingreso': 0.25, 'margen': 0.25, 'dias_venta': 0.25}
    else:
        pesos_calculados = {
            'ventas': score_ventas / total_scores,
            'ingreso': score_ingreso / total_scores,
            'margen': score_margen / total_scores,
            'dias_venta': score_dias_venta / total_scores
        }

    # Preparamos el diccionario de parámetros para la función de lógica
    processing_params = {
        "dias_analisis_ventas_recientes": dias_analisis_ventas_recientes,
        "dias_analisis_ventas_general": dias_analisis_ventas_general,
        "ordenar_por": ordenar_por,
        "incluir_solo_categorias": categorias_list,
        "incluir_solo_marcas": marcas_list,
        "excluir_sin_ventas": excluir_bool,
        "lead_time_dias": lead_time_dias,
        "dias_cobertura_ideal_base": dias_cobertura_ideal_base,
        "peso_ventas_historicas": peso_ventas_historicas,
        "pesos_importancia": pesos_calculados,
    }

    full_params_for_logging = dict(await request.form())

    # Llamamos a la función manejadora central
    return await _handle_report_generation(
        full_params_for_logging=full_params_for_logging,
        ventas_file_id=ventas_file_id,
        inventario_file_id=inventario_file_id,
        report_key="ReporteListaBasicaReposicionHistorica",
        processing_function=process_csv_lista_basica_reposicion_historico, # Pasamos la función de lógica como argumento
        processing_params=processing_params,
        output_filename="ReporteListaBasicaReposicionHistorica.xlsx",
        user_id=user_id,
        workspace_id=workspace_id,
        session_id=log_session_id
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


# --- 4. CREA EL NUEVO ENDPOINT ---
@app.post("/auditoria-margenes", summary="Genera el reporte de Auditoría de Márgenes", tags=["Reportes"])
async def generar_auditoria_margenes(
    # Inyectamos el request para el logging
    request: Request, 
    # Definimos explícitamente los parámetros que la LÓGICA necesit
    current_user: Optional[dict] = Depends(get_current_user_optional),
    X_Session_ID: str = Header(..., alias="X-Session-ID"),
    workspace_id: Optional[str] = Form(None),

    ventas_file_id: str = Form(...),
    inventario_file_id: str = Form(...),
    incluir_solo_categorias: str = Form("", description="String de categorías separadas por comas."),
    incluir_solo_marcas: str = Form("", description="String de marcas separadas por comas."),

    # --- Recibimos los nuevos parámetros del formulario ---
    tipo_analisis_margen: str = Form("desviacion_negativa"),
    umbral_desviacion_porcentaje: float = Form(10.0),
    ordenar_por: str = Form("impacto_financiero")
):
    
    user_id = current_user['email'] if current_user else None
    if user_id and not workspace_id:
        raise HTTPException(status_code=400, detail="Se requiere un 'workspace_id' para usuarios autenticados.")

    try:
        filtro_categorias = json.loads(incluir_solo_categorias) if incluir_solo_categorias else None
        filtro_marcas = json.loads(incluir_solo_marcas) if incluir_solo_marcas else None
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Formato de filtro inválido.")


    processing_params = {
        "tipo_analisis_margen": tipo_analisis_margen,
        "umbral_desviacion_porcentaje": umbral_desviacion_porcentaje,
        "filtro_categorias": filtro_categorias,
        "filtro_marcas": filtro_marcas,
        "ordenar_por": ordenar_por
    }
    
    full_params_for_logging = dict(await request.form())
    
    return await _handle_report_generation(
        full_params_for_logging=full_params_for_logging,
        report_key="ReporteAuditoriaMargenes",
        processing_function=auditar_margenes_de_productos_nuevo, # La nueva función de lógica
        processing_params=processing_params,
        output_filename="Auditoria_Margenes.xlsx",
        user_id=user_id,
        workspace_id=workspace_id,
        session_id=X_Session_ID,
        ventas_file_id=ventas_file_id,
        inventario_file_id=inventario_file_id
    )


@app.post("/diagnostico-catalogo", summary="Genera el Diagnóstico de Catálogo", tags=["Reportes"])
async def generar_diagnostico_catalogo(
    request: Request,
    # Definimos explícitamente los parámetros que la LÓGICA necesit
    current_user: Optional[dict] = Depends(get_current_user_optional),
    X_Session_ID: str = Header(..., alias="X-Session-ID"),
    workspace_id: Optional[str] = Form(None),

    ventas_file_id: str = Form(...),
    inventario_file_id: str = Form(...),
    # --- Recibimos los nuevos parámetros del formulario ---
    tipo_diagnostico_catalogo: str = Form(...),
    filtro_stock: str = Form("todos"),
    dias_inactividad: int = Form(365),
    ordenar_por: str = Form("valor_stock_s"),
    incluir_solo_categorias: Optional[str] = Form(None),
    incluir_solo_marcas: Optional[str] = Form(None)
):
    user_id = current_user['email'] if current_user else None
    if user_id and not workspace_id:
        raise HTTPException(status_code=400, detail="Se requiere un 'workspace_id' para usuarios autenticados.")

    try:
        filtro_categorias = json.loads(incluir_solo_categorias) if incluir_solo_categorias else None
        filtro_marcas = json.loads(incluir_solo_marcas) if incluir_solo_marcas else None
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Formato de filtro inválido.")

    processing_params = {
        "tipo_diagnostico_catalogo": tipo_diagnostico_catalogo,
        "filtro_stock": filtro_stock,
        "dias_inactividad": dias_inactividad,
        "filtro_categorias": filtro_categorias,
        "filtro_marcas": filtro_marcas,
        "ordenar_por": ordenar_por
    }

    full_params_for_logging = dict(await request.form())
    
    return await _handle_report_generation(
        full_params_for_logging=full_params_for_logging,
        report_key="ReporteDiagnosticoCatalogo",
        processing_function=diagnosticar_catalogo, # La nueva función de lógica
        processing_params=processing_params,
        # ... (el resto de los argumentos para el manejador)
        output_filename="Diagnostico_Catalogo.xlsx",
        user_id=user_id,
        workspace_id=workspace_id,
        session_id=X_Session_ID,
        ventas_file_id=ventas_file_id,
        inventario_file_id=inventario_file_id
    )


@app.post("/auditoria-calidad-datos", summary="Genera la Auditoría de Calidad de Datos", tags=["Reportes"])
async def generar_auditoria_calidad_datos(
    request: Request,
    # Definimos explícitamente los parámetros que la LÓGICA necesit
    current_user: Optional[dict] = Depends(get_current_user_optional),
    X_Session_ID: str = Header(..., alias="X-Session-ID"),
    workspace_id: Optional[str] = Form(None),

    inventario_file_id: str = Form(...), # Este reporte solo necesita el inventario
    # --- Recibimos los nuevos parámetros del formulario ---
    criterios_auditoria_json: str = Form(...),
    incluir_solo_categorias: Optional[str] = Form(None),
    incluir_solo_marcas: Optional[str] = Form(None),
    ordenar_por: str = Form("valor_stock_s")
):
    user_id = current_user['email'] if current_user else None
    if user_id and not workspace_id:
        raise HTTPException(status_code=400, detail="Se requiere un 'workspace_id' para usuarios autenticados.")

    try:
        criterios_auditoria = json.loads(criterios_auditoria_json)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Formato de criterios de auditoría inválido.")

    try:
        filtro_categorias = json.loads(incluir_solo_categorias) if incluir_solo_categorias else None
        filtro_marcas = json.loads(incluir_solo_marcas) if incluir_solo_marcas else None
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Formato de filtro inválido.")

    processing_params = {
        "criterios_auditoria": criterios_auditoria,
        "filtro_categorias": filtro_categorias,
        "ordenar_por": ordenar_por,
        "filtro_marcas": filtro_marcas
    }
    
    full_params_for_logging = dict(await request.form())

    return await _handle_report_generation(
        full_params_for_logging=full_params_for_logging,
        report_key="ReporteAuditoriaCalidadDatos",
        processing_function=auditar_calidad_datos, # La nueva función de lógica
        processing_params=processing_params,
        inventario_file_id=inventario_file_id,
        # Pasamos None para el archivo de ventas, ya que no se necesita
        ventas_file_id=None, 
        output_filename="Auditoria_Calidad_de_Datos.xlsx",
        user_id=user_id,
        workspace_id=workspace_id,
        session_id=X_Session_ID,
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
    # user_id: Optional[str] = None, # <-- Parámetro para el futuro (usuarios registrados)
    # workspace_id: Optional[str] = None,
    # session_id: Optional[str] = None
    # Ya no depende de 'request'. Recibe todos los contextos necesarios.
    full_params_for_logging: Dict[str, Any],
    report_key: str,
    processing_function: Callable,
    processing_params: Dict[str, Any],
    output_filename: str,
    # Parámetros de contexto. Solo un conjunto estará presente.
    user_id: Optional[str],
    workspace_id: Optional[str],
    session_id: Optional[str],
    # IDs de los archivos a procesar
    ventas_file_id: Optional[str],
    inventario_file_id: Optional[str]
):
    """
    Función central refactorizada que maneja la generación de CUALQUIER reporte
    para usuarios anónimos O registrados, aplicando la lógica de negocio correcta.
    """
    # --- PASO 1: DETERMINAR EL CONTEXTO Y LA REFERENCIA BASE EN FIRESTORE ---
    report_config = REPORTS_CONFIG.get(report_key)
    if not report_config:
        raise HTTPException(status_code=404, detail=f"La configuración para el reporte '{report_key}' no fue encontrada.")
    
    report_cost = report_config['costo']
    is_pro_report = report_config['isPro']

    # Esta es la lógica clave. `entity_ref` apuntará al documento que contiene los créditos.
    if user_id:
        # CONTEXTO: Usuario Registrado
        print(f"Procesando para usuario registrado: {user_id}")
        entity_ref = db.collection('usuarios').document(user_id)
    elif session_id:
        # CONTEXTO: Sesión Anónima
        print(f"Procesando para sesión anónima: {session_id}")
        entity_ref = db.collection('sesiones_anonimas').document(session_id)
    else:
        # Si no hay ningún identificador, es un error de lógica interna.
        raise HTTPException(status_code=500, detail="Error interno: no se pudo determinar el contexto de la sesión.")

    # --- PASO 2: VALIDACIONES DE NEGOCIO (Usando la referencia correcta) ---
    
    # Guardián de Acceso Pro
    if is_pro_report and user_id is None:
        print(f"🚫 Acceso denegado: Sesión anónima ({session_id}) intentó acceder al reporte PRO '{report_key}'.")
        raise HTTPException(status_code=403, detail="Este es un reporte 'Pro'. Debes registrarte para acceder.")

    # Cajero (Verificación de Créditos)
    entity_doc = entity_ref.get()
    if not entity_doc.exists:
        raise HTTPException(status_code=404, detail="La sesión o el perfil de usuario no existe.")
    
    creditos_restantes = entity_doc.to_dict().get("creditos_restantes", 0)
    if creditos_restantes < report_cost:
        raise HTTPException(status_code=402, detail=f"Créditos insuficientes. Este reporte requiere {report_cost} créditos y solo tienes {creditos_restantes}.")

    # --- PASO 3: PROCESAMIENTO Y GENERACIÓN (DENTRO DE UN TRY/EXCEPT) ---
    # Si algo falla aquí, es un error de ejecución. Lo registraremos como "fallido" sin cobrar.
    try:
        # --- INICIO DE LA NUEVA LÓGICA DE CARGA CONDICIONAL ---
        print("Iniciando carga de datos condicional...")
        
        tasks = []
        # Creamos una lista de tareas de descarga solo para los archivos que existen
        if ventas_file_id:
            tasks.append(descargar_contenido_de_storage(user_id, workspace_id, session_id, ventas_file_id))
        if inventario_file_id:
            tasks.append(descargar_contenido_de_storage(user_id, workspace_id, session_id, inventario_file_id))

        # Ejecutamos las tareas que se añadieron
        results = await asyncio.gather(*tasks)

        # Asignamos los resultados de vuelta con cuidado
        df_ventas = pd.DataFrame() # Default: DataFrame vacío
        df_inventario = pd.DataFrame() # Default: DataFrame vacío
        
        result_index = 0
        if ventas_file_id:
            df_ventas = pd.read_csv(io.BytesIO(results[result_index]))
            result_index += 1
        if inventario_file_id:
            df_inventario = pd.read_csv(io.BytesIO(results[result_index]))

        print("✅ Datos cargados y convertidos a DataFrames exitosamente.")
        # --- FIN DE LA NUEVA LÓGICA DE CARGA ---



        # # --- INICIO DE LA NUEVA LÓGICA DE CARGA CENTRALIZADA ---
        # print("Iniciando carga de datos centralizada...")
        
        # # 1. Descargamos ambos archivos en paralelo para máxima eficiencia
        # ventas_contents_task = descargar_contenido_de_storage(user_id, workspace_id, session_id, ventas_file_id)
        # inventario_contents_task = descargar_contenido_de_storage(user_id, workspace_id, session_id, inventario_file_id)
        
        # # Esperamos a que ambas descargas terminen
        # ventas_contents, inventario_contents = await asyncio.gather(
        #     ventas_contents_task,
        #     inventario_contents_task
        # )

        # # 2. Creamos los DataFrames una sola vez
        # # Aquí puedes poner tu lógica robusta para leer CSVs con diferentes formatos
        # df_ventas = pd.read_csv(io.BytesIO(ventas_contents), sep=',')
        # df_inventario = pd.read_csv(io.BytesIO(inventario_contents), sep=',')
        
        # print("✅ Datos cargados y convertidos a DataFrames exitosamente.")
        # # --- FIN DE LA NUEVA LÓGICA DE CARGA ---


        # Ahora, pasamos los DataFrames ya cargados a la función de lógica
        processing_result = processing_function(
            df_ventas=df_ventas.copy(), 
            df_inventario=df_inventario.copy(), 
            **processing_params
        )
        
        # Extraemos las partes del resultado
        resultado_df = processing_result.get("data")
        summary_data = processing_result.get("summary")

         # --- INICIO DE LA NUEVA LÓGICA DE TRUNCADO ---
        is_truncated = False
        total_rows = 0

        if user_id is None: # Si es un usuario anónimo
            if not resultado_df.empty:
                total_rows = len(resultado_df)
                if total_rows > 15:
                    print(f"Truncando resultado para sesión anónima. Mostrando 15 de {total_rows} filas.")
                    resultado_df = resultado_df.head(15)
                    is_truncated = True
        
        columnas = resultado_df.columns
        columnas_duplicadas = columnas[columnas.duplicated()].unique().tolist()
        
        if resultado_df is None or summary_data is None:
            raise ValueError("La función de procesamiento no devolvió la estructura de datos esperada.")

        updated_credits = None

        # Verificamos si el DataFrame resultante está vacío
        if resultado_df.empty:
            print(f"⚠️ Reporte '{report_key}' generado pero sin resultados. No se cobrarán créditos.")
            
            # Registramos el evento con costo 0 y un estado claro.
            log_report_generation(
                user_id=user_id, workspace_id=workspace_id, session_id=session_id,
                report_name=report_key, params=full_params_for_logging,
                ventas_file_id=ventas_file_id, inventario_file_id=inventario_file_id,
                creditos_consumidos=0, estado="exitoso_vacio"
            )

            # Devolvemos una respuesta JSON exitosa (200 OK) pero con datos vacíos
            # y un insight que explica la situación.
            return JSONResponse(content={
                "insight": "No se encontraron productos que coincidan con los parámetros seleccionados.",
                "kpis": {}, # Devolvemos un objeto de KPIs vacío
                "data": [],  # Devolvemos una lista de datos vacía
                "report_key": report_key,
                "is_truncated": is_truncated, # <-- Nuevo flag
                "total_rows": total_rows  
            })

        # if columnas_duplicadas:
        #     print("\n--- 🕵️  DEBUG: ¡ADVERTENCIA DE COLUMNAS DUPLICADAS! ---")
        #     print(f"El DataFrame final para el reporte '{report_key}' tiene nombres de columna repetidos:")
        #     print(f"Columnas duplicadas encontradas: {columnas_duplicadas}")
        #     print("Esto causará que se omitan datos en el frontend. Revisa tu función de procesamiento para renombrar o eliminar estas columnas antes de devolver el DataFrame.")
        #     print("-----------------------------------------------------------\n")
        #     # Opcional: Podrías decidir lanzar un error aquí para forzar la corrección
        #     # raise ValueError(f"Columnas duplicadas detectadas: {columnas_duplicadas}")
        # # --- FIN DEL BLOQUE DE DEPURACIÓN ---
        
        # --- INICIO DE LA NUEVA LÓGICA DE LIMPIEZA CENTRALIZADA ---
        print("Ejecutando limpieza de datos centralizada...")

        # 1. Reemplazamos infinitos con NaN
        df_limpio = resultado_df.replace([np.inf, -np.inf], np.nan)
        
        # 2. Convertimos el DataFrame limpio a un diccionario. 
        #    Este paso puede convertir los pd.NA o NaT a NaN de Python.
        records = df_limpio.to_dict(orient='records')

        # 3. Iteramos sobre la lista de diccionarios para reemplazar los NaN por None.
        #    Esta es la forma más segura de garantizar la compatibilidad con JSON.
        data_for_frontend = [
            {k: (None if pd.isna(v) else v) for k, v in row.items()}
            for row in records
        ]
        print("✅ Limpieza de datos completada.")

        insight_text = f"Análisis completado. Se encontraron {len(resultado_df)} productos que cumplen los criterios."
        if resultado_df.empty:
            insight_text = "El análisis se completó, pero no se encontraron productos con los filtros seleccionados."
        
        # Convertimos el DataFrame a un formato JSON (lista de diccionarios)
        # data_for_frontend = resultado_df.to_dict(orient='records')
        
        # # --- Transacción Final ---
        # if not data_for_frontend:
        #     log_report_generation(
        #         user_id=user_id, workspace_id=workspace_id, session_id=session_id,
        #         report_name=report_key, params=full_params_for_logging,
        #         ventas_file_id=ventas_file_id, inventario_file_id=inventario_file_id,
        #         creditos_consumidos=0, estado="exitoso_vacio"
        #     )
        
        # Usamos la `entity_ref` correcta para descontar créditos
        entity_ref.update({"creditos_restantes": firestore.Increment(-report_cost)})
            
        # --- CAMBIO CLAVE: Leemos el nuevo saldo DESPUÉS de la actualización ---
        updated_doc = entity_ref.get()
        updated_data = updated_doc.to_dict()
        new_remaining = updated_data.get("creditos_restantes", 0)
        initial_credits = updated_data.get("creditos_iniciales", 0)
        
        updated_credits = {
            "used": initial_credits - new_remaining,
            "remaining": new_remaining
        }

        log_report_generation(
            user_id=user_id, workspace_id=workspace_id, session_id=session_id,
            report_name=report_key, params=full_params_for_logging,
            ventas_file_id=ventas_file_id, inventario_file_id=inventario_file_id,
            creditos_consumidos=report_cost, estado="exitoso"
        )

        if user_id and workspace_id:
            workspace_ref = db.collection('usuarios').document(user_id).collection('espacios_trabajo').document(workspace_id)
            workspace_ref.update({"fechaModificacion": datetime.now(timezone.utc)})

        return JSONResponse(content={
            "insight": summary_data.get("insight"),
            "kpis": summary_data.get("kpis"),
            "data": data_for_frontend,
            "report_key": report_key,
            "updated_credits": updated_credits,
            "is_truncated": is_truncated, # <-- Nuevo flag
            "total_rows": total_rows  
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
            user_id=user_id, workspace_id=workspace_id, session_id=session_id,
            report_name=report_key, params=full_params_for_logging,
            ventas_file_id=ventas_file_id, inventario_file_id=inventario_file_id,
            creditos_consumidos=0, estado="fallido",
            error_details={"user_message": user_message, "error_type": type(e).__name__, "technical_details": str(e)}
        )

        if user_id and workspace_id:
            workspace_ref = db.collection('usuarios').document(user_id).collection('espacios_trabajo').document(workspace_id)
            workspace_ref.update({"fechaModificacion": datetime.now(timezone.utc)})

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

# ===================================================================================
# --- ENDPOINT DE DIAGNÓSTICO TEMPORAL ---
# ===================================================================================
@app.post("/debug/auditoria-margenes", summary="[Debug] Audita los márgenes para encontrar inconsistencias", tags=["Debug"])
async def run_auditoria_margenes(
    request: Request,
    # Recibe los mismos parámetros de contexto que tus otros reportes
    current_user: Optional[dict] = Depends(get_current_user_optional),
    X_Session_ID: Optional[str] = Header(None, alias="X-Session-ID"),
    workspace_id: Optional[str] = Form(None),
    ventas_file_id: str = Form(...),
    inventario_file_id: str = Form(...)
):
    """
    Este endpoint especial ejecuta la auditoría de márgenes y devuelve un
    reporte con los productos que se están vendiendo por debajo del costo.
    """
    # Determinamos el contexto (anónimo o registrado)
    user_id = current_user['email'] if current_user else None
    if user_id and not workspace_id:
        raise HTTPException(status_code=400, detail="Se requiere un 'workspace_id' para usuarios autenticados.")

    print(f"🔥 current_user: {user_id}")
    print(f"🔥 X_Session_ID: {X_Session_ID}")
    print(f"🔥 workspace_id: {workspace_id}")
    print(f"🔥 ventas_file_id: {ventas_file_id}")
    print(f"🔥 inventario_file_id: {inventario_file_id}")

    # Llamamos a nuestra función manejadora central, pasándole la nueva función de auditoría
    return await _handle_report_generation(
        full_params_for_logging=dict(await request.form()),
        report_key="AuditoriaMargenes", # Una clave interna para este reporte
        processing_function=auditar_margenes_de_productos,
        processing_params={}, # La función de auditoría no necesita parámetros extra
        output_filename="Auditoria_De_Margenes.xlsx",
        user_id=user_id,
        workspace_id=workspace_id,
        session_id=X_Session_ID,
        ventas_file_id=ventas_file_id,
        inventario_file_id=inventario_file_id
    )

