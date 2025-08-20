# --- 1. NUEVA BASE DE CONOCIMIENTO PARA LA AUDITORÍA ---
AUDIT_KNOWLEDGE_BASE = {
    "exceso_stock_estrella": {
        "why": "Un exceso de stock en un producto 'Estrella' es un 'problema bueno', pero un problema al fin y al cabo. Indica que estás invirtiendo fuertemente en tu crecimiento, pero quizás de forma demasiado agresiva, lo que puede afectar tu flujo de caja.",
        "how": [
            "Ejecuta el 'Plan de Compra Sugerido' para ver que la sugerencia de compra es cero.",
            "Analiza la 'Cobertura Actual en Días' para entender cuántos meses de venta tienes cubiertos.",
            "Considera reducir ligeramente tu próxima orden de compra para este item y reasignar ese capital a un 'Dilema' prometedor."
        ]
    },
    "exceso_stock_vaca": {
        "why": "Este es el 'capital perezoso' en su forma más pura. Tienes demasiado dinero invertido en un producto rentable pero que no está creciendo. Cada sol extra aquí es un sol que no está trabajando para financiar tus verdaderos motores de crecimiento.",
        "how": [
            "Ejecuta el 'Análisis Estratégico de Rotación' para confirmar su bajo crecimiento y alta cobertura.",
            "Lanza una promoción controlada para reducir el exceso de stock sin devaluar el producto.",
            "Ajusta tus parámetros de reposición para este producto, reduciendo los días de cobertura ideal.",
            "Usa el capital liberado para invertir en tus 'Estrellas' o para experimentar con nuevos productos."
        ]
    },
    "oportunidad_clase_b": {
        "why": "Un producto 'Clase B' con una velocidad de venta creciente es una futura 'estrella'. Identificarlo a tiempo te permite potenciar su crecimiento antes que tu competencia y asegurar tus futuras fuentes de ingreso.",
        "how": [
            "Ejecuta el 'Análisis Estratégico de Rotación' para monitorear su 'Índice de Importancia' y su tendencia.",
            "Asegúrate de que nunca tenga quiebres de stock. Trátalo como si ya fuera un 'Clase A'.",
            "Considera darle una mejor ubicación en tu tienda o destacarlo en tu e-commerce para acelerar su crecimiento.",
            "Habla con tu proveedor para asegurar un buen volumen de compra a un precio competitivo."
        ]
    },
    "heroes_en_declive": {
        "why": "Esta es una alerta crítica. Un producto que era importante y rentable ('Estrella' o 'Vaca Lechera') y que está perdiendo popularidad rápidamente es un indicador temprano de un futuro problema de stock muerto y una señal de un posible cambio en el mercado.",
        "how": [
            "Ejecuta el 'Análisis Estratégico de Rotación' para investigar a fondo la tendencia de este producto.",
            "Habla con tu equipo de ventas: ¿Los clientes han dejado de preguntar por él? ¿Hay un producto sustituto (tuyo o de la competencia) que lo esté desplazando?",
            "Revisa si ha habido un aumento de precio reciente que podría estar afectando su demanda.",
            "Considera reducir gradualmente tus niveles de compra para este item para evitar un futuro exceso de stock."
        ]
    },
    "inversion_ineficiente_perro": {
        "why": "Un producto 'Perro' es un activo de bajo rendimiento. Invertir capital en reponerlo, cuando podría usarse para comprar 'Estrellas' o 'Vacas Lecheras', es una ineficiencia. Esta alerta te ayuda a optimizar cada sol de tu presupuesto de compras.",
        "how": [
            "Ejecuta el 'Plan de Compra Sugerido' para ver la lista completa de estos productos.",
            "Para estos items, considera usar el 'Pedido Mínimo Sugerido' en lugar del 'Ideal' para minimizar la inversión.",
            "Evalúa si algunos de estos productos deberían ser descontinuados de tu catálogo en lugar de ser repuestos.",
            "Filtra por categoría o marca para ver si tienes un problema sistemático de reposición de productos de bajo rendimiento."
        ]
    },
    "inconsistencias_datos_criticos": {
        "why": "'Basura entra, basura sale'. Si los datos de tus productos más importantes son incorrectos (ej. precio de compra en cero o categoría faltante), todos los análisis de rentabilidad y estrategia en esta plataforma serán imprecisos. Corregir esto es fundamental para confiar en tus resultados.",
        "how": [
            "Ejecuta la 'Auditoría de Integridad de Catálogo' para obtener una lista completa de los productos con errores.",
            "Dedica tiempo a actualizar la información faltante (Marca, Categoría, Precio de Compra, Precio de Venta, Productos Duplicados) directamente en tu sistema de punto de venta o inventario.",
            "Establece un proceso para que cada nuevo producto que se ingrese al sistema tenga todos sus datos completos desde el inicio."
        ]
    },
    # --- ERRORES CRÍTICOS ---
    "quiebre_stock_clase_a": {
        "why": "Un producto 'Clase A' es uno de tus items más importantes y rentables. Un quiebre de stock significa que estás perdiendo ventas directas en tus productos más valiosos y, peor aún, arriesgando que un cliente fiel se vaya a la competencia.",
        "how": [
            "Ejecuta el 'Plan de Compra Sugerido' inmediatamente para generar una orden de compra priorizada.",
            "Contacta a tu proveedor para verificar si hay un pedido en camino o si puedes acelerar la entrega.",
            "Considera aumentar el 'Stock de Seguridad' para este producto en el reporte de 'Parámetros para POS' para prevenir futuros quiebres."
        ]
    },
    "stock_muerto_perro": {
        "why": "Un producto 'Perro' con stock muerto es capital inmovilizado en un activo de bajo rendimiento. Ocupa espacio y consume recursos sin contribuir significativamente a tu negocio.",
        "how": [
            "Ejecuta el 'Plan de Liquidación' para ver la lista completa y priorizar por valor.",
            "Considera una liquidación agresiva (ofertas 2x1, descuentos) para recuperar el capital rápidamente.",
            "Evalúa descontinuar este producto de tu catálogo para simplificar tu inventario."
        ]
    },
    "stock_muerto_heroe_caido": {
        "why": "Esta es una alerta crítica. Un producto que era importante ('Vaca Lechera' o 'Estrella') y que ha dejado de venderse indica un cambio significativo en el mercado, la aparición de un competidor o un problema con el producto mismo.",
        "how": [
            "Ejecuta la 'Investigación de Causa Raíz' para un análisis de 360° del producto.",
            "Habla con tu equipo de ventas: ¿Los clientes han dejado de preguntar por él? ¿Por qué?",
            "Analiza si un nuevo producto (tuyo o de la competencia) lo ha reemplazado.",
            "Contacta al proveedor para entender si hay problemas de calidad o de mercado."
        ]
    },
    "margen_negativo_alta_rotacion": {
        "why": "Este es uno de los problemas más peligrosos. Estás perdiendo dinero activamente con cada venta de tus productos más populares. Es como una máquina que trabaja más rápido mientras más dinero pierde, erosionando tus ganancias silenciosamente.",
        "how": [
            "Ejecuta la 'Auditoría de Desviación de Margen' para un análisis detallado.",
            "Verifica inmediatamente el 'Precio de Compra Actual' vs. el 'Precio de Venta' en tu sistema. Puede ser un error de tipeo.",
            "Revisa si un proveedor ha aumentado sus precios recientemente y no has actualizado los tuyos.",
            "Audita si se están aplicando descuentos no autorizados en el punto de venta."
        ]
    },

    # --- ADVERTENCIAS IMPORTANTES ---
    "stock_muerto_alto_valor": {
        "why": "El stock muerto es capital inmovilizado. Cada sol atrapado en productos que no se venden es un sol que no puedes usar para comprar inventario que sí rota, pagar a proveedores o invertir en el crecimiento de tu negocio.",
        "how": [
            "Ejecuta el 'Diagnóstico de Stock Muerto' y ordena por 'Mayor Valor Inmovilizado'.",
            "Crea una oferta 'combo', empaquetando este producto con un 'Clase A' de alta venta.",
            "Lanza una liquidación rápida en una zona de alta visibilidad de tu tienda o en marketplaces online.",
            "Filtra por marca y usa la lista para negociar devoluciones o notas de crédito con tu proveedor."
        ]
    },
    "exceso_stock_clase_ab": {
        "why": "Tener stock de tus productos importantes es bueno, pero tener demasiado es 'capital perezoso'. Inmoviliza tu flujo de caja, aumenta tus costos de almacenamiento y te expone al riesgo de que el producto se dañe o se vuelva obsoleto.",
        "how": [
            "Ejecuta el 'Análisis Estratégico de Rotación' para entender la cobertura en días.",
            "Considera una promoción temporal para reducir el exceso sin dañar la percepción del precio a largo plazo.",
            "Revisa y ajusta las cantidades de tus órdenes de compra para estos productos.",
            "Usa el capital liberado para invertir en productos 'Clase B' emergentes."
        ]
    },
    # --- OPORTUNIDADES DE OPTIMIZACIÓN ---
    "inversion_ineficiente_clase_c": {
        "why": "Los productos 'Clase C' son la 'larga cola' de tu inventario. Son necesarios, pero invertir demasiado capital en reponerlos puede desviar recursos de tus verdaderos motores de venta ('Clase A'). Se trata de optimizar cada sol gastado.",
        "how": [
            "Ejecuta el 'Plan de Compra Sugerido' y filtra por 'Clase C'.",
            "Para estos productos, considera usar el 'Pedido Mínimo Sugerido' en lugar del 'Ideal' para minimizar la inversión.",
            "Evalúa si algunos de estos productos pueden ser comprados con menos frecuencia pero en mayor volumen para reducir la gestión."
        ]
    },
    
    # --- NUEVA ENTRADA PARA LA ALERTA DE EFICIENCIA DE MARGEN ---
    "eficiencia_margen_baja": {
        "why": "Una baja eficiencia de margen es una 'fuga de rentabilidad silenciosa'. Significa que, aunque tus productos sean rentables en papel, en la práctica (por descuentos, errores o costos no actualizados) estás dejando de ganar una cantidad significativa de dinero que te corresponde.",
        "how": [
            "Ejecuta la 'Auditoría de Desviación de Margen' para identificar los productos específicos con la mayor desviación.",
            "Ordena por 'Mayor Impacto Financiero' para encontrar las 'fugas' de dinero más grandes.",
            "Revisa si los precios de compra de tus proveedores han subido recientemente y ajusta tus precios de venta en consecuencia.",
            "Audita tus procesos en el punto de venta para asegurar que los descuentos se apliquen correctamente."
        ]
    }
}