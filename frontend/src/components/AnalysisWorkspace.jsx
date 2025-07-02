// src/components/AnalysisWorkspace.jsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import Select from 'react-select';
import * as XLSX from 'xlsx';
import { FiDownload, FiLogIn, FiRefreshCw, FiLogOut, FiLock, FiLoader, FiSettings,  FiUser, FiMail, FiKey, FiUserPlus } from 'react-icons/fi';
import { StrategyProvider, useStrategy } from '../context/StrategyProvider';
import CreateWorkspaceModal from './CreateWorkspaceModal'; // Importa el modal

// Importa los componentes que necesita
import CsvImporterComponent from '../assets/CsvImporterComponent';
import { CreditsPanel } from './CreditsPanel';
import { CreditHistoryModal } from './CreditHistoryModal';
import { ProOfferModal } from './ProOfferModal';
import { InsufficientCreditsModal } from './InsufficientCreditsModal';

import { StrategyPanelModal } from './StrategyPanelModal';
import { useWorkspace } from '../context/WorkspaceProvider'; // <-- Importamos el hook
import { WorkspaceSelector } from './WorkspaceSelector';   

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
import LoginModal from './LoginModal'; // Asumimos que LoginModal vive en su propio archivo
import RegisterModal from './RegisterModal'; // Asumimos que RegisterModal vive en su propio archivo

// Las plantillas ahora viven aquí, junto a la lógica que las usa
const templateVentas = {
        columns: [
          {
            name: "Fecha de venta",
            key: "Fecha de venta",
            required: true,
            description: "Fecha en formato dd/mm/aaaa ej:23/05/2025",
            suggested_mappings: ["Fecha de venta"]
          },
          {
            name: "N° de comprobante / boleta",
            key: "N° de comprobante / boleta",
            required: true,
            // description: "Fecha en formato dd/mm/aaaa ej:23/05/2025",
            suggested_mappings: ["N° de comprobante / boleta"]
          },
          {
            name: "SKU / Código de producto",
            key: "SKU / Código de producto",
            required: true,
            suggested_mappings: ["SKU / Código de producto"]
          },
          {
            name: "Nombre del producto",
            key: "Nombre del producto",
            required: true,
            suggested_mappings: ["Nombre del producto"]
          },
          {
            name: "Cantidad vendida",
            key: "Cantidad vendida",
            required: true,
            description: "Sólo valor numérico entero ej:10",
            suggested_mappings: ["Cantidad vendida"]
          },
          {
            name: "Precio de venta unitario (S/.)",
            key: "Precio de venta unitario (S/.)",
            required: true,
            description: "Sólo valor numérico entero ó decimal ej:10.5",
            suggested_mappings: ["Precio de venta unitario (S/.)"]
          }
        ]
      };

const templateStock = {
        columns: [
          {
            name: "SKU / Código de producto",
            key: "SKU / Código de producto",
            required: true,
            suggested_mappings: ["SKU / Código de producto"]
          },
          {
            name: "Nombre del producto",
            key: "Nombre del producto",
            required: true,
            suggested_mappings: ["Nombre del producto"]
          },
          {
            name: "Cantidad en stock actual",
            key: "Cantidad en stock actual",
            required: true,
            description: "Sólo valor numérico entero ej:10",
            suggested_mappings: ["Cantidad en stock actual"]
          },
          {
            name: "Precio de compra actual (S/.)",
            key: "Precio de compra actual (S/.)",
            required: true,
            description: "Sólo valor numérico entero ó decimal ej:10.5",
            suggested_mappings: ["Precio de compra actual (S/.)"]
          },
          {
            name: "Precio de venta actual (S/.)",
            key: "Precio de venta actual (S/.)",
            required: true,
            description: "Sólo valor numérico entero ó decimal ej:10.5",
            suggested_mappings: ["Precio de venta actual (S/.)"]
          },
          {
            name: "Marca",
            key: "Marca",
            required: true,
            suggested_mappings: ["Marca"]
          },
          {
            name: "Categoría",
            key: "Categoría",
            required: true,
            suggested_mappings: ["Categoría"]
          },
          {
            name: "Subcategoría",
            key: "Subcategoría",
            required: true,
            suggested_mappings: ["Subcategoría"]
          },
          {
            name: "Rol de categoría",
            key: "Rol de categoría",
            required: true,
            suggested_mappings: ["Rol de categoría"]
          },
          {
            name: "Rol del producto",
            key: "Rol del producto",
            required: true,
            suggested_mappings: ["Rol del producto"]
          }
        ]
      };



