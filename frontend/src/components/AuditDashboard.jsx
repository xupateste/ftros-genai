// src/components/AuditDashboard.jsx

import React, { useState, useEffect } from 'react';
import { useConfig } from '../context/ConfigProvider'; // <-- 1. Importamos el hook
import { AuditTaskCard } from './AuditTaskCard';
import { AnimateOnScroll } from './AnimateOnScroll';
import { FiArchive, FiTrendingDown, FiDollarSign, FiInfo, FiArrowUp, FiArrowDown, FiChevronsDown} from 'react-icons/fi';
import { Tooltip } from './Tooltip'; // <-- 2. Importamos el componente

// --- Sub-componente 1: El "Anillo de Progreso" (con Animación Corregida) ---
const ScoreRing = ({ score = 0 }) => {
  const radius = 80;
  const circumference = 2 * Math.PI * radius;

  const [displayScore, setDisplayScore] = useState(0);
  const [offset, setOffset] = useState(circumference); // Inicia "vacío"
  const [currentColors, setCurrentColors] = useState(getScoreColorClasses(0));

  function getScoreColorClasses(s) {
    if (s < 50) return { ring: 'stroke-red-500', text: 'text-red-500', glow: 'shadow-red-500/20' };
    if (s < 80) return { ring: 'stroke-yellow-500', text: 'text-yellow-500', glow: 'shadow-yellow-500/20' };
    return { ring: 'stroke-green-500', text: 'text-green-500', glow: 'shadow-green-500/20' };
  };

  // --- LÓGICA DE ANIMACIÓN MEJORADA Y UNIFICADA ---
  useEffect(() => {
    // Calculamos el offset final al que debe llegar la animación
    const targetOffset = circumference - (score / 100) * circumference;
    
    // Usamos un pequeño timeout para asegurar que el navegador renderice el estado inicial
    // antes de comenzar la transición. Esto hace la animación visible al montar el componente.
    const animationTimeout = setTimeout(() => {
      setOffset(targetOffset); // Dispara la animación del anillo
    }, 100);

    // Animación del número (count-up)
    const duration = 1200;
    const startTime = Date.now();
    let animationFrameId;

    const animate = () => {
      const elapsedTime = Date.now() - startTime;
      const progress = Math.min(elapsedTime / duration, 1);
      const currentAnimatedScore = Math.floor(progress * score);
      
      setDisplayScore(currentAnimatedScore);
      setCurrentColors(getScoreColorClasses(currentAnimatedScore));

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      }
    };
    animationFrameId = requestAnimationFrame(animate);

    // Limpieza al desmontar el componente
    return () => {
      clearTimeout(animationTimeout);
      cancelAnimationFrame(animationFrameId);
    };
  }, [score, circumference]);

  const finalColors = getScoreColorClasses(score);

  return (
    <div className="relative w-48 h-48 mx-auto">
      {/* Sombra contextual */}
      <div className={`absolute inset-0 rounded-full blur-2xl transition-shadow duration-1000 ${finalColors.glow}`} />

      <svg className="w-full h-full" viewBox="0 0 200 200">
        {/* Círculo de fondo */}
        <circle
          className="text-gray-700"
          strokeWidth="12"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx="100"
          cy="100"
        />
        {/* Anillo de progreso animado */}
        <circle
          className={currentColors.ring}
          strokeWidth="12"
          strokeDasharray={circumference}
          strokeDashoffset={offset} // <-- Ahora usa el estado animado
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx="100"
          cy="100"
          style={{ 
            transform: 'rotate(-90deg)', 
            transformOrigin: '50% 50%',
            transition: 'stroke-dashoffset 1.2s ease-out, stroke 0.5s linear'
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-5xl font-bold transition-colors duration-500 ${currentColors.text}`}>{displayScore}</span>
        <span className="text-sm font-semibold text-gray-400">/ 100</span>
      </div>
    </div>
  );
};


// --- Sub-componente 2: La Tarjeta de KPI Contextual (sin cambios) ---
const KpiCard = ({ label, value, icon, colorClass, delta, deltaType, tooltipText }) => {
  const isPositive = deltaType === 'positive';
  const isNegative = deltaType === 'negative';
  
  return (
    <div className={`bg-white p-4 rounded-lg shadow border-l-4 ${colorClass} flex flex-col justify-between transition-all duration-300 hover:shadow-lg hover:-translate-y-1 h-full`}>
      {/* Componente 1: Icono y Título */}
      <div className="flex items-center gap-2">
        <div className={`p-2 rounded-full bg-opacity-10 ${colorClass.replace('border-', 'bg-')}`}>
          {React.cloneElement(icon, { className: `text-xl ${colorClass.replace('border-', 'text-')}` })}
        </div>
        <p className="text-sm font-semibold text-gray-600">{label}</p>
        <div className="text-sm font-semibold text-gray-600"><Tooltip text={tooltipText} /></div>
      </div>
      
      <div className="text-center my-4">
        {/* Componente 2: Valor Principal */}
        <p className="text-4xl font-bold text-gray-800">{value}</p>
        
        {/* Componente 3: El Delta */}
        {delta && (
          <div className={`flex items-center justify-center text-sm font-semibold mt-1 ${isPositive ? 'text-green-500' : isNegative ? 'text-red-500' : 'text-gray-500'}`}>
            {isPositive && <FiArrowUp size={14} />}
            {isNegative && <FiArrowDown size={14} />}
            <span className="ml-1">{delta} desde la última carga</span>
          </div>
        )}
      </div>
    </div>
  );
};

export function AuditDashboard({ auditResult, onSolveClick }) {
  const { tooltips, kpiTooltips } = useConfig(); // <-- 4. Obtenemos los tooltips del contexto
  const [visibleTasksCount, setVisibleTasksCount] = useState(3);

  if (!auditResult) {
    return <div className="text-center p-8 text-white">Cargando auditoría...</div>;
  }

  const isEvolutionReport = auditResult.tipo === 'evolucion';

  // 1. Unificamos el puntaje
  const score = isEvolutionReport ? auditResult.puntaje_actual : auditResult.puntaje_salud;
  
  // 2. Unificamos los KPIs
  const kpis = isEvolutionReport ? auditResult.kpis_con_delta : auditResult.kpis_dolor;
  
  // 3. Unificamos el plan de acción
  const plan_de_accion = auditResult.plan_de_accion || [];

  // const { puntaje_salud, kpis_dolor, plan_de_accion } = auditResult;

  const kpiConfig = {
    "Capital Inmovilizado": { icon: <FiArchive />, color: 'border-red-500' },
    "Venta Perdida Potencial": { icon: <FiTrendingDown />, color: 'border-orange-500' },
    "Margen Bruto Congelado": { icon: <FiDollarSign />, color: 'border-yellow-500' },
  };

  const handleLoadMore = () => {
    setVisibleTasksCount(prevCount => prevCount + 3);
  };

  return (
    <div className="w-full space-y-12 p-4">
      
      {/* --- Pilar 1: El Diagnóstico Impactante --- */}
      <AnimateOnScroll>
        <section className="text-center">
          <h2 className="text-2xl font-bold text-white mb-8">
            {/*{isEvolutionReport ? "Informe de Evolución" : "Diagnóstico de Eficiencia de Inventario"}*/}
            {"Diagnóstico de Eficiencia de Inventario"}
          </h2>
          <Tooltip text={tooltips['puntaje_eficiencia']} />
          <ScoreRing score={score} />
          {isEvolutionReport && auditResult.puntaje_delta && (
             <p className={`mt-4 text-2xl font-bold ${parseFloat(auditResult.puntaje_delta) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {auditResult.puntaje_delta} puntos desde tu última auditoría
             </p>
          )}
        </section>
      </AnimateOnScroll>

      {/* --- KPIs Contextuales --- */}
      <section className="grid md:grid-cols-3 gap-6">
        {kpis && Object.entries(kpis).map(([key, data], index) => (
          <AnimateOnScroll key={key} delay={index * 150}>
            <KpiCard 
              label={key} 
              value={isEvolutionReport ? data.actual : data} 
              delta={isEvolutionReport ? data.delta : null}
              deltaType={isEvolutionReport && parseFloat(data.delta) >= 0 ? 'positive' : 'negative'}
              icon={kpiConfig[key]?.icon || <FiInfo />}
              colorClass={kpiConfig[key]?.color || 'border-gray-300'}
              tooltipText={kpiTooltips[key]}
            />
          </AnimateOnScroll>
        ))}
      </section>

      {/* --- Log de Eventos (Solo para Informes de Evolución) --- */}
      {isEvolutionReport && (
        <>
          {/* ... Tu lógica para renderizar el log de eventos ... */}
        </>
      )}
      
      {/* --- Pilar 2: Las Guías Accionables (con Título Mejorado) --- */}
       <section>
         <AnimateOnScroll>
           <div className="text-center">
             <h3 className="text-2xl font-bold text-white mb-2">Tu Hoja de Ruta para Mejorar tu Puntaje</h3>
             <p className="text-gray-400 max-w-2xl mx-auto">Hemos identificado las siguientes áreas, priorizadas por impacto, para aumentar la eficiencia de tu negocio.</p>
           </div>
         </AnimateOnScroll>
         <div className="space-y-4 mt-6">
           {plan_de_accion && plan_de_accion.length > 0 ? (
            // --- CAMBIO CLAVE: Usamos .slice() para mostrar solo las tareas visibles ---
            plan_de_accion.slice(0, visibleTasksCount).map((task, index) => (
              <AnimateOnScroll key={task.id} delay={index * 100}>
                <AuditTaskCard 
                  task={task}
                  onSolveClick={onSolveClick}
                />
              </AnimateOnScroll>
            ))
          ) : (
            <AnimateOnScroll>
              <div className="bg-green-900 bg-opacity-50 border border-green-700 text-green-300 p-6 rounded-lg text-center">
                  <h4 className="font-bold text-lg">¡Felicidades!</h4>
                  <p>No se encontraron problemas críticos en tu inventario. Explora las "Herramientas de Análisis" para una investigación más profunda.</p>
              </div>
            </AnimateOnScroll>
          )}
        </div>
        {/* --- NUEVO BOTÓN "CARGAR MÁS" CONDICIONAL --- */}
        {plan_de_accion.length > visibleTasksCount && (
            <div className="text-center mt-8">
                <AnimateOnScroll>
                    <button 
                        onClick={handleLoadMore}
                        className="bg-gray-700 text-purple-300 font-semibold py-2 px-6 rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2 mx-auto"
                    >
                        <FiChevronsDown /> Cargar 3 Tareas Más
                    </button>
                </AnimateOnScroll>
            </div>
        )}
      </section>
    </div>
  );
}