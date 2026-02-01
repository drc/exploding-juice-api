import { createRoute, z } from "@hono/zod-openapi";
import { StatusCodes } from "http-status-codes";

const ItemSchema = z.object({
	"content:encoded": z.object({
		_cdata: z.string(),
	}),
	description: z.object({
		_cdata: z.string(),
	}),
	enclosure: z.object({
		_attributes: z.object({
			length: z.string(),
			type: z.string(),
			url: z.string().url(),
		}),
	}),
	guid: z.object({
		_attributes: z.object({
			isPermaLink: z.string(),
		}),
		_text: z.string(),
	}),
	"itunes:duration": z.object({
		_text: z.string(),
	}),
	"itunes:episode": z
		.object({
			_text: z.string(),
		})
		.optional(),
	"itunes:episodeType": z.object({
		_text: z.string(),
	}),
	"itunes:explicit": z.object({
		_text: z.string(),
	}),
	"itunes:image": z.object({
		_attributes: z.object({
			href: z.string().url(),
		}),
	}),
	"itunes:keywords": z.object({
		_text: z.string(),
	}),
	"itunes:summary": z.object({
		_text: z.string(),
	}),
	"itunes:title": z.object({
		_text: z.string(),
	}),
	pubDate: z.object({
		_text: z.string(),
	}),
	title: z.object({
		_text: z.string(),
	}),
});

const ItemsArraySchema = z.array(ItemSchema);

export { ItemSchema, ItemsArraySchema };

export const proxyDoughboysRequest = createRoute({
	method: "get",
	path: "/doughboys",
	request: {},
	responses: {
		200: {
			content: {
				"application/json": {
					schema: ItemsArraySchema,
				},
			},
			description: `Returns a ${StatusCodes.OK} status code if the to-do item was printed successfully.`,
		},
		500: {
			content: {
				"application/json": {
					schema: z.object({
						message: z.string().openapi({ example: "Failed to fetch Doughboys RSS feed" }),
					}),
				},
			},
			description: `Returns a ${StatusCodes.INTERNAL_SERVER_ERROR} status code if there was an error fetching the RSS feed.`,
		},
	},
	summary: "Returns information about the Doughboys Podcast.",
	tags: ["Podcasts"],
});

export type ProxyDoughboysRequest = typeof proxyDoughboysRequest;
