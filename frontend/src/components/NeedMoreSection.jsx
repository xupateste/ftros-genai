import React from 'react';

const WHATSAPP_NUMBER = '51930240108'; 

export function NeedMoreSection() {
  const handleToContact = () => {
    const messageCorporate = `¡Hola! Estoy viendo su web y me interesa saber más sobre los servicios personalizados de análisis.\n\n¿Puedo contarles mi caso?`;
      const encodedMessageCorporate = encodeURIComponent(messageCorporate);
      const whatsappUrlCorporate = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessageCorporate}`;
      window.open(whatsappUrlCorporate, '_blank');
  }
  return (
    <div className="bg-gray-900 w-full px-6 pb-12">
      <div className="text-center py-12 max-w-5xl mx-auto px-6 bg-gray-800 rounded-lg shadow-2xl">
        <div className="grid md:grid-cols-2 items-center gap-6">
          <div className="flex-1 text-left min-w-2xl">
            <h2 className="text-2xl font-semibold mb-6">¿Necesitas más?</h2>
            <p className="text-gray-400 text-lg antialiased">
              Ofrecemos servicios personalizados para analisis de documentos especiales. Cuéntanos qué necesitas.
            </p>
          </div>
          <button onClick={handleToContact} className="bg-blue-600 min-w-2xl md:mx-auto hover:bg-blue-700 text-white text-base font-medium px-6 py-3 rounded transition">
            Contáctanos
          </button>
        </div>
      </div>
    </div>
  );
}