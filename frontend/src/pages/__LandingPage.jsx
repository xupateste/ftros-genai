import { useState, useEffect, useCallback, useMemo } from 'react'; // useCallback añadido
import { useNavigate, Link } from 'react-router-dom';
import '../index.css';
import { FiDownload, FiSend, FiRefreshCw, FiLock, FiBarChart2, FiChevronsRight, FiX, FiLoader, FiSettings} from 'react-icons/fi'

import axios from 'axios';
import Select from 'react-select';
import CsvImporterComponent from '../assets/CsvImporterComponent';
import * as XLSX from 'xlsx';

import { v4 as uuidv4 } from 'uuid';

import { getSessionId } from '../utils/sessionManager'; // Ajusta la ruta

import { StrategyProvider, useStrategy } from '../context/StrategyProvider';
import { WorkspaceProvider } from '../context/WorkspaceProvider';

import { useWorkspace } from '../context/WorkspaceProvider';
import { WorkspaceSelector } from '../components/WorkspaceSelector';

import { LoginPage } from '../components/LoginPage'; // Ajusta la ruta

import { StrategyPanelModal } from '../components/StrategyPanelModal';
import { ProOfferModal } from '../components/ProOfferModal'; // Ajusta la ruta
import { RegisterPage } from '../components/RegisterPage'; // Ajusta la ruta si es necesario
import { InsufficientCreditsModal } from '../components/InsufficientCreditsModal'; // Ajusta la ruta

import { CreditsPanel } from '../components/CreditsPanel';
import { CreditHistoryModal } from '../components/CreditHistoryModal';
import { ConversionModal } from '../components/ConversionModal'; // Ajusta la ruta si es necesario


const API_URL = import.meta.env.VITE_API_URL;

export default function App() {
  return (
    <StrategyProvider>
      <WorkspaceProvider>
        <LandingPage /> {/* O tu componente principal con las rutas */}
      </WorkspaceProvider>
    </StrategyProvider>
  );
}

const templateVentas = {
        columns: [
          {
            name: "Fecha de venta",
            key: "Fecha de venta",
            required: true,
            description: "Fecha en formato dd/mm/aaaa ej:23/05/2025",
            suggested_mappings: ["Fecha de venta"]
          },
          {
            name: "N° de comprobante / boleta",
            key: "N° de comprobante / boleta",
            required: true,
            // description: "Fecha en formato dd/mm/aaaa ej:23/05/2025",
            suggested_mappings: ["N° de comprobante / boleta"]
          },
          {
            name: "SKU / Código de producto",
            key: "SKU / Código de producto",
            required: true,
            suggested_mappings: ["SKU / Código de producto"]
          },
          {
            name: "Nombre del producto",
            key: "Nombre del producto",
            required: true,
            suggested_mappings: ["Nombre del producto"]
          },
          {
            name: "Cantidad vendida",
            key: "Cantidad vendida",
            required: true,
            description: "Sólo valor numérico entero ej:10",
            suggested_mappings: ["Cantidad vendida"]
          },
          {
            name: "Precio de venta unitario (S/.)",
            key: "Precio de venta unitario (S/.)",
            required: true,
            description: "Sólo valor numérico entero ó decimal ej:10.5",
            suggested_mappings: ["Precio de venta unitario (S/.)"]
          }
        ]
      };
const templateStock = {
        columns: [
          {
            name: "SKU / Código de producto",
            key: "SKU / Código de producto",
            required: true,
            suggested_mappings: ["SKU / Código de producto"]
          },
          {
            name: "Nombre del producto",
            key: "Nombre del producto",
            required: true,
            suggested_mappings: ["Nombre del producto"]
          },
          {
            name: "Cantidad en stock actual",
            key: "Cantidad en stock actual",
            required: true,
            description: "Sólo valor numérico entero ej:10",
            suggested_mappings: ["Cantidad en stock actual"]
          },
          {
            name: "Precio de compra actual (S/.)",
            key: "Precio de compra actual (S/.)",
            required: true,
            description: "Sólo valor numérico entero ó decimal ej:10.5",
            suggested_mappings: ["Precio de compra actual (S/.)"]
          },
          {
            name: "Precio de venta actual (S/.)",
            key: "Precio de venta actual (S/.)",
            required: true,
            description: "Sólo valor numérico entero ó decimal ej:10.5",
            suggested_mappings: ["Precio de venta actual (S/.)"]
          },
          {
            name: "Marca",
            key: "Marca",
            required: true,
            suggested_mappings: ["Marca"]
          },
          {
            name: "Categoría",
            key: "Categoría",
            required: true,
            suggested_mappings: ["Categoría"]
          },
          {
            name: "Subcategoría",
            key: "Subcategoría",
            required: true,
            suggested_mappings: ["Subcategoría"]
          },
          {
            name: "Rol de categoría",
            key: "Rol de categoría",
            required: true,
            suggested_mappings: ["Rol de categoría"]
          },
          {
            name: "Rol del producto",
            key: "Rol del producto",
            required: true,
            suggested_mappings: ["Rol del producto"]
          }
        ]
      };
