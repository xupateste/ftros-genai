// src/components/StrategyPanel.jsx

import React from 'react';
import { StrategySlider } from './StrategySlider'; // Asumimos que este componente ya existe

const tooltips = {
  score_margen: "Mide la rentabilidad pura. Un peso alto prioriza los productos que te dejan más ganancia neta por venta.",
  score_ingreso: "Mide el poder de facturación. Un peso alto prioriza los productos que más aportan al total de ingresos brutos.",
  score_ventas: "Mide la popularidad o volumen. Un peso alto prioriza los productos que más unidades venden, sin importar su precio.",
  score_dias_venta: "Mide la consistencia de la demanda. Un peso alto prioriza productos que se venden de forma regular y predecible.",
};

// Este componente es puramente visual. Recibe el estado "borrador" y la función para actualizarlo.
export function StrategyPanel({ strategy, setStrategy, onRestore, context, isLoading }) {

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    const finalValue = type === 'number' || type === 'range' ? parseFloat(value) || 0 : value;
    setStrategy(prev => ({
      ...prev,
      [name]: finalValue
    }));
  };

  if (isLoading || !strategy) {
    return <div className="p-10 text-center text-gray-500">Cargando estrategia...</div>;
  }

  // El texto del botón de restaurar cambia según el contexto
  const restoreButtonText = context.type === 'global' 
    ? "Restaurar a Valores de Fábrica" 
    : "Restaurar a la Estrategia Global";

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b pb-4">
        <h2 className="text-2xl font-bold text-gray-800 mb-2 sm:mb-0">
          {context.type === 'global' ? 'Mi Estrategia Global' : `Estrategia para "${context.name}"`}
        </h2>
        <button onClick={onRestore} className="text-sm font-semibold text-purple-600 hover:text-purple-800 transition-colors">
          {restoreButtonText}
        </button>
      </div>
      
      <div className="space-y-8">
        <div>
          <h3 className="text-xl font-semibold text-gray-700 mb-4 border-l-4 border-purple-500 pl-4">Importancia de Productos</h3>
          <p className="text-sm text-gray-600 mb-6 ml-5">Define qué es "importante" para ti (escala 1-10). Estos serán los defaults en los reportes.</p>
          <div className="grid md:grid-cols-2 gap-x-8 gap-y-6 ml-5">
            <StrategySlider name="score_margen" label="Peso del Margen (Rentabilidad)" tooltipText={tooltips.score_margen} value={strategy.score_margen} onChange={handleChange} />
            <StrategySlider name="score_ingreso" label="Peso de Ingresos (Facturación)" tooltipText={tooltips.score_ingreso} value={strategy.score_ingreso} onChange={handleChange} />
            <StrategySlider name="score_ventas" label="Peso de Ventas (Popularidad)" tooltipText={tooltips.score_ventas} value={strategy.score_ventas} onChange={handleChange} />
            <StrategySlider name="score_dias_venta" label="Peso de Frecuencia de Venta" tooltipText={tooltips.score_dias_venta} value={strategy.score_dias_venta} onChange={handleChange} />
          </div>
        </div>

        <div>
          <h3 className="text-xl font-semibold text-gray-700 mb-4 border-l-4 border-purple-500 pl-4">Gestión de Inventario y Riesgo</h3>
          <p className="text-sm text-gray-600 mb-6 ml-5">Configura tus parámetros de reposición y seguridad.</p>
          <div className="grid md:grid-cols-3 gap-x-8 gap-y-4 ml-5 text-black">
            <div>
              <label className="block text-sm font-medium text-gray-700">Lead Time de Proveedor (días)</label>
              <input type="number" name="lead_time_dias" value={strategy.lead_time_dias} onChange={handleChange} className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Días de Cobertura Ideal</label>
              <input type="number" name="dias_cobertura_ideal_base" value={strategy.dias_cobertura_ideal_base} onChange={handleChange} className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm" />
            </div>
             <div>
              <label className="block text-sm font-medium text-gray-700">Días de Stock de Seguridad</label>
              <input type="number" name="dias_seguridad_base" value={strategy.dias_seguridad_base} onChange={handleChange} className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
