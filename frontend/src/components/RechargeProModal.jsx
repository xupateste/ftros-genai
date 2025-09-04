// src/components/RechargeProModal.jsx

import React, { useState } from 'react';
import { FiX, FiCheckCircle } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';

const plans = [
  { id: 'basic', title: 'Inicio', credits: 600, price: 20.00 },
  { id: 'popular', title: 'Pro', credits: 1200, price: 35.00 },
  { id: 'intensive', title: 'Avanzado', credits: 2600, price: 65.00 },
];

// --- NUEVO: Configura aquí tu número de WhatsApp ---
// Incluye el código de país (ej. 51 para Perú) sin el símbolo '+'
const WHATSAPP_NUMBER = '51930240108'; 


export const RechargeProModal = ({ onClose }) => {
  const [selectedPlanId, setSelectedPlanId] = useState('popular');

  const selectedPlan = plans.find(p => p.id === selectedPlanId);

  // --- NUEVA FUNCIÓN para generar el enlace de WhatsApp ---
  const handleProceedToCorporate = () => {
    const messageCorporate = `Hola, estoy interesado en conocer más sobre el *Plan Corporativo*. Entiendo que ofrecen paquetes más grandes y personalizados, y me gustaría ver las opciones disponibles para mi empresa.\n\n¿Podrías brindarme más detalles?`;
      const encodedMessageCorporate = encodeURIComponent(messageCorporate);
      const whatsappUrlCorporate = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessageCorporate}`;
      window.open(whatsappUrlCorporate, '_blank');
  }
  
  const handleProceedToPayment = () => {
    if (!selectedPlan) return;

    // 1. Construimos el mensaje pre-cargado
    const message = `Hola, estoy interesado en contratar el *Plan ${selectedPlan.title}* (${selectedPlan.credits} Créditos) por *S/ ${selectedPlan.price.toFixed(2)}.* \n\nPor favor, indícame los siguientes pasos para el pago.`;
    
    // 2. Codificamos el mensaje para que sea seguro en una URL
    const encodedMessage = encodeURIComponent(message);
    
    // 3. Creamos el enlace final
    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`;
    
    // 4. Abrimos el enlace en una nueva pestaña
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-lg max-w-md w-full shadow-2xl relative">

        <div className="p-5 border-b text-center">
          <h2 className="text-2xl font-bold text-gray-800">Planes de Créditos</h2>
          <p className="text-gray-500 mt-1">Desbloquea resultados ilimitados.</p>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            {plans.map((plan) => (
              <div
                key={plan.id}
                onClick={() => setSelectedPlanId(plan.id)}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 relative ${selectedPlanId === plan.id ? 'border-purple-600 ring-2 ring-purple-300' : 'border-gray-200 hover:border-purple-400'}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 right-4 bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                    MÁS POPULAR
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-lg text-gray-800">{plan.title}</h3>
                    <p className="text-sm text-gray-500">
                      {plan.credits} Créditos / mes
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-purple-700">S/ {plan.price.toFixed(2)}</p>
                    {selectedPlanId === plan.id && (
                      <button onClick={handleProceedToPayment} className="px-4 py-1 rounded-xl text-lg font-bold bg-purple-600 hover:bg-purple-700">
                        Comprar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div
              key={'enterprise'}
              onClick={() => setSelectedPlanId('enterprise')}
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 relative ${selectedPlanId === 'enterprise' ? 'border-purple-600 ring-2 ring-purple-300' : 'border-gray-200 hover:border-purple-400'}`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-lg text-gray-800">Corporativo</h3>
                  <p className="text-sm text-gray-500">
                    ¿Necesitas más?
                  </p>
                </div>
                <div className="text-right">
                  {selectedPlanId === 'enterprise' ?
                    <button onClick={handleProceedToCorporate} className={`px-4 py-1 font-bold text-lg rounded-xl ${selectedPlanId === 'enterprise' ? 'bg-purple-500 hover:bg-purple-600' : 'bg-gray-500 hover:bg-gray-600 disabled'}`}>
                      Contáctanos
                    </button>
                  : <h3 className="text-lg font-bold text-purple-700">Contáctanos</h3>
                }
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-500">
              *Créditos no acumulables. Se renuevan cada mes.
            </p>
          </div>
        </div>

        {/*<div className="px-6 py-4 bg-gray-50 border-t rounded-b-lg">
          <button
            onClick={handleProceedToPayment}
            className="w-full bg-green-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-600 transition-transform transform hover:scale-105 flex items-center justify-center gap-3"
          >
            <FaWhatsapp size={20} />
            Coordinar por WhatsApp
          </button>
          <p className="text-xs text-center text-gray-400 mt-3">Serás redirigido a WhatsApp para completar tu compra.</p>
        </div>*/}
        
        <button onClick={onClose} className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 p-2 rounded-full">
          <FiX size={24} />
        </button>
      </div>
    </div>
  );
};