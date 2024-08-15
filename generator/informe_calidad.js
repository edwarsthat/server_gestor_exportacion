// const fs = require("fs");
// const sizeOf = require("image-size");
// const ExcelJS = require("exceljs");
// const path = require("path");


// const llenar_celda = async (worksheet, cell, data) => {
//     const cellFechaDiaIngreso = worksheet.getCell(cell);
//     cellFechaDiaIngreso.value = data;
//     return worksheet;
// };
// const llenar_y_sumar_celda = async (worksheet, cell, data) => {
//     const celda = worksheet.getCell(cell);
//     celda.value = celda + " " + data;
//     celda.alignment = { wrapText: true };
//     return worksheet;
// };
// const llenar_cabecera = async (worksheet, lote, contenedores) => {
//     const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
//     const celdasCabecera = ["D7", "E7", "F7", "H7", "B8", "E9", "H9"];
//     const dataCabecera = [
//         new Date(lote.fechaIngreso).getDate(),
//         meses[new Date(lote.fechaIngreso).getMonth()],
//         new Date(lote.fechaIngreso).getFullYear(),
//         lote.predio.DEPARTAMENTO,
//         lote.predio.PREDIO,
//         lote.kilos,
//         lote.enf,
//     ];

//     for (let i = 0; i < celdasCabecera.length; i++) {
//         worksheet = await llenar_celda(worksheet, celdasCabecera[i], dataCabecera[i]);
//     }

//     const celdasCabecestaSumatoria = ["D8", "F8"];
//     const dataCabeceraSumatoria = [lote.predio.ICA, lote.predio.GGN];

//     for (let i = 0; i < celdasCabecestaSumatoria.length; i++) {
//         worksheet = await llenar_y_sumar_celda(worksheet, celdasCabecestaSumatoria[i], dataCabeceraSumatoria[i]);
//     }

//     for (let i = 0; i < lote.contenedores.length; i++) {
//         const contenedor = contenedores.find(cont => cont._id.toString() === lote.contenedores[i]);
//         worksheet = await llenar_y_sumar_celda(worksheet, "H8", contenedor.numeroContenedor);
//     }
//     return worksheet;

// };
// const llenar_exportacion = async (worksheet, lote) => {
//     const celdas = ["E13", "E14", "E15"];
//     const datos = [lote.calidad1, lote.calidad15, lote.calidad2];

//     for (let i = 0; i < celdas.length; i++) {
//         worksheet = await llenar_celda(worksheet, celdas[i], datos[i]);
//     }
//     return worksheet;
// };
// const llenar_descarte_Limon = async (worksheet, lote) => {
//     const descarte = lote.descarteEncerado.descarteGeneral + lote.descarteLavado.descarteGeneral + lote.descarteEncerado.suelo;
//     const data = [
//         lote.calidad.clasificacionCalidad.oleocelosis,
//         lote.calidad.clasificacionCalidad.dannosMecanicos,
//         lote.calidad.clasificacionCalidad.herbicida,
//         lote.calidad.clasificacionCalidad.acaro,
//         lote.calidad.clasificacionCalidad.alsinoe,
//         lote.calidad.clasificacionCalidad.wood,
//         lote.calidad.clasificacionCalidad.frutaVerde,
//         lote.calidad.clasificacionCalidad.melanosis,
//         lote.calidad.clasificacionCalidad.sombra,
//         lote.calidad.clasificacionCalidad.division,
//         lote.calidad.clasificacionCalidad.trips,
//         lote.calidad.clasificacionCalidad.verdeManzana ? lote.calidad.clasificacionCalidad.verdeManzana : 0,
//         lote.calidad.clasificacionCalidad.grillo + lote.calidad.clasificacionCalidad.piel + lote.calidad.clasificacionCalidad.fumagina +
//             lote.calidad.clasificacionCalidad.mancha + lote.calidad.clasificacionCalidad.deshidratada + lote.calidad.clasificacionCalidad.escama +
//             lote.calidad.clasificacionCalidad.otrasPlagas ? lote.calidad.clasificacionCalidad.otrasPlagas : 0,
//         lote.calidad.clasificacionCalidad.frutaMadura,
//     ];
//     for (let i = 0; i < data.length; i++) {
//         worksheet = await llenar_celda(worksheet, `E${i + 17}`, (data[i] * descarte) / 100);
//     }

