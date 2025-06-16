const translations = {
    es: {
        title: 'Cuestionario para Reclamaciones de Calidad',
        infoSolicitante: '1. Información del solicitante',
        infoConfirm: 'Declaro que la información proporcionada es veraz y completa para la adecuada gestión de la\nreclamación.',
        nombre: 'Nombre Completo:',
        cargo: 'Cargo:',
        telefono: 'Teléfono de Contacto:',
        detalles: '2. Detalles de la reclamación',
        cliente: 'Nombre de su empresa:',
        fechaArribo: 'Fecha arribo contenedor:',
        contenedor: 'Número del contenedor (Este numero lo encontrará en la parte superior derecha del Packing List Report):',
        correo: 'Correo Electrónico:',
        kilos: 'Cantidad de kilos afectados:',
        cajas: 'Cantidad de cajas afectadas:',
        fechaDeteccion: 'Fecha en que se detectó el problema:',
        problemas: '3. Problemas Reportados',
        problemasDesc: '(Marcar en el primer espacio, el porcentaje encontrado en el contenedor y en el segundo el permitido por los estándares de calidad establecidos. )',
        moho: 'Moho:',
        mohoEncontrado: '% Encontrado',
        mohoPermitido: '% Permitido',
        golpes: 'Golpes:',
        golpesEncontrado: '% Encontrado',
        golpesPermitido: '% Permitido',
        frio: 'Daño por frío:',
        frioEncontrado: '% Encontrado',
        frioPermitido: '% Permitido',
        maduracion: 'Problemas de Maduración:',
        maduracionEncontrado: '% Encontrado',
        maduracionPermitido: '% Permitido',
        otroDefecto: 'Otros (Especificar):',
        observaciones: 'Observaciones Adicionales:',
        docReq: '4. Documentación Requerida',
        docReqDesc: 'Para una mejor evaluación de la reclamación, adjunte los siguientes documentos:',
        doc1: 'Fotos del rótulo de las cajas afectadas.',
        doc2: 'Registro del data logger del contenedor.',
        doc3: 'Fotos de la fruta afectada.',
        doc4: 'Registro de la inspección practicada a la fruta (si aplica, adjuntar informe oficial de inspección).',
        cargarDocs: 'Cargar documentos (PDF o imágenes):',
        enviar: 'Enviar Reclamación',
        exito: '¡Reclamación enviada exitosamente!',
        error: 'Error: ',
        errorRed: 'Error de red: ',
        placeholderResponsable: 'Ingresa el nombre del responsable',
        placeholderCargo: 'Cargo',
        placeholderTelefono: 'Número de teléfono',
        placeholderCliente: 'Ingresa el cliente',
        placeholderContenedor: 'Número de contenedor',
        placeholderCorreo: 'correo@ejemplo.com',
        placeholderKilos: 'Ingrese el número de kilos',
        placeholderCajas: 'Ingrese el número de cajas',
        placeholderObservaciones: 'Anota cualquier información adicional relevante',
        placeholderOtroDefecto: 'Otro defecto',
    },
    en: {
        title: 'Quality Claims Form',
        infoSolicitante: '1. Applicant Information',
        infoConfirm: 'I declare that the information provided is true and complete for the proper management of the claim.',
        nombre: 'Full Name:',
        cargo: 'Position:',
        telefono: 'Contact Phone:',
        detalles: '2. Claim Details',
        cliente: 'Your Company Name:',
        fechaArribo: 'Container Arrival Date:',
        contenedor: 'Container Number (You will find this number at the top right of the Packing List Report):',
        correo: 'Email Address:',
        kilos: 'Number of affected kilos:',
        cajas: 'Number of affected boxes:',
        fechaDeteccion: 'Date the problem was detected:',
        problemas: '3. Reported Problems',
        problemasDesc: '(Mark in the first space the percentage found in the container and in the second the percentage allowed by established quality standards.)',
        moho: 'Mold:',
        mohoEncontrado: '% Found',
        mohoPermitido: '% Allowed',
        golpes: 'Bruises:',
        golpesEncontrado: '% Found',
        golpesPermitido: '% Allowed',
        frio: 'Cold Damage:',
        frioEncontrado: '% Found',
        frioPermitido: '% Allowed',
        maduracion: 'Ripening Problems:',
        maduracionEncontrado: '% Found',
        maduracionPermitido: '% Allowed',
        otroDefecto: 'Others (Specify):',
        observaciones: 'Additional Observations:',
        docReq: '4. Required Documentation',
        docReqDesc: 'For a better evaluation of the claim, please attach the following documents:',
        doc1: 'Photos of the labels of the affected boxes.',
        doc2: 'Container data logger record.',
        doc3: 'Photos of the affected fruit.',
        doc4: 'Inspection record performed on the fruit (if applicable, attach official inspection report).',
        cargarDocs: 'Upload documents (PDF or images):',
        enviar: 'Submit Claim',
        exito: 'Claim submitted successfully!',
        error: 'Error: ',
        errorRed: 'Network error: ',
        placeholderResponsable: 'Enter the responsible person\'s name',
        placeholderCargo: 'Position',
        placeholderTelefono: 'Phone number',
        placeholderCliente: 'Enter the client',
        placeholderContenedor: 'Container number',
        placeholderCorreo: 'email@example.com',
        placeholderKilos: 'Enter the number of kilos',
        placeholderCajas: 'Enter the number of boxes',
        placeholderObservaciones: 'Add any other relevant information',
        placeholderOtroDefecto: 'Other defect',
    }
};

