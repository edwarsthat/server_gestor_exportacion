import { isPaisesCaribe, resumenCalidad, resumenPredios } from "./helpers/contenedores.js";
import ExcelJS from "exceljs";
import writeXlsxFile from 'write-excel-file/node';
import path from "path";
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { formatearFecha, labelListaEmpaque, mostrarKilose, numeroALetras, setCellProperties, setCellPropertiesDatalogger, styleNormalCell } from "./helpers/crearDocumentos.js";
import fs from "fs";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import config from "../../src/config/index.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const imagePath = path.resolve(
    __dirname,
    '..',
    '..',
    'public',
    'assets',
    'logoCelifrut.webp'
)
export class CrearDocumentosRepository {
    static async crear_listas_de_empaque(cont, itemsPallet) {
        try {
            if (!Array.isArray(itemsPallet)) {
                console.error('itemsPallet no es un array:', itemsPallet);
                throw new Error('itemsPallet debe ser un array');
            }

            const isCOC = cont.infoContenedor.clienteInfo._id === config.CLIENTE_KONGELATO;
            const isNotCaribe = isPaisesCaribe(cont);
            const fuente = 16;
            const alto = 50;
            const GREEN = '#5FD991';
            const numCols = isCOC ? 11 : 10;

            const coc_flag = itemsPallet.some(item => item.GGN);
            const fechaStr = new Date(cont.infoContenedor.fechaFinalizado).toLocaleDateString('es-ES', {
                day: '2-digit', month: '2-digit', year: 'numeric'
            });
            const tipoFrutaStr = cont.infoContenedor.tipoFruta.reduce((acu, item) => acu + item.tipoFruta + " - ", "");
            const cocValue = coc_flag ? "4063061801296" : "N/A";

            // Helper: crea un objeto-celda con estilos base
            const c = (value, opts = {}) => ({
                value,
                align: 'center',
                alignVertical: 'middle',
                borderStyle: 'medium',
                fontSize: fuente,
                ...opts,
            });

            // ---- Fila 1 ----
            let row1, row2, row3;
            if (isCOC) {
                // 11 columnas (A-K)
                row1 = [
                    c("", { span: 2, height: 80 }), null,
                    c("PACKING LIST REPORT", { span: 8, fontSize: 24, fontWeight: 'bold' }), null, null, null, null, null, null, null,
                    c("Codigo: PC-CAL-FOR-05", { fontWeight: 'bold' }),
                ];
                row2 = [
                    c("CLIENTE", { fontWeight: 'bold', height: alto }),
                    c(cont.infoContenedor.clienteInfo.CLIENTE, { span: 2 }), null,
                    c("TEMP. SET POINT:", { fontWeight: 'bold' }),
                    c("44,6F"),
                    c("FREIGHT:", { fontWeight: 'bold' }),
                    c(""),
                    c("CONTAINER NUMBER:", { fontWeight: 'bold' }),
                    c(cont.numeroContenedor),
                    c("REFERENCE N°:", { fontWeight: 'bold' }),
                    c(tipoFrutaStr),
                ];
                row3 = [
                    c("TEMP RECORDER LOCATION:", { fontWeight: 'bold', span: 2, height: alto }), null,
                    c("PALLET 10"),
                    c("TEMP RECORDER ID:", { fontWeight: 'bold', span: 2 }), null,
                    c("SS-0085719"),
                    c("DATE:", { fontWeight: 'bold' }),
                    c(fechaStr, { span: 2 }), null,
                    c("CoC:", { fontWeight: 'bold' }),
                    c(cocValue),
                ];
            } else {
                // 10 columnas (A-J)
                row1 = [
                    c("", { span: 2, height: 80 }), null,
                    c("PACKING LIST REPORT", { span: 7, fontSize: 24, fontWeight: 'bold' }), null, null, null, null, null, null,
                    c("Codigo: PC-CAL-FOR-05", { fontWeight: 'bold' }),
                ];
                row2 = [
                    c("CLIENTE", { fontWeight: 'bold', height: alto }),
                    c(cont.infoContenedor.clienteInfo.CLIENTE, { span: 2 }), null,
                    c("TEMP. SET POINT:", { fontWeight: 'bold' }),
                    c("44,6F"),
                    c("FREIGHT:", { fontWeight: 'bold' }),
                    c("CONTAINER NUMBER:", { fontWeight: 'bold' }),
                    c(cont.numeroContenedor),
                    c("REFERENCE N°:", { fontWeight: 'bold' }),
                    c(tipoFrutaStr),
                ];
                row3 = [
                    c("TEMP RECORDER LOCATION:", { fontWeight: 'bold', span: 2, height: alto }), null,
                    c("PALLET 10"),
                    c("TEMP RECORDER ID:", { fontWeight: 'bold', span: 2 }), null,
                    c("SS-0085719"),
                    c("DATE:", { fontWeight: 'bold' }),
                    c(fechaStr),
                    c("CoC:", { fontWeight: 'bold' }),
                    c(cocValue),
                ];
            }

            // ---- Fila de headers ----
            const headersData = isCOC ? [
                "PALLET ID", "PACKING DATE", "VARIETY", "PRODUCT", "WEIGHT",
                "CATEGORY", "SIZE", "QTY", "FARM CODE", "N° GG", "EXPIRATION DATE"
            ] : [
                "PALLET ID", "PACKING DATE", "VARIETY", "WEIGHT",
                "CATEGORY", "SIZE", "QTY", "FARM CODE", "N° GG", "EXPIRATION DATE"
            ];
            const headerRow = headersData.map((h, i) =>
                c(h, { fontWeight: 'bold', fontSize: 15, backgroundColor: GREEN, height: alto, ...(i > 0 ? {} : {}) })
            );

            // ---- Filas de datos ----
            let totalCajas = 0;
            const dataRows = [];
            for (const item of itemsPallet) {
                const values = isCOC ? [
                    String(item.pallet.numeroPallet) + String(cont.numeroContenedor),
                    formatearFecha(item.fecha instanceof Date ? item.fecha.toISOString() : item.fecha, true),
                    labelListaEmpaque[item.tipoFruta.tipoFruta],
                    "COL-" + mostrarKilose(item) + (item.tipoFruta === 'Limon' ? 'Limes' : 'Oranges') + item.calibre + "ct",
                    mostrarKilose(item),
                    isNotCaribe ? (item?.calidad?.descripcion || "N/A") : "Caribe",
                    item.calibre,
                    item.cajas,
                    item.SISPAP ? item.lote.predio.ICA.code : 'Sin SISPAP',
                    item.GGN ? item.lote.predio.GGN.code : "N/A",
                    item.GGN ? item.lote.predio.GGN.fechaVencimiento : "N/A",
                ] : [
                    String(item.pallet.numeroPallet) + String(cont.numeroContenedor),
                    formatearFecha(item.fecha instanceof Date ? item.fecha.toISOString() : item.fecha, true),
                    labelListaEmpaque[item.tipoFruta.tipoFruta],
                    mostrarKilose(item),
                    isNotCaribe ? (item?.calidad?.descripcion || "N/A") : "Caribe",
                    item.calibre,
                    item.cajas,
                    item.SISPAP ? item.lote.predio.ICA.code : 'Sin SISPAP',
                    item.GGN ? item.lote.predio.GGN.code : "N/A",
                    item.GGN ? item.lote.predio.GGN.fechaVencimiento : "N/A",
                ];
                dataRows.push(values.map((v, i) => c(v ?? "", {
                    wrap: true,
                    ...(i === 0 ? { height: alto } : {}),
                })));
                totalCajas += item.cajas;
            }

            // ---- Fila de total ----
            const totalRow = isCOC ? [
                c("TOTAL", { span: 6, fontWeight: 'bold', backgroundColor: GREEN, fontSize: 12, height: alto }), null, null, null, null, null,
                c(totalCajas, { span: 5, fontWeight: 'bold', backgroundColor: GREEN, fontSize: 12 }), null, null, null, null,
            ] : [
                c("TOTAL", { span: 5, fontWeight: 'bold', backgroundColor: GREEN, fontSize: 12, height: alto }), null, null, null, null,
                c(totalCajas, { span: 5, fontWeight: 'bold', backgroundColor: GREEN, fontSize: 12 }), null, null, null, null,
            ];

            // ---- Tablas de resumen por calidad ----
            const summaryRows = [[]]; // fila en blanco separadora
            for (const calidad of cont.infoContenedor.calidad) {
                // cabecera de calidad
                summaryRows.push([
                    c("SUMMARY CATEGORY", { fontWeight: 'bold', backgroundColor: GREEN, height: alto }),
                    c(isNotCaribe ? (calidad?.descripcion || "N/A") : "Caribe", { fontWeight: 'bold', backgroundColor: GREEN }),
                    c("", { fontWeight: 'bold', backgroundColor: GREEN }),
                    c("", { fontWeight: 'bold', backgroundColor: GREEN }),
                ]);
                // columnas
                summaryRows.push([
                    c("SIZE", { fontWeight: 'bold', backgroundColor: GREEN, height: alto }),
                    c("QTY", { fontWeight: 'bold', backgroundColor: GREEN }),
                    c("KILOS", { fontWeight: 'bold', backgroundColor: GREEN }),
                    c("% PERCENTAGE", { fontWeight: 'bold', backgroundColor: GREEN }),
                ]);
                // datos
                const resumen = isNotCaribe ? resumenCalidad(itemsPallet, calidad) : resumenCalidad(itemsPallet);
                for (const [calibre, val] of Object.entries(resumen)) {
                    summaryRows.push([
                        c(calibre, { fontSize: 12, height: alto }),
                        c(val.cantidad, { fontSize: 12 }),
                        c(val.kilos, { fontSize: 12 }),
                        c(val.porcentage.toFixed(2) + "%", { fontSize: 12 }),
                    ]);
                }
                // total resumen
                const resumenVals = Object.values(resumen);
                summaryRows.push([
                    c("TOTAL", { fontWeight: 'bold', fontSize: 12, backgroundColor: GREEN, height: alto }),
                    c(resumenVals.reduce((acu, v) => acu + v.cantidad, 0), { fontWeight: 'bold', fontSize: 12, backgroundColor: GREEN }),
                    c(resumenVals.reduce((acu, v) => acu + v.kilos, 0), { fontWeight: 'bold', fontSize: 12, backgroundColor: GREEN }),
                    c(resumenVals.reduce((acu, v) => acu + v.porcentage, 0).toFixed(2) + "%", { fontWeight: 'bold', fontSize: 12, backgroundColor: GREEN }),
                ]);
                summaryRows.push([]); // separador entre calidades

                if (!isNotCaribe) break;
            }

            const data = [row1, row2, row3, headerRow, ...dataRows, totalRow, ...summaryRows];
            const columns = Array.from({ length: numCols }, () => ({ width: 20.33 }));

            const xlsxBuffer = await writeXlsxFile(data, {
                columns,
                sheet: 'Lista empaque',
                buffer: true,
            });

            // ---- Inyección del logo via PizZip ----
            // xlsx es un ZIP con XML; PizZip ya está en el proyecto para docxtemplater
            const zip = new PizZip(xlsxBuffer);
            const imageData = fs.readFileSync(imagePath);

            // 1. Agrega la imagen al directorio media
            zip.file('xl/media/image1.png', imageData);

            // 2. Drawing XML: imagen anclada en A1:B1 (twoCellAnchor llena el área fusionada)
            const drawingXml = [
                '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
                '<xdr:wsDr',
                '  xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing"',
                '  xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"',
                '  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">',
                '  <xdr:twoCellAnchor editAs="twoCell">',
                '    <xdr:from><xdr:col>0</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>0</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>',
                '    <xdr:to><xdr:col>2</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>1</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>',
                '    <xdr:pic>',
                '      <xdr:nvPicPr>',
                '        <xdr:cNvPr id="2" name="Logo"/>',
                '        <xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr>',
                '      </xdr:nvPicPr>',
                '      <xdr:blipFill>',
                '        <a:blip r:embed="rId1"/>',
                '        <a:stretch><a:fillRect/></a:stretch>',
                '      </xdr:blipFill>',
                '      <xdr:spPr>',
                '        <a:xfrm><a:off x="0" y="0"/><a:ext cx="1" cy="1"/></a:xfrm>',
                '        <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>',
                '      </xdr:spPr>',
                '    </xdr:pic>',
                '    <xdr:clientData/>',
                '  </xdr:twoCellAnchor>',
                '</xdr:wsDr>',
            ].join('\n');
            zip.file('xl/drawings/drawing1.xml', drawingXml);

            // 3. Relaciones del drawing → imagen
            const drawingRelsXml = [
                '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
                '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
                '  <Relationship Id="rId1"',
                '    Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image"',
                '    Target="../media/image1.png"/>',
                '</Relationships>',
            ].join('\n');
            zip.file('xl/drawings/_rels/drawing1.xml.rels', drawingRelsXml);

            // 4. Relaciones de sheet1 → drawing
            const sheetRelsXml = [
                '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
                '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
                '  <Relationship Id="rId1"',
                '    Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing"',
                '    Target="../drawings/drawing1.xml"/>',
                '</Relationships>',
            ].join('\n');
            zip.file('xl/worksheets/_rels/sheet1.xml.rels', sheetRelsXml);

            // 5. Agrega referencia al drawing en el worksheet XML
            let sheetXml = zip.file('xl/worksheets/sheet1.xml').asText();
            // Asegura el namespace r: en el elemento raíz
            if (!sheetXml.includes('xmlns:r=')) {
                sheetXml = sheetXml.replace(
                    '<worksheet ',
                    '<worksheet xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" '
                );
            }
            sheetXml = sheetXml.replace('</worksheet>', '<drawing r:id="rId1"/></worksheet>');
            zip.file('xl/worksheets/sheet1.xml', sheetXml);

            // 6. Registra tipos de contenido
            let contentTypesXml = zip.file('[Content_Types].xml').asText();
            if (!contentTypesXml.includes('image/png')) {
                contentTypesXml = contentTypesXml.replace(
                    '</Types>',
                    '<Default Extension="png" ContentType="image/png"/></Types>'
                );
            }
            if (!contentTypesXml.includes('drawing+xml')) {
                contentTypesXml = contentTypesXml.replace(
                    '</Types>',
                    '<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/></Types>'
                );
            }
            zip.file('[Content_Types].xml', contentTypesXml);

            return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
        } catch (error) {
            console.error('Error en crear_listas_de_empaque:', error);
            throw error;
        }
    }
    static async crear_reporte_predios_contenedor(cont, itemsPallet) {
        try {
            const tabla = resumenPredios(itemsPallet)
            const predios = tabla[0]
            const totalCajas = tabla[1]
            const totalKilos = tabla[2]

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet("Reporte Predios")

            const styleNormalCell = {
                top: { style: 'medium' },
                left: { style: 'medium' },
                bottom: { style: 'medium' },
                right: { style: 'medium' }
            };

            //? logo
            const logo = worksheet.getCell('A1')
            logo.border = styleNormalCell
            logo.alignment = { horizontal: 'center', vertical: 'middle' }

            worksheet.getColumn(1).width = 20
            worksheet.getRow(1).height = 80

            const imagePath = path.resolve(
                __dirname,
                '..',
                '..',
                'public',
                'assets',
                'logoCelifrut.webp'
            )
            const imageId = workbook.addImage({
                filename: imagePath,
                extension: 'png'
            })

            worksheet.addImage(imageId, {
                tl: { col: 0, row: 0 },
                ext: { width: 100, height: 100 }
            })

            //? titulo
            worksheet.getColumn(2).width = 20
            worksheet.getColumn(4).width = 20
            worksheet.getColumn(5).width = 30

            const titulo = worksheet.getCell('B1')
            titulo.value = "Reporte Predio ICA"
            worksheet.mergeCells('B1:D1');
            titulo.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
            titulo.font = { size: 24, bold: true }
            titulo.border = styleNormalCell

            //?codigo version
            const version = worksheet.getCell('E1')
            version.value = `Codigo: PC-CAL-FOR-04
Versión: 03 
Fecha: 17 Oct 2020`
            version.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
            version.font = { size: 12 }
            version.border = styleNormalCell

            //?cliente info
            const clienteLabel = worksheet.getCell('A2');
            clienteLabel.value = "CLIENTE:"
            clienteLabel.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
            clienteLabel.font = { size: 18, bold: true }
            clienteLabel.border = styleNormalCell

            const nombrCliente = worksheet.getCell('B2')
            worksheet.mergeCells('B2:E2');
            nombrCliente.value = cont.infoContenedor.clienteInfo.CLIENTE
            nombrCliente.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
            nombrCliente.font = { size: 18, bold: true }
            nombrCliente.border = styleNormalCell

            const fechaLabel = worksheet.getCell('A3')
            fechaLabel.value = "FECHA:"
            fechaLabel.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
            fechaLabel.font = { size: 18, bold: true }
            fechaLabel.border = styleNormalCell

            const fechaCont = worksheet.getCell('B3')
            worksheet.mergeCells('B3:E3');
            fechaCont.value = new Date(cont.infoContenedor.fechaFinalizado).toLocaleDateString('es-ES', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            })
            fechaCont.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
            fechaCont.font = { size: 18, bold: true }
            fechaCont.border = styleNormalCell

            //? los headers de la tabla
            worksheet.insertRow(4, ['Predio', 'Codigo ICA', 'N° Cajas', 'Peso Neto', 'Peso Bruto'])
            for (let i = 1; i <= 5; i++) {
                const cell = worksheet.getCell(4, i);
                cell.font = { bold: true, size: 12 };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FF5FD991' }
                }
                cell.border = styleNormalCell
            }

