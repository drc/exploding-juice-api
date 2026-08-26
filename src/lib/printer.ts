import net from "node:net";
import ReceiptPrinterEncoder from "@point-of-sale/receipt-printer-encoder";
import pino from "pino";
import env from "@/env";

// Default port for thermal printer communication (ESC/POS protocol)
const PORT: number = 9100;
// IP address of the thermal printer, with fallback to default
const HOST: string = env.PRINTER_HOST ?? "10.0.1.128";

// When true, skip the network entirely and render a readable preview of the
// ESC/POS payload to the terminal instead.
export const offline: boolean = env.PRINTER_OFFLINE === "true";

const printerLogger = pino({ level: env.LOG_LEVEL });
type DebugLogger = { info: (details: Record<string, unknown>, message: string) => void };

function debugLog(logger: DebugLogger, event: string, details: Record<string, unknown> = {}): void {
  logger.info(details, `[dota-match-debug] ${event}`);
}

debugLog(printerLogger, "printer_mode", { offline });

// Development logging utility - only logs when not in production
function log(...args: unknown[]): void {
  if (env.NODE_ENV === "production") return;
  console.log("[🧾 THERMAL]", ...args);
}

// Factory function to create a new socket instance
const printerClientSingleton = (): net.Socket => {
  log("Creating new socket...");
  return new net.Socket();
};

// Initialize printer client as a singleton to maintain a persistent connection
export const client: net.Socket = globalThis.printerClientGlobal ?? printerClientSingleton();
globalThis.printerClientGlobal = client;

// Establish initial connection to printer on first module load
if (!offline && !globalThis.printerConnected) {
  log("Connecting to printer for the first time");
  debugLog(printerLogger, "printer_connecting");
  client.connect(PORT, HOST, () => {
    globalThis.printerConnected = true;
    log("Connected to printer");
    debugLog(printerLogger, "printer_connected");
  });
} else if (offline) {
  log("Offline mode — skipping printer connection");
  debugLog(printerLogger, "printer_connection_skipped", { offline: true });
}

// Handle incoming data from printer (status responses)
client.on("data", (data): void => {
  log("Received:", data.toString("hex"));
});

// Handle connection errors
client.on("error", (err): void => {
  log("Error connecting to printer:", err);
  debugLog(printerLogger, "printer_error", { error: err.message });
});

// Handle disconnection
client.on("close", (): void => {
  log("Disconnected from printer");
  debugLog(printerLogger, "printer_closed");
});

// Extend global type definitions for printer-specific properties
declare global {
  var printerClientGlobal: ReturnType<typeof printerClientSingleton> | undefined;
  var printerConnected: boolean | undefined;
}

// Initialize the receipt printer encoder with configuration for thermal print formatting
export const encoder: ReceiptPrinterEncoder = new ReceiptPrinterEncoder({
  columns: 48,
  feedBeforeCut: 5,
});

// Single entrypoint for sending an encoded job to the printer. Encodes the
// buffered commands on the shared encoder and either writes to the socket or
// renders a readable preview when offline.
export function print(e: ReceiptPrinterEncoder, logger: DebugLogger = printerLogger): void {
  const data = e.encode();
  debugLog(logger, "printer_write", {
    offline,
    encoded_bytes: data.byteLength,
    connected: globalThis.printerConnected === true,
    connecting: client.connecting,
    destroyed: client.destroyed,
    writable: client.writable,
  });
  if (offline) {
    renderPreview(data);
    debugLog(logger, "printer_write_result", { offline: true, result: null });
    return;
  }
  const result = client.write(data);
  debugLog(logger, "printer_write_result", { offline: false, result });
}

// ESC/POS commands emitted by this app whose payload is one parameter byte.
const ESC_ONE_PARAM: ReadonlySet<number> = new Set([
  0x21, // !  select character size/table
  0x2d, // -  underline on/off
  0x4d, // M  select font
  0x61, // a  select justification
  0x45, // E  emphasized (bold) on/off
]);

// Best-effort ESC/POS decoder for terminal preview. Strips control sequences,
// replaces raster image blocks with `[image WxH]`, decodes remaining bytes as
// UTF-8 so multibyte text survives.
function renderPreview(buf: Uint8Array): void {
  const cleaned: number[] = [];
  let i = 0;
  while (i < buf.length) {
    const b = buf[i] as number;

    if (b === 0x1b) {
      // ESC ...
      const cmd = buf[i + 1];
      if (cmd === undefined) break;
      i += 2;
      if (ESC_ONE_PARAM.has(cmd)) i += 1;
      continue;
    }

    if (b === 0x1d) {
      // GS ...
      const cmd = buf[i + 1];
      if (cmd === 0x76 && buf[i + 2] === 0x30) {
        // GS v 0 m wL wH hL hH ...  — raster image
        const m = buf[i + 3] ?? 0;
        const w = ((buf[i + 5] ?? 0) << 8) | (buf[i + 4] ?? 0);
        const h = ((buf[i + 7] ?? 0) << 8) | (buf[i + 6] ?? 0);
        const bytesPerRow = Math.ceil((m === 0 ? w : w * (m === 32 ? 4 : 8)) / 8);
        const dataLen = bytesPerRow * h;
        cleaned.push(0x0a);
        for (const ch of `[image ${w}x${h}]`) cleaned.push(ch.charCodeAt(0));
        cleaned.push(0x0a);
        i += 8 + dataLen;
        continue;
      }
      i += 2;
      if (cmd === 0x21 || cmd === 0x42 || cmd === 0x56) i += 1;
      continue;
    }

    if (b === 0x0a) {
      cleaned.push(0x0a);
      i += 1;
      continue;
    }
    if (b === 0x0c || b === 0x0d) {
      i += 1;
      continue;
    }
    if (b < 0x20 || b === 0x7f) {
      i += 1;
      continue;
    }

    cleaned.push(b);
    i += 1;
  }

  const text = new TextDecoder("utf-8").decode(new Uint8Array(cleaned));
  console.log("[🧾 THERMAL DRY-RUN]\n" + text);
}
