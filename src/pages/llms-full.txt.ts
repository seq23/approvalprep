import type { APIRoute } from "astro";
import routes from "../../data/routes/route_manifest.json";
export const GET: APIRoute = async () => new Response(routes.routes.map((route) => `${route.path} - ${route.title} - ${route.family}`).join("\n"), { headers: { "content-type": "text/plain; charset=utf-8" } });
