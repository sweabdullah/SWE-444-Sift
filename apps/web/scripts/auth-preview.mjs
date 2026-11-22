// Local-only preview: fresh in-memory PostgreSQL, repository migrations, disposable accounts.
import { randomBytes } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { hash } from "bcryptjs";
import { prisma } from "@sift/db";

if (process.env.NODE_ENV === "production")
  throw new Error("The disposable auth preview cannot run in production");
const webDir = fileURLToPath(new URL("../", import.meta.url));
const repoDir = fileURLToPath(new URL("../../../", import.meta.url));
const dbDir = join(repoDir, "packages", "db");
const require = createRequire(import.meta.url);
const dbRequire = createRequire(join(dbDir, "package.json"));
const databaseURL =
  "postgresql://postgres:postgres@127.0.0.1:55442/sift_auth_spike_test?schema=public&connection_limit=1&pgbouncer=true";
// Always override these with LOCAL values; never use a caller's database URL or auth secret.
const env = {
  ...process.env,
  NODE_ENV: "development",
  DATABASE_URL: databaseURL,
  AUTH_SECRET: randomBytes(32).toString("base64url"),
  AUTH_TRUST_HOST: "true",
  NEXT_TELEMETRY_DISABLED: "1",
  SIFT_AUTH_TEST_DATABASE_URL: databaseURL,
  SIFT_AUTH_E2E_URL: "http://127.0.0.1:3144",
};
process.env.DATABASE_URL = databaseURL;
const db = await PGlite.create();
const socket = new PGLiteSocketServer({ db, host: "127.0.0.1", port: 55442, maxConnections: 20 });
let app;
let stopping = false;
async function stop(code) {
  if (stopping) return;
  stopping = true;
  app?.kill();
  await prisma.$disconnect();
  await socket.stop();
  await db.close();
  process.exitCode = code;
}
process.once("SIGINT", () => {
  void stop(0);
});
process.once("SIGTERM", () => {
  void stop(0);
});
function runNode(script, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...args], {
      cwd,
      env,
      stdio: "inherit",
      windowsHide: true,
    });
    child.once("error", reject);
    child.once("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`Preview setup exited with ${code}`)),
    );
  });
}
try {
  const migrationDir = join(dbDir, "prisma", "migrations");
  const migrations = (await readdir(migrationDir, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  for (const migration of migrations)
    await db.exec(await readFile(join(migrationDir, migration, "migration.sql"), "utf8"));
  await socket.start();
  await runNode(dbRequire.resolve("tsx/cli"), [join(dbDir, "prisma", "seed-catalogue.ts")], dbDir);
  const passwordHash = await hash("sift-dev-password", 12);
  await prisma.user.createMany({
    data: [
      { email: "user@sift.local", passwordHash, role: "user", locale: "ar" },
      { email: "admin@sift.local", passwordHash, role: "admin", locale: "en" },
    ],
  });
  await prisma.$disconnect();
  console.log("Disposable auth preview: http://127.0.0.1:3144/en/register (also /ar/register)");
  console.log(
    "Local fixtures only: user@sift.local / admin@sift.local; password: sift-dev-password",
  );
  console.log("Test database URL (not a production database): " + databaseURL);
  console.log("Data and the generated secret disappear on shutdown. Stop with Ctrl+C.");
  app = spawn(
    process.execPath,
    [require.resolve("next/dist/bin/next"), "dev", "--hostname", "127.0.0.1", "--port", "3144"],
    { cwd: webDir, env, stdio: "inherit", windowsHide: true },
  );
  const code = await new Promise((resolve, reject) => {
    app.once("error", reject);
    app.once("exit", resolve);
  });
  await stop(typeof code === "number" ? code : 0);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Preview setup failed");
  await stop(1);
}
