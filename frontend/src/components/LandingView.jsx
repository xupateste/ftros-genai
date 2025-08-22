// import React, { useState } from 'react';
// import axios from 'axios';
// import { FiLock, FiBarChart2, FiChevronsRight, FiUser, FiMail, FiKey, FiUserPlus, FiLoader } from 'react-icons/fi';
// import { FerreterosLogo } from './FerreterosLogo'
// const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
// // ===================================================================================
// // --- VISTA 1: El Nuevo Landing Page ---
// // ===================================================================================
// export function LandingView ({ onStartSession, onLoginClick }) {
//   return (
//   <div className="min-h-screen bg-gradient-to-b from-neutral-900 via-background to-gray-900
//           flex flex-col items-center justify-center text-center px-4 py-4 sm:px-8 md:px-12 lg:px-20">
//     <h1 className="text-2xl md:text-5xl font-bold text-white leading-tight">
//       Tus Datos, Tu Inteligencia<br />
//       <span
//         className="text-5xl bg-clip-text text-transparent"
//         style={{ backgroundImage: 'linear-gradient(to right, #560bad, #7209b7, #b5179e)' }}
//       >
//         Ferretero.IA
//       </span>
//     </h1>
//     <p className="mt-6 text-lg md:text-xl text-gray-300 max-w-3xl mx-auto">
//       Analiza tu inventario y ventas con total privacidad. Sube tus archivos para obtener reportes inteligentes que te ayudarán a tomar mejores decisiones de negocio.
//     </p>

//     <div className="mt-12 grid md:grid-cols-3 gap-8 text-white">
//       <div className="p-6 bg-gray-800 bg-opacity-50 rounded-lg border border-gray-700">
//         <FiLock className="text-4xl text-purple-400 mx-auto mb-4" />
//         <h3 className="text-xl font-semibold">100% Privado y Anónimo</h3>
//         <p className="text-gray-400 mt-2">Tus archivos se procesan en una sesión temporal que se elimina al refrescar la página. No requerimos registro.</p>
//       </div>
//       <div className="p-6 bg-gray-800 bg-opacity-50 rounded-lg border border-gray-700">
//         <FiLock className="text-4xl text-purple-400 mx-auto mb-4" />
//         <h3 className="text-xl font-semibold">Análisis en Segundos</h3>
//         <p className="text-gray-400 mt-2">Sube tus archivos de Excel o CSV y obtén reportes complejos al instante, sin configuraciones complicadas.</p>
//       </div>
//       <div className="p-6 bg-gray-800 bg-opacity-50 rounded-lg border border-gray-700">
//         <FiBarChart2 className="text-4xl text-purple-400 mx-auto mb-4" />
//         <h3 className="text-xl font-semibold">Decisiones Inteligentes</h3>
//         <p className="text-gray-400 mt-2">Descubre qué productos rotan más, cuál es tu stock muerto y dónde están tus oportunidades de ganancia.</p>
//       </div>
//     </div>

//     <div className="mt-12">
//       <button
//         onClick={onStartSession}
//         className="bg-purple-600 text-white font-bold text-xl px-12 py-4 rounded-lg shadow-lg hover:bg-purple-700 focus:outline-none focus:ring-4 focus:ring-purple-400 focus:ring-opacity-50 transition-transform transform hover:scale-105 duration-300 ease-in-out flex items-center justify-center mx-auto"
//       >
//         Iniciar Análisis Privado
//         <FiChevronsRight className="ml-3 text-2xl" />
//       </button>
      
//       {/* --- NUEVO CTA SECUNDARIO --- */}
//       <p className="mt-6 text-sm text-gray-400">
//         ¿Ya tienes una cuenta?{' '}
//         <button onClick={onLoginClick} className="font-semibold text-purple-400 hover:text-white hover:underline">
//           Inicia sesión aquí
//         </button>
//       </p>
//     </div>
//     <FerreterosLogo/>
//   </div>
// )};

// src/components/LandingView.jsx

import React, { useState, useEffect } from 'react';
import { FiLogIn, FiCheckCircle } from 'react-icons/fi';

// Componente reutilizable para el formulario de la lista de espera
const WaitlistForm = ({ buttonText }) => (
  <form className="w-full max-w-md mx-auto">
    <div className="flex flex-col sm:flex-row gap-4">
      <input 
        type="email" 
        placeholder="Tu correo electrónico" 
        required 
        className="flex-grow p-3 rounded-lg bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-purple-500 focus:outline-none text-white" 
      />
      <button 
        type="submit" 
        className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
      >
        {buttonText}
      </button>
    </div>
  </form>
);

