// src/components/ReportModal.jsx

import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import Select from 'react-select';
// import * as XLSX from 'xlsx';
// import XLSX from 'xlsx-style';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

import { useStrategy } from '../context/StrategyProvider';
import { useConfig } from '../context/ConfigProvider';
import { useWorkspace } from '../context/WorkspaceProvider';

import api from '../utils/api';
import { Tooltip } from './Tooltip';
import { jsPDF } from "jspdf";
// import "jspdf-autotable";
import { InsufficientCreditsModal } from './InsufficientCreditsModal';
import { AppliedParameters } from './AppliedParameters'; // <-- Importamos el nuevo componente

import { autoTable } from 'jspdf-autotable';

import { ResultListItem } from './ResultListItem';

// --- IMPORTAMOS LOS NUEVOS MODALES ---
import { TruncatedResultModal } from './TruncatedResultModal';
// import { RechargeCreditsModal } from './RechargeCreditsModal';
import { BecomeStrategistModal } from './BecomeStrategistModal';
import {LoginModal} from './LoginModal'; // Asumimos que LoginModal vive en su propio archivo
import {RegisterModal} from './RegisterModal'; // Asumimos que RegisterModal vive en su propio archivo
import { ContextualBanner } from './ContextualBanner'; // <-- Importamos el nuevo componente


// --- IMPORTAMOS LOS NUEVOS MODALES ---
import { RegisterToUnlockModal } from './RegisterToUnlockModal';

// Importa los iconos que necesitas
import { FiX, FiCheck, FiChevronLeft, FiAward, FiChevronRight, FiLoader, FiDownload, FiRefreshCw, FiTable, FiFileText, FiClipboard, FiPrinter, FiInfo, FiCheckCircle, FiSearch} from 'react-icons/fi';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// --- NUEVO COMPONENTE REUTILIZABLE PARA LAS TARJETAS DE KPI ---
const KpiCard = ({ label, value, tooltipText }) => (
  <div className="bg-white p-4 rounded-lg shadow border transform transition-all duration-300 hover:scale-105">
    <div className="flex items-center">
      <p className="text-sm text-gray-500">{label}</p>
      {/* El tooltip se renderiza aquí */}
      <Tooltip text={tooltipText} />
    </div>
    <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
  </div>
);