function setLang(lang) {
    const t = translations[lang];
    document.title = t.title;
    document.querySelector('h1').textContent = t.title;
    document.querySelector('legend').textContent = t.infoSolicitante;
    document.querySelector('fieldset p').textContent = t.infoConfirm;
    document.querySelector('label[for="responsable"]').textContent = t.nombre;
    document.querySelector('label[for="Cargo"]').textContent = t.cargo;
    document.querySelector('label[for="telefono"]').textContent = t.telefono;
    document.querySelectorAll('fieldset')[1].querySelector('legend').textContent = t.detalles;
    document.querySelector('label[for="cliente"]').textContent = t.cliente;
    document.querySelector('label[for="fechaArribo"]').textContent = t.fechaArribo;
    document.querySelector('label[for="contenedor"]').textContent = t.contenedor;
    document.querySelector('label[for="correo"]').textContent = t.correo;
    document.querySelector('label[for="kilos"]').textContent = t.kilos;
    document.querySelector('label[for="cajas"]').textContent = t.cajas;
    document.querySelector('label[for="fechaDeteccion"]').textContent = t.fechaDeteccion;
    document.querySelectorAll('fieldset')[2].querySelector('legend').textContent = t.problemas;
    document.querySelectorAll('fieldset')[2].querySelector('p').textContent = t.problemasDesc;
    document.querySelector('label[for="moho"]').textContent = t.moho;
    document.querySelector('input[name="moho_encontrado"]').placeholder = t.mohoEncontrado;
    document.querySelector('input[name="moho_permitido"]').placeholder = t.mohoPermitido;
    document.querySelector('label[for="golpes"]').textContent = t.golpes;
    document.querySelector('input[name="golpes_encontrado"]').placeholder = t.golpesEncontrado;
    document.querySelector('input[name="golpes_permitido"]').placeholder = t.golpesPermitido;
    document.querySelector('label[for="frio"]').textContent = t.frio;
    document.querySelector('input[name="frio_encontrado"]').placeholder = t.frioEncontrado;
    document.querySelector('input[name="frio_permitido"]').placeholder = t.frioPermitido;
    document.querySelector('label[for="maduracion"]').textContent = t.maduracion;
    document.querySelector('input[name="maduracion_encontrado"]').placeholder = t.maduracionEncontrado;
    document.querySelector('input[name="maduracion_permitido"]').placeholder = t.maduracionPermitido;
    document.querySelector('label[for="otroDefecto"]').textContent = t.otroDefecto;
    document.querySelector('label[for="observaciones"]').textContent = t.observaciones;
    document.querySelectorAll('fieldset')[3].querySelector('legend').textContent = t.docReq;
    document.querySelectorAll('fieldset')[3].querySelector('p').textContent = t.docReqDesc;
    const docList = document.querySelectorAll('fieldset')[3].querySelectorAll('ul li');
    docList[0].textContent = t.doc1;
    docList[1].textContent = t.doc2;
    docList[2].textContent = t.doc3;
    docList[3].textContent = t.doc4;
    document.querySelector('label[for="documentos"]').textContent = t.cargarDocs;
    document.querySelector('button[type="submit"]').textContent = t.enviar;

    document.getElementById('responsable').placeholder = t.placeholderResponsable;
    document.getElementById('Cargo').placeholder = t.placeholderCargo;
    document.getElementById('telefono').placeholder = t.placeholderTelefono;
    document.getElementById('cliente').placeholder = t.placeholderCliente;
    document.getElementById('contenedor').placeholder = t.placeholderContenedor;
    document.getElementById('correo').placeholder = t.placeholderCorreo;
    document.getElementById('kilos').placeholder = t.placeholderKilos;
    document.getElementById('cajas').placeholder = t.placeholderCajas;
    document.getElementById('observaciones').placeholder = t.placeholderObservaciones;
    document.getElementById('otroDefecto').placeholder = t.placeholderOtroDefecto;
}

document.getElementById('lang-select').addEventListener('change', function () {
    setLang(this.value);
});
// Inicializar en español
setLang('es');

const form = document.querySelector('form');
form.addEventListener('submit', async (e) => {
    e.preventDefault(); // Prevenir comportamiento por defecto
    // Mostrar indicador de carga
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'Enviando...';

    try {
        const response = await fetch(form.action, {
            method: form.method,
            body: new FormData(form)
        });
        if (response.ok) {
            // Muestra mensaje de éxito
            alert('¡Reclamación enviada exitosamente!');
            // Reiniciar el formulario
            form.reset();
        } else {
            // Muestra mensaje de error
            const errorData = await response.json();
            alert('Error: ' + (errorData.message || 'Algo salió mal'));
        }
    } catch (error) {
        alert('Error de red: ' + error.message);
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Enviar Reclamación';
    }
});