export function LandingView({ onStartSession, onLoginClick, onRegisterClick }) {

  const [showActionButtons, setShowActionButtons] = useState(false);

  // --- LÓGICA PARA ACTIVAR BOTONES DESDE LA URL ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // Buscamos un parámetro específico, por ejemplo `?cta=true`
    if (params.get('cta') === 'true') {
      setShowActionButtons(true);
    }
  }, []);

  return (
    <div className="w-full bg-gray-900 text-white animate-fade-in">
      {/* Navbar Simple */}
      <nav className="p-4 flex justify-between items-center container mx-auto">
        <h1 className="text-2xl font-bold gradient-text">
          <span
            className="text-3xl bg-clip-text text-transparent"
            style={{ backgroundImage: 'linear-gradient(to right, #560bad, #7209b7, #b5179e)' }}
          >
            Ferretero.IA
          </span>
        </h1>
        <button 
          onClick={onLoginClick} 
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
        >
          <FiLogIn /> Iniciar Sesión
        </button>
      </nav>

      {/* Sección 0: Héroe (Ahora con imagen de fondo) */}
      <section 
        className="relative py-20 md:py-32 text-center bg-cover bg-center" 
        style={{ backgroundImage: "url('https://placehold.co/1200x600/111827/1f2937?text=xmsaiiiii')" }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-60"></div>
        <div className="relative container mx-auto px-6">
          <h1 className="text-4xl md:text-6xl font-black mb-4 leading-tight">
            Tu ferretería tiene <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(to right, #560bad, #7209b7, #b5179e)' }}
            >dinero escondido</span>.
            <br />
            Te ayudamos a encontrarlo.
          </h1>
          <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto mb-8">
            Ferretero.IA es la primera plataforma de inteligencia de negocios diseñada para el Ferretero Independiente. Convierte la información de tu negocio en decisiones que aumentarán tu rentabilidad.
          </p>
          
          {/* --- RENDERIZADO CONDICIONAL DE BOTONES --- */}
          {showActionButtons ? (
            <div className="flex flex-col-2 sm:flex-row gap-4 justify-center animate-fade-in">
                <button onClick={onLoginClick} className="px-6 py-3 font-bold bg-gray-700 hover:bg-gray-600 rounded-lg">Iniciar Sesión</button>
                {/*<button onClick={onRegisterClick} className="px-6 py-3 font-bold bg-gray-700 hover:bg-gray-600 rounded-lg">Registrarse</button>*/}
                <button onClick={onStartSession} className="px-6 py-3 font-bold bg-purple-600 hover:bg-purple-700 rounded-lg">Probar Demo Anónimo</button>
            </div>
          ) : (
            <>
              <WaitlistForm buttonText="UNIRME A LA LISTA DE ESPERA" />
              <p className="text-sm text-gray-500 mt-4">Sé el primero en recibir acceso prioritario y obtén un beneficio exclusivo de lanzamiento.</p>
            </>
          )}
        </div>
      </section>

      {/* Sección 2: El Problema (con UX/UI mejorada) */}
      <section className="py-20 bg-black bg-opacity-40">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">¿Tu almacén está lleno pero sientes que el dinero no alcanza?</h2>
          <p className="text-gray-400 max-w-3xl mx-auto mb-12">
            Cada clavo, perno y herramienta en tu estante es capital invertido. Pero, ¿cuánto de ese capital está realmente trabajando para ti? La mayoría de ferreteros opera basándose en la intuición, perdiendo miles de soles en inventario estancado y compras ineficientes.
          </p>
          <div className="max-w-2xl mx-auto text-left space-y-6">
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 flex items-start gap-4">
              <FiCheckCircle className="text-purple-400 text-2xl mt-1 flex-shrink-0" />
              <p className="font-semibold">¿Estás seguro de que tu producto más vendido es también el más rentable?</p>
            </div>
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 flex items-start gap-4">
              <FiCheckCircle className="text-purple-400 text-2xl mt-1 flex-shrink-0" />
              <p className="font-semibold">¿Sabes cuánto dinero tienes durmiendo en estantes, en productos que no rotan hace meses?</p>
            </div>
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 flex items-start gap-4">
              <FiCheckCircle className="text-purple-400 text-2xl mt-1 flex-shrink-0" />
              <p className="font-semibold">¿Estás seguro de que tus decisiones de compra se basan en datos reales de demanda y no en el "me parece que se va a vender"?</p>
            </div>
          </div>
        </div>
      </section>


      {/* Sección 1: Beneficios Clave */}
      <section className="py-20 bg-black bg-opacity-20">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-4xl font-bold mb-4">Transparencia, Independencia y  
            <span
              className="bg-clip-text text-transparent ml-2"
              style={{ backgroundImage: 'linear-gradient(to right, #560bad, #7209b7, #b5179e)' }}
            >
              Rentabilidad
            </span>.
          </h2>
          <p className="text-lg font-semibold text-purple-400 mb-6">
            No somos otro software de gestión. Somos tu analista financiero personal.
          </p>
          {/*<p className="text-gray-300 max-w-3xl mx-auto text-center mb-6">
            Somos una plataforma 100% independiente. No estamos afiliados a ninguna marca, distribuidor o cadena. Nuestro único objetivo y nuestra única lealtad es con la rentabilidad del ferretero independiente. Tus datos son tuyos, son confidenciales, y solo se usan para darte a ti el poder de decisión.
          </p>*/}
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gray-800 p-8 rounded-lg border border-gray-700 text-center">
              <div className="text-4xl text-purple-400 mb-4">🛡️👑</div>
              <h3 className="text-xl font-bold mb-2">Independencia y Confianza</h3>
              <p className="text-gray-400">Somos una plataforma 100% independiente. No estamos afiliados a ninguna marca, distribuidor o cadena. Nuestra única lealtad es con la <b>Rentabilidad de tu Ferretería.</b> Tus datos son tuyos, son confidenciales y solo los usamos para darte a ti el poder de decisión.</p>
            </div>
            <div className="bg-gray-800 p-8 rounded-lg border border-gray-700 text-center">
              <div className="text-4xl text-purple-400 mb-4">💰📈</div>
              <h3 className="text-xl font-bold mb-2">Enfoque en Rentabilidad, no en Ventas</h3>
              <p className="text-gray-400">No te diremos cómo vender más, te ayudaremos a <b>Ganar Más</b>. Nos obsesiona el margen, el flujo de caja y el capital de trabajo. Te mostramos dónde está el dinero real en tu negocio, no las métricas de vanidad.</p>
            </div>
            <div className="bg-gray-800 p-8 rounded-lg border border-gray-700 text-center">
              <div className="text-4xl text-purple-400 mb-4">💡🎯</div>
              <h3 className="text-xl font-bold mb-2">Simplicidad Radical</h3>
              <p className="text-gray-400">Traducimos la complejidad de miles de datos en un <b>Plan de Acción claro y directo.</b> No necesitas ser un experto en finanzas para entender tu negocio a un nivel de élite y tomar decisiones que impacten tu resultado final.</p>
            </div>
          </div>
        </div>
      </section>

      
      {/* Sección 3: La Solución */}
      <section className="py-20 text-center">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Deja de adivinar. Toma el control con 
            <span
              className="bg-clip-text text-transparent ml-2"
              style={{ backgroundImage: 'linear-gradient(to right, #560bad, #7209b7, #b5179e)' }}
            >
              Ferretero.IA
            </span>.
          </h2>
          <p className="text-gray-300 max-w-3xl mx-auto">
            Hemos creado la herramienta que te da la claridad que necesitas. Simplemente subes tus datos de ventas e inventario. En minutos, nuestro motor de análisis te entrega un diagnóstico impactante sobre la salud real de tu negocio.
          </p>
          <p className="mt-6 text-lg font-semibold text-purple-400">
            Sin jerga técnica. Sin reportes complicados. Solo respuestas claras para que tomes acciones inmediatas.
          </p>
        </div>
      </section>

      {/* Sección 4: Beneficios Clave */}
      <section className="py-20 bg-black bg-opacity-20">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Con Claridad, Llega el Crecimiento.</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gray-800 p-8 rounded-lg border border-gray-700 text-center">
              <div className="text-4xl text-purple-400 mb-4">💰</div>
              <h3 className="text-xl font-bold mb-2">Descubre tu Capital Oculto</h3>
              <p className="text-gray-400">Identifica cuánto dinero tienes inmovilizado en productos de baja rotación para que puedas liberarlo y reinvertirlo inteligentemente.</p>
            </div>
            <div className="bg-gray-800 p-8 rounded-lg border border-gray-700 text-center">
              <div className="text-4xl text-purple-400 mb-4">📦</div>
              <h3 className="text-xl font-bold mb-2">Optimiza tu Inventario</h3>
              <p className="text-gray-400">Recibe recomendaciones claras sobre qué, cuándo y cuánto comprar. Evita el sobre-stock y los quiebres de stock que te hacen perder ventas.</p>
            </div>
            <div className="bg-gray-800 p-8 rounded-lg border border-gray-700 text-center">
              <div className="text-4xl text-purple-400 mb-4">📈</div>
              <h3 className="text-xl font-bold mb-2">Maximiza tu Rentabilidad</h3>
              <p className="text-gray-400">Enfócate en los productos y marcas que realmente hacen crecer tu margen de ganancia. Toma decisiones con la confianza que solo los datos pueden dar.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Sección 5: Llamada a la Acción Final */}
      <section className="py-20 text-center">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">La "Operación Claridad" está por comenzar. <br />¿Estás dentro?</h2>
          <p className="text-gray-300 max-w-3xl mx-auto mb-8">
            Los que usen sus datos para tomar decisiones inteligentes liderarán el mercado. No te quedes atrás. Únete a la lista de espera para ser el primero en acceder a Ferretero.IA.
          </p>
          <WaitlistForm buttonText="QUIERO ACCESO PRIORITARIO" />
          <p className="text-sm text-gray-500 mt-4">Los miembros de la lista de espera recibirán una invitación exclusiva a nuestra beta privada y un descuento especial de fundador.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center py-8 border-t border-gray-800">
        <p className="text-gray-500">&copy; 2025 Ferretero.IA - Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}