// (diccionarioData y reportData permanecen igual que en tu última versión)
const diccionarioData = {
  'Análisis ABC de Productos ✓': `<table class="max-w-full border-collapse table-auto mb-10 text-xs"><thead><tr class="bg-gray-100"><th class="border border-gray-300 px-4 py-2 text-center">SKU /<br>Código de producto</th><th class="border border-gray-300 px-4 py-2 text-center">Nombre del<br>producto</th><th class="border border-gray-300 px-4 py-2 text-center">Categoría</th><th class="border border-gray-300 px-4 py-2 text-center">Subcategoría</th><th class="border border-gray-300 px-4 py-2 text-center">Valor<br>Ponderado<br>(ABC)</th><th class="border border-gray-300 px-4 py-2 text-center">Venta<br>Total<br>(S/.)</th><th class="border border-gray-300 px-4 py-2 text-center">Cantidad<br>Vendida (Und)</th><th class="border border-gray-300 px-4 py-2 text-center">Margen Total<br>(S/.)</th><th class="border border-gray-300 px-4 py-2 text-center">% Participación</th><th class="border border-gray-300 px-4 py-2 text-center">% Acumulado</th><th class="border border-gray-300 px-4 py-2 text-center">Clasificación<br>ABC</th></tr></thead><tbody><tr><td class="border border-gray-300 px-4 py-2 text-center">1234</td><td class="border border-gray-300 px-4 py-2 text-center">MARTILLO CURVO 16OZ TRUPER</td><td class="border border-gray-300 px-4 py-2 text-center">HERRAMIENTAS</td><td class="border border-gray-300 px-4 py-2 text-center">MARTILLOS</td><td class="border border-gray-300 px-4 py-2 text-center">0.82</td><td class="border border-gray-300 px-4 py-2 text-center">504</td><td class="border border-gray-300 px-4 py-2 text-center">24</td><td class="border border-gray-300 px-4 py-2 text-center">159</td><td class="border border-gray-300 px-4 py-2 text-center">0.42</td><td class="border border-gray-300 px-4 py-2 text-center">24.04</td><td class="border border-gray-300 px-4 py-2 text-center">A</td></tr></tbody></table>`,
  // 'Análisis Rotación de Productos ✓': `<table class="max-w-full border-collapse table-auto mb-10 text-xs"><thead><tr class="bg-gray-100"><th class="border w-80 border-gray-300 px-4 py-2 text-center">SKU / Código de producto</th><th class="border border-gray-300 px-4 py-2 text-center">Nombre delproducto</th><th class="border border-gray-300 px-4 py-2 text-center">Categoría</th><th class="border border-gray-300 px-4 py-2 text-center">Subcategoría</th><th class="border border-gray-300 px-4 py-2 text-center">Rol del producto</th><th class="border border-gray-300 px-4 py-2 text-center">Rol de categoría</th><th class="border border-gray-300 px-4 py-2 text-center">Marca</th><th class="border border-gray-300 px-4 py-2 text-center">Precio de compra actual (S/.)</th><th class="border border-gray-300 px-4 py-2 text-center">Stock Actual (Unds)</th><th class="border border-gray-300 px-4 py-2 text-center">Valor stock (S/.)</th><th class="border border-gray-300 px-4 py-2 text-center">Ventas totales (Unds)</th><th class="border border-gray-300 px-4 py-2 text-center">Ventas últimos 6m (Unds)</th><th class="border border-gray-300 px-4 py-2 text-center">Última venta</th><th class="border border-gray-300 px-4 py-2 text-center">Días sin venta</th><th class="border border-gray-300 px-4 py-2 text-center">Días para Agotar Stock (Est.6m)</th><th class="border border-gray-300 px-4 py-2 text-center">Clasificación Diagnóstica</th><th class="border border-gray-300 px-4 py-2 text-center">Prioridad y Acción (DAS 6m)</th></tr></thead><tbody><tr><td class="border border-gray-300 px-4 py-2 text-center">1234</td><td class="border border-gray-300 px-4 py-2 text-center">MARTILLO CURVO 16OZ TRUPER</td><td class="border border-gray-300 px-4 py-2 text-center">HERRAMIENTAS</td><td class="border border-gray-300 px-4 py-2 text-center">MARTILLOS</td><td class="border border-gray-300 px-4 py-2 text-center">0.82</td><td class="border border-gray-300 px-4 py-2 text-center">504</td><td class="border border-gray-300 px-4 py-2 text-center">24</td><td class="border border-gray-300 px-4 py-2 text-center">159</td><td class="border border-gray-300 px-4 py-2 text-center">0.42</td><td class="border border-gray-300 px-4 py-2 text-center">24.04</td><td class="border border-gray-300 px-4 py-2 text-center">A</td><td class="border border-gray-300 px-4 py-2 text-center">A</td><td class="border border-gray-300 px-4 py-2 text-center">A</td><td class="border border-gray-300 px-4 py-2 text-center">A</td><td class="border border-gray-300 px-4 py-2 text-center">A</td><td class="border border-gray-300 px-4 py-2 text-center">A</td><td class="border border-gray-300 px-4 py-2 text-center">A</td></tr></tbody></table>`,
  'Análisis Estratégico de Rotación ✓': `<div class="p-4 max-w-7xl mx-auto font-sans text-gray-800 space-y-8"><div><h3 class="text-xl font-semibold">📌 Ejemplo del resultado</h3><div class="overflow-x-auto rounded-lg border border-gray-300"><table class="min-w-full text-sm text-left text-gray-700"><thead class="bg-gray-100 text-xs uppercase text-gray-500"><tr><th class="px-4 py-3">SKU</th><th class="px-4 py-3">Producto</th><th class="px-4 py-3">Categoría</th><th class="px-4 py-3">Marca</th><th class="px-4 py-3">Stock Actual</th><th class="px-4 py-3">Precio Compra (S/.)</th><th class="px-4 py-3">Inversión Stock</th><th class="px-4 py-3">Ventas (30d)</th><th class="px-4 py-3">Cobertura (días)</th><th class="px-4 py-3">Alerta</th><th class="px-4 py-3">Importancia</th><th class="px-4 py-3">Clasificación</th></tr></thead><tbody class="bg-white"><tr class="border-t"><td class="px-4 py-2">12345</td><td class="px-4 py-2">Cable N°12 Vulcano</td><td class="px-4 py-2">Eléctricos</td><td class="px-4 py-2">Vulcano</td><td class="px-4 py-2">24</td><td class="px-4 py-2">1.80</td><td class="px-4 py-2">43.20</td><td class="px-4 py-2">12</td><td class="px-4 py-2">60.0</td><td class="px-4 py-2">Saludable</td><td class="px-4 py-2">0.842</td><td class="px-4 py-2">Clase A (Crítico)</td></tr></tbody></table></div></div><div><h3 class="text-xl font-semibold">📂 Descripción de columnas</h3><div class="overflow-x-auto"><table class="min-w-full text-sm text-left border border-gray-300"><thead class="bg-gray-100 text-gray-600 text-xs uppercase"><tr><th class="px-4 py-2">Columna</th><th class="px-4 py-2">Descripción</th><th class="px-4 py-2">Uso estratégico</th></tr></thead><tbody class="bg-white"><tr class="border-t"><td class="px-4 py-2 font-medium">SKU / Producto</td><td class="px-4 py-2">Identificador y nombre del producto</td><td class="px-4 py-2">Permite accionar decisiones específicas</td></tr><tr class="border-t"><td class="px-4 py-2 font-medium">Categoría / Marca</td><td class="px-4 py-2">Clasificación comercial y proveedor</td><td class="px-4 py-2">Segmentar por rubros o acuerdos</td></tr><tr class="border-t"><td class="px-4 py-2 font-medium">Stock Actual</td><td class="px-4 py-2">Unidades disponibles en inventario</td><td class="px-4 py-2">Identificar quiebres o excesos</td></tr><tr class="border-t"><td class="px-4 py-2 font-medium">Precio Compra (S/.)</td><td class="px-4 py-2">Costo por unidad</td><td class="px-4 py-2">Cálculo de inversión y rentabilidad</td></tr><tr class="border-t"><td class="px-4 py-2 font-medium">Inversión Stock</td><td class="px-4 py-2">Stock x Precio Compra</td><td class="px-4 py-2">Visualizar capital inmovilizado</td></tr><tr class="border-t"><td class="px-4 py-2 font-medium">Ventas (30d)</td><td class="px-4 py-2">Unidades vendidas en últimos 30 días</td><td class="px-4 py-2">Detectar rotación reciente</td></tr><tr class="border-t"><td class="px-4 py-2 font-medium">Cobertura (días)</td><td class="px-4 py-2">Días estimados de duración del stock</td><td class="px-4 py-2">Anticipar faltantes o sobre-stocks</td></tr><tr class="border-t"><td class="px-4 py-2 font-medium">Alerta</td><td class="px-4 py-2">Diagnóstico automático del stock</td><td class="px-4 py-2">Facilita decisiones inmediatas</td></tr><tr class="border-t"><td class="px-4 py-2 font-medium">Importancia</td><td class="px-4 py-2">Puntaje basado en ventas, margen e ingresos</td><td class="px-4 py-2">Priorizar productos clave</td></tr><tr class="border-t"><td class="px-4 py-2 font-medium">Clasificación</td><td class="px-4 py-2">Etiqueta ABC según la importancia</td><td class="px-4 py-2">Determinar foco comercial o estratégico</td></tr></tbody></table></div></div><div><h3 class="text-xl font-semibold">🧠 ¿Cómo usarlo estratégicamente?</h3><ul class="list-disc list-inside space-y-4"><li>🔍<strong class="mx-2 font-semibold text-gray-900 dark:text-white">Detecta productos con bajo movimiento:</strong>Filtra por<code class="px-2 mx-2 py-0.5 bg-gray-100 text-pink-600 font-mono text-sm rounded dark:bg-gray-800 dark:text-pink-400">min_importancia=0.0</code>y<code class="px-2 mx-2 py-0.5 bg-gray-100 text-pink-600 font-mono text-sm rounded dark:bg-gray-800 dark:text-pink-400">max_dias_cobertura=9999</code>.</li><li>📈<strong class="mx-2 font-semibold text-gray-900 dark:text-white">Prioriza productos de alto valor:</strong>Ordena por<code class="px-2 mx-2 py-0.5 bg-gray-100 text-pink-600 font-mono text-sm rounded dark:bg-gray-800 dark:text-pink-400">sort_by='Importancia_Dinamica'</code>y filtra por<code class="px-2 mx-2 py-0.5 bg-gray-100 text-pink-600 font-mono text-sm rounded dark:bg-gray-800 dark:text-pink-400">min_importancia=0.7</code>.</li><li>🚨<strong class="mx-2 font-semibold text-gray-900 dark:text-white">Atiende quiebres de stock:</strong>Filtra por<code class="px-2 mx-2 py-0.5 bg-gray-100 text-pink-600 font-mono text-sm rounded dark:bg-gray-800 dark:text-pink-400">Alerta_Stock = 'Agotado'</code>o cobertura &lt; 15 días.</li><li>💰<strong class="mx-2 font-semibold text-gray-900 dark:text-white">Reduce sobre-stock:</strong>Filtra por<code class="px-2 mx-2 py-0.5 bg-gray-100 text-pink-600 font-mono text-sm rounded dark:bg-gray-800 dark:text-pink-400">Alerta_Stock = 'Sobre-stock'</code>y<code class="px-2 mx-2 py-0.5 bg-gray-100 text-pink-600 font-mono text-sm rounded dark:bg-gray-800 dark:text-pink-400">Importancia &lt; 0.4</code>.</li><li>📦<strong class="mx-2 font-semibold text-gray-900 dark:text-white">Optimiza por categoría o marca:</strong>Usa<code class="px-2 mx-2 py-0.5 bg-gray-100 text-pink-600 font-mono text-sm rounded dark:bg-gray-800 dark:text-pink-400">filtro_categorias</code>o<code class="px-2 mx-2 py-0.5 bg-gray-100 text-pink-600 font-mono text-sm rounded dark:bg-gray-800 dark:text-pink-400">filtro_marcas</code>según tu enfoque.</li></ul></div></div>`,
  'Diagnóstico de Stock Muerto ✓': `done`,
  'Puntos de Alerta de Stock ✓' : 'done',
  'Lista básica de reposición según histórico ✓' : 'dancer2'
};

