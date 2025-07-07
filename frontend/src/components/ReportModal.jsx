// src/components/ReportModal.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Select from 'react-select';
import * as XLSX from 'xlsx';
import { useStrategy } from '../context/StrategyProvider';
import { useConfig } from '../context/ConfigProvider';
import api from '../utils/api';
import { Tooltip } from './Tooltip';

// Importa los iconos que necesitas
import { FiX, FiLoader, FiDownload, FiRefreshCw } from 'react-icons/fi';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export function ReportModal({ reportConfig, context, availableFilters, onClose, onStateUpdate, onAnalysisComplete }) {
  const { strategy } = useStrategy();
  const { tooltips } = useConfig();

  // --- ESTADOS INTERNOS DEL MODAL ---
  const [modalView, setModalView] = useState('parameters'); // 'parameters', 'loading', 'results'
  const [modalParams, setModalParams] = useState({});
  const [analysisResult, setAnalysisResult] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

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
    selectedReport.advanced_parameters?.forEach(param => {
        advancedDefaults[param.name] = param.defaultValue;
    });
    
    setModalParams(prev => ({ ...prev, ...advancedDefaults }));
  };

  const handleDownloadExcel = (type) => { /* ... tu lógica de descarga de Excel ... */ };

  return (
    <div className="fixed h-full inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 animate-fade-in overflow-y-auto">
      <div className="h-full flex flex-col bg-white rounded-lg max-w-md w-full shadow-2xl relative text-center text-left">
        <div className="p-4 border-b bg-white z-10 shadow text-center sticky top-0">
          <h2 className="text-xl font-bold text-gray-800">{reportConfig.label}</h2>
          {/*<button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"><FiX size={24}/></button>*/}
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
              <h3 className="text-lg font-bold text-gray-800">Análisis Completado</h3>
              <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <p className="text-sm text-purple-800">{analysisResult.insight}</p>
              </div>
              <div className="mt-6 space-y-3">
                <p className="text-sm font-semibold text-gray-700">Descarga tus reportes:</p>
                <div className="flex gap-4 text-black">
                  <button onClick={() => handleDownloadExcel('accionable')} className="...">Descargar Accionable</button>
                  <button onClick={() => handleDownloadExcel('detallado')} className="...">Descargar Detallado</button>
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
                className="border px-6 py-3 rounded-lg font-semibold w-full transition-all duration-300 ease-in-out flex items-center justify-center gap-2"
                style={{
                  backgroundImage: 'linear-gradient(to right, #560bad, #7209b7, #b5179e)',
                  backgroundClip: 'text'
                }}
              >
                🚀 Ejecutar Análisis
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
