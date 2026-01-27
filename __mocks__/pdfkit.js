// Mock de pdfkit para pruebas
class PDFDocument {
    constructor() {
        this.page = { width: 595, height: 842 };
        this.chunks = [];
    }

    on(event, callback) {
        if (event === 'data') {
            this.dataCallback = callback;
        } else if (event === 'end') {
            this.endCallback = callback;
        } else if (event === 'error') {
            this.errorCallback = callback;
        }
        return this;
    }

    image() {
        return this;
    }

    addPage() {
        return this;
    }

    end() {
        if (this.dataCallback) {
            this.dataCallback(Buffer.from('mock-pdf-data'));
        }
        if (this.endCallback) {
            this.endCallback();
        }
    }
}

export default PDFDocument;
