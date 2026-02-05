
//para GOOGLE
import nodemailer from 'nodemailer';

// Crear el transporter SMTP para Gmail
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,           // smtp.gmail.com
  port: Number(process.env.MAIL_PORT),   // 587
  secure: process.env.MAIL_PORT === '465', // true si usas SSL (465)
    auth: {
    user: process.env.MAIL_USER,         // tu Gmail
    pass: process.env.MAIL_PASS,         // App Password de 16 caracteres
    },

 // 🔍 DEBUG POWER ACTIVADO
    logger: true,
    debug: true,
});

// Verificar la conexión al SMTP al iniciar
transporter.verify()
    .then(() => console.log('✅ Conexión SMTP lista'))
    .catch(err => console.error('❌ Error al conectar con SMTP:', err));

export async function sendMail({ to, subject, text, html }) {

    const info = await transporter.sendMail({
      from: process.env.MAIL_FROM, // Ej: "Soporte CELIFRUT <tuemail@gmail.com>"
        to,
        subject,
        text,
        html,
    });
    
    console.log('📧 Enviado a:', to);
    console.log('🆔 messageId:', info.messageId);

    return info;
    
}
