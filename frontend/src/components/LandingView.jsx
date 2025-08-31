// src/components/LandingView.jsx

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FiLogIn, FiCheckCircle, FiArrowRight, FiPlus, FiX } from 'react-icons/fi';
import { FerreterosLogo } from './FerreterosLogo'
import { FAQSection } from './FAQSection'
import { PrivacyPolicyModal } from './PrivacyPolicyModal'
import { AnimateOnScroll } from './AnimateOnScroll'; // <-- Importamos el nuevo componente
import api from '../utils/api'; // Usamos nuestro cliente API centralizado
import * as analytics from '../utils/analytics';
import { LoginModalBeta } from './LoginModalBeta'

const AnimationStyles = () => (
  <style>
    {`
      @keyframes pop-in { 0% { transform: scale(0.8); } 20% { transform: scale(0.6); } 50% { transform: scale(1.25); } 100% { transform: scale(1); } }
      .animate-pop { animation: pop-in 0.7s cubic-bezier(0.68, -0.55, 0.27, 1.55) 1; }
      /* Nueva animación de entrada desde abajo */
      @keyframes slide-in-from-bottom { 
        0% { opacity: 0; transform: translateY(100%); } 
        100% { opacity: 1; transform: translateY(0); } 
      }
      
      /* Nueva animación de salida hacia abajo */
      @keyframes slide-out-to-bottom { 
        0% { opacity: 1; transform: translateY(0); } 
        100% { opacity: 0; transform: translateY(100%); } 
      }
      .toast-enter { animation: slide-in-from-bottom 0.3s ease-out forwards; }
      .toast-exit { animation: slide-out-to-bottom 0.3s ease-in forwards; }
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
        { name: 'Lizeth36', time: '11 días' },
        { name: 'Karito', time: '8 días' },
        { name: 'William', time: '5 horas' },
        { name: 'Karen', time: '3 días' },
        { name: 'Johan19', time: '5 horas' },
        { name: 'Simoneta', time: '22 días' },
        { name: 'Meliton', time: '2 horas' },
        { name: 'Johanna', time: '16 días' },
        { name: 'Leoncia', time: '1 día' },
        { name: 'Marlene1', time: '12 días' },
        { name: 'Mathias', time: '11 horas' },
        { name: 'Zoemi00', time: '17 días' },
        { name: 'Maxima', time: '9 días' },
        { name: 'Jorena11', time: '13 horas' },
        { name: 'Abigail09', time: '5 días' },
        { name: 'Ernesta', time: '18 días' },
        { name: 'Histeria', time: '1 día' },
        { name: 'Fatima', time: '3 días' },
        { name: 'Celina', time: '6 horas' },
        { name: 'Yvone', time: '8 días' },
        { name: 'Gustavo', time: '19 horas' },
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
        <p className={`text-sm text-gray-400 font-medium transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
            <span className="font-bold text-gray-400">{displayName}</span> se unió hace <span className="font-bold text-gray-400">{time}</span>.
        </p>
    );
};

// Componente reutilizable para el formulario de la lista de espera
const SlidingAvatars = ({ctaClick}) => {
  // Lista de avatares. Ahora es un array de objetos para manejar diferentes tipos.
  const allAvatars = [
    { type: 'image', value: 'https://i.pravatar.cc/50?img=41' },
    { type: 'initials', value: 'KA' },
    { type: 'image', value: 'https://i.pravatar.cc/50?img=52' }, //OK
    { type: 'initials', value: 'SO' },
    { type: 'initials', value: 'RI' },
    { type: 'initials', value: 'ME' },
    { type: 'image', value: 'https://i.pravatar.cc/50?img=58' },//CAMBIAR
    { type: 'initials', value: 'AB' },
    { type: 'image', value: 'https://i.pravatar.cc/50?img=59' }, //CAMBAR
    { type: 'initials', value: 'SU' },
    { type: 'initials', value: 'RO' },
    { type: 'image', value: 'https://i.pravatar.cc/50?img=20' }, //CAMBIAR
    { type: 'initials', value: 'JE' },
    { type: 'initials', value: 'MI' },
    { type: 'initials', value: 'BA' },
    { type: 'image', value: 'https://i.pravatar.cc/50?img=22' }, //Cmbiar
    { type: 'initials', value: 'ZA' },
    { type: 'image', value: 'https://i.pravatar.cc/50?img=35' }, //cambiar
    { type: 'initials', value: 'LU' },
    { type: 'initials', value: 'VI' },
    { type: 'initials', value: 'CO' },
    { type: 'image', value: 'https://i.pravatar.cc/50?img=26' }, //cambiar
    { type: 'image', value: 'https://i.pravatar.cc/50?img=27' }, //cambiar
    { type: 'initials', value: 'TO' },
    { type: 'initials', value: 'MA' },
    { type: 'initials', value: 'QU' },
    { type: 'initials', value: 'MO' },
    { type: 'image', value: 'https://i.pravatar.cc/50?img=30' }, //Cmbiar
    { type: 'initials', value: 'ZE' },
    { type: 'initials', value: 'MU' },
    { type: 'initials', value: 'PE' },
    { type: 'initials', value: 'KI' },
    { type: 'image', value: 'https://i.pravatar.cc/50?img=31' }, //cambiar
    { type: 'image', value: 'https://i.pravatar.cc/50?img=32' }, //cambiar
    { type: 'initials', value: 'JI' },
    { type: 'initials', value: 'HE' },
    { type: 'image', value: 'https://i.pravatar.cc/50?img=33' }, //Cmbiar
    { type: 'initials', value: 'WA' },
    { type: 'initials', value: 'RE' },
    { type: 'initials', value: 'GU' },
    { type: 'initials', value: 'NE' },
    { type: 'image', value: 'https://i.pravatar.cc/50?img=34' }, //cambiar
    { type: 'image', value: 'https://i.pravatar.cc/50?img=37' }, //cambiar
    { type: 'initials', value: 'YO' },
    { type: 'initials', value: 'EU' },
    { type: 'image', value: 'https://i.pravatar.cc/50?img=38' }, //cambiar
  ];

  // Paleta de colores para los avatares de iniciales
  const bgColors = [
    'bg-red-500', 'bg-blue-300', 'bg-green-500', 'bg-yellow-300', 
    'bg-purple-300', 'bg-pink-500', 'bg-indigo-300', 'bg-teal-500',
    'bg-red-300', 'bg-blue-500', 'bg-green-300', 'bg-yellow-500', 
    'bg-purple-500', 'bg-pink-300', 'bg-indigo-500', 'bg-teal-300'
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

  // Función para barajar un array (algoritmo Fisher-Yates)
  const shuffleArray = useCallback((array) => {
    let shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, []);

  // Estado para la cola de avatares barajados
  const [avatarQueue, setAvatarQueue] = useState(() => shuffleArray(allAvatars));
  // Estado para el índice del próximo avatar a mostrar de la cola
  const [queueIndex, setQueueIndex] = useState(5);
  // Estado para los 5 avatares actualmente visibles en la UI
  const [visibleAvatars, setVisibleAvatars] = useState(allAvatars.slice(0, 5));
  const [poppingAvatar, setPoppingAvatar] = useState(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisibleAvatars(currentVisible => {
        let nextIndex = queueIndex;
        let currentQueue = avatarQueue;

        // Si hemos mostrado todos los avatares de la cola, la barajamos de nuevo.
        if (nextIndex >= currentQueue.length) {
          currentQueue = shuffleArray(allAvatars);
          setAvatarQueue(currentQueue);
          nextIndex = 0;
        }

        const nextAvatar = currentQueue[nextIndex];
        
        const newVisible = [...currentVisible];
        newVisible.shift(); // Quitamos el más antiguo
        newVisible.push(nextAvatar); // Añadimos el nuevo

        setQueueIndex(nextIndex + 1); // Apuntamos al siguiente en la cola
        setPoppingAvatar(nextAvatar); // Activamos la animación "pop"

        return newVisible;
      });
    }, 3400);

    return () => clearInterval(interval);
  }, [queueIndex, avatarQueue, allAvatars, shuffleArray]);

  return (
    <>
      <AnimationStyles />
      <div className="flex items-center justify-center sm:justify-start mt-4 pr-6">
        <div className="flex -space-x-3">
          {visibleAvatars.map((avatar, index) => {
            const isPopping = poppingAvatar && avatar.value === poppingAvatar.value;
            const commonClasses = `w-10 h-10 rounded-full border-2 border-white transition-opacity duration-500 flex-shrink-0`;
            const animationClass = isPopping ? 'animate-pop' : '';
            const opacityClass = index === 0 ? 'opacity-0' : 'opacity-100';
            const zIndexStyle = { zIndex: visibleAvatars.length + index };

            if (avatar.type === 'image') {
              return <img key={avatar.value + index} className={`${commonClasses} ${opacityClass} ${animationClass}`} src={avatar.value} alt={`Usuario`} style={zIndexStyle} />;
            } else {
              return <div key={avatar.value + index} className={`${commonClasses} ${opacityClass} ${animationClass} ${getColorForInitials(avatar.value)} flex items-center justify-center text-white font-bold text-sm`} style={zIndexStyle}>{avatar.value}</div>;
            }
          })}
          <div
            className="w-10 h-10 bg-red-500 rounded-full border-2 border-white transition-opacity duration-500 flex-shrink-0 flex items-center justify-center text-white text-xl hover:bg-red-400 hover:scale-105"
            style={{ zIndex: 90 }}
            onClick={ ctaClick }
          >
            <FiPlus />
          </div>
        </div>
      </div>
    </>
  );
};

