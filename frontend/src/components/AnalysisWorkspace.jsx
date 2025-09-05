// src/components/AnalysisWorkspace.jsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../utils/api'; // Usamos nuestro cliente API centralizado
import axios from 'axios';
import { useStrategy } from '../context/StrategyProvider';
import { useWorkspace } from '../context/WorkspaceProvider';
import { useConfig } from '../context/ConfigProvider';
import * as XLSX from 'xlsx';
import Select from 'react-select';
import { DateRangeFilter } from './DateRangeFilter'; // <-- Importamos el nuevo componente
import { ErrorModal } from './ErrorModal'; // <-- Importamos el nuevo componente

// Importa todos los componentes visuales y de iconos que este workspace necesita
import { ReportModal } from './ReportModal'; 
import CsvImporterComponent from '../assets/CsvImporterComponent';
import { ConnectionsModal } from './ConnectionsModal';
import { CreditsPanel } from './CreditsPanel';
import { CreditHistoryModal } from './CreditHistoryModal';
import { ProOfferModal } from './ProOfferModal';
import { InsufficientCreditsModal } from './InsufficientCreditsModal';
import { StrategyPanelModal } from './StrategyPanelModal';
import { RegisterPage } from './RegisterPage';
import { WorkspaceSelector } from './WorkspaceSelector';
import { LoadingScreen } from './LoadingScreen';
import { FiDownload, FiCalendar, FiAward, FiLogIn, FiChevronUp, FiChevronDown, FiEdit, FiRefreshCw, FiLogOut, FiLoader, FiSettings,  FiUser, FiMail, FiKey, FiUserPlus } from 'react-icons/fi';
import { CreateWorkspaceModal } from './CreateWorkspaceModal'; // Importa el modal
import { Tooltip } from './Tooltip';
import { FerreterosLogo } from './FerreterosLogo'
import { UpgradeModal } from './UpgradeModal'; // <-- Importamos el nuevo modal
import { DateRangePickerModal } from './DateRangePickerModal'; // <-- Importamos el nuevo modal
import { RechargeCreditsModal } from './RechargeCreditsModal';
import { BecomeStrategistModal } from './BecomeStrategistModal';
import { ReportButton } from './ReportButton'; // <-- Importamos el nuevo botón
import { AuditDashboard } from './AuditDashboard'; // <-- Importamos el nuevo componente
import { AnimateOnScroll } from './AnimateOnScroll'; // <-- Importamos el nuevo componente

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

import {LoginModal} from './LoginModal'; // Asumimos que LoginModal vive en su propio archivo
import {RegisterModal} from './RegisterModal'; // Asumimos que RegisterModal vive en su propio archivo
import { RegisterToUnlockModal } from './RegisterToUnlockModal';
import templateVentas from '../assets/templateVentas';
import templateStock from '../assets/templateStock';

// Las plantillas ahora se importan, tienen esta estructura
// const templateVentas = {
//         columns: [
//           {
//             name: "Fecha de venta",
//             key: "Fecha de venta",
//             required: true,
//             description: "Fecha en formato dd/mm/aaaa ej:23/05/2025",
//             suggested_mappings: ["Fecha de venta"]
//           },
//           {
//             name: "N° de comprobante / boleta",
//             key: "N° de comprobante / boleta",
//             required: true,
//             // description: "Fecha en formato dd/mm/aaaa ej:23/05/2025",
//             suggested_mappings: ["N° de comprobante / boleta"]
//           },
//           {
//             name: "SKU / Código de producto",
//             key: "SKU / Código de producto",
//             required: true,
//             suggested_mappings: ["SKU / Código de producto"]
//           },
//           {
//             name: "Nombre del producto",
//             key: "Nombre del producto",
//             required: true,
//             suggested_mappings: ["Nombre del producto"]
//           },
//           {
//             name: "Cantidad vendida",
//             key: "Cantidad vendida",
//             required: true,
//             description: "Sólo valor numérico entero ej:10",
//             suggested_mappings: ["Cantidad vendida"]
//           },
//           {
//             name: "Precio de venta unitario (S/.)",
//             key: "Precio de venta unitario (S/.)",
//             required: true,
//             description: "Sólo valor numérico entero ó decimal ej:10.5",
//             suggested_mappings: ["Precio de venta unitario (S/.)"]
//           }
//         ]
//       };

