
const { connectProcesoDB } = require("../DB/mongoDB/config/config");
const { defineCargo } = require("../DB/mongoDB/schemas/usuarios/schemaCargos");


async function modificar_actualizar_permisoso() {
    try {
        const db = await connectProcesoDB("mongodb://admin:SwR7uJHy1cnDDH3zRVMKZFwLOvn3RQBl@localhost:27017/sistema?authSource=admin")

        const Cargo = await defineCargo(db);

        const data = await Cargo.findById("66b29b1736733668246c9559").exec();
        const dev = data.toObject()
        // console.log(dev["Inventario y Logística"]["Inventarios"])
        let updateFields = {};

        for (let areaKey in dev) {
            if (["_id", "Cargo", "Rol", "createdAt", "__v"].includes(areaKey)) continue; // Evitar campos internos de MongoDB

            for (let sectionKey in dev[areaKey]) {
                for (let winKey in dev[areaKey][sectionKey]) {
                    for (let permisoKey in dev[areaKey][sectionKey][winKey].permisos) {

                        const path = `${areaKey}.${sectionKey}.${winKey}.permisos.${permisoKey}`;
                        const newValue = dev[areaKey][sectionKey][winKey].permisos[permisoKey]; // Valor nuevo
                        updateFields[path] = newValue;
                    }
                }
            }
        }
        console.log("Campos a actualizar:", updateFields);

        // Actualizar cada campo individualmente solo en documentos que ya lo tengan
        for (let path in updateFields) {
            const newValue = updateFields[path];
            // Solo se actualizan documentos en los que ya existe ese campo
            const result = await Cargo.updateMany(
                { [path]: { $exists: true } },
                { $set: { [path]: newValue } }
            );
            console.log(`Actualizados ${result.modifiedCount} documentos para el path ${path}`);
        }

        console.log("Actualización condicional completada.");
        await db.close();
        await db.close();
    } catch (err) {
        console.log(err)
    }




}

modificar_actualizar_permisoso()

