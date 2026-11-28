"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { recordQueueStatusEvent } = require("../services/queueStatusHistory");

function abortedError() {
  return Object.assign(new Error("current transaction is aborted, commands ignored until end of transaction block"), {
    code: "25P02",
  });
}

function createTxnClient({ missingEvents = false, missingCalledAt = false } = {}) {
  const commands = [];
  const calledAtUpdates = [];
  let aborted = false;
  const client = {
    release() {},
    async query(sql, params = []) {
      const text = String(sql);
      commands.push(text);
      const trimmed = text.trim();
      if (/^ROLLBACK TO SAVEPOINT/i.test(trimmed)) {
        aborted = false;
        return { rows: [] };
      }
      if (aborted) {
        throw abortedError();
      }
      if (/^SAVEPOINT /i.test(trimmed) || /^RELEASE SAVEPOINT/i.test(trimmed)) {
        return { rows: [] };
      }
      if (missingEvents && /INSERT INTO patient_portal_queue_status_events/i.test(text)) {
        aborted = true;
        throw Object.assign(new Error('relation "patient_portal_queue_status_events" does not exist'), { code: "42P01" });
      }
      if (missingCalledAt && /SET called_at/i.test(text)) {
        aborted = true;
        throw Object.assign(new Error('column "called_at" does not exist'), { code: "42703" });
      }
      if (/SET called_at/i.test(text)) {
        calledAtUpdates.push({ id: params[0], sql: text });
      }
      return { rows: [{ id: params[params.length - 1] || null, status: params[0] || null }] };
    },
  };
  return { client, commands, calledAtUpdates, isAborted: () => aborted };
}

test("recordQueueStatusEvent keeps the outer transaction usable when events and called_at are missing", async () => {
  const { client, commands, isAborted } = createTxnClient({ missingEvents: true, missingCalledAt: true });
  await recordQueueStatusEvent(client, {
    queueEntryId: "q1",
    fromStatus: "waiting",
    toStatus: "preparing",
    actorId: "d1",
    actorRole: "dentist",
  });
  assert.equal(isAborted(), false);
  const updated = await client.query(
    `UPDATE patient_portal_queue_entries
     SET status = $1,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $2
     RETURNING *`,
    ["preparing", "q1"]
  );
  assert.equal(updated.rows[0].status, "preparing");
  assert.ok(commands.some((item) => /^SAVEPOINT /i.test(item.trim())));
  assert.ok(commands.some((item) => /^ROLLBACK TO SAVEPOINT /i.test(item.trim())));
});

test("recordQueueStatusEvent stamps called_at when the column exists", async () => {
  const { client, calledAtUpdates } = createTxnClient();
  await recordQueueStatusEvent(client, {
    queueEntryId: "q2",
    fromStatus: "waiting",
    toStatus: "preparing",
  });
  assert.equal(calledAtUpdates.length, 1);
  assert.equal(calledAtUpdates[0].id, "q2");
  assert.match(calledAtUpdates[0].sql, /COALESCE\(called_at, CURRENT_TIMESTAMP\)/);
});
