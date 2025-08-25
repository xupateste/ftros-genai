// src/components/AnimateOnScroll.jsx

import React, { useState, useEffect, useRef } from 'react';

export function AnimateOnScroll({ children, onVisible, delay = 0, threshold = 0.1 }) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Si el elemento es visible, actualizamos el estado
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (onVisible) {
              onVisible();
          }
          // Desconectamos el observador después de la primera vez para que la animación no se repita
          observer.unobserve(entry.target);
        }
      },
      {
        threshold, // El porcentaje del elemento que debe ser visible para activarse
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    // Limpieza al desmontar el componente
    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [ref, threshold, onVisible]);

  return (
    <div
      ref={ref}
      className={isVisible ? 'animate-fade-in-up' : 'opacity-0'} // Aplica la animación solo cuando es visible
      style={{ animationDelay: `${delay}ms` }} // Aplica el retraso
    >
      {children}
    </div>
  );
}
