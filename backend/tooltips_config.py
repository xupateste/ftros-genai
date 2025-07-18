TOOLTIPS_GLOSSARY = {
    # --- Parámetros de maestro inventario ---
    "maestro_criterio_abc": "Elige la métrica principal para clasificar tus productos más importantes (Clase A, B, C) dentro de este reporte maestro.",
    "maestro_periodo_abc": "Define el rango de tiempo de las ventas que se usarán para el análisis de importancia ABC.",
    "maestro_dias_muerto": "Establece el umbral de días sin venta para que un producto sea considerado 'Stock Muerto' en este diagnóstico.",
    "maestro_meses_salud": "Define cuántos meses de ventas recientes se usarán para calcular la velocidad de rotación y detectar excesos de stock.",

    # --- Parámetros de alerta stock ---
    "ordenar_alerta_por": "Elige el criterio principal para ordenar la lista de alertas. 'Más Urgente' te mostrará primero los productos que están más por debajo de su stock de seguridad.",
    "filtro_categorias": "Permite enfocar el análisis únicamente en las familias de productos que te interesan.",
    "filtro_marcas": "Permite enfocar el análisis únicamente en las marcas que te interesan.",
    "lead_time": "Introduce el número promedio de días que tu proveedor tarda en entregarte un pedido. Es el factor más importante para saber cuándo pedir.",
    "dias_seguridad": "Define cuántos días de venta extra quieres tener en stock como un 'colchón' para protegerte de retrasos o picos de demanda inesperados.",
    "factor_importancia": "Aumenta el colchón de seguridad solo para tus productos más importantes (Clase A). Un valor de 2.0 duplicará el stock de seguridad para estos items críticos.",

    # --- Parámetros de Análisis Rotación ---
    "sort_by_rotacion": "Elige el criterio principal para ordenar tu 'radar' de productos. 'Importancia' te mostrará tus productos más críticos primero, mientras que 'Próximos a Agotarse' te alertará sobre los riesgos inmediatos.",
    "pesos_estrategia": "Anula temporalmente los pesos de tu estrategia global para simular diferentes escenarios de importancia en este reporte específico.",
    "umbrales_stock": "Define los umbrales en días de cobertura para que la herramienta clasifique un producto como 'Stock Bajo' (riesgo de quiebre) o 'Sobre-stock' (capital inmovilizado).",

    "chart_placeholder": "Visualiza tus datos para descubrir patrones y tendencias clave. Esta es una herramienta estratégica que te ayuda a interpretar los resultados de tu reporte de un solo vistazo, permitiéndote tomar decisiones más rápidas e informadas.",
    
    "filtro_texto": "Busca coincidencias en el SKU, Nombre, Categoría o Marca del producto. Ideal para encontrar rápidamente un item específico dentro de los resultados.",
    # --- Parámetros de Análisis ABC ---
    "abc_criterio": "Elige la métrica que define la 'importancia' de un producto. 'Margen' se enfoca en los más rentables, 'Ingresos' en los que más facturan, y 'Unidades' en los más populares.",
    "abc_periodo": "Define el rango de tiempo de las ventas que se usarán para el análisis. Un período más corto refleja tendencias recientes, mientras que uno más largo muestra la estabilidad histórica.",
    "abc_combinado": "Se utilizarán los pesos definidos en tu panel de 'Mi Estrategia' para este cálculo. Es la forma más completa de medir la importancia.",
       
    # --- Parámetros de Análisis de Salud y Stock Muerto ---
    "dias_sin_venta_muerto": "Define el número mínimo de días sin una sola venta para que un producto con stock sea clasificado como 'Stock Muerto'. Un valor más bajo es más agresivo y te alertará antes.",
    "umbral_valor_stock": "Filtra los resultados para mostrar solo los productos cuyo valor total de stock inmovilizado supere este monto en S/.",
    "ordenar_stock_muerto_por": "Elige el criterio principal para ordenar la lista de stock muerto, permitiéndote priorizar el problema desde diferentes ángulos: financiero, logístico o por antigüedad.",
    "filtro_categorias_json": "Permite enfocar el diagnóstico únicamente en las familias de productos que te interesan, ideal para analizar el rendimiento de una línea de producto específica.",

    # --- Parámetros de Pesos para Criterio Combinado/Dinámico ---
    "peso_margen": "Asigna la importancia que tiene el margen de ganancia en el cálculo del 'Índice de Importancia' ponderado.",
    "peso_ingresos": "Asigna la importancia que tienen los ingresos totales en el cálculo del 'Índice de Importancia' ponderado.",
    "peso_unidades": "Asigna la importancia que tiene la cantidad de unidades vendidas en el cálculo del 'Índice de Importancia' ponderado.",
    "score_ventas": "En una escala de 1 a 10, ¿qué tan importante es el volumen de ventas para ti? Afecta al 'Índice de Importancia'.",
    "score_ingreso": "En una escala de 1 a 10, ¿qué tan importante es la facturación total para ti? Afecta al 'Índice de Importancia'.",
    "score_margen": "En una escala de 1 a 10, ¿qué tan importante es la rentabilidad neta para ti? Afecta al 'Índice de Importancia'.",
    "score_dias_venta": "En una escala de 1 a 10, ¿qué tan importante es que un producto se venda de forma constante y frecuente? Afecta al 'Índice de Importancia'.",

    # --- Parámetros de Reposición y Cobertura ---
    "ordenar_por": "Elige el criterio principal para ordenar la lista de sugerencias de reposición, permitiéndote priorizar según tu necesidad actual.",
    "incluir_solo_categorias": "Permite enfocar el análisis de reposición únicamente en las familias de productos que te interesan.",
    "incluir_solo_marcas": "Permite enfocar el análisis de reposición únicamente en las marcas que te interesan.",
    "dias_analisis_ventas_recientes": "Ventana de tiempo principal para calcular el promedio de venta diaria (PDA). Un valor más corto reacciona más rápido a las tendencias.",
    "dias_analisis_ventas_general": "Ventana de tiempo secundaria usada para productos con ventas esporádicas. Provee una visión a más largo plazo.",
    "excluir_sin_ventas": "Decide si la lista de reposición debe ignorar por completo los productos que no han tenido ninguna venta en el período de análisis.",
    "lead_time_dias": "El número promedio de días que tarda tu proveedor en entregarte un pedido desde que lo realizas. Es crucial para calcular cuándo pedir.",
    "dias_cobertura_ideal_base": "Tu meta de inventario. ¿Para cuántos días de venta quieres tener stock después de que llegue un nuevo pedido?",
    "peso_ventas_historicas": "Balancea la predicción de ventas entre la tendencia reciente (valor bajo) y el comportamiento histórico a largo plazo (valor alto).",
    "dias_seguridad_base": "Días de stock extra que quieres tener como colchón para protegerte contra retrasos de proveedores o picos inesperados de demanda.",

    # --- Parámetros de Filtro Avanzado ---
    "min_importancia": "Filtra el reporte para mostrar únicamente los productos que superen este umbral de importancia (de 0 a 1).",
    "max_dias_cobertura": "Filtra el reporte para encontrar productos con bajo stock, mostrando solo aquellos cuya cobertura sea menor o igual a este número de días.",
    "min_dias_cobertura": "Filtra el reporte para encontrar productos con exceso de stock, mostrando solo aquellos cuya cobertura sea mayor o igual a este número de días.",
    "dias_sin_venta_muerto": "Define el número mínimo de días sin una sola venta para que un producto con stock sea clasificado como 'Stock Muerto'. Un valor más bajo es más agresivo y te alertará antes.",
    "umbral_valor_stock": "Filtra los resultados para mostrar solo los productos cuyo valor total de stock inmovilizado supere este monto en S/."
}