//     const descarteData = [
//         lote.descarteEncerado.extra,
//         lote.descarteEncerado.balin + lote.descarteLavado.balin,
//         lote.descarteEncerado.pareja + lote.descarteLavado.pareja,
//         lote.descarteEncerado.descompuesta + lote.descarteLavado.descompuesta + lote.descarteLavado.piel,
//         lote.descarteLavado.hojas,
//         lote.frutaNacional + lote.directoNacional
//     ];

//     for (let i = 0; i < descarteData.length; i++) {
//         worksheet = await llenar_celda(worksheet, `E${i + 31}`, descarteData[i]);
//     }

//     return worksheet;
// };
// const llenar_descarte_Naranja = async (worksheet, lote) => {
//     const descarte = lote.descarteEncerado.descarteGeneral + lote.descarteLavado.descarteGeneral + lote.descarteEncerado.suelo;
//     const data = [
//         lote.calidad.clasificacionCalidad.acaro,
//         lote.calidad.clasificacionCalidad.trips,
//         lote.calidad.clasificacionCalidad.melanosis,
//         lote.calidad.clasificacionCalidad.piel,
//         lote.calidad.clasificacionCalidad.oleocelosis,
//         lote.calidad.clasificacionCalidad.herbicida,
//         lote.calidad.clasificacionCalidad.dannosMecanicos,
//         lote.calidad.clasificacionCalidad.grillo,
//         lote.calidad.clasificacionCalidad.escama,
//         lote.calidad.clasificacionCalidad.frutaVerde,
//         lote.calidad.clasificacionCalidad.frutaMadura,
//         lote.calidad.clasificacionCalidad.division,
//         lote.calidad.clasificacionCalidad.nutrientes,

//         lote.calidad.clasificacionCalidad.alsinoe + lote.calidad.clasificacionCalidad.fumagina + lote.calidad.clasificacionCalidad.antracnosis +
//             lote.calidad.clasificacionCalidad.frutaRajada + lote.calidad.clasificacionCalidad.ombligona + lote.calidad.clasificacionCalidad.despezonada +
//             lote.calidad.clasificacionCalidad.variegacion ? lote.calidad.clasificacionCalidad.variegacion : 0 +
//                 lote.calidad.clasificacionCalidad.otrasPlagas ? lote.calidad.clasificacionCalidad.otrasPlagas : 0,
//     ];
//     for (let i = 0; i < data.length; i++) {
//         worksheet = await llenar_celda(worksheet, `E${i + 17}`, (data[i] * descarte) / 100);
//     }

//     const descarteData = [
//         lote.descarteEncerado.extra,
//         lote.descarteEncerado.pareja + lote.descarteLavado.pareja,
//         lote.descarteEncerado.balin + lote.descarteLavado.balin,
//         lote.frutaNacional + lote.directoNacional,
//         lote.descarteEncerado.descompuesta + lote.descarteLavado.descompuesta + lote.descarteLavado.piel,
//         lote.descarteLavado.hojas,
//     ];

