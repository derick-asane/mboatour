"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import {
  canRecord,
  MAX_RECORDING_SECONDS,
  recordingToWav,
} from "@/lib/audio-wav";

type Phase = "idle" | "recording" | "preparing";

/// Hold a question out loud instead of typing it. The recording is converted
/// here and handed to the form, which submits it like any other field.
export function VoiceButton({
  onRecorded,
  disabled,
}: {
  onRecorded: (file: File) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("Assistant");
  const available = useSyncExternalStore(
    () => () => {},
    canRecord,
    () => false,
  );
  const [phase, setPhase] = useState<Phase>("idle");
  const [seconds, setSeconds] = useState(0);
  const [problem, setProblem] = useState<string | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  // A plain counter, so somebody can see it is listening and how long for.
  useEffect(() => {
    if (phase !== "recording") return;

    const clock = setInterval(() => setSeconds((value) => value + 1), 1000);

    return () => clearInterval(clock);
  }, [phase]);

  // Nobody asks a question for a minute, and the upload has to stay sane.
  useEffect(() => {
    if (phase === "recording" && seconds >= MAX_RECORDING_SECONDS) stop();
  }, [phase, seconds]);

  // Letting go of the microphone matters: the browser shows a recording
  // indicator until every track is stopped.
  function release() {
    for (const track of recorder.current?.stream.getTracks() ?? []) {
      track.stop();
    }
    recorder.current = null;
  }

  useEffect(() => () => release(), []);

  async function start() {
    setProblem(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const media = new MediaRecorder(stream);

      chunks.current = [];
      media.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.current.push(event.data);
      };

      media.onstop = async () => {
        setPhase("preparing");

        const blob = new Blob(chunks.current, {
          type: chunks.current[0]?.type ?? "audio/webm",
        });

        release();

        // Whatever the browser recorded becomes the one format the model is
        // known to accept.
        const wav = await recordingToWav(blob);

        setPhase("idle");
        setSeconds(0);

        if (!wav) {
          setProblem(t("heardNothing"));
          return;
        }

        onRecorded(wav);
      };

      recorder.current = media;
      setSeconds(0);
      setPhase("recording");
      media.start();
    } catch {
      // Declining the microphone is a choice, not a fault; say what happened
      // and leave the typing field alone.
      setProblem(t("micRefused"));
      setPhase("idle");
    }
  }

  function stop() {
    if (recorder.current?.state === "recording") recorder.current.stop();
  }

  if (!available) return null;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {phase === "recording" ? (
          <button type="button" className="btn-danger" onClick={stop}>
            {t("stopRecording", { seconds })}
          </button>
        ) : (
          <button
            type="button"
            className="btn-secondary"
            onClick={start}
            disabled={disabled || phase === "preparing"}
          >
            {phase === "preparing" ? (
              <span aria-hidden className="spinner" />
            ) : (
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.7}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
              >
                <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z" />
                <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
              </svg>
            )}
            {phase === "preparing" ? t("preparing") : t("speak")}
          </button>
        )}

        {phase === "recording" ? (
          <span className="flex items-center gap-1.5 text-xs text-danger">
            <span
              aria-hidden
              className="inline-block h-2 w-2 animate-pulse rounded-full bg-danger"
            />
            {t("listening")}
          </span>
        ) : null}
      </div>

      {problem ? <p className="hint text-danger">{problem}</p> : null}
    </div>
  );
}
