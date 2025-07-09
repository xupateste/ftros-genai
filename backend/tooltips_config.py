TOOLTIPS_GLOSSARY = {
    "filtro_texto": "Busca coincidencias en el SKU, Nombre, Categoría o Marca del producto. Ideal para encontrar rápidamente un item específico dentro de los resultados.",
    # --- Parámetros de Análisis ABC ---
    "periodo_abc": "Define el rango de tiempo de las ventas que se usarán para calcular la importancia de cada producto. '6 meses' es un buen balance entre datos recientes y estabilidad.",
    "criterio_abc": "Elige la métrica principal para clasificar tus productos. 'Margen' se enfoca en la rentabilidad, 'Ingresos' en la facturación, y 'Unidades' en la popularidad.",
    
    # --- Parámetros de Análisis de Salud y Stock Muerto ---
    "dias_sin_venta_muerto": "Número de días sin vender un producto para que sea considerado 'Stock Muerto'. Un valor más alto es más conservador.",
    "meses_analisis_salud": "Define cuántos meses de ventas recientes se usarán para calcular la 'salud' o velocidad de rotación de un producto.",

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
    "min_dias_cobertura": "Filtra el reporte para encontrar productos con exceso de stock, mostrando solo aquellos cuya cobertura sea mayor o igual a este número de días."
}

KPI_TOOLTIPS_GLOSSARY = {
    "Inversión Total Sugerida": "El monto total en soles (S/.) que necesitas invertir para comprar todas las unidades sugeridas en este reporte. Te ayuda a planificar tu flujo de caja.",
    "SKUs a Reponer": "El número total de productos únicos (diferentes códigos SKU) que la herramienta recomienda reponer. Te da una idea de la variedad de tu próximo pedido.",
    "Unidades Totales a Pedir": "La suma de todas las unidades individuales que se sugieren pedir en este reporte. Útil para la logística y la negociación por volumen con tus proveedores.",
    "Margen Potencial de la Compra": "La ganancia bruta estimada que obtendrías al vender todas las unidades sugeridas en esta compra, considerando solo los productos con margen de venta positivo.",
    "Productos con Pérdida": "El número de productos que, según los datos de ventas recientes, se están vendiendo por debajo de su costo actual. ¡Requieren atención inmediata!"
}