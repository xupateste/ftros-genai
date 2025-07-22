# ===================================================================================
# --- CONFIGURACIÓN CENTRAL DEFINITIVA ---
# ===================================================================================
REPORTS_CONFIG = {
  # "🧠 Análisis Estratégico": [
  "ReporteAuditoriaMargenes": {
      "label": '💸 Auditoría de Desviación de Margen',
      "endpoint": '/auditoria-margenes',
      "isPro": False, # Es un reporte "Estratega"
      "costo": 3,
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
      "costo": 3,
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
      "costo": 3,
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
    "costo": 7,
    "categoria": "🧠 Análisis Estratégico",
    "description": "Aplica el principio de Pareto (80/20) a tu inventario, clasificando cada producto en Clases (A, B, C) para revelar cuáles son los pocos items vitales que generan la mayor parte de tu valor.",
    "how_it_works": "La herramienta calcula el valor de cada producto según el criterio que elijas (margen, ingresos o unidades). Luego, los ordena y calcula el porcentaje acumulado para asignar la clasificación: el 80% del valor son Clase A, el siguiente 15% son Clase B, y el 5% final son Clase C.",
    "data_requirements": {
        "ventas": ["SKU / Código de producto", "Fecha de venta", "Cantidad vendida", "Precio de venta unitario (S/.)"],
        "inventario": ["SKU / Código de producto", "Precio de compra actual (S/.)"]
    },
    "planes_de_accion": [
        {
            "title": "Misión: Proteger a tus Estrellas (Gestión de Riesgo)",
            "periodicity": "Recomendado: Semanalmente",
            "recipe": "Ejecuta el reporte con el criterio 'Por Margen de Ganancia'. Toma la lista de tus 10 productos 'Clase A' y asegúrate de que su nivel de stock sea siempre óptimo. Un quiebre de stock en uno de estos productos es una pérdida directa de rentabilidad."
        },
        {
            "title": "Misión: Rediseño de Tienda (Visual Merchandising)",
            "periodicity": "Cuándo: Cada 3-6 meses",
            "recipe": "Ejecuta el reporte por 'Unidades Vendidas'. Tus productos 'Clase A' son los más populares. ¿Están a la altura de la vista, en los estantes principales? Usa esta lista para optimizar la distribución física de tu tienda."
        },
        {
            "title": "Misión: Catálogo Inteligente (Estrategia de Compras)",
            "periodicity": "Cuándo: Al planificar las compras del próximo trimestre",
            "recipe": "Ejecuta el reporte por 'Ingresos'. Analiza tu 'Clase C'. ¿Hay productos aquí que te generan muchos problemas (devoluciones, quejas) pero que apenas aportan a tu facturación? Son los candidatos perfectos para ser descontinuados."
        }
    ],
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
    "costo": 8,
    "description": "Identifica los productos que no han rotado en un período determinado, representando capital inmovilizado y ocupando espacio valioso en tu almacén.",
    "how_it_works": "El análisis calcula los días transcurridos desde la última venta de cada producto con stock y lo compara contra un umbral (por defecto o personalizado) para clasificarlo como 'Stock Muerto'.",
    "data_requirements": {
        "ventas": ["SKU / Código de producto", "Fecha de venta"],
        "inventario": ["SKU / Código de producto", "Cantidad en stock actual", "Precio de compra actual (S/.)"]
    },
    "planes_de_accion": [
        {
            "title": "Misión: Rescate de Capital (Financiero)",
            "periodicity": "Recomendado: Mensual",
            "recipe": "Ejecuta el reporte ordenando por 'Mayor Valor Inmovilizado'. La lista resultante son tus prioridades #1. Enfócate en los 5 primeros: cada sol que recuperes de estos productos es un sol que puedes reinvertir en inventario que sí rota."
        },
        {
            "title": "Misión: Guerra de Espacio (Logístico)",
            "periodicity": "Cuándo: Cuando el almacén esté lleno",
            "recipe": "Ejecuta el reporte ordenando por 'Mayor Cantidad en Stock'. Esto te mostrará los productos que, aunque no sean caros, están ocupando más espacio físico. Son los candidatos perfectos para una oferta '2x1'."
        },
        {
            "title": "Misión: Entrenamiento de Vendedores (Comercial)",
            "periodicity": "Cuándo: Semanalmente",
            "recipe": "Imprime el reporte accionable y conviértelo en un concurso de ventas. Ofrece una comisión o un bono al vendedor que logre mover más unidades de esta lista durante la semana."
        }
    ],
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
    "costo": 7,
    "description": "Este es tu centro de mando unificado. Combina el análisis de Importancia (ABC) con el de Salud (Diagnóstico) en una única vista poderosa para que puedas tomar decisiones complejas que equilibren la rentabilidad, el riesgo y la inversión.",
    "how_it_works": "La herramienta ejecuta internamente los análisis de ABC y de Salud del Stock. Luego, cruza ambos resultados y aplica un modelo de priorización para asignar una 'Prioridad Estratégica' a cada producto, destacando las oportunidades y los riesgos más críticos.",
    "data_requirements": {
        "ventas": ["SKU / Código de producto", "Fecha de venta", "Cantidad vendida", "Precio de venta unitario (S/.)"],
        "inventario": ["SKU / Código de producto", "Nombre del producto", "Categoría", "Marca", "Precio de compra actual (S/.)", "Cantidad en stock actual"]
    },
    "planes_de_accion": [
        {
            "title": "Misión: Revisión Gerencial Semanal",
            "periodicity": "Recomendado: Cada lunes por la mañana",
            "recipe": "Ejecuta el reporte ordenando por 'Prioridad Estratégica'. La lista resultante es tu 'hoja de ruta' para la semana. Enfócate en los 5-10 primeros items para identificar los problemas más urgentes."
        },
        {
            "title": "Misión: Planificación de Inversión Trimestral",
            "periodicity": "Cuándo: Al planificar el presupuesto de compras",
            "recipe": "Usa el reporte para comparar el valor total de tus productos 'Clase A' vs. 'Clase C', y tu inventario 'Saludable' vs. 'En Riesgo'. Esto te ayudará a decidir dónde asignar (o recortar) tu capital de compra."
        },
        {
            "title": "Misión: Optimización de Catálogo Anual",
            "periodicity": "Cuándo: Una vez al año",
            "recipe": "Ordena el reporte por 'Mayor Importancia (Clase ABC)'. Filtra visualmente los productos de 'Clase C' que consistentemente aparecen con un diagnóstico de 'Baja Rotación' o 'Stock Muerto'. Son los candidatos perfectos para ser descontinuados."
        },
        {
            "title": "Misión: Entrenamiento del Equipo de Compras",
            "periodicity": "Cuándo: Durante las capacitaciones de tu equipo",
            "recipe": "Usa el reporte como una herramienta de enseñanza. Elige un producto y muestra cómo sus diferentes métricas (ventas, margen, rotación) se combinan para darle una Clasificación ABC y una Clasificación Diagnóstica. Es la forma perfecta de enseñar a tu equipo a pensar más allá del simple 'comprar lo que se acabó'."
        }
    ],
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
    "description": "Este reporte es tu 'velocímetro' de inventario. Mide la eficiencia y la velocidad con la que tu capital invertido en productos se convierte en ingresos. Responde a la pregunta: '¿Qué tan rápido está trabajando mi dinero para mí?'.",
    "how_it_works": "La herramienta calcula el 'Índice de Importancia' y la 'Cobertura Actual en Días' para cada producto. Luego, los posiciona en una matriz estratégica para identificar cuatro tipos de productos: 'Estrellas', 'Vacas Lecheras', 'Dilemas' y 'Triviales'.",
    "data_requirements": {
        "ventas": ["SKU / Código de producto", "Fecha de venta", "Cantidad vendida", "Precio de venta unitario (S/.)"],
        "inventario": ["SKU / Código de producto", "Nombre del producto", "Categoría", "Marca", "Precio de compra actual (S/.)", "Cantidad en stock actual"]
    },
    "planes_de_accion": [
        {
            "title": "Misión: Identificar a tus 'Vacas Lecheras'",
            "periodicity": "Recomendado: Semanalmente",
            "recipe": "Ejecuta el reporte ordenando por 'Próximos a Agotarse'. Los primeros productos de la lista que también sean 'Clase A' son tus 'Vacas Lecheras'. La misión es asegurar que estos productos NUNCA se agoten."
        },
        {
            "title": "Misión: Cazar los 'Dilemas' (Capital Atrapado)",
            "periodicity": "Cuándo: Mensualmente",
            "recipe": "Ejecuta el reporte ordenando por 'Mayor Inversión en Stock'. Los productos al principio de la lista que sean 'Clase C' y tengan 'Sobre-stock' son tus 'Dilemas'. La misión es crear un plan de liquidación agresivo para ellos."
        },
        {
            "title": "Misión: Análisis Competitivo por Marca",
            "periodicity": "Cuándo: Antes de una negociación importante con un proveedor",
            "recipe": "Filtra el reporte por una 'Marca' específica. Esto te dará un 'radar estratégico' solo para los productos de ese proveedor. ¿Son mayormente 'Estrellas' y 'Vacas Lecheras', o están llenos de 'Dilemas'? Usa esta información para negociar mejores condiciones de compra, devoluciones o apoyo de marketing."
        },
        {
            "title": "Misión: Validación de Nuevos Productos",
            "periodicity": "Cuándo: 3 a 6 meses después de un lanzamiento",
            "recipe": "Filtra el reporte por la 'Categoría' o 'Marca' de los nuevos productos. Esto te mostrará objetivamente si están cumpliendo las expectativas. ¿Están convirtiéndose en 'Estrellas' o están estancándose como 'Dilemas'? Usa estos datos para decidir si duplicas la inversión en ellos o si es mejor descontinuarlos."
        }
    ],
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
    "label": '⚙️ Parámetros de Reposición para POS',
    "endpoint": '/reporte-puntos-alerta-stock',
    # "key": 'ReportePuntosAlertaStock',
    "categoria": "📦 Planificación de Compras Estratégicas",
    "isPro": False,
    "costo": 9,
    "description": "Este reporte es una herramienta de configuración estratégica. Su misión es calcular los Puntos de Alerta de Stock (Mínimo e Ideal) para cada producto, generando un archivo 'maestro' que puedes usar para alimentar tu sistema de punto de venta (POS).",
    "how_it_works": "La herramienta utiliza el Promedio de Venta Diaria (PDA) y el Índice de Importancia de cada producto, junto con los parámetros que defines (tiempo de entrega y días de seguridad), para calcular los niveles de stock óptimos que previenen quiebres sin generar exceso de inventario.",
    "data_requirements": {
        "ventas": ["SKU / Código de producto", "Fecha de venta", "Cantidad vendida"],
        "inventario": ["SKU / Código de producto", "Cantidad en stock actual", "Precio de compra actual (S/.)"]
    },
    "planes_de_accion": [
        {
            "title": "Misión: Configuración Inicial del Sistema",
            "periodicity": "Cuándo: La primera vez que usas la herramienta o al implementar un nuevo POS.",
            "recipe": "Ejecuta el reporte con los parámetros por defecto. Descarga el Excel y usa las columnas 'Punto de Alerta Mínimo (Unds)' y 'Stock Mínimo Sugerido (Unds)' para poblar los campos de 'stock mínimo' y 'punto de reorden' en tu sistema."
        },
        {
            "title": "Misión: Ajuste por Proveedor",
            "periodicity": "Cuándo: Al analizar el rendimiento de un proveedor específico.",
            "recipe": "Filtra tu archivo de inventario para incluir solo los productos de una marca. Sube este archivo y ajusta el 'Tiempo de Entrega' al valor real de ese proveedor (ej. 15 días). Esto te dará los puntos de alerta precisos para esa línea de productos."
        },
        {
            "title": "Misión: Preparación para Temporada Alta",
            "periodicity": "Cuándo: Un mes antes de una temporada de alta demanda.",
            "recipe": "Aumenta los 'Días de Colchón de Seguridad' (ej. de 3 a 7) y el 'Multiplicador de Seguridad para Productos A' (ej. de 1.5 a 2.0). Esto recalculará tus alertas para ser más conservador durante el pico de ventas."
        },
        {
            "title": "Misión: Optimización de Flujo de Caja",
            "periodicity": "Cuándo: Si necesitas reducir la inversión en inventario.",
            "recipe": "Reduce los 'Días de Colchón de Seguridad' a un valor bajo (ej. 1 o 0). Esto te dará puntos de alerta más ajustados, resultando en compras más pequeñas y frecuentes (estrategia 'Just-in-Time')."
        }
    ],
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
    "costo": 9,
    "description": "Este es tu asistente de compras diario o semanal. Toma los parámetros de alerta y los compara con tu stock actual para generar una lista de compra priorizada y cuantificada.",
    "how_it_works": "La herramienta identifica todos los productos cuyo stock actual está por debajo de su punto de alerta. Luego, calcula la cantidad ideal a pedir para cada uno, considerando su velocidad de venta, importancia y los parámetros de cobertura que has definido.",
    "data_requirements": {
        "ventas": ["SKU / Código de producto", "Fecha de venta", "Cantidad vendida", "Precio de venta unitario (S/.)"],
        "inventario": ["SKU / Código de producto", "Cantidad en stock actual", "Precio de compra actual (S/.)"]
    },
    "planes_de_accion": [
        {
            "title": "Misión: Compra de Emergencia (Evitar Pérdidas)",
            "periodicity": "Recomendado: Diariamente o cada dos días.",
            "recipe": "Ejecuta el reporte ordenando por 'Más Urgente (Stock vs Alerta)'. La lista resultante son los productos en 'código rojo'. Cómpralos inmediatamente para no perder ventas."
        },
        {
            "title": "Misión: Compra Semanal Optimizada",
            "periodicity": "Cuándo: Semanalmente, al planificar tu pedido principal.",
            "recipe": "Ejecuta el reporte ordenando por 'Mayor Importancia'. Asegúrate de reponer todos tus productos 'Clase A'. Para los de 'Clase C', puedes decidir posponer la compra si tu presupuesto es limitado."
        },
        {
            "title": "Misión: Negociación con Proveedores",
            "periodicity": "Cuándo: Antes de enviar una orden de compra.",
            "recipe": "Filtra por la 'Marca' de un proveedor. La lista resultante es tu 'proforma' inicial. Usa los datos de 'Índice de Importancia' y 'Cobertura' para negociar descuentos o condiciones."
        },
        {
            "title": "Misión: Simulación de Inversión",
            "periodicity": "Cuándo: Al planificar el presupuesto de compras del mes.",
            "recipe": "Ejecuta el reporte con tus parámetros de cobertura ideales. El KPI 'Inversión Total Sugerida' te dará una estimación precisa del capital que necesitarás para mantener tu inventario en un estado óptimo."
        }
    ],
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