KPI_TOOLTIPS_GLOSSARY = {
    # --- NUEVOS Tooltips para Puntos de Alerta de Stock ---
    "SKUs en Alerta Roja": "El número de productos cuyo stock actual está por debajo de su punto de alerta MÍNIMO (tu colchón de seguridad). Requieren acción inmediata.",
    "Inversión Urgente Requerida": "La inversión estimada para comprar el pedido MÍNIMO sugerido solo para los productos en Alerta Roja y así evitar quiebres de stock.",
    "Próximo Quiebre Crítico": "Identifica el producto de 'Clase A' (más importante) que está más cerca de agotarse. Es el riesgo más grande para tu negocio en este momento.",

    # --- NUEVOS Tooltips para Análisis Estratégico de Rotación ---
    "SKUs Estrella": "Productos de alta importancia (Clase A/B) con un nivel de stock saludable o bajo. Son los motores de tu negocio que están funcionando bien.",
    "SKUs Problemáticos (Sobre-stock)": "Productos de alta importancia (Clase A/B) en los que tienes demasiado inventario. Están inmovilizando capital que podrías usar en otros productos.",
    "Valor en Sobre-stock": "La suma total del costo de tu inventario que está clasificado como 'Sobre-stock'. Es el capital que podrías liberar con promociones o liquidaciones.",
    "Rotación Promedio (Ejemplo)": "Una métrica futura que medirá la velocidad promedio a la que rota todo tu inventario.",

    # --- Tooltips para Reporte ABC ---
    "SKUs Clase A (Vitales)": "El número de productos que son críticos para tu negocio. Son pocos, pero generan la mayor parte de tu valor.",
    "% del Valor (Clase A)": "El porcentaje del valor total (según tu criterio) que es generado por tus productos de Clase A. Idealmente, sigue la regla 80/20.",
    "SKUs Clase C (Triviales)": "El gran número de productos que contribuyen poco al valor total. Son candidatos para optimizar o reducir su stock.",
    "% del Valor (Clase C)": "El pequeño porcentaje del valor total que es generado por la mayoría de tus productos. Si este número es alto, podría indicar un problema.",

    # --- Tooltips para Lista basica reposicion historica) ---
    "Inversión Total Sugerida": "El monto total en soles (S/.) que necesitas invertir para comprar todas las unidades sugeridas en este reporte. Te ayuda a planificar tu flujo de caja.",
    "SKUs a Reponer": "El número total de productos únicos (diferentes códigos SKU) que la herramienta recomienda reponer. Te da una idea de la variedad de tu próximo pedido.",
    "Unidades Totales a Pedir": "La suma de todas las unidades individuales que se sugieren pedir en este reporte. Útil para la logística y la negociación por volumen con tus proveedores.",
    "Margen Potencial de la Compra": "La ganancia bruta estimada que obtendrías al vender todas las unidades sugeridas en esta compra, considerando solo los productos con margen de venta positivo.",
    "Productos con Pérdida": "El número de productos que, según los datos de ventas recientes, se están vendiendo por debajo de su costo actual. ¡Requieren atención inmediata!",

    # --- Tooltips para Reporte de Reposición (ya existentes) ---
    "Inversión Total Sugerida": "El monto total en soles (S/.) que necesitas invertir para comprar todas las unidades sugeridas en este reporte. Te ayuda a planificar tu flujo de caja.",
    "SKUs a Reponer": "El número total de productos únicos (diferentes códigos SKU) que la herramienta recomienda reponer. Te da una idea de la variedad de tu próximo pedido.",
    "Unidades Totales a Pedir": "La suma de todas las unidades individuales que se sugieren pedir en este reporte. Útil para la logística y la negociación por volumen con tus proveedores.",
    "Margen Potencial de la Compra": "La ganancia bruta estimada que obtendrías al vender todas las unidades sugeridas en esta compra, considerando solo los productos con margen de venta positivo.",
    
    # --- NUEVOS TOOLTIPS PARA DIAGNÓSTICO DE STOCK MUERTO ---
    "Valor Total en Stock Muerto": "La suma total del costo de tu inventario que está clasificado como 'Stock Muerto' y 'Nunca Vendido con Stock'. Es el capital que tienes inmovilizado y en riesgo.",
    "% del Inventario Afectado": "Qué porcentaje del valor total de tu inventario está compuesto por stock muerto. Te ayuda a entender la magnitud del problema.",
    "SKUs en Riesgo": "La cantidad de productos únicos diferentes que han sido clasificados como 'Stock Muerto' y 'Nunca Vendido con Stock'. Te indica si el problema está concentrado en pocos items o distribuido en muchos.",
    "Producto Más Antiguo": "Muestra los días sin venta del 'peor infractor', el producto que lleva más tiempo sin venderse en todo tu inventario."
}