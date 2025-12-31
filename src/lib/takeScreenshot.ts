import { ImageData } from "@napi-rs/canvas";
import { chromium } from "playwright";
import sharp from "sharp";
import type { Screenshot } from "./types";

async function takeScreenshot(url: string, element: string): Promise<Screenshot> {
	const browser = await chromium.launch();
	try {
		const page = await browser.newPage();
		await page.goto(url);
		const ss = await page.locator(element).screenshot();

		// Convert screenshot to raw RGBA pixel buffer at the desired size
		const { data, info } = await sharp(ss)
			.ensureAlpha() // make sure we have RGBA
			.raw() // get raw pixel data
			.toBuffer({ resolveWithObject: true });

		const height = Math.floor(info.height / 8) * 8;

		// Create ImageData from the raw buffer (Uint8ClampedArray required)
		const imageData = new ImageData(
			new Uint8ClampedArray(data),
			info.width,
			info.height,
		);
		return {
			image: imageData,
			width: info.width,
			height: height,
		} as Screenshot;
	} finally {
		await browser.close();
	}
}

export default takeScreenshot;
