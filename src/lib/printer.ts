import net from "node:net";
import ReceiptPrinterEncoder from "@point-of-sale/receipt-printer-encoder";
import env from "@/env";

// Default port for thermal printer communication (ESC/POS protocol)
const PORT: number = 9100;
// IP address of the thermal printer, with fallback to default
const HOST: string = env.PRINTER_HOST ?? "10.0.1.128";

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
if (!globalThis.printerConnected) {
	log("Connecting to printer for the first time");
	client.connect(PORT, HOST, () => {
		globalThis.printerConnected = true;
		log("Connected to printer");
	});
}

// Handle incoming data from printer (status responses)
client.on("data", (data): void => {
	log("Received:", data.toString("hex"));
});

// Handle connection errors
client.on("error", (err): void => {
	log("Error connecting to printer:", err);
});

// Handle disconnection
client.on("close", (): void => {
	log("Disconnected from printer");
});

// Extend global type definitions for printer-specific properties
// biome-ignore lint/suspicious/noShadowRestrictedNames: ok
declare const globalThis: {
	printerClientGlobal: ReturnType<typeof printerClientSingleton>;
	printerConnected: boolean;
} & typeof global;

// Initialize the receipt printer encoder with configuration for thermal print formatting
export const encoder: ReceiptPrinterEncoder = new ReceiptPrinterEncoder({
	columns: 48,
	feedBeforeCut: 5,
});
