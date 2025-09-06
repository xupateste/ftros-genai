// // src/components/TrustManifesto.jsx

// import React from 'react';
// import { FiDatabase, FiShield, FiSlash, FiHeart } from 'react-icons/fi';

// const ManifestoPoint = ({ icon, title, children }) => (
//   <div className="bg-gray-800 p-6 rounded-lg text-center transform transition-transform hover:scale-105">
//     <div className="flex justify-center items-center mb-4">
//       {icon}
//     </div>
//     <h3 className="font-bold text-lg text-white mb-2">{title}</h3>
//     <p className="text-gray-400 text-sm">
//       {children}
//     </p>
//   </div>
// );

// export const TrustManifesto = () => {
//   return (
//     <div className="py-20 bg-gray-900">
//       <div className="container mx-auto px-4 text-center">
//         <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
//           Nuestro Juramento Sobre tus Datos
//         </h2>
//         <p className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto">
//           Estos son los principios inquebrantables sobre los que construimos nuestra relación contigo.
//         </p>
//         <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          
//           <ManifestoPoint
//             icon={<FiDatabase className="text-4xl text-purple-400" />}
//             title="Tus Datos son Tuyos"
//           >
//             Tu información de ventas e inventario es 100% tuya. Siempre. Solo la usamos para darte tus propios análisis.
//           </ManifestoPoint>

//           <ManifestoPoint
//             icon={<FiShield className="text-4xl text-purple-400" />}
//             title="100% Independientes"
//           >
//             No tenemos dueños ni inversionistas de ninguna marca, distribuidor o cadena. Nuestra lealtad es solo contigo.
//           </ManifestoPoint>

//           <ManifestoPoint
//             icon={<FiSlash className="text-4xl text-purple-400" />}
//             title="Nunca Venderemos tus Datos"
//           >
//             Jamás venderemos tu información individual. Nuestro negocio es darte inteligencia a ti, no a terceros.
//           </ManifestoPoint>
          
//           <ManifestoPoint
//             icon={<FiHeart className="text-4xl text-purple-400" />}
//             title="Intereses Alineados"
//           >
//             Nuestro único ingreso es tu suscripción. No ganamos con publicidad ni venta de datos. Si tú ganas, nosotros ganamos.
//           </ManifestoPoint>

//         </div>
//       </div>
//     </div>
//   );
// };


// src/components/TrustManifesto.jsx (Versión en Lista)

import React from 'react';
import { FiDatabase, FiShield, FiSlash, FiHeart } from 'react-icons/fi';

// Componente para cada elemento de la lista
const ManifestoListItem = ({ icon, title, children }) => (
  <li className="flex items-start gap-4 py-6">
    <div className="flex-shrink-0 mt-1">
      {icon}
    </div>
    <div>
      <h3 className="font-bold text-lg text-white">{title}</h3>
      <p className="text-gray-400 text-sm mt-1">{children}</p>
    </div>
  </li>
);

export const TrustManifesto = () => {
  const manifestoPoints = [
    {
      icon: <FiDatabase className="text-3xl text-purple-400" />,
      title: "Tus datos son 100% tuyos",
      text: "Siempre."
    },
    {
      icon: <FiShield className="text-3xl text-purple-400" />,
      title: "Somos 100% Independientes",
      text: "No tenemos dueños ni inversionistas de ninguna marca, distribuidor o cadena."
    },
    {
      icon: <FiSlash className="text-3xl text-purple-400" />,
      title: "Jamás venderemos tus datos individuales",
      text: "Nuestro negocio es darte inteligencia a ti, no a terceros."
    },
    {
      icon: <FiHeart className="text-3xl text-purple-400" />,
      title: "Intereses Alineados",
      text: "Nuestro único ingreso es tu suscripción. Si tú ganas, nosotros ganamos."
    }
  ];

  return (
    <div className="py-20">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
              Nuestro Juramento
            </h2>
            <p className="mt-4 text-lg text-gray-400 max-w-xl mx-auto">
              Estos son los principios inquebrantables sobre los que construimos nuestra relación contigo.
            </p>
        </div>
        
        <div className="bg-gray-800 rounded-lg border border-gray-700">
          <ul className="divide-y divide-gray-700 px-6">
            {manifestoPoints.map((point) => (
              <ManifestoListItem key={point.title} icon={point.icon} title={point.title}>
                {point.text}
              </ManifestoListItem>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};