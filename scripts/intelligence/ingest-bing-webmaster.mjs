#!/usr/bin/env node

import {env,fetchJson,writeJson,appendRun,statusOnly,now} from "./_lib.mjs";
const connectorId="bing_webmaster"; const key=env("BING_WEBMASTER_API_KEY"); const api=env("BING_WEBMASTER_API_URL");
if(!key||!api) statusOnly(connectorId,"NOT_CONFIGURED","BING_WEBMASTER_API_KEY and BING_WEBMASTER_API_URL are required. Set the exact Bing endpoint for the owned property.");
else { try{ const data=await fetchJson(api,{headers:{"Ocp-Apim-Subscription-Key":key}}); const rows=Array.isArray(data)?data:(data.rows||data.value||[]); writeJson("data/intelligence/bing_webmaster.json",{schemaVersion:"4.1.0",source:connectorId,rows,importedAt:now()}); appendRun(connectorId,rows.length?"COMPLETE":"NO_DATA",{recordsImported:rows.length}); console.log(JSON.stringify({connectorId,status:rows.length?"COMPLETE":"NO_DATA",recordsImported:rows.length},null,2)); }catch(e){appendRun(connectorId,"SOURCE_ERROR",{reason:e.message,recordsImported:0}); throw e;} }
