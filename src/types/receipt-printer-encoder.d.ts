declare module "@point-of-sale/receipt-printer-encoder" {
  interface ReceiptPrinterEncoderOptions {
    columns?: number;
    feedBeforeCut?: number;
  }

  export default class ReceiptPrinterEncoder {
    constructor(options?: ReceiptPrinterEncoderOptions);
    line(text: string): this;
    align(alignment: "left" | "center" | "right"): this;
    bold(enabled: boolean): this;
    image(...args: unknown[]): this;
    newline(lines?: number): this;
    cut(): this;
    encode(): Uint8Array;
  }
}
