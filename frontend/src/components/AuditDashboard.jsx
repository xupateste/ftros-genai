// src/components/AuditDashboard.jsx

import React from 'react';
import { AuditTaskCard } from './AuditTaskCard';
import { FiArchive, FiTrendingDown, FiPercent, FiDollarSign } from 'react-icons/fi';

// Componente para una tarjeta de KPI individual
const KpiCard = ({ label, value, icon }) => (
  <div className="bg-white p-4 rounded-lg shadow border flex items-center gap-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
    <div className="bg-gray-100 p-3 rounded-full">{icon}</div>
    <div className="text-left">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
    </div>
  </div>
);

export function AuditDashboard({ auditResult, onSolveClick }) {
  if (!auditResult) return null;

  const { puntaje_salud, kpis_dolor, plan_de_accion } = auditResult;

  const kpiIcons = {
    "Capital Inmovilizado": <FiArchive className="text-red-500" />,
    "Venta Perdida Potencial": <FiTrendingDown className="text-orange-500" />,
    "Margen Bruto Congelado": <FiPercent className="text-yellow-500" />,
  };

  return (
    <div className="w-full animate-fade-in-fast space-y-10 p-4">
      {/* --- Pilar 1: El Diagnóstico Impactante --- */}
      <section className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Diagnóstico de Eficiencia de Inventario</h2>
        <div className="flex justify-center items-center gap-4">
          <p className="text-6xl font-bold text-purple-400">{puntaje_salud}</p>
          <p className="text-2xl text-gray-400">/ 100</p>
        </div>
        <p className="text-sm text-gray-500 mt-2">Un puntaje por debajo de 70 indica oportunidades críticas de mejora.</p>
      </section>

      <section className="grid md:grid-cols-3 gap-4">
        {Object.entries(kpis_dolor).map(([key, value]) => (
          <KpiCard key={key} label={key} value={value} icon={kpiIcons[key] || <FiDollarSign />} />
        ))}
      </section>

      {/* --- Pilar 2: Las Guías Accionables --- */}
      <section>
        <h3 className="text-2xl font-bold text-white mb-4">Tu Plan de Acción Priorizado</h3>
        <div className="space-y-4">
          {plan_de_accion && plan_de_accion.length > 0 ? (
            plan_de_accion.map(task => (
              <AuditTaskCard 
                key={task.id} 
                task={task}
                onSolveClick={onSolveClick}
              />
            ))
          ) : (
            <div className="bg-green-900 bg-opacity-50 border border-green-700 text-green-300 p-6 rounded-lg text-center">
                <h4 className="font-bold text-lg">¡Felicidades!</h4>
                <p>No se encontraron problemas críticos en tu inventario con base en nuestro análisis inicial. Explora las "Herramientas de Análisis" para una investigación más profunda.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
