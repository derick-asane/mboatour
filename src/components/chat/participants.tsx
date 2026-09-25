"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { FormMessage, SubmitButton } from "@/components/form";
import { initialActionState } from "@/server/action-state";
import { toggleMuteAction } from "@/server/actions/chat";

type Participant = {
  id: string;
  name: string;
  isTeam: boolean;
  muted: boolean;
};

function MuteButton({
  eventId,
  participant,
}: {
  eventId: string;
  participant: Participant;
}) {
  const t = useTranslations("Chat");
  const [state, formAction] = useActionState(toggleMuteAction, initialActionState);

  return (
    <form action={formAction} className="shrink-0">
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="userId" value={participant.id} />
      <SubmitButton
        className={participant.muted ? "btn-secondary btn-sm" : "btn-danger btn-sm"}
      >
        {participant.muted ? t("unmute") : t("mute")}
      </SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}

/// The guest list. Only the site team sees the mute controls.
export function Participants({
  eventId,
  participants,
  canModerate,
}: {
  eventId: string;
  participants: Participant[];
  canModerate: boolean;
}) {
  const t = useTranslations("Chat");

  return (
    <section className="card space-y-3">
      <h2 className="section-title text-base">
        {t("participants", { count: participants.length })}
      </h2>

      <ul className="space-y-2">
        {participants.map((participant) => (
          <li key={participant.id} className="flex items-center gap-2.5">
            <span className="avatar shrink-0">
              {participant.name.trim().charAt(0) || "?"}
            </span>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{participant.name}</p>
              <p className="text-xs text-muted">
                {participant.isTeam ? t("organiser") : t("attendee")}
                {participant.muted ? ` · ${t("mutedLabel")}` : ""}
              </p>
            </div>

            {canModerate && !participant.isTeam ? (
              <MuteButton eventId={eventId} participant={participant} />
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
