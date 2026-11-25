// Native Timeline Intelligence Engine for FaultLine.
// Deterministically parses, normalizes, sorts, and audits event timestamps across exhibits without external AI.
// Incorporates temporal precision analysis: distinguishes benign human recall variance (e.g. ±15 min)
// from material deliberate discrepancies.

import { EXHIBIT_IDS } from '../../../shared/constants.js';

/**
 * Normalizes time string to minutes from midnight (0 - 1439).
 */
export function parseTimeToMinutes(timeStr) {
  if (!timeStr) return null;
  const clean = timeStr.trim().toLowerCase();

  // Match hh:mm(:ss)? am/pm
  const match12 = clean.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)$/);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = parseInt(match12[2], 10);
    const meridian = match12[3];
    if (meridian === 'pm' && hours < 12) hours += 12;
    if (meridian === 'am' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }

  // Match hh am/pm
  const matchHh12 = clean.match(/^(\d{1,2})\s*(am|pm)$/);
  if (matchHh12) {
    let hours = parseInt(matchHh12[1], 10);
    const meridian = matchHh12[2];
    if (meridian === 'pm' && hours < 12) hours += 12;
    if (meridian === 'am' && hours === 12) hours = 0;
    return hours * 60;
  }

  // Match 24h hh:mm(:ss)?
  const match24 = clean.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (match24) {
    const hours = parseInt(match24[1], 10);
    const minutes = parseInt(match24[2], 10);
    return hours * 60 + minutes;
  }

  return null;
}

/**
 * Checks whether text contains approximation indicators.
 */
export function hasApproximationMarker(text) {
  return /\b(around|about|approx(imately)?|roughly|circa|near(ly)?|~)\b/i.test(text || '');
}

