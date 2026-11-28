import assert from "node:assert/strict";
import fs from "node:fs";
import path from "path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const dashboard = fs.readFileSync(path.join(root, "pages", "DashboardPage.jsx"), "utf8");
const queue = fs.readFileSync(path.join(root, "pages", "QueuePage.jsx"), "utf8");
const live = fs.readFileSync(path.join(root, "components", "DashboardLiveQueue.jsx"), "utf8");
const board = fs.readFileSync(path.join(root, "components", "PatientQueueBoard.jsx"), "utf8");
const css = fs.readFileSync(path.join(root, "index.css"), "utf8");

test("Dashboard uses DashboardLiveQueue instead of the full PatientQueueBoard", () => {
  assert.match(dashboard, /DashboardLiveQueue/);
  assert.match(dashboard, /12000/);
  assert.match(dashboard, /PatientQueueTicket/);
  assert.doesNotMatch(dashboard, /PatientQueueBoard/);
  assert.match(live, /dashboardPrecedingTicket/);
  assert.match(live, /peopleAheadLabel/);
  assert.match(live, /You are next in line/);
  assert.match(live, /Your treatment is in progress/);
  assert.match(live, /How many people are ahead of you/);
  assert.match(live, /0 people ahead/);
  assert.match(live, /There is no one ahead of you/);
  assert.match(live, /patient-queue-board__row--ahead/);
  assert.doesNotMatch(live, /queueStatusWaitLabel/);
  assert.doesNotMatch(live, /entry\.name/);
  assert.doesNotMatch(live, /patientName/);
  assert.match(css, /\.patient-queue-board__row--ahead \{[\s\S]*grid-template-columns: minmax\(0,\s*1fr\) auto;/);
  assert.match(css, /\.patient-queue-board__ahead-count/);
});

test("QueuePage still uses PatientQueueBoard with the full list", () => {
  assert.match(queue, /PatientQueueBoard/);
  assert.match(queue, /entries=\{queueData\.queue \|\| \[\]\}/);
  assert.doesNotMatch(queue, /DashboardLiveQueue/);
  assert.match(board, /Your ticket/);
});
