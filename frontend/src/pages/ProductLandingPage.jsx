// src/pages/ProductLandingPage.jsx

import React, { useState } from 'react';
import { FiLogIn, FiInfo, FiRefreshCw, FiMessageCircle, FiLoader } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa'
import axios from 'axios';

// Asumiendo que estos componentes existen y están estilizados
import CsvImporterComponent from '../assets/CsvImporterComponent';
import templateVentas from '../assets/templateVentas';
import templateStock from '../assets/templateStock';
// import CsvDropZone from '../assets/CsvDropZone'; 
// import CsvDropZone2 from '../assets/CsvDropZone2';
import { PricingTiers } from '../components/PricingTiers';
import { FeaturesSection } from '../components/FeaturesSection';
import { NeedMoreSection } from '../components/NeedMoreSection';
import { FerreterosLogo } from '../components/FerreterosLogo'
import { PrivacyPolicyModal } from '../components/PrivacyPolicyModal'
// import { FaqSection } from '../components/FaqSection'; // Placeholder
// import { Footer } from '../components/Footer'; // Placeholder
import { RechargeProModal } from '../components/RechargeProModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const FeedbackPanel = ({ type, message, onReset, onWhatsApp }) => {
    if (type === 'idle' || type === 'loading') return null;

    const baseClasses = "text-center p-4 mb-6 rounded-lg border max-w-xl mx-auto animate-fade-in";
    const config = {
        'success_empty': {
            icon: <FiInfo className="text-green-500 text-5xl mx-auto mb-2" />,
            classes: "bg-green-50 border-green-200 text-green-800",
            buttonText: "Cargar otros archivos",
            buttonAction: onReset,
            buttonIcon: <FiRefreshCw />
        },
        'error': {
            icon: <FiInfo className="text-blue-500 text-5xl mx-auto mb-2" />,
            classes: "bg-blue-50 border-blue-200 text-blue-800",
            buttonText: "Cargar otros archivos",
            buttonAction: onReset,
            buttonIcon: <FiRefreshCw />
        },
        'error_support': {
            icon: <FiMessageCircle className="text-red-500 text-5xl mx-auto mb-2" />,
            classes: "bg-red-50 border-red-200 text-red-800",
            buttonText: "Hablar con un especialista",
            buttonAction: onWhatsApp,
            buttonIcon: <FaWhatsapp />
        }
    };

    const currentConfig = config[type];
    if (!currentConfig) return null;

    return (
        <div className={`${baseClasses} ${currentConfig.classes}`}>
            {currentConfig.icon}
            <p className="font-semibold mb-4 whitespace-pre-wrap">{message}</p>
            <button
                onClick={currentConfig.buttonAction}
                className="bg-white text-gray-700 font-bold py-2 px-4 mx-auto rounded-lg shadow border hover:bg-gray-50 flex items-center justify-center gap-2"
            >
                {currentConfig.buttonIcon}
                {currentConfig.buttonText}
            </button>
        </div>
    );
};


