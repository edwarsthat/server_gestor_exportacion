
export const formularios_calidad = {
    limpieza_diaria: "Limpieza diária",
    limpieza_mensual: "Limpieza mensual",
    control_plagas: "Control de plagas"
}

export const limpieza_diaria_campos = {
    laboratorio: {
        label: "Laboratorio",
        keys: [
            { key: "meson", label: "Mesón" },
            { key: "utensilios", label: "Utensilios" },
            { key: "cajon", label: "Cajón" },
            { key: "piso", label: "Piso" },
            { key: "paredes", label: "Paredes" }
        ]
    },
    almacenamiento: {
        label: "Almacenamiento",
        keys: [
            { key: "pisos", label: "Pisos" },
            { key: "paredes", label: "Paredes" },
            { key: "estibadores", label: "Estibadores" },
            { key: "malla", label: "Malla" }
        ]
    },
    social: {
        label: "Área Social",
        keys: [
            { key: "mesones", label: "Mesones" },
            { key: "microondas", label: "Microondas" },
            { key: "vestieres", label: "Vestieres" }
        ]
    },
    recepcion: {
        label: "Recepción",
        keys: [
            { key: "tanque", label: "Tanque" },
            { key: "muelles", label: "Muelles" },
            { key: "estibadores", label: "Estibadores" }
        ]
    },
    lavado: {
        label: "Lavado",
        keys: [
            { key: "rodillos_lavado", label: "Rodillos Lavado" },
            { key: "paredes", label: "Paredes" },
            { key: "piso", label: "Piso" },
            { key: "rodillos_tunel", label: "Rodillos Túnel" },
            { key: "estructura_equipo", label: "Estructura del Equipo" },
            { key: "desbalinadora", label: "Desbalinadora" }
        ]
    },
    proceso: {
        label: "Proceso",
        keys: [
            { key: "rodillos_tunel", label: "Rodillos Túnel" },
            { key: "modulo", label: "Módulo" },
            { key: "rodillo_cera", label: "Rodillo Cera" },
            { key: "rodillos_clasificadora", label: "Rodillos Clasificadora" },
            { key: "bandejas", label: "Bandejas" },
            { key: "pisos", label: "Pisos" },
            { key: "paredes", label: "Paredes" },
            { key: "estibadores", label: "Estibadores" },
            { key: "herramientas", label: "Herramientas" },
            { key: "basculas", label: "Básculas" },
            { key: "canastillas_rojas", label: "Canastillas Rojas" },
            { key: "modulo_cera", label: "Módulo de Cera" },
            { key: "canastillas_azules", label: "Cantidad de canastillas azules lavadas" },
            { key: "muelle_exportacion", label: "Muelle de exportación libre de fruta en el suelo" },
            { key: "cuartos_frios", label: "Cuartos fríos libres de fruta en el suelo" },
            { key: "area_produccion", label: "Área de producción libre de fruta en el suelo" }
        ]
    },
    insumos: {
        label: "Insumos",
        keys: [
            { key: "estanteria", label: "Estantería" },
            { key: "piso", label: "Piso" },
            { key: "paredes", label: "Paredes" },
            { key: "orden", label: "Orden" }
        ]
    },
    servicios: {
        label: "Servicios Sanitarios",
        keys: [
            { key: "sanitarios", label: "Sanitarios" },
            { key: "lavamanos", label: "Lavamanos" },
            { key: "basura", label: "Basura" },
            { key: "piso", label: "Piso" },
            { key: "paredes", label: "Paredes" }
        ]
    },
    comunes: {
        label: "Áreas Comunes",
        keys: [
            { key: "alrededores", label: "Alrededores" },
            { key: "cuarto_residuos", label: "Cuarto de Residuos" }
        ]
    }
};

