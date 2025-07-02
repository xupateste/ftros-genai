// src/components/WorkspaceSelector.jsx

import React from 'react';
import { FiGrid, FiChevronDown, FiPlusCircle } from 'react-icons/fi';

export function WorkspaceSelector({ workspaces, activeWorkspace, onWorkspaceChange, onCreateNew, onBackToDashboard}) {
  if (!activeWorkspace) {
    return (
      <button onClick={onCreateNew} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors text-white">
        <FiPlusCircle />
        Crear tu Primer Espacio
      </button>
    );
  }

  return (
    <div className="relative">
      <select
        value={activeWorkspace.id}
        onChange={(e) => {
          if (e.target.value === 'CREATE_NEW') {
            onCreateNew();
          } else if (e.target.value === 'SEE_ALL') {
            onBackToDashboard();
          } else {
            const selected = workspaces.find(ws => ws.id === e.target.value);
            onWorkspaceChange(selected);
          }
        }}
        className="appearance-none w-full md:w-64 bg-gray-700 border border-gray-600 text-white text-sm font-semibold rounded-lg py-2 pl-4 pr-10 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
      >
        {workspaces.map(ws => (
          <option key={ws.id} value={ws.id}>
            {ws.nombre}
          </option>
        ))}
        <option disabled>----------------------</option>
        <option value="SEE_ALL" className="font-bold text-purple-400">
          Ver Todos Mis Espacios...
        </option>
        <option value="CREATE_NEW" className="font-bold text-purple-400">
          + Crear Nuevo Espacio...
        </option>
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
        <FiChevronDown />
      </div>
    </div>
  );
}