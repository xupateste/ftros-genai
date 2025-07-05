// src/components/AppHeader.jsx
import React from 'react';
import { useWorkspace } from '../context/WorkspaceProvider';
import { WorkspaceSelector } from './WorkspaceSelector';
import { CreditsPanel } from './CreditsPanel';
import { FiSettings, FiLogOut } from 'react-icons/fi';

export function AppHeader({ onLogout, onStrategyClick, onDashboardClick }) {
  const { workspaces, activeWorkspace, setActiveWorkspace, createWorkspace } = useWorkspace();
  
  return (
    <header className="flex flex-col md:flex-row items-center justify-between gap-4 py-3 px-4 sm:px-6 lg:px-8 text-white w-full border-b border-gray-700 bg-neutral-900 sticky top-0 z-20">
      <div className='text-center md:text-left cursor-pointer' onClick={onDashboardClick} title="Volver al panel de workspaces">
        <h2 className="text-xl font-bold bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(to right, #560bad, #7209b7, #b5179e)' }}>
          Ferretero.IA
        </h2>
      </div>
      <div className="flex items-center gap-4 md:gap-6">
        <WorkspaceSelector
          workspaces={workspaces}
          activeWorkspace={activeWorkspace}
          onWorkspaceChange={setActiveWorkspace}
          onCreateNew={() => { /* Lógica para abrir modal de creación */ }}
        />
        <button onClick={onStrategyClick} className="flex items-center gap-2 text-sm text-gray-300 hover:text-white" title="Mi Estrategia">
          <FiSettings />
          <span className="hidden lg:inline">Mi Estrategia</span>
        </button>
        <button onClick={onLogout} className="flex items-center gap-2 text-sm text-gray-300 hover:text-white" title="Cerrar Sesión">
          <FiLogOut />
          <span className="hidden lg:inline">Salir</span>
        </button>
      </div>
    </header>
  );
}