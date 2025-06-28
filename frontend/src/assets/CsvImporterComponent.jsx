// src/assets/CsvImporterComponent.jsx

import React, { useState } from 'react';
import { FiUpload, FiCheckCircle, FiAlertTriangle, FiLoader } from 'react-icons/fi';
import { CSVImporter } from "csv-import-react";

function CsvImporterComponent({ 
  fileType,         // 'ventas' o 'inventario'
  title,            // "Historial de Ventas" o "Stock Actual"
  template,         // El objeto de template específico
  onFileProcessed,  // La función a llamar cuando el archivo está listo
  uploadStatus      // 'idle', 'uploading', 'success', 'error'
}) {
  const [isOpen, setIsOpen] = useState(false);

  // Traducciones personalizadas basadas en el título
  const customTranslations = {
    es: {
      Upload: `Cargar ${title}`,
      "Browse files": "Examinar...",
      "Drop your file here": title,
      or: "👇"
    }
  };

  // Función para convertir el JSON de la librería a una cadena de texto CSV
  const jsonToCsv = (data) => {
    if (!data || !data.columns || !data.rows) return "";
    const header = data.columns.map((col) => col.name).join(",");
    // Se asegura de que los valores con comas estén entre comillas
    const csvRows = data.rows.map((row) => 
      data.columns.map((col) => {
        const value = (row.values[col.key] || '').toString();
        // Si el valor contiene comas, lo encierra en comillas dobles
        return value.includes(',') ? `"${value}"` : value;
      }).join(",")
    );
    return [header, ...csvRows].join("\n");
  };

  // Función que se ejecuta cuando CSVImporter termina
  function handleComplete(data) {
    const csvString = jsonToCsv(data);
    // Añadimos el BOM para asegurar compatibilidad con Excel
    const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8' });
    
    // **SOLUCIÓN AL PROBLEMA DEL NOMBRE:** El nombre ahora es dinámico
    const filename = fileType === 'ventas' ? "historial_de_ventas.csv" : "stock_actual.csv";
    const file = new File([blob], filename, { type: "text/csv" });

    // Llama a la función del componente padre con el archivo y su tipo
    onFileProcessed(file, fileType); 
    setIsOpen(false);
  }

  // Lógica para mostrar diferentes estados visuales
  const getStatusContent = () => {
    switch (uploadStatus) {
      case 'uploading':
        return <><FiLoader className="text-5xl mb-4 text-purple-400 animate-spin" /> <span className="text-lg font-semibold mb-2">Subiendo...</span></>;
      case 'success':
        return <><FiCheckCircle className="text-5xl mb-4 text-green-400" /> <span className="text-lg font-semibold mb-2">{title} Cargado</span> <span className="text-sm opacity-70">click para cambiar</span></>;
      case 'error':
        return <><FiAlertTriangle className="text-5xl mb-4 text-red-400" /> <span className="text-lg font-semibold mb-2">Error al Subir</span> <span className="text-sm opacity-70">click para reintentar</span></>;
      case 'idle':
      default:
        return <><FiUpload className="text-5xl mb-4 opacity-20" /> <span className={`text-lg font-semibold mb-2 opacity-20`}>{title}</span> <span className="text-sm opacity-20">click para importar</span></>;
    }
  };

  return (
    <div className="w-full h-full p-4 flex items-center justify-center">
      <div
        onClick={() => uploadStatus !== 'uploading' && setIsOpen(true)}
        className={`cursor-pointer flex flex-col items-center text-center justify-center p-8 w-full max-w-md mx-auto rounded-lg transition-all duration-300 border-2 bg-transparent text-white ${
          uploadStatus === 'success' ? 'border-green-500' : 
          uploadStatus === 'error' ? 'border-red-500' : 'border-dashed border-white border-opacity-30'
        } ${uploadStatus === 'uploading' ? 'cursor-not-allowed' : 'hover:ring-2 hover:ring-purple-400'}`}
      >
        {getStatusContent()}
      </div>
      <CSVImporter
        modalIsOpen={isOpen}
        modalOnCloseTriggered={() => setIsOpen(false)}
        darkMode={true}
        language="es"
        customTranslations={customTranslations}
        onComplete={handleComplete}
        template={template}
      />
    </div>
  );
}

export default CsvImporterComponent;