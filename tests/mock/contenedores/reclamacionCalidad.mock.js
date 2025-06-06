// mocks/reclamacionCalidad.mock.js

// Mocks VÁLIDOS
export const reclamacionValida1 = {
    responsable: "Juan Pérez",
    Cargo: "Gerente de Calidad",
    telefono: "3216549870",
    cliente: "Frutera S.A.",
    fechaArribo: "2025-06-06",
    contenedor: "1119",
    correo: "jperez@frutera.com",
    kilos: "2500",
    cajas: "50",
    fechaDeteccion: "2025-06-07",
    moho_encontrado: "2",
    moho_permitido: "5",
    golpes_encontrado: "1",
    golpes_permitido: "4",
    frio_encontrado: "0",
    frio_permitido: "3",
    maduracion_encontrado: "0",
    maduracion_permitido: "2",
    otroDefecto: "",
    observaciones: "Producto llegó en buenas condiciones.",

};

export const reclamacionValida2 = {
    responsable: "Ana Martínez",
    Cargo: "Jefe de Recepción",
    telefono: "1234567890",
    cliente: "Exportadora Tropical",
    fechaArribo: "2025-05-20",
    contenedor: "1119",
    correo: "ana.m@tropical.com",
    kilos: "1200",
    cajas: "22",
    fechaDeteccion: "2025-05-21",
    moho_encontrado: "1",
    moho_permitido: "2",
    golpes_encontrado: "0",
    golpes_permitido: "1",
    frio_encontrado: "0",
    frio_permitido: "1",
    maduracion_encontrado: "0",
    maduracion_permitido: "1",
    otroDefecto: "Manchas leves en 2 cajas",
    observaciones: "",
};

export const reclamacionValida3 = {
    responsable: "Carlos López",
    Cargo: "Supervisor",
    telefono: "5551234567",
    cliente: "Del Monte",
    fechaArribo: "2025-06-01",
    contenedor: "1125",
    correo: "carlos.lopez@delmonte.com",
    kilos: "5000",
    cajas: "120",
    fechaDeteccion: "2025-06-02",
    moho_encontrado: "0",
    moho_permitido: "0",
    golpes_encontrado: "0",
    golpes_permitido: "0",
    frio_encontrado: "0",
    frio_permitido: "0",
    maduracion_encontrado: "0",
    maduracion_permitido: "0",
    otroDefecto: "",
    observaciones: "Todo perfecto.",
    archivosSubidos: ["etiqueta1.png"]
};

// Mocks INVÁLIDOS (malos)
export const reclamacionInvalida1 = {
    // Falta campo requerido: responsable
    Cargo: "Gerente",
    telefono: "123456789",
    cliente: "NoName Corp",
    fechaArribo: "2025-05-01",
    contenedor: "1126",
    correo: "correosinenie@correo.com",
    kilos: "900",
    cajas: "5",
    fechaDeteccion: "2025-05-02",
    moho_encontrado: "3",
    moho_permitido: "1", // Permitido menor al encontrado, podría ser error de negocio
    golpes_encontrado: "4",
    golpes_permitido: "4",
    frio_encontrado: "4",
    frio_permitido: "4",
    maduracion_encontrado: "4",
    maduracion_permitido: "4",
    otroDefecto: "",
    observaciones: "Demasiados defectos",
};

export const reclamacionInvalida2 = {
    responsable: "Ana SinCorreo",
    Cargo: "SinCargo",
    telefono: "invalid",
    cliente: "Cliente Prueba",
    fechaArribo: "2025-15-40", // Fecha inválida
    contenedor: "1127",
    correo: "correoinvalido", // Correo malformado
    kilos: "muchos", // No numérico
    cajas: "-3", // Negativo
    fechaDeteccion: "", // Vacío
    moho_encontrado: "abc", // No numérico
    moho_permitido: "",
    golpes_encontrado: "",
    golpes_permitido: "",
    frio_encontrado: "",
    frio_permitido: "",
    maduracion_encontrado: "",
    maduracion_permitido: "",
    otroDefecto: "",
    observaciones: "",
};

export const reclamacionInvalida3 = {
    responsable: "", // Vacío
    Cargo: "",
    telefono: "",
    cliente: "",
    fechaArribo: "",
    contenedor: "",
    correo: "",
    kilos: "",
    cajas: "",
    fechaDeteccion: "",
    moho_encontrado: "",
    moho_permitido: "",
    golpes_encontrado: "",
    golpes_permitido: "",
    frio_encontrado: "",
    frio_permitido: "",
    maduracion_encontrado: "",
    maduracion_permitido: "",
    otroDefecto: "",
    observaciones: "",
};
