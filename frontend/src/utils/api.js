// import axios from 'axios';

// // --- CONFIGURACIÓN DE LA URL BASE ---
// // Usamos una URL simple para evitar los errores de compilación con `import.meta.env`.
// // Si tu configuración de Vite/React lo permite, puedes volver a usar la variable de entorno.
// const API_URL = import.meta.env.VITE_API_URL || 'https://localhost:8000';

// // 1. Creamos una instancia de Axios con configuración base.
// // Todas las peticiones hechas con `api` usarán esta URL como prefijo.
// const api = axios.create({
//   baseURL: API_URL
// });

// // 2. Usamos un "interceptor" de peticiones.
// // Esta es la parte mágica. Es una función que se ejecuta AUTOMÁTICAMENTE
// // antes de que CUALQUIER petición sea enviada al servidor.
// api.interceptors.request.use(
//   (config) => {
//     // Intentamos obtener el token de autenticación desde localStorage.
//     const token = localStorage.getItem('accessToken');
    
//     // Si existe un token (el usuario está logueado)...
//     if (token) {
//       // ...lo añadimos a la cabecera 'Authorization' de la petición.
//       config.headers['Authorization'] = `Bearer ${token}`;
//     }
    
//     // Devolvemos la configuración modificada para que la petición continúe.
//     return config;
//   },
//   (error) => {
//     // Si hay un error al configurar la petición, lo rechazamos.
//     return Promise.reject(error);
//   }
// );

// export default api;

// src/utils/api.js

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
});

// --- INTERCEPTOR DE PETICIONES ---
// Antes de que cada petición sea enviada, este interceptor se ejecuta.
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      // Si existe un token, lo añadimos a la cabecera de autorización.
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// --- INTERCEPTOR DE RESPUESTAS ---
// Después de que el servidor responde, este interceptor revisa la respuesta.
api.interceptors.response.use(
  (response) => {
    // Si la respuesta es exitosa (ej. 200 OK), simplemente la devuelve.
    return response;
  },
  (error) => {
    // --- LÓGICA CLAVE: MANEJO DE SESIÓN EXPIRADA ---
    // Verificamos si el error es porque la sesión expiró (error 401).
    if (error.response && error.response.status === 401) {
      console.log("Sesión expirada detectada. Cerrando sesión...");
      
      // 1. Limpiamos el token inválido del almacenamiento.
      localStorage.removeItem('accessToken');
      
      // 2. Redirigimos al usuario a la página de inicio.
      // Añadimos un parámetro para que la página de inicio pueda mostrar un mensaje.
      window.location.href = '/?session_expired=true';
    }
    
    // Para cualquier otro error, simplemente lo devolvemos para que el
    // componente que hizo la llamada pueda manejarlo.
    return Promise.reject(error);
  }
);

export default api;
