import { config } from "dotenv";
import { env } from "process";
import { defineConfig, Options } from "tsup";

if (!("NODE_ENV" in env)) config({ path: ".dev.vars" });

export default defineConfig(({ watch }) => {
  const options: Options = {
    clean: !watch,
    entry: ["src/index.ts"],
    format: "esm",
    minify: true,
    platform: "neutral",
    target: "esnext",
  };

  if (env.NODE_ENV === "development") {
    options.sourcemap = true;
    options.minify = false;
  }
  return options;
});
