// สร้างบล็อก PANEX_HEADERS ของ PANEX_Initialize.gs จาก schema ฝั่งเว็บโดยตรง
// ใช้เมื่อเพิ่ม/ลบ/สลับคอลัมน์ของโมดูล:  node scripts/gen-sheet-headers.mjs
// แล้วเอาผลลัพธ์ไปแทนบล็อก var PANEX_HEADERS = {...}; ในไฟล์ .gs  (จากนั้นรัน PANEX_MIGRATE())
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { join } from "node:path";

const out = mkdtempSync(join(tmpdir(), "panex-schema-"));
try {
  // เรียก tsc ผ่าน node ตรง ๆ — ข้าม npx ที่สั่งจาก script บน Windows ไม่ได้
  execFileSync(
    process.execPath,
    ["node_modules/typescript/bin/tsc", "src/lib/schema.ts", "--outDir", out, "--module", "commonjs",
     "--target", "es2020", "--moduleResolution", "node", "--skipLibCheck", "--esModuleInterop",
     "--rootDir", "src/lib"],
    { stdio: "inherit" }
  );
  const { ALL_MODULES, recordHeaders } = await import(pathToFileURL(join(out, "schema.js")).href);
  const body = ALL_MODULES.map((m) => {
    const cols = recordHeaders(m).map((h) => `    ${JSON.stringify(h)}`).join(",\n");
    return `  ${JSON.stringify(m.id)}: [\n${cols}\n  ]`;
  }).join(",\n");
  const block = `var PANEX_HEADERS = {\n${body}\n};`;

  const gsPath = "PANEX_Initialize.gs";
  const gs = readFileSync(gsPath, "utf8");
  const re = /var PANEX_HEADERS = \{[\s\S]*?\n\};/;
  if (!re.test(gs)) throw new Error("หาบล็อก PANEX_HEADERS ในไฟล์ .gs ไม่เจอ");
  writeFileSync(gsPath, gs.replace(re, block), "utf8");
  console.log("อัปเดต PANEX_HEADERS ใน " + gsPath + " แล้ว (" + ALL_MODULES.length + " ชีท)");
} finally {
  rmSync(out, { recursive: true, force: true });
}
