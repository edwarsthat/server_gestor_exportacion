const { VariablesDelSistema } = require("../../Class/VariablesDelSistema");

const modificarInventarioCanastillas = async (canastillas, canastillasPrestadas) => {
    await VariablesDelSistema.modificar_canastillas_inventario(canastillasPrestadas, "canastillasPrestadas");
    await VariablesDelSistema.modificar_canastillas_inventario(canastillas, "canastillas");
};

module.exports = {
    modificarInventarioCanastillas
}