//     for (let i = 0; i < descarteData.length; i++) {
//         worksheet = await llenar_celda(worksheet, `E${i + 32}`, descarteData[i]);
//     }
//     return worksheet;
// };
// const llenar_pruebas_plataforma = async (worksheet, lote) => {
//     let celdas;
//     if (lote.tipoFruta === "Limon") {
//         celdas = ["B46", "D46", "F46", "H46"];
//     } else {
//         celdas = ["B48", "D48", "F48", "H48"];
//     }
//     const data = [
//         lote.calidad.calidadInterna.brix,
//         lote.calidad.calidadInterna.acidez,
//         lote.calidad.calidadInterna.ratio,
//         (lote.calidad.calidadInterna.zumo * 100) / lote.calidad.calidadInterna.peso
//     ];
//     for (let i = 0; i < celdas.length; i++) {
//         worksheet = await llenar_celda(worksheet, celdas[i], data[i]);
//     }
//     return worksheet;
// };
// const llenar_observaciones = async (worksheet, lote) => {
//     let celda;
//     if (lote.tipoFruta === "Limon") {
//         celda = 47;
//     } else {
//         celda = 49;
//     }
//     const observaciones = {
//         dannosMecanicos: "Se evidencia alto porcentaje de fruta con oleocelosis y daños mecánicos.",
//         oleocelosis: "Se evidencia alto porcentaje de fruta con oleocelosis y daños mecánicos.",
//         acaro: "Se evidencia alto porcentaje de fruta con daño por acaro(Mancha).",
//         melanosis: "Se evidencia alta incidencia de fruta con melanosis.",
//         balin: "Se evidencia un alto porcentaje de fruta con diámetro ecuatorial inferior al requerido (balin)",
//         extra: "Se evidencia un alto porcentaje de fruta con diámetro ecuatorial superior al requerido.",
//         pareja: "Se evidencia un alto porcentaje de fruta con diámetro ecuatorial inferior al requerido (Pareja)",
//         frutaVerde: "Fruta con inicios de maduración color verde manzana (°3)",
//         descompuesta: "Se reporta alto porcentaje de fruta descompuesta.",
//         sombra: "Fruta con alto porcentaje de sombra, superior a los establecido en la FT.",
//         alsinoe: "Se evidencia alta incidencia de fruta con Elsinoe.",
//         trips: "Se evidencia alto porcentaje de fruta con daño por Trips (Mancha).",
//         wood: "Se reporta presencia de wood pocket.",
//         escama: "Se evidencia fruta con presencia de escama.",
//         frutaMadura: "Fruta madura, coloración amarilla (°4-°5-°6)",
//         division: "Se evidencia fruta con presencia de escama.",
//         fumagina: "Se evidencia fruta con presencia de escama.",
//         grillo: "Se evidencia fruta con presencia de escama.",
//         herbicida: "Se evidencia fruta con presencia de escama.",
//         piel: "Se evidencia fruta con presencia de escama.",
//         nutrientes: "Se evidencia fruta con presencia de escama.",
//         antracnosis: "Se evidencia fruta con presencia de escama.",
//         frutaRajada: "Se evidencia fruta con presencia de escama.",
//         ombligona: "Se evidencia fruta con presencia de escama.",
//         despezonada: "Se evidencia fruta con presencia de escama.",
//         hojas: "Exceso de hojas",
//         suelo: "Se cayo mucha fruta"
//     };
//     const balin = lote.descarteLavado.balin + lote.descarteEncerado.balin;
//     const extra = lote.descarteLavado.pareja + lote.descarteEncerado.pareja;
//     const descompuesta = lote.descarteLavado.descompuesta + lote.descarteEncerado.descompuesta;
//     let filteredObj = Object.fromEntries(
//         Object.entries(lote.calidad.clasificacionCalidad._doc).filter(([key,]) => key !== "fecha" && key !== "descarteGenerl"));
//     filteredObj = { ...filteredObj, ...lote.descarteLavado._doc, ...lote.descarteEncerado._doc, balin: balin, extra: extra, descompuesta: descompuesta };
//     const top3Keys = Object.entries(filteredObj)
//         .sort(([, a], [, b]) => b - a)
//         .slice(0, 3)
//         .map(([key,]) => key);
//     for (let i = 0; i < top3Keys.length; i++) {
//         worksheet = await llenar_y_sumar_celda(worksheet, `A${i + celda}`, observaciones[top3Keys[i]]);
//     }
//     return worksheet;
// };
// const llenar_precios = async (worksheet, precios, lote) => {
//     worksheet = await llenar_celda(worksheet, "G13", precios.exportacion1);
//     worksheet = await llenar_celda(worksheet, "G14", precios.exportacion15);
//     let descarteStop;
//     if (lote.tipoFruta === "Limon") {
//         descarteStop = 33;