export function constructNativeTimeline(exhibits = []) {
  const events = [];
  const conflictingTimestamps = [];
  const timelineGaps = [];

  const timeRegex = /\b(\d{1,2}:\d{2}(?::\d{2})?\s*(?:am|pm)?|\d{1,2}\s*(?:am|pm))\b/gi;
  const dateRegex = /\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})\b/gi;
  const speedDecelRegex = /\b(\d{1,3}\s*mph|\d{1,3}\s*km\/h|-?\d+\.?\d*\s*m\/s²|-?\d+\.?\d*\s*g)\b/gi;

  exhibits.forEach((exhibit, index) => {
    const exhibitId = EXHIBIT_IDS[index] || `X${index + 1}`;
    const text = String(exhibit.text || '');
    const label = exhibit.label || `Exhibit ${exhibitId}`;
    const kind = exhibit.kind || 'statement';

    // Paragraph/sentence-level event extraction
    const sentences = text.split(/(?<=[.?!])\s+/);
    sentences.forEach((sentence, sIdx) => {
      const sTimes = [...sentence.matchAll(timeRegex)];
      const sDates = [...sentence.matchAll(dateRegex)];
      const sSpeeds = [...sentence.matchAll(speedDecelRegex)];

      if (sTimes.length > 0 || sDates.length > 0 || /collision|impact|braked|stopped|hit|crashed|arrived|recovered/i.test(sentence)) {
        const timeStr = sTimes[0]?.[0] || null;
        const dateStr = sDates[0]?.[0] || null;
        const speedStr = sSpeeds[0]?.[0] || null;
        const isApprox = hasApproximationMarker(sentence);

        let classification = 'EXTRACTED';
        if (kind === 'telematics' || kind === 'cctv') {
          classification = 'VERIFIED';
        } else if (!timeStr && !dateStr) {
          classification = 'ESTIMATED';
        }

        // Summary label for event
        let eventType = 'OBSERVATION';
        if (/collision|impact|hit|crash/i.test(sentence)) eventType = 'COLLISION_EVENT';
        else if (/braked|decelerat|slowed/i.test(sentence)) eventType = 'BRAKING_EVENT';
        else if (/arrived|police|ambulance/i.test(sentence)) eventType = 'POST_INCIDENT';
        else if (/towed|recovery|garage/i.test(sentence)) eventType = 'VEHICLE_RECOVERY';

        events.push({
          id: `EV-${exhibitId}-${sIdx + 1}`,
          exhibitId,
          exhibitLabel: label,
          kind,
          date: dateStr,
          time: timeStr,
          timeMinutes: parseTimeToMinutes(timeStr),
          isApproximate: isApprox,
          speed: speedStr,
          eventType,
          classification,
          snippet: sentence.trim().slice(0, 180),
        });
      }
    });
  });

  // Check for conflicting timestamps across different exhibits
  const timedEvents = events.filter((e) => e.time);
  if (timedEvents.length >= 2) {
    for (let i = 0; i < timedEvents.length; i++) {
      for (let j = i + 1; j < timedEvents.length; j++) {
        const e1 = timedEvents[i];
        const e2 = timedEvents[j];
        if (e1.exhibitId !== e2.exhibitId && e1.time && e2.time && e1.time.toLowerCase() !== e2.time.toLowerCase()) {
          const m1 = e1.timeMinutes;
          const m2 = e2.timeMinutes;
          let minuteDelta = null;
          if (m1 !== null && m2 !== null) {
            minuteDelta = Math.abs(m1 - m2);
            // Handle midnight wrap-around if needed
            if (minuteDelta > 720) minuteDelta = 1440 - minuteDelta;
          }

          const hasApprox = e1.isApproximate || e2.isApproximate;
          const isBenign = minuteDelta !== null && minuteDelta <= 15 && hasApprox;
          const isExtreme = minuteDelta !== null && minuteDelta > 60;

          let severity = 'MATERIAL';
          let classification = 'POTENTIAL CONTRADICTION';
          let varianceType = 'MATERIAL_DISCREPANCY';

          if (isBenign) {
            severity = 'MINOR';
            classification = 'BENIGN_TIME_VARIANCE';
            varianceType = 'BENIGN_VARIANCE';
          } else if (isExtreme) {
            severity = 'CRITICAL';
            classification = 'EXTREME_TIME_CONFLICT';
            varianceType = 'EXTREME_DISCREPANCY';
          }

          const description = isBenign
            ? `Discrepancy in recorded incident time: Exhibit ${e1.exhibitId} states "${e1.time}", while Exhibit ${e2.exhibitId} states "${e2.time}" (Delta: ${minuteDelta} min). Within expected approximate human memory tolerance.`
            : `Discrepancy in recorded incident time: Exhibit ${e1.exhibitId} states "${e1.time}", while Exhibit ${e2.exhibitId} states "${e2.time}"${minuteDelta !== null ? ` (Delta: ${minuteDelta} min)` : ''}.`;

          conflictingTimestamps.push({
            id: `TIME-CONFLICT-${e1.exhibitId}-${e2.exhibitId}`,
            exhibitA: e1.exhibitId,
            exhibitB: e2.exhibitId,
            timeA: e1.time,
            timeB: e2.time,
            minuteDelta,
            isApproximate: hasApprox,
            varianceClassification: varianceType,
            description,
            severity,
            classification,
            verificationStatus: e1.classification === 'VERIFIED' ? 'PARTIALLY VERIFIED VIA TELEMETRY' : 'UNVERIFIED',
          });
        }
      }
    }
  }

  // Check for gap between collision and recovery
  const collisionEvents = events.filter((e) => e.eventType === 'COLLISION_EVENT');
  const recoveryEvents = events.filter((e) => e.eventType === 'VEHICLE_RECOVERY');
  if (collisionEvents.length > 0 && recoveryEvents.length > 0) {
    timelineGaps.push({
      type: 'POST_COLLISION_CUSTODY_GAP',
      description: 'Gap identified between incident occurrence and formal vehicle recovery custody.',
      collisionRef: collisionEvents[0]?.id,
      recoveryRef: recoveryEvents[0]?.id,
      recommendedAction: 'Verify intermediate vehicle location between impact and garage check-in.',
    });
  }

  return {
    totalEvents: events.length,
    events,
    conflictingTimestamps,
    timelineGaps,
    hasTimestampConflicts: conflictingTimestamps.length > 0,
    hasMaterialTimeConflicts: conflictingTimestamps.some((c) => c.severity === 'MATERIAL' || c.severity === 'CRITICAL'),
    isComplete: events.length >= 3,
  };
}
