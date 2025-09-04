// src/components/RechargeCreditsModal.jsx

import React, { useState, useEffect } from 'react';
// import { useAuth } from '../context/AuthContext'; // Asumiendo que tienes un AuthContext
import { FiX, FiCreditCard, FiCheckCircle, FiArrowLeft, FiAward, FiArrowRight, FiAlertTriangle, FiExternalLink } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import { useWorkspace } from '../context/WorkspaceProvider'; // <-- Usamos el hook correcto

const PLANS = [
  { credits: 50, price: 3, features: ["Ideal para diagnósticos puntuales", "Acceso a todos los reportes básicos"], id: 'plan_50' },
  { credits: 90, price: 5, features: ["Ideal para diagnósticos puntuales", "Acceso a todos los reportes básicos"], id: 'plan_90' },
  { credits: 190, price: 10, features: ["Ideal para diagnósticos puntuales", "Acceso a todos los reportes básicos"], id: 'plan_190' },
  { credits: 400, price: 20, features: ["Ideal para diagnósticos puntuales", "Acceso a todos los reportes básicos"], id: 'plan_400' },
  { credits: 780, price: 35, features: ["Perfecto para meses de análisis regular", "Optimiza tus compras semanales"], id: 'plan_780' },
  { credits: 1570, price: 65, features: ["La mejor opción para análisis trimestrales", "Soporte prioritario por correo"], id: 'plan_1570' },
  { credits: 2640, price: 101, features: ["Para negocios de alto volumen", "Consultoría de datos incluida"], id: 'plan_2640' },
  { credits: 6040, price: 201, features: ["Para negocios de alto volumen", "Consultoría de datos incluida"], id: 'plan_6040' },
  { credits: 10010, price: 290, features: ["Para negocios de alto volumen", "Consultoría de datos incluida"], id: 'plan_10010' },
  { 
    isStrategist: true, 
    credits: 'CRÉTIDOS ILIMITADOS', 
    price: '+Beneficios', 
    features: ["Analisis Personalizados", "Gráficos de Benchmarking", "Funciones avanzadas"], 
    id: 'plan_strategist' 
  },
];

export function RechargeCreditsModal({ contexto, onClose, onBecomeStrategist }) {
  // const { user } = useAuth(); // Obtenemos el email del usuario del contexto
  const [view, setView] = useState('loading'); // 'plans' o 'whatsapp'
  const [selectedPlan, setSelectedPlan] = useState(null);
  const { user } = useWorkspace(); 

   useEffect(() => {
    if (contexto.type === 'insufficient') {
      setView('confirmation');
    } else {
      setView('plans');
    }
  }, [contexto]);

  const handleSelectPlan = (plan) => {
    if (plan.isStrategist) {
      // openVerificationForm(user?.email);
      onClose();
      onBecomeStrategist();
    } else {
      setSelectedPlan(plan);
      setView('whatsapp');
    }
  };

  const handleSendWhatsApp = () => {
    const message = `Hola Ferreteros.app,\n\nQuiero comprar el Plan de ${selectedPlan.credits} Créditos por S/ ${selectedPlan.price}.\n\nMi correo de usuario es: ${user.email}.\n\nPor favor, envíenme las instrucciones para completar el pago.`;
    const whatsappUrl = `https://wa.me/51930240108?text=${encodeURIComponent(message)}`; // Reemplaza con tu número de WhatsApp
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className={`bg-white rounded-lg shadow-xl ${view === 'confirmation' ? "max-w-2xl" : "max-w-4xl"} w-full flex flex-col max-h-[90vh]`}>
        <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white">
          <h2 className="text-xl font-bold text-gray-800">
            {view === 'confirmation' && '¡Estás a un paso de tu análisis!'}
            {view === 'plans' && 'Elige tu Paquete de Créditos'}
            {view === 'whatsapp' && 'Confirma tu Compra'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700"><FiX size={26}/></button>
        </div>

        {/* --- VISTA 1: CONFIRMACIÓN (SI VIENE DE UN REPORTE) --- */}
        {view === 'confirmation' && (
          <div className="p-8 text-center">
            <div className="text-8xl text-yellow-500 mx-auto mb-4">👛</div>
            <h3 className="text-xl font-bold text-gray-800">Estás a punto de generar un insight valioso</h3>
            <p className="text-gray-600 my-4">
              Este análisis requiere <strong>{contexto.required} créditos</strong> créditos y tu saldo actual es de <strong>{contexto.remaining}</strong>. Para continuar, simplemente elige un paquete y sigue descubriendo oportunidades para tu ferretería.
              {/*Para ejecutar este análisis necesitas <strong>{contexto.required} créditos</strong>, pero solo te quedan <strong>{contexto.remaining}</strong>.*/}
            </p>
            <button onClick={() => setView('plans')} className="w-full bg-purple-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-purple-700">
              Ver Paquetes de Créditos 🪙
            </button>
          </div>
        )}

        {view === 'plans' && (
          <div className="p-6">
            {/*<p className="text-gray-600 mb-6">Has agotado tus créditos. Adquiere un paquete para seguir generando análisis ilimitados de tus datos.</p>*/}
            <div className="flex gap-4 pb-4 overflow-x-auto">
              {PLANS.map(plan => (
                <div key={plan.id} className={`flex-shrink-0 w-64 border-2 rounded-lg p-6 flex flex-col ${plan.isStrategist ? 'border-yellow-400' : 'border-gray-200 hover:border-purple-500'}`}>
                  <div className={`font-bold text-md mb-2 rounded-md py-1 text-center ${plan.isStrategist ? 'border border-yellow-200 text-yellow-500 bg-yellow-100' : 'bg-purple-100 text-purple-700'}`}>
                    {plan.isStrategist && <FiAward className="inline"/> }{plan.credits} {plan.isStrategist ? '' : 'CRÉDITOS'} {!plan.isStrategist && '🪙'}
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
                      Comprar
                    </button>
                  ) : (
                    <button
                      onClick={ () => handleSelectPlan(plan) }
                      className="flex items-center justify-center gap-2 mt-2 w-full text-gray-700 px-4 text-lg py-2 font-bold rounded-lg hover:text-gray-800"
                      style={{
                        backgroundImage: 'linear-gradient(297deg, #E5C100, #FFFFD6, #FFD700, #FFFFD6, #E5C100)',
                      }}
                    >
                      <FiExternalLink /> Afiliarme
                    </button>
                  )}
                </div>
              ))}
            </div>
              <p className="text-gray-600 mb-6 text-center text-purple-800 font-bold text-md">** Los créditos nunca expiran **</p>
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
              {`Hola Ferreteros.app,\n\nQuiero comprar el Plan de ${selectedPlan.credits} Créditos por S/ ${selectedPlan.price}.\n\nMi correo de usuario es: ${user.email}.\n\nPor favor, envíenme las instrucciones para completar el pago.`}
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
