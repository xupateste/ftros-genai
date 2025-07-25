// src/components/ConnectionsModal.jsx

import React, { useState } from 'react';
import { FiX, FiZap, FiDatabase, FiChevronRight, FiCheckCircle } from 'react-icons/fi';

// --- NUEVO: Centralizamos la información de los sistemas ---
// Esto hace que el código sea más limpio y fácil de expandir en el futuro.
const SYSTEMS = {
  'Bsale': { name: 'Bsale', logo: '🅱️' },
  'Wally': { name: 'Wally', logo: 'ⓦ' },
  'Shopify': { name: 'Shopify', logo: '🛍️' },
  'WooCommerce': { name: 'WooCommerce', logo: 'ⓦ' },
  'Otro Sistema POS': { name: 'Otro Sistema POS', logo: '🧾' },
  'API Personalizada': { name: 'API Personalizada', logo: <FiDatabase /> },
};

// Simulación de logos. En una app real, usarías <img> con los SVGs o PNGs de las marcas.
const ConnectionCard = ({ name, logo, onClick }) => (
  <button 
    onClick={onClick}
    className="flex items-center w-full p-4 border rounded-lg hover:bg-gray-100 hover:border-purple-500 transition-all"
  >
    <div className="text-2xl pr-2">{logo}</div>
    <span className="font-semibold text-gray-700">{name}</span>
    <FiChevronRight className="ml-auto text-gray-400" />
  </button>
);

export function ConnectionsModal({ context, onClose, onUpgrade }) {
  const [view, setView] = useState('selection'); // 'selection' o 'details'
  const [selectedSystem, setSelectedSystem] = useState(null);

  const handleSelect = (systemName) => {
    setSelectedSystem(SYSTEMS[systemName]);
    setView('details');
  };

  const renderSelectionView = () => (
    <>
      <p className="text-gray-600 mb-6 text-center">
        Selecciona tu sistema de punto de venta (POS) o ERP para ver los detalles de la integración.
      </p>
      {/* --- CAMBIO CLAVE: Contenedor con scroll --- */}
      <div className="max-h-[50vh] overflow-y-auto pr-4"> 
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-black">
          {Object.values(SYSTEMS).map(sys => (
            <ConnectionCard key={sys.name} name={sys.name} logo={sys.logo} onClick={() => handleSelect(sys.name)} />
          ))}
        </div>
      </div>
      <button
          onClick={onClose}
          className="w-full text-white text-xl px-4 py-2 mt-6 font-bold rounded-lg hover:text-gray-100"
          style={{
            backgroundImage: 'linear-gradient(to right, #560bad, #7209b7, #b5179e)',
          }}
        >
            Cerrar
        </button>
    </>
  );



  // --- VISTA DE DETALLES MEJORADA ---
  const renderDetailView = () => (
    <div className="flex flex-col items-center animate-fade-in-fast">
      <div className="text-6xl my-4 text-gray-800">{selectedSystem.logo}</div>
      <h3 className="text-2xl font-bold text-gray-800">Conectar con {selectedSystem.name}</h3>
      
      <div className="text-left bg-purple-50 p-4 rounded-lg border bg-purple-100 w-full my-6">
          <p className="text-gray-700 mb-3 font-semibold text-purple-800">La integración te permitirá:</p>
          <ul className="space-y-2 text-sm text-purple-800">
              <li className="flex items-start gap-3">
                  <FiCheckCircle className="text-green-500 mt-1 flex-shrink-0"/>
                  <span>Sincronizar tu inventario y ventas **automáticamente cada noche**.</span>
              </li>
              <li className="flex items-start gap-3">
                  <FiCheckCircle className="text-green-500 mt-1 flex-shrink-0"/>
                  <span>Ahorrar horas de trabajo eliminando la carga manual de CSVs.</span>
              </li>
              <li className="flex items-start gap-3">
                  <FiCheckCircle className="text-green-500 mt-1 flex-shrink-0"/>
                  <span>Asegurar que tus análisis estén siempre basados en la información más reciente.</span>
              </li>
          </ul>
      </div>

      <button 
        onClick={onUpgrade}
        className="w-full bg-yellow-500 text-black font-bold py-3 px-4 rounded-lg hover:bg-yellow-400 flex items-center justify-center gap-2"
      >
        <FiZap /> Desbloquear Conexión Automática
      </button>
      <button onClick={() => setView('selection')} className="text-sm text-gray-500 hover:text-gray-800 mt-3">
        ← Ver otras conexiones
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-lg p-8 m-4 max-w-2xl w-full shadow-2xl relative">
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"><FiX size={24}/></button>
        <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">Automatiza tu Análisis: {view === 'selection' && "Conecta tu Sistema"}</h2>
        {view === 'selection' ? renderSelectionView() : renderDetailView()}
      </div>
    </div>
  );
}
