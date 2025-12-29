import { serve } from "@hono/node-server";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { Scalar } from "@scalar/hono-api-reference";

import { client, encoder } from "./lib/printer.js";

const app = new OpenAPIHono();

const fortuneSchema = z.object({
  fortune: z.string().min(1).max(200).openapi({ example: "What will my future hold?" }),
});

const route = createRoute({
  method: "post",
  path: "/fortune",
  request: {
    body: {
      content: {
        "application/json": {
          schema: fortuneSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Returns a 201 status code if the fortune was printed successfully.",
    },
  },
});

app.openapi(route, (c) => {
  const { fortune } = c.req.valid("json");
  console.log("Printing fortune:", fortune);
  client.write(encoder.line(fortune).newline(5).cut().encode());
  return c.json({}, 201);
});

app.doc("/doc", {
  openapi: "3.1.0",
  info: {
    title: "Fortune Cookie Printer API",
    version: "1.0.0",
  },
});

app.get("/", Scalar({ url: "/doc" }));

serve(
  {
    fetch: app.fetch,
    port: 3000,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  },
);