// ===================================================================================
// --- VISTA 1: El Nuevo Landing Page ---
// ===================================================================================
const LandingView = ({ onStartSession }) => (
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
        Iniciar Sesión de Análisis
        <FiChevronsRight className="ml-3 text-2xl" />
      </button>
    </div>
  </div>
);

// ===================================================================================
// --- VISTA 2: El Modal de Onboarding ---
// ===================================================================================
const OnboardingModal = ({ onSubmit, onCancel, isLoading }) => {
  const [rol, setRol] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!rol) {
      alert("Por favor, selecciona tu rol para continuar.");
      return;
    }
    onSubmit({ rol });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-900 via-background to-gray-900
          flex flex-col items-center justify-center text-center px-4 py-4 sm:px-8 md:px-12 lg:px-20">
      <div className="bg-white rounded-lg p-8 m-4 max-w-md w-full shadow-2xl relative">
        <button onClick={onCancel} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600">
           <FiX size={24}/>
        </button>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">¡Un último paso!</h2>
        <p className="text-gray-600 mb-6">Esta información (totalmente anónima) nos ayuda a entender a nuestros usuarios y mejorar la herramienta.</p>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label htmlFor="rol" className="block text-sm font-medium text-gray-700 mb-2">¿Cuál es tu rol principal en el negocio?</label>
            <select id="rol" value={rol} onChange={(e) => setRol(e.target.value)} className="mt-1 block w-full py-3 px-4 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm" required>
              <option value="" disabled>Selecciona una opción...</option>
              <option value="dueño">Dueño(a) / Propietario(a)</option>
              <option value="gerente_compras">Gerente de Compras</option>
              <option value="administrador">Administrador(a)</option>
              <option value="consultor">Consultor / Analista</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          <button type="submit" disabled={isLoading} className="w-full bg-purple-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:bg-gray-400 flex items-center justify-center">
            {isLoading ? "Creando sesión..." : "Comenzar a Analizar"}
          </button>
        </form>
      </div>
    </div>
  );
};

