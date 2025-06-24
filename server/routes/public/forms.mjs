import express from 'express';
import path from 'path';
import multer from 'multer';
import { ComercialRepository } from '../../api/Comercial.js';
import { fileTypeFromFile } from 'file-type'; // ✅ Así es como lo debes hacer

import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import rateLimit from 'express-rate-limit';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const formsAPI = express.Router();

const uploadPath = path.join(
    __dirname,
    "..",
    "..",
    '..',
    "uploads",
    "clientes",
    "reclamos"
)

const allowedTypes = [
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/jpg',
];
const allowedExtensions = ['.pdf', '.png', '.jpg', '.jpeg'];

const formLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min
    max: 50, // Adjust based on expected traffic
    message: 'Demasiadas solicitudes, intenta más tarde.',
});

const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(file.mimetype) && allowedExtensions.includes(ext)) {
        cb(null, true); // Archivo aceptado
    } else {
        cb(new Error('Archivo no permitido'), false); // Archivo rechazado
    }

};

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        cb(
            null,
            Date.now() + '_' + uuidv4() + path.extname(file.originalname).toLowerCase()
        );
    }
})



const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }
});

formsAPI.use((err, req, res, next) => {
    if (err instanceof multer.MulterError || err.message === 'Archivo no permitido') {
        return res.status(400).json({ message: err.message });
    }
    next(err);
});

formsAPI.get("/reclamaciones_calidad", (req, res) => {
    const filePath = path.join(
        __dirname,
        '..', '..', '..',
        'public',
        'forms',
        'clientes',
        'reclamacionCalidad',
        'index.html'
    );
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error al enviar el archivo');
        }
    });
});

formsAPI.post("/reclamaciones_calidad", formLimiter, upload.array('documentos'), async (req, res) => {
    console.log("Recibido formulario de reclamación de calidad");
    try {

        const files = Array.isArray(req.files) ? req.files : [];
        const paths = files.map(item => item.path);
        const data = {
            form: req.body,
            paths
        };

        for (const file of files) {
            const fileType = await fileTypeFromFile(file.path);
            if (!fileType || !allowedTypes.includes(fileType.mime)) {
                // Borra el archivo peligroso
                await fs.unlink(file.path);
                throw new Error('Archivo no permitido por su contenido real');
            }
        }

        const response = await ComercialRepository.put_comercial_reclamacionCalidad_contenedor(data);
        // Envía la respuesta exitosa
        res.status(200).json(response);
    } catch (error) {
        // 🔥 Cleanup: elimina archivos subidos si ocurre un error
        if (req.files) {
            for (const file of req.files) {
                try {
                    await fs.unlink(file.path);
                } catch (err) {
                    console.error('Error al eliminar archivo:', file.path, err);
                }
            }
        }
        console.error('Error al crear la reclamación de calidad:', error);
        res.status(500).json({
            message: 'Ocurrió un error al procesar la solicitud.',
            error: error.message || error
        });
    }
});




