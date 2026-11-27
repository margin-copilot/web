// Runs after `vite build`: writes dist/staticwebapp.config.json with the API origins from the
// environment. Fails the build if either URL is missing or not a bare https origin.
import { readFileSync, writeFileSync } from "node:fs";
import { writeConfig } from "./config-lib.mjs";

const names = ["VITE_ORCHESTRATOR_URL", "VITE_PROPOSALS_API_URL"];
const urls = names.map((n) => {
  const v = process.env[n]?.trim();
  if (!v) throw new Error(`Missing setting ${n} (export it before the build)`);
  return v;
});
const template = readFileSync(new URL("../staticwebapp.config.template.json", import.meta.url), "utf8");
writeFileSync(new URL("../dist/staticwebapp.config.json", import.meta.url), writeConfig(template, urls));
