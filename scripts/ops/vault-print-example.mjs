#!/usr/bin/env node
import fs from "node:fs";
process.stdout.write(fs.readFileSync(".ops/vault.example.json", "utf8"));
