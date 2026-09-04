import { readFile, writeFile, mkdir } from "node:fs/promises";
import { enhancePngBytes, LIVE } from "../src/spectral.js";

async function main() {
  const destDir = new URL("../public/spectral-samples/", import.meta.url);
  await mkdir(destDir, { recursive: true });
  const src = new Uint8Array(await readFile(new URL("../public/ocr_selftest.png", import.meta.url)));
  console.log("source png bytes", src.length);
  for (const id of LIVE) {
    const out = await enhancePngBytes(src, [id], { maxSide: 160 });
    if (!out.ok) {
      console.error("FAILED", id, out);
      process.exitCode = 1;
      return;
    }
    await writeFile(new URL(id + ".png", destDir), out.png);
    console.log(id, out.width, "x", out.height, out.png.length, "bytes");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
