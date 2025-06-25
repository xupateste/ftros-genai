import os
import firebase_admin
from firebase_admin import credentials, firestore, storage
from dotenv import load_dotenv
import sys # Importar sys

# Carga las variables desde el archivo .env al entorno de la aplicación.
# Es importante llamar a esta función antes de intentar acceder a las variables.
load_dotenv()

# --- Leemos las variables del entorno ---
# Usamos os.getenv() para leer las variables que acabamos de cargar.
PATH_CREDENCIALES = os.getenv("FIREBASE_CREDS_PATH")
URL_BUCKET_STORAGE = os.getenv("FIREBASE_STORAGE_BUCKET_URL")

# --- Verificación de robustez ---
# Es una buena práctica verificar que las variables críticas existan.
if not PATH_CREDENCIALES or not URL_BUCKET_STORAGE:
    raise ValueError("Error: Las variables de entorno FIREBASE_CREDS_PATH y FIREBASE_STORAGE_BUCKET_URL deben estar definidas en el archivo .env")

try:
    cred = credentials.Certificate(PATH_CREDENCIALES)
    firebase_admin.initialize_app(cred, {
        'storageBucket': URL_BUCKET_STORAGE
    })
    print("✅ Conexión con Firebase inicializada exitosamente.")
except Exception as e:
    print(f"🔥 Error al inicializar Firebase: {e}")
    print("Asegúrate de que la ruta en FIREBASE_CREDS_PATH sea correcta y el archivo exista.")
    sys.exit(1) # Detiene la aplicación si la inicialización falla

db = firestore.client()
bucket = storage.bucket()