import assert from "node:assert/strict";
import { chaveMesFromIso, isMesFuturo, toIsoSafe } from "./utils.js";

// node-pg devolve Date para TIMESTAMP/DATE — não pode quebrar com .slice
const mesDate = new Date("2026-08-01T00:00:00.000Z");
assert.equal(chaveMesFromIso(mesDate), "2026-08");
assert.equal(chaveMesFromIso("2026-08-01T12:00:00.000Z"), "2026-08");
assert.equal(chaveMesFromIso("2026-08-01"), "2026-08");

assert.equal(isMesFuturo(mesDate, new Date("2026-08-15")), false);
assert.equal(isMesFuturo("2026-09-01", new Date("2026-08-15")), true);

assert.equal(toIsoSafe(mesDate), "2026-08-01T00:00:00.000Z");
assert.equal(toIsoSafe(null), null);

console.log("utils.mes.test.ts OK");
