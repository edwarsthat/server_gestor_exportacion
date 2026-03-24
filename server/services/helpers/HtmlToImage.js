
import { browserPool } from './browserPool.js';

export class HtmlToImage {
    static async convertToImage(html, options = {}) {
        const {
            outputPath = null,
            width = 1000,
            height = 600,
            deviceScaleFactor = 2,
            fullPage = false,
            type = 'png',
            quality = 100,
            selector = null, // Si quieres capturar solo un elemento específico
            waitFor = 'domcontentloaded',
            baseUrl = null // Ruta base para resolver archivos locales (imágenes, etc)
        } = options;

        let page = null;

        try {
            page = await browserPool.acquire();

            // Inyectar etiqueta <base> si se proporciona baseUrl para resolver recursos locales
            let finalHtml = html;
            if (baseUrl) {
                const baseTag = `<base href="file://${baseUrl}/">`;
                if (finalHtml.includes('<head>')) {
                    finalHtml = finalHtml.replace('<head>', `<head>${baseTag}`);
                } else {
                    finalHtml = `${baseTag}${finalHtml}`;
                }
            }

            // Configurar viewport
            await page.setViewport({
                width,
                height,
                deviceScaleFactor
            });

            // Cargar el HTML
            await page.setContent(finalHtml, {
                waitUntil: waitFor
            });

            // Configurar opciones de screenshot
            const screenshotOptions = {
                type,
                fullPage,
                ...(outputPath && { path: outputPath }),
                ...(type === 'jpeg' && { quality })
            };

            // Capturar imagen
            let imageBuffer;
            if (selector) {
                const element = await page.$(selector);
                if (!element) throw new Error(`Elemento "${selector}" no encontrado`);
                imageBuffer = await element.screenshot(screenshotOptions);
            } else {
                imageBuffer = await page.screenshot(screenshotOptions);
            }

            return outputPath || imageBuffer;

        } catch (error) {
            throw new Error(`Error al convertir HTML a imagen: ${error.message}`);
        } finally {
            if (page) await browserPool.release(page);
        }
    }
    static async convertToPdf(html, options = {}) {
        const {
            outputPath = null,
            format = 'A4',
            printBackground = true,
            margin = { top: 0, right: 0, bottom: 0, left: 0 },
            waitFor = 'domcontentloaded',
            baseUrl = null,
        } = options;

        let page = null;

        try {
            page = await browserPool.acquire();

            let finalHtml = html;
            if (baseUrl) {
                const baseTag = `<base href="file://${baseUrl}/">`;
                if (finalHtml.includes('<head>')) {
                    finalHtml = finalHtml.replace('<head>', `<head>${baseTag}`);
                } else {
                    finalHtml = `${baseTag}${finalHtml}`;
                }
            }

            await page.emulateMediaType('screen');
            // await page.setViewport({ width, height, deviceScaleFactor: 2 });
            await page.setContent(finalHtml, { waitUntil: waitFor, timeout: 60000 });

            const pdfBuffer = await page.pdf({
                path: outputPath,
                format,
                printBackground,
                margin,
                displayHeaderFooter: false
            });

            return outputPath || pdfBuffer;

        } catch (error) {
            throw new Error(`Error al convertir HTML a PDF: ${error.message}`);
        } finally {
            if (page) await browserPool.release(page);
        }
    }

    static async convertToBuffer(html, options = {}) {
        return await this.convertToImage(html, { ...options, outputPath: null });
    }
    static async convertToBase64(html, options = {}) {
        const buffer = await this.convertToBuffer(html, options);
        const base64 = buffer.toString('base64');
        const mimeType = options.type === 'jpeg' ? 'image/jpeg' : 'image/png';
        return `data:${mimeType};base64,${base64}`;
    }

}