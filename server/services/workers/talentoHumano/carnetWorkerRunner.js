import { Worker } from 'worker_threads'
import { randomUUID } from 'crypto'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
import { talentoHumanoEventEmitter } from '../../../../events/eventos.js'

export class CarnetWorkerRunner {
    static launch(data){

        const jobId = randomUUID()

        const  worker = new Worker(join(__dirname, 'carnetWorker.js'), {
            workerData: { carnetsIds:data, jobId}
        })

        worker.on('message', (result) => {
            talentoHumanoEventEmitter.emit('generacion_carnets', result)
        })

        worker.on("error", (err) => {
            talentoHumanoEventEmitter.emit('generacion_carnets', {
                jobId,
                status: 401,
                error: err.message,
                message: 'Ocurrió un error al generar los carnets.'
            })
        })

        return jobId
    }
}