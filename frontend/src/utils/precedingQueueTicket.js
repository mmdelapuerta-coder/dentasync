const INACTIVE_STATUSES = new Set(["completed", "cancelled", "no_show", "skipped", "needs_review"]);
const SERVING_STATUSES = new Set(["dentist", "in_chair", "in_treatment"]);
const WAITING_STATUSES = new Set(["checked_in", "waiting", "preparing", "called"]);

export function dentistLane(entry) {
  const dentist = String(entry?.dentist_id || entry?.dentistId || "").trim() || "__unassigned__";
  const branch = String(entry?.branch_id ?? entry?.branchId ?? "").trim();
  return branch ? `${branch}::${dentist}` : dentist;
}

function statusOf(entry) {
  return String(entry?.status || "").toLowerCase();
}

function isActiveStatus(status) {
  return SERVING_STATUSES.has(status) || WAITING_STATUSES.has(status);
}

function sameTicket(left, right) {
  if (!left || !right) return false;
  if (left.id != null && right.id != null && String(left.id) === String(right.id)) return true;
  const leftToken = String(left.token || left.queueNumber || "").trim();
  const rightToken = String(right.token || right.queueNumber || "").trim();
  return Boolean(leftToken) && leftToken === rightToken;
}

function compareActiveOrder(a, b) {
  const rank = (entry) => {
    const status = statusOf(entry);
    if (SERVING_STATUSES.has(status)) return 0;
    if (WAITING_STATUSES.has(status)) return 1;
    return 2;
  };
  const rankDiff = rank(a) - rank(b);
  if (rankDiff !== 0) return rankDiff;
  return (Number(a.position) || 0) - (Number(b.position) || 0);
}

function resolveCurrent(entries, current) {
  if (current && (current.token || current.queueNumber || current.id != null)) return current;
  return (Array.isArray(entries) ? entries : []).find((entry) => entry?.isCurrentPatient) || null;
}

export function dashboardPrecedingTicket(entries, current) {
  const self = resolveCurrent(entries, current);
  if (!self) {
    return { state: "empty", ticket: null };
  }

  if (SERVING_STATUSES.has(statusOf(self))) {
    return { state: "in_progress", ticket: null };
  }

  const lane = dentistLane(self);
  const ordered = (Array.isArray(entries) ? entries : [])
    .filter((entry) => {
      const status = statusOf(entry);
      if (INACTIVE_STATUSES.has(status) || !isActiveStatus(status)) return false;
      return dentistLane(entry) === lane;
    })
    .slice()
    .sort(compareActiveOrder);

  const selfIndex = ordered.findIndex((entry) => sameTicket(entry, self));
  if (selfIndex <= 0) {
    return { state: "next", ticket: null };
  }

  return { state: "ahead", ticket: ordered[selfIndex - 1] };
}