// ===================================================================================
// --- COMPONENTE PRINCIPAL: Ahora se llama App y orquesta las vistas ---
// ===================================================================================
function LandingPage() { // Mantenemos el nombre para que no tengas que cambiar el import en App.jsx, etc.
  const [appState, setAppState] = useState('landing'); // 'landing', 'onboarding', 'analysis', 'registering', 'login'
  
  const [authToken, setAuthToken] = useState(localStorage.getItem('accessToken'));

  const { loadStrategy } = useStrategy();
  const [sessionId, setSessionId] = useState(null);

  const [reportsConfig, setReportsConfig] = useState(null); // Para guardar la respuesta cruda de la API
  const [isConfigLoading, setIsConfigLoading] = useState(true);

  const { initializeSessionAndLoadStrategy } = useStrategy();

  const [isStrategyPanelOpen, setStrategyPanelOpen] = useState(false); // Estado para el modal
  const { strategy } = useStrategy();

  const { 
        workspaces, 
        activeWorkspace, 
        setActiveWorkspace, 
        fetchWorkspaces,
        createWorkspace 
    } = useWorkspace();

  const [credits, setCredits] = useState({ used: 0, remaining: 0 });
  const [creditHistory, setCreditHistory] = useState([]);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [showConversionModal, setShowConversionModal] = useState(false);

  const [showProModal, setShowProModal] = useState(false);
  const [proReportClicked, setProReportClicked] = useState(null);

  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [creditsInfo, setCreditsInfo] = useState({ required: 0, remaining: 0 });

  const [analysisResult, setAnalysisResult] = useState(null); // Guardará { insight, data, report_key }

  // --- NUEVOS ESTADOS PARA GESTIONAR LA CARGA DE ARCHIVOS ---
  const [uploadedFileIds, setUploadedFileIds] = useState({ ventas: null, inventario: null });
  const [uploadStatus, setUploadStatus] = useState({ ventas: 'idle', inventario: 'idle' });
  
  const [ventasFile, setVentasFile] = useState(null);
  const [inventarioFile, setInventarioFile] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  // const [filesReady, setFilesReady] = useState(false);
  const filesReady = uploadedFileIds.ventas && uploadedFileIds.inventario;
  const [insightHtml, setInsightHtml] = useState('');
  const [parameterValues, setParameterValues] = useState({});
  
  const [modalParams, setModalParams] = useState({});

   // --- Lógica del Flujo ---
  const handleStartSession = () => setAppState('onboarding');
  const handleCancelOnboarding = () => setAppState('landing');
  
  const handleOnboardingSubmit = async (data) => {
    setIsLoading(true);
    try {
      // Por ahora, generamos el ID en el frontend.
      // Más adelante, aquí irá la llamada a `POST /sessions`
      const response = await axios.post(`${API_URL}/sessions`, data);
      const newSessionId = response.data.sessionId; // Usar el ID del backend

      await initializeSessionAndLoadStrategy(newSessionId);
      // await loadStrategy(newSessionId);
      setSessionId(newSessionId);
      setAppState('analysis');

    } catch (error) {
      console.error("Error al crear la sesión:", error);
      alert("No se pudo iniciar la sesión.");
      setAppState('landing'); // Volver al landing si hay error
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoToLogin = () => {
        // Cierra cualquier modal abierto y muestra la página de login
        setShowProModal(false);
        setShowCreditsModal(false);
        setAppState('login');
    };

  const handleLoginSuccess = (token) => {
      // Guardamos el token en localStorage para persistir la sesión
      localStorage.setItem('accessToken', token);
      setAuthToken(token);
      // Aquí podrías guardar el perfil del usuario en el estado
      // Por ahora, lo redirigimos al landing para que inicie una sesión autenticada
      setAppState('analysis'); 
      alert("¡Inicio de sesión exitoso!");
  };


  
  const handleLogout = () => {
      localStorage.removeItem('accessToken');
      setAuthToken(null);
      // Recargamos la página para asegurar una sesión limpia
      window.location.reload();
  };

  const handleRegisterClick = () => {
    // Por ahora, solo muestra una alerta. En el futuro, redirigiría a /register.
    alert("¡Función de registro próximamente! Aquí es donde el usuario crearía su cuenta.");
    setShowConversionModal(false);
  };

  const handleRegisterSuccess = () => {
      // Después de un registro exitoso, llevamos al usuario a la vista de login
      // para que inicie sesión con su nueva cuenta.
      setAppState('login');
  };


  const handleNewSessionClick = () => {
    // Simplemente recarga la página para empezar una nueva sesión anónima
    window.location.reload();
  };

  const handleGoToRegister = () => {
        // Cerramos cualquier modal que esté abierto y cambiamos a la vista de registro
        setShowProModal(false); 
        setAppState('registering');
    };

  // --- NUEVA FUNCIÓN PARA MANEJAR LA CARGA Y LLAMADA A LA API ---
  const handleFileProcessed = async (file, fileType) => {
    const isUserLoggedIn = !!authToken; // True si hay un token, false si no

    // 2. Verificaciones iniciales
    if (isUserLoggedIn && !activeWorkspace) {
        alert("Por favor, selecciona o crea un espacio de trabajo antes de subir archivos.");
        return;
    }
    if (!isUserLoggedIn && !sessionId) {
        alert("Error: No se ha iniciado una sesión de análisis.");
        return;
    }

    setUploadStatus(prev => ({ ...prev, [fileType]: 'uploading' }));

    const formData = new FormData();
    formData.append("file", file);
    formData.append("tipo_archivo", fileType);

    const headers = {};
    if (isUserLoggedIn) {
        // --- LÓGICA PARA USUARIO REGISTRADO ---
        headers['Authorization'] = `Bearer ${authToken}`;
        formData.append("workspace_id", activeWorkspace.id);
        console.log(`Enviando archivo al workspace: ${activeWorkspace.id}`);
    } else {
        // --- LÓGICA PARA USUARIO ANÓNIMO ---
        headers['X-Session-ID'] = sessionId;
        console.log(`Enviando archivo a la sesión anónima: ${sessionId}`);
    }

    try {
      const response = await axios.post(`${API_URL}/upload-file`, formData, { headers });
      console.log('Respuesta del servidor:', response.data);

      setUploadedFileIds(prev => ({ ...prev, [fileType]: response.data.file_id }));
      setUploadStatus(prev => ({ ...prev, [fileType]: 'success' }));

      // --- CAMBIO CLAVE: Actualizamos los filtros si es un archivo de inventario ---
      if (fileType === 'inventario' && response.data.available_filters) {
        console.log("Filtros recibidos del backend:", response.data.available_filters);
        setAvailableFilters({
          categorias: response.data.available_filters.categorias || [],
          marcas: response.data.available_filters.marcas || []
        });
      }

      // Si la subida es exitosa, limpiamos el caché porque los datos de entrada han cambiado
      setCachedResponse({ key: null, blob: null });

    } catch (error) {
      console.error(`Error al subir el archivo de ${fileType}:`, error);
      alert(error.response?.data?.detail || `Error al subir el archivo de ${fileType}.`);
      setUploadStatus(prev => ({ ...prev, [fileType]: 'error' }));
    }
  };



  // Estado para el acordeón de opciones avanzadas
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Este estado nos dirá si la caché actual es válida para los parámetros del modal
  const [isCacheValid, setIsCacheValid] = useState(false);

  // --- MODIFICACIÓN 1: Estado para el caché de la respuesta ---
  const [cachedResponse, setCachedResponse] = useState({ key: null, blob: null });
  const [isLoading, setIsLoading] = useState(false); // Para feedback visual

  const [availableFilters, setAvailableFilters] = useState({ categorias: [], marcas: [] });
  const [isLoadingFilters, setIsLoadingFilters] = useState(false);

  const handleVentasInput = (file) => setVentasFile(file);
  const handleInventarioInput = (file) => setInventarioFile(file);

  const getParameterLabelsForFilename = () => {
    // Ahora, la lista de parámetros a incluir en el nombre se basa SOLO en los básicos.
    const basicParameters = selectedReport?.basic_parameters || [];

    if (basicParameters.length === 0) return "";

    // La lógica de iteración ahora solo recorre los parámetros básicos.
    return basicParameters.map(param => {
      const selectedValue = modalParams[param.name];

      // Si el valor no existe, es el default, o es un array vacío, no lo incluye.
      // (Esta es una mejora opcional para no incluir parámetros con su valor por defecto)
      if (!selectedValue || selectedValue === param.defaultValue || (Array.isArray(selectedValue) && selectedValue.length === 0)) {
        return null;
      }
      
      // Si es un array, lo une con guiones para el nombre del archivo.
      const valueString = Array.isArray(selectedValue) ? selectedValue.join('-') : selectedValue;

      // Usamos una etiqueta más corta para el nombre del archivo, si está disponible
      const paramLabel = param.shortLabel || param.name;

      return `${paramLabel}-${valueString}`;
    }).filter(Boolean).join('_');
  };

  const handleReportView = useCallback((reportItem) => {
    // --- NUEVA LÓGICA DE DECISIÓN ---
    // Primero, verificamos si el reporte es una función "Pro"
    if (reportItem.isPro) {
        // Si es Pro, establecemos el reporte seleccionado y mostramos el modal de oferta
        setProReportClicked(reportItem);
        setShowProModal(true);
    } else {
        // Si NO es Pro, ejecutamos toda tu lógica original para el modal de parámetros

        setSelectedReport(reportItem);
        setInsightHtml(diccionarioData[reportItem.label] || "<p>No hay información disponible.</p>");

        const initialParams = {};
        const allParamsConfig = [
            ...(reportItem.basic_parameters || []),
            ...(reportItem.advanced_parameters || [])
        ];

        allParamsConfig.forEach(param => {
            const paramName = param.name;
            
            // Tu lógica de jerarquía de 3 niveles se mantiene intacta aquí
            if (strategy[paramName] !== undefined) {
                initialParams[paramName] = strategy[paramName];
            } else {
                initialParams[paramName] = param.defaultValue;
            }
        });

        setModalParams(initialParams);
        setShowAdvanced(false);
        setShowModal(true);
    }
  }, [
      strategy, 
      diccionarioData, 
      // Añadimos las nuevas funciones de estado al array de dependencias
      setProReportClicked, 
      setShowProModal, 
      setSelectedReport, 
      setInsightHtml, 
      setModalParams, 
      setShowAdvanced, 
      setShowModal
  ]);; // Dependencia simplificada


  // --- MANEJO DE CAMBIOS EN PARÁMETROS DEL MODAL ---
  const handleParamChange = (paramName, value) => {
    // Ahora solo modifica los parámetros del modal, nada más.
    setModalParams(prev => ({ ...prev, [paramName]: value }));
  };

  const handleResetAdvanced = () => {
    const advancedDefaults = {};
    selectedReport.advanced_parameters?.forEach(param => {
        // Al resetear, volvemos a aplicar la jerarquía para obtener los defaults correctos
        if (strategy[param.name] !== undefined) {
            advancedDefaults[param.name] = strategy[param.name];
        } else {
            advancedDefaults[param.name] = param.defaultValue;
        }
    });
    
    setModalParams(prev => ({ ...prev, ...advancedDefaults }));
  };

  const getNow = useCallback(() => { // useCallback si no depende de props/estado o si sus deps son estables
    return new Date().toLocaleDateString('en-CA');
  }, []);

  // --- NUEVA FUNCIÓN PARA GENERAR Y DESCARGAR EXCEL EN EL CLIENTE ---
  const handleDownloadExcel = (type) => {
    if (!analysisResult || !analysisResult.data) {
        alert("No hay datos de análisis para descargar.");
        return;
    }

    let dataToExport = analysisResult.data;
    let filename = `FerreteroIA_${analysisResult.report_key}.xlsx`;

    // Lógica para crear el reporte accionable
    if (type === 'accionable') {
        const columnasAccionables = [
            'SKU / Código de producto', 
            'Nombre del producto', 
            'Stock Actual (Unds)', 
            'Sugerencia_Pedido_Ideal_Unds', // Asegúrate que este nombre de columna coincida con el que devuelve tu backend
            // ... puedes añadir más columnas clave aquí
        ];

        dataToExport = analysisResult.data.map(row => {
            let newRow = {};
            columnasAccionables.forEach(col => {
                if (row[col] !== undefined) newRow[col] = row[col];
            });
            // Añadimos las columnas vacías que pediste para imprimir
            newRow['Check ✓'] = '';
            newRow['Cantidad Final'] = '';
            return newRow;
        });
        filename = `FerreteroIA_${analysisResult.report_key}_Accionable.xlsx`;
    }

    // Usamos la librería xlsx para crear el archivo desde el JSON
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte");
    
    // Disparamos la descarga
    XLSX.writeFile(workbook, filename);
};

  // --- MODIFICACIÓN 4: Función auxiliar para disparar la descarga ---
  const triggerDownload = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    setIsLoading(false); // Termina la carga después de iniciar la descarga
  };


  // --- MODIFICACIÓN 2: handleGenerateAnalysis para usar y actualizar caché ---
  const handleGenerateAnalysis = async () => {
    // 1. Verificación inicial (ahora comprueba los IDs de archivo)
    if (!selectedReport || !uploadedFileIds.ventas || !uploadedFileIds.inventario || !sessionId) {
      alert("Asegúrate de haber iniciado una sesión, subido ambos archivos y seleccionado un reporte.");
      return;
    }

    setIsLoading(true);
    setAnalysisResult(null);

    // // --- LÓGICA DE CACHÉ ---
    // // 1. Crear una clave única para la solicitud actual
    // const currentCacheKey = `${selectedReport.endpoint}-${uploadedFileIds.ventas}-${uploadedFileIds.inventario}-${JSON.stringify(modalParams)}`;

    // // 2. Verificar si hay una respuesta en caché que coincida con la clave actual
    // if (cachedResponse.key === currentCacheKey && cachedResponse.blob) {
    //   console.log("Usando respuesta de caché para:", currentCacheKey);
      
    //   const filename = `FerreteroIA_${selectedReport.label.replace(/[✓\s]/g, '')}_cached.xlsx`;
      
    //   // Reutilizamos el blob guardado para la descarga
    //   const url = window.URL.createObjectURL(cachedResponse.blob);
    //   const link = document.createElement('a');
    //   link.href = url;
    //   link.setAttribute('download', filename);
    //   document.body.appendChild(link);
    //   link.click();
    //   link.remove();
    //   window.URL.revokeObjectURL(url);

    //   setIsLoading(false); // Detenemos la carga
    //   return; // Salimos de la función para evitar la llamada a la API
    // }
    
    // // --- SI NO HAY CACHÉ, CONTINUAMOS CON LA LLAMADA A LA API ---
    // console.log("No hay caché válido. Realizando nueva petición al servidor.");

    // 2. Crear el FormData (ahora con IDs en lugar de archivos)
    const formData = new FormData();
    
    // --- CAMBIO CLAVE ---
    // Enviamos los IDs de los archivos, no los archivos completos.
    formData.append("ventas_file_id", uploadedFileIds.ventas);
    formData.append("inventario_file_id", uploadedFileIds.inventario);

    // Adjuntamos el resto de los parámetros del modal como antes
    const allParameters = [
      ...(selectedReport.basic_parameters || []),
      ...(selectedReport.advanced_parameters || [])
    ];

    allParameters.forEach(param => {
        const value = modalParams[param.name];
        if (value !== undefined && value !== null && value !== '') {
            if (Array.isArray(value)) {
                formData.append(param.name, JSON.stringify(value));
            } else {
                formData.append(param.name, value);
            }
        }
    });

    // --- FIN DEL CAMBIO ---

    try {
      const response = await axios.post(`${API_URL}${selectedReport.endpoint}`, formData, {
        // responseType: 'blob', // Ahora espera un JSON
        headers: { 'X-Session-ID': sessionId }
      });
      
      const newBlob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      // 3. Guardar la nueva respuesta en el caché
      // setCachedResponse({ key: currentCacheKey, blob: newBlob });

      // Guardamos el resultado completo (insight + datos) en nuestro nuevo estado
      setAnalysisResult(response.data);

      // const filename = `FerreteroIA_${selectedReport.label.replace(/[✓\s]/g, '')}.xlsx`;
      // const url = window.URL.createObjectURL(newBlob);
      // const link = document.createElement('a');
      // link.href = url;
      // link.setAttribute('download', filename);
      // document.body.appendChild(link);
      // link.click();
      // link.remove();
      // window.URL.revokeObjectURL(url);

      // Después de una ejecución exitosa, volvemos a pedir el estado actualizado
      const updatedState = await axios.get(`${API_URL}/session-state`, { headers: { 'X-Session-ID': sessionId } });
      setCredits(updatedState.data.credits);
      setCreditHistory(updatedState.data.history);

    } catch (error) {
      // --- 5. LÓGICA DE MANEJO DE ERRORES MEJORADA ---
      console.error("Error al generar el reporte:", error);

      // Verificamos si el error es por falta de créditos (código 402)
      if (error.response?.status === 402) {
          // Obtenemos la información necesaria para el modal
          const required = selectedReport?.costo || 0;
          const remaining = credits.remaining || 0;
          setCreditsInfo({ required, remaining });
          
          // Mostramos el modal específico de créditos insuficientes
          setShowCreditsModal(true);
      } else {
          // Para cualquier otro error, mantenemos la lógica genérica
          let errorMessage = "Ocurrió un error al generar el reporte.";
          if (error.response?.data && error.response.data instanceof Blob) {
              try {
                  const errorText = await error.response.data.text();
                  const errorJson = JSON.parse(errorText);
                  errorMessage = errorJson.detail || errorMessage;
              } catch (e) { /* Mantener mensaje genérico */ }
          }
          alert(errorMessage);
      }

      // Si el reporte falló, también es buena idea actualizar el historial
      // para que el usuario vea el intento fallido.
      try {
          const updatedState = await axios.get(`${API_URL}/session-state`, { headers: { 'X-Session-ID': sessionId } });
          setCreditHistory(updatedState.data.history);
      } catch (stateError) {
          console.error("No se pudo actualizar el historial después de un error:", stateError);
      }
      // // Tu manejo de errores no cambia
      // console.error("Error al generar el reporte:", error);
      // if (error.response?.status === 402) {
      //     // Si es un error 402, mostramos el modal de conversión
      //     setShowConversionModal(true);
      // } else {
      //     // Para cualquier otro error, mostramos una alerta genérica
      //     let errorMessage = "Ocurrió un error al generar el reporte.";
      //     if (error.response?.data && error.response.data instanceof Blob) {
      //         try {
      //             const errorText = await error.response.data.text();
      //             const errorJson = JSON.parse(errorText);
      //             errorMessage = errorJson.detail || errorMessage;
      //         } catch (e) { /* Mantener mensaje genérico */ }
      //     }
      //     alert(errorMessage);
      // }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Solo se ejecuta una vez cuando el componente se monta
    const fetchConfig = async () => {
      setIsConfigLoading(true);
      try {
        const response = await axios.get(`${API_URL}/reports-config`);
        setReportsConfig(response.data);
      } catch (error) {
        console.error("Error fatal: no se pudo cargar la configuración de reportes.", error);
        alert("No se pudo conectar con el servidor para cargar los reportes disponibles.");
      } finally {
        setIsConfigLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const reportData = useMemo(() => {
    if (!reportsConfig) return {}; // Si no hay config, devuelve un objeto vacío

    const groupedData = {};
    // Iteramos sobre la configuración recibida del backend
    for (const key in reportsConfig) {
      const report = { ...reportsConfig[key], key }; // Añadimos la key única al objeto del reporte
      const category = report.categoria;
      if (!groupedData[category]) {
        groupedData[category] = [];
      }
      groupedData[category].push(report);
    }
    return groupedData;
  }, [reportsConfig]);

  useEffect(() => {
    // Esta función se llamará solo cuando entremos a la vista de análisis
    const fetchSessionState = async () => {
        if (appState === 'analysis' && sessionId) {
            try {
                console.log("Obteniendo estado de la sesión...");
                const response = await axios.get(`${API_URL}/session-state`, {
                    headers: { 'X-Session-ID': sessionId }
                });
                
                const { credits, history } = response.data;
                setCredits(credits || { used: 0, remaining: 20 });
                setCreditHistory(history || []);
                console.log("Estado de la sesión cargado:", response.data);

            } catch (error) {
                console.error("Error al recuperar el estado de la sesión:", error);
                alert("No se pudo recuperar tu sesión. Es posible que haya expirado. Refresca la página para iniciar una nueva.");
                // Podrías redirigir al landing page si la sesión no se encuentra
                // setAppState('landing'); 
            }
        }
    };

    fetchSessionState();
  }, [appState, sessionId]);

  // 2. Carga los espacios de trabajo cuando el usuario se autentica
  useEffect(() => {
      if (authToken) {
          fetchWorkspaces(authToken);
      }
  }, [authToken, fetchWorkspaces]);

  // --- MODIFICACIÓN 3: Invalidar caché al cerrar modal ---
  // (usando useCallback para handleEsc si se añade como dependencia)
  const handleEsc = useCallback((event) => {
    if (event.key === "Escape") {
      setShowModal(false);
      // La limpieza del caché se centraliza en el useEffect de showModal
    }
  }, []); // No depende de nada que cambie

  useEffect(() => {
    // Al cargar la aplicación, nos aseguramos de que el ID de sesión exista o se cree.
    getSessionId();
  }, []);

  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = 'hidden';
      window.addEventListener("keydown", handleEsc);
    } else {
      document.body.style.overflow = 'auto';
      console.log("Modal cerrado, limpiando caché de respuesta.");
      setCachedResponse({ key: null, blob: null }); // Limpiar caché aquí
      setIsLoading(false); // Resetear estado de carga
    }
    return () => {
      window.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = 'auto';
    };
  }, [showModal, handleEsc]); // handleEsc es ahora una dependencia estable

  // --- EFECTO ÚNICO Y CENTRALIZADO PARA GESTIONAR EL CACHÉ ---
  // 1. Efecto para validar el caché cada vez que algo relevante cambia
  useEffect(() => {
      // Si no hay reporte seleccionado o faltan archivos, no puede haber caché válido.
      if (!selectedReport || !uploadedFileIds.ventas || !uploadedFileIds.inventario) {
        setIsCacheValid(false);
        return;
      }

      // Generamos la clave "definitiva" para el estado actual de la solicitud
      const currentKey = `${selectedReport.endpoint}-${uploadedFileIds.ventas}-${uploadedFileIds.inventario}-${JSON.stringify(modalParams)}`;
      
      // Comparamos y actualizamos el estado de validez
      setIsCacheValid(cachedResponse.key === currentKey);

  }, [modalParams, cachedResponse.key, selectedReport, uploadedFileIds]);

  // --- USE EFFECT PARA LIMPIAR EL CACHÉ ---
  // Limpiamos el caché cuando el modal se cierra para asegurar una nueva petición la próxima vez
  useEffect(() => {
      if (!showModal) {
          console.log("Modal cerrado, limpiando caché.");
          setCachedResponse({ key: null, blob: null });
          setAnalysisResult(null)
      }
  }, [showModal]);

  if (isConfigLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-900 text-white">
        <p>Cargando configuración de Ferretero.IA...</p>
      </div>
    );
  }

  return (
    <>
    <div className={`min-h-screen bg-gradient-to-b from-neutral-900 via-background to-gray-900
          flex flex-col items-center justify-center px-4 sm:px-8 md:px-12 lg:px-20
          ${showModal ? 'overflow-hidden h-screen' : ''}`}>
    {appState === 'landing' && <LandingView onStartSession={handleStartSession} />}
      
    {appState === 'onboarding' && <OnboardingModal onSubmit={handleOnboardingSubmit} onCancel={handleCancelOnboarding} isLoading={isLoading} />}

    {appState === 'analysis' && (
      <>
        <div>
          {/* --- ENCABEZADO AÑADIDO --- */}
          <header className="flex flex-col items-center justify-between gap-4 py-4 text-white w-full max-w-7xl mx-auto border-b border-gray-700">
            <div className='text-center'>
              <h1 className="text-3xl md:text-5xl font-bold text-white">
                  Sesión de <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(to right, #560bad, #7209b7, #b5179e)' }}>Ferretero.IA</span>
              </h1>
              {sessionId && (
                   <p className="mt-1 text-xs md:text-md text-gray-400 font-mono">
                      ID de Sesión Anónima: <br/>{sessionId}
                   </p>
              )}
            </div>

            {/* Contenedor de Botones de Acción */}
            <div className="flex max-w-sm items-stretch justify-center gap-3 w-full sm:w-auto">
              <div className="flex items-center gap-4">
                    {authToken ? (
                        <button onClick={handleLogout} className="...">Desconectar</button>
                    ) : (
                      <>
                        <button onClick={handleGoToLogin} className="...">Iniciar Sesión</button>
                        <button onClick={handleGoToRegister} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold bg-purple-600 text-white hover:bg-purple-500 rounded-lg transition-colors">
                            <FiLock /> 
                            <span className="inline">Registrarse</span>
                        </button>
                      </>
                    )}
                    {/* El resto de tus botones */}
                </div>
            </div>
            <div className="flex max-w-sm items-stretch justify-between gap-3 w-full sm:w-auto">
                <WorkspaceSelector
                    workspaces={workspaces}
                    activeWorkspace={activeWorkspace}
                    onWorkspaceChange={setActiveWorkspace}
                    onCreateNew={() => { /* Lógica para abrir un modal de creación */ }}
                />
                <button 
                    onClick={() => setStrategyPanelOpen(true)} 
                    // 2. Se añade flex-1 y justify-center a ambos botones
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold bg-gray-700 hover:bg-purple-700 rounded-lg transition-colors"
                >
                    <FiSettings />
                    {/* Mantenemos la lógica responsiva para el texto */}
                    <span className="inline">Mi Estrategia</span>
                </button>
            </div>

            {/* Panel de Créditos y Botón de Estrategia */}
            <div className="flex items-center gap-6 w-full">
              <CreditsPanel 
                used={credits.used} 
                remaining={credits.remaining}
                onHistoryClick={() => setIsHistoryModalOpen(true)}
              />
            </div>
          </header>
          {/* --- USO DEL NUEVO COMPONENTE REUTILIZABLE --- */}
          <div className='mt-10 w-full max-w-5xl grid text-white md:grid-cols-2 px-2 mx-auto'>
            <CsvImporterComponent 
              fileType="ventas"
              title="Historial de Ventas"
              template={templateVentas}
              onFileProcessed={handleFileProcessed}
              uploadStatus={uploadStatus.ventas}
            />
            <CsvImporterComponent 
              fileType="inventario"
              title="Stock Actual"
              template={templateStock}
              onFileProcessed={handleFileProcessed}
              uploadStatus={uploadStatus.inventario}
            />
          </div>
          {filesReady ? (
            <div className="w-full max-w-4xl space-y-8 px-4 mb-4 mt-10">
              {Object.entries(reportData).map(([categoria, reportes]) => (
                <div key={categoria} className="mb-6">
                  <h3 className="text-white text-xl font-semibold mb-4 border-b border-purple-400 pb-2 mt-6">
                    {categoria}
                  </h3>
                  <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {reportes.map((reportItem) => (
                      <button
                        key={reportItem.label}
                        onClick={() => handleReportView(reportItem)}
                        className={`relative w-full text-left p-4 rounded-lg shadow-md transition-all duration-200 ease-in-out transform hover:scale-105 group
                          ${reportItem.isPro 
                            ? 'bg-gray-700 text-gray-400 hover:bg-gray-600 border border-purple-800' // Estilo Pro
                            : 'bg-white bg-opacity-90 text-black hover:bg-purple-100' // Estilo Básico
                          }`
                        }
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-sm">{reportItem.label}</span>
                          {reportItem.isPro && <FiLock className="text-yellow-500" />}
                        </div>
                        {reportItem.isPro && (
                          <p className="text-xs text-purple-400 mt-1">Función Avanzada</p>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-10 text-base text-white p-4 bg-gray-800 rounded-md shadow">
              📂 Carga tus archivos y activa la inteligencia comercial de tu ferretería.
            </p>
          )}
          <div className="flex items-stretch justify-center gap-3 w-full sm:w-auto">
            <a href="https://web.ferreteros.app" target="_blank" className="max-w-[200px] mt-4 mb-10 opacity-15 hover:opacity-25 text-white text-sm">Ferretero.IA por<br/><img src="ferreteros-app-white.png"/></a>
          </div>
        </div>
         
        {showModal && selectedReport && (
          <div className="w-full h-full fixed z-50 inset-0 flex items-end justify-center mb-10 overflow-y-auto">
            <div className="w-full h-full bg-white absolute top-0 flex flex-col">
              <div className="p-4 border-b bg-white z-10 shadow text-center sticky top-0">
                <h2 className="text-xl font-bold text-gray-800 ">
                  {selectedReport.label}
                </h2>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto">
                {/* Renderizado Condicional: Muestra parámetros O resultados */}
                {!analysisResult ? (
                  <div className="flex-1 min-h-0 gap-4 p-4">
                    {(selectedReport.basic_parameters?.length > 0 || selectedReport.advanced_parameters?.length > 0) && (
                        <div className="p-4 border-2 rounded-md shadow-md bg-gray-50">
                          <h3 className="text-lg font-semibold text-gray-700 mb-4">Parámetros del Reporte</h3>
                          
                          {/* --- RENDERIZADO DE PARÁMETROS BÁSICOS --- */}
                          {selectedReport.basic_parameters?.map((param) => {
                            // Lógica de renderizado para select y multi-select
                            if (param.type === 'select') {
                              return (
                                <div key={param.name} className="mb-4">
                                  <label htmlFor={param.name} className="block text-sm font-medium text-gray-600 mb-1">{param.label}:</label>
                                  <select
                                    id={param.name}
                                    name={param.name}
                                    value={modalParams[param.name] || ''}
                                    onChange={e => handleParamChange(param.name, e.target.value)}
                                    className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                                  >
                                    {param.options?.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                                  </select>
                                </div>
                              );
                            }
                            if (param.type === 'multi-select') {
                              const options = availableFilters[param.optionsKey]?.map(opt => ({ value: opt, label: opt })) || [];
                              const value = (modalParams[param.name] || []).map(val => ({ value: val, label: val }));
                              return (
                                <div key={param.name} className="mb-4">
                                  <label className="block text-sm font-medium text-gray-600 mb-1">{param.label}:</label>
                                  <Select
                                    isMulti
                                    name={param.name}
                                    options={options}
                                    className="mt-1 block w-full basic-multi-select"
                                    classNamePrefix="select"
                                    value={value}
                                    isLoading={isLoadingFilters}
                                    placeholder={isLoadingFilters ? "Cargando filtros..." : "Selecciona uno o más..."}
                                    onChange={(selectedOptions) => {
                                      const values = selectedOptions ? selectedOptions.map(opt => opt.value) : [];
                                      handleParamChange(param.name, values);
                                    }}
                                  />
                                </div>
                              );
                            }
                            return null;
                          })}

                          {/* --- SECCIÓN AVANZADA PLEGABLE --- */}
                          {selectedReport.advanced_parameters && selectedReport.advanced_parameters.length > 0 && (
                            <div className="mt-6 pt-4 border-t border-gray-200">
                              <button onClick={() => setShowAdvanced(!showAdvanced)} className="text-sm font-semibold text-purple-600 hover:text-purple-800 flex items-center">
                                {showAdvanced ? 'Ocultar' : 'Mostrar'} Opciones Avanzadas
                                {/* Icono de flecha que rota (opcional, pero mejora la UX) */}
                                <svg className={`w-4 h-4 ml-1 transition-transform transform ${showAdvanced ? 'rotate-180' : 'rotate-0'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                              </button>
                              
                              {showAdvanced && (
                                <>
                                  <div className="grid sm:grid-cols-1 md:grid-cols-2 gap-x-4 mt-2">
                                    {/* --- RENDERIZADO DE PARÁMETROS AVANZADOS --- */}
                                    {selectedReport.advanced_parameters.map(param => {
                                      if (param.type === 'boolean_select') {
                                        return (
                                          <div key={param.name} className="mb-4">
                                            <label htmlFor={param.name} className="block text-sm font-medium text-gray-600 mb-1">{param.label}:</label>
                                            <select
                                              id={param.name}
                                              name={param.name}
                                              value={modalParams[param.name] || ''}
                                              onChange={e => handleParamChange(param.name, e.target.value)}
                                              className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                                            >
                                              {param.options?.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                                            </select>
                                          </div>
                                        );
                                      }
                                      if (param.type === 'number') {
                                        return (
                                          <div key={param.name} className="mb-4">
                                            <label htmlFor={param.name} className="block text-sm font-medium text-gray-600 mb-1">{param.label}:</label>
                                            <input
                                              type="number"
                                              id={param.name}
                                              name={param.name}
                                              value={modalParams[param.name] || ''}
                                              onChange={e => handleParamChange(param.name, e.target.value === '' ? '' : parseFloat(e.target.value))}
                                              min={param.min}
                                              max={param.max}
                                              step={param.step}
                                              className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                                            />
                                          </div>
                                        );
                                      }
                                      return null;
                                    })}
                                  </div>
                                  {/* --- BOTÓN DE RESET PARA PARÁMETROS AVANZADOS --- */}
                                  <button onClick={handleResetAdvanced} className="w-full text-xs font-semibold text-gray-500 hover:text-red-600 mt-2 transition-colors flex items-center justify-center gap-1">
                                    <FiRefreshCw className="text-md"/> Restaurar valores por defecto
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                    )}
                  </div>
                ) : (
                  // VISTA DE RESULTADOS: Botones de descarga y para volver
                  <div className="space-y-3">
                    <div className="flex gap-4">
                        <button onClick={() => handleDownloadExcel('accionable')} className="flex-1 bg-gray-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-gray-700">
                            📋 Descargar Accionable
                        </button>
                        <button onClick={() => handleDownloadExcel('detallado')} className="flex-1 bg-purple-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-purple-700">
                            📊 Descargar Detallado
                        </button>
                    </div>
                    <button onClick={() => setAnalysisResult(null)} className="text-sm text-gray-600 hover:text-black">
                        ‹ Volver a Parámetros
                    </button>
                  </div>
                // <div
                //   className="w-full max-w-full overflow-x-auto text-gray-700 space-y-2 mt-1 text-left text-sm"
                //   dangerouslySetInnerHTML={{ __html: insightHtml }}
                // >
                // </div>
                )}
              </div>
              <div className="p-4 w-full border-t bg-gray-50 z-10 shadow text-center sticky bottom-0">
                <button
                    onClick={handleGenerateAnalysis}
                    // La condición disabled ahora solo depende de si los archivos están listos o si está cargando
                    disabled={!filesReady || isLoading}
                    className={`border px-6 py-3 rounded-lg font-semibold w-full transition-all duration-300 ease-in-out flex items-center justify-center gap-2
                        ${
                            // Lógica de estilos condicional
                            isLoading ? 'bg-gray-200 text-gray-500 cursor-wait' :
                            !filesReady ? 'bg-gray-200 text-gray-400 cursor-not-allowed' :
                            isCacheValid ? 'bg-green-100 border-green-600 text-green-800 hover:bg-green-200' : 'text-transparent border-purple-700'
                        }`
                    }
                    style={!isLoading && !isCacheValid ? {
                      backgroundImage: 'linear-gradient(to right, #560bad, #7209b7, #b5179e)',
                      backgroundClip: 'text',
                    } : {}}
                >
                    {/* Lógica para renderizar el contenido del botón */}
                    {isLoading ? (
                        <>
                            <FiLoader className="animate-spin h-5 w-5" />
                            <span>Generando...</span>
                        </>
                    ) : isCacheValid ? (
                        <>
                            <FiDownload className="font-bold text-xl"/>
                            <span>Descargar Reporte (en caché)</span>
                        </>
                    ) : (
                        <>
                            <span className="text-black font-bold text-lg">🚀</span>
                            {/* El texto cambia si ya existe una caché pero es obsoleta */}
                            <span>{cachedResponse.key ? 'Volver a Ejecutar con Nuevos Parámetros' : 'Ejecutar Análisis'}</span>
                        </>
                    )}
                </button>
                <button
                    onClick={() => setShowModal(false)}
                    className="mt-2 w-full text-white text-xl px-4 py-2 font-bold rounded-lg hover:text-gray-100"
                    disabled={isLoading}
                    style={{
                      backgroundImage: 'linear-gradient(to right, #560bad, #7209b7, #b5179e)',
                    }}
                >
                    Cerrar
                </button>
              </div>
            </div>
          </div>
        )}



 
        {/* Renderiza el modal de conversión si el estado es true */}
        {showConversionModal && (
          <ConversionModal
            onClose={() => setShowConversionModal(false)}
            onRegister={handleRegisterClick}
            onNewSession={handleNewSessionClick}
          />
        )}

        {showProModal && proReportClicked && (
          <ProOfferModal
            reportName={proReportClicked.label}
            onClose={() => setShowProModal(false)}
            onRegister={() => alert("Redirigiendo a la página de registro...")}
          />
        )}

      </>
    )}

    {appState === 'login' && (
      <LoginPage 
        onLoginSuccess={handleLoginSuccess}
        onSwitchToRegister={handleGoToRegister}
        onBackToLanding={() => setAppState('analysis')}
      />
    )}

    {/*{appState === 'registering' && <RegisterPage onBackToLanding={() => setAppState('analysis')} />}*/}

    {appState === 'registering' && (
        <RegisterPage 
            // Pasamos las props que el componente necesita
            sessionId={sessionId}
            // onboardingData={onboardingData} // Asumiendo que guardas esto en el estado
            onRegisterSuccess={handleRegisterSuccess}
            onSwitchToLogin={() => setAppState('login')}
            onBackToLanding={() => setAppState('analysis')}
        />
    )}

    {/* Renderiza el modal de créditos insuficientes si está activo */}
    {showCreditsModal && (
      <InsufficientCreditsModal
        required={creditsInfo.required}
        remaining={creditsInfo.remaining}
        onClose={() => setShowCreditsModal(false)}
        onRegister={() => {
            setShowCreditsModal(false);
            handleGoToRegister(); // Reutilizamos la función que te lleva a la vista de registro
        }}
        onNewSession={() => window.location.reload()}
      />
    )}

    {showProModal && proReportClicked && (
      <ProOfferModal
        reportName={proReportClicked.label}
        onClose={() => setShowProModal(false)}
        onRegister={handleGoToRegister} // <-- ¡CAMBIO CLAVE AQUÍ!
      />
    )}

    {/* Renderiza el modal de estrategia si el estado es true */}
    {isStrategyPanelOpen && (
      <StrategyPanelModal 
        sessionId={sessionId} 
        onClose={() => setStrategyPanelOpen(false)} 
      />
    )}
    {/* Renderiza el modal del historial si está abierto */}
    {isHistoryModalOpen && <CreditHistoryModal history={creditHistory} reportData={reportData} onClose={() => setIsHistoryModalOpen(false)} />}

    </div>
    </>
  );
}

// export default LandingPage;
