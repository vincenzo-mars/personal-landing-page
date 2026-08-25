"use client";

import type { MicStatus } from "../_hooks/useMicLevel";

const LABELS: Record<MicStatus, string> = {
  idle: "Sing to feed the black hole",
  requesting: "Waiting for the microphone…",
  active: "Listening — sing, and the light grows",
  denied: "Microphone denied. Move the pointer instead",
  unsupported: "No microphone here. Move the pointer instead",
};

type Props = {
  status: MicStatus;
  onRequest: () => void;
};

export function MicToggle({ status, onRequest }: Props) {
  const interactive = status === "idle";

  return (
    <div className="fixed inset-x-0 bottom-8 flex justify-center px-6">
      <button
        type="button"
        onClick={onRequest}
        disabled={!interactive}
        aria-live="polite"
        className="rounded-full border border-white/15 bg-white/5 px-5 py-2 text-xs tracking-widest text-slate-300 uppercase backdrop-blur-sm transition hover:border-white/35 hover:text-white disabled:cursor-default disabled:opacity-70"
      >
        {LABELS[status]}
      </button>
    </div>
  );
}