// --- NUEVO: Componente Gestor de Toasts (ACTUALIZADO) ---
const ToastManager = ({ isHeroVisible }) => {
    const [toasts, setToasts] = useState([]);
    
    const toastData = useRef([
      { name: 'Alejandro', location: 'Madrid, España', time: '3 días'},
      { name: 'Valentina', location: 'Bogotá, Colombia', time: '1 día'},
      { name: 'Soledad', location: 'Cúcuta, Colombia', time: '18 horas'},
      { name: 'Jeronimo', location: 'Bogotá, Colombia', time: '22 días'},
      { name: 'Waldir', location: 'Bogotá, Colombia', time: '5 días'},
      { name: 'Ignacio', location: 'Sucre, Bolivia', time: '7 horas'},
      { name: 'Zepita10', location: 'Santiago, Chile', time: '16 días'},
      { name: 'Mateo', location: 'Buenos Aires, Argentina', time: '7 horas'},
      { name: 'Demetrio', location: 'Buenos Aires, Argentina', time: '1 día'},
      { name: 'Isabella', location: 'Buenos Aires, Argentina', time: '1 hora'},
      { name: 'Fatima', location: 'Buenos Aires, Argentina', time: '37 minutos'},
      { name: 'Ignacia', location: 'Buenos Aires, Argentina', time: '18 minutos'},
      { name: 'Izabella', location: 'Lima, Perú', time: '9 horas'},
      { name: 'Christian', location: 'Lima, Perú', time: '13 horas'},
      { name: 'Imabella', location: 'Lima, Perú', time: '9 días'},
      { name: 'Andrea', location: 'Lima, Perú', time: '1 día'},
      { name: 'Ricardo', location: 'Arequipa, Perú', time: '3 días'},
      { name: 'Lorena', location: 'Tarapoto, Perú', time: '6 días'},
      { name: 'Mesias', location: 'Juliaca, Perú', time: '10 días'},
      { name: 'Pedro', location: 'Trujillo, Perú', time: '11 días'},
      { name: 'Nigrid', location: 'Chanchamayo, Perú', time: '23 horas'},
      { name: 'Yuly', location: 'Huaraz, Perú', time: '53 minutos'},
      { name: 'Ingrid', location: 'Trujillo, Perú', time: '4 días'},
      { name: 'Ulises', location: 'Trujillo, Perú', time: '2 días'},
      { name: 'Sebastián', location: 'Valparaíso, Chile', time: '3 horas'},
      { name: 'Camila', location: 'Ciudad de México', time: '17 días'},
      { name: 'Lucas', location: 'Quito, Ecuador', time: '19 días'},
      { name: 'Jolieta', location: 'Montevideo, Uruguay', time: '2 días'},
      { name: 'Santiago', location: 'Montevideo, Uruguay', time: '6 días'}, 
      { name: 'Matias', location: 'Montevideo, Uruguay', time: '8 días'},
      { name: 'Ernest', location: 'Montevideo, Uruguay', time: '5 horas'},
      { name: 'Julieta', location: 'Montevideo, Uruguay', time: '9 días'},
      { name: 'Ruidiaz99', location: 'Lima, Perú', time: '3 días'},
      { name: 'Vu992', location: 'Arequipa, Perú', time: '5 días'},
      { name: 'Ye19288', location: 'Lima, Perú', time: '5 días'},
      { name: 'Ya8288', location: 'Arequipa, Perú', time: '5 días'},
      { name: 'Ol9129', location: 'Lima, Perú', time: '2 días'},
      { name: 'Re993', location: 'Arequipa, Perú', time: '2 días'},
      { name: 'Ta8182', location: 'Lima, Perú', time: '6 horas'},
      { name: 'Ruaz99', location: 'Huancayo, Perú', time: '3 días'},
      { name: 'Vu92', location: 'Arequipa, Perú', time: '5 días'},
      { name: 'Yo1288', location: 'Huancayo, Perú', time: '5 días'},
      { name: 'Ka288', location: 'Arequipa, Perú', time: '5 días'},
      { name: 'Ku9129', location: 'Huancayo, Perú', time: '2 días'},
      { name: 'Re93', location: 'Arequipa, Perú', time: '2 días'},
      { name: 'Ta182', location: 'Huancayo, Perú', time: '6 horas'},
      { name: 'Ig9292', location: 'Arequipa, Perú', time: '6 horas'},
      { name: 'As3382', location: 'Huancayo, Perú', time: '6 días'},
      { name: 'Uy999329', location: 'Arequipa, Perú', time: '6 días'},
    ]);
    const bgColors = useRef([
      'bg-red-500', 'bg-blue-700', 'bg-green-500', 'bg-yellow-700',
      'bg-purple-700', 'bg-pink-500', 'bg-indigo-700', 'bg-teal-500',
      'bg-red-700', 'bg-blue-500', 'bg-green-700', 'bg-yellow-500',
      'bg-purple-500', 'bg-pink-700', 'bg-indigo-500', 'bg-teal-700',
    ]);

    const shuffleArray = useCallback((array) => {
        let shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }, []);

    const [toastQueue, setToastQueue] = useState(() => shuffleArray(toastData.current));
    const [queueIndex, setQueueIndex] = useState(0);
    const timeoutRef = useRef(null);

    useEffect(() => {
        const scheduleNextToast = () => {
            clearTimeout(timeoutRef.current);
            const randomDelay = 6000 + Math.random() * 13000; // Frecuencia aleatoria entre 8 y 15 segundos

            timeoutRef.current = setTimeout(() => {
                let nextIndex = queueIndex;
                let currentQueue = toastQueue;

                if (nextIndex >= currentQueue.length) {
                    currentQueue = shuffleArray(toastData.current);
                    setToastQueue(currentQueue);
                    nextIndex = 0;
                }

                const toastInfo = currentQueue[nextIndex];
                const randomColor = bgColors.current[Math.floor(Math.random() * bgColors.current.length)];
                const newToast = { id: Date.now(), ...toastInfo, bgColor: randomColor, isExiting: false };

                setToasts(currentToasts => [...currentToasts, newToast]);
                setQueueIndex(nextIndex + 1);

                // Iniciar la animación de salida después de 4.5 segundos
                setTimeout(() => {
                    setToasts(currentToasts =>
                        currentToasts.map(t =>
                            t.id === newToast.id ? { ...t, isExiting: true } : t
                        )
                    );
                }, 4500);

                // Eliminar del DOM después de que termine la animación de salida (4500ms + 500ms)
                setTimeout(() => {
                    setToasts(currentToasts => currentToasts.filter(t => t.id !== newToast.id));
                }, 5000);

                scheduleNextToast();
            }, randomDelay);
        };

        if (!isHeroVisible) {
            scheduleNextToast();
        } else {
            clearTimeout(timeoutRef.current);
        }

        return () => clearTimeout(timeoutRef.current);
    }, [isHeroVisible, queueIndex, toastQueue, shuffleArray]);

    return (
        <div className="fixed bottom-4 right-4 z-50 space-y-2">
            {toasts.map(toast => {
                const displayName = `${toast.name.substring(0, 2)}****${toast.name.substring(toast.name.length - 1)}`;
                const initials = toast.name.substring(0, 2);
                return (
                    <div key={toast.id} className={`${toast.isExiting ? 'toast-exit' : 'toast-enter'} bg-white rounded-lg shadow-lg p-4 flex items-center w-64`}>
                        <div className={`w-10 h-10 rounded-full ${toast.bgColor} flex items-center justify-center text-white font-bold text-lg mr-3 flex-shrink-0 uppercase`}>
                            {initials}
                        </div>
                        <div>
                            <p className="font-semibold text-gray-800">{displayName}</p>
                            <p className="text-xs text-gray-500">se unió hace {toast.time}</p>
                            <p className="text-xs text-gray-500">desde {toast.location}</p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const WaitlistForm = React.forwardRef((props, ref) => {
  const [showActionButtons, setShowActionButtons] = useState(false);

  return (
      <div ref={ref} className="flex flex-wrap justify-center gap-2">
        {/*<input 
          type="email" 
          placeholder="Tu correo electrónico" 
          required 
          className="flex-grow p-3 rounded-lg bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-purple-500 focus:outline-none text-white" 
        />*/}
        <button 
          type="submit" 
          onClick={props.ctaClick}
          className="text-white flex items-center gap-2 bg-gradient-to-r from-purple-500 via-purple-600 to-purple-700 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-purple-300 shadow-lg shadow-purple-800/50 hover:scale-105 font-medium rounded-2xl text-md px-5 py-2.5 text-center mx-2 mb-2"
        >
          {props.buttonText}
          <FiArrowRight />
        </button>
      </div>
  )});

// --- NUEVO: Modal de Onboarding ---
const OnboardingModal = ({ isOpen, onClose }) => {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        perfil: '',
        desafios: [],
        desafio_otro: '',
        nombre: '',
        email: '',
        whatsapp: '',
        nombre_negocio: '',
        ciudad_pais: '',
    });
    const [isLoading, setIsLoading] = useState(false);

    const handleNext = () => {
        analytics.trackOnboardingStepComplete(step);
        if (step === 1 && formData.perfil === 'otro') {
            analytics.trackViewAlternateEnd();
            setStep('alternate_end');
        } else {
            setStep(s => s + 1);
        }
    };
    const handleBack = () => setStep(s => s - 1);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        if (type === 'checkbox') {
            setFormData(prev => ({
                ...prev,
                desafios: checked ? [...prev.desafios, value] : prev.desafios.filter(d => d !== value)
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    // const handleSubmit = async (e) => {
    //     e.preventDefault();
    //     setIsLoading(true);
    //     console.log("Enviando a Firebase:", formData);
    //     await new Promise(resolve => setTimeout(resolve, 1500));
    //     setIsLoading(false);
    //     setStep('success');
    // };

    const handleSubmit = async (e) => {
      e.preventDefault();
      analytics.trackGenerateLead(formData.perfil);
      setIsLoading(true);
      try {
          // Llamada real a la API
          const response = await api.post('/beta/register', formData);
          // const response = await api.post('/auditoria/run', formData);
          console.log("Registro exitoso:", response.data);
          setIsLoading(false);
          setStep('success');
      } catch (error) {
          console.error("Error en el registro:", error.response?.data || error.message);
          // Aquí podrías mostrar un mensaje de error al usuario
          setIsLoading(false);
      }
    };

    // https://docs.google.com/forms/d/e/1FAIpQLSdeOgaV1WjMkBXjKUSrW4S9V7Ln1g2H3i9O_tFAiKN_UFXpag/viewform?usp=pp_url&entry.1507800765=nombre&entry.963108386=email&entry.177240001=999333&entry.2146160094=Atenci%C3%B3n+al+cliente&entry.2146160094=Gesti%C3%B3n+de+inventario&entry.976896117=1+a+5+a%C3%B1os&entry.658812330=Cuaderno+y+lapicero&entry.658812330=Hojas+de+c%C3%A1lculo+(Excel,+Google+Sheets)&entry.1331376788=Mejorar+el+control+y+seguimiento+del+inventario&entry.1331376788=Simplificar+la+gesti%C3%B3n+de+ventas+y+caja

    const generateGoogleFormUrl = () => {
        const formId = "1FAIpQLSdeOgaV1WjMkBXjKUSrW4S9V7Ln1g2H3i9O_tFAiKN_UFXpag"; // <-- REEMPLAZA ESTO
        const baseUrl = `https://docs.google.com/forms/d/e/${formId}/viewform?usp=pp_url`;
        const fieldMapping = {
            perfil: 'entry.123456789',
            desafios: 'entry.987654321',
            desafio_otro: 'entry.112233445',
            nombre: 'entry.1507800765',
            email: 'entry.963108386',
            whatsapp: 'entry.177240001',
            nombre_negocio: 'entry.101010101',
            ciudad_pais: 'entry.303030303' // ID de ejemplo para Ciudad, País
        };
        const params = new URLSearchParams();
        params.append(fieldMapping.perfil, formData.perfil);
        params.append(fieldMapping.desafios, formData.desafios.join(', '));
        if (formData.desafio_otro) {
            params.append(fieldMapping.desafio_otro, formData.desafio_otro);
        }
        params.append(fieldMapping.nombre, formData.nombre);
        params.append(fieldMapping.email, formData.email);
        params.append(fieldMapping.whatsapp, formData.whatsapp);
        params.append(fieldMapping.nombre_negocio, formData.nombre_negocio);
        params.append(fieldMapping.ciudad_pais, formData.ciudad_pais);
        return `${baseUrl}&${params.toString()}`;
    };

    if (!isOpen) return null;

    const progress = step === 1 ? 33 : step === 2 ? 66 : 100;
    const isStepNumeric = typeof step === 'number';

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 transition-opacity duration-300">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg transform transition-all duration-300 scale-95 animate-[scale-up_0.3s_ease-out_forwards]">
                <style>{`.animate-\\[scale-up_0\\.3s_ease-out_forwards\\] { animation-name: scale-up; } @keyframes scale-up { 0% { transform: scale(0.95); } 100% { transform: scale(1); } }`}</style>
                <div className="p-6 relative">
                    <button onClick={onClose} className="bg-white pl-2 absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                        <FiX size={24} />
                    </button>

                    {isStepNumeric && (
                        <>
                            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                                <div className="bg-indigo-600 h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                            </div>
                            <h2 className="text-xl font-bold text-gray-800 mb-2">Paso {step} de 3: {step === 1 ? "Verificación" : step === 2 ? "Tu Mayor Desafío" : "Asegura tu Puesto"}</h2>
                        </>
                    )}

                    {step === 1 && (
                        <div>
                            <p className="text-gray-600 mb-4"><b>¡Estás a punto de asegurar tu lugar en la beta privada!</b><br/>Solo unas pocas ferreterías formarán parte de esta etapa inicial. Por favor, confirma que tu negocio principal es una ferretería minorista.</p>
                            <div className="space-y-3">
                                <label className={`block p-4 rounded-lg border cursor-pointer ${formData.perfil === 'ferreteria_minorista' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300'}`}>
                                    <input type="radio" name="perfil" value="ferreteria_minorista" onChange={handleChange} className="mr-2"/>
                                    Sí, mi ferretería es minorista.
                                </label>
                                <label className={`block p-4 rounded-lg border cursor-pointer ${formData.perfil === 'otro' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300'}`}>
                                    <input type="radio" name="perfil" value="otro" onChange={handleChange} className="mr-2"/>
                                    No, mi negocio es otro.
                                </label>
                            </div>
                            <div className="mt-6 flex justify-end">
                                <button onClick={handleNext} disabled={formData.perfil === ''} className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed">Siguiente →</button>
                            </div>
                        </div>
                    )}
                    {step === 2 && (
                        <div>
                            <p className="text-gray-600 mb-4">Queremos que esta herramienta resuelva problemas reales. Ayúdanos a entender qué es lo que más te frena hoy. Puedes marcar las opciones que quieras.</p>
                            <div className="space-y-1">
                                {['Control de Inventario', 'Gestión de Compras', 'Pérdida de Tiempo', 'Proceso de Ventas Lento', 'Decisiones de Negocio'].map(desafio => (
                                    <label key={desafio} className="flex items-center p-3 rounded-lg hover:bg-gray-50">
                                        <input type="checkbox" name="desafios" value={desafio.toLowerCase().replace(/ /g, '_')} onChange={handleChange} checked={formData.desafios.includes(desafio.toLowerCase().replace(/ /g, '_'))} className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                                        <span className="ml-3 text-gray-700">{desafio}</span>
                                    </label>
                                ))}
                                <div className="p-3">
                                    <input type="text" name="desafio_otro" placeholder="Otro (opcional)" onChange={handleChange} className="w-full p-2 border-b-2 border-gray-200 focus:border-indigo-500 outline-none" />
                                </div>
                            </div>
                            <div className="mt-6 flex justify-between">
                                <button onClick={handleBack} className="px-6 py-2 text-gray-600 font-semibold rounded-lg">← Atrás</button>
                                <button onClick={handleNext} className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg">Siguiente →</button>
                            </div>
                        </div>
                    )}
                    {step === 3 && (
                        <form onSubmit={handleSubmit}>
                            <p className="text-gray-600 mb-4">Perfecto. Estás en la lista. Déjanos tus datos para enviarte la invitación formal y el acceso prioritario.</p>
                            <div className="space-y-1">
                                <input type="text" name="nombre" placeholder="Nombre y Apellido" onChange={handleChange} required className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                                <input type="email" name="email" placeholder="Correo Electrónico Principal" onChange={handleChange} required className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                                <input type="tel" name="whatsapp" placeholder="WhatsApp" value={formData.whatsapp} onChange={handleChange} required className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                                <input type="text" name="nombre_negocio" placeholder="Nombre de tu Ferretería" onChange={handleChange} required className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                                <input type="text" name="ciudad_pais" placeholder="Ciudad, País" onChange={handleChange} required className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div className="mt-6 flex justify-between items-center">
                                <button type="button" onClick={handleBack} className="px-6 py-2 text-gray-600 font-semibold rounded-lg">← Atrás</button>
                                <button type="submit" disabled={isLoading} className="px-6 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:bg-gray-300 flex items-center">
                                    {isLoading && <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                                    {isLoading ? 'Enviando...' : '¡Quiero ser Piloto!'}
                                </button>
                            </div>
                        </form>
                    )}
                    {step === 'success' && (
                        <div className="text-center">
                            <span className="text-6xl">🚀</span>
                            <h2 className="text-2xl font-bold text-gray-800 mt-4">¡Todo listo! Tu lugar está reservado.</h2>
                            <p className="text-gray-600 mt-2">Gracias por registrarte. Has sido añadido a nuestra lista.</p>
                            
                            <div className="mt-4 bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                                <h2 className="text-blue-700 font-bold">Sé de los primeros en probar la herramienta</h2>
                                <p className="text-gray-600 text-sm">Responde unas breves preguntas y recibe acceso temprano, además podrías opinar directamente sobre nuevas funciones</p>
                                <a href={generateGoogleFormUrl()} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors">
                                    Completar Encuesta (1 min)
                                </a>
                            </div>

                            <div className="mt-4">
                                <button onClick={onClose} className="px-6 py-2 text-gray-500 font-semibold rounded-lg hover:bg-gray-200">Entendido</button>
                            </div>
                        </div>
                    )}
                     {step === 'alternate_end' && (
                        <div className="text-center p-8">
                            <h2 className="text-xl font-bold text-gray-800 mt-4">Gracias por tu interés</h2>
                            <p className="text-gray-600 mt-2">El beneficio de esta app es para aquellos que acrediten tener ferretería(s) con fin de venta al público.</p>
                            <p className="text-gray-600 mt-4">Si necesitas alguna otra app te invitamos a que veas a otras que tenemos para ti en <a href="https://ferreteros.app" target="_self" rel="noopener noreferrer" className="text-indigo-600 font-semibold hover:underline">https://ferreteros.app</a>.</p>
                            <div className="mt-8">
                                <a href="https://ferreteros.app" target="_self" rel="noopener noreferrer" className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg">
                                    Ver otras apps
                                </a>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};



export function LandingView({ onStartSession, onLoginClick, onRegisterClick }) {
  const heroRef = useRef(null);
  const [isHeroVisible, setIsHeroVisible] = useState(true);

  const [showActionButtons, setShowActionButtons] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false); // Estado para el modal
  const [isLoginBetaModalOpen, setIsLoginBetaModalOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false); // <-- Nuevo estado

  const openOnboardingModal = () => {
    analytics.trackBeginOnboarding();
    setIsModalOpen(true);
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Actualiza el estado basado en si el elemento está intersectando (visible)
        setIsHeroVisible(entry.isIntersecting);
      },
      { threshold: 0.5 } // Se considera visible si al menos el 50% lo está
    );

    if (heroRef.current) {
      observer.observe(heroRef.current);
    }

    // Limpieza: deja de observar cuando el componente se desmonta
    return () => {
      if (heroRef.current) {
        observer.unobserve(heroRef.current);
      }
    };
  }, []);

  // --- LÓGICA PARA ACTIVAR BOTONES DESDE LA URL ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // Buscamos un parámetro específico, por ejemplo `?cta=true`
    if (params.get('beta') === 'true') {
      setShowActionButtons(true);
    }
  }, []);

  const handleLoginClick = () => {
    if (showActionButtons)
      onLoginClick()
    else {
      setIsLoginBetaModalOpen(true)
    }
  }

  return (
   <> 
    <OnboardingModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    <LoginModalBeta isOpen={isLoginBetaModalOpen} onClose={() => setIsLoginBetaModalOpen(false)} />
    <ToastManager isHeroVisible={isHeroVisible} />
    <PrivacyPolicyModal isOpen={isPrivacyModalOpen} onClose={() => setIsPrivacyModalOpen(false)} /> {/* <-- Nuevo Modal */}
    <div className="w-full bg-gray-900 text-white animate-fade-in">
      {/* Navbar Simple */}
      <nav className="p-4 flex bg-black justify-between items-center">
        <h1 className="text-2xl font-bold gradient-text">
          <span
            className="text-3xl bg-clip-text text-transparent"
            style={{ backgroundImage: 'linear-gradient(to right, #560bad, #7209b7, #b5179e)' }}
          >
            Ferretero.IA
          </span>
        </h1>
        <button 
          onClick={() => handleLoginClick()} 
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
        >
          <FiLogIn /> Iniciar Sesión
        </button>
      </nav>

      {/* Sección 0: Héroe (Ahora con imagen de fondo) */}
        <section 
          className="relative min-h-[calc(100vh-83px)] flex items-center text-center bg-cover bg-center" 
          style={{ backgroundImage: "url('/background-hero-h.png')" }}
        >
          <div className="absolute inset-0 bg-black bg-opacity-80"></div>
          <div className="relative container mx-auto px-6">
            {/*<h1 className="text-4xl md:text-6xl font-black mb-4 leading-tight">
              Tu ferretería tiene <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: 'linear-gradient(to right, #560bad, #7209b7, #b5179e)' }}
              >dinero escondido</span>.
              <br />
              Te ayudamos a encontrarlo.
            </h1>*/}
            <AnimateOnScroll delay={ 200 }>
              <h1 className="text-3xl max-w-4xl py-2 md:text-6xl justify-center mx-auto font-black mb-4 leading-tight">
                Analiza los números de tu Ferretería y decide mejor en minutos,
                <span
                  className="bg-clip-text font-extrabold text-transparent ml-3"
                  style={{ backgroundImage: 'linear-gradient(to right, #6608d2, #c700ff, #b5179e)' }}
                >
                  <b>no en horas</b>
                </span>.
              </h1>
            </AnimateOnScroll>
            {/*<p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto mb-8">
              Ferretero.IA es la primera plataforma de inteligencia de negocios diseñada para el Ferretero Independiente. Convierte la información de tu negocio en decisiones que aumentarán tu rentabilidad.
            </p>*/}
            <AnimateOnScroll delay={ 600 }>
            <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto mb-8">
              {/*Usa Ferretero.IA y convierte tu ferretería en tu mayor fuente de rentabilidad.<br/><b>Obtén el diagnóstico. Define el plan. Toma el control.</b>*/}
              Aumenta tu rentabilidad con tecnología que protege tu privacidad.
              {/*<br/><b>Obtén el diagnóstico. Define el plan. Toma el control.</b>*/}
            </p>
            </AnimateOnScroll>
            {/* --- RENDERIZADO CONDICIONAL DE BOTONES --- */}
            {showActionButtons ? (
              <div className="flex flex-col-2 sm:flex-row gap-4 justify-center animate-fade-in">
                  <button onClick={onLoginClick} className="px-6 py-3 font-bold bg-gray-700 hover:bg-gray-600 rounded-lg">Iniciar Sesión</button>
                  {/*<button onClick={onRegisterClick} className="px-6 py-3 font-bold bg-gray-700 hover:bg-gray-600 rounded-lg">Registrarse</button>*/}
                  <button onClick={onStartSession} className="px-6 py-3 font-bold bg-purple-600 hover:bg-purple-700 rounded-lg">Probar Demo Anónimo</button>
              </div>
            ) : (
              <>
                <AnimateOnScroll delay={ 900 }>
                  {/*<WaitlistForm  ref={heroRef} />*/}
                  <p className="text-xs max-w-sm text-gray-400 justify-center mx-auto mb-2">Asegura tu lugar en nuestra beta privada</p>
                  <WaitlistForm ref={heroRef} ctaClick={() => openOnboardingModal()} buttonText="Quiero analizar mi ferretería" />
                </AnimateOnScroll>
                <AnimateOnScroll delay={ 1000 }>
                  <SlidingAvatars ctaClick={() => openOnboardingModal()} />
                </AnimateOnScroll>
                <AnimateOnScroll delay={ 1100 }>
                  {/*<p className="text-xs max-w-sm text-gray-400 justify-center mx-auto mt-2">Asegura tu lugar en nuestra beta privada</p>*/}
                  <DynamicSocialProofText />
                </AnimateOnScroll>
              </>
            )}
          </div>
        </section>

      {/* Sección 0: DATA PRIVACY */}
      <section className="py-20 bg-black bg-opacity-30">
        <div className="container mx-auto px-6">
          <AnimateOnScroll delay={ 500 }>
            <img
              src="/lock.svg"
              alt="La Oportunidad de Crecer"
              className="w-15 h-15 mb-3 mx-auto"
            />
            <h2 className="text-3xl md:text-4xl max-w-3xl mx-auto font-bold text-center mb-4">
              Desbloquea tus datos, Protege tu privacidad.
              <span
                className="bg-clip-text font-extrabold text-transparent ml-2"
                style={{ backgroundImage: 'linear-gradient(to right, #560bad, #7209b7, #b5179e)' }}
              >
                Impulsa tu Rentabilidad
              </span>.
            </h2>
            <p className="text-gray-400 text-center mb-6 max-w-2xl mx-auto">Nuestra plataforma de inteligencia de negocio se conecta de forma simple y segura a tu sistema de ventas actual. No reemplazamos nada, potenciamos lo que ya tienes. Extrae el máximo valor de la información que generas cada día para aumentar tu rentabilidad, fortalecer tu negocio y mitigar los riesgos de seguridad.</p>
          </AnimateOnScroll>
          <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8">
            {/* Bloque 1 */}
          <AnimateOnScroll delay={ 500 }>
            <div className="flex flex-col items-start text-white bg-purple-900 p-4">
              <div className="flex items-end">
                <div className="relative w-44 h-44">
                  <svg className="absolute top-0 left-0 w-full h-full" viewBox="0 0 183.525 183.524">
                    <circle
                      cx="91.76"
                      cy="91.76"
                      r="84.26"
                      stroke="#c3c4f1"
                      strokeWidth="15"
                      fill="none"
                    />
                    <circle
                      cx="91.76"
                      cy="91.76"
                      r="84.26"
                      stroke="#54b8a8"
                      strokeWidth="15"
                      fill="none"
                      strokeDasharray="529"
                      strokeDashoffset="170"
                      transform="rotate(-90 91.76 91.76)"
                    />
                    <circle
                      cx="91.76"
                      cy="91.76"
                      r="84.26"
                      stroke="#292888"
                      strokeWidth="15"
                      fill="none"
                      strokeDasharray="529"
                      strokeDashoffset="270"
                      transform="rotate(-90 91.76 91.76)"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-4xl sm:text-5xl font-bold">
                    +25<span className="text-2xl ml-1">%</span>
                  </div>
                </div>
                <div className="mt-6 flex flex-col text-left px-4">
                  <span className="text-4xl text-left mb-2">📈</span>
                  <p className="text-xl md:text-2xl font-semibold mb-2 text-left text-green-200">Oportunidad de crecimiento</p>
                </div>
              </div>
              <p className="text-base text-center leading-relaxed">
                Las pymes que utilizan sus datos para tomar decisiones aumentan su rentabilidad en más de un 25% en promedio. La inteligencia de negocio ya no es solo para las grandes cadenas.
              </p>
            </div>
          </AnimateOnScroll>            
          <AnimateOnScroll delay={ 700 }>
            {/* Bloque 2 */}
            <div className="flex flex-col items-start text-white bg-purple-900 p-4">
              <div className="flex items-end">
                <div className="relative w-44 h-44">
                  <svg className="absolute top-0 left-0 w-full h-full" viewBox="0 0 183.525 183.524">
                    <circle
                      cx="91.76"
                      cy="91.76"
                      r="84.26"
                      stroke="#c3c4f1"
                      strokeWidth="15"
                      fill="none"
                    />
                    <circle
                      cx="91.76"
                      cy="91.76"
                      r="84.26"
                      stroke="#54b8a8"
                      strokeWidth="15"
                      fill="none"
                      strokeDasharray="529"
                      strokeDashoffset="0"
                      transform="rotate(-90 91.76 91.76)"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-4xl sm:text-5xl font-bold text-center">
                    2x
                  </div>
                </div>
                <div className="mt-6 flex flex-col text-left px-4">
                  <span className="text-4xl text-left mb-2">🏆🏆</span>
                  <p className="text-xl md:text-2xl font-semibold mb-2 text-left text-red-200">Doblemente Exitosos</p>
                </div>
              </div>
              <p className="text-base text-center leading-relaxed">
                Las empresas que basan sus decisiones en análisis de datos tienen el doble de probabilidades de superar sus metas de negocio que las que se basan solo en la intuición o la experiencia.
              </p>
            </div>
          </AnimateOnScroll>
          </div>
          <AnimateOnScroll delay={ 900 }>
          <p className="text-gray-600 mx-auto text-center my-4">Fuente: Deloitte, "2024 Enterprise Tech Trends"</p>
          </AnimateOnScroll>
        </div>
      </section>

      {/* Sección 0: confianza */}
      <section className="py-20 text-center">
        <div className="container mx-auto px-6">
          <AnimateOnScroll delay={ 500 }>
            <img
              src="/hand-you.svg"
              alt="La Oportunidad de Crecer"
              className="w-36 h-36 mb-3 mx-auto"
            />
            <h2 className="text-3xl md:text-4xl max-w-3xl mx-auto font-bold mb-4">Nuestra Única Alianza 
              <span
                className="bg-clip-text font-extrabold text-transparent ml-2"
                style={{ backgroundImage: 'linear-gradient(to right, #560bad, #7209b7, #b5179e)' }}
              >
                es Contigo
              </span>.
            </h2>
          </AnimateOnScroll>
          <AnimateOnScroll delay={ 600 }>
            <p className="mt-6 max-w-3xl mx-auto text-lg font-medium text-purple-400">
              Somos 100% independientes. Sin acuerdos con marcas o proveedores. Solo trabajamos para una parte: <b>Para tu Ferretería</b>. Cada recomendación busca una sola cosa: <b>Tu Rentabilidad.</b>
            </p>
          </AnimateOnScroll>
        </div>
      </section>

      {/* --- NUEVA SECCIÓN DE COMPARACIÓN (RESTILIZADA) --- */}
      <section className="py-20 px-4 bg-black bg-opacity-20">
          <div className="container mx-auto max-w-5xl">
              <AnimateOnScroll onVisible={analytics.trackViewSectionComparison}>
                  <h2 className="text-3xl md:text-4xl max-w-3xl mx-auto font-bold text-center mb-8 text-gray-200">
                      ¿Cómo cambia tu negocio con
                      <span
                        className="bg-clip-text font-extrabold text-transparent ml-2"
                        style={{ backgroundImage: 'linear-gradient(to right, #560bad, #7209b7, #b5179e)' }}
                      >
                        Nuestra Plataforma
                      </span>?
                  </h2>
              </AnimateOnScroll>
              <div className="grid md:grid-cols-2 gap-8">
                  {/* Columna "Antes" */}
                  <AnimateOnScroll>
                      <div className="bg-gray-100 p-8 rounded-xl shadow-lg h-full border border-gray-200">
                          <div className="text-lg font-bold text-red-600 bg-red-200 rounded-full px-4 py-2 inline-block mb-6">
                              El Día a Día Manual
                          </div>
                          <ul className="space-y-6 text-gray-600">
                              <li className="flex items-start">
                                  <span className="text-red-500 mr-4 mt-1">❌</span>
                                  <div>
                                      <strong className="text-gray-800">Compras basadas en intuición:</strong> Adivinar qué productos reponer, arriesgando capital en stock de baja rotación.
                                  </div>
                              </li>
                              <li className="flex items-start">
                                  <span className="text-red-500 mr-4 mt-1">❌</span>
                                  <div>
                                      <strong className="text-gray-800">Horas perdidas en tareas repetitivas:</strong> Actualizar precios manualmente, conciliar ventas y revisar facturas una por una.
                                  </div>
                              </li>
                              <li className="flex items-start">
                                  <span className="text-red-500 mr-4 mt-1">❌</span>
                                  <div>
                                      <strong className="text-gray-800">Falta de visibilidad:</strong> No tener una idea clara de la rentabilidad diaria o de las oportunidades de venta perdidas.
                                  </div>
                              </li>
                          </ul>
                      </div>
                  </AnimateOnScroll>

                  {/* Columna "Después" */}
                  <AnimateOnScroll delay="delay-200">
                      <div className="bg-gray-100 p-8 rounded-xl shadow-lg h-full border border-gray-200">
                          <div className="text-lg font-bold text-teal-600 bg-teal-200 rounded-full px-4 py-2 inline-block mb-6">
                              El Futuro con Nuestra Plataforma
                          </div>
                          <ul className="space-y-6 text-gray-600">
                              <li className="flex items-start">
                                  <span className="text-green-500 mr-4 mt-1">✅</span>
                                  <div>
                                      <strong className="text-gray-800">Decisiones basadas en datos:</strong> Identifica tus productos más rentables y optimiza tu inventario para maximizar cada venta.
                                  </div>
                              </li>
                              <li className="flex items-start">
                                  <span className="text-green-500 mr-4 mt-1">✅</span>
                                  <div>
                                      <strong className="text-gray-800">Procesos automatizados:</strong> Ahorra hasta un 70% en costos de procesamiento y libera a tu equipo para que se enfoque en tareas estratégicas.
                                  </div>
                              </li>
                              <li className="flex items-start">
                                  <span className="text-green-500 mr-4 mt-1">✅</span>
                                  <div>
                                      <strong className="text-gray-800">Control y visibilidad en tiempo real:</strong> Accede a reportes claros desde cualquier dispositivo y ten el control total de tu flujo de caja y rendimiento.
                                  </div>
                              </li>
                          </ul>
                      </div>
                  </AnimateOnScroll>
              </div>
          </div>
      </section>

      {/* --- NUEVA SECCIÓN "EN SOLO 3 PASOS" --- */}
      <section className="py-20 px-4 bg-black bg-opacity-40">
          <div className="container mx-auto max-w-6xl">
              <AnimateOnScroll onVisible={analytics.trackViewSectionSteps}>
                  <h2 className="text-3xl md:text-4xl max-w-3xl mx-auto font-bold text-center mb-16 text-white">
                      En solo 3 pasos, transformas datos en 
                      <span
                        className="bg-clip-text font-extrabold text-transparent ml-2"
                        style={{ backgroundImage: 'linear-gradient(to right, #560bad, #7209b7, #b5179e)' }}
                      >
                        decisiones rentables
                      </span>:
                  </h2>
              </AnimateOnScroll>
              <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
                  {/* Paso 1 */}
                  <AnimateOnScroll>
                      <div className="p-6 bg-gray-800 ">
                          <div className="flex items-center mb-4">
                              <div className="text-4xl font-extrabold text-purple-400 mr-4">01</div>
                              <h3 className="text-xl font-bold text-white">Conecta de Forma Segura</h3>
                          </div>
                          <p className="text-gray-300">
                              Vincula tu sistema de punto de venta actual a nuestra plataforma en minutos. Usamos encriptación de nivel bancario para garantizar que tu información viaje 100% segura.
                          </p>
                      </div>
                  </AnimateOnScroll>

                  {/* Paso 2 */}
                  <AnimateOnScroll delay="delay-200">
                      <div className="p-6 bg-gray-800 ">
                          <div className="flex items-center mb-4">
                              <div className="text-4xl font-extrabold text-purple-400 mr-4">02</div>
                              <h3 className="text-xl font-bold text-white">Desbloquea tus Insights</h3>
                          </div>
                          <p className="text-gray-300 mb-4">
                              Nuestra inteligencia asistida analiza tus ventas y te muestra de forma visual e intuitiva:
                          </p>
                          <ul className="space-y-3 text-gray-300">
                              {/*<li className="flex items-start"><span className="text-green-500 mr-3 mt-1">✅</span> Identifica riesgos de quiebres de stock en tus productos estrellas.</li>*/}
                              <li className="flex items-start"><span className="text-green-500 mr-3 mt-1">✅</span> Cuándo es el momento exacto para reponer stock de cada producto.</li>
                              <li className="flex items-start"><span className="text-green-500 mr-3 mt-1">✅</span> Cuáles son tus productos con aceleración en ventas.</li>
                              <li className="flex items-start"><span className="text-green-500 mr-3 mt-1">✅</span> Qué productos estan con riesgo de quiebre de stock, exceso de stock y cuáles ya son stock muerto.</li>
                              <li className="flex items-start"><span className="text-green-500 mr-3">✅</span> Y muchos análisis más...</li>
                          </ul>
                      </div>
                  </AnimateOnScroll>

                  {/* Paso 3 */}
                  <AnimateOnScroll delay="delay-400">
                      <div className="p-6 bg-gray-800 ">
                          <div className="flex items-center mb-4">
                              <div className="text-4xl font-extrabold text-purple-400 mr-4">03</div>
                              <h3 className="text-xl font-bold text-white">Decide y Crece</h3>
                          </div>
                          <p className="text-gray-300">
                              Usa estos informes claros y precisos para tomar decisiones basadas en evidencia, no en intuición. Compra mejor, vende más inteligentemente y observa cómo crece tu rentabilidad.
                          </p>
                      </div>
                  </AnimateOnScroll>
              </div>
          </div>
      </section>

      {/* Sección 2: El Problema (con UX/UI mejorada) */}
      {/*<section className="py-20 bg-black bg-opacity-40">
        <div className="container mx-auto px-6 text-center">
          <AnimateOnScroll delay={ 500 }>
            <h2 className="text-3xl md:text-4xl font-bold mb-6">¿Tu almacén está lleno pero sientes que el dinero no alcanza?</h2>
          </AnimateOnScroll>
          <AnimateOnScroll delay={ 600 }>
            <p className="text-lg text-purple-400 mb-6">
              <b>Cada producto que no rota y cada compra en exceso es capital que no trabaja.</b><br/>La intuición te ayuda a vender, pero los datos te ayudan decidir con precisión.
            </p>
          </AnimateOnScroll>
          <div className="max-w-2xl mx-auto text-left space-y-6">
            <AnimateOnScroll delay={ 700 }>
              <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 flex items-start gap-4">
                <FiCheckCircle className="text-purple-400 text-2xl mt-1 flex-shrink-0" />
                <p className="font-semibold">¿Estás seguro de que tu producto más vendido es también el más rentable?</p>
              </div>
            </AnimateOnScroll>
            <AnimateOnScroll delay={ 800 }>
              <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 flex items-start gap-4">
                <FiCheckCircle className="text-purple-400 text-2xl mt-1 flex-shrink-0" />
                <p className="font-semibold">¿Sientes que trabajas más, vendes más, pero no necesariamente ganas más?</p>
              </div>
            </AnimateOnScroll>
            <AnimateOnScroll delay={ 900 }>
              <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 flex items-start gap-4">
                <FiCheckCircle className="text-purple-400 text-2xl mt-1 flex-shrink-0" />
                <p className="font-semibold">¿Tus Compras son en base a la demanda real o al catálogo del proveedor?</p>
              </div>
            </AnimateOnScroll>
          </div>
        </div>
      </section>*/}


      {/* Sección 1: Beneficios Clave */}
      {/*<section className="py-20 bg-black bg-opacity-20">
        <div className="container mx-auto px-6 text-center">
            <h2 className="text-4xl md:text-4xl font-bold mb-4">Nuestra única prioridad:  
              <span
                className="bg-clip-text font-extrabold text-transparent ml-2"
                style={{ backgroundImage: 'linear-gradient(to right, #560bad, #7209b7, #b5179e)' }}
              >
                Tu Rentabilidad
              </span>.
            </h2>
            <p className="text-lg font-semibold text-purple-400 mb-6">
              No somos otro software de gestión. <b>Somos tu departamento de inteligencia.</b>
            </p>
          <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-gray-800 p-8 rounded-lg border border-gray-700 text-center">
                <div className="text-4xl text-purple-400 mb-4">🛡️👑</div>
                <h3 className="text-xl font-bold mb-2">Independencia y Confianza</h3>
                <p className="text-gray-400">No estamos afiliados a ninguna marca, distribuidor o cadena. Nuestra única lealtad es con la <b>Rentabilidad de tu Ferretería.</b> Tus decisiones valen más cuando se basan en datos. Los datos son tuyos y son 100% confidenciales. Siempre.</p>
                {/*<p className="text-gray-400">No estamos afiliados a ninguna marca, distribuidor o cadena. Nuestra única lealtad es con la <b>Rentabilidad de tu Ferretería.</b> Tus datos son tuyos y son 100% confidenciales, Úsalos para tomar mejores decisiones.No te conformes con menos.</p>*/}
              {/*</div>
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
      </section>*/}

      {/* --- NUEVA SECCIÓN DE FAQ --- */}
      <section className="py-20 px-4 bg-black bg-opacity-70">
          <div className="container mx-auto max-w-4xl">
              <AnimateOnScroll onVisible={analytics.trackViewSectionFAQ}>
                  <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-white">
                      Preguntas Frecuentes (FAQ)
                  </h2>
                  <FAQSection />
              </AnimateOnScroll>
          </div>
      </section>

      {/* Sección 3: La Solución */}
      <section className="py-20 text-center">
        <div className="container mx-auto px-6">
          <AnimateOnScroll delay={ 500 }>
            <h2 className="text-3xl md:text-4xl font-bold mb-4"><b>Potencia el trabajo que ya haces a diario.</b>
            </h2>
          </AnimateOnScroll>
          <AnimateOnScroll delay={ 600 }>
            <p className="mt-6 text-lg font-semibold max-w-3xl mx-auto text-purple-400 max-w-xl">
              Toma decisiones inteligentes que impulsan tus ganancias. Deja de adivinar y empieza a rentabilizar más.
            </p>
          </AnimateOnScroll>
          <AnimateOnScroll delay={ 600 }>
            <div className="grid md:grid-cols-2 max-w-xl mx-auto gap-2 mt-6">
              <WaitlistForm ctaClick={() => openOnboardingModal()} buttonText="Analiza ahora tu Ferretería" />
              <a href="https://calendly.com/soy-christian-barreto/30min" target="_blank" rel="noopener noreferrer" className="text-purple-800 mx-auto flex justify-center max-w-sm items-center gap-2 bg-purple-300 focus:ring-4 focus:outline-none focus:ring-purple-300 shadow-lg shadow-purple-800/50 hover:scale-105 font-medium rounded-2xl text-md px-5 py-2.5 text-center mx-2 mb-2">
                  Chatea con el Fundador <FiArrowRight />
              </a>
            </div>
            <p className="text-gray-600 mx-auto text-center my-4">Verás resultados en menos de 20 minutos</p>
            {/*<p className="text-sm text-gray-500 mt-4 max-w-md mx-auto">Los miembros de la lista de espera recibirán una invitación exclusiva a nuestra beta privada y un descuento especial de fundador.</p>*/}
          </AnimateOnScroll>
        </div>
      </section>

      {/* Sección 4: Beneficios Clave */}
      {/*<section className="py-20 bg-black bg-opacity-30">
        <div className="container mx-auto px-6">
          <AnimateOnScroll delay={ 500 }>
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
              Tu Experiencia + Nuestro Análisis
              <span
                className="bg-clip-text font-extrabold text-transparent ml-2"
                style={{ backgroundImage: 'linear-gradient(to right, #560bad, #7209b7, #b5179e)' }}
              >
                = Tu Arma Secreta
              </span>.
            </h2>
          </AnimateOnScroll>
          <div className="grid md:grid-cols-3 gap-8">
            <AnimateOnScroll delay={ 600 }>
              <div className="bg-gray-800 p-8 rounded-lg border border-gray-700 text-center">
                <div className="text-4xl text-purple-400 mb-4">💰</div>
                <h3 className="text-xl font-bold mb-2">Descubre tu Capital Oculto</h3>
                <p className="text-gray-400">Identifica cuánto dinero tienes inmovilizado en productos de baja rotación para que puedas liberarlo y reinvertirlo inteligentemente.</p>
              </div>
            </AnimateOnScroll>
            <AnimateOnScroll delay={ 800 }>
              <div className="bg-gray-800 p-8 rounded-lg border border-gray-700 text-center">
                <div className="text-4xl text-purple-400 mb-4">📦</div>
                <h3 className="text-xl font-bold mb-2">Optimiza tu Inventario</h3>
                <p className="text-gray-400">Recibe recomendaciones claras sobre qué, cuándo y cuánto comprar. Evita el sobre-stock y los quiebres de stock que te hacen perder ventas.</p>
              </div>
            </AnimateOnScroll>
            <AnimateOnScroll delay={ 900 }>
              <div className="bg-gray-800 p-8 rounded-lg border border-gray-700 text-center">
                <div className="text-4xl text-purple-400 mb-4">📈</div>
                <h3 className="text-xl font-bold mb-2">Maximiza tu Rentabilidad</h3>
                <p className="text-gray-400">Enfócate en los productos y marcas que realmente hacen crecer tu margen de ganancia. Toma decisiones con la confianza que solo los datos pueden dar.</p>
              </div>
            </AnimateOnScroll>
          </div>
        </div>
      </section>*/}

      {/* Sección 5: Llamada a la Acción Final */}
      {/*<section className="py-20 bg-black bg-opacity-20 text-center">
        <AnimateOnScroll delay={ 400 }>
          <div className="container mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold mb-4"><b>Sé el Piloto,</b> no el Pasajero.</h2>
            <p className="text-gray-300 max-w-3xl mx-auto mb-8">
              Un grupo reducido de ferreteros probará antes que nadie una herramienta pensada para transformar su negocio. Esto no es para todos, es una invitación.
            </p>
            {/*<WaitlistForm />*/}
            {/*<WaitlistForm ctaClick={() => openOnboardingModal()} buttonText="QUIERO ACCESO PRIORITARIO" />
            <p className="text-sm text-gray-500 mt-4 max-w-md mx-auto">Los miembros de la lista de espera recibirán una invitación exclusiva a nuestra beta privada y un descuento especial de fundador.</p>
          </div>
        </AnimateOnScroll>
      </section>*/}

      {/* Footer */}
      <footer className="text-center py-8 bg-black bg-opacity-60 border-t border-gray-800">
        <p className="text-gray-500">&copy; 2025 Ferretero.IA - Todos los derechos reservados.</p>

        <p onClick={() => setIsPrivacyModalOpen(true)} className="text-gray-500 hover:text-gray-50 cursor-pointer hover:underline transition-colors">
            Política de Privacidad
        </p>
        <FerreterosLogo/>
      </footer>
    </div>
  </>
  );
}