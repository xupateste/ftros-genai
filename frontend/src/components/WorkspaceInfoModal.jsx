// src/components/WorkspaceInfoModal.jsx

import React from 'react';
import { FiX, FiZap, FiBriefcase, FiRepeat, FiPackage, FiUsers, FiCamera, FiTrendingUp, FiClipboard, FiDollarSign, FiTruck, FiTarget, FiFilter, FiBarChart2 } from 'react-icons/fi';

// --- Sub-componente mejorado para cada tarjeta de misión ---
const MissionCard = ({ icon, title, scenario, strategy, benefit }) => (
  <div className="p-4 border rounded-lg bg-gray-50 shadow flex flex-col gap-3 transition-all hover:border-purple-300 hover:shadow-sm">
    <div className="flex items-center gap-4">
      <div className="text-purple-600 bg-purple-100 p-3 rounded-lg">
        {icon}
      </div>
      <h4 className="font-bold text-gray-800 text-md">{title}</h4>
    </div>
    <div className="pl-4 border-l-2 border-gray-200 ml-5 space-y-3 text-sm">
      <div>
        <p className="font-semibold text-gray-500">El Escenario:</p>
        <p className="text-gray-700">{scenario}</p>
      </div>
      <div>
        <p className="font-semibold text-gray-500">La Estrategia con Espacios de Trabajo:</p>
        <p className="text-gray-700">{strategy}</p>
      </div>
      <div>
        <p className="font-semibold text-purple-700">El Beneficio:</p>
        <p className="text-gray-700 font-medium">{benefit}</p>
      </div>
    </div>
  </div>
);

