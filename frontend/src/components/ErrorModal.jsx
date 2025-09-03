/*
================================================================================
|                                                                              |
| 📂 components/ErrorModal.jsx (NUEVO)                                         |
|                                                                              |
| Este es el nuevo modal para gestionar los errores del servidor de forma      |
| empática, ofreciendo opciones claras al usuario.                             |
|                                                                              |
================================================================================
*/

import React, { useState, useEffect } from 'react';
import { FiRefreshCw, FiSend } from 'react-icons/fi';


export function ErrorModal ({ isOpen, onClose, onRetry, errorContext }) {
    const [step, setStep] = useState(1);

    // Resetea al primer paso cuando el modal se cierra y se vuelve a abrir.
    useEffect(() => {
        if (isOpen) {
            setStep(1);
        }
    }, [isOpen]);

    if (!isOpen) {
        return null;
    }

    const WHATSAPP_NUMBER = "51930240108"; // <-- REEMPLAZA con tu número de WhatsApp de soporte

    const generateWhatsAppMessage = () => {
        const message = `Hola equipo de Ferreteros.app,\nNecesito asistencia. Tuve un error al generar mi auditoría.\n\n- Usuario: ${errorContext?.userName}\n- Fecha y Hora: ${errorContext?.timestamp}\n- ID de Error: ${errorContext?.errorId}\n\n¡Gracias por su ayuda!`;
        return encodeURIComponent(message);
    };

    const whatsappLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${generateWhatsAppMessage()}`;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4" aria-modal="true">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all" role="dialog">
                
                {/* Vista del Paso 1: Diagnóstico y Opciones */}
                {step === 1 && (
                    <div className="p-8 text-center">
                        <div className="mx-auto flex items-center justify-center h-24 w-24 text-6xl rounded-full bg-yellow-100 mb-4">
                            ⚠️
                        </div>
                        <h3 className="text-2xl font-bold text-gray-800">Hubo un problema</h3>
                        <p className="text-gray-600 mt-2">
                            Lo sentimos, pero no te preocupes. A veces la tecnología tiene sus tropiezos.
                            ¿Qué te gustaría hacer?
                        </p>
                        <div className="mt-8 flex flex-col sm:flex-row gap-4">
                            <button
                                onClick={onRetry}
                                className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-3 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm"
                            >
                                <FiRefreshCw className="mr-2 h-5 w-5"/>
                                Reintentar
                            </button>
                            <button
                                onClick={() => setStep(2)}
                                className="w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-3 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm"
                            >
                                 <FiSend className="mr-2 h-5 w-5"/>
                                Solicitar Asistencia
                            </button>
                        </div>
                        <button onClick={onClose} className="mt-6 text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
                    </div>
                )}

                {/* Vista del Paso 2: Solicitar Asistencia */}
                {step === 2 && (
                     <div className="p-8">
                        <div className="text-center">
                            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                                <FiSend className="h-8 w-8 text-green-500" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-800">Contacta a un especialista</h3>
                            <p className="text-gray-600 mt-2">
                                Hemos preparado un mensaje con los detalles de este error para que nuestro equipo pueda ayudarte rápidamente.
                            </p>
                        </div>

                        <div className="mt-6 bg-gray-50 p-4 rounded-lg border text-left">
                            <p className="text-sm font-semibold text-gray-700">Mensaje a enviar:</p>
                            <pre className="mt-2 text-xs text-gray-600 whitespace-pre-wrap font-sans">
                                {`Hola equipo de Ferreteros.app,\nNecesito asistencia. Tuve un error al generar mi auditoría.\n\n- Usuario: ${errorContext?.userName}\n- Fecha y Hora: ${errorContext?.timestamp}\n- ID de Error: ${errorContext?.errorId}\n\n¡Gracias por su ayuda!`}
                            </pre>
                        </div>
                        
                        <div className="mt-8">
                            <a
                                href={whatsappLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-3 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:text-sm"
                            >
                                Enviar por WhatsApp
                            </a>
                        </div>
                        <button onClick={() => setStep(1)} className="mt-4 text-sm text-gray-500 hover:text-gray-700 w-full text-center">
                           ← Volver
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
};