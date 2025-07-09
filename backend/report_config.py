# ===================================================================================
# --- CONFIGURACIÓN CENTRAL DEFINITIVA ---
# ===================================================================================
REPORTS_CONFIG = {
  # "🧠 Diagnósticos generales": [
  "AuditoriaMargenes": {
        "label": "Auditoría de Márgenes [Debug]",
        "endpoint": "/debug/auditoria-margenes",
        "isPro": False, # No es una función Pro
        "costo": 0,     # ¡No consume créditos!
        "categoria": "Herramientas de Diagnóstico",
        "basic_parameters": [], # No tiene parámetros configurables
        "advanced_parameters": []
    },
  "ReporteABC": {
    "label": 'Análisis ABC de Productos ✓',
    "endpoint": '/abc',
    # "key": 'ReporteABC',
    "isPro": False,
    "costo": 5,
    "categoria": "🧠 Diagnósticos generales",
    "basic_parameters": [
      { "name": 'periodo_abc', "label": 'Período de Análisis ABC', "type": 'select', "tooltip_key": "periodo_abc",
        "options": [
          { "value": '12', "label": 'Últimos 12 meses' },
          { "value": '6', "label": 'Últimos 6 meses' },
          { "value": '3', "label": 'Últimos 3 meses' },
          { "value": '0', "label": 'Todo' }
        ],
        "defaultValue": '6'
      },
      { "name": 'criterio_abc', "label": 'Criterio Principal ABC', "type": 'select', "tooltip_key": "criterio_abc",
        "options": [
          { "value": 'combinado', "label": 'Combinado o Ponderado' },
          { "value": 'ingresos', "label": 'Por Ingresos' },
          { "value": 'unidades', "label": 'Por Cantidad Vendida' },
          { "value": 'margen', "label": 'Por Margen' }
        ],
        "defaultValue": 'combinado'
      }
    ]
  },
  "ReporteDiagnosticoStockMuerto": {
    "label": 'Diagnóstico de Stock Muerto ✓',
    "endpoint": '/diagnostico-stock-muerto',
    # "key": 'ReporteStockMuerto',
    "categoria": "🧠 Diagnósticos generales",
    "accionable_columns": [
        "SKU / Código de producto",
        "Nombre del producto",
        "Stock Actual (Unds)",
        "Valor stock (S/.)",
        "Días sin venta"
    ],
    "isPro": False,
    "costo": 5,
    "basic_parameters": []
  },
  "ReporteMaestro": {
    "label": "⭐ Reporte Maestro de Inventario (Recomendado)",
    "endpoint": "/reporte-maestro-inventario",
    # "key": 'ReporteMaestro',
    "categoria": "🧠 Diagnósticos generales",
    "isPro": False,
    "costo": 10,
    "basic_parameters": [
      {
        "name": "criterio_abc",
        "label": "Criterio de Importancia (ABC)",
        "type": "select",
        "tooltip_key": "criterio_abc",
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
        "tooltip_key": "periodo_abc",
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
        "tooltip_key": "dias_sin_venta_muerto",
        "placeholder": "Default: dinámico",
        "defaultValue": 30,
        "min": 30
      },
      {
        "name": "meses_analisis_salud",
        "label": "Período para Cálculo de Salud (meses)",
        "type": "number",
        "tooltip_key": "meses_analisis_salud",
        "placeholder": "Default: dinámico",
        "defaultValue": 1,
        "min": 1
      },
      {
        "name": "peso_margen",
        "label": "Peso de Margen (0.0 a 1.0)",
        "type": "number",
        "tooltip_key": "peso_margen",
        "defaultValue": 0.5,
        "min": 0, "max": 1, "step": 0.1
      },
      {
        "name": "peso_ingresos",
        "label": "Peso de Ingresos (0.0 a 1.0)",
        "type": "number",
        "tooltip_key": "peso_ingresos",
        "defaultValue": 0.3,
        "min": 0, "max": 1, "step": 0.1
      },
      {
        "name": "peso_unidades",
        "label": "Peso de Unidades (0.0 a 1.0)",
        "type": "number",
        "tooltip_key": "peso_unidades",
        "defaultValue": 0.2,
        "min": 0, "max": 1, "step": 0.1
      }
    ]
  },
  "ReporteAnalisisEstrategicoRotacion": {
    "label": 'Análisis Estratégico de Rotación ✓',
    "endpoint": '/rotacion-general-estrategico',
    # "key": 'ReporteAnalisisEstrategicoRotacion',
    "categoria": "🧠 Diagnósticos generales",
    "isPro": False,
    "costo": 8,
    "basic_parameters": [
      { "name": 'sort_by', "label": 'Ordenar Reporte Por', "type": 'select', "tooltip_key": "sort_by",
        "options": [
          { "value": 'Importancia_Dinamica', "label": 'Índice de Importancia (Recomendado)' },
          { "value": 'Inversion_Stock_Actual', "label": 'Mayor Inversión en Stock' },
          { "value": 'Dias_Cobertura_Stock_Actual', "label": 'Próximos a Agotarse (Cobertura)' },
          { "value": 'Ventas_Total_Reciente', "label": 'Más Vendidos (Unidades Recientes)' },
          { "value": 'Clasificacion', "label": 'Clasificación (A, B, C, D)' },
        ],
        "defaultValue": 'Importancia_Dinamica'
      },
      { "name": 'filtro_categorias_json', "label": 'Filtrar por Categorías', "type": 'multi-select', "tooltip_key": "filtro_categorias_json", "optionsKey": 'categorias', "defaultValue": [] },
      { "name": 'filtro_marcas_json', "label": 'Filtrar por Marcas', "type": 'multi-select', "tooltip_key": "filtro_marcas_json", "optionsKey": 'marcas', "defaultValue": [] },
      { "name": 'min_importancia', "label": 'Mostrar solo con Importancia mayor a', "type": 'number', "tooltip_key": "min_importancia", "defaultValue": '', "min": 0, "max": 1, "step": 0.1, "placeholder": '"Ej": 0.7' },
      { "name": 'max_dias_cobertura', "label": 'Mostrar solo con Cobertura menor a (días)', "type": 'number', "tooltip_key": "max_dias_cobertura", "defaultValue": '', "min": 0, "placeholder": '"Ej": 15 (para ver bajo stock)' },
      { "name": 'min_dias_cobertura', "label": 'Mostrar solo con Cobertura mayor a (días)', "type": 'number', "tooltip_key": "min_dias_cobertura", "defaultValue": '', "min": 0, "placeholder": '"Ej": 180 (para ver sobre-stock)' },
    ],
    "advanced_parameters": [
      { "name": 'dias_analisis_ventas_recientes', "label": 'Período de Análisis Reciente (días)', "type": 'number', "tooltip_key": "dias_analisis_ventas_recientes", "defaultValue": 30, "min": 15 },
      { "name": 'dias_analisis_ventas_general', "label": 'Período de Análisis General (días)', "type": 'number', "tooltip_key": "dias_analisis_ventas_general", "defaultValue": 180, "min": 30 },
      {
          "name": 'score_ventas',
          "label": 'Peso de Ventas (Popularidad)',
          "type": 'number',
          "tooltip_key": "score_ventas",
          "defaultValue": 8,
          "min": 1, "max": 10
      },
      {
          "name": 'score_ingreso',
          "label": 'Peso de Ingresos (Facturación)',
          "type": 'number',
          "tooltip_key": "score_ingreso",
          "defaultValue": 6,
          "min": 1, "max": 10
      },
      {
          "name": 'score_margen',
          "label": 'Peso del Margen (Rentabilidad)',
          "type": 'number',
          "tooltip_key": "score_margen",
          "defaultValue": 4,
          "min": 1, "max": 10
      },
      {
          "name": 'score_dias_venta',
          "label": 'Peso de Frecuencia de Venta',
          "type": 'number',
          "tooltip_key": "score_dias_venta",
          "defaultValue": 2,
          "min": 1, "max": 10
      },
    ]
  },


  # "📦 Reposición Inteligente y Sugerencias de Pedido"
  "ReportePuntosAlertaStock": { "label": 'Puntos de Alerta de Stock ✓',
    "endpoint": '/reporte-puntos-alerta-stock',
    # "key": 'ReportePuntosAlertaStock',
    "categoria": "📦 Reposición Inteligente y Sugerencias de Pedido",
    "isPro": False,
    "costo": 6,
    "basic_parameters": [
      { "name": 'lead_time_dias', "label": 'El tiempo promedio de entrega del proveedor en días', "type": 'select', "tooltip_key": "lead_time_dias",
        "options": [
          { "value": '5', "label": '5 días' },
          { "value": '7', "label": '7 días' },
          { "value": '10', "label": '10 días' },
          { "value": '12', "label": '12 días' },
          { "value": '15', "label": '15 días' }
        ],
        "defaultValue": '7'
      },
      { "name": 'dias_seguridad_base', "label": 'Días adicionales de cobertura para stock de seguridad', "type": 'select', "tooltip_key": "dias_seguridad_base",
        "options": [
          { "value": '0', "label": 'Ninguno' },
          { "value": '1', "label": '1 día adicional' },
          { "value": '2', "label": '2 días adicionales' },
          { "value": '3', "label": '3 días adicionales' }
        ],
        "defaultValue": '0'
      }
    ]
  },
  "ReporteListaBasicaReposicionHistorica": {
    "label": 'Lista básica de reposición según histórico ✓',
    "endpoint": '/lista-basica-reposicion-historico',
    # "key": 'ReporteListaBasicaReposicionHistorica',
    "categoria": "📦 Reposición Inteligente y Sugerencias de Pedido",
    "isPro": False,
    "costo": 8,
    "accionable_columns": [
        "SKU / Código de producto",
        "Nombre del producto",
        "Precio Compra Actual (S/.)",
        "Stock Actual (Unds)",
        "Punto de Alerta Mínimo (Unds)",
        "Pedido Ideal Sugerido (Unds)"
    ],
    "basic_parameters": [
      { "name": 'ordenar_por', "label": 'Ordenar reporte por', "type": 'select', "tooltip_key": "ordenar_por",
        "options": [
          { "value": 'Importancia', "label": 'Índice de Importancia (Recomendado)' },
          { "value": 'Índice de Urgencia', "label": 'Índice de Urgencia (Stock bajo + Importancia)' },
          { "value": 'Inversion Requerida', "label": 'Mayor Inversión Requerida' },
          { "value": 'Cantidad a Comprar', "label": 'Mayor Cantidad a Comprar' },
          { "value": 'Margen Potencial', "label": 'Mayor Margen Potencial de Ganancia' },
          { "value": 'Próximos a Agotarse', "label": 'Próximos a Agotarse (Cobertura)' },
          { "value": 'rotacion', "label": 'Mayor Rotación' },
          { "value": 'Categoría', "label": 'Categoría (A-Z)' }
        ],
        "defaultValue": 'Índice de Urgencia'
      },
      { "name": 'incluir_solo_categorias', "label": 'Filtrar por Categorías', "type": 'multi-select', "tooltip_key": "incluir_solo_categorias", "optionsKey": 'categorias', "defaultValue": [] },
      { "name": 'incluir_solo_marcas', "label": 'Filtrar por Marcas', "type": 'multi-select', "tooltip_key": "incluir_solo_marcas", "optionsKey": 'marcas', "defaultValue": [] }
    ],
    "advanced_parameters": [
      { "name": 'dias_analisis_ventas_recientes', "label": 'Período de Análisis Reciente (días)', "type": 'number', "tooltip_key": "dias_analisis_ventas_recientes", "defaultValue": 30, "min": 15 },
      { "name": 'dias_analisis_ventas_general', "label": 'Período de Análisis General (días)', "type": 'number', "tooltip_key": "dias_analisis_ventas_general", "defaultValue": 180, "min": 30 },
      { "name": 'excluir_sin_ventas', "label": '¿Excluir productos con CERO ventas?', "type": 'boolean_select', "tooltip_key": "excluir_sin_ventas",
        "options": [
          { "value": 'true', "label": 'Sí, excluir (Recomendado)' },
          { "value": 'false', "label": 'No, incluirlos' }
        ],
        "defaultValue": 'true'
      },
      { "name": 'lead_time_dias', "label": 'Tiempo de Entrega del Proveedor en Días', "type": 'number', "tooltip_key": "lead_time_dias", "defaultValue": 7, "min": 0 },
      { "name": 'dias_cobertura_ideal_base', "label": 'Días de Cobertura Ideal Base', "type": 'number', "tooltip_key": "dias_cobertura_ideal_base", "defaultValue": 10, "min": 3 },
      { "name": 'peso_ventas_historicas', "label": 'Peso Ventas Históricas (0.0-1.0)', "type": 'number', "tooltip_key": "peso_ventas_historicas", "defaultValue": 0.6, "min": 0, "max": 1, "step": 0.1 },
      {
          "name": 'score_ventas',
          "label": 'Peso de Ventas (Popularidad)',
          "type": 'number',
          "tooltip_key": "score_ventas",
          "defaultValue": 8,
          "min": 1, "max": 10
      },
      {
          "name": 'score_ingreso',
          "label": 'Peso de Ingresos (Facturación)',
          "type": 'number',
          "tooltip_key": "score_ingreso",
          "defaultValue": 6,
          "min": 1, "max": 10
      },
      {
          "name": 'score_margen',
          "label": 'Peso del Margen (Rentabilidad)',
          "type": 'number',
          "tooltip_key": "score_margen",
          "defaultValue": 4,
          "min": 1, "max": 10
      },
      {
          "name": 'score_dias_venta',
          "label": 'Peso de Frecuencia de Venta',
          "type": 'number',
          "tooltip_key": "score_dias_venta",
          "defaultValue": 2,
          "min": 1, "max": 10
      }
    ]
  },
  "ReporteListaSugeridaParaAlcanzarMontoMinimo": { "label": 'Lista sugerida para alcanzar monto mínimo', "endpoint": '/rotacion', "categoria": "📦 Reposición Inteligente y Sugerencias de Pedido", "isPro": True, "costo": 10, "basic_parameters": [] },
  "ReportePedidoOptimizadoPorMarcas": { "label": 'Pedido optimizado por marcas o líneas específicas', "endpoint": '/rotacion', "categoria": "📦 Reposición Inteligente y Sugerencias de Pedido", "isPro": True, "costo": 10, "basic_parameters": [] },
  "ReporteReposicionInteligentePorCategoria": { "label": 'Reposición inteligente por categoría', "endpoint": '/rotacion', "categoria": "📦 Reposición Inteligente y Sugerencias de Pedido", "isPro": True, "costo": 10, "basic_parameters": [] },
  "ReporteSugerenciaCompinadaPorZona": { "label": 'Sugerencia combinada por zona', "endpoint": '/rotacion', "categoria": "📦 Reposición Inteligente y Sugerencias de Pedido", "isPro": True, "costo": 10, "basic_parameters": [] },
  

  # "📊 Simulación y ROI de Compra"
  "ReporteSimulacionAhorroCompraGrupal": { "label": 'Simulación de ahorro en compra grupal', "endpoint": '/sobrestock', "categoria": "📊 Simulación y ROI de Compra", "isPro": True, "costo":10, "basic_parameters": [] },
  "ReporteAnalisisDePreciosMercado": { "label": 'Analisis de precios en base al Mercado', "endpoint": '/sobrestock', "categoria": "📊 Simulación y ROI de Compra", "isPro": True, "costo":10, "basic_parameters": [] },
  "ReporteEstimacionMargenBrutoPorSugerencia": { "label": 'Estimación de margen bruto por sugerencia', "endpoint": '/sobrestock', "categoria": "📊 Simulación y ROI de Compra", "isPro": True, "costo":10, "basic_parameters": [] },
  "ReporteRentabilidadMensualPorMarca": { "label": 'Rentabilidad mensual por línea o proveedor', "endpoint": '/sobrestock', "categoria": "📊 Simulación y ROI de Compra", "isPro": True, "costo":10, "basic_parameters": [] },


  # "🔄 Gestión de Inventario y Mermas"
  "ReporteRevisionProductosSinRotar": { "label": 'Revisión de productos sin rotar', "endpoint": '/stock-critico', "categoria": "🔄 Gestión de Inventario y Mermas", "isPro": True, "costo": 10, "basic_parameters": [] },
  "ReporteListadoProductosAltaRotacion": { "label": 'Listado de productos con alta rotación que necesitan reposición', "endpoint": '/sobrestock', "categoria": "🔄 Gestión de Inventario y Mermas", "isPro": True, "costo": 10, "basic_parameters": [] },
  "ReporteSugerenciaPromocionesParaLiquidar": { "label": 'Sugerencia de promociones para liquidar productos lentos', "endpoint": '/rotacion', "categoria": "🔄 Gestión de Inventario y Mermas", "isPro": True, "costo": 10, "basic_parameters": [] },
};