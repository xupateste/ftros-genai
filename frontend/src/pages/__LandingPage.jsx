import { useState, useEffect, useCallback } from 'react'; // useCallback añadido
import { useNavigate, Link } from 'react-router-dom';
import '../index.css';
import { FiDownload, FiSend, FiRefreshCw, FiLock, FiBarChart2, FiChevronsRight, FiX} from 'react-icons/fi'

import axios from 'axios';
import Select from 'react-select';
import CsvDropZone from '../assets/CsvDropZone';
import CsvDropZone2 from '../assets/CsvDropZone2';
import { v4 as uuidv4 } from 'uuid';

import { getSessionId } from '../utils/sessionManager'; // Ajusta la ruta


const API_URL = import.meta.env.VITE_API_URL;

const ADVANCED_PARAMS_STORAGE_KEY = 'ferreteroApp_advancedParams';

// (diccionarioData y reportData permanecen igual que en tu última versión)
const diccionarioData = {
  'Análisis ABC de Productos ✓': `<table class="max-w-full border-collapse table-auto mb-10 text-xs"><thead><tr class="bg-gray-100"><th class="border border-gray-300 px-4 py-2 text-center">SKU /<br>Código de producto</th><th class="border border-gray-300 px-4 py-2 text-center">Nombre del<br>producto</th><th class="border border-gray-300 px-4 py-2 text-center">Categoría</th><th class="border border-gray-300 px-4 py-2 text-center">Subcategoría</th><th class="border border-gray-300 px-4 py-2 text-center">Valor<br>Ponderado<br>(ABC)</th><th class="border border-gray-300 px-4 py-2 text-center">Venta<br>Total<br>(S/.)</th><th class="border border-gray-300 px-4 py-2 text-center">Cantidad<br>Vendida (Und)</th><th class="border border-gray-300 px-4 py-2 text-center">Margen Total<br>(S/.)</th><th class="border border-gray-300 px-4 py-2 text-center">% Participación</th><th class="border border-gray-300 px-4 py-2 text-center">% Acumulado</th><th class="border border-gray-300 px-4 py-2 text-center">Clasificación<br>ABC</th></tr></thead><tbody><tr><td class="border border-gray-300 px-4 py-2 text-center">1234</td><td class="border border-gray-300 px-4 py-2 text-center">MARTILLO CURVO 16OZ TRUPER</td><td class="border border-gray-300 px-4 py-2 text-center">HERRAMIENTAS</td><td class="border border-gray-300 px-4 py-2 text-center">MARTILLOS</td><td class="border border-gray-300 px-4 py-2 text-center">0.82</td><td class="border border-gray-300 px-4 py-2 text-center">504</td><td class="border border-gray-300 px-4 py-2 text-center">24</td><td class="border border-gray-300 px-4 py-2 text-center">159</td><td class="border border-gray-300 px-4 py-2 text-center">0.42</td><td class="border border-gray-300 px-4 py-2 text-center">24.04</td><td class="border border-gray-300 px-4 py-2 text-center">A</td></tr></tbody></table>`,
  // 'Análisis Rotación de Productos ✓': `<table class="max-w-full border-collapse table-auto mb-10 text-xs"><thead><tr class="bg-gray-100"><th class="border w-80 border-gray-300 px-4 py-2 text-center">SKU / Código de producto</th><th class="border border-gray-300 px-4 py-2 text-center">Nombre delproducto</th><th class="border border-gray-300 px-4 py-2 text-center">Categoría</th><th class="border border-gray-300 px-4 py-2 text-center">Subcategoría</th><th class="border border-gray-300 px-4 py-2 text-center">Rol del producto</th><th class="border border-gray-300 px-4 py-2 text-center">Rol de categoría</th><th class="border border-gray-300 px-4 py-2 text-center">Marca</th><th class="border border-gray-300 px-4 py-2 text-center">Precio de compra actual (S/.)</th><th class="border border-gray-300 px-4 py-2 text-center">Stock Actual (Unds)</th><th class="border border-gray-300 px-4 py-2 text-center">Valor stock (S/.)</th><th class="border border-gray-300 px-4 py-2 text-center">Ventas totales (Unds)</th><th class="border border-gray-300 px-4 py-2 text-center">Ventas últimos 6m (Unds)</th><th class="border border-gray-300 px-4 py-2 text-center">Última venta</th><th class="border border-gray-300 px-4 py-2 text-center">Días sin venta</th><th class="border border-gray-300 px-4 py-2 text-center">Días para Agotar Stock (Est.6m)</th><th class="border border-gray-300 px-4 py-2 text-center">Clasificación Diagnóstica</th><th class="border border-gray-300 px-4 py-2 text-center">Prioridad y Acción (DAS 6m)</th></tr></thead><tbody><tr><td class="border border-gray-300 px-4 py-2 text-center">1234</td><td class="border border-gray-300 px-4 py-2 text-center">MARTILLO CURVO 16OZ TRUPER</td><td class="border border-gray-300 px-4 py-2 text-center">HERRAMIENTAS</td><td class="border border-gray-300 px-4 py-2 text-center">MARTILLOS</td><td class="border border-gray-300 px-4 py-2 text-center">0.82</td><td class="border border-gray-300 px-4 py-2 text-center">504</td><td class="border border-gray-300 px-4 py-2 text-center">24</td><td class="border border-gray-300 px-4 py-2 text-center">159</td><td class="border border-gray-300 px-4 py-2 text-center">0.42</td><td class="border border-gray-300 px-4 py-2 text-center">24.04</td><td class="border border-gray-300 px-4 py-2 text-center">A</td><td class="border border-gray-300 px-4 py-2 text-center">A</td><td class="border border-gray-300 px-4 py-2 text-center">A</td><td class="border border-gray-300 px-4 py-2 text-center">A</td><td class="border border-gray-300 px-4 py-2 text-center">A</td><td class="border border-gray-300 px-4 py-2 text-center">A</td><td class="border border-gray-300 px-4 py-2 text-center">A</td></tr></tbody></table>`,
  'Análisis Estratégico de Rotación ✓': `<div class="p-4 max-w-7xl mx-auto font-sans text-gray-800 space-y-8"><div><h3 class="text-xl font-semibold">📌 Ejemplo del resultado</h3><div class="overflow-x-auto rounded-lg border border-gray-300"><table class="min-w-full text-sm text-left text-gray-700"><thead class="bg-gray-100 text-xs uppercase text-gray-500"><tr><th class="px-4 py-3">SKU</th><th class="px-4 py-3">Producto</th><th class="px-4 py-3">Categoría</th><th class="px-4 py-3">Marca</th><th class="px-4 py-3">Stock Actual</th><th class="px-4 py-3">Precio Compra (S/.)</th><th class="px-4 py-3">Inversión Stock</th><th class="px-4 py-3">Ventas (30d)</th><th class="px-4 py-3">Cobertura (días)</th><th class="px-4 py-3">Alerta</th><th class="px-4 py-3">Importancia</th><th class="px-4 py-3">Clasificación</th></tr></thead><tbody class="bg-white"><tr class="border-t"><td class="px-4 py-2">12345</td><td class="px-4 py-2">Cable N°12 Vulcano</td><td class="px-4 py-2">Eléctricos</td><td class="px-4 py-2">Vulcano</td><td class="px-4 py-2">24</td><td class="px-4 py-2">1.80</td><td class="px-4 py-2">43.20</td><td class="px-4 py-2">12</td><td class="px-4 py-2">60.0</td><td class="px-4 py-2">Saludable</td><td class="px-4 py-2">0.842</td><td class="px-4 py-2">Clase A (Crítico)</td></tr></tbody></table></div></div><div><h3 class="text-xl font-semibold">📂 Descripción de columnas</h3><div class="overflow-x-auto"><table class="min-w-full text-sm text-left border border-gray-300"><thead class="bg-gray-100 text-gray-600 text-xs uppercase"><tr><th class="px-4 py-2">Columna</th><th class="px-4 py-2">Descripción</th><th class="px-4 py-2">Uso estratégico</th></tr></thead><tbody class="bg-white"><tr class="border-t"><td class="px-4 py-2 font-medium">SKU / Producto</td><td class="px-4 py-2">Identificador y nombre del producto</td><td class="px-4 py-2">Permite accionar decisiones específicas</td></tr><tr class="border-t"><td class="px-4 py-2 font-medium">Categoría / Marca</td><td class="px-4 py-2">Clasificación comercial y proveedor</td><td class="px-4 py-2">Segmentar por rubros o acuerdos</td></tr><tr class="border-t"><td class="px-4 py-2 font-medium">Stock Actual</td><td class="px-4 py-2">Unidades disponibles en inventario</td><td class="px-4 py-2">Identificar quiebres o excesos</td></tr><tr class="border-t"><td class="px-4 py-2 font-medium">Precio Compra (S/.)</td><td class="px-4 py-2">Costo por unidad</td><td class="px-4 py-2">Cálculo de inversión y rentabilidad</td></tr><tr class="border-t"><td class="px-4 py-2 font-medium">Inversión Stock</td><td class="px-4 py-2">Stock x Precio Compra</td><td class="px-4 py-2">Visualizar capital inmovilizado</td></tr><tr class="border-t"><td class="px-4 py-2 font-medium">Ventas (30d)</td><td class="px-4 py-2">Unidades vendidas en últimos 30 días</td><td class="px-4 py-2">Detectar rotación reciente</td></tr><tr class="border-t"><td class="px-4 py-2 font-medium">Cobertura (días)</td><td class="px-4 py-2">Días estimados de duración del stock</td><td class="px-4 py-2">Anticipar faltantes o sobre-stocks</td></tr><tr class="border-t"><td class="px-4 py-2 font-medium">Alerta</td><td class="px-4 py-2">Diagnóstico automático del stock</td><td class="px-4 py-2">Facilita decisiones inmediatas</td></tr><tr class="border-t"><td class="px-4 py-2 font-medium">Importancia</td><td class="px-4 py-2">Puntaje basado en ventas, margen e ingresos</td><td class="px-4 py-2">Priorizar productos clave</td></tr><tr class="border-t"><td class="px-4 py-2 font-medium">Clasificación</td><td class="px-4 py-2">Etiqueta ABC según la importancia</td><td class="px-4 py-2">Determinar foco comercial o estratégico</td></tr></tbody></table></div></div><div><h3 class="text-xl font-semibold">🧠 ¿Cómo usarlo estratégicamente?</h3><ul class="list-disc list-inside space-y-4"><li>🔍<strong class="mx-2 font-semibold text-gray-900 dark:text-white">Detecta productos con bajo movimiento:</strong>Filtra por<code class="px-2 mx-2 py-0.5 bg-gray-100 text-pink-600 font-mono text-sm rounded dark:bg-gray-800 dark:text-pink-400">min_importancia=0.0</code>y<code class="px-2 mx-2 py-0.5 bg-gray-100 text-pink-600 font-mono text-sm rounded dark:bg-gray-800 dark:text-pink-400">max_dias_cobertura=9999</code>.</li><li>📈<strong class="mx-2 font-semibold text-gray-900 dark:text-white">Prioriza productos de alto valor:</strong>Ordena por<code class="px-2 mx-2 py-0.5 bg-gray-100 text-pink-600 font-mono text-sm rounded dark:bg-gray-800 dark:text-pink-400">sort_by='Importancia_Dinamica'</code>y filtra por<code class="px-2 mx-2 py-0.5 bg-gray-100 text-pink-600 font-mono text-sm rounded dark:bg-gray-800 dark:text-pink-400">min_importancia=0.7</code>.</li><li>🚨<strong class="mx-2 font-semibold text-gray-900 dark:text-white">Atiende quiebres de stock:</strong>Filtra por<code class="px-2 mx-2 py-0.5 bg-gray-100 text-pink-600 font-mono text-sm rounded dark:bg-gray-800 dark:text-pink-400">Alerta_Stock = 'Agotado'</code>o cobertura &lt; 15 días.</li><li>💰<strong class="mx-2 font-semibold text-gray-900 dark:text-white">Reduce sobre-stock:</strong>Filtra por<code class="px-2 mx-2 py-0.5 bg-gray-100 text-pink-600 font-mono text-sm rounded dark:bg-gray-800 dark:text-pink-400">Alerta_Stock = 'Sobre-stock'</code>y<code class="px-2 mx-2 py-0.5 bg-gray-100 text-pink-600 font-mono text-sm rounded dark:bg-gray-800 dark:text-pink-400">Importancia &lt; 0.4</code>.</li><li>📦<strong class="mx-2 font-semibold text-gray-900 dark:text-white">Optimiza por categoría o marca:</strong>Usa<code class="px-2 mx-2 py-0.5 bg-gray-100 text-pink-600 font-mono text-sm rounded dark:bg-gray-800 dark:text-pink-400">filtro_categorias</code>o<code class="px-2 mx-2 py-0.5 bg-gray-100 text-pink-600 font-mono text-sm rounded dark:bg-gray-800 dark:text-pink-400">filtro_marcas</code>según tu enfoque.</li></ul></div></div>`,
  'Diagnóstico de Stock Muerto ✓': `done`,
  'Puntos de Alerta de Stock ✓' : 'done',
  'Lista básica de reposición según histórico ✓' : 'dancer2'
};
const reportData = {
  "🧠 Diagnósticos generales": [
    {
      label: 'Análisis ABC de Productos ✓',
      endpoint: '/abc',
      insights: [],
      basic_parameters: [
        { name: 'periodo_abc', label: 'Período de Análisis ABC', type: 'select',
          options: [
            { value: '12', label: 'Últimos 12 meses' },
            { value: '6', label: 'Últimos 6 meses' },
            { value: '3', label: 'Últimos 3 meses' },
            { value: '0', label: 'Todo' }
          ],
          defaultValue: '6'
        },
        { name: 'criterio_abc', label: 'Criterio Principal ABC', type: 'select',
          options: [
            { value: 'combinado', label: 'Combinado o Ponderado' },
            { value: 'ingresos', label: 'Por Ingresos' },
            { value: 'unidades', label: 'Por Cantidad Vendida' },
            { value: 'margen', label: 'Por Margen' }
          ],
          defaultValue: 'combinado'
        }
      ]
    },
    { label: 'Diagnóstico de Stock Muerto ✓', endpoint: '/diagnostico-stock-muerto', insights: [],
      basic_parameters: []
    },
    {
      "label": "⭐ Reporte Maestro de Inventario (Recomendado)",
      "endpoint": "/reporte-maestro-inventario",
      "insights": [
        "Este es el reporte más completo. Combina la importancia de tus productos (Análisis ABC) con su salud de rotación (Stock Muerto) para crear un plan de acción 100% priorizado.",
        "Te dice exactamente en qué productos debes enfocar tu atención, dinero y esfuerzo AHORA MISMO."
      ],
      "basic_parameters": [
        {
          "name": "criterio_abc",
          "label": "Criterio de Importancia (ABC)",
          "type": "select",
          "options": [
            { "value": "margen", "label": "Por Margen de Ganancia (Recomendado)" },
            { "value": "ingresos", "label": "Por Ingresos Totales" },
            { "value": "unidades", "label": "Por Unidades Vendidas" },
            { "value": "combinado", "label": "Ponderado Personalizado (Avanzado)" }
          ],
          "defaultValue": "margen"
        },
        {
          "name": "periodo_abc",
          "label": "Período de Análisis de Importancia",
          "type": "select",
          "options": [
              { "value": "3", "label": "Últimos 3 meses" },
              { "value": "6", "label": "Últimos 6 meses" },
              { "value": "12", "label": "Últimos 12 meses" },
              { "value": "0", "label": "Historial completo" }
          ],
          "defaultValue": "6"
        }
      ],
      "advanced_parameters": [
        {
          "name": "dias_sin_venta_muerto",
          "label": "Umbral de Días para 'Stock Muerto'",
          "type": "number",
          "placeholder": "Default: dinámico",
          "defaultValue": "",
          "min": 30
        },
        {
          "name": "meses_analisis_salud",
          "label": "Período para Cálculo de Salud (meses)",
          "type": "number",
          "placeholder": "Default: dinámico",
          "defaultValue": "",
          "min": 1
        },
        {
          "name": "peso_margen",
          "label": "Peso de Margen (0.0 a 1.0)",
          "type": "number",
          "defaultValue": 0.5,
          "min": 0, "max": 1, "step": 0.1
        },
        {
          "name": "peso_ingresos",
          "label": "Peso de Ingresos (0.0 a 1.0)",
          "type": "number",
          "defaultValue": 0.3,
          "min": 0, "max": 1, "step": 0.1
        },
        {
          "name": "peso_unidades",
          "label": "Peso de Unidades (0.0 a 1.0)",
          "type": "number",
          "defaultValue": 0.2,
          "min": 0, "max": 1, "step": 0.1
        }
      ]
    },
    {
      label: 'Análisis Estratégico de Rotación ✓',
      endpoint: '/rotacion-general-estrategico',
      insights: diccionarioData['Análisis Estratégico de Rotación ✓'],
      basic_parameters: [
        { name: 'sort_by', label: 'Ordenar Reporte Por', type: 'select',
          options: [
            { value: 'Importancia_Dinamica', label: 'Índice de Importancia (Recomendado)' },
            { value: 'Inversion_Stock_Actual', label: 'Mayor Inversión en Stock' },
            { value: 'Dias_Cobertura_Stock_Actual', label: 'Próximos a Agotarse (Cobertura)' },
            { value: 'Ventas_Total_Reciente', label: 'Más Vendidos (Unidades Recientes)' },
            { value: 'Clasificacion', label: 'Clasificación (A, B, C, D)' },
          ],
          defaultValue: 'Importancia_Dinamica'
        },
        { name: 'filtro_categorias_json', label: 'Filtrar por Categorías', type: 'multi-select', optionsKey: 'categorias', defaultValue: [] },
        { name: 'filtro_marcas_json', label: 'Filtrar por Marcas', type: 'multi-select', optionsKey: 'marcas', defaultValue: [] },
        { name: 'min_importancia', label: 'Mostrar solo con Importancia mayor a', type: 'number', defaultValue: '', min: 0, max: 1, step: 0.1, placeholder: 'Ej: 0.7' },
        { name: 'max_dias_cobertura', label: 'Mostrar solo con Cobertura menor a (días)', type: 'number', defaultValue: '', min: 0, placeholder: 'Ej: 15 (para ver bajo stock)' },
        { name: 'min_dias_cobertura', label: 'Mostrar solo con Cobertura mayor a (días)', type: 'number', defaultValue: '', min: 0, placeholder: 'Ej: 180 (para ver sobre-stock)' },
      ],
      advanced_parameters: [
        { name: 'dias_analisis_ventas_recientes', label: 'Período de Análisis Reciente (días)', type: 'number', defaultValue: 30, min: 15 },
        { name: 'dias_analisis_ventas_general', label: 'Período de Análisis General (días)', type: 'number', defaultValue: 180, min: 30 },
        // --- SECCIÓN DE PESOS CON LOS DEFAULTS CORREGIDOS ---
        {
            name: 'score_ventas',
            label: 'Importancia de Ventas (1-10)',
            type: 'number',
            defaultValue: 8, // Corresponde al 40%
            min: 1, max: 10
        },
        {
            name: 'score_ingreso',
            label: 'Importancia de Ingresos (1-10)',
            type: 'number',
            defaultValue: 6, // Corresponde al 30%
            min: 1, max: 10
        },
        {
            name: 'score_margen',
            label: 'Importancia de Margen (1-10)',
            type: 'number',
            defaultValue: 4, // Corresponde al 20%
            min: 1, max: 10
        },
        {
            name: 'score_dias_venta',
            label: 'Importancia de Frecuencia de Venta (1-10)',
            type: 'number',
            defaultValue: 2, // Corresponde al 10%
            min: 1, max: 10
        },
      ]
    },

  ],
  "📦 Reposición Inteligente y Sugerencias de Pedido": [
    { label: 'Puntos de Alerta de Stock ✓',
      endpoint: '/reporte-puntos-alerta-stock',
      insights: [],
      basic_parameters: [
        { name: 'lead_time_dias', label: 'El tiempo promedio de entrega del proveedor en días', type: 'select',
          options: [
            { value: '5', label: '5 días' },
            { value: '7', label: '7 días' },
            { value: '10', label: '10 días' },
            { value: '12', label: '12 días' },
            { value: '15', label: '15 días' }
          ],
          defaultValue: '7'
        },
        { name: 'dias_seguridad_base', label: 'Días adicionales de cobertura para stock de seguridad', type: 'select',
          options: [
            { value: '0', label: 'Ninguno' },
            { value: '1', label: '1 día adicional' },
            { value: '2', label: '2 días adicionales' },
            { value: '3', label: '3 días adicionales' }
          ],
          defaultValue: '0'
        }
      ]
    },
    {
      label: 'Lista básica de reposición según histórico ✓',
      endpoint: '/lista-basica-reposicion-historico',
      insights: [],
      basic_parameters: [
        { name: 'ordenar_por', label: 'Ordenar reporte por', type: 'select', 
          options: [
            { value: 'Importancia', label: 'Índice de Importancia (Recomendado)' },
            { value: 'Índice de Urgencia', label: 'Índice de Urgencia (Stock bajo + Importancia)' },
            { value: 'Inversion Requerida', label: 'Mayor Inversión Requerida' },
            { value: 'Cantidad a Comprar', label: 'Mayor Cantidad a Comprar' },
            { value: 'Margen Potencial', label: 'Mayor Margen Potencial de Ganancia' },
            { value: 'Próximos a Agotarse', label: 'Próximos a Agotarse (Cobertura)' },
            { value: 'rotacion', label: 'Mayor Rotación' },
            { value: 'Categoría', label: 'Categoría (A-Z)' }
          ],
          defaultValue: 'Índice de Urgencia' // Default explícito
        },
        { name: 'incluir_solo_categorias', label: 'Filtrar por Categorías', type: 'multi-select', optionsKey: 'categorias', defaultValue: [] },
        { name: 'incluir_solo_marcas', label: 'Filtrar por Marcas', type: 'multi-select', optionsKey: 'marcas', defaultValue: [] }
      ],
      advanced_parameters: [
        { name: 'dias_analisis_ventas_recientes', label: 'Período de Análisis Reciente (días)', type: 'number', defaultValue: 30, min: 15 },
        { name: 'dias_analisis_ventas_general', label: 'Período de Análisis General (días)', type: 'number', defaultValue: 180, min: 30 },
        { name: 'excluir_sin_ventas', label: '¿Excluir productos con CERO ventas?', type: 'boolean_select', 
          options: [
            { value: 'true', label: 'Sí, excluir (Recomendado)' },
            { value: 'false', label: 'No, incluirlos' }
          ],
          defaultValue: 'true'
        },
        { name: 'lead_time_dias', label: 'Tiempo de Entrega del Proveedor en Días', type: 'number', defaultValue: 7, min: 0 },
        { name: 'dias_cobertura_ideal_base', label: 'Días de Cobertura Ideal Base', type: 'number', defaultValue: 10, min: 3 },
        { name: 'peso_ventas_historicas', label: 'Peso Ventas Históricas (0.0-1.0)', type: 'number', defaultValue: 0.6, min: 0, max: 1, step: 0.1 },
        // --- SECCIÓN DE PESOS CON LOS DEFAULTS CORREGIDOS ---
        {
            name: 'score_ventas',
            label: 'Importancia de Ventas (1-10)',
            type: 'number',
            defaultValue: 8, // Corresponde al 40%
            min: 1, max: 10
        },
        {
            name: 'score_ingreso',
            label: 'Importancia de Ingresos (1-10)',
            type: 'number',
            defaultValue: 6, // Corresponde al 30%
            min: 1, max: 10
        },
        {
            name: 'score_margen',
            label: 'Importancia de Margen (1-10)',
            type: 'number',
            defaultValue: 4, // Corresponde al 20%
            min: 1, max: 10
        },
        {
            name: 'score_dias_venta',
            label: 'Importancia de Frecuencia de Venta (1-10)',
            type: 'number',
            defaultValue: 2, // Corresponde al 10%
            min: 1, max: 10
        }
      ]
    },
    { label: 'Lista sugerida para alcanzar monto mínimo', endpoint: '/rotacion', insights: [], basic_parameters: [] },
    { label: 'Pedido optimizado por marcas o líneas específicas', endpoint: '/rotacion', insights: [], basic_parameters: [] },
    { label: 'Reposición inteligente por categoría', endpoint: '/rotacion', insights: [], basic_parameters: [] },
    { label: 'Sugerencia combinada por zona', endpoint: '/rotacion', insights: [], basic_parameters: [] },
  ],
  "📊 Simulación y ROI de Compra": [
    { label: 'Simulación de ahorro en compra grupal', endpoint: '/sobrestock', insights: [], basic_parameters: [] },
    { label: 'Comparativa de precios actuales vs históricos', endpoint: '/sobrestock', insights: [], basic_parameters: [] },
    { label: 'Estimación de margen bruto por sugerencia', endpoint: '/sobrestock', insights: [], basic_parameters: [] },
    { label: 'Rentabilidad mensual por línea o proveedor', endpoint: '/sobrestock', insights: [], basic_parameters: [] },
  ],
  "🔄 Gestión de Inventario y Mermas": [
    { label: 'Revisión de productos a punto de vencer o sin rotar', endpoint: '/stock-critico', insights: [], basic_parameters: [] },
    { label: 'Listado de productos con alta rotación que necesitan reposición', endpoint: '/sobrestock', insights: [], basic_parameters: [] },
    { label: 'Sugerencia de promociones para liquidar productos lentos', endpoint: '/rotacion', insights: [], basic_parameters: [] },
  ]
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
  const [appState, setAppState] = useState('landing');
  const [sessionId, setSessionId] = useState(null);
  const [ventasFile, setVentasFile] = useState(null);
  const [inventarioFile, setInventarioFile] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [filesReady, setFilesReady] = useState(false);
  const [insightHtml, setInsightHtml] = useState('');
  const [parameterValues, setParameterValues] = useState({});
  
  const [modalParams, setModalParams] = useState({});

  // Estado para la persistencia: lee de localStorage al iniciar
  const [persistedAdvancedParams, setPersistedAdvancedParams] = useState(() => {
    try {
      const saved = localStorage.getItem(ADVANCED_PARAMS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.error("Error al leer de localStorage", error);
      return {};
    }
  });


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

  const handleReportView = (reportItem) => {
    setSelectedReport(reportItem);
    setInsightHtml(diccionarioData[reportItem.label] || "<p>No hay información disponible.</p>");
    const initialParams = {};

    // 1. Cargar defaults para parámetros BÁSICOS
    reportItem.basic_parameters?.forEach(param => {
      initialParams[param.name] = param.defaultValue;
    });

    // 2. Cargar defaults para parámetros AVANZADOS
    reportItem.advanced_parameters?.forEach(param => {
      initialParams[param.name] = param.defaultValue;
    });

    // 3. Sobrescribir con valores AVANZADOS guardados, si existen
    const savedReportParams = persistedAdvancedParams[reportItem.endpoint] || {};
    Object.assign(initialParams, savedReportParams);

    setModalParams(initialParams);
    setSelectedReport(reportItem);
    setShowAdvanced(false); // Siempre empieza con avanzados ocultos
    setShowModal(true);
  };

  // --- MANEJO DE CAMBIOS EN PARÁMETROS DEL MODAL ---
  const handleParamChange = (paramName, value) => {
    const newParams = { ...modalParams, [paramName]: value };
    setModalParams(newParams);

    // Si el parámetro es avanzado, actualiza también el estado de persistencia
    const isAdvanced = selectedReport.advanced_parameters.some(p => p.name === paramName);
    if (isAdvanced) {
      setPersistedAdvancedParams(prev => ({
        ...prev,
        [selectedReport.endpoint]: {
          ...(prev[selectedReport.endpoint] || {}),
          [paramName]: value
        }
      }));
    }
  };

  // --- LÓGICA PARA RESETEAR PARÁMETROS AVANZADOS ---
  const handleResetAdvanced = () => {
    const advancedDefaults = {};
    selectedReport.advanced_parameters?.forEach(param => {
      advancedDefaults[param.name] = param.defaultValue;
    });
    
    // Actualiza el estado del modal
    const newModalParams = { ...modalParams, ...advancedDefaults };
    setModalParams(newModalParams);

    // Actualiza el estado de persistencia
    setPersistedAdvancedParams(prev => ({
      ...prev,
      [selectedReport.endpoint]: {
        ...prev[selectedReport.endpoint],
        ...advancedDefaults
      }
    }));
  };

  const getNow = useCallback(() => { // useCallback si no depende de props/estado o si sus deps son estables
    return new Date().toLocaleDateString('en-CA');
  }, []);

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


  // --- MODIFICACIÓN 2: buttonDownloadHandleMulti para usar y actualizar caché ---
  const buttonDownloadHandleMulti = async () => {
    const sessionId = getSessionId();

    if (!selectedReport || !ventasFile || !inventarioFile) {
      alert("Asegúrate de seleccionar un reporte y cargar ambos archivos CSV.");
      return;
    }
    setIsLoading(true);

    const parameterLabels = getParameterLabelsForFilename();
    const baseLabel = selectedReport.label.replace(/ ✓/g, '').trim();
    const suffix = parameterLabels ? `_${parameterLabels}` : '';
    const filename = `${baseLabel}_${getNow()}${suffix}.xlsx`;
    const currentCacheKey = `${selectedReport.endpoint}-${JSON.stringify(modalParams)}`;

    if (cachedResponse.key === currentCacheKey && cachedResponse.blob) {
      console.log("Usando respuesta de caché para:", currentCacheKey);
      triggerDownload(cachedResponse.blob, filename.replace('.xlsx', '_cached.xlsx'));
      return;
    }

    const formData = new FormData();
    formData.append("ventas", ventasFile);
    formData.append("inventario", inventarioFile);

    // --- ¡AQUÍ COMIENZA LA NUEVA LÓGICA! ---

    const allParameters = [
      ...(selectedReport.basic_parameters || []),
      ...(selectedReport.advanced_parameters || [])
    ];

    // Objeto para almacenar los pesos de importancia normalizados
    let pesosImportanciaNormalizados = null;
    
    // Objeto para recolectar las puntuaciones de 1-10
    const rawScores = {
        ventas: modalParams['score_ventas'],
        ingreso: modalParams['score_ingreso'],
        margen: modalParams['score_margen'],
        dias_venta: modalParams['score_dias_venta']
    };

    // Verificamos si estamos en el reporte estratégico que usa estos scores
    const isStrategicReport = 'score_ventas' in modalParams;

    if (isStrategicReport) {
        // 1. SUMAR LAS PUNTUACIONES CRUDAS
        const totalScore = Object.values(rawScores).reduce((sum, score) => sum + Number(score || 0), 0);

        // 2. NORMALIZAR (PRORRATEAR)
        if (totalScore > 0) {
            pesosImportanciaNormalizados = {
                ventas: (rawScores.ventas || 0) / totalScore,
                ingreso: (rawScores.ingreso || 0) / totalScore,
                margen: (rawScores.margen || 0) / totalScore,
                dias_venta: (rawScores.dias_venta || 0) / totalScore,
            };
        } else {
            // Caso borde: si todas las puntuaciones son 0, usamos pesos iguales.
            pesosImportanciaNormalizados = { ventas: 0.25, ingreso: 0.25, margen: 0.25, dias_venta: 0.25 };
        }
        
        // 3. AÑADIR EL JSON FINAL AL FORMDATA
        formData.append('pesos_importancia_json', JSON.stringify(pesosImportanciaNormalizados));
    }


    // Procesar el resto de parámetros (excluyendo los scores que ya procesamos)
    allParameters.forEach(param => {
      // Si el parámetro es uno de los scores, lo saltamos porque ya fue procesado.
      if (param.name.startsWith('score_')) {
          return;
      }

      const value = modalParams[param.name];

      if (value === undefined || value === null || value === '') {
        return;
      }

      if (param.name.endsWith('_json')) {
        if (Array.isArray(value) && value.length > 0) {
          formData.append(param.name, JSON.stringify(value));
        }
      } else if (Array.isArray(value)) {
        if (value.length > 0) {
          formData.append(param.name, value.join(','));
        }
      } else {
        formData.append(param.name, value);
      }
    });

    // --- FIN DE LA NUEVA LÓGICA ---

    try {
      const response = await axios.post(`${API_URL}${selectedReport.endpoint}`, formData, {
        responseType: 'blob',
        headers: {
          'X-Session-ID': sessionId,
        }
      });

      const newBlob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      setCachedResponse({ key: currentCacheKey, blob: newBlob });
      triggerDownload(newBlob, filename);

    } catch (err) {
      // ... (tu manejo de errores permanece igual) ...
      let errorMessage = "Error al generar el reporte.";
      if (err.response && err.response.data) {
        // ...
      } else {
        errorMessage = err.message;
      }
      alert(errorMessage);
      setIsLoading(false);
    }
  };


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
    // Guarda en localStorage solo cuando el objeto de persistencia cambia
    try {
      localStorage.setItem(ADVANCED_PARAMS_STORAGE_KEY, JSON.stringify(persistedAdvancedParams));
    } catch (error) {
      console.error("Error al guardar en localStorage", error);
    }
  }, [persistedAdvancedParams])

  useEffect(() => {
    if (inventarioFile instanceof File) {
      const sessionId = getSessionId();      
      const fetchFilters = async () => {
        setIsLoadingFilters(true);
        const formData = new FormData();
        formData.append("inventario", inventarioFile);
        try {
          const response = await axios.post(`${API_URL}/extract-metadata`, formData, {
            // headers: { "Content-Type": "multipart/form-data" },
            responseType: 'json',
            headers: {
              'X-Session-ID': sessionId 
            },
          });
          setAvailableFilters({
            categorias: response.data.categorias_disponibles || [],
            marcas: response.data.marcas_disponibles || []
          });
        } catch (error) {
          console.error("Error al extraer los filtros:", error);
          alert("No se pudieron cargar los filtros desde el archivo de inventario.");
        } finally {
          setIsLoadingFilters(false);
        }
      };
      fetchFilters();
    }
  }, [inventarioFile]);

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

  useEffect(() => {
    setFilesReady(ventasFile instanceof File && inventarioFile instanceof File);
  }, [ventasFile, inventarioFile]);

  // Efecto para limpiar caché si los parámetros cambian MIENTRAS el modal está abierto
  useEffect(() => {
    if (showModal && selectedReport) { // Solo si el modal está visible y hay un reporte
      const currentCacheKey = `${selectedReport.endpoint}-${JSON.stringify(modalParams)}`;
      if (cachedResponse.key && cachedResponse.key !== currentCacheKey) {
        console.log("Parámetros cambiados, limpiando caché anterior:", cachedResponse.key);
        setCachedResponse({ key: null, blob: null });
      }
    }
  }, [parameterValues, showModal, selectedReport, cachedResponse.key]);

  useEffect(() => {
    if (!selectedReport) {
      setIsCacheValid(false);
      return;
    }

    // Genera la clave correspondiente a los parámetros actuales del modal
    const currentKey = `${selectedReport.endpoint}-${JSON.stringify(modalParams)}`;
    
    // Compara con la clave de la respuesta en caché y actualiza el estado
    if (cachedResponse.key === currentKey) {
      setIsCacheValid(true);
    } else {
      setIsCacheValid(false);
    }
  }, [modalParams, cachedResponse, selectedReport]); // Se re-ejecuta si cambian los parámetros, la caché o el reporte

  return (
    <>
    {appState === 'landing' && <LandingView onStartSession={handleStartSession} />}
      
    {appState === 'onboarding' && <OnboardingModal onSubmit={handleOnboardingSubmit} onCancel={handleCancelOnboarding} isLoading={isLoading} />}

    {appState === 'analysis' && (
      <>
        <div className={`min-h-screen bg-gradient-to-b from-neutral-900 via-background to-gray-900
          flex flex-col items-center justify-center text-center px-4 sm:px-8 md:px-12 lg:px-20
          ${showModal ? 'overflow-hidden h-screen' : ''}`}>
          <div className='w-full max-w-4xl'>
            <h1 className="text-4xl font-semibold text-white mt-6">
              Bienvenido a <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: 'linear-gradient(to right, #560bad, #7209b7, #b5179e)' }}
              >
                Ferretero.IA
              </span>
            </h1>
            <p className="mt-4 text-lg text-gray-100">
              Tus números tienen algo que decirte.
            </p>
          </div>
          <div className='mt-10 w-full max-w-2xl grid text-white md:grid-cols-2 gap-6 px-2'>
            <div>
              <div className="max-h-[300px] overflow-auto bg-gray-800 p-1 rounded-lg">
                <CsvDropZone onFile={handleVentasInput} />
              </div>
              {ventasFile && (
                <div className="text-xs cursor-pointer text-gray-600 hover:text-white" onClick={() => triggerDownload(ventasFile, "historial de ventas.csv")} >
                  <div className="flex items-center text-center justify-center gap-1">
                    <FiDownload className="" /> Descargar CSV procesado
                  </div>
                </div>
              )}
            </div>
            <div>
              <div className="max-h-[300px] overflow-auto bg-gray-800 p-1 rounded-lg">
                <CsvDropZone2 onFile={handleInventarioInput} />
              </div>
              {inventarioFile && (
                <div className="text-xs cursor-pointer text-gray-600 hover:text-white" onClick={() => triggerDownload(inventarioFile, "stock actual.csv")} >
                  <div className="flex items-center text-center justify-center gap-1">
                    <FiDownload className="" /> Descargar CSV procesado
                  </div>
                </div>
              )}
            </div>
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
                        className="hover:ring-2 focus:ring-purple-800 bg-white bg-opacity-80 shadow-xl text-black text-sm font-medium rounded-lg px-4 py-3 hover:bg-purple-200 hover:text-purple-800 transition duration-200 ease-in-out transform hover:scale-105"
                      >
                        {reportItem.label}
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
          <a href="https://web.ferreteros.app" target="_blank" className="max-w-sm max-w-[200px] mt-4 mb-10 opacity-15 hover:opacity-25 text-white text-sm">Ferretero.IA<br/><img src="ferreteros-app-white.png"/></a>
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
                <div
                  className="w-full max-w-full overflow-x-auto text-gray-700 space-y-2 mt-1 text-left text-sm"
                  dangerouslySetInnerHTML={{ __html: insightHtml }}
                >
                </div>
              </div>
              <div className="p-4 w-full border-t relative bottom-0 bg-white z-10 shadow text-center sticky bottom-0">
                <button
                  onClick={buttonDownloadHandleMulti}
                  className={`border px-6 py-3 rounded-lg font-semibold w-full transition-all duration-300 ease-in-out ${
                    isLoading ? 'opacity-50 cursor-not-allowed bg-gray-200' : 
                    (isCacheValid ? 'bg-green-100 border-green-600 text-green-800 hover:bg-green-200' : 'text-transparent border-purple-700')
                  }`}
                  style={!isLoading && !isCacheValid ? {
                    backgroundImage: 'linear-gradient(to right, #560bad, #7209b7, #b5179e)',
                    backgroundClip: 'text',
                  } : {}}
                  disabled={!ventasFile || !inventarioFile || isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-2 text-gray-600">
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      <span>Generando...</span>
                    </div>
                  ) : isCacheValid ? (
                    <div className="flex items-center justify-center gap-2">
                      <FiDownload className="font-bold text-xl"/>
                      <span>Descargar Reporte (en caché)</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-black font-bold text-lg">🚀</span>
                      {/* El texto cambia si ya existe una caché pero es obsoleta */}
                      <span>{cachedResponse.key ? 'Volver a Ejecutar Análisis' : 'Ejecutar Análisis'}</span>
                    </div>
                  )}
                </button>
                <button
                  onClick={() => setShowModal(false)} // La limpieza de caché se maneja en useEffect[showModal]
                  className="mt-4 w-full text-white text-xl px-4 py-2 font-bold rounded-lg hover:text-gray-100"
                  style={{
                    backgroundImage: 'linear-gradient(to right, #560bad, #7209b7, #b5179e)',
                  }}
                  disabled={isLoading}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    )}
    </>
  );
}

export default LandingPage;
