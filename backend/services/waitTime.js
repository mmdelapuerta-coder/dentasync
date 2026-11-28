"use strict";

/**
 * Estimate waiting time from queue position and known procedure durations.
 * Matches queue_slot_v1: remaining recorded chair time plus a fixed slot
 * per waiting patient ahead. This is a deterministic clinic heuristic.
 */

const { estimateWaitForQueueContext, getPredictionSettings } = require("./queueWaitPrediction");

const DEFAULT_MINUTES = 45;

async function getServiceDurationMinutes(db, serviceId, serviceName) {
  const settings = getPredictionSettings();
  try {
    if (serviceId) {
      const byId = await db.query(
        `SELECT default_duration_minutes
         FROM clinic_service_durations
         WHERE service_id = $1
         LIMIT 1`,
        [String(serviceId)]
      );
      if (byId.rows[0]?.default_duration_minutes) {
        return Number(byId.rows[0].default_duration_minutes);
      }
    }

    if (serviceName) {
      const byName = await db.query(
        `SELECT default_duration_minutes
         FROM clinic_service_durations
         WHERE LOWER(service_name) = LOWER($1)
         LIMIT 1`,
        [String(serviceName)]
      );
      if (byName.rows[0]?.default_duration_minutes) {
        return Number(byName.rows[0].default_duration_minutes);
      }
    }
  } catch (error) {
    if (error?.code !== "42P01") {
      console.warn("Wait-time duration lookup failed:", error.message);
    }
  }

  return settings.fallbackMinutes || DEFAULT_MINUTES;
}

async function estimateWaitMinutesForPosition(db, {
  position,
  aheadEntries = [],
  now = new Date(),
} = {}) {
  const estimate = await estimateWaitForQueueContext(db, {
    entry: { status: "waiting", position: Math.max(1, Number(position) || 1) },
    aheadEntries,
    now,
  });
  if (estimate.unavailable) return null;
  if (estimate.treatmentOverrun || !estimate.estimatedWaitMinutes) {
    return estimate.treatmentOverrun ? 0 : null;
  }
  return Math.max(0, Number(estimate.estimatedWaitMinutes.min) || 0);
}

module.exports = {
  DEFAULT_MINUTES,
  getServiceDurationMinutes,
  estimateWaitMinutesForPosition,
};