// const templateStock = {
//         columns: [
//           {
//             name: "SKU / Código de producto",
//             key: "SKU / Código de producto",
//             required: true,
//             suggested_mappings: ["SKU / Código de producto"]
//           },
//           {
//             name: "Nombre del producto",
//             key: "Nombre del producto",
//             required: true,
//             suggested_mappings: ["Nombre del producto"]
//           },
//           {
//             name: "Cantidad en stock actual",
//             key: "Cantidad en stock actual",
//             required: true,
//             description: "Sólo valor numérico entero ej:10",
//             suggested_mappings: ["Cantidad en stock actual"]
//           },
//           {
//             name: "Precio de compra actual (S/.)",
//             key: "Precio de compra actual (S/.)",
//             required: true,
//             description: "Sólo valor numérico entero ó decimal ej:10.5",
//             suggested_mappings: ["Precio de compra actual (S/.)"]
//           },
//           {
//             name: "Precio de venta actual (S/.)",
//             key: "Precio de venta actual (S/.)",
//             required: true,
//             description: "Sólo valor numérico entero ó decimal ej:10.5",
//             suggested_mappings: ["Precio de venta actual (S/.)"]
//           },
//           {
//             name: "Marca",
//             key: "Marca",
//             required: true,
//             suggested_mappings: ["Marca"]
//           },
//           {
//             name: "Categoría",
//             key: "Categoría",
//             required: true,
//             suggested_mappings: ["Categoría"]
//           },
//           {
//             name: "Subcategoría",
//             key: "Subcategoría",
//             required: true,
//             suggested_mappings: ["Subcategoría"]
//           },
//           {
//             name: "Rol de categoría",
//             key: "Rol de categoría",
//             required: true,
//             suggested_mappings: ["Rol de categoría"]
//           },
//           {
//             name: "Rol del producto",
//             key: "Rol del producto",
//             required: true,
//             suggested_mappings: ["Rol del producto"]
//           }
//         ]
//       };

