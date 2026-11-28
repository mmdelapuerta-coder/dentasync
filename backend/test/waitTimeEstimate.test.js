"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { estimateWaitMinutesForPosition } = require("../services/waitTime");

function stubDb() {
  return {
    async query(sql) {
      if (String(sql).includes("SAVEPOINT") || String(sql).startsWith("RELEASE") || String(sql).startsWith("ROLLBACK")) {
        return { rows: [] };
      }
      if (sql.includes("clinic_patient_treatments")) return { rows: [] };
      return { rows: [] };
    },
  };
}

test("estimateWaitMinutesForPosition uses in-service procedure duration for current patient", async () => {
  const wait = await estimateWaitMinutesForPosition(stubDb(), {
    position: 2,
    aheadEntries: [
      {
        status: "dentist",
        duration_minutes: 40,
        service_name: "Cleaning",
      },
    ],
  });

  assert.equal(wait, 40);
});

test("estimateWaitMinutesForPosition is remaining chair time plus 10-minute waiter slots", async () => {
  const wait = await estimateWaitMinutesForPosition(stubDb(), {
    position: 3,
    aheadEntries: [
      { status: "dentist", duration_minutes: 30 },
      { status: "waiting", service_name: "Filling" },
    ],
  });

  assert.equal(wait, 40);
});
