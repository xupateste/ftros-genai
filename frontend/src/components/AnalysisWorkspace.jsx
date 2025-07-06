// src/components/AnalysisWorkspace.jsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../utils/api'; // Usamos nuestro cliente API centralizado
import axios from 'axios';
import { useStrategy } from '../context/StrategyProvider';
import { useWorkspace } from '../context/WorkspaceProvider';
import { useConfig } from '../context/ConfigProvider';
import * as XLSX from 'xlsx';
import Select from 'react-select';

// Importa todos los componentes visuales y de iconos que este workspace necesita
import CsvImporterComponent from '../assets/CsvImporterComponent';
import { CreditsPanel } from './CreditsPanel';
import { CreditHistoryModal } from './CreditHistoryModal';
import { ProOfferModal } from './ProOfferModal';
import { InsufficientCreditsModal } from './InsufficientCreditsModal';
import { StrategyPanelModal } from './StrategyPanelModal';
import { RegisterPage } from './RegisterPage';
import { WorkspaceSelector } from './WorkspaceSelector';
import { LoadingScreen } from './LoadingScreen';
import { FiDownload, FiLogIn, FiRefreshCw, FiLogOut, FiLock, FiLoader, FiSettings,  FiUser, FiMail, FiKey, FiUserPlus } from 'react-icons/fi';
import { CreateWorkspaceModal } from './CreateWorkspaceModal'; // Importa el modal
import { Tooltip } from './Tooltip';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
import {LoginModal} from './LoginModal'; // Asumimos que LoginModal vive en su propio archivo
import {RegisterModal} from './RegisterModal'; // Asumimos que RegisterModal vive en su propio archivo

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

