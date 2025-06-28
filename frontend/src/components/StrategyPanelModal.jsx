// src/components/StrategyPanelModal.jsx (Nueva Lógica de "Borrador")

import React, { useState, useEffect } from 'react';
import { StrategyPanel } from './StrategyPanel';
import { FiX, FiSave } from 'react-icons/fi';
import { useStrategy } from '../context/StrategyProvider';

export function StrategyPanelModal({ onClose }) {
  // 1. Obtenemos los datos y funciones del contexto
  const { strategy: masterStrategy, saveStrategy, isLoading: isContextLoading } = useStrategy();
  
  // 2. Creamos un estado "borrador" local. Se inicializa con la estrategia maestra.
  const [draftStrategy, setDraftStrategy] = useState(masterStrategy);
  const [isSaving, setIsSaving] = useState(false);

  // Efecto que reinicia el borrador si el modal se abre con una nueva estrategia maestra
  useEffect(() => {
    setDraftStrategy(masterStrategy);
  }, [masterStrategy]);

  // 3. Función que se ejecuta al hacer clic en Guardar
  const handleSave = async () => {
    if (!draftStrategy) return;
    setIsSaving(true);
    try {
      // Llamamos a la función de guardado del contexto con el borrador
      await saveStrategy(draftStrategy);
      onClose(); // Cerramos el modal solo si el guardado fue exitoso
    } catch (error) {
      alert("No se pudieron guardar los cambios en el servidor.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-50 rounded-lg shadow-xl max-w-4xl w-full flex flex-col max-h-[90vh]">
        <div className="p-4 border-b flex justify-end items-center sticky top-0 bg-gray-50">
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700"><FiX size={28}/></button>
        </div>
        
        <div className="overflow-y-auto">
          {isContextLoading ? (
            <div className="p-10 text-center">Cargando Estrategia...</div>
          ) : (
            <StrategyPanel 
                strategy={draftStrategy} 
                setStrategy={setDraftStrategy} 
            />
          )}
        </div>
        
        {/* --- NUEVA BOTONERA CON ACCIONES EXPLÍCITAS --- */}
        <div className="p-4 border-t bg-white z-10 shadow text-center sticky bottom-0 flex gap-4">
            <button
              onClick={onClose} // Cancelar simplemente cierra el modal
              className="flex-1 text-gray-700 bg-gray-200 text-base px-4 py-3 font-bold rounded-lg hover:bg-gray-300"
              disabled={isSaving}
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="flex-1 bg-purple-600 text-white text-base px-4 py-3 font-bold rounded-lg hover:bg-purple-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
              disabled={isSaving}
            >
              {isSaving ? "Guardando..." : <><FiSave /> Guardar Cambios</>}
            </button>
        </div>
      </div>
    </div>
  );
}