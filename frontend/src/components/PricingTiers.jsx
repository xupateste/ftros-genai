// src/components/PricingTiers.jsx

import React from 'react';

// Un componente de ayuda para cada tarjeta de plan
const TierCard = ({ title, description, features, ctaText, onClick, primary = false }) => {
  const cardClasses = 'border-purple-900 border-1'
  const buttonClasses = 'text-white bg-gray-600 hover:bg-gray-700 cursor-pointer';
  const aClasses = 'text-gray-300 text-2xl';

  return (
    <div className={`bg-gray-800 p-4 rounded-lg shadow-lg flex flex-col ${cardClasses}`}>
      <div className="flex-grow">
        <h3 className="text-xl antialiased font-semibold text-white text-left">{title}</h3>
        <p className="text-gray-400 antialiased mb-6 mt-4 text-left text-md flex-grow">{description}</p>
        <ul className="space-y-2 flex-1 mt-10 mb-8 text-md">
          {features.map((feature, index) => (
            <li key={index} className="flex items-center antialiased text-gray-300">
              <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
              {feature}
            </li>
          ))}
        </ul>
      </div>
      <a onClick={onClick} className={`w-full antialiased font-bold py-2 px-4 rounded-lg mt-auto transition-transform transform ${ctaText == 'Gratis' ? aClasses : buttonClasses}`}>
        {ctaText}
      </a>
    </div>
  );
};

export const PricingTiers = ({ onSubscribeClick }) => {
  return (
    <div className="py-12 bg-gray-900 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="grid md:grid-cols-3 gap-8 flex-start">
          <TierCard
            title="Anonimo"
            description="Análisis anónimos sin necesidad de registrarte"
            features={[
              '1 Análisis Completo',
              '+10 Créditos cada 24 horas',
            ]}
            ctaText="Gratis"
          />

          <TierCard
            title="Registrado"
            description="Registrarte es gratis"
            features={[
              '25 Créditos cada 24 horas',
              'Espacios de Trabajos',
              'Flexi-recargas desde $1 ó S/ 3',
            ]}
            ctaText="Gratis"
            // primary={true}
          />
          
          <TierCard
            title="Suscripción"
            description="Suscríbete y lleva tu negocio al siguiente nivel"
            features={[]}
            onClick={ onSubscribeClick }
            ctaText="Suscribirse"
          />

        </div>
      </div>
    </div>
  );
};