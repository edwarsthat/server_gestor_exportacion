
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';
import { fileTypeFromBuffer } from 'file-type'; 
import { v4 as uuidv4 } from 'uuid';


const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class TransporteService {
    static async guardarFotosEntregaPrecintoContenedor(fotos) {

        const urlPath = path.join(
            __dirname,
            "..",
            "..",
            "uploads",
            "fotos",
            "entrega_precinto_contenedor"
        );

        await fs.mkdir(urlPath, { recursive: true });

        const savedPaths = [];

        if (!Array.isArray(fotos) || fotos.length < 1 || fotos.length > 3) {
            throw new Error("Debes enviar entre 1 y 3 fotos.");
        }

        for (let fotoBase64 of fotos) {
            // Quita el prefijo base64 y convierte a Buffer
            const matches = fotoBase64.match(/^data:(image\/\w+);base64,(.+)$/);
            if (!matches) {
                throw new Error('Formato de imagen inválido');
            }

            const buffer = Buffer.from(matches[2], 'base64');

            if (buffer.length > MAX_SIZE) {
                throw new Error('Cada foto debe pesar máximo 5 MB.');
            }

            // Usa FileType para verificar tipo de archivo real
            const type = await fileTypeFromBuffer(buffer);
            if (!type || !['image/jpeg', 'image/png', 'image/webp'].includes(type.mime)) {
                throw new Error('Tipo de imagen no permitido');
            }

            // Nombre seguro y extensión correcta
            const filename = `${uuidv4()}.${type.ext}`;
            const filePath = path.join(urlPath, filename);

            // Guarda el archivo
            await fs.writeFile(filePath, buffer);

            // Puedes guardar la ruta relativa para devolver al frontend o para guardar en la base de datos:
            const relativePath = path.join("uploads", "fotos", "entrega_precinto_contenedor", filename);
            savedPaths.push(relativePath);
        }

        return savedPaths;
    }
    static async obtenerFotosEntregaPrecintoContenedor(urlArr) {
        const baseDir = path.join(
            __dirname,
            "..",
            "..",
        );

        try {
            const readPromises = urlArr.map(async (relativeUrl) => {
                // Evita path traversal
                if (relativeUrl.includes("..")) {
                    throw new Error("Ruta no permitida: " + relativeUrl);
                }
                const fullPath = path.join(baseDir, relativeUrl);
                await fs.access(fullPath); // Verifica que exista
                const ext = path.extname(fullPath).toLowerCase();
                const mime = ext === ".png" ? "image/png" : "image/jpeg";
                const fileBuffer = await fs.readFile(fullPath);
                return { img: `data:${mime};base64,${fileBuffer.toString("base64")}` };
            })

            // Espera todas las lecturas en paralelo
            const base64Images = await Promise.all(readPromises);
            return base64Images;

        } catch (error) {
            throw new Error('Error al leer las fotos: ' + error.message);
        }
    }
}