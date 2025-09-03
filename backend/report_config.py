# ===================================================================================
# --- CONFIGURACIÓN CENTRAL DEFINITIVA ---
# ===================================================================================
REPORTS_CONFIG = {
  # "🧠 Análisis Estratégico": [
  # "ReporteAuditoriaInventario": {
  #     "label": 'Auditoría de Eficiencia de Inventario',
  #     "endpoint": '/auditoria-inventario',
  #     "isPro": False,
  #     "costo": 0, # La auditoría inicial es gratuita
  #     "categoria": "Auditoría",
  #     "basic_parameters": [], # No tiene parámetros
  #     "advanced_parameters": []
  # },
  "ReporteAuditoriaMargenes": {
      "label": '💸 Auditoría de Desviación de Margen',
      "endpoint": '/auditoria-margenes',
      "isPro": False, # Es un reporte "Estratega"
      "costo": 5,
      "categoria": "📋 Auditorías de Datos",
      "description": "Este reporte es tu \"detector de fugas de rentabilidad\". Su misión es encontrar productos que no se están vendiendo al precio que deberían, ya sea porque te están generando pérdidas directas (margen negativo) o porque estás dejando dinero sobre la mesa (desviación negativa). Es una herramienta fundamental para auditar tu política de precios y la ejecución en el punto de venta.",
      "how_it_works": "La herramienta compara dos márgenes para cada producto: el \"Margen Teórico\" (basado en tu precio de lista) y el \"Margen Real\" (basado en tu historial de ventas). La diferencia entre ambos revela inconsistencias en tu política de precios o en la ejecución en el punto de venta.",
      "planes_de_accion": [
          {
              "title": "Misión: Taponar las Fugas de Dinero (Financiero)",
              "periodicity": "Recomendado: Mensualmente",
              "recipe": "Ejecuta el reporte con el parámetro \"Buscar productos con: Margen Negativo\". La lista resultante son los productos que te están costando dinero en cada venta. La acción es inmediata: revisa y corrige sus precios de venta en tu sistema o considera descontinuarlos."
          },
          {
              "title": "Misión: Auditoría de Descuentos y Errores (Operativo)",
              "periodicity": "Cuándo: Semanalmente o quincenalmente",
              "recipe": "Ejecuta el reporte con el parámetro \"Buscar productos con: Desviación Negativa\" y ordena por \"Mayor Desviación Porcentual (%)\". Los primeros productos de la lista son tus \"casos de estudio\": ¿Hubo un error de tipeo en una factura? ¿Un vendedor aplicó un descuento no autorizado? ¿El precio de lista en tu sistema es incorrecto? Es una herramienta forense para mejorar tus procesos."
          },
          {
              "title": "Misión: Maximizar la Rentabilidad Oculta (Comercial)",
              "periodicity": "Cuándo: Trimestralmente, al planificar estrategias de precios",
              "recipe": "Ejecuta el reporte con el parámetro \"Buscar productos con: Desviación Negativa\" y ordena por \"Mayor Impacto Financiero (S/.)\". El KPI \"Ganancia 'Perdida'\" te dirá exactamente cuánto dinero dejaste de ganar. Usa esta lista para re-entrenar a tu equipo de ventas sobre la importancia de defender el margen en tus productos más importantes."
          },
          {
              "title": "Misión: Revisión de Precios de Proveedores (Compras)",
              "periodicity": "Cuándo: Después de recibir nuevas listas de precios",
              "recipe": "Filtra el reporte por la \"Marca\" del proveedor. Si ves una alta \"Desviación Negativa\" en sus productos, es una señal de que sus costos han subido pero tú no has actualizado tus precios de venta al público. Este reporte es tu recordatorio para ajustar tus precios y proteger tu rentabilidad."
          }
      ],
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
              "name": "periodo_analisis_dias",
              "label": "Analizar ventas de los últimos",
              "type": "select",
              "defaultValue": 30,
              "tooltip_key": "periodo_analisis_margen",
              "options": [
                  { "value": 30, "label": "30 días" },
                  { "value": 90, "label": "90 días" },
                  { "value": 180, "label": "180 días" },
                  { "value": 0, "label": "Todo el historial" }
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
      "detalle_columns": [
          "SKU / Código de producto", "Nombre del producto", "Categoría", "Subcategoría", "Marca",
          "Precio de compra actual (S/.)", "Precio Venta de Lista (S/.)", "Precio Venta Promedio (S/.)",
          "Margen Teórico (S/.)", "Margen Real (S/.)", "Desviación de Margen (%)", "Cantidad vendida", "Impacto Financiero Total (S/.)"
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
      "description": "Este reporte es el 'mantenimiento preventivo' de tu base de datos. Su misión es encontrar 'ruido' en tu catálogo: productos que existen en tu sistema pero no en la realidad de tu negocio (fantasmas), o productos con información crítica faltante. Un catálogo limpio es la base para que todos los demás análisis sean precisos y fiables.",
      "how_it_works": "La herramienta cruza tu lista de inventario con tu historial de ventas para encontrar discrepancias. Adicionalmente, escanea tu inventario en busca de campos de datos esenciales que estén vacíos o con valores incorrectos (como un precio de compra en cero).",
      "planes_de_accion": [
          {
              "title": "Misión: La Gran Depuración Anual (Limpieza General)",
              "periodicity": "Recomendado: Una vez al año",
              "recipe": "Ejecuta el diagnóstico en modo \"Productos 'Fantasma' (que nunca se han vendido)\" y \"Productos 'Obsoletos' (agotados y sin ventas recientes)\". La lista resultante es tu plan de trabajo para depurar tu sistema de punto de venta, eliminando o desactivando SKUs que ya no son relevantes. Esto acelera tu sistema y reduce la posibilidad de errores."
          },
          {
              "title": "Misión: Rescate de Capital Oculto (Financiero)",
              "periodicity": "Cuándo: Trimestralmente",
              "recipe": "Ejecuta el diagnóstico en modo \"Productos 'Fantasma'\" y aplica el filtro \"Mostrar solo con Stock > 0\". Ordena el resultado por \"Mayor Valor Inmovilizado\". La lista que obtienes es, literalmente, dinero acumulando polvo en tu almacén. La misión es crear un plan de liquidación inmediato para estos productos."
          },
          {
              "title": "Misión: Fortalecer la Base de Datos (Calidad de Datos)",
              "periodicity": "Cuándo: Mensualmente",
              "recipe": "Ejecuta el diagnóstico en modo \"Productos con Datos Incompletos\" y selecciona todos los criterios (Marca Faltante, Categoría Faltante, Precio de Compra en Cero). La lista resultante es tu \"checklist de correcciones\". Dedica una hora a completar esta información en tu sistema. Cada campo que llenes hará que todos tus reportes de rentabilidad y estrategia sean más precisos."
          },
          {
              "title": "Misión: Optimización de la Experiencia Online (E-commerce)",
              "periodicity": "Cuándo: Antes de una campaña de marketing digital",
              "recipe": "Ejecuta el diagnóstico en modo \"Productos con Datos Incompletos\", enfocándote en \"Categoría Faltante\" y \"Marca Faltante\". Un catálogo con estos datos completos permite a tus clientes usar los filtros de tu tienda online de manera más efectiva, mejorando su experiencia de compra y aumentando la conversión."
          }
      ],
      "basic_parameters": [
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
      "description": "Este reporte es el 'mantenimiento preventivo' de tu base de datos. Su misión es encontrar 'ruido' en tu catálogo: productos con información crítica faltante o inconsistente. Un catálogo limpio es la base para que todos los demás análisis sean precisos y fiables.",
      "how_it_works": "La herramienta escanea tu archivo de inventario en busca de problemas comunes como campos vacíos (Marca, Categoría), valores ilógicos (Precio de Compra en Cero), inconsistencias de rentabilidad (Precio de Venta menor al Costo) o registros duplicados.",
      "planes_de_accion": [
          {
              "title": "Misión: Fortalecer la Base de Datos (Limpieza General)",
              "periodicity": "Recomendado: Mensualmente",
              "recipe": "Ejecuta el reporte seleccionando todos los criterios de auditoría. La lista resultante es tu 'checklist de correcciones'. Dedica una hora a completar esta información en tu sistema. Cada campo que llenes hará que todos tus reportes de rentabilidad y estrategia sean más precisos."
          },
          {
              "title": "Misión: Auditoría de Rentabilidad",
              "periodicity": "Cuándo: Antes de fijar precios o lanzar promociones.",
              "recipe": "Selecciona únicamente el criterio 'Precio de Venta < Costo'. Esto te mostrará los productos que te están generando pérdidas directas. Es una auditoría financiera crítica para proteger tus márgenes."
          },
          {
              "title": "Misión: Unificación de Catálogo",
              "periodicity": "Cuándo: Trimestralmente o si sospechas de errores.",
              "recipe": "Selecciona el criterio 'Nombres de Producto Duplicados'. Esto revela si tienes el mismo item físico registrado con múltiples SKUs. Unificar estos registros es crucial para que tus cálculos de stock y ventas sean correctos."
          },
          {
              "title": "Misión: Optimización de la Experiencia Online",
              "periodicity": "Cuándo: Antes de una campaña de marketing digital.",
              "recipe": "Selecciona los criterios 'Marca Faltante' y 'Categoría Faltante'. Un catálogo con estos datos completos permite a tus clientes usar los filtros de tu tienda online de manera más efectiva, mejorando su experiencia de compra y aumentando la conversión."
          }
      ],
      "basic_parameters": [
          {
              "name": "ordenar_por",
              "label": "Priorizar y Ordenar Por",
              "type": "select",
              "defaultValue": "valor_stock_s",
              "tooltip_key": "ordenar_auditoria_por",
              "options": [
                  { "value": "valor_stock_s", "label": "Mayor Valor Inmovilizado" },
                  { "value": "stock_actual_unds", "label": "Mayor Stock Actual" }
              ]
          },
          {
              "name": "criterios_auditoria_json",
              "label": "Auditar productos con...",
              "type": "multi-select",
              "optionsKey": "criterios_auditoria", # Usaremos una clave estática
              "tooltip_key": "criterios_auditoria",
              "defaultValue": ["marca_faltante", "categoria_faltante", "precio_compra_cero", "precio_venta_menor_costo", "nombres_duplicados"],
              # Opciones estáticas, ya que no dependen de los datos del usuario
              "static_options": [
                  { "value": "marca_faltante", "label": "Marca Faltante" },
                  { "value": "categoria_faltante", "label": "Categoría Faltante" },
                  { "value": "precio_compra_cero", "label": "Precio de Compra en Cero" },
                  { "value": "precio_venta_menor_costo", "label": "Precio de Venta menor al Costo" },
                  { "value": "nombres_duplicados", "label": "Nombres de Producto Duplicados" }
              ]
          },
          { "name": "incluir_solo_categorias", "label": "Filtrar por Categorías", "type": "multi-select", "optionsKey": "categorias", "defaultValue": [], "tooltip_key": "filtro_categorias" },
          { "name": "incluir_solo_marcas", "label": "Filtrar por Marcas", "type": "multi-select", "optionsKey": "marcas", "defaultValue": [], "tooltip_key": "filtro_marcas" }
      ],
      "advanced_parameters": [],
      "accionable_columns": [
          "SKU / Código de producto", "Nombre del producto", "Problema Detectado",
          "Stock Actual (Unds)", "Valor stock (S/.)"
      ],
      "detalle_columns": [
        "SKU / Código de producto", "Nombre del producto", "Categoría", "Subcategoría", "Marca",
        "Stock Actual (Unds)", "Valor stock (S/.)", "Problema Detectado"
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
    "processing_function_name": 'process_csv_abc',
    "endpoint": '/abc',
    "key": 'ReporteABC',
    "isPro": False,
    "costo": 8,
    "url_key": "abc-analysis",
    "categoria": "🧠 Análisis Estratégico",
    "description": "Aplica el principio de Pareto (80/20) a tu inventario, clasificando cada producto en Clases (A, B, C) para revelar cuáles son los pocos items vitales que generan la mayor parte de tu valor.",
    "how_it_works": "La herramienta calcula el valor de cada producto según el criterio que elijas (margen, ingresos o unidades). Luego, los ordena y calcula el porcentaje acumulado para asignar la clasificación: el 80% del valor son Clase A, el siguiente 15% son Clase B, y el 5% final son Clase C.",
    "planes_de_accion": [
        {
            "title": "Misión: Proteger a tus Estrellas (Gestión de Riesgo)",
            "periodicity": "Recomendado: Semanalmente",
            "recipe": "Ejecuta el reporte con el criterio \"Por Margen de Ganancia\". La lista de tus productos \"Clase A\" son los que pagan las facturas y financian el crecimiento. La misión es simple: estos productos NUNCA deben agotarse. Revisa sus niveles de stock y sus Puntos de Alerta en tu sistema POS. Un quiebre de stock en uno de estos items es una pérdida directa de rentabilidad y una oportunidad para que un cliente fiel se vaya a la competencia."
        },
        {
            "title": "Misión: Rediseño de Tienda (Visual Merchandising)",
            "periodicity": "Cuándo: Cada 3-6 meses, al reorganizar la tienda",
            "recipe": "Ejecuta el reporte por \"Unidades Vendidas\". Tus productos \"Clase A\" son los más populares y los que la gente viene a buscar. ¿Están en la ubicación más privilegiada de tu tienda? ¿A la altura de la vista? ¿En los estantes principales o cerca de la caja? Usa esta lista para optimizar la distribución física de tu local y maximizar las ventas por impulso."
        },
        {
            "title": "Misión: Catálogo Inteligente (Estrategia de Compras)",
            "periodicity": "Cuándo: Al planificar las compras del próximo trimestre",
            "recipe": "Ejecuta el reporte por \"Ingresos\". Ahora, enfócate en tu \"Clase C\". Estos son los productos que, aunque se vendan, aportan muy poco a tu facturación total. ¿Hay items aquí que te generan muchos problemas (ocupan mucho espacio, tienen devoluciones, requieren pedidos mínimos altos)? Son los candidatos perfectos para ser descontinuados. Usa los datos para limpiar y optimizar tu catálogo, liberando capital y espacio."
        },
        {
            "title": "Misión: Negociación Estratégica con Proveedores (Compras Avanzadas)",
            "periodicity": "Cuándo: Antes de una reunión o negociación importante",
            "recipe": "Ejecuta el reporte por \"Margen de Ganancia\" y filtra por la \"Marca\" de un proveedor específico. La lista resultante te muestra cuáles de sus productos son realmente \"Clase A\" para tu negocio. Usa esta información como una poderosa herramienta de negociación: \"Estos son los productos que más rentabilidad me generan de tu línea. Necesito un mejor precio de compra por volumen para estos items específicos si quieres que aumente mi pedido total\"."
        },
        {
            "title": "Misión: Campaña de Marketing Enfocada (Ventas y Marketing)",
            "periodicity": "Cuándo: Mensualmente, al planificar tus promociones",
            "recipe": "Ejecuta el reporte por \"Unidades Vendidas\". La lista de tus productos \"Clase A\" y \"Clase B\" es tu \"mina de oro\" para el marketing. En lugar de promocionar productos de baja rotación, enfoca tus campañas (volantes, redes sociales, anuncios) en estos \"ganadores\". La misión es simple: vende más de lo que ya se vende bien."
        },
        {
            "title": "Misión: Optimización del Almacén (Logística y Operaciones)",
            "periodicity": "Cuándo: Trimestralmente",
            "recipe": "Ejecuta el reporte por \"Unidades Vendidas\". Usa la \"Clase A\" para implementar un sistema de \"conteo cíclico\". En lugar de cerrar la tienda un día entero para un inventario general, cuenta tus pocos productos de Clase A mucho más frecuentemente (ej. semanalmente) y los de Clase C con menos frecuencia (ej. semestralmente). Esto reduce drásticamente el tiempo de inventario y minimiza las discrepancias en tus productos más críticos."
        },
        {
            "title": "Misión: Liberación de \"Capital Perezoso\" (Financiero)",
            "periodicity": "Cuándo: Trimestralmente",
            "recipe": "Ejecuta el reporte por \"Margen de Ganancia\". Ahora, mira tus productos de \"Clase C\" y ordena por \"Valor de Stock\". Incluso si no son \"Stock Muerto\", estos productos son \"capital perezoso\": dinero que está trabajando muy lentamente. La misión es identificar los 10 items de Clase C con mayor valor de stock y crear un plan para reducir su inventario a la mitad, liberando ese flujo de caja para invertirlo en tus productos de Clase A."
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
    "key": 'ReporteDiagnosticoStockMuerto',
    "url_key": "dead-stock",
    "processing_function_name": 'procesar_stock_muerto',
    "categoria": "🧠 Análisis Estratégico",
    "isPro": False,
    "costo": 8,
    "description": "Identifica los productos que no han rotado en un período determinado, representando capital inmovilizado y ocupando espacio valioso en tu almacén.",
    "how_it_works": "El análisis calcula los días transcurridos desde la última venta de cada producto con stock y lo compara contra un umbral (por defecto o personalizado) para clasificarlo como 'Stock Muerto'.",
    "planes_de_accion": [
        {
            "title": "Misión: Rescate de Capital (Financiero)",
            "periodicity": "Recomendado: Mensualmente, al revisar las finanzas",
            "recipe": "Ejecuta el reporte ordenando por \"Mayor Valor Inmovilizado\". La lista resultante son tus prioridades #1. Enfócate en los 5 primeros: cada sol que recuperes de estos productos es un sol que puedes reinvertir en inventario que sí rota."
        },
        {
            "title": "Misión: Guerra de Espacio (Logístico)",
            "periodicity": "Cuándo: Cuando el almacén esté lleno o llegue un pedido grande",
            "recipe": "Ejecuta el reporte ordenando por \"Mayor Cantidad en Stock\". Esto te mostrará los productos que, aunque no sean caros, están ocupando más espacio físico. Son los candidatos perfectos para una oferta \"2x1\" o para moverlos a una zona de liquidación en la entrada de la tienda."
        },
        {
            "title": "Misión: Entrenamiento de Vendedores (Comercial)",
            "periodicity": "Cuándo: Semanalmente, en la reunión con tu equipo de ventas",
            "recipe": "Imprime el reporte accionable. Conviértelo en un \"concurso de ventas\": ofrece una pequeña comisión o un bono al vendedor que logre mover más unidades de esta lista durante la semana. Es una forma gamificada de liquidar stock."
        },
        {
            "title": "Misión: Misión: Creación de Combos y Kits (Venta Cruzada)",
            "periodicity": "Cuándo: Trimestralmente, al planificar nuevas ofertas",
            "recipe": "Identifica en la lista de stock muerto un producto complementario a un \"producto estrella\" (un 'Clase A' de tu reporte ABC). Por ejemplo, si tienes un tipo de broca que no se vende, crea un \"Kit de Taladro Profesional\" que incluya el taladro (tu producto estrella) con esa broca \"de regalo\". Es una forma de mover stock muerto sin devaluar tu marca con descuentos directos."
        },
        {
            "title": "Misión: Misión: Conquista Digital (E-commerce y Marketplaces)",
            "periodicity": "Cuándo: Al planificar tu estrategia de venta online",
            "recipe": "A veces, un producto es \"stock muerto\" en tu tienda física pero tiene un nicho de mercado online. Usa la lista de stock muerto como tu catálogo para experimentar en plataformas como Mercado Libre o Facebook Marketplace. Crea publicaciones atractivas para estos productos a un precio de liquidación. Es una forma de llegar a un público nuevo y recuperar capital."
        },
        {
            "title": "Misión: Diálogo con Proveedores (Negociación)",
            "periodicity": "Cuándo: Antes de una reunión o negociación con un proveedor clave",
            "recipe": "Filtra el reporte por la \"Marca\" de tu proveedor. Si tienes una cantidad significativa de su producto como stock muerto, usa esta lista como una poderosa herramienta de negociación. Propón una devolución parcial a cambio de una nueva compra, o solicita notas de crédito o apoyo con material de marketing para ayudarte a liquidar el inventario."
        },
        {
            "title": "Misión: Optimización Fiscal y Social (Financiero Avanzado)",
            "periodicity": "Cuándo: Anualmente, antes del cierre fiscal",
            "recipe": "Ejecuta el reporte ordenando por \"Más Antiguo\". Para los productos que llevan más de uno o dos años sin venderse y cuyo valor es bajo, la liquidación puede ser más costosa que el beneficio. Considera la opción de donarlos a una institución técnica local o a una ONG. Consulta con tu contador: esta acción no solo genera buena voluntad, sino que a menudo puede ser registrada como una pérdida o un gasto deducible de impuestos, convirtiendo un problema en un beneficio fiscal y de imagen."
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
    "detalle_columns": [
        "SKU / Código de producto", "Nombre del producto", "Categoría", "Subcategoría", "Marca",
        "Precio Compra (S/.)", "Stock Actual (Unds)", "Valor stock (S/.)", "Ventas totales (Unds)",
        "Ventas últimos 3m (Unds)", "Última venta", "Días sin venta", "Días para Agotar Stock (Est.3m)",
        "Clasificación Diagnóstica", "Prioridad y Acción (DAS 3m)"
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
    "costo": 8,
    "description": "Este es tu centro de mando unificado. Combina el análisis de Importancia (ABC) con el de Salud (Diagnóstico) en una única vista poderosa. Su misión es darte una radiografía completa de cada producto en tu inventario para que puedas tomar decisiones complejas que equilibren la rentabilidad, el riesgo y la inversión.",
    "how_it_works": "La herramienta ejecuta internamente los análisis de ABC y de Salud del Stock. Luego, cruza ambos resultados y aplica un modelo de priorización para asignar una \"Prioridad Estratégica\" a cada producto, destacando las oportunidades y los riesgos más críticos.",
    "planes_de_accion": [
        {
            "title": "Misión: Revisión Gerencial Semanal",
            "periodicity": "Recomendado: Cada lunes por la mañana para establecer las prioridades de la semana",
            "recipe": "Ejecuta el reporte con los parámetros por defecto, ordenando por \"Prioridad Estratégica\". La lista resultante es tu \"hoja de ruta\" para la semana. Enfócate en los 5-10 primeros items: te dirán si el problema más urgente es un quiebre de stock de un producto \"Clase A\" o un exceso de inventario en un producto costoso."
        },
        {
            "title": "Misión: Planificación de Inversión Trimestral",
            "periodicity": "Al planificar el presupuesto de compras para el próximo trimestre",
            "recipe": "Usa el reporte para analizar el Valor stock (S/.) de diferentes segmentos. Compara el valor total de tus productos \"Clase A\" vs. \"Clase C\", y el valor de tu inventario \"Saludable\" vs. \"En Riesgo\". Esto te ayudará a decidir dónde asignar (o recortar) tu capital de compra para maximizar el retorno."
        },
        {
            "title": "Misión: Optimización de Catálogo Anual",
            "periodicity": "Cuándo: Una vez al año, para una limpieza profunda del catálogo",
            "recipe": "Ordena el reporte por \"Mayor Importancia (Clase ABC)\". Filtra visualmente los productos de \"Clase C\" que consistentemente aparecen con un diagnóstico de \"Baja Rotación\" o \"Stock Muerto\". Estos son los candidatos perfectos para ser descontinuados, liberando capital y espacio."
        },
        {
            "title": "Misión: Entrenamiento del Equipo de Compras",
            "periodicity": "Cuándo: Durante las capacitaciones de tu equipo",
            "recipe": "Usa el reporte como una herramienta de enseñanza. Elige un producto y muestra cómo sus diferentes métricas (ventas, margen, rotación) se combinan para darle una Clasificación ABC y una Clasificación Diagnóstica. Es la forma perfecta de enseñar a tu equipo a pensar más allá del simple \"comprar lo que se acabó\"."
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
        "Clasificación Diagnóstica", "Prioridad Estratégica", "Días sin venta"
    ],
    "detalle_columns": [
        "SKU / Código de producto", "Nombre del producto", "Categoría", "Subcategoría", "Marca",
        "Valor stock (S/.)", "Stock Actual (Unds)", "Días sin venta", "Margen Total (S/.)",
        "Ventas últimos 3m (Unds)", "Última venta", "Clasificación ABC", "Prioridad Estratégica",
        "Clasificación Diagnóstica"
    ],
    "preview_details": [
        { "label": "Clasificación ABC", "data_key": "Clasificación ABC" },
        { "label": "Diagnóstico de Salud", "data_key": "Clasificación Diagnóstica" },
        { "label": "Prioridad", "data_key": "Prioridad Estratégica" },
        { "label": "Días sin venta", "data_key": "Días sin venta", "suffix": " días" }
    ]
  },
  "ReporteAnalisisEstrategicoRotacion": {
    "label": '🔄 Análisis Estratégico de Rotación (BCG)',
    "endpoint": '/rotacion-general-estrategico',
    "key": 'ReporteAnalisisEstrategicoRotacion',
    "categoria": "🧠 Análisis Estratégico",
    "url_key": "inventory-turnover",
    "processing_function_name": 'process_csv_analisis_estrategico_rotacion',
    "isPro": False,
    "costo": 8,
    "description": "Este reporte es tu \"velocímetro\" de inventario. Mide la eficiencia y la velocidad con la que tu capital invertido en productos se convierte en ingresos. Responde a la pregunta fundamental: \"¿Qué tan rápido está trabajando mi dinero para mí?\".",
    "how_it_works": "La herramienta calcula el Índice de Importancia y la Cobertura Actual (Días) para cada producto. Luego, los posiciona en una matriz estratégica para identificar cuatro tipos de productos: \"Estrellas\" (alta importancia, buena rotación), \"Vacas Lecheras\" (alta importancia, riesgo de quiebre), \"Perros\" (baja importancia, sobre-stock) y \"Dilemas\".",
    "planes_de_accion": [
        {
            "title": "Misión: Identificar a tus \"Vacas Lecheras\"",
            "periodicity": "Recomendado: Semanalmente, para proteger tus ingresos.",
            "recipe": "Ejecuta el reporte ordenando por \"Próximos a Agotarse (Cobertura)\". Los primeros productos de la lista que también tengan una \"Clasificación\" de \"Clase A\" son tus \"Vacas Lecheras\". La misión es asegurar que estos productos NUNCA se agoten, ya que son tu fuente de ingresos más constante y fiable."
        },
        {
            "title": "Misión: Identificar los \"Perros\" (Capital Atrapado)",
            "periodicity": "Cuándo: Mensualmente, para liberar flujo de caja.",
            "recipe": "Ejecuta el reporte ordenando por \"Mayor Inversión en Stock\". Los productos al principio de la lista que tengan una \"Clasificación\" de \"Clase C\" o \"D\" y una \"Alerta de Stock\" de \"Sobre-stock\" son tus \"Perros\". La misión es crear un plan de liquidación agresivo para estos 5-10 primeros items."
        },
        {
            "title": "Misión: Análisis Competitivo por Marca",
            "periodicity": "Cuándo: Antes de una negociación importante con un proveedor",
            "recipe": "Filtra el reporte por una \"Marca\" específica. Esto te dará un \"radar estratégico\" solo para los productos de ese proveedor. ¿Son mayormente \"Estrellas\" y \"Vacas Lecheras\", o están llenos de \"Perros\"? Usa esta información para negociar mejores condiciones de compra, devoluciones o apoyo de marketing."
        },
        {
            "title": "Misión: Validación de Nuevos Productos",
            "periodicity": "Cuándo: 3 a 6 meses después de lanzar una nueva línea de productos",
            "recipe": "Filtra el reporte por la \"Categoría\" o \"Marca\" de los nuevos productos. Esto te mostrará objetivamente si están cumpliendo las expectativas. ¿Están convirtiéndose en \"Estrellas\" o están estancándose como \"Perros\"? Usa estos datos para decidir si duplicas la inversión en ellos o si es mejor descontinuarlos."
        }
    ],
    "basic_parameters": [
      { 
        "name": 'sort_by', "label": 'Priorizar y Ordenar Por', "type": 'select',
        "tooltip_key": "sort_by_rotacion",
        "options": [
          { "value": 'Importancia_Dinamica', "label": 'Índice de Importancia (Recomendado)' },
          { "value": "Tendencia de Crecimiento (%)", "label": "Mayor Tendencia de Crecimiento" },
          { "value": "Inversion_Stock_Actual", "label": "Mayor Inversión en Stock" },
          { "value": "Dias_Cobertura_Stock_Actual", "label": "Próximos a Agotarse (Cobertura)" }
        ],
        "defaultValue": 'Importancia_Dinamica'
      },
      { "name": 'filtro_categorias_json', "label": 'Filtrar por Categorías', "type": 'multi-select', "optionsKey": 'categorias', "tooltip_key": 'filtro_categorias', "defaultValue": [] },
      { "name": 'filtro_marcas_json', "label": 'Filtrar por Marcas', "type": 'multi-select', "optionsKey": 'marcas', "tooltip_key": 'filtro_marcas', "defaultValue": [] },
      {
        "name": "filtro_bcg_json",
        "label": "Mostrar solo productos clasificados como...",
        "type": "multi-select",
        "optionsKey": "filtro_bcg",
        "tooltip_key": "filtro_bcg",
        "defaultValue": [],
        "static_options": [
            { "value": "🌟 Estrella", "label": "🌟 Estrella" },
            { "value": "🐄 Vaca Lechera", "label": "🐄 Vaca Lechera" },
            { "value": "❓ Dilema", "label": "❓ Dilema" },
            { "value": "🐕 Perro", "label": "🐕 Perro" }
        ]
      }
    ],
    "advanced_parameters": [
      { 
        "name": "min_valor_stock", 
        "label": "Mostrar solo si la inversión en stock supera (S/.)", 
        "type": "number", 
        "defaultValue": 0,
        "tooltip_key": "filtro_inversion"
      },
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
        "SKU / Código de producto",
        "Nombre del producto",
        "Clasificación BCG",
        "Índice de Importancia",
        "Tendencia de Crecimiento (%)",
        "Cobertura Actual (Días)"
    ],

    "detalle_columns": [
        "SKU / Código de producto", "Nombre del producto", "Categoría", "Subcategoría", "Marca",
        "Clasificación BCG", "Índice de Importancia", "Tendencia de Crecimiento (%)", "Stock Actual (Unds)",
        "Precio Compra (S/.)", "Precio Venta (S/.)", "Inversión Stock Actual (S/.)", "Cobertura Actual (Días)",
        "Alerta de Stock", "Ventas Recientes (30d) (Unds)", "Ventas Periodo General (180d) (Unds)"
        # PDA_Final PDA_Demanda_Estrategica Precio de Venta Promedio Reciente
    ],
    "preview_details": [
        { "label": "Clasificación BCG", "data_key": "Clasificación BCG" },
        { "label": "Índice de Importancia", "data_key": "Índice de Importancia" },
        { "label": "Tendencia de Crecimiento", "data_key": "Tendencia de Crecimiento (%)", "suffix": "%" },
        { "label": "Cobertura Actual", "data_key": "Cobertura Actual (Días)", "suffix": " días" }
    ]

  },


  # "📦 Planificación de Compras Estratégicas"
  "ReportePuntosAlertaStock": {
    "label": '⚙️ Parámetros de Reposición para POS',
    "endpoint": '/reporte-puntos-alerta-stock',
    # "key": 'ReportePuntosAlertaStock',
    "categoria": "📦 Planificación de Compras Estratégicas",
    "isPro": False,
    "costo": 15,
    "description": "Este reporte es una herramienta de configuración estratégica. Su misión es calcular los Puntos de Alerta de Stock (Mínimo e Ideal) para cada producto, generando un archivo 'maestro' que puedes usar para alimentar tu sistema de punto de venta (POS).",
    "how_it_works": "La herramienta utiliza el Promedio de Venta Diaria (PDA) y el Índice de Importancia de cada producto, junto con los parámetros que defines (tiempo de entrega y días de seguridad), para calcular los niveles de stock óptimos que previenen quiebres sin generar exceso de inventario.",
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
    "costo": 15,
    "description": "Este es tu asistente de compras diario o semanal. Toma los parámetros de alerta y los compara con tu stock actual para generar una lista de compra priorizada y cuantificada.",
    "how_it_works": "La herramienta identifica todos los productos cuyo stock actual está por debajo de su punto de alerta. Luego, calcula la cantidad ideal a pedir para cada uno, considerando su velocidad de venta, importancia y los parámetros de cobertura que has definido.",
    "planes_de_accion": [
        {
            "title": "Misión: Compra de Emergencia (Evitar Pérdidas)",
            "periodicity": "Recomendado: Diariamente o cada dos días",
            "recipe": "Ejecuta el reporte ordenando por \"Más Urgente (Stock vs Alerta)\". La lista resultante son los productos en \"código rojo\". Cómpralos inmediatamente para no perder ventas por quiebre de stock."
        },
        {
            "title": "Misión: Compra Semanal Optimizada",
            "periodicity": "Cuándo: Semanalmente, al planificar tu pedido principal",
            "recipe": "Ejecuta el reporte ordenando por \"Mayor Importancia\". Asegúrate de reponer todos tus productos \"Clase A\", ya que son el motor de tu negocio. Para los de \"Clase C\", puedes decidir posponer la compra si tu presupuesto es limitado."
        },
        {
            "title": "Misión: Negociación con Proveedores",
            "periodicity": "Cuándo: Antes de enviar una orden de compra",
            "recipe": "Filtra por la \"Marca\" de un proveedor. La lista resultante es tu \"proforma\" inicial. Usa los datos de \"Índice de Importancia\" y \"Cobertura\" para negociar descuentos por volumen o mejores condiciones de compra."
        },
        {
            "title": "Misión: Simulación de Inversión",
            "periodicity": "Cuándo: Al planificar el presupuesto de compras del mes",
            "recipe": "Ejecuta el reporte con tus parámetros de cobertura ideales. El KPI \"Inversión Total Sugerida\" te dará una estimación precisa del capital de trabajo que necesitarás para mantener tu inventario en un estado óptimo."
        },
        {
            "title": "Misión: Flujo de Caja Inteligente (Modo Supervivencia)",
            "periodicity": "Recomendado: Cuando el presupuesto es ajustado",
            "recipe": "Ejecuta el reporte como de costumbre. En el resultado, ignora la columna \"Pedido Ideal Sugerido\" y enfócate en la de \"Pedido Mínimo Sugerido\". Esta columna te dice la cantidad mínima que necesitas comprar para \"sobrevivir\" hasta tu próximo ciclo de compra sin sufrir quiebres de stock. Es la estrategia perfecta para optimizar el flujo de caja."
        },
        {
            "title": "Misión: Preparación para Campaña de Marketing",
            "periodicity": "Cuándo: Antes de lanzar una promoción (ej. \"Mes del Pintor\")",
            "recipe": "Filtra el reporte por las \"Categorías\" o \"Marcas\" que planeas promocionar. La lista resultante es tu \"checklist de stock pre-campaña\". Considera aumentar temporalmente los \"Días de Cobertura Ideal\" en los parámetros avanzados para asegurar que tienes suficiente inventario para manejar el pico de ventas esperado."
        },
        {
            "title": "Misión: Consolidación de Pedido a Proveedor",
            "periodicity": "Cuándo: Al preparar una compra grande para un solo proveedor",
            "recipe": "Filtra el reporte por la \"Marca\" del proveedor. Revisa el KPI \"Inversión Total Sugerida\" para esa marca. Si estás cerca de alcanzar el monto para un descuento por volumen o envío gratis, usa el reporte \"🎯 Optimizador de Pedido por Línea\" (del plan Estratega) para que la IA te sugiera inteligentemente qué otros productos de esa marca añadir a tu carrito."
        },
        {
            "title": "Misión: Auditoría de la Velocidad de Venta (PDA)",
            "periodicity": "Cuándo: Cuando una sugerencia de pedido te parezca demasiado alta o baja",
            "recipe": "Este plan te enseña cómo piensa la herramienta. Ejecuta el reporte. Si una sugerencia te parece extraña, mira la columna \"Promedio Venta Diaria (Unds)\" (PDA). ¿Refleja la realidad de tu negocio? Si no, considera ajustar los \"Períodos de Análisis\" en los parámetros avanzados para que el PDA sea más preciso para el comportamiento de venta de ese producto específico."
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
    "detalle_columns": [
        # "SKU / Código de producto", "Nombre del producto", "Categoría", "Marca",
        # "Stock Actual (Unds)", "Punto de Alerta Mínimo (Unds)", 
        # "Diferencia (Stock vs Alerta Mín.)", "¿Pedir Ahora?", "Índice de Importancia"
        
        "SKU / Código de producto", "Nombre del producto", "Categoría", "Subcategoría", "Marca",
        "Precio Compra Actual (S/.)", "Stock Actual (Unds)", "Cobertura Actual (Días)",
        "Punto de Alerta Mínimo (Unds)", "Punto de Alerta Ideal (Unds)", "¿Pedir Ahora?",
        "Stock de Seguridad (Unds)", "Stock Mínimo Sugerido (Unds)", "Stock Ideal Sugerido (Unds)",
        "Pedido Mínimo Sugerido (Unds)", "Pedido Ideal Sugerido (Unds)", "Índice de Importancia",
        "Promedio Venta Diaria (Unds)", "Ventas Recientes ({dias_recientes}d) (Unds)", "Ventas Periodo General ({dias_general}d) (Unds)"
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
  "ReporteSimulacionAhorroCompraGrupal": { "label": 'Simulación de ahorro en compra por volumen grupal', "endpoint": '/sobrestock', "categoria": "📊 Simulación y ROI de Compra", "isPro": True, "costo":10, "basic_parameters": [] },
  "ReporteSimulacionAhorroImportacionGrupal": { "label": 'Simulación de ahorro en importación grupal', "endpoint": '/sobrestock', "categoria": "📊 Simulación y ROI de Compra", "isPro": True, "costo":10, "basic_parameters": [] },
  "ReporteAnalisisDePreciosMercado": { "label": 'Analisis de precios en base al Mercado', "endpoint": '/sobrestock', "categoria": "📊 Simulación y ROI de Compra", "isPro": True, "costo":10, "basic_parameters": [] },
  "ReporteEstimacionMargenBrutoPorSugerencia": { "label": 'Estimación de margen bruto por sugerencia', "endpoint": '/sobrestock', "categoria": "📊 Simulación y ROI de Compra", "isPro": True, "costo":10, "basic_parameters": [] },
  "ReporteRentabilidadMensualPorMarca": { "label": 'Rentabilidad mensual por línea o proveedor', "endpoint": '/sobrestock', "categoria": "📊 Simulación y ROI de Compra", "isPro": True, "costo":10, "basic_parameters": [] },


  # "🔄 Gestión de Inventario y Mermas"
  "ReporteRevisionProductosSinRotar": { "label": 'Revisión de productos sin rotar', "endpoint": '/stock-critico', "categoria": "🔄 Gestión de Inventario y Mermas", "isPro": True, "costo": 10, "basic_parameters": [] },
  "ReporteListadoProductosAltaRotacion": { "label": 'Listado de productos con alta rotación que necesitan reposición', "endpoint": '/sobrestock', "categoria": "🔄 Gestión de Inventario y Mermas", "isPro": True, "costo": 10, "basic_parameters": [] },
  "ReporteSugerenciaPromocionesParaLiquidar": { "label": 'Sugerencia de promociones para liquidar productos lentos', "endpoint": '/rotacion', "categoria": "🔄 Gestión de Inventario y Mermas", "isPro": True, "costo": 10, "basic_parameters": [] },
};