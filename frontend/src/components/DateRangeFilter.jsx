// src/components/DateRangeFilter.jsx

import React, { useState } from 'react';
import { DateRange } from 'react-date-range';
import 'react-date-range/dist/styles.css'; // Importa los estilos principales
import 'react-date-range/dist/theme/default.css'; // Importa el tema por defecto
import { es } from 'date-fns/locale'; // Importa la localización en español
import { FiCalendar, FiAward } from 'react-icons/fi';

export function DateRangeFilter({ minDate, maxDate, onApply }) {
  const [showPicker, setShowPicker] = useState(false);
  const [selectionRange, setSelectionRange] = useState({
    startDate: new Date(minDate),
    endDate: new Date(maxDate),
    key: 'selection',
  });

  const handleSelect = (ranges) => {
    setSelectionRange(ranges.selection);
  };

  const formattedStartDate = selectionRange.startDate.toLocaleDateString('es-PE');
  const formattedEndDate = selectionRange.endDate.toLocaleDateString('es-PE');

  return (
    <div className="mt-6 p-4 border-2 border-dashed border-gray-700 rounded-lg">
      <button 
        onClick={() => setShowPicker(!showPicker)}
        className="w-full text-left font-semibold text-purple-400 hover:text-white flex justify-between items-center"
      >
        <span>📅 Analizar un Rango de Fechas Específico ⭐</span>
        <span>{showPicker ? 'Ocultar Calendario' : 'Mostrar Calendario'}</span>
      </button>

      {showPicker && (
        <div className="mt-4 flex flex-col md:flex-row items-center gap-4 animate-fade-in">
          <div className="text-black">
            <DateRange
              ranges={[selectionRange]}
              onChange={handleSelect}
              minDate={new Date(minDate)}
              maxDate={new Date(maxDate)}
              locale={es}
              dateDisplayFormat="dd/MM/yyyy"
            />
          </div>
          <div className="flex-1 text-center">
            <p className="text-sm text-gray-400">Rango seleccionado:</p>
            <p className="font-bold">{formattedStartDate} - {formattedEndDate}</p>
            <button 
              onClick={() => onApply(selectionRange)}
              className="mt-4 w-full bg-yellow-500 text-gray-900 font-bold py-2 px-4 rounded-lg hover:bg-yellow-400 flex items-center justify-center gap-2"
            >
              <FiAward /> Aplicar Filtro y Ejecutar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
