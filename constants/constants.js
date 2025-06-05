import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Magia para recuperar __dirname:
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rutaTipoFrutas = path.join(__dirname, './tipo_fruta.json');
const rutaTipoDescartes = path.join(__dirname, './tipoDescartes.json');

export const cargarTipoFrutas = () => {
    try {
        const textoFrutas = fs.readFileSync(rutaTipoFrutas, 'utf-8');
        const tipoFrutas = JSON.parse(textoFrutas);
        return tipoFrutas
    } catch (err) {
        throw new Error(`Error al leer o parsear tipo_fruta.json: ${err.message}`);
    }
}

export const cargarDescartes = () => {
    try {
        const textoDescartes = fs.readFileSync(rutaTipoDescartes, 'utf-8');
        const descartes = JSON.parse(textoDescartes);
        return descartes
    } catch (err) {
        throw new Error(`Error al leer o parsear tipo_fruta.json: ${err.message}`);
    }
}


