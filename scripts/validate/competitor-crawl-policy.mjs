#!/usr/bin/env node

import {readJson,fail} from "./_common.mjs";
const w=readJson("data/intelligence/competitor_watchlist.json"); for(const c of w.competitors){ if(c.allowed && !/^https:\/\//.test(c.baseUrl)) fail(`[competitor-crawl-policy] competitor ${c.id} must use https baseUrl`); if(!c.notes) fail(`[competitor-crawl-policy] competitor ${c.id} needs crawl notes`); }
console.log("[competitor-crawl-policy] OK");
