export const AREAS_SELECCION = {
    proceso: {
        LAVADO: { value: 'LAVADO', label: 'Lavado' },
        ENCERADO: { value: 'ENCERADO', label: 'Encerado' }
    },

};
export const AREA_SELECCION = Object.values(AREAS_SELECCION.proceso).map(t => t.value);