//     } else {
//         descarteStop = 36;
//     }
//     for (let i = 17; i <= descarteStop; i++) {
//         worksheet = await llenar_celda(worksheet, `G${i}`, precios.descarte);
//     }

//     if (lote.tipoFruta === "Limon") {
//         worksheet = await llenar_celda(worksheet, "G36", precios.nacional);
//     } else {
//         worksheet = await llenar_celda(worksheet, "G33", precios.pareja);
//         worksheet = await llenar_celda(worksheet, "G35", precios.nacional);
//     }
//     return worksheet;

// };
// const agregar_fotos = async (workbook, worksheet, lote) => {
//     const fotosPaths = lote.calidad.fotosCalidad._doc;
//     const keys = Object.keys(fotosPaths);
//     let i = 0;
//     let n = 0;
//     let j = 0;

//     while (i < keys.length) {
//         const imagePath = fotosPaths[keys[i]];
//         const dimensions = sizeOf(imagePath);

//         // Calculate cell width and height based on image dimensions
//         const cellWidth = 10; // You can adjust this to fit your needs
//         const cellHeight = Math.round((dimensions.height / dimensions.width) * cellWidth);

//         const imageId = workbook.addImage({
//             buffer: fs.readFileSync(imagePath),
//             extension: "png",
//         });

//         if (n % 2 === 0) {
//             ajustarImagen(worksheet, imageId, `A${73 + (j * 11)}`, cellWidth, cellHeight);
//             worksheet = await llenar_celda(worksheet, `A${83 + (j * 11)}`, keys[i]);

//         } else {
//             ajustarImagen(worksheet, imageId, `F${73 + (j * 11)}`, cellWidth, cellHeight);
//             worksheet = await llenar_celda(worksheet, `F${83 + (j * 11)}`, keys[i]);
//             j++;
//         }
//         n++;
//         i++;
//     }

//     return worksheet;
// };
// const ajustarImagen = (worksheet, imageId, startCell, widthCells, heightCells) => {
//     const startCellRow = parseInt(startCell.replace(/[^0-9]/g, ""), 10);
//     const startCellCol = startCell.replace(/[0-9]/g, "");

//     // Adjust row heights and column widths
//     for (let i = 0; i < heightCells; i++) {
//         worksheet.getRow(startCellRow + i).height = 15; // Example row height
//     }
//     for (let j = 0; j < widthCells; j++) {
//         worksheet.getColumn(startCellCol.charCodeAt(0) - 64 + j).width = 15; // Example column width
//     }

//     // Add image
//     worksheet.addImage(imageId, {
//         tl: { col: startCellCol.charCodeAt(0) - 65, row: startCellRow - 1 },
//         ext: { width: widthCells * 15, height: heightCells * 15 },
//         editAs: "oneCell"
//     });
// };
// const crear_informes_calidad = async data => {
//     try {
//         // await connectProcesoDB();
//         const lote = await Lotes.findById(data._id).populate("predio", "PREDIO ICA DEPARTAMENTO GGN");
//         const contIds = lote.contenedores.map(item => new mongoose.Types.ObjectId(item));
//         const contenedores = await Contenedores.find({ _id: contIds });

//         const fechaLote = new Date(lote.fechaIngreso);
//         const annoLote = fechaLote.getFullYear();
//         const fechaLoteSemana = moment(lote.fechaIngreso);
//         const semanaLote = fechaLoteSemana.week();
//         const precios = await precioFrutaProveedor.find({ anno: annoLote, semana: semanaLote, tipoFruta: lote.tipoFruta })
//             .sort({ fechaIngreso: -1 });

//         console.log(precios);