export const limpieza_mensual_campos = {
    recepcion: {
        label: "Recepción",
        keys: [
            { key: "piso", label: "Piso" },
            { key: "estibas_plasticas", label: "Estibas Plásticas" },
            { key: "anjeos", label: "Anjeos" },
            { key: "vigas", label: "Vigas" },
            { key: "muelles", label: "Muelles" },
            { key: "cuarto_desverdizado", label: "Cuarto Desverdizado" },
            { key: "tanque", label: "Tanque" },
            { key: "soporte", label: "Soporte" },
            { key: "oficina", label: "Oficina" },
            { key: "estibadores", label: "Estibadores" },
            { key: "tanque_inmersion", label: "Tanque de Inmersión" },
            { key: "banda", label: "Banda" },
            { key: "filtro", label: "Filtro" },
            { key: "canecas", label: "Canecas" },
            { key: "cortinas", label: "Cortinas" }
        ]
    },
    lavado: {
        label: "Lavado",
        keys: [
            { key: "paredes", label: "Paredes" },
            { key: "anjeos", label: "Anjeos" },
            { key: "extractores", label: "Extractores" },
            { key: "rodillos_drench", label: "Rodillos Drench" },
            { key: "rodillos_lavado", label: "Rodillos de Lavado" },
            { key: "extractores_secado", label: "Extractores de Secado" }
        ]
    },
    produccion: {
        label: "Producción",
        keys: [
            { key: "pisos", label: "Pisos" },
            { key: "ventiladores_tunel", label: "Ventiladores del Túnel" },
            { key: "paredes_tunel", label: "Paredes del Túnel" },
            { key: "ventiladores_piso", label: "Ventiladores de Piso" },
            { key: "rodillos_encerados", label: "Rodillos Encerados" },
            { key: "cilindro", label: "Cilindro" },
            { key: "clasificadora", label: "Clasificadora" },
            { key: "bandejas", label: "Bandejas" },
            { key: "soportes", label: "Soportes" },
            { key: "extractores", label: "Extractores" },
            { key: "ajeos", label: "Ajeos" },
            { key: "cuarto_insumos", label: "Cuarto de Insumos" },
            { key: "oficina", label: "Oficina" },
            { key: "filtros_desinfeccion", label: "Filtros de Desinfección" },
            { key: "canecas_residuos", label: "Canecas de Residuos" },
            { key: "estibadores", label: "Estibadores" },
            { key: "escaleras", label: "Escaleras" },
            { key: "carritos", label: "Carritos" },
            { key: "herramientas", label: "Herramientas" },
            { key: "puertas", label: "Puertas" },
            { key: "ventanas_ventilaciones", label: "Ventanas y Ventilación" }
        ]
    },
    pasillo: {
        label: "Pasillo",
        keys: [
            { key: "pisos", label: "Pisos" }
        ]
    },
    cuartosFrios: {
        label: "Cuartos Fríos",
        keys: [
            { key: "cortinas", label: "Cortinas" },
            { key: "muelle", label: "Muelle" },
            { key: "pisos", label: "Pisos" },
            { key: "ventiladores", label: "Ventiladores" }
        ]
    },
    social: {
        label: "Área Social",
        keys: [
            { key: "lockers", label: "Lockers" },
            { key: "comedor", label: "Comedor" },
            { key: "nevera", label: "Nevera" },
            { key: "horno", label: "Horno" },
            { key: "pisos", label: "Pisos" },
            { key: "paredes", label: "Paredes" },
            { key: "anjeos", label: "Anjeos" },
            { key: "canecas", label: "Canecas" },
            { key: "exteriores", label: "Exteriores" },
            { key: "comedor_exterior", label: "Comedor Exterior" }
        ]
    },
    carton: {
        label: "Cartón",
        keys: [
            { key: "piso_estiba", label: "Piso de Estiba" },
            { key: "estibadores", label: "Estibadores" }
        ]
    }
}

export const control_plagas_campos = {
    control: {
        label: "Control",
        keys: [
            { key: "exteriores", label: "Plagas en áreas exteriores" },
            { key: "contenedores_basura_limpios", label: "Contenedores de basura limpios, con tapa y bolsa correspondiente" },
            { key: "areas_limpias_libres_de_residuos", label: "Áreas limpias, libres de residuos sólidos, material vegetal y estancamiento de agua" },
            { key: "ausencia_animales_domesticos", label: "Ausencia de animales domésticos dentro de la planta" },
            { key: "rejillas_drenajes_sifones", label: "Rejillas, drenajes, sifones y vestieres" },
            { key: "ventanas_vidrios_ajeos", label: "Ventanas, vidrios y angeos en buen estado" },
            { key: "puertas", label: "Puertas" },
            { key: "mallas_proteccion", label: "Mallas de protección para extractores y ventilación" },
            { key: "espacios_equipos", label: "Espacios entre equipos" },
            { key: "sotano", label: "Estado del sótano" }
        ]
    },
    cebo: {
        label: "Cebo",
        keys: [
            { key: "consumo", label: "Consumo de Cebo" }
        ]
    },
    hallazgos: {
        label: "Hallazgos",
        keys: [
            { key: "roedores", label: "Roedores vivos o muertos" },
            { key: "cucarachas", label: "Cucarachas" },
            { key: "hormigas", label: "Hormigas" },
            { key: "insectos", label: "Insectos" },
            { key: "excremento", label: "Excremento" },
            { key: "sonidos", label: "Sonidos" },
            { key: "huellas", label: "Huellas" },
            { key: "madrigueras", label: "Madrigueras" },
            { key: "olores", label: "Olores anormales" },
            { key: "pelos", label: "Pelos" },
            { key: "manchas_orina", label: "Manchas de Orina" },
            { key: "otras_plagas", label: "Otras Plagas" }
        ]
    }
};

export const tipoFormularios = [
    { key: "limpieza_diari", label: "Limpieza diaria" },
]