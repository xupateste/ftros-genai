// src/components/CreditHistoryModal.jsx (Versión Final)

import React, { useState } from 'react';
import { FiX, FiCheckCircle, FiAlertTriangle, FiPlusCircle } from 'react-icons/fi';
import { RechargeCreditsModal } from './RechargeCreditsModal'; // Importamos el modal de recarga

export function CreditHistoryModal({ history, onClose, reportData }) {
  const [isRechargeModalOpen, setIsRechargeModalOpen] = useState(false);

  const formatTimestamp = (isoString) => {
    if (!isoString) return 'N/A';
    return new Date(isoString).toLocaleString('es-PE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  };

  // --- FUNCIÓN FINAL PARA RENDERIZAR PARÁMETROS BÁSICOS ---
  const renderParameters = (params, loggedReportName) => {
    if (!params || !reportData || !loggedReportName) {
        return <span className="text-gray-400 italic">N/D</span>;
    }
    
    let basicParamKeys = [];
    
    // 1. Buscamos en todas las categorías de reportData
    for (const category in reportData) {
        // 2. Usamos .find() para encontrar el reporte cuya 'key' coincida con la del log
        const reportConfig = reportData[category].find(report => report.key === loggedReportName);
        
        if (reportConfig && reportConfig.basic_parameters) {
            // 3. Si lo encontramos, obtenemos sus parámetros básicos y terminamos la búsqueda
            basicParamKeys = reportConfig.basic_parameters.map(p => p.name);
            break;
        }
    }
    
    // El resto de la lógica de renderizado no cambia
    const paramsToShow = Object.entries(params)
      .filter(([key]) => basicParamKeys.includes(key))
      .map(([key, value]) => {
        const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        const formattedValue = Array.isArray(value) ? value.join(', ') : value.toString();
        if (formattedValue === '' || formattedValue === '[]') return null;
        return { key: formattedKey, value: formattedValue };
      })
      .filter(Boolean);

    if (paramsToShow.length === 0) {
      return <span className="text-gray-400 italic">Sin parámetros</span>;
    }

    return (
      <div className="flex flex-wrap gap-2">
        {paramsToShow.map(param => (
          <div key={param.key} className="bg-gray-200 text-gray-700 text-xs font-medium px-2.5 py-1 rounded-full">
            <span className="font-bold">{param.key}:</span> {param.value}
          </div>
        ))}
      </div>
    );
  };

  // El JSX de la tabla y el modal no necesita cambios
  return (
    <>
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full flex flex-col max-h-[90vh]">
        <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white">
          <h2 className="text-xl font-bold text-gray-800">Historial de Actividad de la Sesión</h2>
          {/* --- BOTÓN DE RECARGA --- */}
          <button 
            onClick={() => setIsRechargeModalOpen(true)}
            className="flex items-center gap-2 text-sm font-bold bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
          >
            <FiPlusCircle /> Recargar Créditos
          </button>
        </div>
        <div className="overflow-y-auto">
          {history.length > 0 ? (
            <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-100 sticky top-0">
                <tr>
                  <th scope="col" className="px-6 py-3">Reporte</th>
                  {/*<th scope="col" className="px-6 py-3">Parámetros Básicos</th>*/}
                  <th scope="col" className="px-6 py-3 text-center">Créditos</th>
                  <th scope="col" className="px-6 py-3">Estado</th>
                  <th scope="col" className="px-6 py-3">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item, index) => (
                  <tr key={index} className="bg-white border-b hover:bg-gray-50">
                    <td className="flex flex-col px-6 py-4 font-medium text-gray-900 gap-1">{item.nombreReporte || 'N/A'}<br/>{renderParameters(item.parametrosUsados, item.nombreReporte)}</td>
                    {/*<td className="px-6 py-4">{renderParameters(item.parametrosUsados, item.nombreReporte)}</td>*/}
                    <td className="px-6 py-4 font-bold text-center">
                      <span className={`px-2 py-1 rounded-full text-xs ${item.creditosConsumidos > 0 ? 'bg-purple-100 text-purple-800' : 'bg-gray-200 text-gray-700'}`}>
                        {item.creditosConsumidos}🪙
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {item.estado === 'exitoso' ? (
                        <span className="flex items-center gap-2 text-green-600">
                          <FiCheckCircle /> Exitoso
                        </span>
                      ) : item.estado === 'exitoso_vacio' ? (
                        <span className="flex items-center gap-2 text-yellow-600">
                          <FiCheckCircle /> Sin Resultados
                        </span>
                      ) : (
                        // --- LÓGICA MEJORADA PARA ERRORES ---
                        <div className="group relative flex items-center gap-2 text-red-600">
                          <FiAlertTriangle />
                          <span>Fallido</span>
                          {/* El tooltip solo aparece si hay detalles del error */}
                          {item.error_details && item.error_details.user_message && (
                            <div className="absolute bottom-full left-1/2 z-20 mb-2 w-72 -translate-x-1/2 scale-95 transform rounded-lg bg-gray-800 px-3 py-2 text-left text-sm font-normal text-white opacity-0 transition-all group-hover:scale-100 group-hover:opacity-100">
                              <p className="font-bold border-b border-gray-600 pb-1 mb-1">Motivo del Fallo:</p>
                              <p>{item.error_details.user_message}</p>
                              <div className="absolute -bottom-2 left-1/2 h-0 w-0 -translate-x-1/2 border-x-8 border-t-8 border-x-transparent border-t-gray-800"></div>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-700">{formatTimestamp(item.fechaGeneracion)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
             <p className="p-8 text-center text-gray-500">Aún no has generado ningún reporte en esta sesión.</p>
          )}
        </div>
        <div className="p-4 w-full border-t bg-gray-50 z-10 shadow text-center sticky bottom-0">
          <button
            onClick={onClose}
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
    {/* --- RENDERIZADO DEL MODAL DE RECARGA --- */}
    {isRechargeModalOpen && (
      <RechargeCreditsModal 
        onClose={() => setIsRechargeModalOpen(false)}
        onBecomeStrategist={() => {
          setIsRechargeModalOpen(false); // Cerramos este modal
          onBecomeStrategist(); // Llamamos a la función del padre para abrir el otro
        }}
      />
    )}
    </>
  );
}