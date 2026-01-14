
import path from 'path';
import { ContenedoresRepository } from '../Class/Contenedores.js';
import { TransporteError } from '../../Error/TransporteErrors.js';
import { RecordModificacionesRepository } from '../archive/ArchivoModificaciones.js';
import { FileService } from './helpers/FileService.js';

export class TransporteService {
    static async guardarFotosEntregaPrecintoContenedor(fotos) {

        const urlPath = path.join(
            "fotos",
            "entrega_precinto_contenedor"
        );

        const savedPaths = [];

        if (!Array.isArray(fotos) || fotos.length < 1 || fotos.length > 3) {
            throw new Error("Debes enviar entre 1 y 3 fotos.");
        }

        for (let fotoBase64 of fotos) {

            const relativePath = await FileService.saveBase64Image(
                fotoBase64,
                urlPath,
                'UPLOADS'
            );
            savedPaths.push(relativePath);
        }

        return savedPaths;
    }
    static async obtenerFotosEntregaPrecintoContenedor(urlArr) {

        try {
            const readPromises = urlArr.map(async (relativeUrl) => {
                let finalPath = relativeUrl;
                if (finalPath.startsWith('uploads')) {
                    finalPath = finalPath.replace(/^uploads[\\/]/, '');
                }
                const fileBuffer = await FileService.readFileAsBase64(finalPath, 'UPLOADS');
                return { img: fileBuffer };
            })

            // Espera todas las lecturas en paralelo
            const base64Images = await Promise.all(readPromises);
            return base64Images;

        } catch (error) {
            throw new Error('Error al leer las fotos: ' + error.message);
        }
    }
    static async filtrarContenedoresParaTransporte(contenedores) {
        const data = contenedores.filter(contenedor => {
            if (contenedor.registrosSalidas.length === 0) return true;
            else {
                let sum = 0;
                for (const registro of contenedor.registrosSalidas) {
                    if (registro.tipoVehiculo === 'Tractomula') return false;
                    else {
                        sum += registro.pesoEstimado || 0;
                        if (sum >= contenedor.totalKilos) return false;
                    }
                }
            }
            return true;
        })
        return data;
    }
    static async modificarRegistroontenedorSalidaVehiculoExportacion(action, user, oldregistro, data, { session = null } = {}) {
        //se elimina el registro del contenedor viejo
        const oldContenedor = await ContenedoresRepository.get_Contenedores_sin_lotes({
            ids: [oldregistro[0].contenedor._id],
        })
        if (oldContenedor.length === 0) {
            throw new TransporteError(404, `Contenedor no encontrado`);
        }
        await ContenedoresRepository.actualizar_contenedor(
            { _id: oldContenedor[0]._id },
            { $pull: { registrosSalidas: oldregistro[0]._id } },
            { session }
        );

        //se agrega el registro en el nuevo contenedor
        const newContenedor = await ContenedoresRepository.get_Contenedores_sin_lotes({
            query: { numeroContenedor: parseInt(data.contenedor) },
        }, { session })

        if (newContenedor.length === 0) {
            throw new TransporteError(404, `Contenedor nuevo no encontrado`);
        }
        await ContenedoresRepository.actualizar_contenedor(
            { numeroContenedor: data.contenedor },
            { $push: { registrosSalidas: oldregistro[0]._id } },
            { session }
        );

        // Registrar la modificación en el historial
        await RecordModificacionesRepository.post_record_contenedor_modification(
            action,
            user,
            [
                {
                    modelo: "Contenedor",
                    documentoId: oldContenedor[0]._id,
                    descripcion: `Contenedor origen: ${oldContenedor[0].numeroContenedor}`,
                },
                {
                    modelo: "Contenedor",
                    documentoId: newContenedor[0]._id,
                    descripcion: `Contenedor destino: ${newContenedor[0].numeroContenedor}`,
                },
                {
                    modelo: "RegistroSalida",
                    documentoId: oldregistro[0]._id,
                    descripcion: `Registro de salida modificado`,
                }
            ],
            {
                registroSalida: oldregistro[0],
                contenedorOrigen: oldContenedor[0].numeroContenedor,
            },
            {
                registroSalida: data,
                contenedorDestino: newContenedor[0].numeroContenedor,
            },
            {
                accion: action,
                registroId: oldregistro[0]._id,
                cambiosRealizados: data,
                contenedorAnterior: oldContenedor[0].numeroContenedor,
                contenedorNuevo: newContenedor[0].numeroContenedor
            }
        );
        return newContenedor;
    }
}