export function WorkspaceInfoModal({ onClose }) {
  // --- Contenido de las misiones ahora estructurado ---
  const missions = [
    {
      icon: <FiBriefcase size={20} />,
      title: "Gestionar Múltiples Tiendas o Sucursales",
      scenario: "Tienes tu tienda principal en un distrito y estás abriendo una nueva sucursal en otro. Cada tienda tiene su propio inventario y tendencias de venta.",
      strategy: "Crea un 'Espacio de Trabajo: Tienda Principal' y un segundo 'Espacio de Trabajo: Sucursal Nueva'.",
      benefit: "Puedes analizar cada tienda como un negocio independiente, comparando su rentabilidad y stock muerto para optimizar tus compras por ubicación."
    },
    {
      icon: <FiRepeat size={20} />,
      title: "Simular el Futuro (El \"Sandbox\" de Negocios)",
      scenario: "Quieres tomar una decisión arriesgada, como un aumento de precios o la eliminación de una categoría, pero te da miedo afectar tus datos actuales.",
      strategy: "Crea un 'Espacio de Trabajo: Simulación de Precios'. Sube tus archivos y modifica los precios en tu Excel para este espacio de simulación.",
      benefit: "Obtienes un 'laboratorio' seguro para experimentar y predecir el impacto en tu rentabilidad, sin tocar los datos de tu negocio real."
    },
    {
      icon: <FiPackage size={20} />,
      title: "Analizar Canales de Venta Separados",
      scenario: "Tienes tu ferretería física, pero también vendes por internet. Los clientes y los productos más vendidos son diferentes en cada canal.",
      strategy: "Crea un 'Espacio de Trabajo: Tienda Física' y un segundo 'Espacio de Trabajo: Ventas Online'.",
      benefit: "Podrías descubrir que los productos 'Clase C' en tu tienda son en realidad 'Clase A' en tu e-commerce, permitiéndote crear estrategias de marketing e inventario personalizadas."
    },
    {
      icon: <FiUsers size={20} />,
      title: "Gestión de Clientes Clave",
      scenario: "Tienes una ferretería power o le vendes a grandes clientes, como empresas constructoras, y quieres entender la rentabilidad de cada uno.",
      strategy: "Crea un 'Espacio de Trabajo: Cliente - Constructora ABC'. Filtra tu historial de ventas para incluir solo las transacciones de ese cliente y súbelo a este espacio.",
      benefit: "Obtienes un análisis de rentabilidad por cliente, descubriendo qué productos son más importantes para ellos y asegurando que tu política de precios sigue siendo rentable."
    },
    {
      icon: <FiCamera size={20} />,
      title: "'Fotografía' Histórica del Negocio",
      scenario: "Quieres comparar el rendimiento de tu negocio este año con el del año pasado, pero tus archivos de datos actuales se actualizan constantemente.",
      strategy: "Crea un 'Espacio de Trabajo: Análisis 2024'. Sube tus archivos de ventas e inventario solo con los datos de ese período específico.",
      benefit: "Creas 'cápsulas del tiempo' de tu negocio, permitiendo comparaciones históricas precisas para entender la evolución de tu rentabilidad y la salud de tu inventario."
    },
    {
      icon: <FiTrendingUp size={20} />,
      title: "Planificación de Campañas de Marketing",
      scenario: "Estás planeando una campaña específica, como el 'Mes del Pintor', y quieres medir su impacto real.",
      strategy: "Crea un espacio para la campaña. Sube la lista de productos en promoción y analiza su rendimiento antes, durante y después del evento.",
      benefit: "Mides el ROI (Retorno de la Inversión) de tus campañas de forma objetiva, entendiendo qué promociones realmente funcionan."
    },
    {
      icon: <FiClipboard size={20} />,
      title: "Análisis por Vendedor",
      scenario: "Tienes varios vendedores y quieres entender el rendimiento y las fortalezas de cada uno.",
      strategy: "Crea un espacio de trabajo para cada vendedor. Filtra los datos de ventas por vendedor para analizar su rendimiento individual.",
      benefit: "Identificas en qué categorías es más fuerte cada vendedor, descubres oportunidades de capacitación y fomentas una competencia sana."
    },
    {
      icon: <FiDollarSign size={20} />,
      title: "Simulación de Cambio de Proveedor",
      scenario: "Estás considerando cambiar un proveedor clave por uno nuevo que ofrece mejores precios de compra.",
      strategy: "Crea un espacio para simular el cambio. Actualiza los precios de compra de los productos afectados y ejecuta reportes de margen.",
      benefit: "Ves el impacto real en tu rentabilidad general antes de tomar la decisión, asegurando que el cambio sea financieramente beneficioso."
    },
    {
      icon: <FiTruck size={20} />,
      title: "Optimización de Inventario Estacional",
      scenario: "Tu negocio tiene picos de demanda muy marcados en diferentes épocas del año (verano, invierno, Fiestas Patrias).",
      strategy: "Crea workspaces para diferentes temporadas (ej. 'Inventario de Verano'). Analiza el rendimiento de productos estacionales de forma aislada.",
      benefit: "Planificas tus compras con un año de antelación, asegurando stock para la temporada alta y evitando el exceso de inventario en la temporada baja."
    },
    {
      icon: <FiTarget size={20} />,
      title: "Pruebas de Nuevas Líneas de Producto",
      scenario: "Un proveedor te ofrece una nueva marca o categoría de productos, pero no estás seguro de si funcionará en tu mercado.",
      strategy: "Antes de comprometerte con una compra grande, crea un espacio de trabajo para la nueva línea. Sube el stock inicial y monitorea sus ventas y rotación por unos meses.",
      benefit: "Tomas decisiones de expansión de catálogo basadas en datos reales de tu propia tienda, no en la intuición, minimizando el riesgo de inversión."
    },
    {
      icon: <FiFilter size={20} />,
      title: "Laboratorio de Limpieza de Datos",
      scenario: "Sospechas que tienes errores en tus archivos, pero no quieres 'ensuciar' tu espacio de trabajo principal.",
      strategy: "Crea un 'Espacio: Limpieza de Datos Q3 2025'. Sube tus archivos y usa la 'Auditoría de Calidad de Datos'. Una vez limpios, reemplázalos en tu espacio principal.",
      benefit: "Tienes un entorno seguro para el 'mantenimiento' de tus datos, garantizando que tus análisis estratégicos sean siempre precisos y fiables."
    },
    {
      icon: <FiBarChart2 size={20} />,
      title: "Análisis de 'Canasta de Compra'",
      scenario: "Quieres entender qué productos se compran juntos con frecuencia para crear 'combos' o mejorar la distribución de tu tienda.",
      strategy: "Crea un 'Espacio: Análisis Promoción X'. Sube solo las ventas que ocurrieron durante esa promoción.",
      benefit: "Descubres patrones de compra. Por ejemplo, que el 90% de los clientes que compraron pintura en oferta también compraron una brocha específica, dándote ideas para futuras ventas cruzadas."
    }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full flex flex-col max-h-[90vh]">
        <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">Desbloquea el Poder de los Espacios de Trabajo</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700"><FiX size={26}/></button>
        </div>
        <div className="overflow-y-auto p-6 text-gray-700 space-y-4">
          <p className="text-center mb-6 text-gray-600">Los Espacios de Trabajo no son solo carpetas, son universos de análisis independientes. Aquí tienes algunas ideas estratégicas para sacarles el máximo provecho:</p>
          <div className="grid md:grid-cols-2 gap-4">
            {missions.map(mission => (
              <MissionCard key={mission.title} {...mission} />
            ))}
          </div>
        </div>
        <div className="p-4">
          <button
            onClick={ onClose }
            className="w-full text-white text-xl px-4 py-2 font-bold rounded-lg hover:text-gray-100"
            style={{
              backgroundImage: 'linear-gradient(to right, #560bad, #7209b7, #b5179e)',
            }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
