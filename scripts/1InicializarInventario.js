import fs from 'fs';
import path from 'path';


// Definición de las rutas
const paths = {
    pathIDs: path.join(__dirname, '..', 'inventory', 'seriales.json'),
    inventarioPath: path.join(__dirname, '..', 'inventory', 'inventario.json'),
    inventarioDesverdizadoPath: path.join(__dirname, '..', 'inventory', 'inventarioDesverdizado.json'),
    ordenVaceoPath: path.join(__dirname, '..', 'inventory', 'OrdenDeVaceo.json'),
    inventarioDescartesPath: path.join(__dirname, '..', 'inventory', 'inventariodescarte.json'),
    cajasSinPalletPath: path.join(__dirname, '..', 'inventory', 'cajasSinPallet.json'),
    observacionesCalidadPath: path.join(__dirname, '..', 'inventory', 'observacionesCalidad.json')
};

// Función para crear un archivo si no existe
function crearArchivoSiNoExiste(ruta, contenidoInicial = '{}') {
    if (!fs.existsSync(ruta)) {
        const dirPath = path.dirname(ruta);
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
        fs.writeFileSync(ruta, contenidoInicial);
        console.log(`Archivo creado: ${ruta}`);
    } else {
        console.log(`El archivo ya existe: ${ruta}`);
    }
}

// Crear los archivos
Object.values(paths).forEach(ruta => {
    crearArchivoSiNoExiste(ruta);
});

console.log('Proceso completado.');