            //? los datos de los predios
            Object.values(predios).forEach((value, index) => {
                worksheet.insertRow(5 + index, [
                    value.predio,
                    value.SISPAP ? value.ICA : 'Sin SISPAP',
                    value.cajas,
                    value.peso,
                    value.peso + (0.85 * value.cajas)
                ])

                for (let i = 1; i <= 5; i++) {
                    const cell = worksheet.getCell(5 + index, i);
                    cell.font = { size: 12 };
                    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                    cell.border = styleNormalCell
                }
            })

            //? total 
            let ultimaFila = Object.keys(predios).length;
            const totalLabel = worksheet.getCell(ultimaFila + 5, 1);
            worksheet.mergeCells(`A${ultimaFila + 5}:B${ultimaFila + 5}`);
            totalLabel.value = "TOTAL:"
            totalLabel.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
            totalLabel.font = { size: 14, bold: true }
            totalLabel.border = styleNormalCell
            totalLabel.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF5FD991' }
            }

            const totalCajascell = worksheet.getCell(ultimaFila + 5, 3);
            totalCajascell.value = totalCajas
            totalCajascell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
            totalCajascell.font = { size: 14, bold: true }
            totalCajascell.border = styleNormalCell
            totalCajascell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF5FD991' }
            }

            const totalKilosCell = worksheet.getCell(ultimaFila + 5, 4);
            totalKilosCell.value = totalKilos
            totalKilosCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
            totalKilosCell.font = { size: 14, bold: true }
            totalKilosCell.border = styleNormalCell
            totalKilosCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF5FD991' }
            }

            const totalKilosNetos = worksheet.getCell(ultimaFila + 5, 5);
            totalKilosNetos.value = totalKilos + (totalCajas * 0.85)
            totalKilosNetos.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
            totalKilosNetos.font = { size: 14, bold: true }
            totalKilosNetos.border = styleNormalCell
            totalKilosNetos.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF5FD991' }
            }



            const buffer = await workbook.xlsx.writeBuffer();
            return buffer;
        } catch (error) {
            console.error('Error en crear_reporte_predios_contenedor:', error);
            throw error;
        }
    }
    static async crear_carta_responsabilidad_camiones(registro) {
        try {
            const pathRelative = path.resolve(
                __dirname,
                '..',
                'templates',
                'transporte',
                'PLANTILLA CARTA INSTRUCCIONES TRANSPORTE FAVORITA.docx'
            );

            // Leer el contenido del archivo de template
            const content = fs.readFileSync(pathRelative, 'binary');
            const zip = new PizZip(content);

            // Crear el documento con docxtemplater
            const doc = new Docxtemplater(zip, {
                paragraphLoop: true,
                linebreaks: true,
            });

            const date = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Bogota" }));

            // console.log(date.getDate())
            // Renderizar el documento directamente con los datos
            doc.render({
                conductor: registro.conductor,
                tipoFruta: registro.contenedor.infoContenedor.tipoFruta.reduce((acu, item) => acu + item.tipoFruta + " - " || "", ""),
                cedula: registro.cedula,
                destino: "Ipiales - Nariño",
                precinto: registro.precinto.reduce((acu, item) => acu + item + " - " || "", ""),
                placa: registro.placa,
                fecha_dia_escrito: numeroALetras(date.getDate()),
                fecha_mes: date.toLocaleDateString('es-ES', { month: 'long' }),
                fecha_anio: "veinticinco",
                kilos: registro?.pesoEstimado || "N/A",
                numeroContenedor: registro?.contenedor?.numeroContenedor || "N/A",
            });

            // Obtener el buffer del documento
            const buffer = doc.getZip().generate({
                type: 'nodebuffer',
                compression: 'DEFLATE'
            });

            return buffer;
        } catch (error) {
            console.error('Error en crear_carta_responsabilidad_camiones:', error);
            throw error;
        }
    }
    static async crear_reporte_vehiculo(registro) {
        try {
            const cont = registro.contenedor
            const tipoFrutas = registro.contenedor.infoContenedor.tipoFruta.reduce((acu, item) => acu + item.tipoFruta + " - " || "", "")

            const { infoExportacion } = cont
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet("Hoja 1")

            worksheet.getColumn(2).width = 40
            worksheet.getColumn(3).width = 60
            //Titulo
            const cell = worksheet.getCell("B2")
            setCellProperties(
                cell,
                "REPORTE DE VEHICULOS",
                24, true)
            worksheet.mergeCells(`B2:C2`);

            //cuerpo
            const body = [
                { cell: 'B3', value: "Fecha despacho", font: 12, bold: false },
                { cell: 'C3', value: new Date().toLocaleDateString('es-ES', { timeZone: 'America/Bogota' }), font: 12, bold: false },
                { cell: 'B4', value: "Transportadora", font: 12, bold: false },
                { cell: 'C4', value: registro.transportadora, font: 12, bold: false },
                { cell: 'B5', value: "Placa Vehiculo", font: 12, bold: false },
                { cell: 'C5', value: registro.placa, font: 12, bold: false },
                { cell: 'B6', value: "Placa del Trailer", font: 12, bold: false },
                { cell: 'C6', value: registro.trailer, font: 12, bold: false },
                { cell: 'B7', value: "Exportador", font: 12, bold: false },
                { cell: 'C7', value: "CELIFRUT SAS", font: 12, bold: false },
                { cell: 'B8', value: "Ruta", font: 12, bold: false },
                { cell: 'C8', value: `ARMENIA-${infoExportacion.puerto}`, font: 12, bold: false },
                { cell: 'B9', value: "Conductor", font: 12, bold: false },
                { cell: 'C9', value: registro.conductor, font: 12, bold: false },
                { cell: 'B10', value: "No. Cédula", font: 12, bold: false },
                { cell: 'C10', value: registro.cedula, font: 12, bold: false },
                { cell: 'B11', value: "No. Celular", font: 12, bold: false },
                { cell: 'C11', value: registro.celular, font: 12, bold: false },
                { cell: 'B12', value: "Lugar Cargue", font: 12, bold: false },
                { cell: 'C12', value: "ARMENIA", font: 12, bold: false },
                { cell: 'B13', value: "Lugar Descargue", font: 12, bold: false },
                { cell: 'C13', value: infoExportacion.puerto, font: 12, bold: false },
                { cell: 'B14', value: "Mercancía", font: 12, bold: false },
                { cell: 'C14', value: tipoFrutas, font: 12, bold: false },
                { cell: 'B15', value: "Temperatura", font: 12, bold: false },
                { cell: 'C15', value: registro.temperatura, font: 12, bold: false },
            ]

            body.forEach(item => {
                const cell = worksheet.getCell(item.cell)
                setCellProperties(cell, item.value, item.font, item.bold)
            })

            const buffer = await workbook.xlsx.writeBuffer();
            return buffer;
        } catch (error) {
            console.error('Error en crear_reporte_vehiculo:', error);
            throw error;
        }
    }
    static async crear_reporte_datalogger(registro) {
        try {
            const cont = registro.contenedor
            const tipoFrutas = registro.contenedor.infoContenedor.tipoFruta.reduce((acu, item) => acu + item.tipoFruta + " - " || "", "")

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet("Hoja 1")
            const total_kilos = cont.totalKilos
            worksheet.getColumn(2).width = 30
            worksheet.getColumn(3).width = 25
            worksheet.getColumn(4).width = 25
            worksheet.getColumn(5).width = 40
            //Titulo

            const imageId = workbook.addImage({
                filename: imagePath,
                extension: 'png'
            })

            worksheet.addImage(imageId, {
                tl: { col: 3, row: 1 },
                ext: { width: 120, height: 120 }
            })

            const cellLogo = worksheet.getCell("D2")
            cellLogo.border = styleNormalCell

            const cellVacio = worksheet.getCell("E6")
            cellVacio.border = styleNormalCell

            const cell = worksheet.getCell("B2")
            setCellProperties(
                cell,
                "DATA LOGGER",
                24, true)
            worksheet.mergeCells(`B2:C2`);
            worksheet.mergeCells(`D2:E5`);
            worksheet.mergeCells(`B22:D24`);

            //cuerpo
            const body = [
                { cell: 'B3', value: "MARCA", font: 12, bold: true },
                { cell: 'C3', value: registro?.marca?.toUpperCase() || "", font: 12, bold: false },
                { cell: 'B4', value: "CODIGO DE PRODUCTO", font: 12, bold: true },
                { cell: 'C4', value: "U-2", font: 12, bold: false },
                { cell: 'B5', value: "DATALOGGER ID", font: 12, bold: true },
                { cell: 'C5', value: registro.datalogger_id.toUpperCase(), font: 12, bold: false },
                { cell: 'B6', value: "UBICACIÓN DATA LOGGER:", font: 12, bold: true },
                { cell: 'C6', value: "PALLET No 10", font: 12, bold: false },
                { cell: 'B7', value: "TEMPERATURA:", font: 12, bold: true },
                { cell: 'C7', value: registro.temperatura, font: 12, bold: false },
                { cell: 'D7', value: "DESPACHADO POR:", font: 12, bold: true },
                { cell: 'E7', value: "", font: 12, bold: true },
                { cell: 'B8', value: "PRODUCTO:", font: 12, bold: true },
                { cell: 'C8', value: tipoFrutas, font: 12, bold: false },
                { cell: 'D8', value: "NOMBRE:", font: 12, bold: true },
                { cell: 'E8', value: "", font: 12, bold: false },
                { cell: 'B9', value: "CANTIDAD:", font: 12, bold: true },
                { cell: 'C9', value: `${cont.pallets} PALETS - ${total_kilos}KG APROX`, font: 12, bold: false },
                { cell: 'D9', value: "FIRMA", font: 12, bold: false },
                { cell: 'E9', value: "", font: 12, bold: false },
                { cell: 'B10', value: "EMPAQUE", font: 12, bold: true },
                { cell: 'C10', value: "CAJAS", font: 12, bold: false },
                { cell: 'D10', value: "FECHA DE CARGUE:", font: 12, bold: false },
                { cell: 'E10', value: "", font: 12, bold: false },
                { cell: 'B11', value: "NÚMERO PRECINTO:", font: 12, bold: true },
                { cell: 'C11', value: registro.precinto, font: 12, bold: false },
                { cell: 'D11', value: "HORA INICIO:", font: 12, bold: false },
                { cell: 'E11', value: "", font: 12, bold: false },
                { cell: 'B12', value: "FECHA SALIDA:", font: 12, bold: true },
                { cell: 'C12', value: new Date().toLocaleDateString('es-ES', { timeZone: 'America/Bogota' }), font: 12, bold: false },
                { cell: 'D12', value: "HORA FINAL:", font: 12, bold: false },
                { cell: 'E12', value: "", font: 12, bold: false },
                { cell: 'B13', value: "EMPRESA TRANSPORTADORA: ", font: 12, bold: true },
                { cell: 'C13', value: registro.transportadora, font: 12, bold: false },
                { cell: 'D13', value: "HORA DESPACHO:", font: 12, bold: false },
                { cell: 'E13', value: "", font: 12, bold: false },
                { cell: 'B14', value: "PLACA:", font: 12, bold: true },
                { cell: 'C14', value: registro.placa, font: 12, bold: false },
                { cell: 'D14', value: "REVISADO POR:", font: 12, bold: false },
                { cell: 'E14', value: "", font: 12, bold: false },
                { cell: 'B15', value: "PLACA TRAILER", font: 12, bold: true },
                { cell: 'C15', value: registro.trailer, font: 12, bold: false },
                { cell: 'D15', value: "NOMBRE:", font: 12, bold: false },
                { cell: 'E15', value: "", font: 12, bold: false },
                { cell: 'B16', value: "NOMBRE CONDUCTOR:", font: 12, bold: true },
                { cell: 'C16', value: registro.conductor, font: 12, bold: false },
                { cell: 'D16', value: "FIRMA:", font: 12, bold: true },
                { cell: 'E16', value: "", font: 12, bold: false },
                { cell: 'B17', value: "CEDULA:", font: 12, bold: true },
                { cell: 'C17', value: registro.cedula, font: 12, bold: false },
                { cell: 'D17', value: "", font: 12, bold: true },
                { cell: 'E17', value: "", font: 12, bold: false },
                { cell: 'B18', value: "TELEFONO:", font: 12, bold: true },
                { cell: 'C18', value: registro.celular, font: 12, bold: false },
                { cell: 'D18', value: "", font: 12, bold: true },
                { cell: 'E18', value: "", font: 12, bold: false },
                { cell: 'B21', value: "ENTREGADO A:", font: 12, bold: false },
                { cell: 'B25', value: registro.conductor, font: 12, bold: false },
                { cell: 'B26', value: registro.cedula, font: 12, bold: false },
                { cell: 'B27', value: registro.celular, font: 12, bold: false },
            ]

            body.forEach(item => {
                const cell = worksheet.getCell(item.cell)
                setCellPropertiesDatalogger(cell, item.value, item.font, item.bold)
            })

            const buffer = await workbook.xlsx.writeBuffer();
            return buffer;
        } catch (error) {
            console.error('Error en crear_reporte_datalogger:', error);
            throw error;
        }
    }
    static async crear_carta_instrucciones(registro) {
        try {
            const cont = registro.contenedor
            const tipoFrutas = registro.contenedor.infoContenedor.tipoFruta.reduce((acu, item) => acu + item.tipoFruta + " - " || "", "")

            const pathRelative = path.resolve(
                __dirname,
                '..',
                'templates',
                'transporte',
                'Entrega_Instrucciones.docx'
            );

            const { infoExportacion } = cont;
            const total_cajas = cont.totalCajas
            const total_kilos = cont.totalKilos
            const peso_bruto = (total_cajas * 0.85) + total_kilos;

            // Leer el contenido del archivo de template
            const content = fs.readFileSync(pathRelative, 'binary');
            const zip = new PizZip(content);

            // Crear el documento con docxtemplater
            const doc = new Docxtemplater(zip, {
                paragraphLoop: true,
                linebreaks: true,
            });

            const date = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Bogota" }));

            // console.log(date.getDate())
            // Renderizar el documento directamente con los datos
            doc.render({
                precinto: registro.precinto.reduce((acu, item) => acu + item + " - " || "", ""),
                tipo_fruta: tipoFrutas,
                transportadora: registro.transportadora,
                placa: registro.placa,
                trailer: registro.trailer,
                agencia: infoExportacion.agencia,
                total_cajas: total_kilos.toFixed(2),
                total_cajas_net: peso_bruto.toFixed(2),
                temperatura: registro.temperatura,
                //para que salga el numero de contedor . Jp
                numeroContenedor: registro?.contenedor?.numeroContenedor || "N/A",
                nit: registro.nit,
                fecha_dia_escrito: numeroALetras(date.getDate()),
                fecha_dia: date.getDate(),
                fecha_mes: date.toLocaleDateString('es-ES', { month: 'long' }),
            });

            // Obtener el buffer del documento
            const buffer = doc.getZip().generate({
                type: 'nodebuffer',
                compression: 'DEFLATE'
            });

            return buffer;
        } catch (error) {
            console.error('Error en crear_carta_instrucciones:', error);
            throw error;
        }
    }
    static async crear_carta_responsabilidad(registro) {
        try {
            const cont = registro.contenedor
            const tipoFrutas = registro.contenedor.infoContenedor.tipoFruta.reduce((acu, item) => acu + item.tipoFruta + " - " || "", "")

            const pathRelative = path.resolve(
                __dirname,
                '..',
                'templates',
                'transporte',
                'carta_responsabilidad.docx'
            );

            const { infoContenedor, numeroContenedor, infoExportacion } = cont;
            const total_kilos = cont.totalKilos;

            // Leer el contenido del archivo de template
            const content = fs.readFileSync(pathRelative, 'binary');
            const zip = new PizZip(content);

            // Crear el documento con docxtemplater
            const doc = new Docxtemplater(zip, {
                paragraphLoop: true,
                linebreaks: true,
            });

            let opciones = { day: '2-digit', month: '2-digit', year: 'numeric' };
            // Renderizar el documento directamente con los datos
            doc.render({
                fecha: new Date().toLocaleDateString('es-ES', opciones),
                numeroContenedor: numeroContenedor,
                agencia: infoExportacion?.agencia || 'N/A',
                naviera: infoExportacion?.naviera || 'N/A',
                puerto: infoExportacion?.puerto?.toUpperCase() || 'N/A',
                expt: infoExportacion?.expt?.toUpperCase() || 'N/A',
                cliente: infoContenedor?.clienteInfo?.CLIENTE || 'N/A',
                direccion: infoContenedor?.clienteInfo?.["DIRECCIÓN"] ?? 'N/A',

                placa: registro?.placa || '',
                tipoFruta: tipoFrutas,
                transportadora: registro?.transportadora || 'N/A',
                precinto: registro?.precinto.reduce((acu, item) => acu + item + " - " || "", "") || 'N/A',
                trailer: registro?.trailer || 'N/A',
                conductor: registro?.conductor || 'N/A',
                cedula: registro?.cedula || 'N/A',
                celular: registro?.celular || 'N/A',

                kilos: total_kilos.toFixed(2),
            });

            // Obtener el buffer del documento
            const buffer = doc.getZip().generate({
                type: 'nodebuffer',
                compression: 'DEFLATE'
            });

            return buffer;
        } catch (error) {
            console.error('Error en crear_carta_responsabilidad:', error);
            throw error;
        }
    }
}
