// src/components/Dashboard.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { useWorkspace } from '../context/WorkspaceProvider'; // Asumimos que WorkspaceProvider ya existe
import { WorkspaceSelector } from './WorkspaceSelector'; // Y que WorkspaceSelector ya existe
import { FiPlus, FiLogOut, FiLoader, FiArrowRight, FiSettings, FiInfo} from 'react-icons/fi';
// import api from '../utils/api'; // Usaremos nuestro cliente API centralizado
import { WorkspaceCard } from './WorkspaceCard';
import { ConfirmationModal } from './ConfirmationModal';
import { AnalysisWorkspace } from './AnalysisWorkspace'; // Importa el nuevo componente
import { CreateWorkspaceModal } from './CreateWorkspaceModal'; // Importa el nuevo modal
import { StrategyPanelModal } from './StrategyPanelModal'; // Importa el nuevo modal
import { FerreterosLogo } from './FerreterosLogo'
import { CreditsPanel } from './CreditsPanel'; // <-- 1. Importamos el panel
import { CreditHistoryModal } from './CreditHistoryModal'; // <-- 2. Importamos el modal de historial
import { WorkspaceInfoModal } from './WorkspaceInfoModal'; // <-- 1. Importamos el nuevo modal

// Este es el placeholder de tu vista de análisis. En el futuro, aquí
// importarías el componente que contiene los CsvImporters y la lista de reportes.
const AnalysisView = ({ workspace, onBack }) => (
    <div className="w-full h-full p-4 md:p-8 text-white">
         <button onClick={onBack} className="text-sm text-purple-400 hover:text-white mb-8">
            &larr; Volver a Mis Espacios de Trabajo
        </button>
        <h2 className="text-3xl font-bold">Espacio de Trabajo: <span className="text-purple-400">{workspace.nombre}</span></h2>
        <p className="text-gray-400 mt-4">
            Aquí es donde irá tu interfaz principal para subir archivos de ventas/inventario y generar los reportes correspondientes a <strong>{workspace.nombre}</strong>.
        </p>
    </div>
);


