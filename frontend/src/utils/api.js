import axios from 'axios';

// --- CONFIGURACIÓN DE LA URL BASE ---
// Usamos una URL simple para evitar los errores de compilación con `import.meta.env`.
// Si tu configuración de Vite/React lo permite, puedes volver a usar la variable de entorno.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// 1. Creamos una instancia de Axios con configuración base.
// Todas las peticiones hechas con `api` usarán esta URL como prefijo.
const api = axios.create({
  baseURL: API_URL
});

// 2. Usamos un "interceptor" de peticiones.
// Esta es la parte mágica. Es una función que se ejecuta AUTOMÁTICAMENTE
// antes de que CUALQUIER petición sea enviada al servidor.
api.interceptors.request.use(
  (config) => {
    // Intentamos obtener el token de autenticación desde localStorage.
    const token = localStorage.getItem('accessToken');
    
    // Si existe un token (el usuario está logueado)...
    if (token) {
      // ...lo añadimos a la cabecera 'Authorization' de la petición.
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Devolvemos la configuración modificada para que la petición continúe.
    return config;
  },
  (error) => {
    // Si hay un error al configurar la petición, lo rechazamos.
    return Promise.reject(error);
  }
);

export default api;