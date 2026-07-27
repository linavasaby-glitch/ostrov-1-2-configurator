import { build } from "esbuild";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(scriptDir, "..");
const tempDir = path.join(projectDir, ".build-temp");

await rm(tempDir, { recursive: true, force: true });
await mkdir(tempDir, { recursive: true });

await build({
  absWorkingDir: projectDir,
  stdin: {
    contents: [
      'import React from "react";',
      'import { createRoot } from "react-dom/client";',
      'import Home from "./app/page";',
      'import "./app/globals.css";',
      'createRoot(document.getElementById("root")).render(<Home />);',
    ].join("\n"),
    loader: "tsx",
    resolveDir: projectDir,
    sourcefile: "static-entry.tsx",
  },
  bundle: true,
  format: "iife",
  jsx: "automatic",
  minify: true,
  outfile: path.join(tempDir, "app.js"),
  define: {
    "process.env.NODE_ENV": '"production"',
  },
  nodePaths: [path.join(projectDir, "node_modules")],
  loader: {
    ".tsx": "tsx",
    ".ts": "ts",
  },
});

const [javascript, stylesheet] = await Promise.all([
  readFile(path.join(tempDir, "app.js"), "utf8"),
  readFile(path.join(tempDir, "app.css"), "utf8"),
]);

const html = `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="description" content="Конфигуратор маршрутов и игровой среды для детей 6–24 месяцев">
  <title>Остров первых открытий | Маршруты 6–24 месяцев</title>
  <style>${stylesheet.replaceAll("</style", "<\\/style")}</style>
</head>
<body>
  <div id="root"></div>
  <script>${javascript.replaceAll("</script", "<\\/script")}</script>
</body>
</html>`;

const target = path.join(projectDir, "index.html");
await writeFile(target, html, "utf8");
await rm(tempDir, { recursive: true, force: true });
console.log(target);