export function AnalysisWorkspace({ context, onLoginSuccess, initialData, onLogout, onBackToDashboard }) {
  // --- ESTADOS ---
  const { strategy, loadStrategy } = useStrategy();
  const { workspaces, activeWorkspace, setActiveWorkspace, touchWorkspace } = useWorkspace();
  const { reportData, tooltips, isLoading: isConfigLoading } = useConfig();

  // 1. ESTADO DE CARGA PRINCIPAL
  const [isLoading, setIsLoading] = useState(true);
  
  // 2. ESTADOS DEL WORKSPACE (con inicialización segura)
  const [uploadedFileIds, setUploadedFileIds] = useState({ ventas: null, inventario: null });
  const [credits, setCredits] = useState({ used: 0, remaining: 0 });
  const [creditHistory, setCreditHistory] = useState([]);
  
  // 3. ESTADOS DE LA UI
  const [activeModal, setActiveModal] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);


  // --- ESTADOS Y CONTEXTO ---
  const [draftStrategy, setDraftStrategy] = useState({});
  const [modalParams, setModalParams] = useState({});
  const [filesReady, setFilesReady] = useState(false);
  const [uploadStatus, setUploadStatus] = useState({ ventas: 'idle', inventario: 'idle' });
  const [creditsInfo, setCreditsInfo] = useState({ required: 0, remaining: 0 });
  const [proReportClicked, setProReportClicked] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [availableFilters, setAvailableFilters] = useState({ categorias: [], marcas: [] });
  const [isLoadingFilters, setIsLoadingFilters] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isCacheValid, setIsCacheValid] = useState(false);
  const [cachedResponse, setCachedResponse] = useState({ key: null, blob: null });

  const [isStrategyPanelOpen, setStrategyPanelOpen] = useState(false);

  // --- LÓGICA DE CARGA Y ACTUALIZACIÓN ---
  useEffect(() => {
    const loadInitialData = async () => {
      const isUserContext = context.type === 'user' && context.workspace;
      const identifier = isUserContext ? context.workspace.id : context.id;

      if (!identifier) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      resetWorkspaceState();

      try {
        // Hacemos las llamadas en paralelo
        const [stateResponse] = await Promise.all([
          api.get(isUserContext ? `/workspaces/${identifier}/state` : `/session-state`, {
            headers: isUserContext ? {} : { 'X-Session-ID': identifier }
          }),
          loadStrategy(context)
        ]);

        const { credits, history, files, available_filters } = stateResponse.data || {};
        setCredits(credits || { used: 0, remaining: 20 });
        setCreditHistory(history || []);
        setUploadedFileIds(files || { ventas: null, inventario: null });
        setAvailableFilters( available_filters
                ? { categorias: available_filters.categorias, marcas: available_filters.marcas }
                : { categorias: [], marcas: []});          
        
        const loadedFiles = files || { ventas: null, inventario: null };
        setUploadedFileIds(loadedFiles);

        setUploadStatus({
          ventas: loadedFiles.ventas ? 'success' : 'idle',
          inventario: loadedFiles.inventario ? 'success' : 'idle'
        });

      } catch (error) {
        console.error("Error al cargar el contexto:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();

  // Ahora depende de los IDs, que son strings estables, no de objetos que se recrean.
  // }, [context.type, context.id, context.workspace?.id, loadStrategy]);
  }, [context.type, context.id, context.workspace?.id, loadStrategy]);

  const strategyModalContext = useMemo(() => {
    if (context.type === 'user') {
        return { type: 'workspace', id: context.workspace.id, name: context.workspace.nombre };
    }
    return { type: 'anonymous', id: context.id };
  }, [context.type, context.id, context.workspace?.id, context.workspace?.nombre]);


  useEffect(() => {
    setFilesReady(!!uploadedFileIds.ventas && !!uploadedFileIds.inventario);
  }, [uploadedFileIds]);

  // Función para limpiar el estado al cambiar de workspace
  const resetWorkspaceState = () => {
    setUploadedFileIds({ ventas: null, inventario: null });
    setUploadStatus({ ventas: 'idle', inventario: 'idle' });
    setAnalysisResult(null);
  };

  // --- FUNCIÓN DE CARGA DE ARCHIVOS CONSCIENTE DEL CONTEXTO ---
  const handleFileProcessed = async (file, fileType) => {
    const isUserContext = context.type === 'user' && context.workspace;
    if (!isUserContext && !context.id) {
        alert("Error: No se ha iniciado una sesión de análisis.");
        return;
    }

    setUploadStatus(prev => ({ ...prev, [fileType]: 'uploading' }));
    const formData = new FormData();
    formData.append("file", file);
    formData.append("tipo_archivo", fileType);

    const headers = {};
    if (isUserContext) {
        formData.append("workspace_id", context.workspace.id);
        // El token de autorización se añade automáticamente por el interceptor de `api.js`
        console.log(`Subiendo archivo al workspace: ${context.workspace.id}`);
    } else {
        headers['X-Session-ID'] = context.id;
        console.log(`Subiendo archivo a la sesión anónima: ${context.id}`);
    }

    try {
      const response = await api.post('/upload-file', formData, { headers });
      setUploadedFileIds(prev => ({ ...prev, [fileType]: response.data.file_id }));
      setUploadStatus(prev => ({ ...prev, [fileType]: 'success' }));
      
      // --- LÓGICA CLAVE PARA POBLAR LOS FILTROS ---
      if (fileType === 'inventario' && response.data.available_filters) {
        console.log("Filtros de Categorías y Marcas recibidos:", response.data.available_filters);
        setAvailableFilters({
          categorias: response.data.available_filters.categorias || [],
          marcas: response.data.available_filters.marcas || []
        });
      }

    } catch (error) {
      console.error(`Error al subir ${fileType}:`, error);
      alert(error.response?.data?.detail || `Error al subir el archivo.`);
      setUploadStatus(prev => ({ ...prev, [fileType]: 'error' }));
    }
  };

  // ... (Aquí van tus otras funciones: handleGenerateAnalysis, handleReportView, etc.)
  // ¡Asegúrate de que usen el cliente `api` y pasen el `workspace_id` si es necesario!

  const handleGenerateAnalysis = async () => {  
    const isUserContext = context.type === 'user' && context.workspace;
    const identifier = isUserContext ? context.workspace.id : context.id;

    // 1. Verificación inicial (ahora comprueba los IDs de archivo)
    if (!selectedReport || !uploadedFileIds.ventas || !uploadedFileIds.inventario || !identifier) {
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

    const headers = {};
    if (isUserContext) {
        const token = localStorage.getItem('accessToken');
        formData.append("workspace_id", context.workspace.id);
        formData.append("current_user", token);
        headers['X-Session-ID'] = context.workspace.id;
    } else {
        headers['X-Session-ID'] = context.id;
        console.log(`Subiendo archivo a la sesión anónima: ${context.id}`);
    }

    try {
      const response = await api.post(`${API_URL}${selectedReport.endpoint}`, formData, { headers });
      
      const newBlob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      // Guardamos el resultado completo (insight + datos) en nuestro nuevo estado
      setAnalysisResult(response.data);

      // Después de una ejecución exitosa, volvemos a pedir el estado actualizado
      const updatedState = await api.get(isUserContext ? `/workspaces/${identifier}/state` : `/session-state`, {
            headers: isUserContext ? {} : { 'X-Session-ID': identifier }
          })
      const { credits, history } = updatedState.data || {};
      setCredits(credits || { used: 0, remaining: 20 });
      setCreditHistory(history || []);

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
          setActiveModal('creditsOffer');
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
          // Después de una ejecución exitosa, volvemos a pedir el estado actualizado
          const updatedState = await api.get(isUserContext ? `/workspaces/${identifier}/state` : `/session-state`, {
                headers: isUserContext ? {} : { 'X-Session-ID': identifier }
              })
          const { history } = updatedState.data || {};
          setCreditHistory(history || []);
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
    // 1. Defensa contra estado nulo (se mantiene)
    if (!strategy) {
      alert("La configuración de la estrategia aún se está cargando, por favor espera un momento.");
      return;
    }
    // Lógica para la oferta Pro (se mantiene)
    if ( reportItem.isPro ) {
      setProReportClicked(reportItem);
      setActiveModal('proOffer');
      return;
    }
    
    // --- LÓGICA DE PARÁMETROS CORREGIDA Y FINAL ---
    setSelectedReport(reportItem);
    const initialParams = {};

    const allParamsConfig = [
      ...(reportItem.basic_parameters || []),
      ...(reportItem.advanced_parameters || [])
    ];

    // allParamsConfig.forEach(param => {
    //   const paramName = param.name;
      
    //   // JERARQUÍA DE PARÁMETROS:
    //   // Nivel 1 (Prioridad Alta): El valor de la Estrategia Global guardada.
    //   // Nivel 2 (Prioridad Baja): El valor por defecto del código del reporte.
    //   // El valor que el usuario modifique después se guardará en `modalParams`.
    //   if (strategy[paramName] !== undefined && strategy[paramName] !== null) {
    //     initialParams[paramName] = strategy[paramName];
    //   } else {
    //     initialParams[paramName] = param.defaultValue;
    //   }
    // });

    allParamsConfig.forEach(param => {
          if (strategy && strategy[param.name] !== undefined) {
              initialParams[param.name] = strategy[param.name];
          } else {
              initialParams[param.name] = param.defaultValue;
          }
      });

    // Establecemos los parámetros iniciales en el estado del modal y lo abrimos
    setModalParams(initialParams);
    setActiveModal('reportParams');
  };



  const handleParamChange = (paramName, value) => {
    // Ahora solo modifica los parámetros del modal, nada más.
    setModalParams(prev => ({ ...prev, [paramName]: value }));
  };

  const handleResetAdvanced = () => {
    const advancedDefaults = {};
    selectedReport.advanced_parameters?.forEach(param => {
        advancedDefaults[param.name] = param.defaultValue;
    });
    
    setModalParams(prev => ({ ...prev, ...advancedDefaults }));
  };

  const handleGoToRegister = () => {
      // Cerramos cualquier modal que esté abierto y cambiamos a la vista de registro
      setActiveModal(null); 
      // setAppState('registering');
  };

  const handleLoginFromModal = (token) => {
    // Cerramos el modal y notificamos al componente App que el login fue exitoso
    setActiveModal(null);
    onLoginSuccess(token);
  };

  const handleCreationSuccessAndSwitch = (newWorkspace) => {
    console.log(`Espacio '${newWorkspace.nombre}' creado, cambiando a esta vista.`);
    setActiveWorkspace(newWorkspace); // Cambia el contexto al nuevo espacio
    setIsCreateModalOpen(false); // Cierra el modal
  };

  // --- RENDERIZADO ---
  if (isConfigLoading || isLoading) {
    return <LoadingScreen message={context.type === 'user' ? `Cargando espacio: ${context.workspace?.nombre}...` : "Iniciando sesión anónima..."} />;
  }

  // if (isConfigLoading || isLoading) {
  //   return <LoadingScreen message="Cargando..." />;
  // }

  return (
    <div className="w-full h-screen animate-fade-in-slow flex flex-col bg-neutral-900 text-white">
        {/* Tu encabezado ahora puede usar `context` para mostrar la información correcta */}
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
            {/* Solo se muestra si es un usuario registrado */}
            {/*{context.type === 'user' && (
                <button onClick={onBackToDashboard} className="text-xs text-purple-400 hover:text-white mb-1">
                    &larr; Mis Espacios de Trabajo
                </button>
            )}*/}
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
            onBackToDashboard={ onBackToDashboard }
          />
        )}
        <div className="flex flex-row w-full justify-center items-center gap-6">
          <button onClick={() => setActiveModal('strategy')} className="flex items-center gap-2 text-sm text-gray-300 hover:text-white"><FiSettings /> Mi Estrategia</button>
        
          {/*<button onClick={() => setStrategyPanelOpen(true)} className="flex items-center gap-2 text-sm text-gray-300 hover:text-white">
            <FiSettings /> Estrategia de este Espacio
          </button>*/}
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
        <div className='mt-10 w-full max-w-5xl grid text-white md:grid-cols-2 gap-8 px-2 mx-auto'>
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
        {/* El resto de tu JSX para la lista de reportes */}
        {isConfigLoading ? (
          <p>Cargando reportes...</p>
        ) : filesReady ? (
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

      {/* El renderizado de tus modales se mantiene igual */}
      {activeModal === 'reportParams' && selectedReport && (
        <div className="fixed h-full inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 animate-fade-in overflow-y-auto">
          {/*<div className="h-full bg-white rounded-lg relative max-w-48 top-0 flex flex-col">*/}
          <div className="h-full flex flex-col bg-white rounded-lg max-w-md w-full shadow-2xl relative text-left">
            <div className="p-4 border-b bg-white z-10 shadow text-center sticky top-0">
              <h2 className="text-xl font-bold text-gray-800 ">
                {selectedReport.label}
              </h2>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">
              {!analysisResult ? (
                <div className="flex-1 min-h-0 gap-4 p-4 text-black">
                  {(selectedReport.basic_parameters?.length > 0 || selectedReport.advanced_parameters?.length > 0) && (
                    <div className="p-4 border-2 rounded-md shadow-md bg-gray-50">
                      <h3 className="text-lg font-semibold text-gray-700 mb-4">Parámetros del Reporte</h3>
                      
                      {/* --- RENDERIZADO DE PARÁMETROS BÁSICOS --- */}
                      {selectedReport.basic_parameters?.map((param) => {
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
                                isLoading={isLoadingFilters}
                                placeholder={isLoadingFilters ? "Cargando..." : "Selecciona..."}
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
                  onClick={() => setActiveModal(null)}
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
      {/*{activeModal === 'strategy' && (
        <StrategyPanelModal
          strategy={draftStrategy} 
          context={context} 
          setStrategy={setDraftStrategy} 
          onClose={() => setActiveModal(null)}
          sessionId={context.id}
        />
      )}*/}
      {isStrategyPanelOpen && (
        <StrategyPanelModal 
          context={{ type: 'workspace', id: context.workspace.id, name: context.workspace.nombre }}
          onClose={() => setStrategyPanelOpen(false)}
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
          onClose={() => setActiveModal(null)}
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
      {activeModal === 'strategy' && (
        <StrategyPanelModal 
          context={strategyModalContext} 
          onClose={() => setActiveModal(null)} 
        />
      )}
      {/*{isCreateModalOpen && (
        <CreateWorkspaceModal 
            onClose={() => setIsCreateModalOpen(false)}
            onSuccess={handleCreationSuccessAndSwitch} // Le pasamos la función de éxito específica
        />
      )}*/}
    </div>
  );
}
