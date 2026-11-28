import assert from "node:assert/strict";
import test from "node:test";
import { dashboardPrecedingTicket } from "./precedingQueueTicket.js";

function ticket(token, extras = {}) {
  return {
    token,
    queueNumber: token,
    status: "waiting",
    position: Number(String(token).replace(/\D/g, "")) || 0,
    dentistId: "d1",
    branchId: 1,
    ...extras,
  };
}

test("first in the dentist lane is next in line", () => {
  const current = ticket("A-001", { position: 1, isCurrentPatient: true });
  const result = dashboardPrecedingTicket(
    [current, ticket("A-002", { position: 2 }), ticket("A-003", { position: 3 })],
    current
  );
  assert.equal(result.state, "next");
  assert.equal(result.ticket, null);
});

test("middle ticket sees only the immediately preceding active ticket", () => {
  const current = ticket("A-002", { position: 2, isCurrentPatient: true });
  const result = dashboardPrecedingTicket(
    [ticket("A-001", { position: 1, status: "dentist" }), current, ticket("A-003", { position: 3 })],
    current
  );
  assert.equal(result.state, "ahead");
  assert.equal(result.ticket.token, "A-001");
});

test("last ticket sees the ticket immediately ahead, not the first", () => {
  const current = ticket("A-003", { position: 3, isCurrentPatient: true });
  const result = dashboardPrecedingTicket(
    [ticket("A-001", { position: 1, status: "dentist" }), ticket("A-002", { position: 2 }), current],
    current
  );
  assert.equal(result.state, "ahead");
  assert.equal(result.ticket.token, "A-002");
});

test("signed-in patient in treatment sees in-progress, not a preceding ticket", () => {
  for (const status of ["dentist", "in_chair", "in_treatment"]) {
    const current = ticket("A-002", { position: 2, status, isCurrentPatient: true });
    const result = dashboardPrecedingTicket(
      [ticket("A-001", { position: 1, status: "waiting" }), current],
      current
    );
    assert.equal(result.state, "in_progress", status);
    assert.equal(result.ticket, null, status);
  }
});

test("inactive tickets are excluded from preceding order", () => {
  const current = ticket("A-004", { position: 4, isCurrentPatient: true });
  const result = dashboardPrecedingTicket(
    [
      ticket("A-001", { position: 1, status: "completed" }),
      ticket("A-002", { position: 2, status: "cancelled" }),
      ticket("A-skip", { position: 2.5, status: "skipped" }),
      ticket("A-ns", { position: 2.6, status: "no_show" }),
      ticket("A-rev", { position: 2.7, status: "needs_review" }),
      ticket("A-003", { position: 3, status: "waiting" }),
      current,
    ],
    current
  );
  assert.equal(result.state, "ahead");
  assert.equal(result.ticket.token, "A-003");
});

test("ticket numbers are not subtracted; serving then waiting then position", () => {
  const current = ticket("A-001", { position: 20, isCurrentPatient: true });
  const result = dashboardPrecedingTicket(
    [
      current,
      ticket("A-010", { position: 1, status: "dentist" }),
      ticket("A-002", { position: 2, dentistId: "d2" }),
      ticket("B-001", { position: 3, branchId: 2 }),
    ],
    current
  );
  assert.equal(result.state, "ahead");
  assert.equal(result.ticket.token, "A-010");
});
