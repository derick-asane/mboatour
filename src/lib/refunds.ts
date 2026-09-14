/// When a cancelled booking gets its money back.
///
/// The rule lives here alone so it can be changed in one place: a stricter
/// policy (a day's notice, a partial refund, a fee) is a business decision, not
/// something to scatter through the actions that call it.

export type CancelledBy = "VISITOR" | "ORGANISER";

export function isRefundable(
  event: { startsAt: Date },
  cancelledBy: CancelledBy,
  now: Date = new Date(),
): boolean {
  // An organiser calling off an event always refunds: the visitor did nothing
  // wrong and should not be out of pocket.
  if (cancelledBy === "ORGANISER") return true;

  // A visitor gets their money back while the event is still ahead of them.
  return event.startsAt.getTime() > now.getTime();
}
