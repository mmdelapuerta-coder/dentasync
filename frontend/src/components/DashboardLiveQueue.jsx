import { UsersRound } from "lucide-react";
import { displayQueueStatus } from "../utils/walkInQr";
import { formatWaitUpdatedAt } from "../utils/queueWaitEstimate";
import { dashboardPrecedingTicket } from "../utils/precedingQueueTicket";
import { LIVE_QUEUE_FOOTER } from "./PatientQueueBoard";

export function DashboardLiveQueue({
  entries = [],
  current,
  lastUpdatedAt,
}) {
  const updated = formatWaitUpdatedAt(lastUpdatedAt);
  const result = dashboardPrecedingTicket(entries, current);
  const ahead = result.state === "ahead" ? result.ticket : null;

  let emptyTitle = "No active queue ticket";
  let emptyDetail = "Check in at the clinic to see your queue number and estimated wait.";
  if (result.state === "next") {
    emptyTitle = "You are next in line.";
    emptyDetail = "";
  } else if (result.state === "in_progress") {
    emptyTitle = "Your treatment is in progress.";
    emptyDetail = "";
  }

  return (
    <section className="glass-card patient-queue-board" aria-label="Live queue">
      <header className="patient-queue-board__header">
        <div className="patient-queue-board__title">
          <span className="patient-queue-board__icon" aria-hidden="true">
            <UsersRound size={18} />
          </span>
          <div>
            <h2>Live Queue</h2>
            <p>The ticket immediately ahead of you.</p>
          </div>
        </div>
        {updated ? <p className="patient-queue-board__updated">Last updated {updated}</p> : null}
      </header>
      {ahead ? (
        <ul className="patient-queue-board__list">
          <li className="patient-queue-board__row patient-queue-board__row--ahead">
            <div className="patient-queue-board__identity">
              <strong>{ahead.token || ahead.queueNumber}</strong>
            </div>
            <span className="patient-queue-board__status">{displayQueueStatus(ahead.status)}</span>
          </li>
        </ul>
      ) : (
        <div className="patient-queue-board__empty">
          <strong>{emptyTitle}</strong>
          {emptyDetail ? <p>{emptyDetail}</p> : null}
        </div>
      )}
      <p className="patient-queue-board__footer">{LIVE_QUEUE_FOOTER}</p>
    </section>
  );
}