//         if (!(lote.calidad.fotosCalidad && lote.calidad.calidadInterna && lote.calidad.clasificacionCalidad)) {
//             logger.error(`Error al crear el informe ${lote.enf}, falta un elemento de calidad`);
//             return null;
//         }
//         const workbook = new ExcelJS.Workbook();
//         let sheetName;
//         if (lote.tipoFruta === "Limon") {
//             await workbook.xlsx.readFile(
//                 "C:/Users/SISTEMA/Documents/Servidor/Servidor3.0/generator/resource/informe_calidad/FORMATO INFORME LIMON TAHITI.xlsx",
//             );
//             sheetName = "Informe Limón ";
//         } else {
//             await workbook.xlsx.readFile(
//                 "C:/Users/SISTEMA/Documents/Servidor/Servidor3.0/generator/resource/informe_calidad/FORMATO INFORME NARANJA.xlsx",
//             );
//         }
//         let worksheet = workbook.getWorksheet(sheetName);
//         //se llena la cabecera del informe
//         worksheet = await llenar_cabecera(worksheet, lote, contenedores);
//         //llenar exportacion
//         worksheet = await llenar_exportacion(worksheet, lote);
//         //llenar descarte
//         if (lote.tipoFruta === "Limon") {
//             worksheet = await llenar_descarte_Limon(worksheet, lote);
//         } else {
//             worksheet = await llenar_descarte_Naranja(worksheet, lote);
//         }
//         //se llena las pruebas de plataforma
//         worksheet = await llenar_pruebas_plataforma(worksheet, lote);
//         // se llenan las observaciones
//         worksheet = await llenar_observaciones(worksheet, lote);
//         //se agregan las fotos
//         await agregar_fotos(workbook, worksheet, lote);

//         if (precios.length > 0) {
//             worksheet = await llenar_precios(worksheet, precios[0], lote);
//         }

//         const fecha = new Date();
//         const año = fecha.getFullYear();
//         const mes = fecha.getMonth() + 1;

//         let ruta;
//         if (lote.tipoFruta === "Limon") {
//             ruta = "G:/Mi unidad/Informes_Calidad/Informes Limon";
//         } else {
//             ruta = "G:/Mi unidad/Informes_Calidad/Informes Naranja";
//         }
//         const rutaAño = path.join(ruta, String(año));
//         const rutaMes = path.join(rutaAño, String(mes));
//         if (!fs.existsSync(rutaAño)) {
//             fs.mkdirSync(rutaAño, { recursive: true });
//         }
//         if (!fs.existsSync(rutaMes)) {
//             fs.mkdirSync(rutaMes, { recursive: true });
//         }
//         //Se guarda el documento
//         const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

//         const fechaIngreso = new Date(lote.fechaIngreso);
//         const diaIngreso = fechaIngreso.getDate();
//         const mesIngreso = meses[fechaIngreso.getMonth()];
//         const yearIngreso = fechaIngreso.getFullYear();
//         await workbook.xlsx.writeFile(`${rutaMes}/${lote.enf} ${lote.predio.PREDIO} ${lote.kilos}kg ${diaIngreso} ${mesIngreso} ${yearIngreso}.xlsx`);

//         setTimeout(async () => {
//             try {
//                 const responseJSON = await fetch(`
//           https://script.google.com/macros/s/AKfycbzn5M6Nl0jdIPcmJPnKYsQefbSl8JZaYPfM5sp6ZlpFrZ24I45rEHH1EX19x1v4V-cf/exec?nombre=${lote.enf} ${lote.predio.PREDIO} ${lote.kilos}kg ${diaIngreso} ${mesIngreso} ${yearIngreso}.xlsx&tipoFruta=${lote.tipoFruta}
//           `);
//                 const response = await responseJSON.json();

//                 lote.urlInformeCalidad = response;
//                 await lote.save();
//             } catch (e) {
//                 console.error(e);
//             }
//         }, 10000);
//     } catch (e) {
//         console.log(e.message);
//         logger.error(e.message);
//     }
// };

// module.exports.crear_informes_calidad = crear_informes_calidad;