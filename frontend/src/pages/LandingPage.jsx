import { useState, useEffect, useCallback } from 'react'; // useCallback añadido
import { useNavigate, Link } from 'react-router-dom';
import '../index.css';
import { FiDownload } from 'react-icons/fi'

import axios from 'axios';
import Select from 'react-select';
import CsvDropZone from '../assets/CsvDropZone';
import CsvDropZone2 from '../assets/CsvDropZone2';


const API_URL = import.meta.env.VITE_API_URL;

// (diccionarioData y reportData permanecen igual que en tu última versión)
const diccionarioData = {
  'Análisis ABC de Productos ✓': `done`,
  'Análisis Rotación de Productos ✓': `done`,
  'Diagnóstico de Stock Muerto ✓': `done`,
  'Puntos de Alerta de Stock ✓' : 'done',
  'Lista básica de reposición según histórico ✓' : 'dancer2'
};
const reportData = {
  "🧠 Diagnósticos generales": [
    {
      label: 'Análisis ABC de Productos ✓',
      endpoint: '/abc',
      insights: [],
      parameters: [
        { name: 'periodo_abc', label: 'Período de Análisis ABC', type: 'select',
          options: [
            { value: '12', label: 'Últimos 12 meses' },
            { value: '6', label: 'Últimos 6 meses' },
            { value: '3', label: 'Últimos 3 meses' },
            { value: '0', label: 'Todo' }
          ]
        },
        { name: 'criterio_abc', label: 'Criterio Principal ABC', type: 'select',
          options: [
            { value: 'combinado', label: 'Combinado o Ponderado' },
            { value: 'ingresos', label: 'Por Ingresos' },
            { value: 'unidades', label: 'Por Cantidad Vendida' },
            { value: 'margen', label: 'Por Margen' }
          ]
        }
      ]
    },
    { label: 'Diagnóstico de Stock Muerto ✓', endpoint: '/diagnostico-stock-muerto', insights: [],
      parameters: []
    },
    {
      label: 'Análisis Rotación de Productos ✓',
      endpoint: '/rotacion-general',
      insights: [],
      parameters: []
    },
  ],
  "📦 Reposición Inteligente y Sugerencias de Pedido": [
    { label: 'Puntos de Alerta de Stock ✓',
      endpoint: '/reporte-puntos-alerta-stock',
      insights: [],
      parameters: [
        { name: 'lead_time_dias', label: 'El tiempo promedio de entrega del proveedor en días', type: 'select',
          options: [
            { value: '5', label: '5 días' },
            { value: '7', label: '7 días' },
            { value: '10', label: '10 días' },
            { value: '12', label: '12 días' },
            { value: '15', label: '15 días' }
          ]
        },
        { name: 'dias_seguridad_base', label: 'Días adicionales de cobertura para stock de seguridad', type: 'select',
          options: [
            { value: '0', label: 'Ninguno' },
            { value: '1', label: '1 día adicional' },
            { value: '2', label: '2 días adicionales' },
            { value: '3', label: '3 días adicionales' }
          ]
        }
      ]
    },
    {
      label: 'Lista básica de reposición según histórico ✓',
      endpoint: '/lista-basica-reposicion-historico',
      insights: [],
      // --- ESTA ES LA SECCIÓN MODIFICADA ---
      parameters: [
        {
          name: 'ordenar_por',
          label: 'Ordenar reporte por:',
          type: 'select', // Un desplegable estándar
          options: [
            { value: 'Importancia', label: 'Índice de Importancia (Recomendado)' },
            { value: 'Índice de Urgencia', label: 'Índice de Urgencia (Stock bajo + Importancia)' },
            { value: 'Inversion Requerida', label: 'Mayor Inversión Requerida' },
            { value: 'Cantidad a Comprar', label: 'Mayor Cantidad a Comprar' },
            { value: 'Margen Potencial', label: 'Mayor Margen Potencial de Ganancia' },
            { value: 'Próximos a Agotarse', label: 'Próximos a Agotarse (Cobertura)' },
            { value: 'rotacion', label: 'Mayor Rotación' },
            { value: 'Categoría', label: 'Categoría (A-Z)' }
          ]
        },
        {
          name: 'excluir_sin_ventas',
          label: '¿Excluir productos con CERO ventas?',
          type: 'boolean_select', // Un nuevo tipo para manejar booleanos con un select
          options: [
            { value: 'true', label: 'Sí, excluir (Recomendado)' },
            { value: 'false', label: 'No, incluirlos' }
          ]
        },
        {
          name: 'incluir_solo_categorias',
          label: 'Filtrar por Categorías (opcional)',
          type: 'multi-select',
          optionsKey: 'categorias'
        },
        {
          name: 'incluir_solo_marcas',
          label: 'Filtrar por Marcas (opcional)',
          type: 'multi-select',
          optionsKey: 'marcas'
        }
      ]
    },
    { label: 'Lista sugerida para alcanzar monto mínimo', endpoint: '/rotacion', insights: [], parameters: [] },
    { label: 'Pedido optimizado por marcas o líneas específicas', endpoint: '/rotacion', insights: [], parameters: [] },
    { label: 'Reposición inteligente por categoría', endpoint: '/rotacion', insights: [], parameters: [] },
    { label: 'Sugerencia combinada por zona', endpoint: '/rotacion', insights: [], parameters: [] },
  ],
  "📊 Simulación y ROI de Compra": [
    { label: 'Simulación de ahorro en compra grupal', endpoint: '/sobrestock', insights: [], parameters: [] },
    { label: 'Comparativa de precios actuales vs históricos', endpoint: '/sobrestock', insights: [], parameters: [] },
    { label: 'Estimación de margen bruto por sugerencia', endpoint: '/sobrestock', insights: [], parameters: [] },
    { label: 'Rentabilidad mensual por línea o proveedor', endpoint: '/sobrestock', insights: [], parameters: [] },
  ],
  "🔄 Gestión de Inventario y Mermas": [
    { label: 'Revisión de productos a punto de vencer o sin rotar', endpoint: '/stock-critico', insights: [], parameters: [] },
    { label: 'Listado de productos con alta rotación que necesitan reposición', endpoint: '/sobrestock', insights: [], parameters: [] },
    { label: 'Sugerencia de promociones para liquidar productos lentos', endpoint: '/rotacion', insights: [], parameters: [] },
  ]
};


