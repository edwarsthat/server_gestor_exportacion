
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

    async closeAll(){
        if(this.browser){
            await this.browser.close()
        }
    }
}

export const browserPool = new BrowserPool()