
import puppeteer from "puppeteer";

class BrowserPool {
    constructor() {
        this.browser = null
        this.pool = []
        this.queue = []
    }

    async init(size = 3) {
        this.browser = await puppeteer.launch({
            headless: 'new',
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