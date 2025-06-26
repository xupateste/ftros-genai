// src/components/StrategyPanelModal.jsx
import React from 'react';
import { StrategyPanel } from './StrategyPanel';
import { FiX } from 'react-icons/fi';

export function StrategyPanelModal({ onClose }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-gray-50 rounded-lg shadow-xl max-w-4xl w-full flex flex-col max-h-[90vh]">
        <StrategyPanel />
        <div className="p-4 w-full border-t bg-gray-50 z-10 shadow text-center sticky bottom-0">
          <button
            onClick={onClose}
            className="w-full text-white text-xl px-4 py-2 font-bold rounded-lg hover:text-gray-100"
            style={{
              backgroundImage: 'linear-gradient(to right, #560bad, #7209b7, #b5179e)',
            }}
          >
              Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}