import { useState, useEffect, useCallback } from 'react'; // useCallback añadido
import { useNavigate, Link } from 'react-router-dom';
import '../index.css';
import axios from 'axios';

import CsvDropZone from '../assets/CsvDropZone';
import CsvDropZone2 from '../assets/CsvDropZone2';


const API_URL = import.meta.env.VITE_API_URL;

// (diccionarioData y reportData permanecen igual que en tu última versión)
const diccionarioData = {
  'Analisis Inventario ABC ✓': `<h3><span style="font-size: 24px;">🔍 CRITERIOS DE ANÁLISIS ABC</span></h3><p><br></p><ol><li><strong style="font-size: 18px;">Por ingresos (ventas en S/):</strong></li></ol><ul><li class="ql-indent-1">Clasifica los productos según el total facturado.</li><li class="ql-indent-1"><strong>Ventaja:</strong>&nbsp;Se enfoca en los productos que generan más dinero, aunque se vendan poco.</li><li class="ql-indent-1"><strong>Uso típico:</strong>&nbsp;Priorización de inventario con enfoque financiero.</li></ul><p><br></p><ol><li><strong style="font-size: 18px;">Por cantidad vendida (unidades):</strong></li></ol><ul><li class="ql-indent-1">Clasifica según el número de unidades vendidas.</li><li class="ql-indent-1"><strong>Ventaja:</strong>&nbsp;Identifica productos con alta rotación.</li><li class="ql-indent-1"><strong>Uso típico:</strong>&nbsp;Optimización de logística y reabastecimiento.</li></ul><p><br></p><ol><li><strong style="font-size: 18px;">Por margen bruto (ganancia por producto):</strong></li></ol><ul><li class="ql-indent-1">Clasifica según el margen total obtenido (precio de venta - costo).</li><li class="ql-indent-1"><strong>Ventaja:</strong>&nbsp;Prioriza productos más rentables, aunque vendan poco.</li><li class="ql-indent-1"><strong>Uso típico:</strong>&nbsp;Decisiones estratégicas de mix de productos.</li></ul><p><br></p><ol><li><strong style="font-size: 18px;">Combinado o ponderado:</strong></li></ol><ul><li class="ql-indent-1">Puedes combinar estos criterios (ej. 50% ingresos, 30% margen, 20% unidades).</li><li class="ql-indent-1"><strong>Ventaja:</strong>&nbsp;Balancea la rotación, rentabilidad y volumen.</li></ul><p><br></p><p><hr></p><p><br></p><h3><span style="font-size: 24px;">📅 ¿Es necesario establecer un periodo (ej. 3, 6 o 12 meses)?</span></h3><p><strong>Sí, y es muy recomendable.</strong>&nbsp;El periodo define el contexto del análisis. Aquí la comparación:</p><p><br></p><h4><span style="font-size: 18px;">▶ Análisis por&nbsp;</span><em style="font-size: 18px;">todo el historial</em><span style="font-size: 18px;">:</span></h4><ul><li><strong>Ventajas:</strong></li><li class="ql-indent-1">Útil para ver patrones históricos y productos de larga vida.</li><li class="ql-indent-1">Bueno para decisiones estructurales o anuales.</li><li><strong>Desventajas:</strong></li><li class="ql-indent-1">Puede incluir productos descontinuados o que ya no rotan.</li><li class="ql-indent-1">Enmascara tendencias recientes.</li></ul><p><br></p><h4><span style="font-size: 18px;">▶ Análisis por&nbsp;</span><em style="font-size: 18px;">últimos X meses (ej. 3, 6 o 12)</em><span style="font-size: 18px;">:</span></h4><ul><li><strong>Ventajas:</strong></li><li class="ql-indent-1">Refleja la demanda y comportamiento reciente.</li><li class="ql-indent-1">Ideal para decisiones tácticas y operativas: compras, promociones, quiebres, etc.</li><li class="ql-indent-1">Detecta cambios estacionales o nuevas preferencias.</li><li><strong>Desventajas:</strong></li><li class="ql-indent-1">Puede ser afectado por eventos puntuales o atípicos (ej. promociones, pandemia, etc.).</li><li class="ql-indent-1">No considera el ciclo de vida largo de algunos productos.</li></ul><p><br></p><p><hr></p><p><br></p><h3><span style="font-size: 24px;">🔄 ¿Por qué usarlo recurrentemente?</span></h3><blockquote><span style="font-size: 14px;">Porque </span><strong style="font-size: 14px;">la importancia de tus productos cambia con el tiempo</strong><span style="font-size: 14px;">: lo que fue categoría A hace 90 días, puede ser B o C hoy.</span></blockquote><p><br></p><p><span style="font-size: 18px;">👉 Úsalo </span><strong style="font-size: 18px;">periódicamente</strong><span style="font-size: 18px;"> para actualizar tu visión y tomar decisiones sobre:</span></p><ul><li>Reposición inteligente.</li><li>Ordenamiento de góndolas o vitrinas.</li><li>Promociones.</li><li>Reducción de productos lentos.</li><li>Evaluación de nuevos ingresos al surtido.</li></ul><p><br></p><p>🧠 <strong>Decisiones mensuales más informadas → Menos capital inmovilizado → Más ventas y rotación.</strong></p><p><br></p><p><hr></p><p><br></p><h3><span style="font-size: 24px;">✅ Recomendación práctica</span></h3><p>Para una ferretería o retail, lo ideal es:</p><ul><li>Hacer&nbsp;<strong>análisis ABC por los últimos 3 o 6 meses</strong>&nbsp;para decisiones de compra y reabastecimiento.</li><li>Hacer un&nbsp;<strong>ABC por margen</strong>&nbsp;para revisar la rentabilidad del mix de productos.</li><li>Revisar el ABC por todo el historial&nbsp;<strong>una o dos veces al año</strong>&nbsp;para decisiones de surtido estratégico (descontinuar o ampliar líneas).</li></ul><h3><br></h3>`,
  'Reposición Inteligente de Stock General ✓': `<h2><span style="font-size: 24px;">🧠 📊 Resultado del Análisis de Reposición de Stock Inteligente General 📈</span></h2><p>El resultado generado por este reporte es una <strong>herramienta integral 🛠️ para la toma de decisiones inteligentes 🤔 sobre la gestión de inventario 📦 y la planificación de compras 🛒.</strong> Proporciona una visión detallada y priorizada de cada producto (SKU), combinando su rendimiento histórico de ventas, su situación actual de stock, su importancia estratégica y las proyecciones de necesidad futura.</p><p><br></p><p><hr></p><p><br></p><h3><span style="font-size: 24px;">🔑 Componentes Clave del Resultado:</span></h3><p><br></p><ol><li><strong style="font-size: 18px;">🏷️ Identificación del Producto:</strong></li></ol><ul><li class="ql-indent-1"><code style="color: rgb(0, 0, 0); background-color: rgb(240, 240, 240);">SKU / Código de producto</code>, <code style="color: rgb(0, 0, 0); background-color: rgb(240, 240, 240);">Nombre del producto</code>, <code style="color: rgb(0, 0, 0); background-color: rgb(240, 240, 240);">Categoría</code>, <code style="color: rgb(0, 0, 0); background-color: rgb(240, 240, 240);">Subcategoría</code>, <code style="color: rgb(0, 0, 0); background-color: rgb(240, 240, 240);">Marca</code><span style="font-size: 14px; color: rgb(0, 0, 0);">: </span> Permiten identificar y clasificar cada ítem de forma única.</li></ul><p><br></p><ol><li><strong style="font-size: 18px;">🏪 Situación Actual del Inventario:</strong></li></ol><ul><li class="ql-indent-1"><code style="color: rgb(0, 0, 0); background-color: rgb(240, 240, 240);">Stock Actual (Unds)</code>: Cantidad física disponible del producto.</li><li class="ql-indent-1"><code style="color: rgb(0, 0, 0); background-color: rgb(240, 240, 240);">Precio Compra Actual (S/.)</code> 💲: Costo unitario actual del producto.</li><li class="ql-indent-1"><code style="color: rgb(0, 0, 0); background-color: rgb(240, 240, 240);">Cobertura Actual (Días)</code> ⏳: Estimación de cuántos días durará el stock actual basado en el promedio de ventas.</li></ul><p><br></p><ol><li><strong style="font-size: 18px;">💹 Rendimiento y Proyección de Ventas:</strong></li></ol><ul><li class="ql-indent-1"><code style="color: rgb(0, 0, 0); background-color: rgb(240, 240, 240);">Ventas Recientes (Unds)</code>: Total de unidades vendidas en el periodo de análisis reciente.</li><li class="ql-indent-1"><code style="color: rgb(0, 0, 0); background-color: rgb(240, 240, 240);">Días con Venta (Reciente)</code> 🗓️: Número de días en que el producto efectivamente registró ventas durante el periodo reciente.</li></ul><p><br></p><ol><li><strong style="font-size: 18px;">⭐ Importancia Estratégica:</strong></li></ol><ul><li class="ql-indent-1"><code style="color: rgb(0, 0, 0); background-color: rgb(240, 240, 240);">Índice de Importancia</code>: Una métrica (0.0 - 1.0) que clasifica los productos según su contribución en ventas, ingresos, margen y frecuencia, ayudando a priorizar.</li></ul><p><br></p><ol><li><strong style="font-size: 18px;">🎯 Sugerencias de Reposición y Niveles Objetivo:</strong></li></ol><ul><li class="ql-indent-1"><code style="color: rgb(0, 0, 0); background-color: rgb(240, 240, 240);">Stock Ideal Sugerido (Unds)</code>: El nivel de inventario óptimo que se recomienda mantener para ese producto, considerando su PDA, días de cobertura deseados, factores de categoría, rotación e importancia.</li><li class="ql-indent-1"><code style="color: rgb(0, 0, 0); background-color: rgb(240, 240, 240);">Pedido Ideal Sugerido (Unds)</code> 🛍️: La cantidad de unidades que se sugiere pedir para alcanzar el <code style="color: rgb(0, 0, 0); background-color: rgb(240, 240, 240);">Stock Ideal Sugerido</code>.</li><li class="ql-indent-1"><code style="color: rgb(0, 0, 0); background-color: rgb(240, 240, 240);">Pedido Mínimo Sugerido (Unds)</code> 🛒: Una cantidad de pedido mínima recomendada si se decide reponer, útil para lotes mínimos de compra o para asegurar un impacto mínimo de la reposición.</li></ul><h3><br></h3><h3><hr></h3><h3><br></h3><h3><span style="font-size: 24px;">✅ Beneficio Principal:</span></h3><p><span style="font-size: 14px;">Este resultado te permite pasar de una gestión de inventario reactiva a una </span><strong style="font-size: 14px;">proactiva y basada en datos 💡.</strong><span style="font-size: 14px;"> Facilita la identificación rápida de qué productos necesitan atención urgente ❗, cuánto pedir para optimizar los niveles de stock (evitando quiebres 📉 y sobrecostos por exceso de inventario 💰) y cómo priorizar las compras basándose en la importancia estratégica de cada artículo.</span></p><p><br></p><p><hr></p><p><br></p><h3><span style="font-size: 24px;">🧐 Posibles Insights a Extraer del Análisis:</span></h3><p>Analizando el resultado, puedes obtener información valiosa como:</p><p><br></p><ol><li><strong style="font-size: 18px;">🚨 Prioridades Claras para Reposición Inmediata:</strong></li></ol><ul><li class="ql-indent-1"><strong>Insight:</strong> Productos con alto <code style="color: rgb(0, 0, 0); background-color: rgb(240, 240, 240);">Índice de Importancia</code> ⭐, <code style="color: rgb(0, 0, 0); background-color: rgb(240, 240, 240);">Cobertura Actual (Días)</code> ⏳ muy baja (ej. &lt; 7 días) y un <code style="color: rgb(0, 0, 0); background-color: rgb(240, 240, 240);">Pedido Ideal Sugerido (Unds)</code> positivo.</li><li class="ql-indent-1"><strong>Acción:</strong> ➡️ Estos son tus productos críticos que corren riesgo de agotarse. ¡Prioriza su compra!</li></ul><p><br></p><ol><li><strong style="font-size: 18px;">🌟 Identificación de "Estrellas" y "Vacas Lecheras" 🐄💰 del Inventario:</strong></li></ol><ul><li class="ql-indent-1"><strong>Insight:</strong> Productos con alto <code style="color: rgb(0, 0, 0); background-color: rgb(240, 240, 240);">Índice de Importancia</code> y consistentemente alto <code style="color: rgb(0, 0, 0); background-color: rgb(240, 240, 240);">Promedio Venta Diaria (Unds)</code>. Su <code style="color: rgb(0, 0, 0); background-color: rgb(240, 240, 240);">Stock Ideal Sugerido (Unds)</code> probablemente será elevado.</li><li class="ql-indent-1"><strong>Acción:</strong> ➡️ Asegura una gestión de stock impecable para estos ítems. </li></ul><p><br></p><ol><li><strong style="font-size: 18px;">📦📉 Detección de Posible Sobrestock (Capital Inmovilizado):</strong></li></ol><ul><li class="ql-indent-1"><strong>Insight:</strong> Productos con <code style="color: rgb(0, 0, 0); background-color: rgb(240, 240, 240);">Cobertura Actual (Días)</code> ⏳ muy alta (ej. &gt; 90, 120 días), bajo <code style="color: rgb(0, 0, 0); background-color: rgb(240, 240, 240);">Índice de Importancia</code> y/o bajo <code style="color: rgb(0, 0, 0); background-color: rgb(240, 240, 240);">Promedio Venta Diaria (Unds)</code>, donde el <code style="color: rgb(0, 0, 0); background-color: rgb(240, 240, 240);">Stock Actual (Unds)</code> supera significativamente el <code style="color: rgb(0, 0, 0); background-color: rgb(240, 240, 240);">Stock Ideal Sugerido (Unds)</code>.</li><li class="ql-indent-1"><strong>Acción:</strong> ➡️ Evalúa estrategias para reducir este inventario (promociones 📢, descuentos 💸, no reponer hasta alcanzar niveles óptimos). Podrían ser candidatos a revisión de sus parámetros de reposición.</li></ul><p><br></p><ol><li><strong style="font-size: 18px;">🤔 Decisiones Estratégicas sobre Pedidos Mínimos vs. Ideales:</strong></li></ol><ul><li class="ql-indent-1"><strong>Insight:</strong> Casos donde el <code style="color: rgb(0, 0, 0); background-color: rgb(240, 240, 240);">Pedido Ideal Sugerido (Unds)</code> 🛍️ es positivo pero pequeño, y el <code style="color: rgb(0, 0, 0); background-color: rgb(240, 240, 240);">Pedido Mínimo Sugerido (Unds)</code> 🛒 es mayor.</li><li class="ql-indent-1"><strong>Acción:</strong> ➡️ Decide si es costo-efectivo realizar un pedido pequeño (el ideal) o si es mejor pedir la cantidad mínima para optimizar costos de pedido o cumplir con requisitos de proveedor, aunque esto eleve el stock temporalmente por encima del ideal calculado.</li></ul><p><br></p><ol><li><strong style="font-size: 18px;">🐌 Análisis de Productos con Tendencia a la Baja o "Durmientes":</strong></li></ol><ul><li class="ql-indent-1"><strong>Insight:</strong> Productos con <code style="color: rgb(0, 0, 0); background-color: rgb(240, 240, 240);">Índice de Importancia</code> decreciente (si comparas análisis a lo largo del tiempo), o con <code style="color: rgb(0, 0, 0); background-color: rgb(240, 240, 240);">Promedio Venta Diaria (Unds)</code> consistentemente bajo o nulo, a pesar de tener <code style="color: rgb(0, 0, 0); background-color: rgb(240, 240, 240);">Stock Actual (Unds)</code>.</li><li class="ql-indent-1"><strong>Acción:</strong> ➡️ Considera si estos productos deberían ser descatalogados 🗑️ o si necesitan acciones de marketing 📢 para reactivar sus ventas. El <code style="color: rgb(0, 0, 0); background-color: rgb(240, 240, 240);">Stock Ideal Sugerido</code> para estos debería ser bajo o cero si el PDA es cero.</li></ul><p><br></p><ol><li><strong style="font-size: 18px;">🤝 Identificación de Oportunidades de Negociación con Proveedores:</strong></li></ol><ul><li class="ql-indent-1"><strong>Insight:</strong> Si muchos productos de un mismo proveedor requieren reposición y suman un volumen considerable entre <code style="color: rgb(0, 0, 0); background-color: rgb(240, 240, 240);">Pedido Ideal Sugerido</code> y <code style="color: rgb(0, 0, 0); background-color: rgb(240, 240, 240);">Pedido Mínimo Sugerido</code>.</li><li class="ql-indent-1"><strong>Acción:</strong> ➡️ Podrías tener una mejor posición para negociar precios 💲 o condiciones de entrega 🚚.</li></ul><p><br></p><p>Al cruzar estas métricas y aplicar tu conocimiento del negocio, podrás transformar esta tabla de datos en un <strong>motor potente 💪 para la optimización de tu inventario.</strong></p><p><br></p><p><hr></p><p><br></p><h3><span style="font-size: 24px;">✅ Recomendación práctica</span></h3><p>Para una ferretería o retail, lo ideal es:</p><ul><li><span style="font-size: 14px;">Revisar este reporte</span><strong style="font-size: 14px;">&nbsp;una vez por semana,&nbsp;</strong><span style="font-size: 14px;">filtra los productos</span><strong style="font-size: 14px;">&nbsp;</strong><span style="font-size: 14px;">con cobertura</span><strong style="font-size: 14px;">&nbsp;menor a 15 días&nbsp;</strong><span style="font-size: 14px;">y&nbsp;</span><strong style="font-size: 14px;">alta importancia</strong><span style="font-size: 14px;">, y enfoca tu compra</span><strong style="font-size: 14px;">&nbsp;</strong><span style="font-size: 14px;">en ellos</span><strong style="font-size: 14px;">.&nbsp;</strong><span style="font-size: 14px;">Con solo</span><strong style="font-size: 14px;">&nbsp;15 minutos&nbsp;</strong><span style="font-size: 14px;">puedes tomar mejores decisiones que</span><strong style="font-size: 14px;">&nbsp;antes te tomaban horas.</strong></li></ul><p><br></p>`,
  'Diagnóstico Stock Muerto ✓': `<h3><span style="font-size: 24px;">⚙️📆 Análisis por período configurable (3, 6 o 12 meses)</span></h3><h3><br></h3><h3><span style="font-size: 18px;">Ajusta el diagnóstico según el ciclo de tu negocio:</span></h3><p><br></p><ul><li><span style="font-size: 18px;">🔥&nbsp;</span><strong style="font-size: 18px;">3 meses:</strong><span style="font-size: 18px;">&nbsp;para detectar acumulación reciente o errores de surtido.</span></li></ul><p><br></p><ul><li><span style="font-size: 18px;">📊&nbsp;</span><strong style="font-size: 18px;">6 meses:</strong><span style="font-size: 18px;">&nbsp;para decisiones operativas de stock estancado.</span></li></ul><p><br></p><ul><li><span style="font-size: 18px;">🧱&nbsp;</span><strong style="font-size: 18px;">12 meses:</strong><span style="font-size: 18px;">&nbsp;para limpiar productos históricos o sobreinventario crónico.</span></li></ul><p><br></p><p><hr></p><p><br></p><p><span style="font-size: 24px;">🧊📦 ¿Qué productos están congelando tu capital?"</span></p><p><span style="font-size: 14px;">Este reporte identifica de forma clara y accionable los productos que</span><span style="font-size: 24px;">&nbsp;</span><strong>no se mueven, rotan lento o están atrapando tu inversión</strong>.</p><p>Con solo unos clics, puedes detectar oportunidades de&nbsp;<strong>liquidación, rotación o depuración</strong>, y actuar antes de que el stock pierda más valor.</p><p><br></p><p><hr></p><p><br></p><h3><span style="font-size: 24px;">🔍📉 ¿Qué analiza este reporte?</span></h3><p><br></p><ul><li><span style="font-size: 18px;">⏱️&nbsp;</span><strong style="font-size: 18px;">Días sin venta y última fecha de movimiento.</strong></li></ul><p><br></p><ul><li><span style="font-size: 18px;">🔄&nbsp;</span><strong style="font-size: 18px;">Rotación en todo el historial y en los últimos meses (ventas totales y recientes).</strong></li></ul><p><br></p><ul><li><span style="font-size: 18px;">⌛&nbsp;</span><strong style="font-size: 18px;">Proyección de días para agotar el stock actual (basado en rotación pasada).</strong></li></ul><p><br></p><ul><li><span style="font-size: 18px;">💰&nbsp;</span><strong style="font-size: 18px;">Valor de stock inmovilizado por producto.</strong></li></ul><p><br></p><ul><li><span style="font-size: 18px;">🧠&nbsp;</span><strong style="font-size: 18px;">Clasificación diagnóstica automática</strong><span style="font-size: 18px;">&nbsp;con una&nbsp;</span><strong style="font-size: 18px;">acción recomendada según prioridad.</strong></li></ul><p><br></p><p><hr></p><p><br></p><h3><span style="font-size: 24px;">🔁📅 ¿Por qué usarlo de forma recurrente?</span></h3><h3><span style="font-size: 14px;">Porque el stock lento es progresivo y silencioso: si no lo controlas, se acumula, pierde valor y te quita liquidez.</span></h3><p><br></p><p><span style="font-size: 18px;">Revisa este reporte&nbsp;</span><strong style="font-size: 18px;">al final de cada semana</strong><span style="font-size: 18px;">&nbsp;para:</span></p><p><br></p><ul><li><span style="font-size: 18px;">⚡️&nbsp;</span><strong style="font-size: 18px;">Detectar rápidamente cuándo un producto pasa de baja rotación a muerto.</strong></li></ul><p><br></p><ul><li><span style="font-size: 18px;">💸&nbsp;</span><strong style="font-size: 18px;">Evitar que el stock dormido crezca mes a mes sin control.</strong></li></ul><p><br></p><ul><li><span style="font-size: 18px;">🔻&nbsp;</span><strong style="font-size: 18px;">Marcar productos para liquidación o promoción agresiva.</strong></li></ul><p><br></p><ul><li><span style="font-size: 18px;">🧩&nbsp;</span><strong style="font-size: 18px;">Diseñar estrategias de rotación o combos.</strong></li></ul><p><br></p><ul><li><span style="font-size: 18px;">✂️&nbsp;</span><strong style="font-size: 18px;">Depurar productos innecesarios del surtido.</strong></li></ul><p><br></p><ul><li><span style="font-size: 18px;">🏪&nbsp;</span><strong style="font-size: 18px;">Liberar espacio para lo que realmente se vende.</strong></li></ul><p><br></p><p><hr></p><p><br></p><p><span style="font-size: 18px;">📦&nbsp;</span><strong style="font-size: 18px;">Cada semana que no limpias, más dinero queda atrapado en tu almacén.</strong></p><p><span style="font-size: 18px;">Haz de este diagnóstico tu mejor hábito para&nbsp;</span><strong style="font-size: 18px;">invertir mejor y vender más rápido.</strong></p>`,
  'Recomendación Stock de Alerta ✓' : 'dancer'
};
const reportData = {
  Ventas: [
    {
      label: 'Analisis Inventario ABC ✓',
      endpoint: '/abc',
      insights: [],
      parameters: [
        { name: 'periodo_abc', label: 'Período de Análisis ABC', type: 'select',
          options: [
            { value: '3', label: 'Últimos 3 meses' },
            { value: '6', label: 'Últimos 6 meses' },
            { value: '12', label: 'Últimos 12 meses' },
            { value: '0', label: 'Todo' }
          ]
        },
        { name: 'criterio_abc', label: 'Criterio Principal ABC', type: 'select',
          options: [
            { value: 'combinado', label: 'Combinado o Ponderado' },
            { value: 'ingresos', label: 'Por Ingresos' },
            { value: 'unidades', label: 'Por Cantidad Vendida' },
            { value: 'margen', label: 'Por Margen' }
          ]
        }
      ]
    },
    { label: 'Top productos', endpoint: '/top-productos', insights: [], parameters: [] },
    {
      label: 'Tendencias',
      endpoint: '/tendencias',
      insights: [],
      parameters: [
        { name: 'categoria_tendencia', label: 'Categoría para Tendencia', type: 'select',
          options: [
            { value: 'electronics', label: 'Electrónicos' },
            { value: 'ropa', label: 'Ropa' },
            { value: 'hogar', label: 'Hogar' },
            { value: 'alimentos', label: 'Alimentos' }
          ]
        }
      ]
    },
  ],
  Inventario: [
    {
      label: 'Reposición Inteligente de Stock General ✓',
      endpoint: '/reposicion-stock',
      insights: [],
      parameters: []
    },
    { label: 'Diagnóstico Stock Muerto ✓', endpoint: '/diagnostico-stock-muerto', insights: [],
      parameters: [
        { name: 'meses_analisis', label: 'Período de análisis de rotación (últimos meses)', type: 'select',
          options: [
            { value: '3', label: 'Últimos 3 meses' },
            { value: '6', label: 'Últimos 6 meses' },
            { value: '12', label: 'Últimos 12 meses' }
          ]
        }
      ]
    },
    { label: 'Recomendación Stock de Alerta ✓',
      endpoint: '/reporte-stock-minimo-sugerido',
      insights: [],
      parameters: [
        { name: 'dias_cobertura_deseados', label: 'Días de cobertura deseados', type: 'select',
          options: [
            { value: '5', label: '5 días' },
            { value: '10', label: '10 días' },
            { value: '15', label: '15 días' },
            { value: '30', label: '30 días' }
          ]
        },
        { name: 'meses_analisis_historicos', label: 'Meses de análisis históricos', type: 'select',
          options: [
            { value: '3', label: 'Últimos 3 meses' },
            { value: '6', label: 'Últimos 6 meses' },
            { value: '12', label: 'Últimos 12 meses' }
          ]
        }
      ]
    },
    { label: 'Sobrestock', endpoint: '/sobrestock', insights: [], parameters: [] },
    { label: 'Rotación', endpoint: '/rotacion', insights: [], parameters: [] },
  ],
  Financiero: [
    {
      label: 'Stock crítico',
      endpoint: '/stock-critico',
      insights: [],
      parameters: [
        { name: 'umbral_critico_dias', label: 'Umbral Crítico (días cobertura)', type: 'select',
          options: [
            { value: '3', label: 'Menos de 3 días' },
            { value: '7', label: 'Menos de 7 días' },
            { value: '10', label: 'Menos de 10 días' }
          ]
        }
      ]
    },
    { label: 'Sobrestock', endpoint: '/sobrestock', insights: [], parameters: [] },
    { label: 'Rotación', endpoint: '/rotacion', insights: [], parameters: [] },
  ],
  Comercial: [
    { label: 'Stock crítico', endpoint: '/stock-critico', insights: [], parameters: [] },
    { label: 'Sobrestock', endpoint: '/sobrestock', insights: [], parameters: [] },
    { label: 'Rotación', endpoint: '/rotacion', insights: [], parameters: [] },
  ]
};


