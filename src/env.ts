import { z } from "zod";

export const envSchema = z.object({
	LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]),
	NODE_ENV: z.enum(["development", "production"]).default("development"),
	PORT: z.coerce.number().default(3000),
	PRINTER_HOST: z.string().default("10.0.1.128"),
});

export type Env = z.infer<typeof envSchema>;

let env: Env;

try {
	env = envSchema.parse(process.env);
} catch (e) {
	const error = e as z.ZodError;
	console.error("❌ Invalid environment variables:");
	console.error(z.prettifyError(error));
	process.exit(1);
}

export default env;
