# ===================================================================================
# --- CONFIGURACIÓN CENTRAL DEFINITIVA ---
# ===================================================================================
REPORTS_CONFIG = {
  # "🧠 Análisis Estratégico": [
  "ReporteAuditoriaMargenes": {
      "label": '💸 Auditoría de Desviación de Margen',
      "endpoint": '/auditoria-margenes',
      "isPro": False, # Es un reporte "Estratega"
      "costo": 10,
      "categoria": "📋 Auditorías de Datos",
      "basic_parameters": [
          {
              "name": "ordenar_por",
              "label": "Priorizar y Ordenar Por",
              "type": "select",
              "defaultValue": "impacto_financiero",
              "tooltip_key": "ordenar_auditoria_por",
              "options": [
                  { "value": "impacto_financiero", "label": "Mayor Impacto Financiero (S/.)" },
                  { "value": "desviacion_porcentual", "label": "Mayor Desviación Porcentual (%)" },
                  { "value": "peor_margen_real", "label": "Peor Margen Real por Unidad (S/.)" },
                  { "value": "categoria", "label": "Categoría (A-Z)" }
              ]
          },
          { "name": 'incluir_solo_categorias', "label": 'Filtrar por Categorías', "type": 'multi-select', "tooltip_key": "filtro_categorias", "optionsKey": 'categorias', "defaultValue": [] },
          { "name": 'incluir_solo_marcas', "label": 'Filtrar por Marcas', "type": 'multi-select', "tooltip_key": "filtro_marcas", "optionsKey": 'marcas', "defaultValue": [] },
          {
              "name": "tipo_analisis_margen",
              "label": "Buscar productos con...",
              "type": "select",
              "defaultValue": "desviacion_negativa",
              "tooltip_key": "tipo_analisis_margen",
              "options": [
                  { "value": "desviacion_negativa", "label": "Desviación Negativa (Venta por debajo del precio de lista)" },
                  { "value": "margen_negativo", "label": "Margen Negativo (Venta por debajo del costo)" },
                  { "value": "todas_las_desviaciones", "label": "Todas las Desviaciones (Positivas y Negativas)" }
              ]
          },
          { 
              "name": "umbral_desviacion_porcentaje", 
              "label": "Mostrar solo si la desviación del margen supera el (%)", 
              "type": "number", 
              "defaultValue": 10,
              "tooltip_key": "umbral_desviacion"
          }
      ],
      "advanced_parameters": [],
      "accionable_columns": [
          "SKU / Código de producto", "Nombre del producto", "Precio Venta de Lista (S/.)",
          "Precio Venta Promedio (S/.)", "Margen Teórico (S/.)", "Margen Real (S/.)", "Desviación de Margen (%)"
      ],
      "preview_details": [
          { "label": "Margen de Lista (Esperado)", "data_key": "Margen Teórico (S/.)", "prefix": "S/ " },
          { "label": "Margen Real (Obtenido)", "data_key": "Margen Real (S/.)", "prefix": "S/ " },
          { "label": "Desviación", "data_key": "Desviación de Margen (%)", "suffix": "%" }
      ]
  },
  "ReporteDiagnosticoCatalogo": {
      "label": '🔎 Auditoría de Integridad de Catálogo',
      "endpoint": '/diagnostico-catalogo',
      "isPro": False, # Es un reporte "Estratega"
      "costo": 5,
      "categoria": "📋 Auditorías de Datos",
      "basic_parameters": [
        {
            "name": "tipo_diagnostico_catalogo",
            "label": "Buscar productos que están...",
            "type": "select",
            "defaultValue": "nunca_vendidos",
            "tooltip_key": "tipo_diagnostico_catalogo",
            "options": [
                { "value": "nunca_vendidos", "label": "En el inventario pero nunca se han vendido" },
                { "value": "agotados_inactivos", "label": "Agotados y sin ventas por un largo tiempo" }
            ]
        },
        {
            "name": "ordenar_por",
            "label": "Priorizar y Ordenar Por",
            "type": "select",
            "defaultValue": "valor_stock_s",
            "tooltip_key": "ordenar_catalogo_por",
            "options": [
                { "value": "valor_stock_s", "label": "Mayor Valor Inmovilizado" },
                { "value": "stock_actual_unds", "label": "Mayor Cantidad en Stock" },
                { "value": "categoria", "label": "Categoría (A-Z)" }
            ]
        },
        { "name": "incluir_solo_categorias", "label": "Filtrar por Categorías", "type": "multi-select", "optionsKey": "categorias", "defaultValue": [], "tooltip_key": "filtro_categorias" },
        { "name": "incluir_solo_marcas", "label": "Filtrar por Marcas", "type": "multi-select", "optionsKey": "marcas", "defaultValue": [], "tooltip_key": "filtro_marcas" }
      ],
      "advanced_parameters": [
        {
            "name": "filtro_stock",
            "label": "Filtrar por estado de stock",
            "type": "select",
            "defaultValue": "todos",
            "tooltip_key": "filtro_stock",
            "options": [
                { "value": "todos", "label": "Mostrar Todos" },
                { "value": "con_stock", "label": "Mostrar solo con Stock > 0" },
                { "value": "sin_stock", "label": "Mostrar solo con Stock = 0" }
            ],
            "condition": { "field": "tipo_diagnostico_catalogo", "value": "nunca_vendidos" } # Parámetro condicional
        },
        { 
            "name": "dias_inactividad", 
            "label": "Considerar inactivo después de (días sin venta)", 
            "type": "number", 
            "defaultValue": 365,
            "tooltip_key": "dias_inactividad",
            "condition": { "field": "tipo_diagnostico_catalogo", "value": "agotados_inactivos" } # Parámetro condicional
        },
      ],
      "accionable_columns": [
          "SKU / Código de producto", "Nombre del producto", "Categoría",
          "Stock Actual (Unds)", "Valor stock (S/.)", "Diagnóstico"
      ],
      "preview_details": [
          { "label": "Diagnóstico", "data_key": "Diagnóstico" },
          { "label": "Stock Actual", "data_key": "Stock Actual (Unds)", "suffix": " Unds" },
          { "label": "Valor en Stock", "data_key": "Valor stock (S/.)", "prefix": "S/ " }
      ]
  },
  "ReporteAuditoriaCalidadDatos": {
      "label": '🧹 Auditoría de Calidad de Datos',
      "endpoint": '/auditoria-calidad-datos',
      "isPro": False, # Es un reporte "Estratega"
      "costo": 5,
      "categoria": "📋 Auditorías de Datos",
      "basic_parameters": [
          {
              "name": "criterios_auditoria_json",
              "label": "Auditar productos con...",
              "type": "multi-select",
              "optionsKey": "criterios_auditoria", # Usaremos una clave estática
              "tooltip_key": "criterios_auditoria",
              "defaultValue": ["marca_faltante", "categoria_faltante", "precio_compra_cero"],
              # Opciones estáticas, ya que no dependen de los datos del usuario
              "static_options": [
                  { "value": "marca_faltante", "label": "Marca Faltante" },
                  { "value": "categoria_faltante", "label": "Categoría Faltante" },
                  { "value": "precio_compra_cero", "label": "Precio de Compra en Cero" }
              ]
          }
      ],
      "advanced_parameters": [],
      "accionable_columns": [
          "SKU / Código de producto", "Nombre del producto", "Problema Detectado",
          "Stock Actual (Unds)", "Valor stock (S/.)"
      ],
      "preview_details": [
          { "label": "Problema Detectado", "data_key": "Problema Detectado" },
          { "label": "Stock Actual", "data_key": "Stock Actual (Unds)", "suffix": " Unds" },
          { "label": "Valor en Stock", "data_key": "Valor stock (S/.)", "prefix": "S/ " }
      ]
  },
  # "AuditoriaMargenes": {
  #     "label": "Auditoría de Márgenes [Debug]",
  #     "endpoint": "/debug/auditoria-margenes",
  #     "isPro": False, # No es una función Pro
  #     "costo": 0,     # ¡No consume créditos!
  #     "categoria": "Herramientas de Diagnóstico",
  #     "basic_parameters": [], # No tiene parámetros configurables
  #     "advanced_parameters": []
  # },
  "ReporteABC": {
    "label": '🥇 Análisis ABC de Productos',
    "endpoint": '/abc',
    # "key": 'ReporteABC',
    "isPro": False,
    "costo": 5,
    "categoria": "🧠 Análisis Estratégico",
    "basic_parameters": [
      { 
        "name": 'criterio_abc', 
        "label": 'Criterio Principal ABC', 
        "type": 'select',
        "options": [
            { "value": 'combinado', "label": 'Según Mi Estrategia' },
            { "value": 'ingresos', "label": 'Por Ingresos' },
            { "value": 'unidades', "label": 'Por Cantidad Vendida' },
            { "value": 'margen', "label": 'Por Margen' }
        ],
        "defaultValue": 'combinado'
      },
      { "name": 'incluir_solo_categorias', "label": 'Filtrar por Categorías', "type": 'multi-select', "tooltip_key": "filtro_categorias", "optionsKey": 'categorias', "defaultValue": [] },
      { "name": 'incluir_solo_marcas', "label": 'Filtrar por Marcas', "type": 'multi-select', "tooltip_key": "filtro_marcas", "optionsKey": 'marcas', "defaultValue": [] },
      { "name": 'periodo_abc', "label": 'Período de Análisis ABC', "type": 'select', "tooltip_key": "periodo_abc",
        "options": [
          { "value": '12', "label": 'Últimos 12 meses' },
          { "value": '6', "label": 'Últimos 6 meses' },
          { "value": '3', "label": 'Últimos 3 meses' },
          { "value": '0', "label": 'Todo' }
        ],
        "defaultValue": '6'
      },
    ],
    "advanced_parameters": [],
    "accionable_columns": [
        "SKU / Código de producto",
        "Nombre del producto",
        "Clasificación ABC",
        "Venta Total (S/.)"
        # El nombre de la columna del criterio se añadirá dinámicamente
    ],
    "preview_details": [
        { "label": "Clasificación", "data_key": "Clasificación ABC" },
        { "label": "Aporte al Criterio", "data_key": "Venta Total (S/.)", "prefix": "S/ " },
        { "label": "% del Total", "data_key": "% Participación", "suffix": "%" }
    ]
  },
  "ReporteDiagnosticoStockMuerto": {
    "label": '💸 Diagnóstico de Stock Muerto',
    "endpoint": '/diagnostico-stock-muerto',
    # "key": 'ReporteStockMuerto',
    "categoria": "🧠 Análisis Estratégico",
    "isPro": False,
    "costo": 5,
    "basic_parameters": [
        {
            "name": "ordenar_por",
            "label": "Ordenar resultados por",
            "type": "select",
            "defaultValue": "valor_stock_s",
            "tooltip_key": "ordenar_stock_muerto_por",
            "options": [
                { "value": "valor_stock_s", "label": "Mayor Valor Inmovilizado" },
                { "value": "dias_sin_venta", "label": "Más Antiguo (Días sin Venta)" },
                { "value": "stock_actual_unds", "label": "Mayor Cantidad en Stock" },
                { "value": "categoria", "label": "Categoría (A-Z)" }
            ]
        },
        { "name": 'incluir_solo_categorias', "label": 'Filtrar por Categorías', "type": 'multi-select', "tooltip_key": "incluir_solo_categorias", "optionsKey": 'categorias', "defaultValue": [] },
        { "name": 'incluir_solo_marcas', "label": 'Filtrar por Marcas', "type": 'multi-select', "tooltip_key": "incluir_solo_marcas", "optionsKey": 'marcas', "defaultValue": [] },
        { 
            "name": "dias_sin_venta_muerto", 
            "label": "Considerar 'Stock Muerto' después de (días)", 
            "type": "number", 
            "defaultValue": 180,
            "placeholder": "Ej: 180",
            "tooltip_key": "dias_sin_venta_muerto"
        },
    ],
    "advanced_parameters": [
        { 
            "name": "umbral_valor_stock", 
            "label": "Mostrar solo si el valor del stock supera (S/.)", 
            "type": "number", 
            "defaultValue": 0,
            "placeholder": "Ej: 500",
            "tooltip_key": "umbral_valor_stock"
        }
    ],
    "accionable_columns": [
        "SKU / Código de producto",
        "Nombre del producto",
        "Stock Actual (Unds)",
        "Valor stock (S/.)",
        "Días sin venta",
        "Clasificación Diagnóstica"
    ],
    "preview_details": [
        { "label": "Días sin Venta", "data_key": "Días sin venta", "suffix": " días" },
        { "label": "Valor Inmovilizado", "data_key": "Valor stock (S/.)", "prefix": "S/ " },
        { "label": "Stock Actual", "data_key": "Stock Actual (Unds)", "suffix": " Unds" },
        { "label": "Diagnóstico", "data_key": "Prioridad y Acción (DAS 3m)" }
    ]
  },
  "ReporteMaestro": {
    "label": "⭐ Reporte Maestro de Inventario",
    "endpoint": "/reporte-maestro-inventario",
    # "key": 'ReporteMaestro',
    "categoria": "🧠 Análisis Estratégico",
    "isPro": False,
    "costo": 10,
    "basic_parameters": [
      {
        "name": "ordenar_por",
        "label": "Priorizar y Ordenar Por",
        "type": "select",
        "defaultValue": "prioridad",
        "tooltip_key": "maestro_ordenar_por",
        "options": [
          { "value": "prioridad", "label": "Prioridad Estratégica (Recomendado)" },
          { "value": "valor_riesgo", "label": "Mayor Valor en Riesgo" },
          { "value": "importancia", "label": "Mayor Importancia (Clase ABC)" },
          { "value": "salud", "label": "Peor Salud (Diagnóstico)" }
        ]
      },
      { "name": 'incluir_solo_categorias', "label": 'Filtrar por Categorías', "type": 'multi-select', "tooltip_key": "filtro_categorias", "optionsKey": 'categorias', "defaultValue": [] },
      { "name": 'incluir_solo_marcas', "label": 'Filtrar por Marcas', "type": 'multi-select', "tooltip_key": "filtro_marcas", "optionsKey": 'marcas', "defaultValue": [] },
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
      },
    ],
    "advanced_parameters": [
        { "name": "dias_sin_venta_muerto", "label": "Umbral para 'Stock Muerto' (días)", "type": "number", "defaultValue": 180, "tooltip_key": "maestro_dias_muerto" },
        { "name": "meses_analisis_salud", "label": "Meses para Cálculo de Salud", "type": "number", "defaultValue": 3, "tooltip_key": "maestro_meses_salud" }
    ],
    "accionable_columns": [
        "SKU / Código de producto", "Nombre del producto", "Clasificación ABC", 
        "Clasificación Diagnóstica", "Índice de Importancia", "Cobertura Actual (Días)"
    ],
    "preview_details": [
        { "label": "Clasificación ABC", "data_key": "Clasificación ABC" },
        { "label": "Diagnóstico de Salud", "data_key": "Clasificación Diagnóstica" },
        { "label": "Importancia", "data_key": "Índice de Importancia" },
        { "label": "Cobertura Actual", "data_key": "Cobertura Actual (Días)", "suffix": " días" }
    ]
  },
  "ReporteAnalisisEstrategicoRotacion": {
    "label": '🔄 Análisis Estratégico de Rotación',
    "endpoint": '/rotacion-general-estrategico',
    # "key": 'ReporteAnalisisEstrategicoRotacion',
    "categoria": "🧠 Análisis Estratégico",
    "isPro": False,
    "costo": 8,
    "basic_parameters": [
      { 
        "name": 'sort_by', "label": 'Priorizar y Ordenar Por', "type": 'select',
        "tooltip_key": "sort_by_rotacion",
        "options": [
          { "value": 'Importancia_Dinamica', "label": 'Índice de Importancia (Recomendado)' },
          { "value": 'Inversion_Stock_Actual', "label": 'Mayor Inversión en Stock' },
          { "value": 'Dias_Cobertura_Stock_Actual', "label": 'Próximos a Agotarse (Cobertura)' }
        ],
        "defaultValue": 'Importancia_Dinamica'
      },
      { "name": 'filtro_categorias_json', "label": 'Filtrar por Categorías', "type": 'multi-select', "optionsKey": 'categorias', "tooltip_key": 'filtro_categorias', "defaultValue": [] },
      { "name": 'filtro_marcas_json', "label": 'Filtrar por Marcas', "type": 'multi-select', "optionsKey": 'marcas', "tooltip_key": 'filtro_marcas', "defaultValue": [] }
    ],
    "advanced_parameters": [
      { "name": 'dias_analisis_ventas_general', "label": 'Período de Análisis General (días)', "type": 'number', "tooltip_key": "dias_analisis_ventas_general", "defaultValue": 180, "min": 30 },
      { "name": 'dias_analisis_ventas_recientes', "label": 'Período de Análisis (días)', "type": 'number', "defaultValue": 30, "min": 15, "tooltip_key": "dias_analisis_ventas_recientes" },
      { "name": 'umbral_stock_bajo_dias', "label": "Umbral para 'Stock Bajo' (días)", "type": "number", "defaultValue": 15, "tooltip_key": "umbrales_stock" },
      { "name": 'umbral_sobre_stock_dias', "label": "Umbral para 'Sobre-stock' (días)", "type": "number", "defaultValue": 180, "tooltip_key": "umbrales_stock" },
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
    ],
    "accionable_columns": [
      "SKU / Código de producto", "Nombre del producto", "Clasificación", 
      "Stock Actual (Unds)", "Alerta de Stock", "Índice de Importancia", "Cobertura Actual (Días)"
    ],
    "preview_details": [
      { "label": "Clasificación", "data_key": "Clasificación" },
      { "label": "Stock Actual", "data_key": "Stock Actual (Unds)", "suffix": " Unds" },
      { "label": "Alerta de Stock", "data_key": "Alerta de Stock" },
      { "label": "Cobertura", "data_key": "Cobertura Actual (Días)", "suffix": " días" }
    ]
  },


  # "📦 Planificación de Compras Estratégicas"
  "ReportePuntosAlertaStock": {
    "label": '⚙️ Alertas para Punto de Venta',
    "endpoint": '/reporte-puntos-alerta-stock',
    # "key": 'ReportePuntosAlertaStock',
    "categoria": "📦 Planificación de Compras Estratégicas",
    "isPro": False,
    "costo": 6,
    "basic_parameters": [
      {
        "name": "ordenar_por",
        "label": "Priorizar y Ordenar Por",
        "type": "select",
        "defaultValue": "Diferencia_vs_Alerta_Minima",
        "tooltip_key": "ordenar_alerta_por",
        "options": [
          { "value": "Diferencia_vs_Alerta_Minima", "label": "Más Urgente (Stock vs Alerta)" },
          { "value": "Importancia_Dinamica", "label": "Mayor Importancia" },
          { "value": "Inversion_Urgente", "label": "Mayor Inversión Requerida" }
        ]
      },
      { "name": "filtro_categorias_json", "label": "Filtrar por Categorías", "type": "multi-select", "optionsKey": "categorias", "defaultValue": [], "tooltip_key": "filtro_categorias" },
      { "name": "filtro_marcas_json", "label": "Filtrar por Marcas", "type": "multi-select", "optionsKey": "marcas", "defaultValue": [], "tooltip_key": "filtro_marcas" },
      { "name": 'lead_time_dias', "label": 'El tiempo promedio de entrega del proveedor en días', "type": 'select', "tooltip_key": "lead_time_dias",
        "options": [
          { "value": '5', "label": '5 días' },
          { "value": '7', "label": '7 días' },
          { "value": '10', "label": '10 días' },
          { "value": '12', "label": '12 días' },
          { "value": '15', "label": '15 días' }
        ],
        "defaultValue": '5'
      },
      { "name": 'dias_seguridad_base', "label": 'Días adicionales de cobertura para stock de seguridad', "type": 'select', "tooltip_key": "dias_seguridad_base",
        "options": [
          { "value": '0', "label": 'Ninguno' },
          { "value": '1', "label": '1 día adicional' },
          { "value": '2', "label": '2 días adicionales' },
          { "value": '3', "label": '3 días adicionales' }
        ],
        "defaultValue": '0'
      },
    ],
    "advanced_parameters": [
      { "name": 'excluir_sin_ventas', "label": '¿Excluir productos con CERO ventas?', "type": 'boolean_select', "tooltip_key": "excluir_sin_ventas",
        "options": [
          { "value": 'true', "label": 'Sí, excluir (Recomendado)' },
          { "value": 'false', "label": 'No, incluirlos' }
        ],
        "defaultValue": 'true'
      },
      { 
        "name": "factor_importancia_seguridad", 
        "label": "Multiplicador de Seguridad para Productos 'A'", 
        "type": "number", 
        "defaultValue": 1.5,
        "step": 0.1,
        "tooltip_key": "factor_importancia"
      }
    ],
    "accionable_columns": [
        "SKU / Código de producto", "Nombre del producto", "Cantidad en stock actual",
        "Punto de Alerta Mínimo (Unds)", "Diferencia (Stock vs Alerta)", "¿Pedir Ahora?"
    ],
    "preview_details": [
        { "label": "Stock Actual", "data_key": "Cantidad en stock actual", "suffix": " Unds" },
        { "label": "Alerta Mínima", "data_key": "Punto de Alerta Mínimo (Unds)", "suffix": " Unds" },
        { "label": "Alerta Ideal", "data_key": "Punto de Alerta Ideal (Unds)", "suffix": " Unds" },
        { "label": "Acción Requerida", "data_key": "¿Pedir Ahora?" }
    ]
  },
  "ReporteListaBasicaReposicionHistorica": {
    "label": '📋 Plan de Compra Sugerido',
    "endpoint": '/lista-basica-reposicion-historico',
    # "key": 'ReporteListaBasicaReposicionHistorica',
    "categoria": "📦 Planificación de Compras Estratégicas",
    "isPro": False,
    "costo": 8,
    "accionable_columns": [
        "SKU / Código de producto",
        "Nombre del producto",
        "Stock Actual (Unds)",
        "Stock Mínimo Sugerido (Unds)",
        "Precio Compra Actual (S/.)",
        "Pedido Ideal Sugerido (Unds)"
    ],
    "preview_details": [
        { "label": "Stock Actual", "data_key": "Stock Actual (Unds)", "suffix": " Unds" },
        { "label": "Stock Mínimo Sugerido", "data_key": "Stock Mínimo Sugerido (Unds)", "suffix": " Unds" },
        { "label": "Precio de Compra", "data_key": "Precio Compra Actual (S/.)", "prefix": "S/ " },
        { "label": "Sugerencia de Pedido", "data_key": "Pedido Ideal Sugerido (Unds)", "suffix": " Unds" }
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
  "ReporteListaSugeridaParaAlcanzarMontoMinimo": { "label": '🎯 Optimizador de Pedido por Línea', "endpoint": '/rotacion', "categoria": "📦 Planificación de Compras Estratégicas", "isPro": True, "costo": 10, "basic_parameters": [] },
  "ReportePedidoOptimizadoPorMarcas": { "label": '💎 Descubridor de Productos Estrella', "endpoint": '/rotacion', "categoria": "📦 Planificación de Compras Estratégicas", "isPro": True, "costo": 10, "basic_parameters": [] },
  "ReporteReposicionInteligentePorCategoria": { "label": '🗓️ Pronóstico de Demanda Estacional', "endpoint": '/rotacion', "categoria": "📦 Planificación de Compras Estratégicas", "isPro": True, "costo": 10, "basic_parameters": [] },
  "ReporteSugerenciaCompinadaPorZona": { "label": '🗺 Radar de Mercado Local', "endpoint": '/rotacion', "categoria": "📦 Planificación de Compras Estratégicas", "isPro": True, "costo": 10, "basic_parameters": [] },
  

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