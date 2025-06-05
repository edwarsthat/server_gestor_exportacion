import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function Get_info_update_app_desktop() {
    try {
        const versionPath = path.join(__dirname, '..', '..', '..', 'updates', 'desktop', 'latest.yml');
        const fileContents = await fs.readFile(versionPath, 'utf8');
        const version = yaml.load(fileContents);

        const infoVersionPath = path.join(__dirname, 'update', `${version.version}.md`);
        console.log(infoVersionPath)
        const file = await fs.readFile(infoVersionPath, 'utf8');
        return file;
    } catch (error) {
        console.log(error);
    }
}
