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
import { FiLogIn, FiCheckCircle, FiArrowRight } from 'react-icons/fi';
import { FerreterosLogo } from './FerreterosLogo'

const AnimationStyles = () => (
  <style>
    {`
      @keyframes pop-in {
        0% {
          transform: scale(1);
        }
        50% {
          transform: scale(1.25);
        }
        100% {
          transform: scale(1);
        }
      }
      .animate-pop {
        animation: pop-in 0.7s cubic-bezier(0.68, -0.55, 0.27, 1.55) 1;
      }
    `}
  </style>
);

const DynamicSocialProofText = () => {
    const messages = [
        { name: 'Zulema', time: '2 horas' },
        { name: 'Marcos88', time: '5 días' },
        { name: 'Andrea', time: '1 día' },
        { name: 'Sofia12', time: '3 días' },
        { name: 'Andree2', time: '10 horas' },
        { name: 'Christian', time: '4 días' },
        { name: 'Lizeth36', time: '1 día' },
        { name: 'Karito', time: '8 días' },
        { name: 'William', time: '5 horas' },
        { name: 'Karen', time: '3 días' },
        { name: 'Johan19', time: '5 horas' },
        { name: 'Simoneta', time: '2 días' },
        { name: 'Meliton', time: '2 horas' },
        { name: 'Johanna', time: '6 días' },
        { name: 'Leoncia', time: '1 día' },
        { name: 'Miriam19', time: '2 días' },
    ];

    const [currentIndex, setCurrentIndex] = useState(0);
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const interval = setInterval(() => {
            setIsVisible(false); // Inicia el fade-out

            // Espera a que termine la animación de fade-out para cambiar el texto
            setTimeout(() => {
                setCurrentIndex(prevIndex => (prevIndex + 1) % messages.length);
                setIsVisible(true); // Inicia el fade-in con el nuevo texto
            }, 500); // Debe coincidir con la duración de la transición de opacidad

        }, 6300); // Cambia el texto cada 4 segundos (más pausado)

        return () => clearInterval(interval);
    }, []);

    const { name, time } = messages[currentIndex];
    // Oculta parte del nombre para dar un toque de privacidad y realismo
    const displayName = `${name.substring(0, 2)}****${name.substring(name.length - 1)}`;

    return (
        <p className={`text-xs text-gray-600 font-medium transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
            <span className="font-bold text-gray-500">{displayName}</span> se unió hace <span className="font-bold text-gray-500">{time}</span>.
        </p>
    );
};

// Componente reutilizable para el formulario de la lista de espera
const SlidingAvatars = () => {
  // Lista de avatares. Ahora es un array de objetos para manejar diferentes tipos.
  const allAvatars = [
    { type: 'image', value: 'https://i.pravatar.cc/150?img=41' },
    { type: 'initials', value: 'KS' },
    { type: 'image', value: 'https://i.pravatar.cc/150?img=42' },
    { type: 'initials', value: 'SQ' },
    { type: 'initials', value: 'RT' },
    { type: 'initials', value: 'MC' },
    { type: 'image', value: 'https://i.pravatar.cc/150?img=43' },
    { type: 'initials', value: 'AV' },
    { type: 'image', value: 'https://i.pravatar.cc/150?img=44' },
    { type: 'initials', value: 'SQ' },
    { type: 'initials', value: 'RM' },
    { type: 'image', value: 'https://i.pravatar.cc/150?img=45' },
    { type: 'initials', value: 'JG' },
    { type: 'initials', value: 'MC' },
    { type: 'initials', value: 'JG' },
    { type: 'image', value: 'https://i.pravatar.cc/150?img=46' },
    { type: 'initials', value: 'ZA' },
    { type: 'initials', value: 'MS' },
    { type: 'initials', value: 'RT' },
    { type: 'initials', value: 'NS' },
    { type: 'image', value: 'https://i.pravatar.cc/150?img=47' },
    { type: 'initials', value: 'YT' },
    { type: 'initials', value: 'ME' },
  ];

  // Paleta de colores para los avatares de iniciales
  const bgColors = [
    'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 
    'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'
  ];

  // Función para asignar un color consistente basado en las iniciales
  const getColorForInitials = (initials) => {
    let hash = 0;
    for (let i = 0; i < initials.length; i++) {
        hash = initials.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash % bgColors.length);
    return bgColors[index];
  };

  const [visibleAvatars, setVisibleAvatars] = useState(allAvatars.slice(0, 5));
  const [poppingAvatar, setPoppingAvatar] = useState(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisibleAvatars(currentAvatars => {
        const newAvatars = [...currentAvatars];
        newAvatars.shift();
        
        const lastAvatar = newAvatars[newAvatars.length - 1];
        const lastIndex = allAvatars.findIndex(a => a.value === lastAvatar.value);
        const nextIndex = (lastIndex + 1) % allAvatars.length;
        const nextAvatar = allAvatars[nextIndex];
        
        newAvatars.push(nextAvatar);
        setPoppingAvatar(nextAvatar);
        
        return newAvatars;
      });
    }, 3400);

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <AnimationStyles />
      <div className="flex items-center justify-center sm:justify-start mt-4">
        <div className="flex -space-x-3">
          {visibleAvatars.map((avatar, index) => {
            const isPopping = poppingAvatar && avatar.value === poppingAvatar.value;
            const commonClasses = `w-10 h-10 rounded-full border-2 border-white transition-opacity duration-500 flex-shrink-0`;
            const animationClass = isPopping ? 'animate-pop' : '';
            const opacityClass = index === 0 ? 'opacity-0' : 'opacity-100';
            const zIndexStyle = { zIndex: visibleAvatars.length + index };

            if (avatar.type === 'image') {
              return (
                <img
                  key={avatar.value}
                  className={`${commonClasses} ${opacityClass} ${animationClass}`}
                  src={avatar.value}
                  alt={`Usuario ${index + 1}`}
                  style={zIndexStyle}
                />
              );
            } else { // type === 'initials'
              return (
                <div
                  key={avatar.value}
                  className={`${commonClasses} ${opacityClass} ${animationClass} ${getColorForInitials(avatar.value)} flex items-center justify-center text-white font-bold text-sm`}
                  style={zIndexStyle}
                >
                  {avatar.value}
                </div>
              );
            }
          })}
        </div>
        <div className="bg-black justify-start px-2 py-2 ml-2">
          <DynamicSocialProofText />
        </div>
      </div>
    </>
  );
};

const WaitlistForm = ({ buttonText }) => {
  const [showActionButtons, setShowActionButtons] = useState(false);

return (
  <form className="w-full max-w-md mx-auto">
    <div className="flex flex-wrap justify-center gap-2">
      {/*<input 
        type="email" 
        placeholder="Tu correo electrónico" 
        required 
        className="flex-grow p-3 rounded-lg bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-purple-500 focus:outline-none text-white" 
      />*/}
      <button 
        type="submit" 
        className="bg-purple-600 flex w-auto items-center justify-center gap-2 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
      >
        {buttonText}
        <FiArrowRight />
      </button>
    </div>
  </form>
)};

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
          {/*<h1 className="text-4xl md:text-6xl font-black mb-4 leading-tight">
            Tu ferretería tiene <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(to right, #560bad, #7209b7, #b5179e)' }}
            >dinero escondido</span>.
            <br />
            Te ayudamos a encontrarlo.
          </h1>*/}
          <h1 className="text-4xl md:text-6xl font-black mb-4 leading-tight">
            Aumenta la rentabilidad de tu Ferretería
            <span
              className="bg-clip-text text-transparent ml-3"
              style={{ backgroundImage: 'linear-gradient(to right, #560bad, #7209b7, #b5179e)' }}
            >
              desde la próxima compra
            </span>.
          </h1>
          {/*<p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto mb-8">
            Ferretero.IA es la primera plataforma de inteligencia de negocios diseñada para el Ferretero Independiente. Convierte la información de tu negocio en decisiones que aumentarán tu rentabilidad.
          </p>*/}
          <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto mb-8">
            Usa Ferretero.IA y convierte tu ferretería en tu mayor fuente de rentabilidad.<br/><b>Obtén el diagnóstico. Define el plan. Toma el control.</b>
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
              <WaitlistForm buttonText="Obtener Acceso" />
              <SlidingAvatars />
              {/*<p className="text-sm text-gray-500 mt-4">Join 100+ SaaS teams creating marketing pages.</p>*/}
            </>
          )}
        </div>
      </section>

      {/* Sección 2: El Problema (con UX/UI mejorada) */}
      <section className="py-20 bg-black bg-opacity-40">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">¿Tu almacén está lleno pero sientes que el dinero no alcanza?</h2>
          <p className="text-lg text-purple-400 mb-6">
            <b>Cada producto que no rota y cada compra en exceso es capital que no trabaja.</b><br/>La intuición te ayuda a vender, pero los datos te ayudan decidir con precisión.
          </p>
          <div className="max-w-2xl mx-auto text-left space-y-6">
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 flex items-start gap-4">
              <FiCheckCircle className="text-purple-400 text-2xl mt-1 flex-shrink-0" />
              <p className="font-semibold">¿Estás seguro de que tu producto más vendido es también el más rentable?</p>
            </div>
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 flex items-start gap-4">
              <FiCheckCircle className="text-purple-400 text-2xl mt-1 flex-shrink-0" />
              <p className="font-semibold">¿Sientes que trabajas más, vendes más, pero no necesariamente ganas más?</p>
            </div>
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 flex items-start gap-4">
              <FiCheckCircle className="text-purple-400 text-2xl mt-1 flex-shrink-0" />
              <p className="font-semibold">¿Tus Compras son en base a la demanda real o al catálogo del proveedor?</p>
            </div>
            
          </div>
        </div>
      </section>


      {/* Sección 1: Beneficios Clave */}
      <section className="py-20 bg-black bg-opacity-20">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-4xl font-bold mb-4">Solo Tenemos una Lealtad:  
            <span
              className="bg-clip-text text-transparent ml-2"
              style={{ backgroundImage: 'linear-gradient(to right, #560bad, #7209b7, #b5179e)' }}
            >
              Tu Rentabilidad
            </span>.
          </h2>
          <p className="text-lg font-semibold text-purple-400 mb-6">
            No somos otro software de gestión. <b>Somos tu departamento de inteligencia.</b><br/>Nuestra plataforma se rige por tres principios inquebrantables.
          </p>
          {/*<p className="text-gray-300 max-w-3xl mx-auto text-center mb-6">
            Somos una plataforma 100% independiente. No estamos afiliados a ninguna marca, distribuidor o cadena. Nuestro único objetivo y nuestra única lealtad es con la rentabilidad del ferretero independiente. Tus datos son tuyos, son confidenciales, y solo se usan para darte a ti el poder de decisión.
          </p>*/}
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gray-800 p-8 rounded-lg border border-gray-700 text-center">
              <div className="text-4xl text-purple-400 mb-4">🛡️👑</div>
              <h3 className="text-xl font-bold mb-2">Independencia y Confianza</h3>
              <p className="text-gray-400">No estamos afiliados a ninguna marca, distribuidor o cadena. Nuestra única lealtad es con la <b>Rentabilidad de tu Ferretería.</b> Tus decisiones valen más cuando se basan en datos. Los datos son tuyos y son 100% confidenciales. Siempre.</p>
              {/*<p className="text-gray-400">No estamos afiliados a ninguna marca, distribuidor o cadena. Nuestra única lealtad es con la <b>Rentabilidad de tu Ferretería.</b> Tus datos son tuyos y son 100% confidenciales, Úsalos para tomar mejores decisiones.No te conformes con menos.</p>*/}
            </div>
            <div className="bg-gray-800 p-8 rounded-lg border border-gray-700 text-center">
              <div className="text-4xl text-purple-400 mb-4">💰📈</div>
              <h3 className="text-xl font-bold mb-2">Obsesión por la Rentabilidad</h3>
              <p className="text-gray-400">No te diremos cómo vender más, <b>te ayudaremos a Ganar Más</b>. Nos obsesiona el margen, el flujo de caja y el capital de trabajo. Descubre dónde está el dinero real en tu negocio, no las métricas de vanidad que no pagan las facturas.</p>
            </div>
            <div className="bg-gray-800 p-8 rounded-lg border border-gray-700 text-center">
              <div className="text-4xl text-purple-400 mb-4">💡🎯</div>
              <h3 className="text-xl font-bold mb-2">Simplicidad Radical</h3>
              <p className="text-gray-400">Convierte la complejidad de miles de transacciones en un <b>Plan de Acción claro y directo</b>. No necesitas un MBA para gestionar tu ferretería a un nivel de élite y tomar decisiones como hacen las grandes cadenas ferreteras.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Sección 4: Beneficios Clave */}
      <section className="py-20 bg-black bg-opacity-30">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Tu Experiencia + Nuestro Análisis
            <span
              className="bg-clip-text text-transparent ml-2"
              style={{ backgroundImage: 'linear-gradient(to right, #560bad, #7209b7, #b5179e)' }}
            >
              = Tu Arma Secreta
            </span>.
          </h2>
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
          <p className="mt-6 text-lg font-semibold text-purple-400">
            Sin tecnicismos. Sin reportes complicados.<br/><b>Solo respuestas claras para que tomes acciones inmediatas.</b>
          </p>
        </div>
      </section>

      {/* Sección 5: Llamada a la Acción Final */}
      <section className="py-20 bg-black bg-opacity-20 text-center">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Sé el Piloto, <b>no el Pasajero.</b></h2>
          <p className="text-gray-300 max-w-3xl mx-auto mb-8">
            La Operación está a punto de despegar. Estamos formando un grupo exclusivo de ferreteros visionarios que serán los primeros en usar esta herramienta para transformar sus negocios. Este no es un lanzamiento masivo, es una invitación.
          </p>
          <WaitlistForm buttonText="QUIERO ACCESO PRIORITARIO" />
          <p className="text-sm text-gray-500 mt-4">Los miembros de la lista de espera recibirán una invitación exclusiva a nuestra beta privada y un descuento especial de fundador.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center py-8 border-t border-gray-800">
        <p className="text-gray-500">&copy; 2025 Ferretero.IA - Todos los derechos reservados.</p>
        <FerreterosLogo/>
      </footer>
    </div>
  );
}