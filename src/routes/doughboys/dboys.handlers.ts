import convert from "xml-js";
import type { AppRouteHander } from "@/lib/types";
import type { ProxyDoughboysRequest } from "./dboys.routes";

export const proxyDoughboysRequest: AppRouteHander<ProxyDoughboysRequest> = async (c) => {
	const rss_feed = await fetch("https://rss.art19.com/doughboys");
	if (!rss_feed.ok) {
		return c.json({ message: "Failed to fetch Doughboys RSS feed" }, 500);
	}
	const rss_xml = await rss_feed.text();
	const rss_json = JSON.parse(convert.xml2json(rss_xml, { compact: true, spaces: 4 }));
	return c.json(rss_json.rss.channel.item, 200);
};
