import { useState, useCallback } from 'react'
import { FiUpload } from 'react-icons/fi'
import { CSVImporter } from "csv-import-react";

function CsvDropZone({ onFile }) {
    const [file, setFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false)

    const [isOpen, setIsOpen] = useState(false);

    const customTranslations = {
        es: {
          Upload: "Cargar Historial de Ventas",
          "Browse files": "Examinar..."
        }
      }

    const templateVentas = {
        columns: [
          {
            name: "Fecha de venta",
            key: "Fecha de venta",
            required: true,
            description: "Fecha en formato dd/mm/aaaa ej:23/05/2025",
            suggested_mappings: ["Fecha de venta"]
          },
          {
            name: "N° de comprobante / boleta",
            key: "N° de comprobante / boleta",
            required: true,
            // description: "Fecha en formato dd/mm/aaaa ej:23/05/2025",
            suggested_mappings: ["N° de comprobante / boleta"]
          },
          {
            name: "SKU / Código de producto",
            key: "SKU / Código de producto",
            required: true,
            suggested_mappings: ["SKU / Código de producto"]
          },
          {
            name: "Nombre del producto",
            key: "Nombre del producto",
            required: true,
            suggested_mappings: ["Nombre del producto"]
          },
          {
            name: "Cantidad vendida",
            key: "Cantidad vendida",
            required: true,
            description: "Sólo valor numérico entero ej:10",
            suggested_mappings: ["Cantidad vendida"]
          },
          {
            name: "Precio de venta unitario (S/.)",
            key: "Precio de venta unitario (S/.)",
            required: true,
            description: "Sólo valor numérico entero ó decimal ej:10.5",
            suggested_mappings: ["Precio de venta unitario (S/.)"]
          }
        ]
      };

    const jsonToCsv = (data) => {
        if (!data || !data.columns || !data.rows) {
          return "";
        }

        const header = data.columns.map((col) => col.name).join(",");
        const csvRows = data.rows.map((row) => {
          return data.columns.map((col) => row.values[col.key]).join(",");
        });

        return [header, ...csvRows].join("\n");
      };

    function toCSVFile(data, name) {
        const csvString = jsonToCsv(data);
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8' });
        let fileInputElement = document.getElementById('csv-upload');
        // Here load or generate data
        let file = new File([blob], "historial de ventas.csv", {type:"text/csv"});
        let container = new DataTransfer();
        container.items.add(file);
        fileInputElement.files = container.files;
        setFile(file);
        onFile(file);
        setIsOpen(false)
        // console.log(fileInputElement.files);
    }

    const handleFileInput = (e) => {
        e.preventDefault()
        console.log('handleFileInput')
    }

    return (
        <>
            <div
            // htmlFor="csv-upload"
            className={`cursor-pointer flex flex-col items-center justify-center
                        border border-white border-opacity-30 rounded-lg
                        hover:ring-1 hover:ring-white hover:ring-opacity-60
                        p-4 sm:p-12 w-full max-w-md mx-auto
                        transition-colors duration-300
                        bg-transparent text-white`}
             onClick={() => setIsOpen(true)}
            >
            <FiUpload className="text-5xl mb-4 opacity-70" />
            <span className="text-lg font-semibold mb-2">Historial de Ventas</span>
            <span className="text-sm opacity-70">click para importar</span>
            <input
                id="csv-upload"
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleFileInput}
            />
            {file && (
              <div className="max-h-16 overflow-y-auto mt-2">
                <span className="text-xs opacity-20 break-words text-center truncate block">
                  Historial de Ventas seleccionado ✅
                </span>
              </div>
            )}
            </div>
            <CSVImporter
                modalIsOpen={isOpen}
                modalOnCloseTriggered={() => setIsOpen(false)}
                darkMode={true}
                language="es"
                customTranslations={customTranslations}
                onComplete={(data) => toCSVFile(data, "Historial de Ventas")}
                template={templateVentas}
              />
        </>
    )
}

export default CsvDropZone;