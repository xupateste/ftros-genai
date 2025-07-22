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

// Importa todos los componentes visuales y de iconos que este workspace necesita
import { ReportModal } from './ReportModal'; 
import CsvImporterComponent from '../assets/CsvImporterComponent';
import { CreditsPanel } from './CreditsPanel';
import { CreditHistoryModal } from './CreditHistoryModal';
import { ProOfferModal } from './ProOfferModal';
import { InsufficientCreditsModal } from './InsufficientCreditsModal';
import { StrategyPanelModal } from './StrategyPanelModal';
import { RegisterPage } from './RegisterPage';
import { WorkspaceSelector } from './WorkspaceSelector';
import { LoadingScreen } from './LoadingScreen';
import { FiDownload, FiCalendar, FiStar, FiLogIn, FiRefreshCw, FiLogOut, FiLock, FiLoader, FiSettings,  FiUser, FiMail, FiKey, FiUserPlus } from 'react-icons/fi';
import { CreateWorkspaceModal } from './CreateWorkspaceModal'; // Importa el modal
import { Tooltip } from './Tooltip';
import { FerreterosLogo } from './FerreterosLogo'
import { UpgradeModal } from './UpgradeModal'; // <-- Importamos el nuevo modal
import { DateRangePickerModal } from './DateRangePickerModal'; // <-- Importamos el nuevo modal
import { RechargeCreditsModal } from './RechargeCreditsModal';
import { BecomeStrategistModal } from './BecomeStrategistModal';
import { ReportButton } from './ReportButton'; // <-- Importamos el nuevo botón
import { ReportInfoModal } from './ReportInfoModal'; // <-- Importamos el nuevo modal

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
import {LoginModal} from './LoginModal'; // Asumimos que LoginModal vive en su propio archivo
import {RegisterModal} from './RegisterModal'; // Asumimos que RegisterModal vive en su propio archivo
import { RegisterToUnlockModal } from './RegisterToUnlockModal';

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
  const [analysisResult, setAnalysisResult] = useState(null);
  const [dateRangeBounds, setDateRangeBounds] = useState(null); // Nuevo estado para los límites de fecha
  const [isDateModalOpen, setIsDateModalOpen] = useState(false); // Nuevo estado para controlar el modal
  const [activeDateFilter, setActiveDateFilter] = useState(null);


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
  const [infoModalReport, setInfoModalReport] = useState(null); // Nuevo estado para el modal de info

  const [isStrategyPanelOpen, setStrategyPanelOpen] = useState(false);
  const [modalInfo, setModalInfo] = useState({ title: '', message: '' });
  const [fileMetadata, setFileMetadata] = useState({ ventas: null, inventario: null });

  // --- ESTADOS SIMPLIFICADOS ---
  // El estado del modal de reporte ahora es mucho más simple
  const [selectedReport, setSelectedReport] = useState(null); 

  const [count, setCount] = useState(0)

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
        const contextToLoad = isUserContext ? { type: 'workspace', id: context.workspace.id } : { type: 'anonymous', id: context.id}
        // Hacemos las llamadas en paralelo
        const [stateResponse] = await Promise.all([
          api.get(isUserContext ? `/workspaces/${identifier}/state` : `/session-state`, {
            headers: isUserContext ? {} : { 'X-Session-ID': identifier }
          }),
          loadStrategy(contextToLoad)
        ]);
        const { credits, history, files, available_filters, date_range_bounds, files_metadata } = stateResponse.data || {};
        setCredits(credits || { used: 0, remaining: 20 });
        setCreditHistory(history || []);
        setUploadedFileIds(files || { ventas: null, inventario: null });
        setFileMetadata(files_metadata || { ventas: null, inventario: null }); // <-- Carga la metadata persistente
        setAvailableFilters( available_filters
                ? { categorias: available_filters.categorias, marcas: available_filters.marcas }
                : { categorias: [], marcas: []});          
        
        const loadedFiles = files || { ventas: null, inventario: null };
        setUploadedFileIds(loadedFiles);
        setDateRangeBounds(date_range_bounds || null );
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

  // Función para limpiar el estado al cambiar de workspace
  const resetWorkspaceState = () => {
    setUploadedFileIds({ ventas: null, inventario: null });
    setUploadStatus({ ventas: 'idle', inventario: 'idle' });
    setDateRangeBounds(null);
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
  };

  const handleGoToRegister = () => {
      // Cerramos cualquier modal que esté abierto y cambiamos a la vista de registro
      setActiveModal(null); 
      // setAppState('registering');
  };

  const handleUpgradeAction = (action) => {
    // Esta función decide qué hacer cuando el usuario hace clic en el CTA del UpgradeModal
    // setActiveModal(null); // Cerramos el modal de upgrade
    if (action === 'register') {
      onSwitchToRegister(); // Llamamos a la función del padre para abrir el modal de registro
    } else if (action === 'verify') {
      alert("La verificación para el plan Estratega estará disponible próximamente.");
    }
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
    <div className="min-h-screen w-full max-w-5xl mx-auto md:p-8 text-white animate-fade-in">
        <div className="flex gap-4 justify-center mt-4">
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
          <p className="text-xs mt-3 text-white flex justify-center text-center items-center font-mono gap-4">
            <span>Modo: Sesión Anónima <br/> {context.id}</span>
          </p>
        }
      <div className="flex flex-col w-full justify-center border-b border-gray-700 items-center bg-neutral-900 z-20 gap-3 py-3 px-4 sticky top-0">
         <CreditsPanel 
            used={credits.used} 
            remaining={credits.remaining}
            onHistoryClick={() => setActiveModal('history')}
         />
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

      <main className="flex-1 overflow-y-auto pb-4 w-full">
        <div className='w-full max-w-5xl grid text-white md:grid-cols-2 px-2 mx-auto'>
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
        <div className="flex flex-row w-full justify-center items-center">
          <button onClick={() => setActiveModal('strategy')} className="flex items-center gap-2 mt-4 px-4 py-2 text-sm font-bold bg-gray-700 text-white hover:bg-purple-700 rounded-lg transition-colors"><FiSettings /> Mi Estrategia</button>
        </div>

        {/* --- RENDERIZADO CONDICIONAL DEL FILTRO DE FECHAS --- */}
        {/* Solo se muestra si se ha subido un archivo de ventas */}
        {/*{dateRangeBounds && (
          <DateRangeFilter 
            minDate={new Date(dateRangeBounds.min_date)}
            maxDate={new Date(dateRangeBounds.max_date)}
            onApply={handleApplyDateFilter}
          />
        )}*/}

        {/* El resto de tu JSX para la lista de reportes */}
        {isConfigLoading ? (
          <p>Cargando reportes...</p>
        ) : filesReady ? (
          <>
            {/* --- RENDERIZADO DEL NUEVO FILTRO INTERACTIVO --- */}
            {uploadStatus.ventas === 'success' && dateRangeBounds && (
              <div className="my-2 flex justify-center items-center gap-2">
                <button 
                  onClick={() => setIsDateModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-gray-700 text-white rounded-lg shadow-md hover:bg-purple-700 transition-colors"
                >
                  <FiCalendar />
                  <span>{getFilterButtonText()}</span>
                  <FiStar className="text-yellow-400" />
                </button>
                {/* Mostramos el botón de limpiar solo si hay un filtro activo */}
                {activeDateFilter && (
                  <button onClick={handleClearDateFilter} className="p-2 bg-red-500 text-white rounded-full hover:bg-red-400">
                    <FiX size={16} />
                  </button>
                )}
              </div>
            )}

            <div className="w-full space-y-8 px-4 mb-10">
              {Object.entries(reportData).map(([categoria, reportes]) => (
                <div key={categoria} className="mb-6">
                  <h3 className="text-white text-xl font-semibold mb-4 border-b border-purple-400 pb-2 mt-6">
                    {categoria}
                  </h3>
                  <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {reportes.map((reportItem) => (
                      <ReportButton
                        key={reportItem.key}
                        reportItem={reportItem}
                        context={context} // <-- Pasa el contexto del usuario
                        onExecute={handleReportView}
                        onInfoClick={setInfoModalReport}
                        onProFeatureClick={handleProFeatureClick} // <-- Pasa la nueva función
                      />
                      // <button
                      //   key={reportItem.label}
                      //   onClick={() => handleReportView(reportItem)}
                      //   className={`relative w-full text-left p-4 rounded-lg shadow-md transition-all duration-200 ease-in-out transform hover:scale-105 group
                      //     ${reportItem.isPro 
                      //       ? 'bg-gray-700 text-gray-400 hover:bg-gray-600 border border-purple-800' // Estilo Pro
                      //       : 'bg-white bg-opacity-90 text-black hover:bg-purple-100' // Estilo Básico
                      //     }`
                      //   }
                      // >
                      //   <div className="flex items-center justify-between">
                      //     <span className="font-semibold text-sm">{reportItem.label}</span>
                      //     {reportItem.isPro && <FiStar className="text-yellow-500" />}
                      //   </div>
                      //   {reportItem.isPro && (
                      //     <p className="text-xs text-purple-400 mt-1">Función Avanzada</p>
                      //   )}
                      // </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="mt-10 text-center text-white p-4 bg-gray-800 rounded-md shadow">
            📂 Carga tus archivos y activa la inteligencia comercial de tu ferretería.
          </p>
        )}
        <FerreterosLogo/>
      </main>

      {/* --- RENDERIZADO DEL NUEVO MODAL DE INFORMACIÓN --- */}
      {infoModalReport && (
        <ReportInfoModal 
          reportItem={infoModalReport} 
          onClose={() => setInfoModalReport(null)} 
        />
      )}

      {/* --- RENDERIZADO DEL MODAL DE REPORTE --- */}
      {/* Se renderiza solo si hay un reporte seleccionado */}
      {selectedReport && (
        <ReportModal 
          reportConfig={selectedReport}
          context={{...context, fileIds: uploadedFileIds}} // Pasamos toda la info necesaria
          availableFilters={availableFilters}
          onClose={() => setSelectedReport(null)} // Al cerrar, simplemente limpiamos la selección
          onAnalysisComplete={handleAnalysisCompletion}
          // onStateUpdate={setCount} // Pasamos la función para que el modal pueda pedir un refresco
        />
      )}
      
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
              // onSwitchToRegister(); // Llama a la función del padre para mostrar el modal de registro real
          }}
          onClose={() => setActiveModal(null)}
        />
      )}
    </div>
  );
}
