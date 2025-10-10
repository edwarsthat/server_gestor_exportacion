import { isPaisesCaribe, resumenCalidad } from "./helpers/contenedores.js";
import ExcelJS from "exceljs";
import path from "path";
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { formatearFecha, labelListaEmpaque, mostrarKilose, setCellProperties, styleNormalCell } from "./helpers/crearDocumentos.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);



export class CrearDocumentosRepository {
    static async crear_listas_de_empaque(cont, itemsPallet) {
        const isNotCaribe = isPaisesCaribe(cont);
        // const proveedores = data.proveedores
        const fuente = 16
        const alto_celda = 50

        let coc_flag = false;
        let row1Cells;
        let row2cells;
        let row3Cells;

        if (cont.infoContenedor.clienteInfo._id === "659dbd9a347a42d89929340e") {
            row1Cells = [
                { cell: 'C1', value: "PACKING LIST REPORT", font: 24, bold: true },
                { cell: 'K1', value: "Codigo: PC-CAL-FOR-05", font: fuente, bold: true },
            ]

            row2cells = [
                { cell: 'A2', value: "CLIENTE", font: fuente, bold: true },
                { cell: 'B2', value: cont.infoContenedor.clienteInfo.CLIENTE, font: fuente, bold: false },
                { cell: 'D2', value: "TEMP. SET POINT:", font: fuente, bold: true },
                { cell: 'E2', value: "44,6F", font: fuente, bold: false },
                { cell: 'F2', value: "FREIGHT:", font: fuente, bold: true },
                { cell: 'G2', value: "", font: fuente, bold: false },
                { cell: 'H2', value: "CONTAINER NUMBER:", font: fuente, bold: true },
                { cell: 'I2', value: cont.numeroContenedor, font: fuente, bold: false },
                { cell: 'J2', value: "REFERENCE N°:", font: fuente, bold: true },
                { cell: 'K2', value: cont.infoContenedor.tipoFruta.reduce((acu, item) => acu + item.tipoFruta + " - ", ""), font: fuente, bold: false },
            ]

            row3Cells = [
                { cell: 'A3', value: "TEMP RECORDER LOCATION:", font: fuente, bold: true },
                { cell: 'C3', value: "PALLET 10", font: fuente, bold: false },
                { cell: 'D3', value: "TEMP RECORDER ID: ", font: fuente, bold: true },
                { cell: 'F3', value: "SS-0085719", font: fuente, bold: false },
                { cell: 'G3', value: "DATE: ", font: fuente, bold: true },
                {
                    cell: 'H3', value: new Date(cont.infoContenedor.fechaFinalizado).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                    }), font: fuente, bold: false
                },
                { cell: 'J3', value: "CoC: ", font: fuente, bold: true },
                { cell: 'K3', value: "N/A", font: fuente, bold: false },
            ]
        } else {
            row1Cells = [
                { cell: 'C1', value: "PACKING LIST REPORT", font: 24, bold: true },
                { cell: 'J1', value: "Codigo: PC-CAL-FOR-05", font: fuente, bold: true },
            ]

            row2cells = [
                { cell: 'A2', value: "CLIENTE", font: fuente, bold: true },
                { cell: 'B2', value: cont.infoContenedor.clienteInfo.CLIENTE, font: fuente, bold: false },
                { cell: 'D2', value: "TEMP. SET POINT:", font: fuente, bold: true },
                { cell: 'E2', value: "44,6F", font: fuente, bold: false },
                { cell: 'F2', value: "FREIGHT:", font: fuente, bold: true },
                { cell: 'G2', value: "CONTAINER NUMBER:", font: fuente, bold: true },
                { cell: 'H2', value: cont.numeroContenedor, font: fuente, bold: false },
                { cell: 'I2', value: "REFERENCE N°:", font: fuente, bold: true },
                { cell: 'J2', value: cont.infoContenedor.tipoFruta.reduce((acu, item) => acu + item.tipoFruta + " - ", ""), font: fuente, bold: false },
            ]

            row3Cells = [
                { cell: 'A3', value: "TEMP RECORDER LOCATION:", font: fuente, bold: true },
                { cell: 'C3', value: "PALLET 10", font: fuente, bold: false },
                { cell: 'D3', value: "TEMP RECORDER ID: ", font: fuente, bold: true },
                { cell: 'F3', value: "SS-0085719", font: fuente, bold: false },
                { cell: 'G3', value: "DATE: ", font: fuente, bold: true },
                {
                    cell: 'H3', value: new Date(cont.infoContenedor.fechaFinalizado).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                    }), font: fuente, bold: false
                },
                { cell: 'I3', value: "CoC: ", font: fuente, bold: true },
                { cell: 'J3', value: "N/A", font: fuente, bold: false },
            ]
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Lista empaque")



        worksheet.getRow(1).height = 80
        for (let i = 1; i <= 12; i++) {
            worksheet.getColumn(i).width = 20.33
            worksheet.getColumn(i).height = alto_celda
        }

        worksheet.getRow(2).height = alto_celda
        worksheet.getRow(3).height = alto_celda

        //? logo
        const logo = worksheet.getCell('A1')

        logo.border = styleNormalCell
        logo.alignment = { horizontal: 'center', vertical: 'middle' }

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
        });

        const cellImage = worksheet.getCell("A1")
        cellImage.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }

        //? titulo
        row1Cells.forEach(item => {
            const cell = worksheet.getCell(item.cell)
            setCellProperties(cell, item.value, item.font, item.bold)
        })
        row2cells.forEach(item => {
            const cell = worksheet.getCell(item.cell)
            setCellProperties(cell, item.value, item.font, item.bold)
        })
        row3Cells.forEach(item => {
            const cell = worksheet.getCell(item.cell)
            setCellProperties(cell, item.value, item.font, item.bold)
        })

        if (cont.infoContenedor.clienteInfo._id === "659dbd9a347a42d89929340e") {

            worksheet.mergeCells(`A1:B1`);
            worksheet.mergeCells(`C1:J1`);
            worksheet.mergeCells('B2:C2');
            worksheet.mergeCells('A3:B3');
            worksheet.mergeCells('D3:E3');
            worksheet.mergeCells('H3:I3');
        } else {
            worksheet.mergeCells(`A1:B1`);
            worksheet.mergeCells(`C1:I1`);
            worksheet.mergeCells('B2:C2');
            worksheet.mergeCells('A3:B3');
            worksheet.mergeCells('D3:E3');
        }

        //? los headers de la tabla
        const headers = cont.infoContenedor.clienteInfo._id === "659dbd9a347a42d89929340e" ? [
            "PALLET ID",
            "PACKING DATE",
            "VARIETY",
            "PRODUCT",
            "WEIGHT",
            "CATEGORY",
            "SIZE",
            "QTY",
            "FARM CODE",
            "N° GG",
            "EXPIRATION DATE"
        ] : [
            "PALLET ID",
            "PACKING DATE",
            "VARIETY",
            "WEIGHT",
            "CATEGORY",
            "SIZE",
            "QTY",
            "FARM CODE",
            "N° GG",
            "EXPIRATION DATE"
        ]
        const headerRow = worksheet.insertRow(4, headers)
        headerRow.height = alto_celda

        const len = cont.infoContenedor.clienteInfo._id === "659dbd9a347a42d89929340e" ? 11 : 10;
        for (let i = 1; i <= len; i++) {
            const cell = worksheet.getCell(4, i);
            cell.font = { bold: true, size: 15 };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF5FD991' }
            }
            cell.border = styleNormalCell
        }
        let totalCajas = 0
        let row = 5


        for (const item of itemsPallet) {
            if (cont.infoContenedor.clienteInfo._id === "659dbd9a347a42d89929340e") {
                const newRow = worksheet.insertRow(row, [
                    String(item.pallet.numeroPallet) + String(cont.numeroContenedor),
                    formatearFecha(item.fecha, true),
                    labelListaEmpaque[item.tipoFruta.tipoFruta],
                    "COL-" + mostrarKilose(item) + (item.tipoFruta === 'Limon' ? 'Limes' : 'Oranges') + item.calibre + "ct",
                    mostrarKilose(item),
                    isNotCaribe ? item.calidad.descripcion : "Caribe",
                    item.calibre,
                    item.cajas,
                    item.lote.SISPAP ? item.lote.ICA.code : 'Sin SISPAP',
                    item.GGN ? item.lote.predio.GGN.code : "N/A",
                    item.GGN ? item.lote.predio.GGN.fecha : "N/A",
                ])

                newRow.height = alto_celda;
                newRow.width = 20;

            } else {
                const newRow = worksheet.insertRow(row, [
                    String(item.pallet.numeroPallet) + String(cont.numeroContenedor),
                    formatearFecha(item.fecha, true),
                    labelListaEmpaque[item.tipoFruta.tipoFruta],
                    mostrarKilose(item),
                    isNotCaribe ? item.calidad.descripcion : "Caribe",
                    item.calibre,
                    item.cajas,
                    item.lote.SISPAP ? item.lote.ICA.code : 'Sin SISPAP',
                    item.GGN ? item.lote.predio.GGN.code : "N/A",
                    item.GGN ? item.lote.predio.GGN.fecha : "N/A",
                ])

                newRow.height = alto_celda;
                newRow.width = 20.33;
            }

            if (!coc_flag && item.GGN) {
                coc_flag = true
            }
            totalCajas += item.cajas;
            for (let i = 1; i <= len; i++) {
                const cell = worksheet.getCell(row, i);
                cell.font = { size: fuente };
                cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                cell.border = styleNormalCell
            }
            row++;

        }

        const totalLabel = worksheet.getCell(row, 1)
        totalLabel.value = "TOTAL"
        worksheet.getRow(row).height = alto_celda

        if (cont.infoContenedor.clienteInfo._id === "659dbd9a347a42d89929340e") {
            worksheet.mergeCells(`A${row}:F${row}`);
            worksheet.mergeCells(`G${row}:K${row}`);

        } else {
            worksheet.mergeCells(`A${row}:E${row}`);
            worksheet.mergeCells(`F${row}:J${row}`);

        }
        totalLabel.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
        totalLabel.font = { size: 12 }
        totalLabel.border = styleNormalCell
        totalLabel.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF5FD991' }
        }

        const total = worksheet.getCell(row, 7)
        total.value = totalCajas
        total.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
        total.font = { size: 12 }
        total.border = styleNormalCell
        total.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF5FD991' }
        }
        //?las tablas de resumen por calidad

        row += 2;
        worksheet.getRow(row).height = alto_celda

        for (const calidad of cont.infoContenedor.calidad) {
            //head
            worksheet.insertRow(row, [
                "SUMMARY CATEGORY",
                isNotCaribe ? calidad.calidad.descripccion : "Caribe",

            ])
            for (let i = 1; i <= 4; i++) {
                const cell = worksheet.getCell(row, i);
                cell.font = { bold: true, size: fuente };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FF5FD991' }
                }
                cell.border = styleNormalCell
            }

            row++;
            worksheet.getRow(row).height = alto_celda

            //columnas
            worksheet.insertRow(row, [
                "SIZE",
                "QTY",
                "N.PALLETS",
                "% PERCENTAGE",
            ])
            for (let i = 1; i <= 4; i++) {
                const cell = worksheet.getCell(row, i);
                cell.font = { bold: true, size: fuente };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FF5FD991' }
                }
                cell.border = styleNormalCell
            }
            row++;
            worksheet.getRow(row).height = alto_celda

            const resumen = isNotCaribe ? resumenCalidad(cont, calidad) : resumenCalidad(cont)

            //datos
            Object.entries(resumen).forEach(([key, value]) => {
                worksheet.insertRow(row, [
                    key,
                    value.cantidad,
                    value.pallets,
                    value.porcentage.toFixed(2) + "%",
                ])
                for (let i = 1; i <= 4; i++) {
                    const cell = worksheet.getCell(row, i);
                    cell.font = { size: 12 };
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    cell.border = styleNormalCell
                }

                row++;
                worksheet.getRow(row).height = alto_celda

            })

            worksheet.insertRow(row, [
                "TOTAL",
                Object.keys(resumen).reduce((acu, item) => acu += resumen[item].cantidad, 0),
                Object.keys(resumen).reduce((acu, item) => acu += resumen[item].pallets, 0),
                resumen && Object.keys(resumen).reduce((acu, item) => acu += resumen[item].porcentage, 0).toFixed(2) + "%",
            ])
            for (let i = 1; i <= 4; i++) {
                const cell = worksheet.getCell(row, i);
                cell.font = { bold: true, size: 12 };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FF5FD991' }
                }
                cell.border = styleNormalCell
            }


            row += 2;
            worksheet.getRow(row).height = alto_celda

            if (coc_flag) {
                if (cont.infoContenedor.clienteInfo._id === "659dbd9a347a42d89929340e") {
                    const cell = worksheet.getCell("K3")
                    cell.value = "4063061801296"
                    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
                    cell.font = { size: fuente, bold: false }
                    cell.border = styleNormalCell
                } else {
                    const cell = worksheet.getCell("J3")
                    cell.value = "4063061801296"
                    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
                    cell.font = { size: fuente, bold: false }
                    cell.border = styleNormalCell
                }

            }

            if (!isNotCaribe) break;

        }

        const buffer = await workbook.xlsx.writeFile();
        return buffer

    }
}