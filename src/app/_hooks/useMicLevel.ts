"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type MicStatus = "idle" | "requesting" | "active" | "denied" | "unsupported";

/** Below this many dB we call it silence, above it we call it full voice. */
const FLOOR_DB = -62;
const CEILING_DB = -18;

export function useMicLevel() {
  const [status, setStatus] = useState<MicStatus>("idle");
  const analyser = useRef<AnalyserNode | null>(null);
  const samples = useRef<Float32Array<ArrayBuffer> | null>(null);
  const teardown = useRef<(() => void) | null>(null);

  useEffect(() => () => teardown.current?.(), []);

  const request = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof AudioContext === "undefined") {
      setStatus("unsupported");
      return;
    }

    setStatus("requesting");

    try {
      // The three processing flags must stay off: automatic gain control would
      // level the signal out and the loudness would stop tracking the voice.
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });

      // Created inside the user gesture, otherwise autoplay policy suspends it.
      const context = new AudioContext();
      await context.resume();

      const source = context.createMediaStreamSource(stream);
      const node = context.createAnalyser();
      node.fftSize = 1024;
      node.smoothingTimeConstant = 0.6;
      source.connect(node);

      analyser.current = node;
      samples.current = new Float32Array(node.fftSize);

      teardown.current = () => {
        analyser.current = null;
        samples.current = null;
        stream.getTracks().forEach((track) => track.stop());
        void context.close();
      };

      setStatus("active");
    } catch (error) {
      setStatus(error instanceof DOMException && error.name === "NotAllowedError" ? "denied" : "unsupported");
    }
  }, []);

  /** Reads the current loudness, 0..1. Called from the scene's own frame loop. */
  const sample = useCallback(() => {
    const node = analyser.current;
    const buffer = samples.current;
    if (!node || !buffer) return 0;

    node.getFloatTimeDomainData(buffer);

    let sum = 0;
    for (let i = 0; i < buffer.length; i++) sum += buffer[i] * buffer[i];
    const rms = Math.sqrt(sum / buffer.length);

    const db = 20 * Math.log10(rms + 1e-7);
    return Math.min(1, Math.max(0, (db - FLOOR_DB) / (CEILING_DB - FLOOR_DB)));
  }, []);

  return { status, request, sample };
}
