#!/usr/bin/env node
// The owner's yes on the redrawn pins (approval hold, 6 Nov 2026): date every held pin from
// tomorrow (America/Chicago) at PINS_PER_DAY with the spread rule, run the quality gate on
// the new order, end the hold. Run by the Pinterest Refill workflow when dispatched with
// release_held=true (the one command: docs/runbooks/pinterest-pins.md); the workflow builds,
// validates and pushes the queue. Exits 1 (named stop) when nothing is held.
import fs from "node:fs";
import path from "node:path";
import { loadQueue, QUEUE_FILE, chicagoDate } from "../../src/lib/pinfeed.mjs";
import { releaseHeld, gateAndReschedule } from "./refill_queue.mjs";

const queue = loadQueue();
const today = chicagoDate(process.env.PINFEED_NOW ? new Date(process.env.PINFEED_NOW) : new Date());
if (!(queue.held || []).length) { console.error("NAMED STOP: NOTHING_HELD - data/pinterest/queue.json has no held pins to release."); process.exit(1); }
const scheduled = releaseHeld(queue, today);
await gateAndReschedule(queue, today);
fs.writeFileSync(path.join(process.cwd(), QUEUE_FILE), JSON.stringify(queue, null, 2) + "\n");
const dates = queue.items.filter((v) => v.releaseDate > today).map((v) => v.releaseDate).sort();
console.log(`[pinterest-release] OK released ${scheduled.length} held pins, ${dates[0]} to ${dates.at(-1)}; hold ended ${today}`);
