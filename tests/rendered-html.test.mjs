import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

test("emits the hosted worker and resource manifest", async () => {
  await access(`${root}/dist/server/index.js`);
  const manifest = JSON.parse(
    await readFile(`${root}/dist/.openai/hosting.json`, "utf8"),
  );

  assert.equal(manifest.d1, "DB");
  assert.equal(manifest.r2, "BUCKET");
  assert.ok(manifest.project_id);
});

test("packages database migrations and the company logo", async () => {
  await Promise.all([
    access(`${root}/dist/.openai/drizzle/0000_sloppy_hitman.sql`),
    access(`${root}/dist/.openai/drizzle/0001_cloudy_barracuda.sql`),
    access(`${root}/dist/client/joshuas-remodeling-logo.png`),
  ]);
});
