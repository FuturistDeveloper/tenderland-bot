declare module 'html-pdf' {
    interface PDFOptions {
        format?: string;
        border?: {
            top?: string;
            right?: string;
            bottom?: string;
            left?: string;
        };
    }

    interface PDF {
        toFile(
            filePath: string,
            callback: (error: Error | null, result?: any) => void
        ): void;
    }

    function create(html: string, options?: PDFOptions): PDF;

    export = {
        create
    };
} 