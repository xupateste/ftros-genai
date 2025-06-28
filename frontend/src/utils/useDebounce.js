// src/utils/useDebounce.js
import { useState, useEffect } from 'react';

// Este hook toma un valor y solo lo actualiza después de un cierto tiempo sin cambios.
export function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Configura un temporizador para actualizar el valor
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Limpia el temporizador si el valor cambia antes de que pase el tiempo
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]); // Solo se re-ejecuta si el valor o el delay cambian

  return debouncedValue;
}