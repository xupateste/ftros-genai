# ===================================================================================
# --- CONFIGURACIÓN CENTRAL DE PLANES Y BENEFICIOS ---
# ===================================================================================
PLANS_CONFIG = {
    "gratis": {
        "plan_name": "Gratuito",
        "workspace_limit": 3, # Límite para usuarios registrados gratuitos
        "can_access_pro_reports": False,
        "can_edit_strategy": False,
        "max_file_rows": 5000 # Límite de filas en los archivos CSV/Excel
    },
    "pro": {
        "plan_name": "Profesional",
        "workspace_limit": 10, # Límite para el primer nivel de pago
        "can_access_pro_reports": True,
        "can_edit_strategy": True,
        "max_file_rows": 50000
    },
    "diamond": {
        "plan_name": "Diamante",
        "workspace_limit": -1, # -1 significa sin límite
        "can_access_pro_reports": True,
        "can_edit_strategy": True,
        "max_file_rows": -1 # Sin límite de filas
    }
}