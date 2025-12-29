
import crypto from 'crypto';
import config from '../../../src/config/index.js';

const ENCRYPTION_KEY = Buffer.from(config.ENCRYPTION_KEY, 'hex');
const IV_LENGTH = 16;
const ALGORITHM = 'aes-256-cbc';

export class PersonalTalentoHumanoService {
    static encryptBuffer(buffer) {
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

        const encrypted = Buffer.concat([
            cipher.update(buffer),
            cipher.final()
        ]);

        // Retorna IV + datos encriptados
        return Buffer.concat([iv, encrypted]);
    }

    static decryptBuffer(encryptedBuffer) {
        // Extraer el IV (primeros 16 bytes)
        const iv = encryptedBuffer.subarray(0, IV_LENGTH);
        // Extraer el contenido encriptado
        const encryptedContent = encryptedBuffer.subarray(IV_LENGTH);

        const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

        const decrypted = Buffer.concat([
            decipher.update(encryptedContent),
            decipher.final()
        ]);

        return decrypted;
    }
}
