// src/components/AuditDashboard.jsx

import React from 'react';
import { AuditTaskCard } from './AuditTaskCard';
import { FiArchive, FiTrendingDown, FiPercent, FiDollarSign, FiArrowUp, FiArrowDown, FiCheckCircle, FiPlusCircle } from 'react-icons/fi';

// --- Sub-componente Mejorado para KPIs con Delta ---
const KpiCard = ({ label, value, delta, deltaType }) => {
  const isPositive = deltaType === 'positive';
  const isNegative = deltaType === 'negative';
  
  return (
    <div className="bg-white p-4 rounded-lg shadow border text-left">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
      {delta && (
        <div className={`flex items-center text-sm font-semibold mt-1 ${isPositive ? 'text-green-500' : isNegative ? 'text-red-500' : 'text-gray-500'}`}>
          {isPositive && <FiArrowUp size={14} />}
          {isNegative && <FiArrowDown size={14} />}
          <span className="ml-1">{delta} desde la última carga</span>
        </div>
      )}
    </div>
  );
};

// --- Sub-componente para el Log de Eventos ---
const EventLog = ({ title, tasks, type }) => {
    const icon = type === 'resolved' 
        ? <FiCheckCircle className="text-green-500" /> 
        : <FiPlusCircle className="text-red-500" />;
    
    return (
        <div>
            <h4 className="font-bold text-lg text-white mb-2 flex items-center gap-2">{icon} {title}</h4>
            {tasks && tasks.length > 0 ? (
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-300">
                    {tasks.map(task => <li key={task.id}>{task.title}</li>)}
                </ul>
            ) : (
                <p className="text-sm text-gray-500 italic">No se detectaron eventos para esta categoría.</p>
            )}
        </div>
    );
};


export function AuditDashboard({ auditResult, onSolveClick }) {
  if (!auditResult) {
    return <div className="text-center p-8 text-white">Cargando auditoría...</div>;
  }

  // --- Renderizado para el INFORME DE EVOLUCIÓN ---
  if (auditResult.tipo === 'evolucion') {
    const { puntaje_actual, puntaje_delta, kpis_con_delta, log_eventos, plan_de_accion } = auditResult;
    return (
      <div className="w-full animate-fade-in-fast space-y-10 p-4">
        <section className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Informe de Evolución</h2>
          <div className="flex justify-center items-center gap-4">
            <p className="text-6xl font-bold text-purple-400">{puntaje_actual}</p>
            <div className="text-left">
              <p className="text-2xl text-gray-400">/ 100</p>
              <p className={`text-lg font-bold ${parseFloat(puntaje_delta) >= 0 ? 'text-green-400' : 'text-red-400'}`}>{puntaje_delta} pts</p>
            </div>
          </div>
        </section>

        <section className="grid md:grid-cols-3 gap-4">
          {kpis_con_delta && Object.entries(kpis_con_delta).map(([key, data]) => (
            <KpiCard key={key} label={key} value={data.actual} delta={data.delta} deltaType={parseFloat(data.delta) >= 0 ? 'positive' : 'negative'} />
          ))}
        </section>

        <section className="grid md:grid-cols-2 gap-8 p-6 bg-gray-800 bg-opacity-50 rounded-lg">
            <EventLog title="Problemas Resueltos" tasks={log_eventos?.problemas_resueltos || []} type="resolved" />
            <EventLog title="Nuevos Problemas Detectados" tasks={log_eventos?.nuevos_problemas || []} type="new" />
        </section>

        <section>
          <h3 className="text-2xl font-bold text-white mb-4">Tu Plan de Acción Actualizado</h3>
          <div className="space-y-4">
            {plan_de_accion?.map(task => (
              <AuditTaskCard key={task.id} task={task} onSolveClick={onSolveClick} />
            ))}
          </div>
        </section>
      </div>
    );
  }

  // --- Renderizado para la AUDITORÍA INICIAL (Fallback) ---
  const { puntaje_salud, kpis_dolor, plan_de_accion } = auditResult;
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
        {kpis_dolor && Object.entries(kpis_dolor).map(([key, value]) => (
          <KpiCard key={key} label={key} value={value} />
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
