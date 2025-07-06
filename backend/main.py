import os
import uvicorn
import json

from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm

from fastapi import Depends, FastAPI, UploadFile, File, Form, status, Header, Request, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi import HTTPException
import pandas as pd
import traceback
import io
import math
import uuid
import httpx

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
from track_expenses import generar_reporte_maestro_inventario
from report_config import REPORTS_CONFIG
from plan_config import PLANS_CONFIG
from strategy_config import DEFAULT_STRATEGY
from tooltips_config import TOOLTIPS_GLOSSARY

INITIAL_CREDITS = 25

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
            "tooltips": TOOLTIPS_GLOSSARY
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
        "fechaCreacion": now_utc
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
# --- NUEVO ENDPOINT PARA OBTENER EL ESTADO DE UN WORKSPACE ESPECÍFICO ---
# ===================================================================================
@app.get("/workspaces/{workspace_id}/state", summary="Recupera el estado de un espacio de trabajo (con caché de filtros)", tags=["Espacios de Trabajo"])
async def get_workspace_state(
    workspace_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Busca en Firestore el estado completo de un espacio de trabajo.
    Ahora, prioriza la lectura de los filtros cacheados directamente desde el
    documento del workspace para una carga más rápida.
    """
    try:
        user_email = current_user.get("email")
        
        # --- 1. Obtener datos del usuario y del workspace ---
        user_ref = db.collection('usuarios').document(user_email)
        workspace_ref = user_ref.collection('espacios_trabajo').document(workspace_id)
        
        user_doc = user_ref.get()
        workspace_doc = workspace_ref.get()

        if not user_doc.exists or not workspace_doc.exists:
            raise HTTPException(status_code=404, detail="Usuario o espacio de trabajo no encontrado.")
        
        user_data = user_doc.to_dict()
        workspace_data = workspace_doc.to_dict()

        # --- 2. LÓGICA DE CACHÉ PARA LOS FILTROS ---
        available_filters = None
        
        # Primero, intentamos leer los filtros directamente desde el caché en el documento del workspace
        if "filtros_disponibles" in workspace_data:
            print(f"✅ Filtros encontrados en el caché de Firestore para el workspace '{workspace_id}'.")
            available_filters = workspace_data["filtros_disponibles"]
        
        # --- 3. Obtener los últimos archivos cargados (la lógica no cambia) ---
        files_ref = workspace_ref.collection('archivos_cargados')
        query_ventas = files_ref.where(filter=FieldFilter("tipoArchivo", "==", "ventas")).order_by("fechaCarga", direction=firestore.Query.DESCENDING).limit(1)
        query_inventario = files_ref.where(filter=FieldFilter("tipoArchivo", "==", "inventario")).order_by("fechaCarga", direction=firestore.Query.DESCENDING).limit(1)
        
        last_venta_id = next(query_ventas.stream(), None)
        last_inventario_id = next(query_inventario.stream(), None)

        files_map = {
            "ventas": last_venta_id.id if last_venta_id else None,
            "inventario": last_inventario_id.id if last_inventario_id else None
        }

        # --- 4. Fallback (Plan B): Si no hay caché, lo generamos al vuelo ---
        # Esto da robustez al sistema si se trabaja con un workspace antiguo que no tenía el caché.
        if available_filters is None and files_map["inventario"]:
            print(f"⚠️ Filtros no encontrados en caché. Generando al vuelo para el workspace '{workspace_id}'.")
            inventario_contents = descargar_contenido_de_storage(user_email, workspace_id, None, files_map["inventario"])
            df_inventario = pd.read_csv(io.BytesIO(inventario_contents), sep=',')
            metadata = extraer_metadatos_df(df_inventario, 'inventario')
            available_filters = {
                "categorias": metadata.get("lista_completa_categorias", []),
                "marcas": metadata.get("lista_completa_marcas", [])
            }

        # --- 5. Obtener el resto de la información (créditos e historial) ---
        creditos_restantes = user_data.get("creditos_restantes", 0)
        creditos_iniciales = user_data.get("creditos_iniciales", 0)
        creditos_usados = creditos_iniciales - creditos_restantes
        
        historial_ref = workspace_ref.collection('reportes_generados')
        query_historial = historial_ref.order_by("fechaGeneracion", direction=firestore.Query.DESCENDING).limit(10)
        
        historial_list = []
        for doc in query_historial.stream():
            doc_data = doc.to_dict()
            if 'fechaGeneracion' in doc_data and isinstance(doc_data['fechaGeneracion'], datetime):
                doc_data['fechaGeneracion'] = doc_data['fechaGeneracion'].isoformat()
            historial_list.append(doc_data)

        # --- 6. Construir y devolver la respuesta completa ---
        return JSONResponse(content={
            "credits": {"used": creditos_usados, "remaining": creditos_restantes},
            "history": historial_list,
            "files": files_map,
            "available_filters": available_filters or {"categorias": [], "marcas": []} # Aseguramos que siempre sea un objeto
        })

    except Exception as e:
        print(f"🔥 Error al recuperar estado del workspace {workspace_id}: {e}")
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
        # Apuntamos a la sub-colección 'espacios_trabajo' del usuario logueado
        workspaces_ref = db.collection('usuarios').document(user_email).collection('espacios_trabajo')
        
        # Le pedimos a Firestore que ordene por el timestamp
        query = workspaces_ref.order_by("fechaUltimoAcceso", direction=firestore.Query.DESCENDING)
        
        workspaces = []
        for doc in workspaces_ref.stream():
            workspace_data = doc.to_dict()
            workspace_data['id'] = doc.id # Es crucial añadir el ID del documento
            if 'fechaCreacion' in workspace_data and isinstance(workspace_data['fechaCreacion'], datetime):
                # Convertimos la fecha a un string en formato ISO 8601, que Javascript entiende
                workspace_data['fechaCreacion'] = workspace_data['fechaCreacion'].isoformat()
            workspaces.append(workspace_data)
            
        return workspaces
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
        if not workspace_id:
            raise HTTPException(status_code=400, detail="Se requiere un 'workspace_id' para usuarios autenticados.")
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

        # --- INICIO DE LA NUEVA LÓGICA DE CACHÉ ---
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

        # La construcción de la respuesta no cambia
        response_content = {
            "message": f"Archivo de {tipo_archivo} subido exitosamente.",
            "file_id": file_id,
            "tipo_archivo": tipo_archivo,
            "nombre_original": file.filename
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
    peso_ingresos: Optional[float] = Form(0.5), # Recibimos los pesos opcionales
    peso_margen: Optional[float] = Form(0.3),
    peso_unidades: Optional[float] = Form(0.2)
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
    pesos_importancia_json: Optional[str] = Form(None, description='(Avanzado) Redefine los pesos del Índice de Importancia. Formato JSON.')
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


@app.post("/diagnostico-stock-muerto")
async def diagnostico_stock_muerto(
    # Inyectamos el request para el logging
    request: Request, 
    current_user: Optional[dict] = Depends(get_current_user_optional),
    X_Session_ID: Optional[str] = Header(None, alias="X-Session-ID"),
    workspace_id: Optional[str] = Form(None),

    # Definimos explícitamente los parámetros que la LÓGICA necesit
    ventas_file_id: str = Form(...),
    inventario_file_id: str = Form(...),
    # meses_analisis: int = Form(...)
    # meses: int = Query(6, description="Cantidad de meses hacia atrás para analizar")
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

    processing_params = {}
    full_params_for_logging = dict(await request.form())

    return await _handle_report_generation(
        full_params_for_logging=full_params_for_logging,
        report_key="ReporteDiagnosticoStockMuerto",
        processing_function=procesar_stock_muerto,
        processing_params=processing_params,
        output_filename="ReporteDiagnosticoStockMuerto.xlsx",
        # --- Pasamos el contexto correcto al manejador ---
        user_id=user_id,
        workspace_id=workspace_id,
        session_id=log_session_id,
        ventas_file_id=ventas_file_id,
        inventario_file_id=inventario_file_id
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
    
    # --- Parámetros Opcionales para el Criterio 'Combinado' ---
    peso_ingresos: Optional[float] = Form(None, description="Peso para ingresos (ej: 0.5) si el criterio es 'combinado'."),
    peso_margen: Optional[float] = Form(None, description="Peso para margen (ej: 0.3) si el criterio es 'combinado'."),
    peso_unidades: Optional[float] = Form(None, description="Peso para unidades (ej: 0.2) si el criterio es 'combinado'."),

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
    lead_time_dias: int = Form(...),
    dias_seguridad_base: int = Form(...)
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
    pesos_importancia_json: Optional[str] = Form(None, description='(Avanzado) Redefine los pesos del Índice de Importancia. Formato JSON.')
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
    ventas_file_id: str,
    inventario_file_id: str
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
         # La llamada a las funciones auxiliares ahora incluye el contexto completo
        ventas_contents = descargar_contenido_de_storage(user_id, workspace_id, session_id, ventas_file_id)
        inventario_contents = descargar_contenido_de_storage(user_id, workspace_id, session_id, inventario_file_id)
        
        df_ventas = pd.read_csv(io.BytesIO(ventas_contents), sep=',')
        df_inventario = pd.read_csv(io.BytesIO(inventario_contents), sep=',')
        
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
        
        # --- Transacción Final ---
        if resultado_df.empty:
            log_report_generation(
                user_id=user_id, workspace_id=workspace_id, session_id=session_id,
                report_name=report_key, params=full_params_for_logging,
                ventas_file_id=ventas_file_id, inventario_file_id=inventario_file_id,
                creditos_consumidos=0, estado="exitoso_vacio"
            )
        else:
            # Usamos la `entity_ref` correcta para descontar créditos
            entity_ref.update({"creditos_restantes": firestore.Increment(-report_cost)})
            log_report_generation(
                user_id=user_id, workspace_id=workspace_id, session_id=session_id,
                report_name=report_key, params=full_params_for_logging,
                ventas_file_id=ventas_file_id, inventario_file_id=inventario_file_id,
                creditos_consumidos=report_cost, estado="exitoso"
            )

        if user_id and workspace_id:
            workspace_ref = db.collection('usuarios').document(user_id).collection('espacios_trabajo').document(workspace_id)
            workspace_ref.update({"fechaModificacion": datetime.now(timezone.utc)})

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

