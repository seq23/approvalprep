import { spawnSync } from "node:child_process";

export function run(command, args = [], options = {}) {
  const label = [command, ...args.map((arg) => String(arg).includes(process.env.CLOUDFLARE_API_TOKEN || "__never__") ? "***" : arg)].join(" ");
  console.log(`[ops] ${label}`);
  const result = spawnSync(command, args, { stdio: "inherit", shell: false, ...options });
  if (result.status !== 0) throw new Error(`Command failed: ${command} ${args.join(" ")}`);
  return result;
}
