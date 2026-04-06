
import puppeteer from "puppeteer";
import { platform } from "os";
import { existsSync } from "fs";

const getChromePath = () => {
    if (platform() === 'win32') {
        return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    }
    if (platform() === 'darwin') {
        return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    }
    // Linux: buscar la primera ruta que exista
    const linuxPaths = [
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
        '/usr/bin/chromium-browser',
        '/usr/bin/chromium',
    ];
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    return linuxPaths.find(p => existsSync(p)) ?? null;
}

class BrowserPool {
    constructor() {
        this.browser = null
        this.pool = []
        this.queue = []
    }

    async init(size = 3) {
        const executablePath = getChromePath()
        this.browser = await puppeteer.launch({
            headless: 'new',
            ...(executablePath && { executablePath }),
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage'
            ]
        })

        for (let i = 0; i < size; i++) {
            const page = await this.browser.newPage()
            this.pool.push(page)
        }
    }

    acquire() {
        return new Promise((resolve) => {
            if (this.pool.length > 0) {
                const page = this.pool.pop()
                return resolve(page)
            }
            this.queue.push(resolve)
        })
    }
    async release(page) {
        try {
            await page.goto('about:blank')

            if (this.queue.length > 0) {
                const nextInQueue = this.queue.shift();
                nextInQueue(page)
            } else {
                this.pool.push(page)
            }
        } catch (error) {
            console.error("Error al liberar la página:", error);
        }
    }

    getWsEndpoint() {
        if (!this.browser) throw new Error('BrowserPool no inicializado')
        return this.browser.wsEndpoint()
    }

    async connect(wsEndpoint, size = 1) {
        this.browser = await puppeteer.connect({ browserWSEndpoint: wsEndpoint })
        for (let i = 0; i < size; i++) {
            const page = await this.browser.newPage()
            this.pool.push(page)
        }
    }

    async disconnect() {
        for (const page of this.pool) {
            try { await page.close() } catch {
                console.warn("No se pudo cerrar una página del pool, es posible que ya esté cerrada.")
            }
        }
        this.pool = []
        if (this.browser) {
            this.browser.disconnect()
            this.browser = null
        }
    }

    async closeAll(){
        if(this.browser){
            await this.browser.close()
        }
    }
}

export const browserPool = new BrowserPool()