export function Dashboard({ onLogout, onEnterWorkspace, onBackToDashboard }) {
  const { workspaces, togglePinWorkspace, activeWorkspace, setActiveWorkspace, createWorkspace, fetchWorkspaces, isLoading, touchWorkspace, credits } = useWorkspace();
  const [view, setView] = useState('dashboard'); // 'dashboard' o 'workspace'
  const [isCreating, setIsCreating] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isStrategyModalOpen, setStrategyModalOpen] = useState(false);
  const [isWorkspaceInfoModalOpen, setIsWorkspaceInfoModalOpen] = useState(false);

  const { pinnedWorkspaces, regularWorkspaces } = useMemo(() => {
    if (!workspaces) return { pinnedWorkspaces: [], recentWorkspaces: [] };

    // Ordenamos toda la lista por fecha de último acceso, del más reciente al más antiguo
    const sortedByDate = [...workspaces].sort((a, b) => {
      const dateA = a.fechaUltimoAcceso ? new Date(a.fechaUltimoAcceso) : new Date(0);
      const dateB = b.fechaUltimoAcceso ? new Date(b.fechaUltimoAcceso) : new Date(0);
      return dateB - dateA;
    });

    const pinned = sortedByDate.filter(ws => ws.isPinned);
    const regular = sortedByDate.filter(ws => !ws.isPinned);
    
    return { pinnedWorkspaces: pinned, regularWorkspaces: regular };
  }, [workspaces]);
  
  const handleCreationSuccess = (newWorkspace) => {
    console.log(`Espacio '${newWorkspace.nombre}' creado, permaneciendo en el Dashboard.`);
    setIsCreateModalOpen(false); // Simplemente cierra el modal
  };

  const handleCreateWorkspace = async (e) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;
    setIsCreating(true);
    try {
      const token = localStorage.getItem('accessToken');
      // La función del contexto ahora se encarga de recargar la lista
      await createWorkspace(newWorkspaceName, token);
      setNewWorkspaceName('');
    } catch (error) {
      alert("No se pudo crear el espacio de trabajo.");
    } finally {
      setIsCreating(false);
    }
  };

  
  const handleEnterWorkspace = (workspace) => {
    touchWorkspace(workspace.id); 
    setActiveWorkspace(workspace);
    setView('workspace');
  };

  const handleEnterClick = (workspace) => {
    // Cuando el usuario hace clic en "Entrar", notifica al componente App
    onEnterWorkspace(workspace);
  };


  // Si el usuario ha entrado a un espacio de trabajo, mostramos la vista de análisis
  if (view === 'workspace' && activeWorkspace) {
    return (
        <AnalysisWorkspace 
            // Le pasamos el contexto de usuario registrado
            context={{ type: 'user', workspace: activeWorkspace }} 
            onBack={() => setView('dashboard')}
            onLogout={onLogout}
            onBackToDashboard={() => setView('dashboard')}
            onClose={() => alert('dashboard')}
        />
    );
  }


  // Si no, mostramos el dashboard principal
  return (
    <div className="min-h-screen w-full max-w-5xl mx-auto md:p-8 text-white animate-fade-in">
      {/*<header className="flex flex-col items-center gap-2 py-3 px-4 sm:px-6 lg:px-8 text-white w-full border-b border-gray-700 bg-neutral-900 sticky top-0 z-10">*/}
        <div className="flex-col justify-center pt-4 px-4 pb-1">
          <div className="flex gap-4 justify-center mb-3">
            <h1 className="text-3xl md:text-5xl font-bold text-white">
                <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(to right, #560bad, #7209b7, #b5179e)' }}>Ferretero.IA</span>
            </h1>
            <button onClick={onLogout} className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-gray-600 text-white hover:bg-gray-700 rounded-lg transition-colors"><FiLogOut /> Cerrar Sesión</button>
          </div>
          <CreditsPanel 
            used={credits.used} 
            remaining={credits.remaining}
            // onHistoryClick={() => setActiveModal('history')}
            onHistoryClick={() => {}}
         />
        </div> 
        <div className="flex flex-col w-full justify-center border-b border-gray-700 items-center bg-neutral-900 z-20 gap-3 py-4 px-4 sticky top-0">
          <h1 className="flex text-3xl font-bold">Mis Espacios de Trabajo</h1>
          <button onClick={() => setStrategyModalOpen(true)} className="flex gap-2 items-center justify-center">
            <FiSettings /> Mi Estrategia Global
          </button>
          {/* --- BOTÓN DE CREACIÓN REESTRUCTURADO --- */}
          {/*<div className="mb-10 p-6 bg-gray-800 bg-opacity-50 rounded-lg border border-gray-700">*/}

          {/*</div>*/}
            <div className="flex relative w-full items-center rounded-lg shadow-md font-bold bg-purple-600 text-white hover:bg-purple-700 group">
              {/* Botón de Acción Principal */}
              <button 
                  onClick={() => setIsCreateModalOpen(true)}
                  className="flex flex-grow justify-center gap-2 items-center text-left p-4 rounded-l-lg">
                  <FiPlus /> Crear Nuevo Espacio de Trabajo
              </button>
              {/* Botón de Información Secundario */}
              <button
                onClick={() => setIsWorkspaceInfoModalOpen(true)}
                className="right-0 absolute p-4 flex-shrink-0 px-3 hover:bg-black hover:bg-opacity-10 rounded-r-lg text-white"
                title="¿Por qué usar múltiples espacios de trabajo?"
              >
                <FiInfo size={20} />
              </button>
            </div>
        </div>
      {/*</header>*/}

      <div className="mt-8">
        {isLoading ? (
          // Mientras carga, muestra un spinner o un mensaje simple
          <div className="text-center p-10">
            <FiLoader className="animate-spin text-3xl mx-auto text-purple-400" />
            <p className="mt-2 text-sm text-gray-400">Cargando espacios...</p>
          </div>
        ) : workspaces.length > 0 ? (
          <>
            {/* SECCIÓN DE ESPACIOS FIJADOS */}
            {pinnedWorkspaces.length > 0 && (
              <div className="mb-10 mx-4">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">Espacios Fijados</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
                  {pinnedWorkspaces.map(ws => (
                    <WorkspaceCard key={ws.id} workspace={ws} onEnter={handleEnterWorkspace} onPinToggle={togglePinWorkspace} />
                  ))}
                </div>
              </div>
            )}

            {/* SECCIÓN DE ESPACIOS RECIENTES */}
            <h2 className="text-xl font-semibold mb-4 mx-4">Actividad Reciente</h2>
            {regularWorkspaces.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mx-4 mb-4">
                {regularWorkspaces.map(ws => (
                  <WorkspaceCard key={ws.id} workspace={ws} onEnter={handleEnterWorkspace} onPinToggle={togglePinWorkspace} />
                ))}
              </div>
            ) : pinnedWorkspaces.length > 0 ? (
                <p className="text-center text-gray-500 p-8">No hay más espacios de trabajo recientes.</p>
            ) : (
                <p className="text-center text-gray-400 p-8">¡Bienvenido! Crea tu primer espacio para empezar.</p>
            )}
          </>
        ) : (
          // Si termina y no hay workspaces, muestra el mensaje de bienvenida
          <p className="text-center text-gray-400 p-8 border-2 border-dashed">
            ¡Bienvenido! Crea tu primer espacio de trabajo para empezar.
          </p>
        )}
        <FerreterosLogo/>
      </div>
      {/* --- RENDERIZADO DEL NUEVO MODAL --- */}
      {isCreateModalOpen && (
          <CreateWorkspaceModal 
              onClose={() => setIsCreateModalOpen(false)}
              onSuccess={handleCreationSuccess}
          />
      )}

      {isWorkspaceInfoModalOpen && (
        <WorkspaceInfoModal 
          onClose={() => setIsWorkspaceInfoModalOpen(false)} 
        />
      )}

      {isStrategyModalOpen && (
        <StrategyPanelModal 
          context={{ type: 'global', id: 'global' }} 
          onClose={() => setStrategyModalOpen(false)} 
        />
      )}
    </div>
  );
}