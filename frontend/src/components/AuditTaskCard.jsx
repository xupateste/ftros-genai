// src/components/AuditTaskCard.jsx

import React, { useState } from 'react';
import { FiChevronDown, FiExternalLink, FiAlertCircle, FiAlertTriangle, FiZap, FiEye, FiHelpCircle, FiTool } from 'react-icons/fi';

const ICONS = {
  error: <FiAlertCircle className="text-red-500" />,
  warning: <FiAlertTriangle className="text-yellow-500" />,
  opportunity: <FiZap className="text-blue-500" />,
};

// --- NUEVO SUB-COMPONENTE PARA LA TABLA DE VISTA PREVIA ---
const PreviewTable = ({ data, headers }) => {
  if (!data || data.length === 0) {
    return <p className="text-sm text-gray-500 italic">No hay datos de vista previa disponibles.</p>;
  }

  // Obtenemos las cabeceras del primer objeto, excluyendo algunas si es necesario
  // const headers = Object.keys(data[0]).filter(key => !['x', 't'].includes(key.toLowerCase()));
  // const headers = Object.keys(data[0]).filter(key => key !== 'SKU / Código de producto' && key !== 'Nombre del producto')

  const dynamicHeaders = headers || Object.keys(data[0]).filter(
    key => key !== 'SKU / Código de producto' && key !== 'Nombre del producto'
  );

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-4 py-2 font-semibold text-left text-gray-600 min-w-64">Producto</th>
            {dynamicHeaders.map(header => (
              <th key={header} className="px-4 py-2 font-semibold text-left text-gray-600">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((item, index) => (
            <tr key={index}>
              {/* --- Celda Estática --- */}
              <td className="px-4 py-2 align-top">
                <div 
                  className="font-medium text-gray-800 line-clamp-2"
                  title={item['Nombre del producto']}
                >
                  {item['Nombre del producto']}
                </div>
                <div className="text-xs text-gray-500">SKU: {item['SKU / Código de producto']}</div>
              </td>
              {/* --- Celdas Dinámicas --- */}
              {dynamicHeaders.map(header => (
                <td key={header} className="px-4 py-2 text-gray-700 align-top">{item[header]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const AccordionSection = ({ title, icon, children, isOpen, onClick }) => (
  <div className="border-b border-gray-200">
    <button
      onClick={onClick}
      className="w-full flex justify-between items-center p-3 text-left font-semibold text-gray-700 hover:bg-gray-100"
    >
      <span className="flex items-center gap-2">{icon} {title}</span>
      <FiChevronDown className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
    </button>
    <div
      className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-96' : 'max-h-0'}`}
    >
      <div className="p-4 pt-0 text-sm text-gray-600">
        {children}
      </div>
    </div>
  </div>
);

export function AuditTaskCard({ task, onSolveClick }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeSection, setActiveSection] = useState('preview'); // 'preview', 'why', 'how'

  const knowledge = task.knowledge || { why: "No hay más detalles.", how: ["Ejecuta el reporte para analizar a fondo."] };

  const handleSectionClick = (sectionName) => {
    setActiveSection(activeSection === sectionName ? null : sectionName);
  };

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

      {/* --- VISTA EXPANDIDA (CON VISTA PREVIA SIEMPRE VISIBLE) --- */}
      {isExpanded && (
        <div className="border-t bg-gray-50 p-4 animate-fade-in-fast space-y-4">
          
          {/* 1. Vista Previa siempre visible */}
          <div>
            <h4 className="font-bold mb-2 text-gray-800 flex items-center gap-2"><FiEye /> Vista Previa de Productos Afectados</h4>
            <PreviewTable data={task.preview_data} headers={task.preview_headers} />
          </div>

          {/* 2. Acordeón solo para la información adicional */}
          <div className="border rounded-lg overflow-hidden bg-white">
            <AccordionSection
              title="¿Por qué es Importante?"
              icon={<FiHelpCircle />}
              isOpen={activeSection === 'why'}
              onClick={() => handleSectionClick('why')}
            >
              {knowledge.why}
            </AccordionSection>

            <AccordionSection
              title="¿Cómo Solucionarlo?"
              icon={<FiTool />}
              isOpen={activeSection === 'how'}
              onClick={() => handleSectionClick('how')}
            >
              <ul className="list-decimal list-inside space-y-1">
                {knowledge.how.map((step, i) => <li key={i}>{step}</li>)}
              </ul>
            </AccordionSection>
          </div>

          <div className="text-center">
            <button 
              onClick={() => onSolveClick(task.title, task.target_report, task.skus_afectados)}
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
