// src/components/ReportInfoModal.jsx

import React, { useState } from 'react';
import { FiX, FiFileText, FiZap } from 'react-icons/fi';

export function ReportInfoModal({ reportItem, onClose }) {
  const [activeTab, setActiveTab] = useState('ficha'); // 'ficha' o 'planes'

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full flex flex-col max-h-[90vh]">
        <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white">
          <h2 className="text-xl font-bold text-gray-800">{reportItem.label}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700"><FiX size={26}/></button>
        </div>

        {/* Pestañas de Navegación */}
        <div className="flex border-b">
          <button onClick={() => setActiveTab('ficha')} className={`flex-1 py-3 font-semibold ${activeTab === 'ficha' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500'}`}>
            <FiFileText className="inline mr-2"/> Propósito
          </button>
          <button onClick={() => setActiveTab('planes')} className={`flex-1 py-3 font-semibold ${activeTab === 'planes' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500'}`}>
            <FiZap className="inline mr-2"/> Usos Potentes
          </button>
        </div>

        <div className="overflow-y-auto p-4 text-gray-700">
          {activeTab === 'ficha' && (
            <div className="space-y-4 p-2 animate-fade-in-fast">
              <div>
                <h3 className="font-bold text-lg mb-2">¿Qué es este reporte?</h3>
                <p className="text-sm">{reportItem.description}</p>
              </div>
              <div>
                <h3 className="font-bold text-lg mb-2">¿Cómo funciona?</h3>
                <p className="text-sm">{reportItem.how_it_works}</p>
              </div>
              <div>
                <h3 className="font-bold text-lg mb-2">Requisitos de Datos</h3>
                <div className="text-sm grid grid-cols-2 gap-4">
                    <div>
                        <h4 className="font-semibold">Archivo de Ventas:</h4>
                        <ul className="list-disc list-inside">{reportItem.data_requirements?.ventas.map(c => <li key={c}>{c}</li>)}</ul>
                    </div>
                    <div>
                        <h4 className="font-semibold">Archivo de Inventario:</h4>
                        <ul className="list-disc list-inside">{reportItem.data_requirements?.inventario.map(c => <li key={c}>{c}</li>)}</ul>
                    </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'planes' && (
            <div className="p-2 animate-fade-in-fast space-y-4">
              {(reportItem.planes_de_accion || []).map((plan, i) => (
                <div key={i} className="p-4 border rounded-lg bg-gray-50">
                  <h4 className="font-bold text-purple-700">{plan.title}</h4>
                  <p className="text-xs font-semibold text-gray-500 my-2">🔁 {plan.periodicity}</p>
                  <p className="text-sm">{plan.recipe}</p>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="p-4">
          <button
            onClick={ onClose }
            className="w-full text-white text-xl px-4 py-2 font-bold rounded-lg hover:text-gray-100"
            style={{
              backgroundImage: 'linear-gradient(to right, #560bad, #7209b7, #b5179e)',
            }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
