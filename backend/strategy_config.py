DEFAULT_STRATEGY = {
  # Pesos de Importancia (1-10)
  "score_ventas": 8,
  "score_ingreso": 6,
  "score_margen": 4,
  "score_dias_venta": 2,
  
  # Parámetros de Riesgo y Cobertura
  "lead_time_dias": 3,
  "dias_cobertura_ideal_base": 5,
  "dias_seguridad_base": 0,

  # Parámetros de Análisis
  "dias_analisis_ventas_recientes": 30,
  "dias_analisis_ventas_general": 180,
  "excluir_sin_ventas": 'true',
  "peso_ventas_historicas": 0.6,
}