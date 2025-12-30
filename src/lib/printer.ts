import net from "node:net";
import ReceiptPrinterEncoder from "@point-of-sale/receipt-printer-encoder";
import env from "@/env";

const PORT: number = 9100;
const HOST: string = env.PRINTER_HOST ?? "10.0.1.128";

function log(...args: unknown[]): void {
	if (env.NODE_ENV === "production") return;
	console.log("[🧾 THERMAL]", ...args);
}

const printerClientSingleton = (): net.Socket => {
	log("Creating new socket...");
	return new net.Socket();
};
export const client: net.Socket =
	globalThis.printerClientGlobal ?? printerClientSingleton();
globalThis.printerClientGlobal = client;

if (!globalThis.printerConnected) {
	log("Connecting to printer for the first time");
	client.connect(PORT, HOST, () => {
		globalThis.printerConnected = true;
		log("Connected to printer");
	});
}

client.on("data", (data): void => {
	log("Received:", data.toString("hex"));
});

client.on("error", (err): void => {
	log("Error connecting to printer:", err);
});

client.on("close", (): void => {
	log("Disconnected from printer");
});

const socketEvents: string[] = [
	"close",
	"connectionAttempt",
	"connectionAttemptFailed",
	"connectionAttemptTimeout",
	"drain",
	"end",
	"lookup",
	"connect",
	"ready",
	"timeout",
];

for (const event of socketEvents) {
	client.on(event, (_data): void => {
		log("[🧾 THERMAL] Event:", event);
	});
}

// biome-ignore lint/suspicious/noShadowRestrictedNames: ok
declare const globalThis: {
	printerClientGlobal: ReturnType<typeof printerClientSingleton>;
	printerConnected: boolean;
} & typeof global;

export const encoder: ReceiptPrinterEncoder = new ReceiptPrinterEncoder({
	feedBeforeCut: 5,
	columns: 48,
});
