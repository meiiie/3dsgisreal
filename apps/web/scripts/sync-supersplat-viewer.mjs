import { copyFile, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(scriptDir, "..");
const packageRoot = path.join(webRoot, "node_modules", "@playcanvas", "supersplat-viewer");
const packageJsonPath = path.join(packageRoot, "package.json");
const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
const sourceDir = path.join(packageRoot, "public");
const targetDir = path.join(webRoot, "public", "supersplat-viewer");

await assertDirectory(sourceDir);
await mkdir(targetDir, { recursive: true });
await copyDirectory(sourceDir, targetDir);
await writeFile(
  path.join(targetDir, "loi-vao-viewer-source.json"),
  `${JSON.stringify({ package: packageJson.name, version: packageJson.version }, null, 2)}\n`,
);

console.log(`Synced ${packageJson.name}@${packageJson.version} to ${path.relative(webRoot, targetDir)}`);

async function copyDirectory(source, target) {
  const entries = await readdir(source, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);

    if (entry.isDirectory()) {
      await mkdir(targetPath, { recursive: true });
      await copyDirectory(sourcePath, targetPath);
      continue;
    }

    if (entry.isFile()) {
      await copyFile(sourcePath, targetPath);
    }
  }
}

async function assertDirectory(directory) {
  const info = await stat(directory);

  if (!info.isDirectory()) {
    throw new Error(`Expected SuperSplat Viewer public directory at ${directory}`);
  }
}