function LandingPage() {
  const [ventasFile, setVentasFile] = useState(null);
  const [inventarioFile, setInventarioFile] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [filesReady, setFilesReady] = useState(false);
  const [insightHtml, setInsightHtml] = useState('');
  const [parameterValues, setParameterValues] = useState({});


  // --- MODIFICACIÓN 1: Estado para el caché de la respuesta ---
  const [cachedResponse, setCachedResponse] = useState({ key: null, blob: null });
  const [isLoading, setIsLoading] = useState(false); // Para feedback visual

  const [availableFilters, setAvailableFilters] = useState({ categorias: [], marcas: [] });
  const [isLoadingFilters, setIsLoadingFilters] = useState(false);

  const handleVentasInput = (file) => setVentasFile(file);
  const handleInventarioInput = (file) => setInventarioFile(file);

  const getParameterLabelsForFilename = () => {
    if (!selectedReport?.parameters || selectedReport.parameters.length === 0) return "";

    return selectedReport.parameters.map(param => {
      const selectedValue = parameterValues[param.name];
      if (!selectedValue) return null;

      return `${param.name}-${selectedValue}`; // técnico y rastreable
    }).filter(Boolean).join('_');
  };

  const handleReportView = (reportItem) => {
    setSelectedReport(reportItem);
    setInsightHtml(diccionarioData[reportItem.label] || "<p>No hay información disponible.</p>");
    const initialParams = {};
    if (reportItem.parameters && reportItem.parameters.length > 0) {
      reportItem.parameters.forEach(param => {
        // Inicializa los valores por defecto
        if (param.type === 'select' || param.type === 'boolean_select') {
          initialParams[param.name] = param.options[0].value;
        } else if (param.type === 'multi-select') {
          initialParams[param.name] = []; // El valor inicial para un multi-select es un array vacío
        } else {
          initialParams[param.name] = '';
        }
      });
    }
    setParameterValues(initialParams);
    setShowModal(true);
  };

  const getNow = useCallback(() => { // useCallback si no depende de props/estado o si sus deps son estables
    return new Date().toLocaleDateString('en-CA');
  }, []);

  // --- MODIFICACIÓN 4: Función auxiliar para disparar la descarga ---
  const triggerDownload = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    setIsLoading(false); // Termina la carga después de iniciar la descarga
  };


  // --- MODIFICACIÓN 2: buttonDownloadHandleMulti para usar y actualizar caché ---
  const buttonDownloadHandleMulti = async () => {
    if (!selectedReport || !ventasFile || !inventarioFile) {
      alert("Asegúrate de seleccionar un reporte y cargar ambos archivos CSV.");
      return;
    }
    setIsLoading(true);

    const parameterLabels = getParameterLabelsForFilename();
    const baseLabel = selectedReport.label.replace(/ ✓/g, '').trim();
    const suffix = parameterLabels ? `_${parameterLabels}` : '';
    const filename = `${baseLabel}_${getNow()}${suffix}.xlsx`;

    const currentCacheKey = `${selectedReport.endpoint}-${JSON.stringify(parameterValues)}`;

    if (cachedResponse.key === currentCacheKey && cachedResponse.blob) {
      console.log("Usando respuesta de caché para:", currentCacheKey);
      triggerDownload(cachedResponse.blob, `${baseLabel}_${getNow()}${suffix}_cached.xlsx`);
       triggerDownload(cachedResponse.blob, `${selectedReport.label.replace(/ ✓/g, '')}_${getNow()}_cached.xlsx`);
      return;
    }

    console.log("Solicitando al servidor para:", currentCacheKey);
    const formData = new FormData();
    formData.append("ventas", ventasFile);
    formData.append("inventario", inventarioFile);

    if (selectedReport.parameters && selectedReport.parameters.length > 0) {
      selectedReport.parameters.forEach(param => {
        const value = parameterValues[param.name];
        if (value !== undefined && value !== null) {
          // --- 3. ADAPTAR EL ENVÍO DE DATOS ---
          // Si el valor es un array (de nuestro multi-select), lo convertimos a un string separado por comas
          if (Array.isArray(value)) {
            formData.append(param.name, value.join(','));
          } else {
            formData.append(param.name, value);
          }
        }
      });
    }

    try {
      const response = await axios.post(`${API_URL}${selectedReport.endpoint}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        responseType: 'blob',
      });

      const newBlob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      setCachedResponse({ key: currentCacheKey, blob: newBlob }); // Guardar en caché
      triggerDownload(newBlob, filename);
      // triggerDownload(newBlob, `${selectedReport.label.replace(/ ✓/g, '')}_${getNow()}.xlsx`);

    } catch (err) {
      alert("Error al subir los archivos y generar el reporte: " + (err.response?.data?.detail || err.message));
      setIsLoading(false);
    }
  };

  // --- MODIFICACIÓN 3: Invalidar caché al cerrar modal ---
  // (usando useCallback para handleEsc si se añade como dependencia)
  const handleEsc = useCallback((event) => {
    if (event.key === "Escape") {
      setShowModal(false);
      // La limpieza del caché se centraliza en el useEffect de showModal
    }
  }, []); // No depende de nada que cambie

  useEffect(() => {
    if (inventarioFile instanceof File) {
      const fetchFilters = async () => {
        setIsLoadingFilters(true);
        const formData = new FormData();
        formData.append("inventario", inventarioFile);
        try {
          const response = await axios.post(`${API_URL}/extract-metadata`, formData, {
            // headers: { "Content-Type": "multipart/form-data" },
            responseType: 'json',
          });
          setAvailableFilters({
            categorias: response.data.categorias_disponibles || [],
            marcas: response.data.marcas_disponibles || []
          });
        } catch (error) {
          console.error("Error al extraer los filtros:", error);
          alert("No se pudieron cargar los filtros desde el archivo de inventario.");
        } finally {
          setIsLoadingFilters(false);
        }
      };
      fetchFilters();
    }
  }, [inventarioFile]);

  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = 'hidden';
      window.addEventListener("keydown", handleEsc);
    } else {
      document.body.style.overflow = 'auto';
      console.log("Modal cerrado, limpiando caché de respuesta.");
      setCachedResponse({ key: null, blob: null }); // Limpiar caché aquí
      setIsLoading(false); // Resetear estado de carga
    }
    return () => {
      window.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = 'auto';
    };
  }, [showModal, handleEsc]); // handleEsc es ahora una dependencia estable

  useEffect(() => {
    setFilesReady(ventasFile instanceof File && inventarioFile instanceof File);
  }, [ventasFile, inventarioFile]);

  // Efecto para limpiar caché si los parámetros cambian MIENTRAS el modal está abierto
  useEffect(() => {
    if (showModal && selectedReport) { // Solo si el modal está visible y hay un reporte
      const currentCacheKey = `${selectedReport.endpoint}-${JSON.stringify(parameterValues)}`;
      if (cachedResponse.key && cachedResponse.key !== currentCacheKey) {
        console.log("Parámetros cambiados, limpiando caché anterior:", cachedResponse.key);
        setCachedResponse({ key: null, blob: null });
      }
    }
  }, [parameterValues, showModal, selectedReport, cachedResponse.key]);


  return (
    <>
      <div className={`min-h-screen bg-gradient-to-b from-neutral-900 via-background to-gray-900
        flex flex-col items-center justify-center text-center px-4 sm:px-8 md:px-12 lg:px-20
        ${showModal ? 'overflow-hidden h-screen' : ''}`}>
        <div className='w-full max-w-4xl'>
          <h1 className="text-4xl font-semibold text-white mt-6">
            Bienvenido a <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(to right, #560bad, #7209b7, #b5179e)' }}
            >
              Ferretero.IA
            </span>
          </h1>
          <p className="mt-4 text-lg text-gray-100">
            Tus números tienen algo que decirte.
          </p>
        </div>
        <div className='mt-10 w-full max-w-2xl grid text-white md:grid-cols-2 gap-6 px-2'>
          <div>
            <div className="max-h-[300px] overflow-auto bg-gray-800 p-1 rounded-lg">
              <CsvDropZone onFile={handleVentasInput} />
            </div>
            {ventasFile && (
              <div className="text-xs cursor-pointer text-gray-600 hover:text-white" onClick={() => triggerDownload(ventasFile, "historial de ventas.csv")} >
                <div className="flex items-center text-center justify-center gap-1">
                  <FiDownload className="" /> Descargar CSV procesado
                </div>
              </div>
            )}
          </div>
          <div>
            <div className="max-h-[300px] overflow-auto bg-gray-800 p-1 rounded-lg">
              <CsvDropZone2 onFile={handleInventarioInput} />
            </div>
            {inventarioFile && (
              <div className="text-xs cursor-pointer text-gray-600 hover:text-white" onClick={() => triggerDownload(inventarioFile, "stock actual.csv")} >
                <div className="flex items-center text-center justify-center gap-1">
                  <FiDownload className="" /> Descargar CSV procesado
                </div>
              </div>
            )}
          </div>
        </div>
        {filesReady ? (
          <div className="w-full max-w-4xl space-y-8 px-4 mb-4 mt-10">
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
                      className="hover:ring-2 focus:ring-purple-800 bg-white bg-opacity-80 shadow-xl text-black text-sm font-medium rounded-lg px-4 py-3 hover:bg-purple-200 hover:text-purple-800 transition duration-200 ease-in-out transform hover:scale-105"
                    >
                      {reportItem.label}
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
        <a href="https://web.ferreteros.app" target="_blank" className="max-w-sm max-w-[200px] mt-4 mb-10 opacity-15 hover:opacity-25 text-white text-sm">Ferretero.IA<br/><img src="ferreteros-app-white.png"/></a>
      </div>

      {showModal && selectedReport && (
        <div className="w-full h-full fixed z-50 inset-0 flex items-end justify-center mb-10 overflow-y-auto">
          <div className="w-full h-full bg-white absolute top-0 flex flex-col">
            <div className="p-4 border-b bg-white z-10 shadow text-center sticky top-0">
              <h2 className="text-xl font-bold text-gray-800 ">
                {selectedReport.label}
              </h2>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-6">
              {selectedReport.parameters && selectedReport.parameters.length > 0 && (
                <div className="mb-6 p-4 border border-2 rounded-md shadow-md bg-gray-100">
                  <h3 className="text-lg font-semibold text-gray-700 mb-3">Parámetros del Reporte</h3>
                  <div className="grid sm:grid-cols-1 md:grid-cols-2 gap-2">                    
                    {selectedReport.parameters.map((param) => {
                      // Caso 1: Para desplegables (select y nuestro nuevo boolean_select)
                      if (param.type === 'select' || param.type === 'boolean_select') {
                        return (
                          <div key={param.name} className="mb-4">
                            <label htmlFor={param.name} className="block text-sm font-medium text-gray-600 mb-1">
                              {param.label}:
                            </label>
                            <select
                              id={param.name}
                              name={param.name}
                              value={parameterValues[param.name] || ''}
                              onChange={(e) => {
                                setParameterValues(prev => ({ ...prev, [param.name]: e.target.value }));
                              }}
                              className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            >
                              {param.options && param.options.map(option => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        );
                      }

                      if (param.type === 'multi-select') {
                        // Mapea las listas de strings a un formato que react-select entiende: { value: '...', label: '...' }
                        const options = availableFilters[param.optionsKey].map(opt => ({ value: opt, label: opt }));
                        
                        // Mapea los valores seleccionados (que son strings) de vuelta al formato de objeto
                        const value = (parameterValues[param.name] || []).map(val => ({ value: val, label: val }));

                        return (
                          <div key={param.name} className="mb-4">
                            <label className="block text-sm font-medium text-gray-600 mb-1">
                              {param.label}:
                            </label>
                            <Select
                              isMulti
                              name={param.name}
                              options={options}
                              className="mt-1 block w-full basic-multi-select"
                              classNamePrefix="select"
                              value={value}
                              isLoading={isLoadingFilters}
                              placeholder={isLoadingFilters ? "Cargando filtros..." : "Selecciona..."}
                              onChange={(selectedOptions) => {
                                // Guardamos solo el array de valores (strings) en nuestro estado
                                const values = selectedOptions ? selectedOptions.map(opt => opt.value) : [];
                                setParameterValues(prev => ({ ...prev, [param.name]: values }));
                              }}
                            />
                          </div>
                        );
                      }

                      // Caso 2: Para campos de texto donde el usuario escribe una lista
                      if (param.type === 'text_list') {
                        return (
                          <div key={param.name} className="mb-4">
                            <label htmlFor={param.name} className="block text-sm font-medium text-gray-600 mb-1">
                              {param.label} <span className="text-gray-400">(separar con comas)</span>:
                            </label>
                            <input
                              type="text"
                              id={param.name}
                              name={param.name}
                              value={parameterValues[param.name] || ''}
                              placeholder={param.placeholder || ''}
                              onChange={(e) => {
                                setParameterValues(prev => ({ ...prev, [param.name]: e.target.value }));
                              }}
                              className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            />
                          </div>
                        );
                      }

                      // Si en el futuro agregas más tipos, puedes añadir más 'if' aquí.
                      return null;
                    })}
                  </div>
                </div>
              )}
              <div
                className="text-gray-700 space-y-2 text-left text-sm mt-10"
                dangerouslySetInnerHTML={{ __html: insightHtml }}
              >
              </div>
            </div>
            <div className="p-4 w-full border-t relative bottom-0 bg-white z-10 shadow text-center sticky bottom-0">
              <button
                onClick={buttonDownloadHandleMulti}
                className={`border px-6 py-2 rounded-lg font-semibold ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                style={{
                  backgroundImage: isLoading ? 'none' : 'linear-gradient(to right, #560bad, #7209b7, #b5179e)',
                  backgroundColor: isLoading ? '#cccccc' : 'transparent',
                  color: isLoading ? '#666666' : 'transparent',
                  borderColor: isLoading ? '#999999' : '#7209b7',
                  backgroundClip: isLoading ? 'padding-box' : 'text', // 'text' para el degradado del texto, 'padding-box' para color sólido
                }}
                disabled={!ventasFile || !inventarioFile || isLoading}
              >
                {isLoading ? 'Generando...' : `👉 Descargar ${selectedReport.label.replace(' ✓', '')}`}
              </button>
              <button
                onClick={() => setShowModal(false)} // La limpieza de caché se maneja en useEffect[showModal]
                className="mt-4 w-full text-white text-xl px-4 py-2 font-bold rounded-lg hover:text-gray-100"
                style={{
                  backgroundImage: 'linear-gradient(to right, #560bad, #7209b7, #b5179e)',
                }}
                disabled={isLoading}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default LandingPage;
