// src/components/AuditDashboard.jsx

import React, { useState, useEffect } from 'react';
import { AuditTaskCard } from './AuditTaskCard';
import { AnimateOnScroll } from './AnimateOnScroll';
import { FiArchive, FiTrendingDown, FiDollarSign, FiInfo } from 'react-icons/fi';

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
const KpiCard = ({ label, value, icon, colorClass }) => (
  <div className={`bg-white p-4 rounded-lg shadow border-l-4 ${colorClass} flex items-center gap-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 h-full`}>
    <div className={`p-3 rounded-full bg-opacity-10 ${colorClass.replace('border-', 'bg-')}`}>
      {React.cloneElement(icon, { className: `text-2xl ${colorClass.replace('border-', 'text-')}` })}
    </div>
    <div className="text-left">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
    </div>
  </div>
);

export function AuditDashboard({ auditResult, onSolveClick }) {
  if (!auditResult) {
    return <div className="text-center p-8 text-white">Cargando auditoría...</div>;
  }

  const { puntaje_salud, kpis_dolor, plan_de_accion } = auditResult;

  const kpiConfig = {
    "Capital Inmovilizado": { icon: <FiArchive />, color: 'border-red-500' },
    "Venta Perdida Potencial": { icon: <FiTrendingDown />, color: 'border-orange-500' },
    "Margen Bruto Congelado": { icon: <FiDollarSign />, color: 'border-yellow-500' },
  };

  return (
    <div className="w-full space-y-12 p-4">
      
      {/* --- Pilar 1: El Diagnóstico Impactante (Ahora Animado) --- */}
      <AnimateOnScroll>
        <section className="text-center">
          <h2 className="text-2xl font-bold text-white mb-8">Diagnóstico de Eficiencia de Inventario</h2>
          <ScoreRing score={puntaje_salud} />
          <p className="text-sm text-gray-500 mt-4">Un puntaje por debajo de 70 indica oportunidades críticas de mejora.</p>
        </section>
      </AnimateOnScroll>

      {/* --- El resto del dashboard no cambia --- */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {kpis_dolor && Object.entries(kpis_dolor).map(([key, value], index) => (
          <AnimateOnScroll key={key} delay={index * 150}>
            <KpiCard 
              label={key} 
              value={value} 
              icon={kpiConfig[key]?.icon || <FiInfo />}
              colorClass={kpiConfig[key]?.color || 'border-gray-300'}
            />
          </AnimateOnScroll>
        ))}
      </section>
      
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
            plan_de_accion.map((task, index) => (
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
      </section>
    </div>
  );
}

























// // src/components/AuditDashboard.jsx

// import React, { useState, useEffect } from 'react';
// import { AuditTaskCard } from './AuditTaskCard';
// import { AnimateOnScroll } from './AnimateOnScroll';
// import { FiArchive, FiTrendingDown, FiDollarSign, FiInfo } from 'react-icons/fi';

// // --- Sub-componente 1: El "Anillo de Progreso" (Alternativa a GaugeChart) ---
// const ScoreRing = ({ score = 0 }) => {
//   const [displayScore, setDisplayScore] = useState(0);

//   const getScoreColorClasses = (s) => {
//     if (s < 50) return { ring: 'stroke-red-500', text: 'text-red-500' };
//     if (s < 80) return { ring: 'stroke-yellow-500', text: 'text-yellow-500' };
//     return { ring: 'stroke-green-500', text: 'text-green-500' };
//   };

//   // --- LÓGICA DE ANIMACIÓN ---
//   useEffect(() => {
//     // Animación del número (count-up)
//     if (score > 0) {
//       const duration = 1000; // 1 segundo
//       const startTime = Date.now();

//       const animate = () => {
//         const elapsedTime = Date.now() - startTime;
//         const progress = Math.min(elapsedTime / duration, 1);
//         setDisplayScore(Math.floor(progress * score));

//         if (progress < 1) {
//           requestAnimationFrame(animate);
//         }
//       };
//       requestAnimationFrame(animate);
//     } else {
//       setDisplayScore(0);
//     }
//   }, [score]);

//   const radius = 80;
//   const circumference = 2 * Math.PI * radius;
//   const offset = circumference - (score / 100) * circumference;
//   const colors = getScoreColorClasses(score);

//   return (
//     <div className="relative w-48 h-48 mx-auto">
//       <svg className="w-full h-full" viewBox="0 0 200 200">
//         {/* Círculo de fondo */}
//         <circle
//           className="text-gray-700"
//           strokeWidth="12"
//           stroke="currentColor"
//           fill="transparent"
//           r={radius}
//           cx="100"
//           cy="100"
//         />
//         {/* Anillo de progreso animado */}
//         <circle
//           className={colors.ring}
//           strokeWidth="12"
//           strokeDasharray={circumference}
//           strokeDashoffset={offset}
//           strokeLinecap="round"
//           stroke="currentColor"
//           fill="transparent"
//           r={radius}
//           cx="100"
//           cy="100"
//           style={{ 
//             transform: 'rotate(-90deg)', 
//             transformOrigin: '50% 50%',
//             // --- La magia de la animación del anillo ---
//             transition: 'stroke-dashoffset 1s ease-out' 
//           }}
//         />
//       </svg>
//       <div className="absolute inset-0 flex flex-col items-center justify-center">
//         <span className={`text-5xl font-bold ${colors.text}`}>{displayScore}</span>
//         <span className="text-sm font-semibold text-gray-400">/ 100</span>
//       </div>
//     </div>
//   );
// };

// // --- Sub-componente 2: La Tarjeta de KPI Contextual ---
// const KpiCard = ({ label, value, icon, colorClass }) => (
//   <div className={`bg-white p-4 rounded-lg shadow border-l-4 ${colorClass} flex items-center gap-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 h-full`}>
//     <div className={`p-3 rounded-full bg-opacity-10 ${colorClass.replace('border-', 'bg-')}`}>
//       {React.cloneElement(icon, { className: `text-2xl ${colorClass.replace('border-', 'text-')}` })}
//     </div>
//     <div className="text-left">
//       <p className="text-sm text-gray-500">{label}</p>
//       <p className="text-2xl font-bold text-gray-800">{value}</p>
//     </div>
//   </div>
// );

// export function AuditDashboard({ auditResult, onSolveClick }) {
//   if (!auditResult) {
//     return <div className="text-center p-8 text-white">Cargando auditoría...</div>;
//   }

//   const { puntaje_salud, kpis_dolor, plan_de_accion } = auditResult;

//   const kpiConfig = {
//     "Capital Inmovilizado": { icon: <FiArchive />, color: 'border-red-500' },
//     "Venta Perdida Potencial": { icon: <FiTrendingDown />, color: 'border-orange-500' },
//     "Margen Bruto Congelado": { icon: <FiDollarSign />, color: 'border-yellow-500' },
//   };

//   return (
//     <div className="w-full space-y-12 p-4">
      
//       {/* --- Pilar 1: El Diagnóstico Impactante (Mejorado) --- */}
//       <AnimateOnScroll>
//         <section className="text-center">
//           <h2 className="text-2xl font-bold text-white mb-8">Diagnóstico de Eficiencia de Inventario</h2>
//           <ScoreRing score={puntaje_salud} />
//           <p className="text-sm text-gray-500 mt-4">Un puntaje por debajo de 70 indica oportunidades críticas de mejora.</p>
//         </section>
//       </AnimateOnScroll>

//       {/* --- KPIs Contextuales --- */}
//       <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
//         {kpis_dolor && Object.entries(kpis_dolor).map(([key, value], index) => (
//           <AnimateOnScroll key={key} delay={index * 150}>
//             <KpiCard 
//               label={key} 
//               value={value} 
//               icon={kpiConfig[key]?.icon || <FiInfo />}
//               colorClass={kpiConfig[key]?.color || 'border-gray-300'}
//             />
//           </AnimateOnScroll>
//         ))}
//       </section>

//       {/* --- Pilar 2: Las Guías Accionables (con Título Mejorado) --- */}
//       <section>
//         <AnimateOnScroll>
//           <div className="text-center">
//             <h3 className="text-2xl font-bold text-white mb-2">Tu Hoja de Ruta para Mejorar tu Puntaje</h3>
//             <p className="text-gray-400 max-w-2xl mx-auto">Hemos identificado las siguientes áreas, priorizadas por impacto, para aumentar la eficiencia de tu negocio.</p>
//           </div>
//         </AnimateOnScroll>
//         <div className="space-y-4 mt-6">
//           {plan_de_accion && plan_de_accion.length > 0 ? (
//             plan_de_accion.map((task, index) => (
//               <AnimateOnScroll key={task.id} delay={index * 100}>
//                 <AuditTaskCard 
//                   task={task}
//                   onSolveClick={onSolveClick}
//                 />
//               </AnimateOnScroll>
//             ))
//           ) : (
//             <AnimateOnScroll>
//               <div className="bg-green-900 bg-opacity-50 border border-green-700 text-green-300 p-6 rounded-lg text-center">
//                   <h4 className="font-bold text-lg">¡Felicidades!</h4>
//                   <p>No se encontraron problemas críticos en tu inventario. Explora las "Herramientas de Análisis" para una investigación más profunda.</p>
//               </div>
//             </AnimateOnScroll>
//           )}
//         </div>
//       </section>
//     </div>
//   );
// }
