import { listMessages, loadChatAccess } from "@/server/chat";

/// What the chat polls. It re-checks access on every call: a cancelled booking
/// must stop returning messages straight away, not at the next page load.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  const access = await loadChatAccess(eventId);

  if (!access) {
    return Response.json({ error: "forbidden" }, { status: 404 });
  }

  const messages = await listMessages(eventId);

  return Response.json(
    {
      messages,
      canPost: access.canPost,
      closed: access.closed,
      muted: access.muted,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
