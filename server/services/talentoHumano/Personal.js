
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
}
