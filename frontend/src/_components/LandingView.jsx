import React, { useState } from 'react';
import axios from 'axios';
import { FiLock, FiBarChart2, FiChevronsRight, FiUser, FiMail, FiKey, FiUserPlus, FiLoader } from 'react-icons/fi';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
// ===================================================================================
// --- VISTA 1: El Nuevo Landing Page ---
// ===================================================================================
export default function LandingView ({ onStartSession, onLoginClick }) {
  return (
  <div className="min-h-screen bg-gradient-to-b from-neutral-900 via-background to-gray-900
          flex flex-col items-center justify-center text-center px-4 py-4 sm:px-8 md:px-12 lg:px-20">
    <h1 className="text-2xl md:text-5xl font-bold text-white leading-tight">
      Tus Datos, Tu Inteligencia<br />
      <span
        className="text-5xl bg-clip-text text-transparent"
        style={{ backgroundImage: 'linear-gradient(to right, #560bad, #7209b7, #b5179e)' }}
      >
        Ferretero.IA
      </span>
    </h1>
    <p className="mt-6 text-lg md:text-xl text-gray-300 max-w-3xl mx-auto">
      Analiza tu inventario y ventas con total privacidad. Sube tus archivos para obtener reportes inteligentes que te ayudarán a tomar mejores decisiones de negocio.
    </p>

    <div className="mt-12 grid md:grid-cols-3 gap-8 text-white">
      <div className="p-6 bg-gray-800 bg-opacity-50 rounded-lg border border-gray-700">
        <FiLock className="text-4xl text-purple-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold">100% Privado y Anónimo</h3>
        <p className="text-gray-400 mt-2">Tus archivos se procesan en una sesión temporal que se elimina al refrescar la página. No requerimos registro.</p>
      </div>
      <div className="p-6 bg-gray-800 bg-opacity-50 rounded-lg border border-gray-700">
        <FiLock className="text-4xl text-purple-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold">Análisis en Segundos</h3>
        <p className="text-gray-400 mt-2">Sube tus archivos de Excel o CSV y obtén reportes complejos al instante, sin configuraciones complicadas.</p>
      </div>
      <div className="p-6 bg-gray-800 bg-opacity-50 rounded-lg border border-gray-700">
        <FiBarChart2 className="text-4xl text-purple-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold">Decisiones Inteligentes</h3>
        <p className="text-gray-400 mt-2">Descubre qué productos rotan más, cuál es tu stock muerto y dónde están tus oportunidades de ganancia.</p>
      </div>
    </div>

    <div className="mt-12">
      <button
        onClick={onStartSession}
        className="bg-purple-600 text-white font-bold text-xl px-12 py-4 rounded-lg shadow-lg hover:bg-purple-700 focus:outline-none focus:ring-4 focus:ring-purple-400 focus:ring-opacity-50 transition-transform transform hover:scale-105 duration-300 ease-in-out flex items-center justify-center mx-auto"
      >
        Iniciar Análisis Privado
        <FiChevronsRight className="ml-3 text-2xl" />
      </button>
      
      {/* --- NUEVO CTA SECUNDARIO --- */}
      <p className="mt-6 text-sm text-gray-400">
        ¿Ya tienes una cuenta?{' '}
        <button onClick={onLoginClick} className="font-semibold text-purple-400 hover:text-white hover:underline">
          Inicia sesión aquí
        </button>
      </p>
    </div>
  </div>
)};