
import puppeteer from 'puppeteer';

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
            waitFor = 'networkidle0',
            baseUrl = null // Ruta base para resolver archivos locales (imágenes, etc)
        } = options;

        let browser = null;

        try {
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

            // Iniciar navegador
            browser = await puppeteer.launch({
                headless: 'new',
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage'
                ]
            });

            const page = await browser.newPage();

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
                fullPage
            };

            // Si se especifica un path, guardar en disco
            if (outputPath) {
                screenshotOptions.path = outputPath;
            }

            // Agregar calidad si es JPEG
            if (type === 'jpeg') {
                screenshotOptions.quality = quality;
            }

            // Capturar imagen
            let imageBuffer;
            if (selector) {
                // Capturar solo un elemento específico
                const element = await page.$(selector);
                if (!element) {
                    throw new Error(`Elemento con selector "${selector}" no encontrado`);
                }
                imageBuffer = await element.screenshot(screenshotOptions);
            } else {
                // Capturar página completa o viewport
                imageBuffer = await page.screenshot(screenshotOptions);
            }

            await browser.close();

            // Retornar buffer o path según corresponda
            return outputPath || imageBuffer;

        } catch (error) {
            if (browser) {
                await browser.close();
            }
            throw new Error(`Error al convertir HTML a imagen: ${error.message}`);
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