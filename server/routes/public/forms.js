
const express = require('express');
const path = require('path');
const multer = require('multer');
const { ComercialRepository } = require('../../api/Comercial');


const formsAPI = express.Router();
const uploadPath = path.join(
    __dirname,
    "..",
    "..",
    '..',
    "uploads",
    "clientes",
    "reclamos"
)

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadPath); // carpeta donde se guardarán los archivos
    },
    filename: function (req, file, cb) {
        // Por ejemplo, aseguramos un nombre único: Date.now + nombre original
        cb(null, Date.now() + path.extname(file.originalname));
    }
})

const upload = multer({ storage });

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

formsAPI.post("/reclamaciones_calidad", upload.array('documentos'), async (req, res) => {
    try {
        const paths = req.files.map(item => item.path);
        const data = {
            form: req.body,
            paths
        };

        const response = await ComercialRepository.put_comercial_reclamacionCalidad_contenedor(data);
        // Envía la respuesta exitosa
        res.status(200).json(response);
    } catch (error) {
        // Maneja el error y reenvíalo como consideres apropiado
        console.error('Error al crear la reclamación de calidad:', error);
        res.status(500).json({
            message: 'Ocurrió un error al procesar la solicitud.',
            error: error.message || error
        });
    }
});


module.exports.formsAPI = formsAPI

