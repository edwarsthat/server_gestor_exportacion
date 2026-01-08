import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function Get_info_update_app_desktop() {
    try {
        const versionPath = path.join(__dirname, '..', '..', '..', 'public', 'updates', 'desktop', 'latest.yml');
        const fileContents = await fs.readFile(versionPath, 'utf8');
        const version = yaml.load(fileContents);

        // Validar que version siga el formato semántico (X.Y.Z o X.Y.Z-sufijo)
        // eslint-disable-next-line security/detect-unsafe-regex
        if (!version.version || !/^\d+\.\d+\.\d+(-[\w.-]+)?$/.test(version.version)) {
            throw new Error('Formato de versión inválido');
        }

        const infoVersionPath = path.join(__dirname, 'update', `${version.version}.md`);
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        const file = await fs.readFile(infoVersionPath, 'utf8');
        return file;
    } catch (error) {
        console.log(error);
    }
}
