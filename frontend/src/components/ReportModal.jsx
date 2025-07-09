// src/components/ReportModal.jsx

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Select from 'react-select';
import * as XLSX from 'xlsx';
import { useStrategy } from '../context/StrategyProvider';
import { useConfig } from '../context/ConfigProvider';
import api from '../utils/api';
import { Tooltip } from './Tooltip';
import { jsPDF } from "jspdf";
// import "jspdf-autotable";

import { autoTable } from 'jspdf-autotable';


// Importa los iconos que necesitas
import { FiX, FiLoader, FiDownload, FiRefreshCw, FiTable, FiFileText, FiClipboard, FiPrinter, FiInfo, FiCheckCircle, FiSearch} from 'react-icons/fi';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// --- NUEVO COMPONENTE REUTILIZABLE PARA LAS TARJETAS DE KPI ---
const KpiCard = ({ label, value, tooltipText }) => (
  <div className="bg-white p-4 rounded-lg shadow border">
    <div className="flex items-center">
      <p className="text-sm text-gray-500">{label}</p>
      {/* El tooltip se renderiza aquí */}
      <Tooltip text={tooltipText} />
    </div>
    <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
  </div>
);


export function ReportModal({ reportConfig, context, availableFilters, onClose, onAnalysisComplete }) {
  const { strategy } = useStrategy();
  const { tooltips, kpiTooltips } = useConfig();

  // --- ESTADOS INTERNOS DEL MODAL ---
  const [modalView, setModalView] = useState('parameters'); // 'parameters', 'loading', 'results'
  const [modalParams, setModalParams] = useState({});
  const [analysisResult, setAnalysisResult] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');

  // Efecto para inicializar los parámetros cuando el modal se abre
  useEffect(() => {
    const initialParams = {};
    const allParamsConfig = [
      ...(reportConfig.basic_parameters || []),
      ...(reportConfig.advanced_parameters || [])
    ];
    allParamsConfig.forEach(param => {
      if (strategy && strategy[param.name] !== undefined) {
        initialParams[param.name] = strategy[param.name];
      } else {
        initialParams[param.name] = param.defaultValue;
      }
    });
    setModalParams(initialParams);
  }, [reportConfig, strategy]);

  // --- LÓGICA DE FILTRADO EN TIEMPO REAL ---
  const filteredData = useMemo(() => {
    if (!analysisResult?.data) return [];
    if (!searchTerm.trim()) return analysisResult.data;

    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return analysisResult.data.filter(row => 
      Object.values(row).some(value => 
        String(value).toLowerCase().includes(lowerCaseSearchTerm)
      )
    );
  }, [analysisResult, searchTerm]);

  useEffect(() => {
      let timer1 = setTimeout(() => setIsLoading(false), 500);
      return () => {
        clearTimeout(timer1);
      };
    }, []);

  const handleParamChange = (paramName, value) => {
    setModalParams(prev => ({ ...prev, [paramName]: value }));
  };

  const handleGenerateAnalysis = async () => {
    setModalView('loading');
    const formData = new FormData();
    formData.append("ventas_file_id", context.fileIds.ventas);
    formData.append("inventario_file_id", context.fileIds.inventario);
    
    if (context.type === 'user') {
      const token = localStorage.getItem('accessToken');
      formData.append("workspace_id", context.workspace.id);
      formData.append("current_user", token);
    }

    Object.entries(modalParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) formData.append(key, JSON.stringify(value));
        else formData.append(key, value);
      }
    });

    try {
      const response = await api.post(reportConfig.endpoint, formData, {
        headers: context.type === 'anonymous' ? { 'X-Session-ID': context.id } : { 'X-Session-ID': context.workspace.id }
      });
      setAnalysisResult(response.data);
      setSearchTerm('');
      setModalView('results');
      // onStateUpdate(i => i + 1); // Notifica al workspace que debe refrescar créditos e historial
      if (onAnalysisComplete) {
        onAnalysisComplete();
      }
    } catch (error) {
      console.error("Error al generar el reporte:", error);
      alert(error.response?.data?.detail || "Ocurrió un error.");
      setModalView('parameters'); // Vuelve a la vista de parámetros si hay error
      if (onAnalysisComplete) {
        onAnalysisComplete();
      }
    }
  };

  const handleResetAdvanced = () => {
    const advancedDefaults = {};
    reportConfig.advanced_parameters?.forEach(param => {
        advancedDefaults[param.name] = param.defaultValue;
    });
    
    setModalParams(prev => ({ ...prev, ...advancedDefaults }));
  };

  // const handleDownloadExcel = (type) => {
  //   if (!analysisResult || !filteredData) {
  //       alert("No hay datos de análisis para descargar.");
  //       return;
  //   }

  //   let dataToExport = filteredData;
  //   let filename = `FerreteroIA_${analysisResult.report_key}.xlsx`;
  //   let ws_name = "Reporte";

  //   // Lógica para crear el reporte accionable
  //   if (type === 'accionable') {
  //       const columnasAccionables = [
  //           'SKU / Código de producto', 'Nombre del producto', 
  //           'Precio Compra Actual (S/.)', 'Stock Actual (Unds)', 
  //           'Stock Mínimo Sugerido (Unds)'
  //       ];

  //       dataToExport = filteredData.map(row => {
  //           let newRow = {};
  //           columnasAccionables.forEach(col => {
  //               if (row[col] !== undefined) newRow[col] = row[col];
  //           });
  //           // Añadimos las columnas vacías que pediste para imprimir
  //           newRow['Check ✓'] = '';
  //           return newRow;
  //       });
  //       filename = `FerreteroIA_${analysisResult.report_key}_Accionable.xlsx`;
  //       ws_name = "Accionable";
  //   }

  //   // Usamos la librería xlsx para crear el archivo desde el JSON
  //   const worksheet = XLSX.utils.json_to_sheet(dataToExport);
  //   const workbook = XLSX.utils.book_new();
  //   XLSX.utils.book_append_sheet(workbook, worksheet, ws_name);
    
  //   // Disparamos la descarga
  //   XLSX.writeFile(workbook, filename);
  // };

  // --- LÓGICA DE DESCARGA MEJORADA ---
  const handleDownload = (type) => {
    const dataToUse = filteredData; // Siempre usamos los datos filtrados
    if (!dataToUse || dataToUse.length === 0) {
      alert("No hay datos para descargar.");
      return;
    }

    let headers, dataForSheet, filename;

    if (type === 'accionable') {
      headers = ['SKU', 'Nombre del Producto', 'Stock Actual', 'Sugerencia de Pedido', 'Check ✓', 'Cant. Final'];
      dataForSheet = dataToUse.map(row => ({
        'SKU': row['SKU / Código de producto'],
        'Nombre del Producto': row['Nombre del producto'],
        'Stock Actual': row['Stock Actual (Unds)'],
        'Sugerencia de Pedido': row['Pedido Ideal Sugerido (Unds)'],
        'Check ✓': '',
        'Cant. Final': ''
      }));
      filename = `FerreteroIA_${analysisResult.report_key}_Accionable.pdf`;
      
      // Generación de PDF
      const doc = new jsPDF();
      doc.text(`Reporte Accionable: \n ${reportConfig.label}\n`, 14, 15);
      autoTable(doc, {
        head: [headers],
        body: dataForSheet.map(Object.values),
        startY: 30,
      });
      doc.save(filename);

    } else { // Detallado (Excel)
      dataForSheet = dataToUse; // Usamos los datos filtrados con sus nombres originales
      filename = `FerreteroIA_${analysisResult.report_key}_Detallado.xlsx`;
      
      const worksheet = XLSX.utils.json_to_sheet(dataForSheet);
      // Lógica para anchos de columna (ejemplo)
      worksheet['!cols'] = [ { wch: 15 }, { wch: 50 }, { wch: 25 }, { wch: 25 } ];
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Análisis Detallado");
      XLSX.writeFile(workbook, filename);
    }
  };

  const handleTemporalAudit = async () => {
    console.log('Iniciando auditoría temporal...');

    const formData = new FormData();
    formData.append("ventas_file_id", context.fileIds.ventas);
    formData.append("inventario_file_id", context.fileIds.inventario);
    
    // --- LÓGICA DE CONTEXTO SIMPLIFICADA ---
    // Solo añadimos el workspace_id si es un usuario registrado.
    if (context.type === 'user' && context.workspace) {
        formData.append("workspace_id", context.workspace.id);
    }

    try {
        // --- LLAMADA A LA API CORREGIDA ---
        // Usamos nuestro cliente `api`. NO necesitamos pasarle las cabeceras manualmente.
        // El interceptor de `api.js` se encargará de añadir el `Authorization` token si existe,
        // o no añadirá nada si el usuario es anónimo.
        // Y para el caso anónimo, el backend leerá el X-Session-ID que ya se está enviando.
        
        const response = await api.post('/debug/auditoria-margenes', formData);
        
        console.log("Respuesta de la auditoría:", response.data);
        // Aquí podrías añadir la lógica para descargar el Excel de auditoría
        // que te devuelve el backend.

    } catch (error) {
        console.error("Error al generar el reporte de auditoría:", error);
        alert(error.response?.data?.detail || "No se pudo generar el reporte de auditoría.");
    }
};

  return (
    <div className="fixed h-full inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 animate-fade-in overflow-y-auto">
      <div className="h-full flex flex-col bg-white rounded-lg max-w-md w-full shadow-2xl relative text-center text-left">
        <div className="p-4 border-b bg-white z-10 shadow text-center sticky top-0 text-black">
          <h2 className="text-xl font-bold text-gray-800">{reportConfig.label}</h2>
        </div>
        
        <div className="flex-1 min-h-0 overflow-y-auto">
          {modalView === 'loading' && (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <FiLoader className="animate-spin text-4xl text-purple-600" />
              <p className="mt-4">Generando análisis...</p>
            </div>
          )}
          
          {modalView === 'parameters' && (
            <div className="p-4 text-black">
              <div className="flex-1 min-h-0 gap-4 p-4 text-black">
                {(reportConfig.basic_parameters?.length > 0 || reportConfig.advanced_parameters?.length > 0) && (
                  <div className="p-4 border-2 rounded-md shadow-md bg-gray-50">
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">Parámetros del Reporte</h3>
                    
                    {/* --- RENDERIZADO DE PARÁMETROS BÁSICOS --- */}
                    {reportConfig.basic_parameters?.map((param) => {
                      // Lógica de renderizado para select y multi-select
                      if (param.type === 'select') {
                        return (
                          <div key={param.name} className="mb-4">
                            <label htmlFor={param.name} className="block text-sm font-medium text-gray-600 mb-1">
                              {param.label}:
                              <Tooltip text={tooltips[param.tooltip_key]} />
                            </label>
                            <select
                              id={param.name}
                              name={param.name}
                              value={modalParams[param.name] || ''}
                              onChange={e => handleParamChange(param.name, e.target.value)}
                              className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                            >
                              {param.options?.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                            </select>
                          </div>
                        );
                      }
                      if (param.type === 'multi-select') {
                        // 1. Obtenemos las opciones del estado `availableFilters`
                        const options = availableFilters[param.optionsKey]?.map(opt => ({ value: opt, label: opt })) || [];
                        // 2. Obtenemos el valor actual del estado `modalParams`
                        const currentValue = modalParams[param.name] || [];
                        // 3. Convertimos el valor actual al formato que `react-select` espera
                        const valueForSelect = currentValue.map(val => ({ value: val, label: val }));
                        return (
                          <div key={param.name} className="mb-4 text-left">
                            <label className="block text-sm font-medium text-gray-600 mb-1">
                              {param.label}:
                              <Tooltip text={tooltips[param.tooltip_key]} />
                            </label>
                            <Select
                              isMulti
                              name={param.name}
                              options={options}
                              className="mt-1 block w-full basic-multi-select"
                              classNamePrefix="select"
                              value={valueForSelect} // <-- Usamos el valor formateado
                              placeholder="Selecciona..."
                              onChange={(selectedOptions) => {
                                // Al cambiar, extraemos solo los valores (strings) para guardarlos en el estado
                                const values = selectedOptions ? selectedOptions.map(opt => opt.value) : [];
                                handleParamChange(param.name, values);
                              }}
                            />
                          </div>
                        );
                      }

                      if (param.type === 'text') {
                      return (
                        <div key={param.name} className="mb-4 text-left">
                          <label htmlFor={param.name} className="flex items-center text-sm font-medium text-gray-600 mb-1">
                            {param.label}:
                            <Tooltip text={tooltips[param.tooltip_key]} />
                          </label>
                          <input
                            type="text"
                            id={param.name}
                            name={param.name}
                            value={modalParams[param.name] || ''}
                            onChange={e => handleParamChange(param.name, e.target.value)}
                            placeholder={param.placeholder || ''}
                            className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                          />
                        </div>
                      );
                    }

                    return null;

                    })}

                    {/* --- SECCIÓN AVANZADA PLEGABLE --- */}
                    {(reportConfig.advanced_parameters && reportConfig.advanced_parameters.length > 0) && (
                      <div className="mt-6 pt-4 border-t border-gray-200">
                        <button onClick={() => setShowAdvanced(!showAdvanced)} className="text-sm font-semibold text-purple-600 hover:text-purple-800 flex items-center">
                          {showAdvanced ? 'Ocultar' : 'Mostrar'} Opciones Avanzadas
                          {/* Icono de flecha que rota (opcional, pero mejora la UX) */}
                          <svg className={`w-4 h-4 ml-1 transition-transform transform ${showAdvanced ? 'rotate-180' : 'rotate-0'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </button>
                        
                        {showAdvanced && (
                          <>
                            <div className="grid sm:grid-cols-1 md:grid-cols-2 gap-x-4 mt-2">
                              {/* --- RENDERIZADO DE PARÁMETROS AVANZADOS --- */}
                              {reportConfig.advanced_parameters.map(param => {
                                if (param.type === 'boolean_select') {
                                  return (
                                    <div key={param.name} className="mb-4">
                                      <label htmlFor={param.name} className="block text-sm font-medium text-gray-600 mb-1">
                                        {param.label}:
                                        <Tooltip text={tooltips[param.tooltip_key]} />
                                      </label>
                                      <select
                                        id={param.name}
                                        name={param.name}
                                        value={modalParams[param.name] || ''}
                                        onChange={e => handleParamChange(param.name, e.target.value)}
                                        className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                                      >
                                        {param.options?.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                                      </select>
                                    </div>
                                  );
                                }
                                if (param.type === 'number') {
                                  return (
                                    <div key={param.name} className="mb-4">
                                      <label htmlFor={param.name} className="block text-sm font-medium text-gray-600 mb-1">
                                        {param.label}:
                                        <Tooltip text={tooltips[param.tooltip_key]} />
                                      </label>
                                      <input
                                        type="number"
                                        id={param.name}
                                        name={param.name}
                                        value={modalParams[param.name] || ''}
                                        onChange={e => handleParamChange(param.name, e.target.value === '' ? '' : parseFloat(e.target.value))}
                                        min={param.min}
                                        max={param.max}
                                        step={param.step}
                                        className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                                      />
                                    </div>
                                  );
                                }
                                return null;
                              })}
                            </div>
                            {/* --- BOTÓN DE RESET PARA PARÁMETROS AVANZADOS --- */}
                            <button onClick={handleResetAdvanced} className="w-full text-xs font-semibold text-gray-500 hover:text-red-600 mt-2 transition-colors flex items-center justify-center gap-1">
                              <FiRefreshCw className="text-md"/> Restaurar valores por defecto
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {modalView === 'results' && (
            <div className="p-6 text-center">
              <h3 className="text-lg font-bold text-gray-800 p-6">Análisis Completado</h3>
              <div className="flex-1 min-h-0 overflow-y-auto">
                {modalView === 'loading' && (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <FiLoader className="animate-spin text-4xl text-purple-600" />
                    <p className="mt-4">Generando análisis, esto puede tardar unos segundos...</p>
                  </div>
                )}
                
                {modalView === 'parameters' && (
                  <div className="p-4 text-black">
                    {/* Tu JSX para renderizar el formulario de parámetros va aquí */}
                  </div>
                )}

                {modalView === 'results' && analysisResult && (
                  <div className="text-left animate-fade-in">
                    
                    {/* Insight Clave */}
                    <div className="mb-6 p-4 bg-purple-50 border-l-4 border-purple-500">
                      <p className="text-sm font-semibold text-purple-800">{analysisResult.insight}</p>
                    </div>

                    {/* --- KPIs DESTACADOS CON TOOLTIPS --- */}
                    <div className="mb-6">
                      <h4 className="font-semibold text-gray-700 mb-2">Resumen Ejecutivo</h4>
                      <div className="grid grid-cols-2 gap-4">
                        {analysisResult && analysisResult.kpis && 
                          Object.entries(analysisResult.kpis).map(([key, value]) => (
                            <KpiCard 
                              key={key} 
                              label={key} 
                              value={value}
                              // Buscamos el texto del tooltip en nuestro glosario
                              tooltipText={kpiTooltips[key]} 
                            />
                          ))
                        }
                      </div>
                    </div>

                    {/* --- NUEVA BARRA DE BÚSQUEDA INTERACTIVA --- */}
                    <div className="my-6">
                      <h4 className="font-semibold text-gray-700 mb-2">Refina tu Análisis</h4>
                      <div className="flex relative items-center">
                        <FiSearch className="absolute left-4 text-gray-400" />
                        <input
                          id="search-results"
                          type="text"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          placeholder="Filtra tus resultados..."
                          className="w-full bg-gray-100 text-gray-800 border border-gray-300 rounded-md py-2 pl-10 pr-4 focus:ring-purple-500 focus:border-purple-500"
                        />
                      </div>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                      {filteredData.slice(0, 3).map((item, index) => (
                        <div key={index} className="p-3 bg-gray-50 rounded-md border">
                          <p className="font-semibold text-sm text-gray-800">{item['Nombre del producto']}</p>
                          <p className="text-xs text-gray-500">SKU: {item['SKU / Código de producto']} | Marca: {item['Marca']}</p>
                        </div>
                      ))}
                    </div>
                    {/* --- ECO INTELIGENTE --- */}
                    <p className="text-xs text-center text-gray-500 mt-2 italic">
                      {filteredData.length === 0 && "Ningún resultado encontrado para tu búsqueda."}
                      {filteredData.length > 3 && `Mostrando 3 de ${filteredData.length} resultados...`}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-6 space-y-3">
                <h4 className="font-semibold text-gray-700">Descarga tus reportes:</h4>
                <div className="flex gap-3 w-full justify-center">
                  <button onClick={() => handleDownload('accionable')} className="flex-col bg-gray-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-gray-700 flex items-center justify-center gap-2">
                    <FiFileText className="text-2xl" />
                    <div>
                      <span className="font-bold">Accionable (PDF)</span>
                      <span className="block text-xs opacity-80">{searchTerm ? `Filtrado (${filteredData.length})` : `Completo (${analysisResult.data.length})`}</span>
                    </div>
                  </button>
                  <button onClick={() => handleDownload('detallado')} className="flex-col bg-purple-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2">
                    <FiTable className="text-2xl" />
                    <div>
                      <span className="font-bold">Detallado (Excel)</span>
                      <span className="block text-xs opacity-80">{searchTerm ? `Filtrado (${filteredData.length})` : `Completo (${analysisResult.data.length})`}</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 w-full z-10 shadow text-center sticky bottom-0 text-gray-800">
          {modalView === 'parameters' && (
            <>
              <button
                onClick={ handleGenerateAnalysis }
                disabled={ isLoading }
                className={`border px-6 py-3 rounded-lg font-semibold w-full transition-all duration-300 ease-in-out flex items-center justify-center gap-2
                    ${
                        // Lógica de estilos condicional
                        isLoading ? 'bg-gray-200 text-gray-500 cursor-wait' : 'text-transparent border-purple-700'
                    }`
                }
                style={{
                  backgroundImage: 'linear-gradient(to right, #560bad, #7209b7, #b5179e)',
                  backgroundClip: 'text'
                }}
              >
                {isLoading ? (
                      <>
                          <FiLoader className="animate-spin h-5 w-5" />
                          <span>Cargando parametros...</span>
                      </>
                  ) : <>
                          <span className="text-black font-bold text-xl">🚀</span>
                          {/* El texto cambia si ya existe una caché pero es obsoleta */}
                          <span className="text-lg font-bold">Ejecutar Análisis</span>
                      </>
                }
              </button>
              <button
                onClick={ onClose }
                className="mt-2 w-full text-white text-xl px-4 py-2 font-bold rounded-lg hover:text-gray-100"
                disabled={modalView == "loading"}
                style={{
                  backgroundImage: 'linear-gradient(to right, #560bad, #7209b7, #b5179e)',
                }}
              >
                Cerrar
              </button>
            </>
          )}
          {modalView === 'results' && (
            <button onClick={() => setModalView('parameters')} className="w-full text-lg px-4 py-2">‹ Volver a Parámetros</button>
          )}
        </div>
      </div>
    </div>
  );
}
