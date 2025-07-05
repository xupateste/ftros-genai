// src/components/StrategyPanelModal.jsx

import React, { useState, useEffect } from 'react';
import { StrategyPanel } from './StrategyPanel';
import { useStrategy } from '../context/StrategyProvider';
import { FiX, FiSave, FiLoader } from 'react-icons/fi';

export function StrategyPanelModal({ onClose, context }) {
  const { 
    strategy: masterStrategy, 
    setStrategy: setMasterStrategy, // Para la actualización local de anónimos
    saveStrategy, 
    resetStrategy, 
    isLoading 
  } = useStrategy();
  
  const [draftStrategy, setDraftStrategy] = useState(masterStrategy);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setDraftStrategy(masterStrategy);
  }, [masterStrategy]);

  const handleSave = async () => {
    if (!draftStrategy) return;
    setIsSaving(true);
    try {
      if (context.type === 'user') {
        // Para usuarios registrados, guardamos en la base de datos
        await saveStrategy(draftStrategy, context);
      } else {
        // Para usuarios anónimos, solo actualizamos el estado global de React
        setMasterStrategy(draftStrategy);
        console.log("Estrategia anónima actualizada localmente.");
      }
      onClose();
    } catch (error) {
      alert("No se pudieron guardar los cambios.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestore = async () => {
    await resetStrategy(context);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-gray-50 rounded-lg shadow-xl max-w-4xl w-full flex flex-col max-h-[90vh]">
        <div className="p-4 border-b flex justify-end items-center sticky top-0 bg-gray-50">
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700"><FiX size={28}/></button>
        </div>
        
        <div className="overflow-y-auto">
          <StrategyPanel 
              strategy={draftStrategy} 
              setStrategy={setDraftStrategy}
              onRestore={handleRestore}
              context={context}
              isLoading={isLoading}
          />
        </div>
        
        <div className="p-4 border-t bg-white z-10 shadow text-center sticky bottom-0 flex gap-4">
            <button onClick={onClose} className="flex-1 text-gray-700 bg-gray-200 ...">Cancelar</button>
            <button onClick={handleSave} className="flex-1 bg-purple-600 text-white ..." disabled={isSaving || isLoading}>
              {isSaving ? "Guardando..." : <><FiSave /> Guardar Cambios</>}
            </button>
        </div>
      </div>
    </div>
  );
}
