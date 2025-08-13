// src/components/AuditTaskCard.jsx

import React, { useState } from 'react';
import { FiChevronDown, FiExternalLink, FiAlertCircle, FiAlertTriangle, FiZap } from 'react-icons/fi';

const ICONS = {
  error: <FiAlertCircle className="text-red-500" />,
  warning: <FiAlertTriangle className="text-yellow-500" />,
  opportunity: <FiZap className="text-blue-500" />,
};

// --- NUEVO SUB-COMPONENTE PARA LA TABLA DE VISTA PREVIA ---
const PreviewTable = ({ data }) => {
  if (!data || data.length === 0) {
    return <p className="text-sm text-gray-500 italic">No hay datos de vista previa disponibles.</p>;
  }

  // Obtenemos las cabeceras del primer objeto, excluyendo algunas si es necesario
  const headers = Object.keys(data[0]).filter(key => !['sku', 'nombre_producto'].includes(key.toLowerCase()));

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-4 py-2 font-semibold text-left text-gray-600">Producto</th>
            {headers.map(header => (
              <th key={header} className="px-4 py-2 font-semibold text-left text-gray-600">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((item, index) => (
            <tr key={index}>
              <td className="px-4 py-2">
                <div className="font-medium text-gray-800 overflow-hidden text-ellipsis">{item['Nombre del producto'] || item.nombre_producto}</div>
                <div className="text-xs text-gray-500">SKU: {item['SKU / Código de producto'] || item.sku}</div>
              </td>
              {headers.map(header => (
                <td key={header} className="px-4 py-2 text-gray-700">{item[header]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};


export function AuditTaskCard({ task, onSolveClick }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const knowledge = task.knowledge || { why: "No hay más detalles.", how: ["Ejecuta el reporte para analizar a fondo."] };

  return (
    <div className="border border-gray-200 rounded-lg bg-white text-gray-800">
      {/* --- VISTA COLAPSADA --- */}
      <div className="p-4 flex items-center gap-4" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="text-2xl">{ICONS[task.type]}</div>
        <div className="flex-grow">
          <p className="font-semibold">{task.title}</p>
          <p className="text-sm text-red-600 font-medium">{task.impact}</p>
        </div>
        <button  
          className="text-sm font-semibold text-purple-600 hover:text-purple-800 flex items-center gap-1"
        >
          {isExpanded ? 'Ocultar' : 'Ver Detalles y Solución'} <FiChevronDown className={`transition-transform transform ${isExpanded ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* --- VISTA EXPANDIDA (PANEL DE CONSULTORÍA) --- */}
      {isExpanded && (
        <div className="border-t bg-gray-50 rounded-b-lg p-4 animate-fade-in-fast space-y-6">
          
          {/* --- SECCIÓN DE VISTA PREVIA --- */}
          <div>
            <h4 className="font-bold mb-2">Vista Previa de Productos Afectados:</h4>
            <PreviewTable data={task.preview_data} />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-bold mb-2">Por qué es Importante:</h4>
              <p className="text-sm text-gray-600">{knowledge.why}</p>
            </div>
            <div>
              <h4 className="font-bold mb-2">Cómo Solucionarlo:</h4>
              <ul className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                {knowledge.how.map((step, i) => <li key={i}>{step}</li>)}
              </ul>
            </div>
          </div>

          <div className="mt-6 text-center">
            <button 
              onClick={() => onSolveClick(task.target_report, task.preview_data)}
              className="bg-purple-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2 mx-auto"
            >
              <FiExternalLink /> {task.solution_button_text}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
