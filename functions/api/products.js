import { json } from '../_runtime/responses.js';
import { readPublicCatalog } from '../_runtime/catalog.js';
export async function onRequestGet({ env }){ return json(await readPublicCatalog(env)); }
