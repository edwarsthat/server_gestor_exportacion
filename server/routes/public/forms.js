
const express = require('express');
const path = require('path');
const multer = require('multer');


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

formsAPI.post("/reclamaciones_calidad", upload.array('documentos'), (req, res) => {
    // req.body contendrá los campos de texto enviados
    console.log("Campos de texto:", req.body);

    // req.files contendrá la info de los archivos subidos (si tu input se llama 'documentos')
    console.log("Archivos subidos:", req.files);

    res.send({
        message: 'Formulario y archivos recibidos correctamente.',
        body: req.body,
        files: req.files
    });
});


module.exports.formsAPI = formsAPI

