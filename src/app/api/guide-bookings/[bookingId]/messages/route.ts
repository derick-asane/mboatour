import { listGuideMessages, loadGuideChatAccess } from "@/server/guide-chat";

/// What the conversation polls. Access is re-checked on every call: a cancelled
/// arrangement must stop returning messages straight away.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ bookingId: string }> },
) {
  const { bookingId } = await params;
  const access = await loadGuideChatAccess(bookingId);

  if (!access) {
    return Response.json({ error: "forbidden" }, { status: 404 });
  }

  return Response.json(
    {
      messages: await listGuideMessages(bookingId),
      canPost: access.canPost,
      closed: access.closed,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
