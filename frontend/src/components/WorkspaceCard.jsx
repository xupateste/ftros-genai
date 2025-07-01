// src/components/WorkspaceCard.jsx
import React, { useState, useRef, useEffect } from 'react';
import { FiEdit, FiTrash2, FiMoreVertical, FiCheck, FiStar, FiX, FiInfo, FiArrowRight, FiLoader } from 'react-icons/fi';
import { useWorkspace } from '../context/WorkspaceProvider';
import { ConfirmationModal } from './ConfirmationModal';

export function WorkspaceCard({ workspace, onEnter, onPinToggle }) {
  const { renameWorkspace, deleteWorkspace } = useWorkspace();
  
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [newName, setNewName] = useState(workspace.nombre);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // --- NUEVO ESTADO PARA EL PRELOADER ---
  const [isSaving, setIsSaving] = useState(false);

  const inputRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);
  
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuRef]);

  const handleRename = async () => {
    // Si ya se está guardando, no hacemos nada
    if (isSaving) return;
    
    // Si el nombre no ha cambiado, simplemente cancelamos la edición
    if (newName.trim() === workspace.nombre) {
        setIsEditing(false);
        return;
    }

    setIsSaving(true); // --- Inicia el preloader ---
    try {
      await renameWorkspace(workspace.id, newName.trim());
    } catch (error) {
      alert("No se pudo renombrar el espacio de trabajo.");
      setNewName(workspace.nombre); // Revertir al nombre original si falla
    } finally {
      setIsSaving(false); // --- Termina el preloader ---
      setIsEditing(false);
    }
  };
  
  const handleCancelEdit = () => {
    setNewName(workspace.nombre);
    setIsEditing(false);
  };

  
  return (
    <div className="p-4 bg-gray-800 rounded-lg border border-gray-700 flex flex-col justify-between transition-all hover:border-purple-500 min-h-[160px]">
      <div className="flex justify-between items-start gap-2">
        {/* Título o Input de Edición */}
        {isEditing ? (
          <input 
            ref={inputRef}
            type="text" 
            value={newName} 
            disabled={isSaving} // Deshabilitado mientras guarda
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename();
                if (e.key === 'Escape') handleCancelEdit();
            }}
            onBlur={handleRename} // Guardar al perder el foco es un patrón común y eficiente
            className="w-full bg-gray-900 border-b-2 border-purple-500 text-lg font-bold text-purple-400 focus:outline-none"
          />
        ) : (
          <h3 className="font-bold text-lg text-purple-400 break-words">{workspace.nombre}</h3>
        )}
        
        {/* SOLUCIÓN #3: Botones de edición mejorados */}
        <div className="relative text-xl" ref={menuRef}>
          {isEditing ? (
            <div className="flex gap-2 items-center h-full">
              {isSaving ? (
                <FiLoader className="animate-spin text-purple-400" />
              ) : (
                <>
                  {/* El `onMouseDown` previene que el onBlur del input se dispare primero, solucionando el bug del clic */}
                  <button onMouseDown={handleRename} className="p-1 rounded-full bg-green-500 text-white hover:bg-green-400"><FiCheck size={14} /></button>
                  <button onMouseDown={handleCancelEdit} className="p-1 rounded-full bg-red-500 text-white hover:bg-red-400"><FiX size={14} /></button>
                </>
              )}
            </div>
          ) : (
            <>
            <button onClick={() => onPinToggle(workspace.id)} title={workspace.isPinned ? "Desfijar" : "Fijar"}>
              <FiStar className={`transition-colors ${workspace.isPinned ? 'text-yellow-400 fill-current' : 'text-gray-500 hover:text-yellow-400'}`} />
            </button>
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-gray-400 hover:text-white p-1"><FiMoreVertical /></button>
            </>
          )}
          {isMenuOpen && !isEditing && (
            <div className="absolute right-0 mt-2 w-40 bg-gray-900 border border-gray-700 rounded-md shadow-lg z-10 animate-fade-in-fast">
              <a href="#" onClick={(e) => { e.preventDefault(); setIsEditing(true); setIsMenuOpen(false); }} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"><FiEdit size={14}/> Renombrar</a>
              <a href="#" onClick={(e) => { e.preventDefault(); setIsDeleting(true); setIsMenuOpen(false); }} className="flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-red-800 hover:text-white"><FiTrash2 size={14}/> Eliminar</a>
            </div>
          )}
        </div>
      </div>
      
      {/* Brief/Metadata Desplegable */}
      <div className="text-xs text-gray-500 mt-2">
        <button onClick={() => setIsDetailsOpen(!isDetailsOpen)} className="flex items-center gap-1 hover:text-white">
          <FiInfo size={14}/> Ver Detalles
        </button>
        {isDetailsOpen && (
          <div className="mt-2 p-3 bg-gray-900 rounded animate-fade-in-fast">
             <p><strong>ID:</strong> {workspace.id}</p>
             <p><strong>Creado:</strong> {new Date(workspace.fechaCreacion).toLocaleString('es-PE')}</p>
          </div>
        )}
      </div>

      <button onClick={() => onEnter(workspace)} className="mt-4 w-full bg-gray-700 hover:bg-purple-600 text-white font-semibold py-2 rounded-lg flex items-center justify-center gap-2">
          Entrar al Espacio <FiArrowRight />
      </button>

      {isDeleting && (
        <ConfirmationModal 
          title="¿Eliminar Espacio de Trabajo?"
          message={`Estás a punto de eliminar "${workspace.nombre}". Esta acción no se puede deshacer.`}
          onConfirm={() => deleteWorkspace(workspace.id)}
          onCancel={() => setIsDeleting(false)}
        />
      )}
    </div>
  );
}