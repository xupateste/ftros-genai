// src/pages/ProductLandingPage.jsx

import React, { useState } from 'react';
import { FiLogIn } from 'react-icons/fi';

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

export const ProductLandingPage = ({ title, subtitle, ctaText, reportType, onAnalyze, onLoginClick }) => {
  const [ventasFile, setVentasFile] = useState(null);
  const [inventarioFile, setInventarioFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isStarted, setIsStarted] = useState(false);;
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false); // <-- Nuevo estado
  const [errorState, setErrorState] = useState(false);
  const [isRechargeModalOpen, setIsRechargeModalOpen] = useState(false);

  // Nuevo: Estado para manejar la UI de cada importador
  const [ventasStatus, setVentasStatus] = useState({ status: 'idle', metadata: null });
  const [inventarioStatus, setInventarioStatus] = useState({ status: 'idle', metadata: null });

  const handleFileProcessed = (file, fileType) => {
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
    setVentasFile(null);
    setInventarioFile(null);
    setVentasStatus({ status: 'idle', metadata: null });
    setInventarioStatus({ status: 'idle', metadata: null });
    setErrorState(false);
    setIsLoading(false);
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
                {errorState ? (
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
                )}
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