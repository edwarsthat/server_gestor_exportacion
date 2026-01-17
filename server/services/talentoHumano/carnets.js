
export class CarnetsService {
    static procesarQr(qr) {
        const data = qr.split("serial=")[1]
        const dataArr = data.split("#")
        const serial = dataArr[0]
        const token = dataArr[1]

        return { serial, token }
    }
}