// Este componente recibe el contexto (sesión anónima o de usuario) como prop
export default function AnalysisWorkspace({ context, reportData, diccionarioData, onSwitchToLogin, onSwitchToRegister, onLoginSuccess, onRegisterSuccess, onBack, onLogout }) {
  // --- ESTADOS EXTRAÍDOS DE LANDINGPAGE ---
  const { 
    workspaces, 
    activeWorkspace, 
    setActiveWorkspace,
    createWorkspace // Necesario para el modal de creación
  } = useWorkspace();

  const [uploadedFileIds, setUploadedFileIds] = useState({ ventas: null, inventario: null });
  const [uploadStatus, setUploadStatus] = useState({ ventas: 'idle', inventario: 'idle' });
  const [filesReady, setFilesReady] = useState(false);
  
  const [showModal, setShowModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [modalParams, setModalParams] = useState({});
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  
  const [availableFilters, setAvailableFilters] = useState({ categorias: [], marcas: [] });
  const [isLoadingFilters, setIsLoadingFilters] = useState(false);
  const [isStrategyPanelOpen, setStrategyPanelOpen] = useState(false);
  const [activeModal, setActiveModal] = useState(null); // 'login', 'register', 'reportParams', etc.
  
  // const { loadStrategy } = useStrategy();
  // const { initializeSessionAndLoadStrategy } = useStrategy();
  const { strategy } = useStrategy();
  const [proReportClicked, setProReportClicked] = useState(null);
  const [showProModal, setShowProModal] = useState(false);
  const [insightHtml, setInsightHtml] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [isCacheValid, setIsCacheValid] = useState(false);
  const [cachedResponse, setCachedResponse] = useState({ key: null, blob: null });
  const [credits, setCredits] = useState({ used: 0, remaining: 0 });
  const [creditHistory, setCreditHistory] = useState([]);
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [creditsInfo, setCreditsInfo] = useState({ required: 0, remaining: 0 });

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // --- FUNCIONES EXTRAÍDAS DE LANDINGPAGE ---
  
  useEffect(() => {
    setFilesReady(!!uploadedFileIds.ventas && !!uploadedFileIds.inventario);
  }, [uploadedFileIds]);

  // Carga el estado inicial de la sesión (créditos e historial)
  const fetchSessionState = useCallback(async () => {
    if (!context?.id) return;
    const identifier = context.type === 'anonymous' ? context.id : context.workspace.id;
    try {
        const response = await axios.get(`${API_URL}/session-state`, { headers: { 'X-Session-ID': identifier } });
        setCredits(response.data.credits || { used: 0, remaining: 20 });
        setCreditHistory(response.data.history || []);
    } catch (error) {
        console.error("Error al recuperar el estado de la sesión:", error);
    }
  }, [context]);

  useEffect(() => {
    if (context?.type === 'anonymous') {
        fetchSessionState();
    }
    // En el futuro, aquí se podría añadir la lógica para cargar el estado de un workspace de usuario
  }, [context, fetchSessionState]);

  // useEffect(() => {
  //   fetchSessionState();
  // }, [fetchSessionState]);

  const handleCreationSuccessAndSwitch = (newWorkspace) => {
    console.log(`Espacio '${newWorkspace.nombre}' creado, cambiando a esta vista.`);
    setActiveWorkspace(newWorkspace); // Cambia el contexto al nuevo espacio
    setIsCreateModalOpen(false); // Cierra el modal
  };

  const handleFileProcessed = async (file, fileType) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("tipo_archivo", fileType);

    // Añade el contexto correcto a la petición
    if (context.type === 'user' && context.workspace) {
        formData.append("workspace_id", context.workspace.id);
      console.log('desde refactoring -> user')
    } else if (context.type === 'anonymous') {
        // El interceptor de axios se encargará del X-Session-ID si no hay token
      console.log('desde refactoring -> anonymous')
    }
    
    setUploadStatus(prev => ({ ...prev, [fileType]: 'uploading' }));

    // const headers = {};
    // if (context.type === 'anonymous') {
    //     // --- LÓGICA PARA USUARIO ANÓNIMO ---
    //     headers['X-Session-ID'] = sessionId;
    //     console.log(`Enviando archivo a la sesión anónima: ${sessionId}`);
    // } else {
    //     // --- LÓGICA PARA USUARIO REGISTRADO ---
    //     headers['Authorization'] = `Bearer ${authToken}`;
    //     formData.append("workspace_id", activeWorkspace.id);
    //     console.log(`Enviando archivo al workspace: ${activeWorkspace.id}`);
    // }

    try {
      // Usamos un cliente `api` centralizado que añade el token o el X-Session-ID
      const response = await axios.post(`${API_URL}/upload-file`, formData, { headers: { 'X-Session-ID': context.id }});
      setUploadedFileIds(prev => ({ ...prev, [fileType]: response.data.file_id }));
      setUploadStatus(prev => ({ ...prev, [fileType]: 'success' }));
      if (fileType === 'inventario' && response.data.available_filters) {
        setAvailableFilters(response.data.available_filters);
        // setAvailableFilters({
        //     categorias: response.data.available_filters.categorias || [],
        //     marcas: response.data.available_filters.marcas || []
        //   });
      }
    } catch (error) {
      console.error(`Error al subir ${fileType}:`, error);
      setUploadStatus(prev => ({ ...prev, [fileType]: 'error' }));
    }
  }

  const handleGenerateAnalysis = async () => {
    // 1. Verificación inicial (ahora comprueba los IDs de archivo)
    if (!selectedReport || !uploadedFileIds.ventas || !uploadedFileIds.inventario || !context.id) {
      alert("Asegúrate de haber iniciado una sesión, subido ambos archivos y seleccionado un reporte.");
      return;
    }

    setIsLoading(true);
    setAnalysisResult(null);

  
    // 2. Crear el FormData (ahora con IDs en lugar de archivos)
    const formData = new FormData();
    
    // --- CAMBIO CLAVE ---
    // Enviamos los IDs de los archivos, no los archivos completos.
    formData.append("ventas_file_id", uploadedFileIds.ventas);
    formData.append("inventario_file_id", uploadedFileIds.inventario);

    // Adjuntamos el resto de los parámetros del modal como antes
    const allParameters = [
      ...(selectedReport.basic_parameters || []),
      ...(selectedReport.advanced_parameters || [])
    ];

    allParameters.forEach(param => {
        const value = modalParams[param.name];
        if (value !== undefined && value !== null && value !== '') {
            if (Array.isArray(value)) {
                formData.append(param.name, JSON.stringify(value));
            } else {
                formData.append(param.name, value);
            }
        }
    });

    // --- FIN DEL CAMBIO ---

    try {
      const response = await axios.post(`${API_URL}${selectedReport.endpoint}`, formData, {
        // responseType: 'blob', // Ahora espera un JSON
        headers: { 'X-Session-ID': context.id }
      });
      
      const newBlob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

       // Guardamos el resultado completo (insight + datos) en nuestro nuevo estado
      setAnalysisResult(response.data);

       // Después de una ejecución exitosa, volvemos a pedir el estado actualizado
      const updatedState = await axios.get(`${API_URL}/session-state`, { headers: { 'X-Session-ID': context.id } });
      setCredits(updatedState.data.credits);
      setCreditHistory(updatedState.data.history);

    } catch (error) {
      // --- 5. LÓGICA DE MANEJO DE ERRORES MEJORADA ---
      console.error("Error al generar el reporte:", error);

      // Verificamos si el error es por falta de créditos (código 402)
      if (error.response?.status === 402) {
          // Obtenemos la información necesaria para el modal
          const required = selectedReport?.costo || 0;
          const remaining = credits.remaining || 0;
          setCreditsInfo({ required, remaining });
          
          // Mostramos el modal específico de créditos insuficientes
          setShowCreditsModal(true);
      } else {
          // Para cualquier otro error, mantenemos la lógica genérica
          let errorMessage = "Ocurrió un error al generar el reporte.";
          if (error.response?.data && error.response.data instanceof Blob) {
              try {
                  const errorText = await error.response.data.text();
                  const errorJson = JSON.parse(errorText);
                  errorMessage = errorJson.detail || errorMessage;
              } catch (e) { /* Mantener mensaje genérico */ }
          }
          alert(errorMessage);
      }

      // Si el reporte falló, también es buena idea actualizar el historial
      // para que el usuario vea el intento fallido.
      try {
          const updatedState = await axios.get(`${API_URL}/session-state`, { headers: { 'X-Session-ID': context.id } });
          setCreditHistory(updatedState.data.history);
      } catch (stateError) {
          console.error("No se pudo actualizar el historial después de un error:", stateError);
      }
   } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadExcel = (type) => {
    if (!analysisResult || !analysisResult.data) {
        alert("No hay datos de análisis para descargar.");
        return;
    }

    let dataToExport = analysisResult.data;
    let filename = `FerreteroIA_${analysisResult.report_key}.xlsx`;

    // Lógica para crear el reporte accionable
    if (type === 'accionable') {
        const columnasAccionables = [
            'SKU / Código de producto', 
            'Nombre del producto', 
            'Stock Actual (Unds)', 
            'Sugerencia_Pedido_Ideal_Unds', // Asegúrate que este nombre de columna coincida con el que devuelve tu backend
            // ... puedes añadir más columnas clave aquí
        ];

        dataToExport = analysisResult.data.map(row => {
            let newRow = {};
            columnasAccionables.forEach(col => {
                if (row[col] !== undefined) newRow[col] = row[col];
            });
            // Añadimos las columnas vacías que pediste para imprimir
            newRow['Check ✓'] = '';
            newRow['Cantidad Final'] = '';
            return newRow;
        });
        filename = `FerreteroIA_${analysisResult.report_key}_Accionable.xlsx`;
    }

    // Usamos la librería xlsx para crear el archivo desde el JSON
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte");
    
    // Disparamos la descarga
    XLSX.writeFile(workbook, filename);
  };

  const handleReportView = (reportItem) => {
    // Lógica que decide qué modal abrir
    if (context.type === 'anonymous' && reportItem.isPro) {
      setProReportClicked(reportItem);
      setActiveModal('proOffer');
    } else {
      setSelectedReport(reportItem);
      const initialParams = {};
      const allParamsConfig = [
          ...(reportItem.basic_parameters || []),
          ...(reportItem.advanced_parameters || [])
      ];

      allParamsConfig.forEach(param => {
          const paramName = param.name;
          
          initialParams[paramName] = param.defaultValue;

          // // Tu lógica de jerarquía de 3 niveles se mantiene intacta aquí
          // if (strategy[paramName] !== undefined) {
          //     initialParams[paramName] = strategy[paramName];
          // } else {
          //     initialParams[paramName] = param.defaultValue;
          // }
      });
      setActiveModal('reportParams');
    }
  };

  // const handleReportView = useCallback((reportItem) => {
  //   if (reportItem.isPro) {
  //       setProReportClicked(reportItem);
  //       setShowProModal(true);
  //       console.log('clicked pro')
  //   } else {
  //       console.log('no pro clicked')
  //       setSelectedReport(reportItem);
  //       setInsightHtml(diccionarioData[reportItem.label] || "<p>No hay información disponible.</p>");

  //       const initialParams = {};
  //       const allParamsConfig = [
  //           ...(reportItem.basic_parameters || []),
  //           ...(reportItem.advanced_parameters || [])
  //       ];

  //       allParamsConfig.forEach(param => {
  //           const paramName = param.name;
            
  //           initialParams[paramName] = param.defaultValue;

  //           // // Tu lógica de jerarquía de 3 niveles se mantiene intacta aquí
  //           // if (strategy[paramName] !== undefined) {
  //           //     initialParams[paramName] = strategy[paramName];
  //           // } else {
  //           //     initialParams[paramName] = param.defaultValue;
  //           // }
  //       });

  //       setModalParams(initialParams);
  //       setShowAdvanced(false);
  //       setShowModal(true);
  //   }
  // }, [
  //     strategy, diccionarioData, setProReportClicked, setShowProModal, 
  //     setSelectedReport, setInsightHtml, setModalParams, setShowAdvanced, setShowModal
  // ]);

  const handleParamChange = (paramName, value) => {
    // Ahora solo modifica los parámetros del modal, nada más.
    setModalParams(prev => ({ ...prev, [paramName]: value }));
  };

  const handleResetAdvanced = () => {
    const advancedDefaults = {};
    selectedReport.advanced_parameters?.forEach(param => {
        // Al resetear, volvemos a aplicar la jerarquía para obtener los defaults correctos

        advancedDefaults[param.name] = param.defaultValue;
        // if (strategy[param.name] !== undefined) {
        //     advancedDefaults[param.name] = strategy[param.name];
        // } else {
        //     advancedDefaults[param.name] = param.defaultValue;
        // }
    });
    
    setModalParams(prev => ({ ...prev, ...advancedDefaults }));
  };

  const handleGoToRegister = () => {
      // Cerramos cualquier modal que esté abierto y cambiamos a la vista de registro
      setShowProModal(false); 
      // setAppState('registering');
  };

  const handleLoginFromModal = (token) => {
    // Cerramos el modal y notificamos al componente App que el login fue exitoso
    setActiveModal(null);
    onLoginSuccess(token);
  };

  return (
    <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center text-white">
    <div className="w-full h-full animate-fade-in-slow flex flex-col">
      {/* El encabezado ahora es parte de esta vista reutilizable */}
      <header className="flex flex-col items-center gap-2 py-3 px-4 sm:px-6 lg:px-8 text-white w-full border-b border-gray-700 bg-neutral-900 sticky top-0 z-10">
        <div className="flex flex-col">
          <div className="flex gap-4 justify-center mb-2">
            <h1 className="text-3xl md:text-5xl font-bold text-white">
                <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(to right, #560bad, #7209b7, #b5179e)' }}>Ferretero.IA</span>
            </h1>
            {/* Botón de Login solo para usuarios anónimos */}
            {context.type === 'anonymous'
              ? <button onClick={() => setActiveModal('login')} className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-purple-600 text-white hover:bg-purple-700 rounded-lg transition-colors"><FiLogIn /> Iniciar Sesión</button>
              : <button onClick={onLogout} className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-gray-600 text-white hover:bg-gray-700 rounded-lg transition-colors"><FiLogOut /> Cerrar Sesión</button>
            }
          </div>
            {context.type === 'anonymous' &&
              <p className="text-xs text-white flex justify-center text-center items-center font-mono gap-4">
                <span>Modo: Sesión Anónima <br/> {context.id}</span>
              </p>
            }
        </div>
        {context.type === 'user' && (
          <WorkspaceSelector
            workspaces={workspaces}
            activeWorkspace={activeWorkspace}
            onWorkspaceChange={setActiveWorkspace} // Permite cambiar el espacio activo
            onCreateNew={() => setIsCreateModalOpen(true)}
            onBack={ () => onBack() }
          />
        )}
        <div className="flex flex-row w-full justify-center items-center gap-6">
          <button onClick={() => setActiveModal('strategy')} className="flex items-center gap-2 text-sm text-gray-300 hover:text-white"><FiSettings /> Configurar Mi Estrategia</button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 w-full">
        <div className="flex items-center gap-6 col-span-full">
           <CreditsPanel 
                used={credits.used} 
                remaining={credits.remaining}
                onHistoryClick={() => setActiveModal('history')}
           />
        </div>
        <div className='mt-10 w-full max-w-5xl grid text-white md:grid-cols-2 px-2 mx-auto'>
          <CsvImporterComponent 
            fileType="ventas"
            title="Historial de Ventas"
            template={templateVentas}
            onFileProcessed={handleFileProcessed}
            uploadStatus={uploadStatus.ventas}
          />
          <CsvImporterComponent 
            fileType="inventario"
            title="Stock Actual"
            template={templateStock}
            onFileProcessed={handleFileProcessed}
            uploadStatus={uploadStatus.inventario}
          />
        </div>
        
        {filesReady ? (
          <div className="w-full space-y-8 px-4 mb-4 mt-10">
            {Object.entries(reportData).map(([categoria, reportes]) => (
              <div key={categoria} className="mb-6">
                <h3 className="text-white text-xl font-semibold mb-4 border-b border-purple-400 pb-2 mt-6">
                  {categoria}
                </h3>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {reportes.map((reportItem) => (
                    <button
                      key={reportItem.label}
                      onClick={() => handleReportView(reportItem)}
                      className={`relative w-full text-left p-4 rounded-lg shadow-md transition-all duration-200 ease-in-out transform hover:scale-105 group
                        ${reportItem.isPro 
                          ? 'bg-gray-700 text-gray-400 hover:bg-gray-600 border border-purple-800' // Estilo Pro
                          : 'bg-white bg-opacity-90 text-black hover:bg-purple-100' // Estilo Básico
                        }`
                      }
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm">{reportItem.label}</span>
                        {reportItem.isPro && <FiLock className="text-yellow-500" />}
                      </div>
                      {reportItem.isPro && (
                        <p className="text-xs text-purple-400 mt-1">Función Avanzada</p>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-10 text-base text-white p-4 bg-gray-800 rounded-md shadow">
            📂 Carga tus archivos y activa la inteligencia comercial de tu ferretería.
          </p>
        )}
      </main>

      {/* El modal de parámetros ahora vive aquí */}
      {activeModal === 'reportParams' && selectedReport && (
        <div className="fixed h-full inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 animate-fade-in overflow-y-auto">
          {/*<div className="h-full bg-white rounded-lg relative max-w-48 top-0 flex flex-col">*/}
          <div className="h-full flex flex-col bg-white rounded-lg max-w-md w-full shadow-2xl relative text-center">
            <div className="p-4 border-b bg-white z-10 shadow text-center sticky top-0">
              <h2 className="text-xl font-bold text-gray-800 ">
                {selectedReport.label}
              </h2>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">
              {!analysisResult ? (
                <div className="flex-1 min-h-0 gap-4 p-4">
                  {(selectedReport.basic_parameters?.length > 0 || selectedReport.advanced_parameters?.length > 0) && (
                    <div className="p-4 border-2 rounded-md shadow-md bg-gray-50">
                      <h3 className="text-lg font-semibold text-gray-700 mb-4">Parámetros del Reporte</h3>
                      
                      {/* --- RENDERIZADO DE PARÁMETROS BÁSICOS --- */}
                      {selectedReport.basic_parameters?.map((param) => {
                        // Lógica de renderizado para select y multi-select
                        if (param.type === 'select') {
                          return (
                            <div key={param.name} className="mb-4">
                              <label htmlFor={param.name} className="block text-sm font-medium text-gray-600 mb-1">{param.label}:</label>
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
                          const options = availableFilters[param.optionsKey]?.map(opt => ({ value: opt, label: opt })) || [];
                          const value = (modalParams[param.name] || []).map(val => ({ value: val, label: val }));
                          return (
                            <div key={param.name} className="mb-4">
                              <label className="block text-sm font-medium text-gray-600 mb-1">{param.label}:</label>
                              <Select
                                isMulti
                                name={param.name}
                                options={options}
                                className="mt-1 block w-full basic-multi-select"
                                classNamePrefix="select"
                                value={value}
                                isLoading={isLoadingFilters}
                                placeholder={isLoadingFilters ? "Cargando filtros..." : "Selecciona uno o más..."}
                                onChange={(selectedOptions) => {
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
                      {(selectedReport.advanced_parameters && selectedReport.advanced_parameters.length > 0) && (
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
                                {selectedReport.advanced_parameters.map(param => {
                                  if (param.type === 'boolean_select') {
                                    return (
                                      <div key={param.name} className="mb-4">
                                        <label htmlFor={param.name} className="block text-sm font-medium text-gray-600 mb-1">{param.label}:</label>
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
                                        <label htmlFor={param.name} className="block text-sm font-medium text-gray-600 mb-1">{param.label}:</label>
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
              ) : (
                // VISTA DE RESULTADOS: Botones de descarga y para volver
                <div className="space-y-3">
                  <div className="flex gap-4">
                      <button onClick={() => handleDownloadExcel('accionable')} className="flex-1 bg-gray-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-gray-700">
                          📋 Descargar Accionable
                      </button>
                      <button onClick={() => handleDownloadExcel('detallado')} className="flex-1 bg-purple-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-purple-700">
                          📊 Descargar Detallado
                      </button>
                  </div>
                  <button onClick={() => setAnalysisResult(null)} className="text-sm text-gray-600 hover:text-black">
                      ‹ Volver a Parámetros
                  </button>
                </div>
              )}
            </div>
            <div className="p-4 w-full border-t bg-gray-50 z-10 shadow text-center sticky bottom-0">
              <button
                  onClick={handleGenerateAnalysis}
                  // La condición disabled ahora solo depende de si los archivos están listos o si está cargando
                  disabled={!filesReady || isLoading}
                  className={`border px-6 py-3 rounded-lg font-semibold w-full transition-all duration-300 ease-in-out flex items-center justify-center gap-2
                      ${
                          // Lógica de estilos condicional
                          isLoading ? 'bg-gray-200 text-gray-500 cursor-wait' :
                          !filesReady ? 'bg-gray-200 text-gray-400 cursor-not-allowed' :
                          isCacheValid ? 'bg-green-100 border-green-600 text-green-800 hover:bg-green-200' : 'text-transparent border-purple-700'
                      }`
                  }
                  style={!isLoading && !isCacheValid ? {
                    backgroundImage: 'linear-gradient(to right, #560bad, #7209b7, #b5179e)',
                    backgroundClip: 'text',
                  } : {}}
              >
                  {/* Lógica para renderizar el contenido del botón */}
                  {isLoading ? (
                      <>
                          <FiLoader className="animate-spin h-5 w-5" />
                          <span>Generando...</span>
                      </>
                  ) : isCacheValid ? (
                      <>
                          <FiDownload className="font-bold text-xl"/>
                          <span>Descargar Reporte (en caché)</span>
                      </>
                  ) : (
                      <>
                          <span className="text-black font-bold text-lg">🚀</span>
                          {/* El texto cambia si ya existe una caché pero es obsoleta */}
                          <span>{cachedResponse.key ? 'Volver a Ejecutar con Nuevos Parámetros' : 'Ejecutar Análisis'}</span>
                      </>
                  )}
              </button>
              <button
                  onClick={() => setShowModal(false)}
                  className="mt-2 w-full text-white text-xl px-4 py-2 font-bold rounded-lg hover:text-gray-100"
                  disabled={isLoading}
                  style={{
                    backgroundImage: 'linear-gradient(to right, #560bad, #7209b7, #b5179e)',
                  }}
              >
                  Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/*{isStrategyPanelOpen && ()}*/}
      {activeModal === 'strategy' && (
        <StrategyPanelModal
          onClose={() => setActiveModal(null)}
          sessionId={context.id}
        />
      )}

      {/*{isHistoryModalOpen && ()}*/}
      {activeModal === 'history' && (
        <CreditHistoryModal
          history={creditHistory}
          reportData={reportData}
          onClose={() => setActiveModal(null)}
        />
      )}

      {/*{showProModal && proReportClicked && ()}*/}
      {activeModal === 'proOffer' && proReportClicked && (
        <ProOfferModal
          reportName={proReportClicked.label}
          onClose={() => setActiveModal(null)}
          onRegister={() => setActiveModal('register')}
        />
      )}

      {/*{showCreditsModal && ()}*/}
      {activeModal === 'creditsOffer' && (
        <InsufficientCreditsModal
          required={creditsInfo.required}
          remaining={creditsInfo.remaining}
          onClose={() => setActiveModal(null)}
          onRegister={() => setActiveModal('register')}
          onNewSession={() => window.location.reload()}
        />
      )}

      {activeModal === 'login' && (
        <LoginModal 
          onLoginSuccess={handleLoginFromModal} 
          onSwitchToRegister={() => setActiveModal('register')}
          onBackToAnalysis={() => setActiveModal(null)} 
        />
      )}

      {activeModal === 'register' && (
        <RegisterModal 
          sessionId={context.id} 
          onRegisterSuccess={() => setActiveModal('login')}
          onSwitchToLogin={() => setActiveModal('login')}
          onBackToLanding={() => setActiveModal(null)} 
        />
      )}

      {/* --- RENDERIZADO DEL NUEVO MODAL --- */}
      {isCreateModalOpen && (
        <CreateWorkspaceModal 
            onClose={() => setIsCreateModalOpen(false)}
            onSuccess={handleCreationSuccessAndSwitch} // Le pasamos la función de éxito específica
        />
      )}
    </div>
  </div>
  )
}
