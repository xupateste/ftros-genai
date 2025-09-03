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

export default templateStock