import express from 'express';
import rateLimit from 'express-rate-limit';
import { PersonalControllerRepository } from '../../api/talentoHumano/Personal.js';


export const routerTalentoHumano = express.Router();

// Rate limit para la verificación de carnets (ruta pública)
const carnetVerifyLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minuto
    max: 15, // máximo 15 peticiones por minuto por IP
    message: { status: 429, message: 'Demasiadas peticiones. Intenta más tarde.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// POST: El token debe enviarse en el body, no en la URL (seguridad)
// El cliente debe extraer el fragment (#token) de la URL y enviarlo aquí
routerTalentoHumano.post("/get_talentoHumano_personal_registro", carnetVerifyLimiter, async (req, res) => {
    try {
        // Validación de payload: solo extraer parámetros esperados, ignorar el resto
        const { serial, token } = req.body;
        const sanitizedPayload = { serial, token };

        const response = await PersonalControllerRepository.get_talentoHumano_personal_registro(sanitizedPayload)

        res.send({ status: 200, message: 'Ok', data: response })
    } catch (err) {
        res.status(err.status || 400).json({
            status: err.status || 400,
            message: err.message || 'Error en la verificación'
        })
    }
});
