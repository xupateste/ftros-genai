/*
================================================================================
|                                                                              |
| 📂 components/FAQSection.jsx (NUEVO)                                         |
|                                                                              |
================================================================================
*/

import React, { useState } from 'react';
import { FiChevronDown } from 'react-icons/fi';

const faqData = [
    {
        question: "¿Necesito ser un experto en tecnología o finanzas para usar esto?",
        answer: (
            <>
                No. Diseñamos <strong>Ferreteros.app</strong> para <strong>dueños de negocio, no para analistas</strong>. Si sabes cómo descargar los reportes de ventas e inventario que ya usas, tienes todo lo necesario. Nuestra plataforma hace el trabajo complejo: traduce miles de datos desordenados en <strong>Puntajes de Eficiencia</strong> simples y un <strong>Plan de Acción</strong> claro y priorizado. Nosotros te damos la claridad, tú tomas las decisiones.
            </>
        )
    },
    {
        question: "¿Mis datos comerciales están seguros con ustedes?",
        answer: (
            <>
                La seguridad y la confidencialidad son nuestra <strong>máxima prioridad</strong>. Usamos encriptación de nivel bancario para proteger tu información. <strong>Ferreteros.app</strong> es una plataforma <strong>100% independiente</strong>; no estamos afiliados a ningún distribuidor, marca o cadena. Tus datos son tuyos, y nuestro modelo de negocio depende enteramente de la confianza que depositas en nosotros para ayudarte a crecer. <strong>Tu información jamás será compartida.</strong>
            </>
        )
    },
    {
        question: "Llevo 20 años en este negocio, ¿qué me puede decir Ferreteros.app que yo no sepa ya?",
        answer: (
            <>
                Tu experiencia es tu activo más valioso. Nuestra plataforma <strong>no busca reemplazarla, busca potenciarla</strong>. Tu intuición te dice qué productos 'se mueven', pero nuestra 'Auditoría de Inventario' te dice con precisión milimétrica el <strong>costo financiero</strong> de los que no se mueven, o la <strong>venta potencial que estás perdiendo</strong> por un quiebre de stock que no habías notado. Te damos la data para cuantificar tu intuición y descubrir oportunidades ocultas que ni el ojo más experto puede ver a simple vista.
            </>
        )
    },
    {
        question: "Mis registros de inventario y ventas no son 100% perfectos. ¿La herramienta funcionará?",
        answer: (
            <>
                Sí, y de hecho, ese es uno de los primeros beneficios que verás. La plataforma está diseñada para trabajar con datos del mundo real. Actuará como un <strong>espejo que te mostrará el impacto</strong> de esas pequeñas inconsistencias. Al comparar lo que dice el sistema con lo que ves en tus estantes, empezarás a identificar y corregir las fugas en tu proceso de registro, haciendo tu operación mucho más precisa y rentable.
            </>
        )
    },
    {
        question: "¿Esto es solo para ferreterías grandes?",
        answer: (
            <>
                Al contrario. <strong>Ferreteros.app</strong> fue diseñado específicamente para el <strong>ferretero independiente y la PYME</strong>. Las grandes cadenas tienen ejércitos de analistas y software de millones de dólares para optimizar su inventario. Nosotros somos ese ejército de analistas en una sola herramienta, accesible y fácil de usar, para que puedas competir con la misma inteligencia de negocio que los gigantes del sector.
            </>
        )
    },
    {
        question: "¿Qué pasa después de la prueba? ¿Hay contratos o costos ocultos?",
        answer: (
            <>
                <strong>Cero contratos y cero costos ocultos.</strong> La prueba te da 7 días de acceso ilimitado y una sesión de onboarding con nosotros para que veas el valor real con tus propios datos. Después de eso, la plataforma funciona con un <strong>sistema de créditos recargables</strong>, sin suscripciones mensuales obligatorias. Tú decides cuándo recargar y cuánto usar. Tienes el control total.
            </>
        )
    }
];


export function FAQSection () {
    const [openIndex, setOpenIndex] = useState(0); // Abrir el primero por defecto

    const handleToggle = (index) => {
        setOpenIndex(openIndex === index ? null : index);
    };
    
    // Para la vista móvil, el contenido de la respuesta activa
    const mobileAnswerContent = openIndex !== null ? faqData[openIndex].answer : null;

    return (
        <div className="shadow-2xl overflow-hidden md:gap-8 p-4 md:p-8">
            {/* Columna de Preguntas */}
            <div className="md:col-span-1 space-y-2">
                {faqData.map((item, index) => (
                    <div key={index}>
                        <button
                            onClick={() => handleToggle(index)}
                            className={`w-full text-left p-4 rounded-2xl transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 ${
                                openIndex === index
                                    ? 'bg-purple-700 text-white shadow-2xl'
                                    : 'antialiased text-gray-300 hover:bg-purple-800 hover:text-white'
                            }`}
                        >
                            <div className={`flex justify-between items-center ${
                                openIndex === index
                                    ? 'font-bold'
                                    : ''
                            }`}>
                                <span>{item.question}</span>
                                <FiChevronDown className={`w-5 h-5 text-purple-500 transition-transform duration-100 ${openIndex === index ? 'transform rotate-180' : ''}`} />
                            </div>
                        {/* Contenido para móvil (acordeón) */}
                        <div className={`grid md:hidden transition-all duration-500 ease-in-out ${openIndex === index ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                            <div className="overflow-hidden">
                                <div className="antialiased text-white p-4 mt-2 bg-purple-800 rounded-2xl max-w-none">
                                    {item.answer}
                                </div>
                            </div>
                        </div>
                        </button>
                    </div>
                ))}
            </div>

            {/* Columna de Respuestas (solo para desktop) */}
            {/*<div className="hidden md:block md:col-span-2 bg-slate-800 p-8 rounded-xl min-h-[300px]">
                {openIndex !== null ? (
                    <div key={openIndex} className="prose prose-invert prose-strong:text-purple-300 animate-[fade-in_0.5s_ease-out]">
                       <style>{`.animate-\\[fade-in_0\\.5s_ease-out\\] { animation-name: fade-in; } @keyframes fade-in { 0% { opacity: 0; transform: translateY(10px); } 100% { opacity: 1; transform: translateY(0); } }`}</style>
                        abc {faqData[openIndex].answer}
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                        <p>Selecciona una pregunta para ver la respuesta.</p>
                    </div>
                )}
            </div>*/}
        </div>
    );
};