const ReportInfoPanel = ({ reportItem, onBack, modalView }) => (
  <div className="w-full h-full bg-purple-50 p-6 overflow-y-auto">
    <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-purple-600 hover:text-purple-800 mb-4">
      <FiChevronLeft /> Volver a {modalView == 'parameters' ? 'Parámetros' : 'Resultados'}
    </button>
    <div className="space-y-4">
      <div>
        <h3 className="font-bold text-lg text-gray-800 mb-2">📄 ¿Qué es este reporte?</h3>
        <p className="text-sm text-gray-600">{reportItem.description}</p>
      </div>
      <hr/>
      <div>
        <h3 className="font-bold text-lg text-gray-800 mb-2">⚙️ ¿Cómo funciona?</h3>
        <p className="text-sm text-gray-600">{reportItem.how_it_works}</p>
      </div>
      <hr/>
      <div>
        <h3 className="font-bold text-lg text-gray-800 mb-2">⚡️ Usos Potentes</h3>
        <div className="space-y-4">
          {(reportItem.planes_de_accion || []).map((plan, i) => (
            <div key={i} className="p-4 shadow-md rounded-lg bg-gray-50">
              <h4 className="font-bold text-purple-700">{plan.title}</h4>
              <p className="text-xs font-semibold text-gray-500 my-2">🔁 {plan.periodicity}</p>
              <p className="text-sm text-gray-800">{plan.recipe}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);


export function ReportModal({ reportConfig, context, contextInfo, initialView = 'parameters', initialSkuFilter, availableFilters, onClose, onAnalysisComplete, onInsufficientCredits, onLoginSuccess }) {
  const { strategy } = useStrategy();
  const { tooltips, kpiTooltips } = useConfig();
  const { updateCredits, credits } = useWorkspace()

  // --- ESTADOS INTERNOS DEL MODAL ---
  const [modalView, setModalView] = useState('parameters'); // 'parameters', 'loading', 'results'
  const [modalParams, setModalParams] = useState({});
  const [analysisResult, setAnalysisResult] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeModal, setActiveModal] = useState(null);
  // const [truncationInfo, setTruncationInfo] = useState({ shown: 0, total: 0 });
  const [truncationInfo, setTruncationInfo] = useState(null);
  const [modalInfo, setModalInfo] = useState({ title: '', message: '' });
  const [isInfoVisible, setIsInfoVisible] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [visibleItemsCount, setVisibleItemsCount] = useState(15); // Carga inicial de 15 items
  const [confirmBack, setConfirmBack] = useState(false); // Para el botón de volver
  const backButtonTimer = useRef(null);

  const [activeContext, setActiveContext] = useState(contextInfo);

  // Efecto para establecer la vista inicial cuando el modal se monta
  useEffect(() => {
    if (initialView === 'info') {
      // Usamos un pequeño timeout para que la animación de deslizamiento sea visible
      // justo después de que el modal aparece.
      setTimeout(() => {
        setIsInfoVisible(true);
      }, 300); // 50ms es suficiente para que el ojo lo perciba
    }
  }, [initialView]);

  useEffect(() => {
    setActiveContext(contextInfo);
  }, [contextInfo]);

  const handleClearFilter = () => {
    setActiveContext(null); // Esto ocultará el panel y desactivará el filtro
  };

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

  // useEffect(() => {
  //   setVisibleItemsCount(10)
  //   console.log('ms')
  // }, [searchTerm])

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

  // --- FUNCIÓN PARA RENDERIZAR PARÁMETROS DE FORMA DINÁMICA ---
  const renderParameter = (param) => {
    const key = `${param.name}-${context.id || context.workspace?.id}`;
    
    switch (param.type) {
      case 'text':
        return (
          <div key={param.name} className="mb-4 text-left">
            <label htmlFor={param.name} className="flex items-center text-sm font-medium text-gray-600 mb-1">
              {param.label}: <Tooltip text={tooltips[param.tooltip_key]} />
            </label>
            <input type="text" id={param.name} name={param.name} value={modalParams[param.name] || ''} onChange={e => handleParamChange(param.name, e.target.value)} placeholder={param.placeholder || ''} className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm" />
          </div>
        );
      
      // case 'select':
      //   return (
      //     <div key={param.name} className="mb-4">
      //       <label htmlFor={param.name} className="block text-sm font-medium text-gray-600 mb-1">
      //         {param.label}:
      //         <Tooltip text={tooltips[param.tooltip_key]} />
      //       </label>
      //       <select
      //         id={param.name}
      //         name={param.name}
      //         value={modalParams[param.name] || ''}
      //         onChange={e => handleParamChange(param.name, e.target.value)}
      //         className="appearance-none mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
      //       >
      //         {param.options?.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      //       </select>
      //     </div>
      //   );

      // case 'boolean_select':
      //  return (
      //     <div key={param.name} className="mb-4">
      //       <label htmlFor={param.name} className="block text-sm font-medium text-gray-600 mb-1">
      //         {param.label}:
      //         <Tooltip text={tooltips[param.tooltip_key]} />
      //       </label>
      //       <select
      //         id={param.name}
      //         name={param.name}
      //         value={modalParams[param.name] || ''}
      //         onChange={e => handleParamChange(param.name, e.target.value)}
      //         className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
      //       >
      //         {param.options?.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      //       </select>
      //     </div>
      //   );

      // case 'multi-select':
      //   {
      //     // --- INICIO DE LA LÓGICA CORREGIDA ---
      //     let options = [];
      //     // 1. Verificamos si el parámetro tiene opciones estáticas definidas en la configuración
      //     if (param.static_options) {
      //       // Si las tiene, usamos esas. Son la fuente de verdad.
      //       options = param.static_options;
      //     } else {
      //       // Si no, usamos las opciones dinámicas que vienen de los archivos (ej. categorías, marcas)
      //       options = availableFilters[param.optionsKey]?.map(opt => ({ value: opt, label: opt })) || [];
      //     }
      //     // --- FIN DE LA LÓGICA CORREGIDA ---

      //     const value = (modalParams[param.name] || []).map(val => {
      //         // Buscamos la opción completa (value y label) para que el select la muestre
      //         return options.find(opt => opt.value === val) || { value: val, label: val };
      //     });

      //     return (
      //       <div key={param.name} className="mb-4 text-left">
      //         <label className="block text-sm font-medium text-gray-600 mb-1">
      //           {param.label}:
      //           <Tooltip text={tooltips[param.tooltip_key]} />
      //         </label>
      //         <Select
      //           isMulti
      //           name={param.name}
      //           options={options}
      //           className="mt-1 block w-full basic-multi-select"
      //           classNamePrefix="select"
      //           value={value} // <-- Usamos el valor formateado
      //           placeholder="Selecciona..."
      //           onChange={(selectedOptions) => {
      //             const values = selectedOptions ? selectedOptions.map(opt => opt.value) : [];
      //             handleParamChange(param.name, values);
      //           }}
      //         />
      //       </div>
      //     );
      //   }

      case 'select':
      case 'boolean_select':
      case 'multi-select':
        const isMulti = param.type === 'multi-select';
        
        // Obtenemos las opciones (estáticas o dinámicas)
        const options = param.static_options || availableFilters[param.optionsKey]?.map(opt => ({ value: opt, label: opt })) || param.options || [];

        // Formateamos el valor actual para que react-select lo entienda
        let valueForSelect;
        if (isMulti) {
          const currentValues = modalParams[param.name] || [];
          valueForSelect = currentValues.map(val => options.find(opt => opt.value === val) || { value: val, label: val });
        } else {
          const currentValue = modalParams[param.name];
          valueForSelect = options.find(opt => opt.value == currentValue);
        }

        return (
          <div key={key} className="mb-4 text-left">
            <label className="flex items-center text-sm font-medium text-gray-600 mb-1">
              {param.label}: <Tooltip text={tooltips[param.tooltip_key]} />
            </label>
            <Select
              isMulti={isMulti}
              name={param.name}
              options={options}
              className="mt-1 block w-full basic-multi-select"
              classNamePrefix="select"
              value={valueForSelect}
              placeholder="Selecciona..."
              onChange={(selectedOption) => {
                // Extraemos el valor correcto (un string o un array de strings)
                const newValue = isMulti 
                  ? (selectedOption ? selectedOption.map(opt => opt.value) : [])
                  : (selectedOption ? selectedOption.value : null);
                handleParamChange(param.name, newValue);
              }}
            />
          </div>
        );

      // --- NUEVO CASO PARA INPUTS NUMÉRICOS ---
      case 'number':
        return (
          <div key={param.name} className="mb-4 text-left">
            <label htmlFor={param.name} className="flex items-center text-sm font-medium text-gray-600 mb-1">
              {param.label}: <Tooltip text={tooltips[param.tooltip_key]} />
            </label>
            <input
              type="number"
              id={param.name}
              name={param.name}
              value={modalParams[param.name] || ''}
              onChange={e => handleParamChange(param.name, e.target.value === '' ? '' : parseFloat(e.target.value))}
              min={param.min}
              max={param.max}
              step={param.step || 'any'} // Permite decimales por defecto
              placeholder={param.placeholder || ''}
              className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
            />
          </div>
        );

      default:
        return null;
    }
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

    if (activeContext && activeContext.skus && activeContext.skus.length > 0) {
      formData.append('filtro_skus_json', JSON.stringify(activeContext.skus));
    }

    // console.log('modalParams')
    // console.log(modalParams)
    Object.entries(modalParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) formData.append(key, JSON.stringify(value));
        else formData.append(key, value);
      }
    });

    // Si es el reporte ABC y el criterio es 'combinado', enviamos los pesos de la estrategia.
    if (reportConfig.key === 'ReporteABC' && modalParams.criterio_abc === 'combinado') {
      if (strategy) {
        formData.append('score_ventas', strategy.score_ventas);
        formData.append('score_ingreso', strategy.score_ingreso);
        formData.append('score_margen', strategy.score_margen);
      } else {
        // Fallback por si la estrategia no ha cargado, aunque no debería pasar.
        console.warn("Estrategia no encontrada, usando valores por defecto para el reporte ABC.");
        formData.append('score_ventas', 8);
        formData.append('score_ingreso', 6);
        formData.append('score_margen', 4);
      }
    }

    if (reportConfig.key === 'ReporteMaestro') {
      if (strategy) {
        formData.append('score_ventas', strategy.score_ventas);
        formData.append('score_ingreso', strategy.score_ingreso);
        formData.append('score_margen', strategy.score_margen);
      } else {
        // Fallback por si la estrategia no ha cargado, aunque no debería pasar.
        console.warn("Estrategia no encontrada, usando valores por defecto para el reporte ABC.");
        formData.append('score_ventas', 8);
        formData.append('score_ingreso', 6);
        formData.append('score_margen', 4);
      }
    }

    try {
      const response = await api.post(reportConfig.endpoint, formData, {
        headers: context.type === 'anonymous' ? { 'X-Session-ID': context.id } : { 'X-Session-ID': context.workspace.id }
      });
      setAnalysisResult(response.data);
      setSearchTerm('');

     // --- LÓGICA PARA MANEJAR RESULTADOS TRUNCADOS ---
      if (context.type === 'anonymous' && response.data.is_truncated) {
        setTruncationInfo({
          shown: response.data.data.length,
          total: response.data.total_rows
        });
      } else {
        setTruncationInfo(null); // Reseteamos si no está truncado
      }

      setModalView('results');
      if (onAnalysisComplete) {
        onAnalysisComplete();
      }

      if (response.data.updated_credits) {
        updateCredits(response.data.updated_credits);
      }
    } catch (error) {
      // --- BLOQUE CATCH REESTRUCTURADO ---
      if (error.response?.status === 402) {
        // Si se acaban los créditos
        if (context.type === 'user') {
          // Para usuarios registrados, ofrecemos recarga
          onInsufficientCredits({
            required: reportConfig.costo,
            remaining: credits?.remaining || 0
          });
        } else {
          // Para anónimos, ofrecemos registro
          setModalInfo({
            title: "Créditos de Prueba Agotados",
            message: "Has usado todos tus créditos de esta sesión. Regístrate gratis para obtener un bono de bienvenida y seguir analizando."
          });
          setActiveModal('registerToUnlock');
        }
      } else {
        // Para cualquier otro error, mantenemos la lógica genérica
        // let errorMessage = "Ocurrió un error al generar el reporte.";
        const errorDetail = error.response?.data?.detail;
        let alertMessage = "Ocurrió un error al generar el reporte.";
        if (typeof errorDetail === 'string') {
          alertMessage = errorDetail;
        } else if (Array.isArray(errorDetail)) {
          // Formateamos los errores de validación de FastAPI
          alertMessage = "Faltan parámetros requeridos: " + errorDetail.map(err => err.loc[1]).join(', ');
        }
        // Para cualquier otro error
        // alert(error.response?.data?.detail || "Ocurrió un error al procesar el reporte.");
        alert(alertMessage)
      }
      setModalView('parameters'); // Siempre volvemos a la vista de parámetros
    }
  };

  const handleResetAdvanced = () => {
    const advancedDefaults = {};
    reportConfig.advanced_parameters?.forEach(param => {
        advancedDefaults[param.name] = param.defaultValue;
    });
    
    setModalParams(prev => ({ ...prev, ...advancedDefaults }));
  };

  const stripEmojis = (text) => {
    if (typeof text !== 'string') return text;
    // Expresión regular para detectar la mayoría de los emojis
    const emojiRegex = /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/g;
    return text.replace(emojiRegex, '').trim();
  };

  const handleOpenPDF = () => {
    const dataToUse = filteredData;
    if (!dataToUse || dataToUse.length === 0) {
      alert("No hay datos para generar el PDF.");
      return;
    }

    // 1. Obtenemos la lista de parámetros a mostrar (reutilizando la lógica)
    const paramsToShow = (reportConfig.basic_parameters || [])
      .map(param => {
        const usedValue = modalParams[param.name];
        const shouldShow = Array.isArray(usedValue) ? usedValue.length > 0 : usedValue !== undefined && usedValue !== null && usedValue !== '';
        
        if (shouldShow) {
          const selectedOption = param.options?.find(opt => String(opt.value) === String(usedValue));
          const displayValue = selectedOption ? selectedOption.label : usedValue;
          return { label: param.label, value: displayValue };
        }
        return null;
      })
      .filter(Boolean);

    // 2. Creamos el documento PDF
    const doc = new jsPDF({ orientation: "portrait" });
    let currentY = 15; // Posición vertical inicial

    // Título del Reporte
    doc.setFont("helvetica", "bold");
    doc.setFontSize(19);
    doc.text(`~${replaceEmojis(reportConfig.label, "")}`, 14, currentY);
    currentY += 10;

    // --- 3. DIBUJAMOS LA NUEVA "CARÁTULA DE CONTEXTO" ---
    if (paramsToShow.length > 0) {
      doc.setFontSize(13);
      doc.setTextColor(100); // Color gris
      doc.text("Parámetros de la Ejecución:", 14, currentY);
      currentY += 6;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.setTextColor(40); // Color de texto principal
      
      paramsToShow.forEach(param => {
        doc.text(`- ${param.label}: ${param.value}`, 16, currentY);
        currentY += 5;
      });
      currentY += 2; // Espacio extra antes de la tabla
    }

    // 4. Dibujamos la tabla de datos
    // const headers = reportConfig.accionable_columns || [];
    // const finalHeaders = [...headers];
    // const body = dataToUse.map(row => {
    //     const rowData = headers.map(header => row[header] || '');
    //     return rowData;
    // });
    const headers = reportConfig.accionable_columns || [];
    const finalHeaders = [...headers];

    const body = dataToUse.map(row => {
        const rowData = headers.map(header => {
            const value = row[header] || '';
            // Si la columna es la de clasificación, le quitamos los emojis
            if (header === 'Clasificación BCG') {
                return stripEmojis(value);
            }
            return value;
        });
        rowData.push(''); // Añadimos el valor vacío para 'Check ✓'
        rowData.push(''); // Añadimos el valor vacío para 'Cant. Final'
        return rowData;
    });

    autoTable(doc, {
        head: [finalHeaders],
        body: body,
        startY: currentY, // La tabla empieza después del encabezado de contexto
        styles: { fontSize: 11 },
        headStyles: { fillColor: [67, 56, 202] }
    });


    // --- NUEVA SECCIÓN: "ANUNCIO DE VALOR" EN EL PDF ---
    // const finalY = doc.autoTable.previous.finalY; // Obtenemos la posición final de la tabla
    doc.addPage();
    const adY = 15; // Añadimos un espacio

    // Dibujamos el cuadro de fondo
    doc.setFillColor(243, 244, 246); // Un gris claro (bg-gray-100)
    doc.rect(14, adY, doc.internal.pageSize.getWidth() - 28, 32, 'F');

    // Añadimos el icono (estrella)
    doc.setFontSize(20);
    doc.setTextColor(251, 191, 36); // Color amarillo (text-yellow-500)
    doc.text("⭐", 20, adY + 12);

    // Añadimos el texto
    doc.setFontSize(10);
    doc.setTextColor(17, 24, 39); // Color de texto oscuro (text-gray-900)
    doc.setFont("helvetica", "bold");
    doc.text("Potencia tu Análisis", 30, adY + 8);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const adText = "Este reporte tiene una versión visual. Conviértete en un Ferretero Estratega para desbloquear gráficos interactivos que te ayudarán a identificar tendencias al instante y presentar tus resultados de forma más impactante.";
    const splitText = doc.splitTextToSize(adText, doc.internal.pageSize.getWidth() - 60);
    doc.text(splitText, 30, adY + 14);

    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text("Visita Ferretero.IA para mejorar tu plan y acceder a esta y otras herramientas Pro.", 30, adY + 28);
    
    
    // 5. Abrimos el PDF en una nueva pestaña
    doc.output('bloburl', { filename: `FerreteroIA_${reportConfig.key}_Accionable.pdf` });
    window.open(doc.output('bloburl'), '_blank');
  };

  function replaceEmojis(text, placeholder = '[emoji]') {
    const emojiRegex = /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/g;
    return text.replace(emojiRegex, placeholder);
  }

  const handleDownloadExcel = async () => {
    const dataToUse = filteredData;
    if (!dataToUse || dataToUse.length === 0) {
      alert("No hay datos para descargar.");
      return;
    }

    const filename = `FerreteroIA_${analysisResult.report_key}_Detallado.xlsx`;
    
    // 1. Creamos un nuevo libro de trabajo
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Análisis Detallado");

    // 2. Definimos las columnas y sus encabezados
    // Esto también nos permite controlar el orden y el formato
    const columns = Object.keys(dataToUse[0] || {}).map(key => ({
      header: key,
      key: key,
      width: 10 // Ancho por defecto
    }));

    // Aplicamos los anchos personalizados que definiste
    const customWidths = {
      'SKU / Código de producto': 10,
      'Nombre del producto': 50,
      'Categoría': 23,
      'Subcategoría': 23
    };

    columns.forEach(col => {
      if (customWidths[col.header]) {
        col.width = customWidths[col.header];
      }
    });

    worksheet.columns = columns;

    worksheet.autoFilter = {
      from: 'A1',
      to: 'Z1',
    }

    worksheet.views = [
      {state: 'frozen', xSplit: 2, ySplit: 1}
    ];


    // 3. Aplicamos estilo al encabezado
    worksheet.getRow(1).eachCell((cell) => {
      cell.font = {
        bold: true,
        color: { argb: 'FFFFFFFF' } // Texto blanco
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF6B21A8' } // Fondo púrpura
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center',
        wrapText: true
      };
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FFFFFFFF' } }
      };
    });
    worksheet.getRow(1).height = 80; // Altura de la fila en puntos

    // 4. Añadimos los datos
    worksheet.addRows(dataToUse);

    // 5. Generamos el buffer del archivo y disparamos la descarga
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, filename);
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

  // --- LÓGICA PARA EL BOTÓN DE VOLVER ---
  const handleBackToParamsClick = () => {
    if (confirmBack) {
      setModalView('parameters');
      setAnalysisResult(null); // Resetea el resultado para la próxima ejecución
      setConfirmBack(false);
      clearTimeout(backButtonTimer.current);
    } else {
      setConfirmBack(true);
      // Después de 3 segundos, vuelve al estado normal
      backButtonTimer.current = setTimeout(() => {
        setConfirmBack(false);
      }, 2500);
    }
  };

  const handleChartPlaceholderClick = () => {
    if (context.type === 'user') {
      setActiveModal('becomeStrategist');
    } else {
      setModalInfo({
        title: "Desbloquea Gráficos Estratégicos",
        message: "Esta comparativa de mercado es una herramienta avanzada. Regístrate gratis para desbloquear el acceso a esta y otras funciones."
      });
      setActiveModal('registerToUnlock');
    }
  };

  return (
    <div className="fixed h-full inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 animate-fade-in overflow-y-auto">
      <div className="h-full flex flex-col bg-white rounded-lg max-w-lg w-full shadow-2xl relative">
        <div className="p-4 border-b bg-white z-10 shadow text-center items-center sticky top-0">
          <h2 className="text-xl text-left font-bold text-gray-800 relative w-9/10 pr-10 break-words truncate">{reportConfig.label}</h2>
          {/*<button onClick={onClose} className="absolute top-3 right-0 h-10 w-10 text-gray-400 hover:text-gray-600"><FiX size={24}/></button>*/}
          <div className="absolute top-3 right-0 w-20 gap-0 p-2">
            <button 
              onClick={() => setIsInfoVisible(!isInfoVisible)}
              className={`rounded-full transition-colors ${isInfoVisible ? 'bg-purple-100 text-purple-600' : 'text-gray-400 hover:bg-gray-100'}`}
              title="Más información sobre este reporte"
            >
              <FiInfo size={24}/>
            </button>
            <button onClick={onClose} className="mx-2 text-gray-400 hover:text-gray-600"><FiX size={24}/></button>
          </div>
        </div>

        {/* --- CONTENEDOR DEL "CARRUSEL" CON TRANSICIONES CSS --- */}
        <div className="flex-1 min-h-0 relative overflow-hidden">
          {/* Contenedor que se desliza */}
          <div
            className="flex w-[200%] h-full transition-transform duration-300 ease-in-out"
            style={{ transform: isInfoVisible ? 'translateX(-50%)' : 'translateX(0%)' }}
          >
            {/* Panel 1: Parámetros/Resultados */}
            <div className="w-1/2 h-full overflow-y-auto">
              {modalView === 'loading' && (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <FiLoader className="animate-spin text-4xl text-purple-600" />
                  <p className="mt-4">Generando análisis...</p>
                </div>
              )}

              {modalView === 'parameters' && (
                <div className="p-4 text-black flex-col">
                  <ContextualBanner contextInfo={activeContext} onClear={handleClearFilter} />
                  <div className="flex-1 min-h-0 gap-4 p-4 text-black">
                    {(reportConfig.basic_parameters?.length > 0 || reportConfig.advanced_parameters?.length > 0) && (
                      <div className="p-4 border-2 rounded-md shadow-md bg-gray-50">
                        <h3 className="text-lg font-semibold text-gray-700 mb-4">Parámetros del Reporte</h3>
                        
                        {/* --- RENDERIZADO DE PARÁMETROS BÁSICOS --- */}
                        {/* Renderizado de parámetros básicos */}
                        {(reportConfig.basic_parameters || []).map(renderParameter)}

                        {/* --- NUEVA LÓGICA DE UI CONTEXTUAL --- */}
                        {/* Si el reporte es ABC y el criterio es 'combinado', mostramos el mensaje */}
                        {reportConfig.key === 'ReporteABC' && modalParams.criterio_abc === 'combinado' && (
                          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-800">
                            ℹ️ Este análisis utilizará los pesos definidos en tu panel de <strong>'Mi Estrategia'</strong> para calcular la importancia de los productos.
                          </div>
                        )}

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
                                  {(reportConfig.advanced_parameters).map(renderParameter)}
                                </div>
                                {/* --- BOTÓN DE RESET PARA PARÁMETROS AVANZADOS --- */}
                                {/*<button onClick={handleResetAdvanced} className="w-full text-xs font-semibold text-gray-500 hover:text-red-600 mt-2 transition-colors flex items-center justify-center gap-1">
                                  <FiRefreshCw className="text-md"/> Restaurar valores por defecto
                                </button>*/}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {modalView === 'results' && analysisResult && (
                <div className="h-full flex flex-col">
                  {/* --- SECCIÓN SUPERIOR CON KPIs --- */}
                  <div className="p-4 sm:p-6 text-left">
                    <ContextualBanner contextInfo={activeContext} onClear={handleClearFilter} />

                    {/*<h3 className="text-lg font-bold text-gray-800 mb-4">📊 Resumen Ejecutivo</h3>*/}
                    {/* Insight Clave */}
                    <div className="mb-6 p-4 bg-purple-50 border-l-4 border-purple-500">
                      <p className="text-lg mb-2 font-semibold text-purple-800 tracking-wider">¡Analisis Completado!</p>
                      <p className="text-sm font-semibold text-purple-800">{analysisResult.insight}</p>
                      {/* --- NUEVA FICHA DE CONTEXTO --- */}
                      <AppliedParameters 
                        reportConfig={reportConfig}
                        modalParams={modalParams}
                      />
                      {filteredData.length > 0 && (<p className="text-xs text-purple-800 mt-2 bg-purple-100 p-2 rounded-lg">💡 Sugerencia: Descarga el reporte Imprimible para usarlo como una lista rápida de acción.</p>)}
                    </div>
                  <hr/>
                    <div className="grid gap-4">
                      {/* --- KPIs DESTACADOS CON TOOLTIPS --- */}
                      <div className="mb-4 mt-6">
                        <h4 className="font-semibold text-gray-700 mb-2">📊 Resumen Ejecutivo</h4>
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
                    </div>
                    {/* --- RENDERIZADO DEL GRÁFICO PLACEHOLDER --- */}
                    {/* Dentro de tu vista de resultados del ReportModal */}
                    <div className="p-4 bg-white shadow border rounded-lg text-center transform transition-all duration-300 hover:scale-104">
                      <div className="flex items-center justify-center mb-2">
                        <p className="text-sm text-gray-500">Gráfico Estadístico</p>
                        <Tooltip text={tooltips['chart_placeholder']} />
                      </div>
                      <div className="relative h-30 bg-gray-200 rounded rounded-lg flex items-center justify-center">
                          <div role="status" className="w-full p-4 rounded-sm shadow-sm border-gray-700 animate-pulse">
                            <div className="flex items-baseline">
                                <div className="w-full rounded-t-lg h-32 sm:h-52 bg-gray-400"></div>
                                <div className="w-full h-16 sm:h-36 ms-4 rounded-t-lg bg-gray-400"></div>
                                <div className="w-full rounded-t-lg h-32 sm:h-52 ms-4 bg-gray-400"></div>
                                <div className="w-full h-24 sm:h-44 ms-4 rounded-t-lg bg-gray-400"></div>
                                <div className="w-full rounded-t-lg h-40 sm:h-60 ms-4 bg-gray-400"></div>
                                <div className="w-full rounded-t-lg h-32 sm:h-52 ms-4 bg-gray-400"></div>
                                <div className="w-full rounded-t-lg h-40 sm:h-60 ms-4 bg-gray-400"></div>
                            </div>
                          </div>
                          <button onClick={handleChartPlaceholderClick} className="absolute flex items-center bg-purple-600 text-white font-bold py-2 px-4 rounded-lg">
                            ⭐️ Desbloquear Gráfico
                          </button>
                      </div>
                    </div>
                  </div>
                  <hr className="mx-4"/>
                  {/* --- SECCIÓN DE RESULTADOS CON SCROLL --- */}
                  <div className="flex-1 min-h-100 flex flex-col bg-gray-100">
                    {/* --- Barra de Búsqueda "Pegajosa" --- */}
                    <div className="sticky top-0 bg-white z-10 p-4 border-b shadow-md shadow-gray-200">
                      <h4 className="font-semibold text-gray-700 mb-2">🔍 Refinar Resultados</h4>
                      <div className="relative">
                        {/*<FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />*/}
                        <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Filtra por SKU, nombre, categoría..." className="w-full bg-white text-gray-800 border border-gray-300 rounded-md py-2 pl-4 pr-4 focus:ring-purple-500 focus:border-purple-500" />
                      </div>
                    </div>
                    
                    {/* --- Lista de Resultados con Scroll Interno --- */}
                    <div className="overflow-y-auto p-4 space-y-2 mb-10">
                      {filteredData.length > 0 ? (
                        filteredData.slice(0, visibleItemsCount).map((item, index) => (
                          <ResultListItem key={item['SKU / Código de producto'] || index} itemData={item} detailInstructions={reportConfig.preview_details} />
                        ))
                      ) : (
                        <p className="text-center text-gray-500 py-8">Ningún resultado encontrado.</p>
                      )}
                      
                      {/* --- Botón "Cargar Más" --- */}
                      {/*{filteredData.length > visibleItemsCount && (
                        <div className="text-center mt-4">
                          <button onClick={() => setVisibleItemsCount(prev => prev + 10)} className="text-sm font-semibold text-purple-600 hover:text-purple-800">
                            Cargar 10 más...
                          </button>
                        </div>
                      )}*/}
                      {/* --- BOTÓN DE ACCIÓN CONTEXTUAL --- */}
                      <div className="text-center mt-4">
                        {context.type === 'anonymous' && truncationInfo ? (
                          // Para anónimos con resultados truncados, mostramos el botón de desbloqueo
                          <button 
                            onClick={() => {
                              setModalInfo({
                                title: "Desbloquea la Lista Completa del Resultado",
                                message: "Esta función es una herramienta avanzada. Regístrate gratis para desbloquear el acceso a esta y otras funciones."
                              });
                              setActiveModal('registerToUnlock')}} 
                            className="font-semibold text-purple-600 hover:text-purple-800"
                          >
                            ⭐ Ver los {truncationInfo.total - truncationInfo.shown} resultados restantes
                          </button>
                        ) : (
                          // Para usuarios registrados, mostramos el "Cargar más"
                          filteredData.length > visibleItemsCount && (
                            <button onClick={() => setVisibleItemsCount(prev => prev + 15)} className="text-sm font-semibold text-purple-600 hover:text-purple-800">
                              Cargar 15 más...
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            
            </div>

            {/* Panel 2: Ayuda */}
            <div className="w-1/2 h-full">
              <ReportInfoPanel reportItem={reportConfig} modalView={modalView} onBack={() => setIsInfoVisible(false)} />
            </div>
          </div>
        </div>


        {/* --- FOOTER CON BOTONES DE ACCIÓN --- */}
        <div className="p-2 w-full border-t bg-gray-50 z-10 shadow text-center sticky bottom-0">
          {modalView === 'results' ? (
            <div className="flex gap-2">
              <button onClick={handleOpenPDF} className="flex-1 bg-gray-600 text-white font-bold py-2 px-2 rounded-lg hover:bg-gray-700 flex items-center justify-center gap-2">
                <FiFileText className="text-5xl md:text-4xl" /> <div><span>Imprimible (PDF)</span><span className="block text-xs opacity-80">{searchTerm ? `Filtrado (${filteredData.length})` : `Completo (${analysisResult.data.length})`}</span></div>
              </button>
              <button onClick={handleDownloadExcel} className="flex-1 bg-purple-600 text-white font-bold py-2 px-2 rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2">
                <FiTable className="text-5xl md:text-4xl" /> <div><span>Detallado (Excel)</span><span className="block text-xs opacity-80">{searchTerm ? `Filtrado (${filteredData.length})` : `Completo (${analysisResult.data.length})`}</span></div>
              </button>
            </div>
          ) : (
            // <button onClick={handleGenerateAnalysis} className="w-full flex-row bg-purple-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2">🚀 Ejecutar Análisis</button>
            <>
              { isInfoVisible ? (
                <button
                  onClick={ () => setIsInfoVisible(false) }
                  className="px-6 font-semibold w-full transition-all duration-300 ease-in-out flex items-center justify-center gap-2 text-transparent"
                  style={{
                    backgroundImage: 'linear-gradient(to right, #560bad, #7209b7, #b5179e)',
                    backgroundClip: 'text'
                  }}
                >
                  <FiChevronLeft className="text-purple-800" /> <span className="text-lg font-bold "> Volver a Parametros</span>
                </button>
              ) : (
                <button
                  onClick={ handleGenerateAnalysis }
                  disabled={ modalView === 'loading' }
                  className={`border px-6 py-3 rounded-lg font-semibold w-full transition-all duration-300 ease-in-out flex items-center justify-center gap-2
                      ${
                          // Lógica de estilos condicional
                          modalView === 'loading' ? 'bg-gray-200 text-gray-500 cursor-wait' : 'text-transparent border-purple-700'
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
                    ) : modalView === 'loading' ? (
                        <>
                            <FiLoader className="animate-spin h-5 w-5" />
                            <span>Generando...</span>
                        </>
                    ) : (
                        <>
                            <span className="text-black font-bold text-xl">🚀</span>
                            <span className="text-lg font-bold">Ejecutar Análisis</span>
                        </>
                    )
                  }
                </button>
              )}
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
        </div>

        {/* --- BOTÓN FLOTANTE PARA VOLVER --- */}
        {modalView === 'results' && (
          <>
            <button 
              onClick={handleBackToParamsClick}
              className={`absolute bottom-28 z-20 flex items-center justify-center h-14 bg-gray-800 text-white rounded-full shadow-lg transition-all duration-200 ease-in-out hover:bg-gray-600 ${confirmBack ? 'w-64 right-1/8' : 'w-14 right-5'}`}
            >
              {confirmBack ? (
                <span className="flex items-center gap-2 animate-fade-in-fast"><FiChevronLeft />Volver a Parametros</span>
              ) : (
                <FiChevronLeft />
              )}
            </button>
            {confirmBack && (
              <button 
                onClick={() => {setConfirmBack(false)}}
                className={`absolute bottom-28 right-5 z-20 flex items-center justify-center h-14 bg-gray-800 text-white rounded-full shadow-lg transition-all duration-200 ease-in-out hover:bg-gray-600 w-14`}
              >
                <FiChevronRight />
              </button>
            )}
          </>
        )}

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
        {/*{activeModal === 'recharge' && <RechargeCreditsModal onClose={() => setActiveModal(null)} />}*/}
        {activeModal === 'becomeStrategist' && <BecomeStrategistModal onClose={() => setActiveModal(null)} />}

        {activeModal === 'login' && (
          <LoginModal 
            onLoginSuccess={onLoginSuccess} 
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
      </div>
    </div>
  );
}
