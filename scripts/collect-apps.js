/* ═══════════════════════════════════════════
   Copy the tool folders into the build output.

   Parcel only knows about the pages listed in package.json. The tools are
   self-contained — their own HTML, CSS and JS, already built — so they are
   copied across verbatim rather than run through the bundler. Passing them
   through Parcel would rewrite their asset paths and break them.

   Runs automatically after `npm run build`.
   ═══════════════════════════════════════════ */

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SOURCE = path.join(ROOT, "apps");
const TARGET = path.join(ROOT, "dist", "apps");

/* index.html is the hub itself — Parcel builds that one. Everything else in
   apps/ is a tool folder to be copied. */
const SKIP_FILES = new Set(["index.html"]);

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });

  let count = 0;
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dest = path.join(to, entry.name);

    if (entry.isDirectory()) {
      count += copyDir(src, dest);
    } else {
      fs.copyFileSync(src, dest);
      count++;
    }
  }
  return count;
}

function main() {
  if (!fs.existsSync(SOURCE)) {
    console.log("[collect-apps] no apps/ folder — nothing to do");
    return;
  }

  const tools = fs
    .readdirSync(SOURCE, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !SKIP_FILES.has(entry.name));

  if (!tools.length) {
    console.log("[collect-apps] no tools to copy yet");
    return;
  }

  fs.mkdirSync(TARGET, { recursive: true });

  for (const tool of tools) {
    const files = copyDir(
      path.join(SOURCE, tool.name),
      path.join(TARGET, tool.name)
    );
    console.log(`[collect-apps] ${tool.name} — ${files} files`);
  }

  console.log(`[collect-apps] ${tools.length} tool(s) copied into dist/apps/`);
}

main();
