// src/components/UpgradeModal.jsx

import React from 'react';
import { useWorkspace } from '../context/WorkspaceProvider'; // Importamos el hook para obtener el usuario
import { FiUserPlus, FiAward, FiX, FiLock, FiCheckCircle, FiExternalLink } from 'react-icons/fi';

// --- Sub-componente para cada Beneficio ---
const BenefitItem = ({ icon, text }) => (
    <li className="flex items-start gap-3">
        <FiCheckCircle className="text-green-500 mt-1 flex-shrink-0"/>
        <span className="text-gray-600">{text}</span>
    </li>
);

// --- Función Auxiliar para Abrir el Formulario ---
// Esta función construye la URL y abre el formulario en una nueva pestaña.
// const openVerificationForm = (userEmail) => {
//   // --- ¡CONFIGURACIÓN IMPORTANTE! ---
//   // Reemplaza estos valores con los de tu propio Google Form.
//   const GOOGLE_FORM_ID = "1FAIpQLScRhAM5M5_rAnTU9X_giZYH1ZrDBrR0ME_vKp8dcJ9DrrkSww"; // Ej: 1FAIpQLSc...
//   const EMAIL_FIELD_ID = "entry.1889241237"; // Ej: entry.123456789

//   // Construimos la URL base
//   const formUrl = `https://docs.google.com/forms/d/e/${GOOGLE_FORM_ID}/viewform`;
  
//   // Creamos un objeto URL para añadir los parámetros de forma segura
//   const urlWithParams = new URL(formUrl);
//   if (userEmail) {
//     urlWithParams.searchParams.append(EMAIL_FIELD_ID, userEmail);
//   }

//   // Abrimos la URL final en una nueva pestaña
//   window.open(urlWithParams.toString(), '_blank');
// };


export function UpgradeModal({ context, reportItem, onAction, onClose, onBecomeStrategist }) {
  // Obtenemos el usuario del contexto para poder pre-llenar su email
  const { user } = useWorkspace();

  // Definimos el contenido para cada tipo de usuario
  const content = {
    anonymous: {
      icon: <FiUserPlus className="text-5xl text-purple-500 mx-auto mb-4" />,
      title: "Desbloquea Reportes Estratégicos",
      benefits: [
        "Accede a este y otros análisis Pro.",
        "Guarda tu historial y todos tus reportes.",
        "Organiza tu negocio en múltiples espacios de trabajo."
      ],
      ctaText: "Registrarme y Desbloquear",
      action: 'register'
    },
    user: {
      icon: <FiAward className="text-5xl text-yellow-500 mx-auto mb-4" />,
      title: "Accede al Siguiente Nivel",
      benefits: [
          "Desbloquea reportes de Inteligencia de Mercado.",
          "Compara tu rendimiento con el de otros ferreteros.",
          "Obtén una ventaja competitiva con datos exclusivos."
      ],
      ctaText: "Afiliarme",
      action: 'verify'
    }
  };

  const currentContent = content[context.type] || content.anonymous;

  // --- Función de Manejo de Acción ---
  const handleActionClick = () => {
    if (currentContent.action === 'verify') {
      // Si la acción es verificar, abrimos el formulario
      // openVerificationForm(user?.email);
      onClose(); // Cerramos el modal
      onBecomeStrategist();
    } else {
      // Para otras acciones (como 'register'), notificamos al componente padre
      onAction(currentContent.action);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4 animate-fade-in-fast">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full flex flex-col max-h-[95vh]">
        
        {/* --- ENCABEZADO --- */}
        <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white">
            <div className="flex items-center gap-3">
                {context.type === 'user' ? <FiAward className="text-yellow-500" /> : <FiUserPlus className="text-purple-500" />}
                <h2 className="text-xl font-bold text-gray-800">{currentContent.title}</h2>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700"><FiX size={26}/></button>
        </div>

        {/* --- CUERPO DEL MODAL --- */}
        <div className="overflow-y-auto p-6 text-gray-700">
            {/* --- El "Ancla" Contextual Mejorada --- */}
            {/*<div className="mb-6 p-3 bg-gray-100 border border-gray-200 rounded-lg text-center">*/}
                <p className="text-xs text-gray-500 w-full text-center">Para acceder a:</p>
                <button
                  onClick={() => {}} 
                  className="relative w-full text-left p-4 text-xs rounded-lg  transform scale-80 group bg-gray-700 text-gray-400 border border-2 border-purple-800 hover:cursor-not-allowed"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">{reportItem.label}</span>
                    <FiAward className="text-yellow-500" />
                  </div>
                  <p className="text-xs text-purple-400 mt-1">Función Avanzada</p>
                </button>
            {/*</div>*/}

            {/* --- Lista de Beneficios --- */}
            <div className="text-left mb-6 mt-2">
                <p className="text-gray-800 mb-4 w-full text-center font-bold">
                    {context.type === 'anonymous' 
                        ? "Crea tu cuenta gratuita" 
                        : "Conviértete en Ferretero Estratega"}
                </p>
                <ul className="space-y-2 text-sm">
                    {currentContent.benefits.map((benefit, i) => (
                        <BenefitItem key={i} text={benefit} />
                    ))}
                </ul>
            </div>
        </div>

        {/* --- FOOTER CON LLAMADO A LA ACCIÓN --- */}
        <div className="p-4 border-t bg-gray-50 sticky bottom-0">
            <button 
                onClick={handleActionClick} 
                className={`w-full bg-purple-600 text-lg ${currentContent.action === 'verify' ? "text-black" :"text-white"} font-bold py-3 px-4 rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2`}
                style={currentContent.action === 'verify' ? {
                        backgroundImage: 'linear-gradient(297deg, #E5C100, #FFFFD6, #FFD700, #FFFFD6, #E5C100)',
                      } : {}}
            >
                {/* Añadimos un icono diferente para la acción de verificar */}
                {currentContent.action === 'verify' ? <FiExternalLink /> : <FiUserPlus />}
                {currentContent.ctaText}
            </button>
            <button onClick={onClose} className="text-sm text-gray-500 text-center w-full hover:text-gray-800 mt-3">
                Quizás más tarde
            </button>
        </div>

      </div>
    </div>
  );
}
