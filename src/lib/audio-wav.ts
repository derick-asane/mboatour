/// Turns whatever the browser recorded into the one format the transcription
/// endpoint is known to accept: 16 kHz mono PCM in a WAV container.
///
/// MediaRecorder gives a different codec on every browser — webm/opus here,
/// mp4/aac there — and rather than hope the model takes each of them, the
/// browser decodes its own recording and we re-encode it ourselves. The
/// decoding and resampling are done by the Web Audio API, so there is no codec
/// work in here and nothing deprecated.

/// What the model is billed on, and plenty for speech.
export const TARGET_SAMPLE_RATE = 16000;

/// A question is a sentence, not a monologue; this also caps the upload.
export const MAX_RECORDING_SECONDS = 60;

function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  const writeText = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) {
      view.setUint8(offset + i, text.charCodeAt(i));
    }
  };

  writeText(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeText(8, "WAVE");
  writeText(12, "fmt ");
  view.setUint32(16, 16, true);
  // 1 is uncompressed PCM, one channel.
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeText(36, "data");
  view.setUint32(40, samples.length * 2, true);

  // Float -1…1 to signed 16-bit, clamped so a loud moment does not wrap round
  // into noise.
  let offset = 44;
  for (const sample of samples) {
    const clamped = Math.max(-1, Math.min(1, sample));
    view.setInt16(offset, clamped * 0x7fff, true);
    offset += 2;
  }

  return new Blob([buffer], { type: "audio/wav" });
}

/// Decodes a recording, mixes it to one channel at the target rate, and returns
/// it as a WAV file ready to upload. Null when there is nothing usable in it.
export async function recordingToWav(blob: Blob): Promise<File | null> {
  if (blob.size === 0) return null;

  const bytes = await blob.arrayBuffer();

  // Decoding needs a context, but not one tied to any particular rate.
  const decoder = new AudioContext();

  let decoded: AudioBuffer;

  try {
    decoded = await decoder.decodeAudioData(bytes);
  } catch {
    return null;
  } finally {
    void decoder.close();
  }

  const seconds = Math.min(decoded.duration, MAX_RECORDING_SECONDS);

  if (seconds < 0.3) return null;

  // One channel at the target rate: the offline context does the mixing and
  // the resampling in one pass.
  const frames = Math.ceil(seconds * TARGET_SAMPLE_RATE);
  const offline = new OfflineAudioContext(1, frames, TARGET_SAMPLE_RATE);
  const source = offline.createBufferSource();

  source.buffer = decoded;
  source.connect(offline.destination);
  source.start(0, 0, seconds);

  const rendered = await offline.startRendering();

  return new File([encodeWav(rendered.getChannelData(0), TARGET_SAMPLE_RATE)], "question.wav", {
    type: "audio/wav",
  });
}

/// Whether this browser can record at all, so the button is only offered where
/// it would work.
export function canRecord(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.MediaRecorder !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  );
}
