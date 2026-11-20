import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const esmDir = path.resolve("dist/esm");
const typesDir = path.resolve("dist/types");

async function convertJavaScript(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      await convertJavaScript(filename);
    } else if (entry.name.endsWith(".js")) {
      const source = await readFile(filename, "utf8");
      await writeFile(
        filename.replace(/\.js$/, ".mjs"),
        fixRelativeImports(source),
      );
      await unlink(filename);
    }
  }
}

function fixRelativeImports(source) {
  return source.replace(
    /((?:from\s*|import\s*\(|require\s*\()\s*["'])(\.{1,2}\/[^"']+?)\.js(["'])/g,
    "$1$2.mjs$3",
  );
}

async function convertDeclarations(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    const target = path.join(esmDir, path.relative(typesDir, filename));

    if (entry.isDirectory()) {
      await convertDeclarations(filename);
    } else if (entry.name.endsWith(".d.ts")) {
      await mkdir(path.dirname(target), { recursive: true });
      const source = await readFile(filename, "utf8");
      await writeFile(
        target.replace(/\.d\.ts$/, ".d.mts"),
        fixRelativeImports(source),
      );
    }
  }
}

await convertJavaScript(esmDir);
await convertDeclarations(typesDir);