export const ProductLandingPage = ({ title, subtitle, ctaText, reportType, onAnalyze, onLoginClick, onLimitExceeded }) => {
  const [ventasFile, setVentasFile] = useState(null);
  const [inventarioFile, setInventarioFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: 'idle', message: '' });
  const [errorCount, setErrorCount] = useState(0);

  const [isStarted, setIsStarted] = useState(false);;
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false); // <-- Nuevo estado
  const [errorState, setErrorState] = useState(false);
  const [isRechargeModalOpen, setIsRechargeModalOpen] = useState(false);

  // Nuevo: Estado para manejar la UI de cada importador
  const [ventasStatus, setVentasStatus] = useState({ status: 'idle', metadata: null });
  const [inventarioStatus, setInventarioStatus] = useState({ status: 'idle', metadata: null });

  const handleFileProcessed = (file, fileType) => {
    handleReset(); 
    if (fileType === 'ventas') {
      setVentasFile(file);
      // Aquí podrías procesar metadata si el backend la devolviera tras un pre-análisis
      setVentasStatus({ status: 'success', metadata: { num_transacciones: '1,234' } }); // Metadata de ejemplo
    } else if (fileType === 'inventario') {
      setInventarioFile(file);
      setInventarioStatus({ status: 'success', metadata: { num_skus_unicos: '567' } }); // Metadata de ejemplo
    }
  };

  const handleReset = () => {
    // setVentasFile(null);
    // setInventarioFile(null);
    // setVentasStatus({ status: 'idle', metadata: null });
    // setInventarioStatus({ status: 'idle', metadata: null });
    // setErrorState(false);
    // setIsLoading(false);
    setFeedback({ type: 'idle', message: '' });
  };

  const handleWhatsAppContact = () => {
    // Reutiliza la lógica del modal de recarga para abrir WhatsApp
    const WHATSAPP_NUMBER = '51930240108'; // Reemplaza con tu número
    const message = `Hola, estoy intentando analizar mis archivos para el reporte de '${ctaText}' y necesito ayuda con el formato.`;
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };


  // const handleAnalyzeClick = () => {
  //   if (ventasFile && inventarioFile) {
  //     setIsLoading(true);
  //     onAnalyze({
  //       reportType,
  //       ventasFile,
  //       inventarioFile,
  //     });
  //   } else {
  //     alert("Por favor, carga ambos archivos para continuar.");
  //   }
  // };

  const handleAnalyzeClick = async () => {
    if (!ventasFile || !inventarioFile) {
      alert("Por favor, carga ambos archivos para continuar.");
      return;
    }

    setIsLoading(true);
    setErrorState(false);

    try {
      // Esperamos a que la función onAnalyze (de App.jsx) termine.
      await onAnalyze({
        reportType,
        ventasFile,
        inventarioFile,
      });
      // Si tiene éxito, la app navega a otra vista, así que no necesitamos
      // hacer setIsLoading(false) aquí.

    } catch (error) {
      // Si onAnalyze lanza un error, lo atrapamos aquí.
      console.error("Error capturado en ProductLandingPage:", error);
      setErrorState(true); // Activamos el estado de error.
    
    } finally {
      // Esto se ejecuta siempre, tanto en éxito como en error.
      // Es importante para detener el spinner si hay un fallo.
      setIsLoading(false);
    }
  };

  const handleValidationClick = async () => {
    if (!ventasFile || !inventarioFile) {
      alert("Por favor, carga ambos archivos para continuar.");
      return;
    }

    setIsLoading(true);
    setFeedback({ type: 'loading', message: 'Validando archivos...' });

    const formData = new FormData();
    formData.append("ventas_file", ventasFile);
    formData.append("inventario_file", inventarioFile);
    formData.append("report_type", reportType);

    try {
      const response = await axios.post(`${API_URL}/api/v1/anonymous-validate`, formData);
      const { status, message } = response.data;
      
      switch (status) {
        case 'VALIDATION_SUCCESS':
          setErrorCount(0);
          setFeedback({ type: 'success', message: '¡Validación exitosa! Generando tu análisis completo...' });
          // Llamamos a la función de ejecución final que nos pasaron desde App.jsx
          await onAnalyze({ reportType, ventasFile, inventarioFile });
          break;
        
        case 'EMPTY_RESULT':
        case 'VALIDATION_ERROR':
          const newErrorCount = errorCount + 1;
          setErrorCount(newErrorCount);

          if (newErrorCount >= 2) {
            setFeedback({
              type: 'error_support',
              message: "No pudimos obtener un resultado con esos archivos. ¿Podrías revisarlos e intentarlo de nuevo?"
            });
          } else {
            const type = status === 'EMPTY_RESULT' ? 'success_empty' : 'error';
            const defaultMessage = "No pudimos obtener un resultado con esos archivos. ¿Podrías revisarlos e intentarlo de nuevo?";
            setFeedback({ type, message: message || defaultMessage });
          }
          break;
        
        default:
          throw new Error("Respuesta desconocida del servidor");
      }
    } catch (error) {
      console.error("Error en el pre-flight check:", error);
      
      if (error.response?.status === 429) {
        onLimitExceeded();
      } else {
        // --- LÓGICA DE DOS TIEMPOS AÑADIDA AQUÍ ---
        const newErrorCount = errorCount + 1;
        setErrorCount(newErrorCount);

        if (newErrorCount >= 2) {
            setFeedback({
                type: 'error_support',
                message: "Sabemos que puede ser frustrante. ¿Te gustaría que un especialista revise tus archivos contigo? Estamos para ayudarte."
            });
        } else {
            setFeedback({
                type: 'error',
                message: "No pudimos obtener un resultado con esos archivos. ¿Podrías revisarlos e intentarlo de nuevo?"
            });
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-white">
      {/* Hero y Herramienta */}
      <div className="border-b-1 border-gray-800 bg-black">
        <div className="container md:max-w-5xl mx-auto flex justify-between gap-4 py-4 px-4 md:px-0">
          {/*<h1 className="text-3xl md:text-4xl font-bold text-white">
              <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(to right, #560bad, #7209b7, #b5179e)' }}>Ferretero.IA</span>
          </h1>*/}
          <img onClick={() => window.open('/', '_self')} src="/ferreteros-app-standalone.png" className="max-h-8 opacity-90 cursor-pointer"/>
          <button 
            onClick={ onLoginClick } 
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            <FiLogIn /> Iniciar Sesión
          </button>
        </div>
      </div>
      <div className="pt-12 pb-16 text-center bg-gradient-to-b from-black to-gray-900">
        <div className="container mx-auto px-4">
          <h1 className="antialiased text-3xl md:text-4xl mx-auto max-w-5xl text-left font-bold mb-4">
            {title}
          </h1>
          <p className="antialiased text-lg md:text-xl text-gray-300 max-w-5xl text-left mx-auto mb-8">
            {subtitle}
          </p>
          <div className="max-w-5xl min-h-80 mx-auto flex flex-col justify-center items-center bg-gray-800/50 p-6 rounded-xl shadow-2xl">
            { isStarted ? 
              <>
                <div className='grid md:grid-cols-2 gap-6 mb-6 w-full'>
                  <CsvImporterComponent 
                    fileType="inventario"
                    title="Stock Actual"
                    template={templateStock}
                    onFileProcessed={handleFileProcessed}
                    uploadStatus={inventarioStatus.status}
                    metadata={inventarioStatus.inventario}
                  />
                  <CsvImporterComponent 
                    fileType="ventas"
                    title="Historial de Ventas"
                    template={templateVentas}
                    onFileProcessed={handleFileProcessed}
                    uploadStatus={ventasStatus.status}
                    metadata={ventasStatus.ventas}
                  />
                </div>
                {/*{errorState ? (
                  <button
                    onClick={handleReset}
                    className="w-full md:w-auto bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-12 rounded-lg text-lg transition duration-300"
                  >
                    Ocurrió un Error. Empezar de Nuevo
                  </button>
                ) : (
                  <button
                    onClick={handleAnalyzeClick}
                    disabled={!ventasFile || !inventarioFile || isLoading}
                    className="w-full md:w-auto bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-12 rounded-lg text-lg transition duration-300 ease-in-out disabled:bg-gray-500 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Procesando...' : ctaText}
                  </button>
                )}*/}
                <FeedbackPanel 
                  type={feedback.type} 
                  message={feedback.message}
                  onReset={handleReset}
                  onWhatsApp={handleWhatsAppContact}
                />
                <button
                  onClick={handleValidationClick}
                  disabled={!ventasFile || !inventarioFile || isLoading}
                  className="w-full md:w-auto bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-12 rounded-lg text-lg ... disabled:bg-gray-500"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <FiLoader className="animate-spin" />
                      <span>{feedback.message}</span>
                    </div>
                  ) : (
                    ctaText
                  )}
                </button>
              </>
              :
              <button className="min-w-60 max-w-96 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-10 mx-10 rounded-lg text-xl min-h-16 transition duration-300 ease-in-out" onClick={() => setIsStarted(true)}>
                Click para iniciar el Análisis!
              </button>
            }
          </div>
        </div>
      </div>
      
      {/* Sección de Planes */}
      <FeaturesSection />
      <PricingTiers onSubscribeClick={() => setIsRechargeModalOpen(true)} />
      <NeedMoreSection />

      <footer className="bg-gray-900 text-center py-8 bg-opacity-60 border-t border-gray-800">
        <p className="text-gray-500">&copy; 2025 Ferreteros.app - Todos los derechos reservados.</p>

        <p onClick={() => setIsPrivacyModalOpen(true)} className="text-gray-500 hover:text-gray-50 cursor-pointer hover:underline transition-colors">
            Política de Privacidad
        </p>
        <FerreterosLogo/>
      </footer>

      {/* Otras secciones (placeholders) */}
      {/* <FaqSection /> */}
      {/* <Footer /> */}
      <PrivacyPolicyModal isOpen={isPrivacyModalOpen} onClose={() => setIsPrivacyModalOpen(false)} /> {/* <-- Nuevo Modal */}
      {isRechargeModalOpen && (
        <RechargeProModal onClose={() => setIsRechargeModalOpen(false)} />
      )}
    </div>
  );
};