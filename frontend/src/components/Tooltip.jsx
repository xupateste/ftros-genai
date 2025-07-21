// src/components/Tooltip.jsx

import React, { useState } from 'react';
import {
  useFloating,
  useClick,
  useDismiss,
  useRole,
  useInteractions,
  autoUpdate,
  offset,
  flip,
  shift,
} from '@floating-ui/react';
import { FiInfo } from 'react-icons/fi';

export function Tooltip({ text }) {
  const [isOpen, setIsOpen] = useState(false);

  // --- LÓGICA DE FLOATING UI ---
  // 1. useFloating es el cerebro. Le decimos que queremos el tooltip arriba,
  //    y le damos los "superpoderes":
  //    - offset(10): Añade un pequeño espacio de 10px entre el icono y el tooltip.
  //    - flip(): Si no hay espacio arriba, lo "voltea" y lo pone abajo.
  //    - shift({ padding: 8 }): Si se sale por los lados, lo "desplaza" para que quepa.
  const { refs, floatingStyles, context } = useFloating({
    placement: 'top',
    open: isOpen,
    onOpenChange: setIsOpen,
    middleware: [offset(10), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  // 2. Definimos las interacciones del usuario
  const click = useClick(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: 'tooltip' });

  // 3. Combinamos las interacciones en props que podemos pasar a los elementos
  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
    role,
  ]);

  // Si no hay texto de ayuda, no renderizamos nada
  if (!text) {
    return null;
  }

  return (
    <>
      {/* El icono de información es ahora el "ancla" */}
      <button 
        ref={refs.setReference}
        {...getReferenceProps()}
        type="button" 
        className="text-gray-400 hover:text-purple-600 focus:outline-none ml-2"
        aria-label="Más información"
      >
        <FiInfo className="cursor-help" size={14} />
      </button>

      {/* El tooltip es el elemento "flotante" */}
      {isOpen && (
        <div
          ref={refs.setFloating}
          style={floatingStyles}
          {...getFloatingProps()}
          className="z-20 w-64 rounded-lg bg-gray-800 p-3 text-left text-sm font-normal text-white shadow-lg animate-fade-in-fast"
        >
          {text}
          {/* Pequeño triángulo para apuntar al icono (opcional pero recomendado) */}
          {/*<div className="absolute -bottom-2 left-1/2 h-0 w-0 -translate-x-1/2 border-x-8 border-t-8 border-x-transparent border-t-gray-800"></div>*/}
        </div>
      )}
    </>
  );
}
