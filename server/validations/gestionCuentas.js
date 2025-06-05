
export class gestionCuentasValidationsRepository {
    static query_gestionCuentas_obtener_usuarios(filtro) {
        const query = {}

        //se crea el query
        if (filtro.estado) {
            query.estado = filtro.estado === 'activos';
        }

        if (filtro.cargo) {
            query.cargo = filtro.cargo;
        }

        if (filtro.nombre) {
            query.nombre = { $regex: filtro.nombre, $options: "i" };
        }

        if (filtro.usuario) {
            query.usuario = { $regex: filtro.usuario, $options: "i" };
        }

        return query
    }
}
