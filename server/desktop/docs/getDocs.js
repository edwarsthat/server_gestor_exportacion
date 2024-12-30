const fs = require('fs/promises')
const path = require('path');
const yaml = require("js-yaml");

async function Get_info_update_app_desktop() {
    try {
        const versionPath = path.join(__dirname, '..', '..', '..', 'updates', 'desktop', 'latest.yml');
        const fileContents = await fs.readFile(versionPath, 'utf8');
        const version = yaml.load(fileContents);

        const infoVersionPath = path.join(__dirname, 'updates', `${version.version}.md`);
        const file = await fs.readFile(infoVersionPath, 'utf8');
        return file;
    } catch (error) {
        console.log(error);
    }
}

module.exports = {
    Get_info_update_app_desktop
};