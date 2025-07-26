// src/components/DateRangePickerModal.jsx

import React, { useState } from 'react';
import { DateRange } from 'react-date-range';
import 'react-date-range/dist/styles.css'; // Importa los estilos principales
import 'react-date-range/dist/theme/default.css'; // Importa el tema por defecto
import { es } from 'date-fns/locale'; // Importa la localización en español
import { FiX, FiAward } from 'react-icons/fi';

export function DateRangePickerModal({ minDate, maxDate, onClose, onApply }) {
  const [selectionRange, setSelectionRange] = useState({
    startDate: minDate,
    endDate: maxDate,
    key: 'selection',
  });

  const handleSelect = (ranges) => {
    setSelectionRange(ranges.selection);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-lg p-4 shadow-xl w-auto relative">
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 z-10"><FiX size={24}/></button>
        <h3 className="text-lg font-bold text-gray-800 mb-4 text-center">Selecciona un Rango de Fechas</h3>
        <div className="text-black flex justify-center">
          <DateRange
            ranges={[selectionRange]}
            onChange={handleSelect}
            minDate={minDate}
            maxDate={maxDate}
            locale={es}
            dateDisplayFormat="dd/MM/yyyy"
            editableDateInputs={true}
          />
        </div>
        <div className="mt-4 flex justify-end gap-4">
            <button onClick={onClose} className="bg-gray-200 text-gray-700 font-bold py-2 px-4 rounded-lg hover:bg-gray-300">
              Cancelar
            </button>
            <button 
              onClick={() => onApply(selectionRange)}
              className="bg-yellow-500 text-gray-900 font-bold py-2 px-4 rounded-lg hover:bg-yellow-400 flex items-center justify-center gap-2"
            >
              Aplicar Filtro de Fechas <FiAward /> 
            </button>
        </div>
      </div>
    </div>
  );
}
