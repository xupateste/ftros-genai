import { useState, useCallback } from 'react'
import { FiUpload, FiCheckCircle } from 'react-icons/fi'
import { CSVImporter } from "csv-import-react";

function CsvDropZone2({ onFile }) {
    const [file, setFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false)

    const [isOpen, setIsOpen] = useState(false);

    const customTranslations = {
        es: {
          Upload: "Cargar Stock actual",
          "Browse files": "Examinar...",
          "Drop your file here": "Stock Actual",
          or: "👇"
        }
      }

    const templateStock = {
        columns: [
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
            name: "Cantidad en stock actual",
            key: "Cantidad en stock actual",
            required: true,
            description: "Sólo valor numérico entero ej:10",
            suggested_mappings: ["Cantidad en stock actual"]
          },
          {
            name: "Precio de compra actual (S/.)",
            key: "Precio de compra actual (S/.)",
            required: true,
            description: "Sólo valor numérico entero ó decimal ej:10.5",
            suggested_mappings: ["Precio de compra actual (S/.)"]
          },
          {
            name: "Precio de venta actual (S/.)",
            key: "Precio de venta actual (S/.)",
            required: true,
            description: "Sólo valor numérico entero ó decimal ej:10.5",
            suggested_mappings: ["Precio de venta actual (S/.)"]
          },
          {
            name: "Marca",
            key: "Marca",
            required: true,
            suggested_mappings: ["Marca"]
          },
          {
            name: "Categoría",
            key: "Categoría",
            required: true,
            suggested_mappings: ["Categoría"]
          },
          {
            name: "Subcategoría",
            key: "Subcategoría",
            required: true,
            suggested_mappings: ["Subcategoría"]
          },
          {
            name: "Rol de categoría",
            key: "Rol de categoría",
            required: true,
            suggested_mappings: ["Rol de categoría"]
          },
          {
            name: "Rol del producto",
            key: "Rol del producto",
            required: true,
            suggested_mappings: ["Rol del producto"]
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
                        border border-white border-opacity-30 ${file ? 'solid border-2' : 'border-2 border-dashed'} rounded-lg
                        hover:ring-1 hover:ring-white hover:ring-opacity-60
                        p-4 sm:p-12 w-full max-w-md mx-auto
                        transition-colors duration-300
                        bg-transparent text-white`}
             onClick={() => setIsOpen(true)}
            >
            {file ? <FiCheckCircle className="text-5xl mb-4 opacity-100" /> : <FiUpload className="text-5xl mb-4 opacity-20" />}
            <span className={`text-lg font-semibold mb-2 ${file ? 'opacity-100' : 'opacity-20'}`}>Stock actual</span>
            {file ? <span className="text-sm opacity-700">click para cambiar</span> : <span className="text-sm opacity-20">click para importar</span> }
            <input
                id="csv-upload"
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleFileInput}
            />
            {/*{file && (
              <div className="max-h-16 truncate mt-2 ">
                <span className="max-w-[170px] text-xs opacity-20 break-words truncate text-center block">
                  ✅ {file.name}
                </span>
              </div>
            )}*/}
            </div>
            <CSVImporter
                modalIsOpen={isOpen}
                modalOnCloseTriggered={() => setIsOpen(false)}
                darkMode={true}
                language="es"
                customTranslations={customTranslations}
                onComplete={(data) => toCSVFile(data, "Stock actual")}
                template={templateStock}
              />
        </>
    )
}

export default CsvDropZone2;