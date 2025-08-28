// src/components/BecomeStrategistModal.jsx
import React from 'react';
// import { FiAward, FiX, FiExternalLink} from 'react-icons/fi';
import { useWorkspace } from '../context/WorkspaceProvider'; // Importamos el hook para obtener el usuario
import { FiAward, FiX, FiExternalLink, FiBarChart2, FiPackage, FiGlobe, FiZap } from 'react-icons/fi';

// --- FUNCIÓN AUXILIAR PARA ABRIR EL FORMULARIO ---
// Puedes mover esta función a un archivo de utils si la usas en más lugares.
const openVerificationForm = (userEmail) => {
  // --- ¡CONFIGURACIÓN IMPORTANTE! ---
  // Reemplaza estos valores con los de tu propio Google Form.
  const GOOGLE_FORM_ID = "1FAIpQLScRhAM5M5_rAnTU9X_giZYH1ZrDBrR0ME_vKp8dcJ9DrrkSww"; // Ej: 1FAIpQLSc...
  const EMAIL_FIELD_ID = "entry.1889241237"; // Ej: entry.123456789

  // Construimos la URL base
  const formUrl = `https://docs.google.com/forms/d/e/${GOOGLE_FORM_ID}/viewform`;
  
  // Creamos un objeto URL para añadir los parámetros de forma segura
  const urlWithParams = new URL(formUrl);
  if (userEmail) {
    urlWithParams.searchParams.append(EMAIL_FIELD_ID, userEmail);
  }

  // Abrimos la URL final en una nueva pestaña
  window.open(urlWithParams.toString(), '_blank');
};

// --- Sub-componente para cada Beneficio ---
const BenefitItem = ({ icon, title, description }) => (
    <div className="flex items-center gap-4 text-left">
        <div className="text-yellow-500 bg-yellow-100 p-2 rounded-full">
            {icon}
        </div>
        <div>
            <h4 className="font-semibold text-gray-800 leading-tight">{title}</h4>
            <p className="text-sm text-gray-600">{description}</p>
        </div>
    </div>
);

export function BecomeStrategistModal({ onClose }) {
  const { user } = useWorkspace();

  const handleVerifyClick = () => {
    openVerificationForm(user?.email);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full flex flex-col max-h-[95vh]">
        <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white">
            <div className="flex items-center gap-2">
                <FiAward className="text-yellow-500" />
                <h2 className="text-xl font-bold text-gray-800">Conviértete en Ferretero Estratega</h2>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700"><FiX size={26}/></button>
        </div>
        
        <div className="overflow-y-auto p-6 text-gray-700">
            <div className="text-center mb-6 gap-4">
                <p className="text-gray-600 mb-4">
                    Como usuario, ya tienes acceso a potentes reportes sobre tus ventas, márgenes e inventario.
                </p>
                <p className="text-gray-600 bg-yellow-100 p-2 font-medium">
                Pero al unirte a <b>nuestra comunidad de negocios verificados</b>, accedes a la Inteligencia de Comunidad: una red anónima de datos reales, actualizados y validados por cientos de empresas como la tuya.<br/><b>Esto te permitirá:</b>
                </p>
            </div>

            <div className="space-y-4">
                <BenefitItem 
                    icon={<FiGlobe size={20}/>}
                    title="Comparar tu rendimiento frente a promedios reales del mercado."
                    description=""
                />
                <BenefitItem 
                    icon={<FiZap size={20}/>}
                    title="Detectar oportunidades invisibles en tus categorías."
                    description=""
                />
                <BenefitItem 
                    icon={<FiBarChart2 size={20}/>}
                    title="Identificar tendencias antes que el resto."
                    description=""
                />
                <BenefitItem 
                    icon={<FiPackage size={20}/>}
                    title="Participar en compras e importaciones grupales, accediendo a mejores precios, condiciones y eficiencia logística."
                    description=""
                />
                {/*<BenefitItem 
                    icon={<FiGlobe size={20}/>}
                    title="Radar de Mercado Local"
                    description="Descubre qué productos 'Clase A' no tienes en tu catálogo pero que son top sellers para otros ferreteros estrategas en tu misma zona geográfica."
                />
                <BenefitItem 
                    icon={<FiBarChart2 size={20}/>}
                    title="Gráficos de Benchmarking"
                    description="Visualiza tu rendimiento en métricas clave y compáralo con el promedio del mercado para identificar oportunidades de mejora."
                />
                <BenefitItem 
                    icon={<FiZap size={20}/>}
                    title="Conexiones Automáticas (Próximamente)"
                    description="Sincroniza tu sistema POS o ERP para automatizar la carga de datos, ahorrando horas de trabajo y asegurando análisis siempre actualizados."
                />*/}
            </div>
        </div>

        <div className="p-4 border-t bg-gray-50 sticky bottom-0">
            <p className="text-xs text-center text-gray-500 mb-3">El proceso de verificación es rápido y asegura la calidad de los datos para toda la comunidad.</p>
            <button 
                onClick={handleVerifyClick}
                className="w-full bg-yellow-500 text-black font-bold py-3 px-4 rounded-lg hover:bg-yellow-400 flex items-center justify-center gap-2 text-lg"
                style={{
                        backgroundImage: 'linear-gradient(297deg, #E5C100, #FFFFD6, #FFD700, #FFFFD6, #E5C100)',
                      }}
            >
                <FiExternalLink /> Afiliarme
            </button>
        </div>
      </div>
    </div>
  );
}