export function AnalysisWorkspace({ context, onLoginSuccess, initialData = null, onLogout, onBackToDashboard }) {
  // --- ESTADOS ---
  const { strategy, loadStrategy } = useStrategy();
  const { user, workspaces, activeWorkspace, setActiveWorkspace, touchWorkspace } = useWorkspace();
  const { reportData, tooltips, isLoading: isConfigLoading } = useConfig();

  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
  const [errorContextData, setErrorContextData] = useState(null);

  // 1. ESTADO DE CARGA PRINCIPAL
  const [isLoading, setIsLoading] = useState(true);
  const [initialSkuFilter, setInitialSkuFilter] = useState(null);

  // 2. ESTADOS DEL WORKSPACE (con inicialización segura)
  const [uploadedFileIds, setUploadedFileIds] = useState({ ventas: null, inventario: null });
  const [credits, setCredits] = useState({ used: 0, remaining: 0 });
  const [creditHistory, setCreditHistory] = useState([]);
  
  // 3. ESTADOS DE LA UI
  const [activeModal, setActiveModal] = useState(null);
  const [rechargeContext, setRechargeContext] = useState(null); // <-- Nuevo estado para el contexto de recarga
  const [analysisResult, setAnalysisResult] = useState(null);
  const [dateRangeBounds, setDateRangeBounds] = useState(null); // Nuevo estado para los límites de fecha
  const [isDateModalOpen, setIsDateModalOpen] = useState(false); // Nuevo estado para controlar el modal
  const [activeDateFilter, setActiveDateFilter] = useState(null);
  const [uploaderState, setUploaderState] = useState('visible'); // 'visible', 'fadingOut', 'collapsed'
  const [auditState, setAuditState] = useState({ status: 'idle', data: null }); // idle, loading, outdated, up_to_date, error
  const [isExecutingAudit, setIsExecutingAudit] = useState(false);


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
  const [modalInitialView, setModalInitialView] = useState('parameters');
  const [reportContextInfo, setReportContextInfo] = useState(null);

  const [isStrategyPanelOpen, setStrategyPanelOpen] = useState(false);
  const [modalInfo, setModalInfo] = useState({ title: '', message: '' });
  const [fileMetadata, setFileMetadata] = useState({ ventas: null, inventario: null });

  // -- NUEVOS ESTADOS PARA AUDITORIA COMPONENT --
  const [view, setView] = useState('audit'); // 'audit' o 'reports'
  const [auditResult, setAuditResult] = useState(null);
  const [isLoadingAudit, setIsLoadingAudit] = useState(true);

  // --- ESTADOS SIMPLIFICADOS ---
  // El estado del modal de reporte ahora es mucho más simple
  const [selectedReport, setSelectedReport] = useState(null); 
  const [initialResultData, setInitialResultData] = useState(null);
    
  const [initialParams, setInitialParams] = useState(null);

  const [count, setCount] = useState(0)
  const [auditCount, setAuditCount] = useState(0);
  
  const handleRunNewAudit = useCallback(async (fileIdsToAudit) => {
    if (!fileIdsToAudit || !fileIdsToAudit.ventas || !fileIdsToAudit.inventario) {
        console.error("Intento de ejecutar auditoría sin los fileIds necesarios.");
        setAuditState({ status: 'error', data: null });
        return;
    }
    setIsExecutingAudit(true);
    setIsErrorModalOpen(false); 
    const formData = new FormData();
    formData.append("ventas_file_id", fileIdsToAudit.ventas);
    formData.append("inventario_file_id", fileIdsToAudit.inventario);
    if (context.type === 'user') {
      formData.append("workspace_id", context.workspace.id);
    }

    try {
      const response = await api.post('/auditoria/run', formData, {
        headers: context.type === 'anonymous' ? { 'X-Session-ID': context.id } : {}
      });
      setAuditState({ status: 'up_to_date', data: response.data });
    } catch (error) {
      console.error("Error al ejecutar la nueva auditoría:", error);
      const now = new Date();
      // Guardamos el contexto del error para pasarlo al modal
      setErrorContextData({
          userName: user.email || 'Usuario',
          timestamp: now.toLocaleString('es-PE', { dateStyle: 'long', timeStyle: 'short' }),
          errorId: `ERR-${now.getTime()}` // ID de error simple para seguimiento
      });
      setAuditState(prev => ({ ...prev, status: 'error' }));
      setIsErrorModalOpen(true);
    } finally {
      setIsExecutingAudit(false);
    }
  }, [context.type, context.workspace?.id, context.id]); // Dependencias estables

  // --- FUNCIÓN PARA EL BOTÓN "REINTENTAR" DEL MODAL ---
  const handleRetryAudit = () => {
      // Cierra el modal y vuelve a ejecutar la auditoría
      setIsErrorModalOpen(false);
      handleRunNewAudit(uploadedFileIds);
  };


  // --- LÓGICA DE CARGA Y ACTUALIZACIÓN ---
  // --- EFECTO PRINCIPAL DE CARGA Y ORQUESTACIÓN (REFACTORIZADO) ---
  useEffect(() => {
    const loadAndCheckContext = async () => {
      const isUserContext = context.type === 'user' && context.workspace;
      const identifier = isUserContext ? context.workspace.id : context.id;
      if (!identifier) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      resetWorkspaceState(); // Limpiamos el estado anterior

      try {
        const contextToLoad = isUserContext ? { type: 'workspace', id: context.workspace.id } : { type: 'anonymous', id: context.id}
        // --- PASO 1 y 2: Cargar el estado y "Guardar las Herramientas" ---
        const stateEndpoint = isUserContext ? `/workspaces/${identifier}/state` : `/session-state`;
        const stateHeaders = isUserContext ? {} : { 'X-Session-ID': identifier };
        // const stateResponse = await api.get(stateEndpoint, { headers: stateHeaders });
        const [stateResponse] = await Promise.all([
          api.get(stateEndpoint, { headers: stateHeaders }),
          loadStrategy(contextToLoad)
        ]);

        const { files: newFileIds, auditorias_ejecutadas ,credits, history, available_filters, date_range_bounds, files_metadata } = stateResponse.data || {};
        
        // Actualizamos el estado. `newFileIds` es una variable local, no un estado aún.
        setUploadedFileIds(newFileIds || { ventas: null, inventario: null });
        setCredits(credits || { used: 0, remaining: 20 });
        setCreditHistory(history || []);
        // ... (actualiza aquí otros estados como available_filters, etc.)
        setFileMetadata(files_metadata || { ventas: null, inventario: null }); // <-- Carga la metadata persistente
        setAvailableFilters( available_filters
                ? { categorias: available_filters.categorias, marcas: available_filters.marcas }
                : { categorias: [], marcas: []});          
        setAuditCount(auditorias_ejecutadas || 0); // Guardamos el contador

        if (newFileIds?.ventas && newFileIds?.inventario) {
          setUploaderState('collapsed');
          const statusEndpoint = '/auditoria/status';
          const statusParams = isUserContext ? { workspace_id: identifier } : {};
          const statusResponse = await api.get(statusEndpoint, { params: statusParams, headers: stateHeaders });
          setAuditState(statusResponse.data);
        } else {
          setAuditState({ status: 'idle', data: null });
          setUploaderState('visible');
        }

        const loadedFiles = newFileIds || { ventas: null, inventario: null };
        setUploadedFileIds(loadedFiles);
        setDateRangeBounds(date_range_bounds || null );
        setUploadStatus({
          ventas: loadedFiles.ventas ? 'success' : 'idle',
          inventario: loadedFiles.inventario ? 'success' : 'idle'
        });
        
      } catch (error) {
        console.error("Error al cargar y verificar el contexto:", error);
        setAuditState({ status: 'error', data: null });
      } finally {
        setIsLoading(false);
      }
    };

    loadAndCheckContext();
    // Prevenimos que se ejecute si ya tenemos datos iniciales (flujo anónimo)
    // if (!initialData) {
    //   loadAndCheckContext();
    // } else {
    //   setIsLoading(false); // Si hay datos iniciales, no necesitamos cargar nada más
    // }

  }, [context.id, initialData, context.workspace?.id]);
  // }, [context.id, context.workspace?.id]);

  // --- NUEVO EFECTO PARA MANEJAR EL FLUJO ANÓNIMO ---
  useEffect(() => {
      // Creamos una función async dentro del efecto para poder usar await
      const initializeAnonymousSession = async () => {
          // Se ejecuta solo si tenemos datos iniciales (del backend) y la config de reportes ya cargó
          if (initialData && reportData) {
              
              // 1. Cargar la estrategia por defecto ANTES de hacer cualquier otra cosa.
              // Esto asegura que el contexto `strategy` no será `null`.
              await loadStrategy({ type: 'default' }); 

              // 2. Buscar la configuración del reporte que se ejecutó.
              const reportKey = initialData.report_key;
              const reportConfig = Object.values(reportData).flat().find(r => r.key === reportKey);

              if (reportConfig) {
                  // 3. Establecer el reporte seleccionado para abrir el ReportModal.
                  setInitialResultData(initialData);
                  setSelectedReport(reportConfig);
              } else {
                  console.error(`Error crítico: No se encontró la configuración para el reporte con clave: ${reportKey}`);
                  alert("Hubo un error al intentar mostrar el reporte solicitado.");
              }
          }
      };

      initializeAnonymousSession();
  }, [initialData, reportData, loadStrategy]); // Dependencias del efecto


  // // --- NUEVO EFECTO: PARA MANEJAR EL FLUJO ANÓNIMO INICIAL ---
  // useEffect(() => {
  //   if (initialData && reportData) {
  //     console.log("AnalysisWorkspace detectó initialData. Abriendo ReportModal...");
  //     // 1. Buscar la configuración completa del reporte usando la `report_key`
  //     const reportKey = initialData.report_key;
  //     const reportConfig = Object.values(reportData).flat().find(r => r.key === reportKey);

  //     if (reportConfig) {
  //       // 2. Establecer el reporte seleccionado. Esto es lo que dispara
  //       //    la renderización del ReportModal.
  //       setSelectedReport(reportConfig);
  //     } else {
  //       console.error(`No se encontró la configuración para el reporte con la clave: ${reportKey}`);
  //     }
  //   }
  // }, [initialData, reportData]); // Se ejecuta si initialData o reportData cambian


  // --- NUEVA FUNCIÓN: Actualiza solo créditos e historial ---
  const refreshCreditsAndHistory = useCallback(async (context) => {
    if (!context) return;
    const isUserContext = context.type === 'user' && context.workspace;
    const identifier = isUserContext ? context.workspace.id : context.id;
    if (!identifier) return;

    const formData = new FormData();

    if (context.type === 'user') {
      const token = localStorage.getItem('accessToken');
      formData.append("workspace_id", context.workspace.id);
      formData.append("current_user", token);
    }

    try {
      const endpoint = isUserContext ? `/workspaces/${identifier}/state` : `/session-state`;
      const headers = isUserContext ? {} : { 'X-Session-ID': identifier };
      const response = await api.get(endpoint, { headers: headers, params: formData });
      
      const { credits: loadedCredits, history: loadedHistory } = response.data || {};
      if (loadedCredits) setCredits(loadedCredits);
      if (loadedHistory) setCreditHistory(loadedHistory);
    } catch (error) {
      console.error("No se pudo refrescar el estado de créditos/historial:", error);
    }
  }, []);

  const strategyModalContext = useMemo(() => {
    if (context.type === 'user') {
        return { type: 'workspace', id: context.workspace.id, name: context.workspace.nombre };
    }
    return { type: 'anonymous', id: context.id };
  }, [context.type, context.id, context.workspace?.id, context.workspace?.nombre]);


  useEffect(() => {
    setFilesReady(!!uploadedFileIds.ventas && !!uploadedFileIds.inventario);
  }, [uploadedFileIds]);

  
  // --- RENDERIZADO CONDICIONAL DEL CONTENIDO PRINCIPAL ---
  const renderMainContent = () => {
    if (!filesReady) {
      return (
        <p className="mt-10 text-center max-w-5xl mx-auto text-white p-4 bg-gray-800 rounded-md shadow">
          📂 Sube ambos archivos para activar la Auditoría de Eficiencia.
        </p>
      );
    }

    if (auditState.status === 'loading' || isExecutingAudit) {
      return <LoadingScreen message={isExecutingAudit ? "Generando nueva auditoría..." : "Verificando estado de tus datos..."} />;
    }

    if (auditState.status === 'outdated') {
      return (
        <div className="text-center max-w-5xl mx-auto p-8 bg-gray-800 rounded-lg animate-fade-in">
          <h3 className="text-xl font-bold text-white">Tus archivos de datos han sido actualizados.</h3>
          <p className="text-gray-400 mt-2 mb-6">Genera un nuevo informe para analizar la información más reciente.</p>
          <button onClick={() => handleRunNewAudit(uploadedFileIds)} className="bg-purple-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2 mx-auto">
            <FiRefreshCw /> Generar Nueva Auditoría
          </button>
        </div>
      );
    }

    if (auditState.status === 'up_to_date' && auditState.data) {
      return <AuditDashboard auditResult={auditState.data} onSolveClick={handleSolveClick} />;
    }

    return (
      <button onClick={() => handleRunNewAudit(uploadedFileIds)} className="bg-purple-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2 mx-auto">
        <FiRefreshCw /> Generar Nueva Auditoría
      </button>
    )
  };

  const handleSolveClick = (title, target_report, skus_afectados, context_params) => {

    if (!target_report || !skus_afectados) return;

    // Esta función se llama desde una AuditTaskCard
    const reportConfig = Object.values(reportData).flat().find(r => r.key === target_report);
    // const reportConfig = Object.values(reportData).flat().find(r => r.key === reportKey);
    if (reportConfig) {
      setReportContextInfo({
        title: title,
        skus: skus_afectados || []
      });
      setInitialParams(context_params || {});
      setSelectedReport(reportConfig);
    }
  };

  const handleCloseReportModal = () => {
    setSelectedReport(null);
    setReportContextInfo(null);
    setInitialParams(null); // Limpiamos los parámetros al cerrar
    if (initialResultData) {
        handleRunNewAudit(uploadedFileIds)
        setInitialResultData(null);
    }
    setAnalysisResult(null);
  };

  // Función para limpiar el estado al cambiar de workspace
  const resetWorkspaceState = () => {
    setUploadedFileIds({ ventas: null, inventario: null });
    setUploadStatus({ ventas: 'idle', inventario: 'idle' });
    setDateRangeBounds(null);
    setAnalysisResult(null);
  };

  // --- FUNCIÓN DE CARGA DE ARCHIVOS CONSCIENTE DEL CONTEXTO ---
  const handleFileProcessed = async (file, fileType) => {
    setUploadStatus(prev => ({ ...prev, [fileType]: 'uploading' }));
    
    setUploaderState('visible');

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
      
      // Actualizamos el estado del archivo que se acaba de subir
      const newUploadStatus = { ...uploadStatus, [fileType]: 'success' };
      const newFileIds = { ...uploadedFileIds, [fileType]: response.data.file_id };
      setUploadStatus(newUploadStatus);
      setUploadedFileIds(newFileIds);

      setUploadedFileIds(prev => ({ ...prev, [fileType]: response.data.file_id }));
      setUploadStatus(prev => ({ ...prev, [fileType]: 'success' }));
      setFileMetadata(prev => ({ ...prev, [fileType]: response.data.metadata || {} }));
      // --- LÓGICA CLAVE PARA POBLAR LOS FILTROS ---
      if (fileType === 'inventario' && response.data.available_filters) {
        console.log("Filtros de Categorías y Marcas recibidos:", response.data.available_filters);
        setAvailableFilters({
          categorias: response.data.available_filters.categorias || [],
          marcas: response.data.available_filters.marcas || []
        });
      }

      if (fileType === 'ventas' && response.data.date_range_bounds) {
        setDateRangeBounds(response.data.date_range_bounds || null);
      }

      if (newUploadStatus.ventas === 'success' && newUploadStatus.inventario === 'success') {
        console.log("Ambos archivos están listos. Marcando auditoría como desactualizada.");
        // Forzamos el estado a 'outdated' directamente, sin llamar a la API.
        // Mantenemos los datos de la auditoría anterior para el enlace de "ver última".
        if (auditCount === 0) {
          // Si es la primera vez, ejecutamos la auditoría automáticamente.
          console.log("Primera ejecución detectada: disparando auditoría automática.");
          handleRunNewAudit(newFileIds);
          setAuditCount(prev => prev + 1)
        } else {
          setAuditState(prev => ({
            status: 'outdated',
            data: prev.data 
          }));
        }
      }

    } catch (error) {
      console.error(`Error al subir ${fileType}:`, error);
      alert(error.response?.data?.detail || `Error al subir el archivo.`);
      setUploadStatus(prev => ({ ...prev, [fileType]: 'error' }));
      setFileMetadata(prev => ({ ...prev, [fileType]: null })); // Limpiamos metadata en caso de error
    }
  };

  // ... (Aquí van tus otras funciones: handleGenerateAnalysis, handleReportView, etc.)
  // ¡Asegúrate de que usen el cliente `api` y pasen el `workspace_id` si es necesario!
  const handleAnalysisCompletion = useCallback(() => {
    console.log("Análisis completado. Refrescando créditos e historial...");
    // Llama a la función ligera que solo actualiza lo necesario
    refreshCreditsAndHistory(context);
  }, [context, refreshCreditsAndHistory]);

  const handleInsufficientCredits = (info) => {
    // Esta función la llamará el ReportModal cuando falle por error 402
    setRechargeContext({ type: 'insufficient', ...info });
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
      setActiveModal('upgrade'); // Abrimos el nuevo modal de "upgrade"
      return;
    }
    setSelectedReport(reportItem);
    setActiveModal('reportParams');
    setModalInitialView('parameters'); // Vista por defecto
  };

  const handleInfoClick = (reportItem) => {
    setModalInitialView('info'); // Le decimos al modal que empiece en la vista de info
    setSelectedReport(reportItem);
  };

  const handleUpgradeAction = (action) => {
    // Esta función decide qué hacer cuando el usuario hace clic en el CTA del UpgradeModal
    if (action === 'register') {
      setActiveModal('register')
    } else if (action === 'verify') {
      alert("La verificación para el plan Estratega estará disponible próximamente.");
    }
  };

  const handleLoginFromModal = (token) => {
    // Cerramos el modal y notificamos al componente App que el login fue exitoso
    // console.log('from AnalysisWorkspace > handleLoginFromModal')
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


  const handleApplyDateFilter = (selectedRange) => {
    console.log("Intento de aplicar filtro Pro con el rango:", selectedRange);
    setIsDateModalOpen(false);

    // Aquí va la lógica para mostrar el modal de conversión
    if (context.type === 'user') {
      setActiveModal('becomeStrategist');
    } else {
      setModalInfo({
        title: "Desbloquea el Análisis por Rango de Fechas",
        message: "Esta comparativa de mercado es una herramienta avanzada. Regístrate gratis para desbloquear el acceso a esta y otras funciones."
      });
      setActiveModal('registerToUnlock');
    }
  };

  const handleClearDateFilter = () => {
    setActiveDateFilter(null);
    // Aquí podrías añadir una lógica para re-ejecutar los reportes con el rango completo si fuera necesario
  };

  const handleProFeatureClick = (reportItem) => {
    // Reutilizamos la lógica que ya tenemos para los reportes Pro
    setProReportClicked(reportItem); 
    setActiveModal('becomeStrategist'); // Abre el modal de "upgrade"
  };

  // --- Función para formatear el texto del botón ---
  const getFilterButtonText = () => {
    if (activeDateFilter) {
      const start = new Date(activeDateFilter.startDate).toLocaleDateString('es-PE');
      const end = new Date(activeDateFilter.endDate).toLocaleDateString('es-PE');
      return `Rango: ${start} - ${end}`;
    }
    return "Analizando: Todo el Historial";
  };

  return (
    <div className="min-h-screen w-full mx-auto md:p-8 text-white animate-fade-in">
        <div className="flex gap-4 max-w-5xl mx-auto justify-center mt-4">
          {/*<h1 className="text-3xl md:text-5xl font-bold text-white">
              <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(to right, #560bad, #7209b7, #b5179e)' }}>Ferretero.IA</span>
          </h1>*/}
          <img src="/ferreteros-app-standalone.png" className="max-h-8 opacity-90"/>
          {/* Botón de Login solo para usuarios anónimos */}
          {context.type === 'anonymous'
            ? <button onClick={() => setActiveModal('login')} className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-purple-600 text-white hover:bg-purple-700 rounded-lg transition-colors"><FiLogIn /> Iniciar Sesión</button>
            : <button onClick={onLogout} className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-gray-600 text-white hover:bg-gray-700 rounded-lg transition-colors"><FiLogOut /> Cerrar Sesión</button>
          }
        </div>
        {context.type === 'anonymous' &&
          <p className="text-xs mt-3 text-white flex justify-center text-center items-center font-mono gap-4">
            <span>Modo: Sesión Anónima <br/> {context.id}</span>
          </p>
        }
      <div className="w-full justify-center border-b border-gray-700 items-center bg-neutral-900 z-20 gap-3 py-3 px-4 sticky top-0">
        <div className="flex flex-col max-w-5xl mx-auto">
           <CreditsPanel 
              used={credits.used} 
              remaining={credits.remaining}
              onHistoryClick={() => setActiveModal('history')}
           />
           <div className="mx-auto mt-3">
            {context.type === 'user' && (
              <WorkspaceSelector
                workspaces={workspaces}
                activeWorkspace={activeWorkspace}
                onWorkspaceChange={setActiveWorkspace} // Permite cambiar el espacio activo
                onCreateNew={() => setIsCreateModalOpen(true)}
                onBackToDashboard={ onBackToDashboard }
              />
            )}
          </div>
        </div>
      </div>

      <main className="flex-col items-center overflow-y-auto pb-4 w-full">

        <div className="flex flex-row w-full justify-center items-center gap-2">
          <button onClick={() => setActiveModal('strategy')} className="flex items-center gap-2 my-4 px-4 py-2 text-sm font-bold bg-gray-700 text-white hover:bg-purple-700 rounded-lg transition-colors"><FiSettings /> Mi Estrategia</button>
        </div>

        <div className="w-full px-4">
          <div className="bg-gray-800 mx-auto self-center max-w-5xl bg-opacity-50 rounded-lg border border-gray-700 mb-8 transition-all duration-300 ease-in-out">
            <div 
              className="p-3 py-4 flex justify-between cursor-pointer"
              onClick={() => { uploaderState === 'collapsed' ? setUploaderState('visible') : setUploaderState('collapsed') }}
            >
              <div className="flex items-center gap-4 text-sm">
                <span className={`font-bold transition-colors ${filesReady ? 'text-green-400' : 'text-gray-400'}`}>
                  {filesReady ? '✓ Archivos Cargados' : '1. Prepara tu Análisis'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-purple-400 hover:text-white">
                <span>{uploaderState === 'collapsed' ? 'Mostrar' : 'Ocultar'}</span>
                {uploaderState === 'collapsed' ? <FiChevronDown /> : <FiChevronUp />}
              </div>
            </div>

            {/* --- Contenido Plegable (El Acordeón) --- */}
            <div 
              className={`transition-all duration-500 ease-in-out overflow-hidden ${uploaderState === 'collapsed' ? 'max-h-0' : 'max-h-[40rem]'}`}
            >
              <div className="p-4 border-t border-gray-700">
                <div className="grid gap-4 md:grid-cols-2">
                  <CsvImporterComponent 
                    fileType="ventas"
                    title="Historial de Ventas"
                    template={templateVentas}
                    onFileProcessed={handleFileProcessed}
                    uploadStatus={uploadStatus.ventas}
                    metadata={fileMetadata.ventas}
                  />
                  <CsvImporterComponent 
                    fileType="inventario"
                    title="Stock Actual"
                    template={templateStock}
                    onFileProcessed={handleFileProcessed}
                    uploadStatus={uploadStatus.inventario}
                    metadata={fileMetadata.inventario}
                  />
                </div>
                <div className="flex justify-center items-center gap-4 mt-4 pt-4 border-t border-gray-700">
                  <button onClick={() => setActiveModal('connections')} className="flex items-center gap-2 text-sm font-bold bg-gray-700 text-white hover:bg-purple-700 rounded-lg transition-colors px-4 py-2">
                      <FiKey /> Conectar Sistema
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/*<button onClick={() => handleRunNewAudit(uploadedFileIds)} className="bg-purple-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2 mx-auto">
          <FiRefreshCw /> Generar Nueva Auditoría
        </button>*/}

        {renderMainContent()}

        {filesReady && (
          <div className="text-center max-w-5xl mx-auto px-4">
            <h2 className="text-2xl font-bold text-white mt-8 mb-2">
              Profundiza en tus Datos
              <Tooltip text={tooltips['reports_header_tooltip']} />
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">Cada reporte es una herramienta especializada. Úsalas para responder a preguntas clave sobre rentabilidad, compras, estrategia y más.</p>
          </div>
        )}
        <div id="tools-section" className="max-w-5xl mx-auto px-4 space-y-8 px-4 mb-6">
          {filesReady && Object.entries(reportData).map(([categoria, reportes]) => (
              <div key={categoria} className="mb-6">
                <h3 className="text-white text-xl font-semibold mb-4 border-b border-purple-400 pb-2 mt-6">
                  {categoria}
                </h3>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {reportes.map((reportItem, index) => (
                    <AnimateOnScroll key={reportItem.key} delay={index * 100}>
                      <ReportButton
                        // key={reportItem.key}
                        reportItem={reportItem}
                        context={context} // <-- Pasa el contexto del usuario
                        onExecute={handleReportView}
                        onInfoClick={handleInfoClick}
                        onProFeatureClick={handleProFeatureClick} // <-- Pasa la nueva función
                      />
                    </AnimateOnScroll>
                  ))}
                </div>
              </div>
            ))}
        </div>
        <FerreterosLogo/>
      </main>

      {/* --- RENDERIZADO DEL MODAL DE REPORTE --- */}
      {/* Se renderiza solo si hay un reporte seleccionado */}
      {selectedReport && (
        <ReportModal 
          reportConfig={selectedReport}
          initialResult={initialResultData}
          creditsInfo={credits}
          initialParams={initialParams} // <-- Pasamos la nueva prop
          context={{...context, fileIds: uploadedFileIds}} // Pasamos toda la info necesaria
          initialView={modalInitialView} // <-- Pasamos la vista inicial
          availableFilters={availableFilters}
          contextInfo={reportContextInfo} // <-- Pasamos la nueva prop
          initialSkuFilter={initialSkuFilter} // <-- Pasamos la nueva prop
          onClose={handleCloseReportModal}
          onInsufficientCredits={handleInsufficientCredits} // <-- Pasamos la nueva función
          onAnalysisComplete={handleAnalysisCompletion}
          onLoginSuccess={handleLoginFromModal}
        />
      )}
      
      {isStrategyPanelOpen && (
        <StrategyPanelModal 
          context={{ type: 'workspace', id: context.workspace.id, name: context.workspace.nombre }}
          onClose={() => setStrategyPanelOpen(false)}
        />
      )}

      {activeModal === 'history' && (
        <CreditHistoryModal
          history={creditHistory}
          reportData={reportData}
          context={context}
          onRegisterClick={() => {
            setActiveModal('register')
          }}
          onRechargeClick={() => {
            setActiveModal(null); // Cerramos el historial
            setRechargeContext({ type: 'proactive' }); // Abrimos el de recarga
          }}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'proOffer' && proReportClicked && (
        <ProOfferModal
          reportName={proReportClicked.label}
          onClose={() => setActiveModal(null)}
          onRegister={() => setActiveModal('register')}
        />
      )}

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

      {activeModal === 'connections' && (
        <ConnectionsModal 
          context={context}
          onClose={() => setActiveModal(null)}
          onUpgrade={() => setActiveModal('becomeStrategist')}
        />
      )}

      {/* --- RENDERIZADO DEL NUEVO MODAL --- */}
      {activeModal === 'strategy' && (
        <StrategyPanelModal 
          context={strategyModalContext} 
          onClose={() => setActiveModal(null)} 
        />
      )}

      {isCreateModalOpen && (
        <CreateWorkspaceModal 
            onClose={() => setIsCreateModalOpen(false)}
            onSuccess={handleCreationSuccessAndSwitch} // Le pasamos la función de éxito específica
        />
      )}


      {/* Renderizado del nuevo UpgradeModal */}
      {activeModal === 'upgrade' && proReportClicked && (
        <UpgradeModal
          context={context}
          reportItem={proReportClicked}
          onClose={() => setActiveModal(null)}
          onAction={handleUpgradeAction}
          onBecomeStrategist={() => setActiveModal('becomeStrategist')}
        />
      )}

      {/* --- RENDERIZADO DEL NUEVO MODAL --- */}
      {isDateModalOpen && dateRangeBounds && (
        <DateRangePickerModal
          minDate={new Date(dateRangeBounds.min_date)}
          maxDate={new Date(dateRangeBounds.max_date)}
          onClose={() => setIsDateModalOpen(false)}
          onApply={handleApplyDateFilter}
        />
      )}

      {activeModal === 'becomeStrategist' && <BecomeStrategistModal onClose={() => setActiveModal(null)} />}
      {/* --- RENDERIZADO CENTRALIZADO DE TODOS LOS MODALES --- */}
      {activeModal === 'registerToUnlock' && (
        <RegisterToUnlockModal 
          {...modalInfo}
          onRegister={() => {
              setActiveModal(null);
              setActiveModal('register');
          }}
          onClose={() => setActiveModal(null)}
        />
      )}

      {rechargeContext && (
        <RechargeCreditsModal
          contexto={rechargeContext}
          onClose={() => setRechargeContext(null)}
          onBecomeStrategist={() => {
            setRechargeContext(null);
            setActiveModal('becomeStrategist');
          }}
        />
      )}

      <ErrorModal
        isOpen={isErrorModalOpen}
        onClose={() => setIsErrorModalOpen(false)}
        onRetry={handleRetryAudit}
        errorContext={errorContextData}
      />
    </div>
  );
}
