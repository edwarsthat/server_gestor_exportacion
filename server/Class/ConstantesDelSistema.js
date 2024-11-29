const fs = require('fs');
const path = require('path');
const { ProcessError } = require('../../Error/ProcessError');

const inspeccion_calidad_path = path.join(__dirname, '..', '..', 'constants', 'inspeccionCalidad.json');

class ConstantesDelSistema {
    static async get_info_formulario_inspeccion_fruta() {
        try {

            const inspeccionCalidadJSON = fs.readFileSync(inspeccion_calidad_path);
            const inspeccionCalidad = JSON.parse(inspeccionCalidadJSON);

            return inspeccionCalidad;

        } catch (err) {
            throw new ProcessError(410, `Error Obteniendo datos de inspeccionCalidadJSON ${err.name}`)
        }
    }
}

module.exports = {
    ConstantesDelSistema
}