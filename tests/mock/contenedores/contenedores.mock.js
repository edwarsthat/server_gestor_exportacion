import fs from 'fs';
import path from 'path';

export const contenedoresEntregaPrecintoMock = () => {
    // Intentar diferentes métodos para encontrar la ruta correcta
    let archivosPath;

    // Método 1: Ruta absoluta directa
    const absolutePath = 'c:\\Users\\SISTEMA\\Documents\\Servidor\\server\\tests\\mock\\archivos';

    // Método 2: Ruta relativa desde process.cwd()
    const relativePath = path.join(process.cwd(), 'tests', 'mock', 'archivos');

    // Verificar cuál método funciona
    if (fs.existsSync(absolutePath)) {
        archivosPath = absolutePath;
        console.log('Usando ruta absoluta:', archivosPath);
    } else if (fs.existsSync(relativePath)) {
        archivosPath = relativePath;
        console.log('Usando ruta relativa:', archivosPath);
    } else {
        console.log('No se encontró la carpeta archivos');
        console.log('Ruta absoluta probada:', absolutePath);
        console.log('Ruta relativa probada:', relativePath);
        console.log('Directorio actual:', process.cwd());
        archivosPath = absolutePath; // Usar absoluta como fallback
    }

    const webpFile = path.join(archivosPath, '11c878f8-4a29-49a7-acbf-a6320237bd13.webp');
    const jpgFile = path.join(archivosPath, '1a6c2877-620b-4761-9f13-db97cb59fc2d.jpg');

    let fotos = [];

    try {
        console.log('Buscando archivos en:', archivosPath);
        console.log('Archivo webp:', webpFile);
        console.log('Archivo jpg:', jpgFile);

        // Leer archivo .webp y convertir a base64
        if (fs.existsSync(webpFile)) {
            console.log('Archivo webp encontrado, leyendo...');
            const webpBuffer = fs.readFileSync(webpFile);
            const webpBase64 = webpBuffer.toString('base64');
            fotos.push(`data:image/webp;base64,${webpBase64}`);
        } else {
            console.log('Archivo webp NO encontrado');
        }

        // Leer archivo .jpg y convertir a base64
        if (fs.existsSync(jpgFile)) {
            console.log('Archivo jpg encontrado, leyendo...');
            const jpgBuffer = fs.readFileSync(jpgFile);
            const jpgBase64 = jpgBuffer.toString('base64');
            fotos.push(`data:image/jpeg;base64,${jpgBase64}`);
        } else {
            console.log('Archivo jpg NO encontrado');
        }

        console.log('Total de fotos cargadas:', fotos.length);
    } catch (error) {
        console.error('Error leyendo archivos:', error);
        fotos = []; // En caso de error, mantener array vacío
    }


    return {
        data: {
            _id: '67c08e1103a1f82a75288f8b',
            entrega: 'edwar',
            recibe: 'stheven',
            fechaEntrega: '2025-06-13T11:01',
            observaciones: ''
        },
        fotos: fotos,
        action: 'post_transporte_conenedor_entregaPrecinto'
    }
}