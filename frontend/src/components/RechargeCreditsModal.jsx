// src/components/RechargeCreditsModal.jsx

import React, { useState } from 'react';
// import { useAuth } from '../context/AuthContext'; // Asumiendo que tienes un AuthContext
import { FiX, FiCreditCard, FiCheckCircle, FiArrowLeft, FiAward, FiArrowRight} from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';

const PLANS = [
  { credits: 210, price: 20, features: ["Ideal para diagnósticos puntuales", "Acceso a todos los reportes básicos"], id: 'plan_210' },
  { credits: 410, price: 35, features: ["Perfecto para meses de análisis regular", "Optimiza tus compras semanales"], id: 'plan_410' },
  { credits: 1020, price: 65, features: ["La mejor opción para análisis trimestrales", "Soporte prioritario por correo"], id: 'plan_1020' },
  { credits: 3010, price: 101, features: ["Para negocios de alto volumen", "Consultoría de datos incluida"], id: 'plan_3010' },
  { credits: 7010, price: 201, features: ["Para negocios de alto volumen", "Consultoría de datos incluida"], id: 'plan_7010' },
  { credits: 10010, price: 290, features: ["Para negocios de alto volumen", "Consultoría de datos incluida"], id: 'plan_10010' },
  { 
    isStrategist: true, 
    credits: 'CRÉTIDOS ILIMITADOS', 
    price: '+Beneficios', 
    features: ["Acceso a Inteligencia de Mercado", "Gráficos de Benchmarking", "Funciones avanzadas"], 
    id: 'plan_strategist' 
  },
];

export function RechargeCreditsModal({ onClose, onBecomeStrategist }) {
  // const { user } = useAuth(); // Obtenemos el email del usuario del contexto
  const [view, setView] = useState('plans'); // 'plans' o 'whatsapp'
  const [selectedPlan, setSelectedPlan] = useState(null);

  const handleSelectPlan = (plan) => {
    if (plan.isStrategist) {
      onBecomeStrategist();
    } else {
      setSelectedPlan(plan);
      setView('whatsapp');
    }
  };

  const handleSendWhatsApp = () => {
    const message = `Hola Ferretero.IA,\n\nQuiero comprar el Plan de ${selectedPlan.credits} Créditos por S/ ${selectedPlan.price}.\n\nMi correo de usuario es: ${'user.email'}.\n\nPor favor, envíenme las instrucciones para completar el pago.`;
    const whatsappUrl = `https://wa.me/51930240108?text=${encodeURIComponent(message)}`; // Reemplaza con tu número de WhatsApp
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full flex flex-col max-h-[90vh]">
        <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white">
          <h2 className="text-xl font-bold text-gray-800">
            {view === 'plans' ? 'Elige tu Paquete de Créditos' : 'Confirma tu Compra'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700"><FiX size={26}/></button>
        </div>

        {view === 'plans' && (
          <div className="p-6">
            <p className="text-gray-600 mb-6">Has agotado tus créditos. Adquiere un paquete para seguir generando análisis ilimitados de tus datos.</p>
            <div className="flex gap-4 pb-4 overflow-x-auto">
              {PLANS.map(plan => (
                <div key={plan.id} className={`flex-shrink-0 w-64 border-2 rounded-lg p-6 flex flex-col ${plan.isStrategist ? 'border-yellow-400' : 'border-gray-200 hover:border-purple-500'}`}>
                  <div className={`bg-purple-100 font-bold text-md mb-2 rounded-md py-1 text-center ${plan.isStrategist ? 'text-yellow-500' : 'text-purple-700'}`}>
                    {plan.isStrategist && <FiAward className="inline mr-2"/> }{plan.credits} {plan.isStrategist ? '' : 'CRÉDITOS'} {!plan.isStrategist && '🪙'}
                  </div>
                  <p className={`text-4xl font-bold text-gray-800 mb-4 text-center ${plan.isStrategist && 'text-2xl'}`}>{plan.isStrategist ? plan.price : `S/ ${plan.price}`}</p>
                  <ul className="text-sm text-gray-600 space-y-2 mb-6 flex-grow">
                    {plan.features.map((feature, i) => <li key={i} className="flex items-start gap-2"><FiCheckCircle className="text-green-500 mt-1 flex-shrink-0"/><span>{feature}</span></li>)}
                  </ul>
                  {!plan.isStrategist ? (
                    <button onClick={() => handleSelectPlan(plan)} className={`w-full font-bold py-2 px-4 rounded-lg bg-purple-600 hover:bg-purple-700 text-white`}
                      style={{
                        backgroundImage: 'linear-gradient(to right, #560bad, #7209b7, #b5179e)',
                      }}
                    >
                      Comprar Plan
                    </button>
                  ) : (
                    <button
                      onClick={ () => {} }
                      className="flex items-center justify-center gap-2 mt-2 w-full text-gray-700 px-4 text-lg py-2 font-bold rounded-lg hover:text-gray-800"
                      style={{
                        backgroundImage: 'linear-gradient(297deg, #E5C100, #FFFFD6, #FFD700, #FFFFD6, #E5C100)',
                      }}
                    >
                      <span>Afiliarme</span><FiArrowRight />
                    </button>
                  )}
                </div>
              ))}
            </div>
              <p className="text-gray-600 mb-6 text-center">Los créditos nunca expiran</p>
           <div className="flex flex-col gap-3">
              <button onClick={ onClose } className="flex-1 flex items-center justify-center gap-2 text-gray-700 bg-gray-200 font-bold py-3 px-4 rounded-lg hover:bg-gray-300">
                <FiArrowLeft /> Regresar
              </button>
            </div>
          </div>
        )}

        {view === 'whatsapp' && selectedPlan && (
          <div className="p-6 text-center">
            <h3 className="text-lg font-semibold text-gray-800">Mensaje de Confirmación</h3>
            <p className="text-sm text-gray-500 mb-4">Revisa el mensaje y haz clic para enviarlo por WhatsApp.</p>
            <div className="p-4 bg-green-100 border rounded-lg text-left text-sm text-gray-700 whitespace-pre-wrap mb-4 font-mono">
              {`Hola Ferretero.IA,\n\nQuiero comprar el Plan de ${selectedPlan.credits} Créditos por S/ ${selectedPlan.price}.\n\nMi correo de usuario es: ${'user.email'}.\n\nPor favor, envíenme las instrucciones para completar el pago.`}
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <button onClick={handleSendWhatsApp} className="flex-1 py-4 flex items-center justify-center gap-2 bg-green-500 text-white font-bold text-lg py-3 px-4 rounded-lg hover:bg-green-600">
                <FaWhatsapp size={24}/> Enviar Mensaje
              </button>
              <button onClick={() => setView('plans')} className="flex-1 flex items-center justify-center gap-2 text-gray-700 bg-gray-200 font-bold py-3 px-4 rounded-lg hover:bg-gray-300">
                <FiArrowLeft /> Elegir otro plan
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
