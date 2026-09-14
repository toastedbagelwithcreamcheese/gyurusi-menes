/**
 * Helyi adatbázis visszaállítása a magból: data/seed.json → data/site.json; a feltöltések (data/files), a jelentkezések
 * (data/registrations), az üzenetek (data/messages), a napi mentések (data/backups) és a karbantartás időbélyege törölve.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
fs.copyFileSync(path.join(ROOT, "data/seed.json"), path.join(ROOT, "data/site.json"));
for (const p of ["data/files", "data/registrations", "data/messages", "data/backups", "data/maintenance.json"]) fs.rmSync(path.join(ROOT, p), { recursive: true, force: true });
console.log("Helyi adatbázis visszaállítva: data/site.json ← data/seed.json; data/files, data/registrations, data/messages, data/backups kiürítve.");