function LandingPage() {
  const [ventasFile, setVentasFile] = useState(null);
  const [inventarioFile, setInventarioFile] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [filesReady, setFilesReady] = useState(false);
  const [insightHtml, setInsightHtml] = useState('');
  const [parameterValues, setParameterValues] = useState({});


  // --- MODIFICACIÓN 1: Estado para el caché de la respuesta ---
  const [cachedResponse, setCachedResponse] = useState({ key: null, blob: null });
  const [isLoading, setIsLoading] = useState(false); // Para feedback visual


  const handleVentasInput = (file) => setVentasFile(file);
  const handleInventarioInput = (file) => setInventarioFile(file);

  const getParameterLabelsForFilename = () => {
    if (!selectedReport?.parameters || selectedReport.parameters.length === 0) return "";

    return selectedReport.parameters.map(param => {
      const selectedValue = parameterValues[param.name];
      if (!selectedValue) return null;

      return `${param.name}-${selectedValue}`; // técnico y rastreable
    }).filter(Boolean).join('_');
  };

  const handleReportView = (reportItem) => {
    setSelectedReport(reportItem);
    setInsightHtml(diccionarioData[reportItem.label] || "<p>No hay información disponible.</p>");
    const initialParams = {};
    if (reportItem.parameters && reportItem.parameters.length > 0) {
      reportItem.parameters.forEach(param => {
        if (param.type === 'select' && param.options && param.options.length > 0) {
          initialParams[param.name] = param.options[0].value;
        } else {
          initialParams[param.name] = '';
        }
      });
    }
    setParameterValues(initialParams);
    // No limpiar caché aquí, se limpia al cerrar modal o si los parámetros cambian ANTES de descargar
    setShowModal(true);
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
    if (!selectedReport || !ventasFile || !inventarioFile) {
      alert("Asegúrate de seleccionar un reporte y cargar ambos archivos CSV.");
      return;
    }
    setIsLoading(true);

    const parameterLabels = getParameterLabelsForFilename();
    const baseLabel = selectedReport.label.replace(/ ✓/g, '').trim();
    const suffix = parameterLabels ? `_${parameterLabels}` : '';
    const filename = `${baseLabel}_${getNow()}${suffix}.xlsx`;

    const currentCacheKey = `${selectedReport.endpoint}-${JSON.stringify(parameterValues)}`;

    if (cachedResponse.key === currentCacheKey && cachedResponse.blob) {
      console.log("Usando respuesta de caché para:", currentCacheKey);
      triggerDownload(cachedResponse.blob, `${baseLabel}_${getNow()}${suffix}_cached.xlsx`);
       triggerDownload(cachedResponse.blob, `${selectedReport.label.replace(/ ✓/g, '')}_${getNow()}_cached.xlsx`);
      return;
    }

    console.log("Solicitando al servidor para:", currentCacheKey);
    const formData = new FormData();
    formData.append("ventas", ventasFile);
    formData.append("inventario", inventarioFile);

    if (selectedReport.parameters && selectedReport.parameters.length > 0) {
      selectedReport.parameters.forEach(param => {
        if (parameterValues[param.name] !== undefined && parameterValues[param.name] !== null) {
          formData.append(param.name, parameterValues[param.name]);
        }
      });
    }

    try {
      const response = await axios.post(`${API_URL}${selectedReport.endpoint}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        responseType: 'blob',
      });

      const newBlob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      setCachedResponse({ key: currentCacheKey, blob: newBlob }); // Guardar en caché
      triggerDownload(newBlob, filename);
      // triggerDownload(newBlob, `${selectedReport.label.replace(/ ✓/g, '')}_${getNow()}.xlsx`);

    } catch (err) {
      alert("Error al subir los archivos y generar el reporte: " + (err.response?.data?.detail || err.message));
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
      const currentCacheKey = `${selectedReport.endpoint}-${JSON.stringify(parameterValues)}`;
      if (cachedResponse.key && cachedResponse.key !== currentCacheKey) {
        console.log("Parámetros cambiados, limpiando caché anterior:", cachedResponse.key);
        setCachedResponse({ key: null, blob: null });
      }
    }
  }, [parameterValues, showModal, selectedReport, cachedResponse.key]);


  return (
    <>
      {showModal && selectedReport && (
        <div className="w-full h-full fixed z-50 inset-0 flex items-end justify-center mb-10 overflow-y-auto">
          <div className="w-full h-full bg-white absolute top-0 flex flex-col">
            <div className="p-4 mt-10 border-b bg-white z-10 shadow text-center sticky top-0">
              <h2 className="text-xl font-bold text-gray-800 ">
                {selectedReport.label}
              </h2>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-6">
              {selectedReport.parameters && selectedReport.parameters.length > 0 && (
                <div className="mb-6 p-4 border rounded-md shadow-sm bg-gray-50">
                  <h3 className="text-lg font-semibold text-gray-700 mb-3">Parámetros del Reporte</h3>
                  {selectedReport.parameters.map((param) => {
                    if (param.type === 'select') {
                      return (
                        <div key={param.name} className="mb-4">
                          <label htmlFor={param.name} className="block text-sm font-medium text-gray-600 mb-1">
                            {param.label}:
                          </label>
                          <select
                            id={param.name}
                            name={param.name}
                            value={parameterValues[param.name] || ''}
                            onChange={(e) => {
                              setParameterValues(prev => ({ ...prev, [param.name]: e.target.value }));
                            }}
                            className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          >
                            {param.options && param.options.map(option => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              )}
              <div
                className="text-gray-700 space-y-2 text-left text-sm mt-10"
                dangerouslySetInnerHTML={{ __html: insightHtml }}
              >
              </div>
            </div>
            <div className="p-4 w-full border-t relative bottom-0 bg-white z-10 shadow text-center sticky bottom-0">
              <button
                onClick={buttonDownloadHandleMulti}
                className={`border px-6 py-2 rounded-lg font-semibold ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                style={{
                  backgroundImage: isLoading ? 'none' : 'linear-gradient(to right, #560bad, #7209b7, #b5179e)',
                  backgroundColor: isLoading ? '#cccccc' : 'transparent',
                  color: isLoading ? '#666666' : 'transparent',
                  borderColor: isLoading ? '#999999' : '#7209b7',
                  backgroundClip: isLoading ? 'padding-box' : 'text', // 'text' para el degradado del texto, 'padding-box' para color sólido
                }}
                disabled={!ventasFile || !inventarioFile || isLoading}
              >
                {isLoading ? 'Generando...' : `👉 Descargar ${selectedReport.label.replace(' ✓', '')}`}
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
      <div className={`min-h-screen bg-gradient-to-b from-neutral-900 via-background to-gray-900
        flex flex-col items-center justify-center text-center px-4 sm:px-8 md:px-12 lg:px-20
        ${showModal ? 'overflow-hidden h-screen' : ''}`}>
        <div className='w-full max-w-4xl'>
          <h1 className="text-4xl font-semibold text-white mt-6">
            Bienvenido a <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(to right, #560bad, #7209b7, #b5179e)' }}
            >
              [Ferri]GPT
            </span>
          </h1>
          <p className="mt-4 text-lg text-gray-100">
            Sube tus archivos y selecciona el análisis que deseas
          </p>
        </div>
        <div className='mt-10 w-full max-w-2xl grid text-white md:grid-cols-2 gap-6 px-2'>
          <div className="max-h-[300px] overflow-auto bg-gray-800 p-1 rounded-lg">
            <CsvDropZone onFile={handleVentasInput} />
          </div>
          <div className="max-h-[300px] overflow-auto bg-gray-800 p-1 rounded-lg">
            <CsvDropZone2 onFile={handleInventarioInput} />
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
                      className="bg-white bg-opacity-80 shadow-xl text-black text-sm font-medium rounded-lg px-4 py-3 hover:bg-purple-200 hover:text-purple-800 transition duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500"
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
            📂 Por favor, sube ambos archivos (Ventas e Inventario) para habilitar los análisis.
          </p>
        )}
      </div>
    </>
  );
}

export default LandingPage;
