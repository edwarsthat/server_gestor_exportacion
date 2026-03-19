import { Worker } from 'worker_threads'
import { randomUUID } from 'crypto'

export class CarnetWorkerRunner {
    static launch({ empleados, user }){

        const jobId = randomUUID()

        const  worker = new Worker('./carnetWorker.js', {
            workerData: { empleados, user, jobId }
        })

        worker.on('message', (result) => {
            //se suma 
        })

        worker.on("error", (err) => {
            //error
        })

        return jobId
    }
}