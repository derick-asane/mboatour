/// An event is worth showing and bookable until it *ends*, not until it
/// starts. A three-day hike that began this morning is still open; filtering on
/// the start time would make it vanish from the site the moment it got going.

/// Prisma `where` fragment for events that have not finished yet. Events with
/// no end time are treated as finishing when they start.
export function openEventWhere(now: Date = new Date()) {
  return {
    OR: [{ endsAt: { gte: now } }, { endsAt: null, startsAt: { gte: now } }],
  };
}

export function hasEnded(
  event: { startsAt: Date; endsAt: Date | null },
  now: Date = new Date(),
): boolean {
  return (event.endsAt ?? event.startsAt).getTime() < now.getTime();
}

/// Started, but not finished.
export function isRunning(
  event: { startsAt: Date; endsAt: Date | null },
  now: Date = new Date(),
): boolean {
  return event.startsAt.getTime() <= now.getTime() && !hasEnded(event, now);
}
