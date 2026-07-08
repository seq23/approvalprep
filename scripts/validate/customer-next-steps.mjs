#!/usr/bin/env node
import fs from "node:fs";
const steps = JSON.parse(fs.readFileSync("data/content/customer_next_steps.json", "utf8")).steps || [];
if (steps.length < 8) throw new Error("Customer next steps must have at least 8 steps");
const component = fs.readFileSync("src/components/NextStepsExplainer.astro", "utf8");
if (!component.includes("customerNextSteps")) throw new Error("NextStepsExplainer not wired");
console.log("[validate:customer-next-steps] OK");
