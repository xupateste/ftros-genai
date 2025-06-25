// src/utils/sessionManager.js

import { v4 as uuidv4 } from 'uuid';

const SESSION_ID_KEY = 'anonymousSessionId';

/**
 * Obtiene el ID de sesión anónima del localStorage.
 * Si no existe, crea uno nuevo, lo guarda y lo devuelve.
 * @returns {string} El ID de sesión único.
 */
export const getSessionId = () => {
  let sessionId = localStorage.getItem(SESSION_ID_KEY);

  if (!sessionId) {
    sessionId = uuidv4();
    localStorage.setItem(SESSION_ID_KEY, sessionId);
    console.log('Nueva sesión anónima creada:', sessionId);
  }

  return sessionId;
};