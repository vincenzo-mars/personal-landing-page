"use client";

import { useEffect, useRef } from "react";
import { Mesh, Program, Renderer, Texture, Triangle } from "ogl";

import { usePointer } from "../_hooks/usePointer";
import { useMicLevel } from "../_hooks/useMicLevel";
import { fragment, vertex } from "./shaders/blackhole";
import { drawTextTexture } from "./textTexture";
import { MicToggle } from "./MicToggle";

/** The black hole stands in for the cursor, so it may only lag by a hair. */
const POINTER_TAU = 0.045;
/** CSS pixels per art pixel: the size of one square star. */
const ART_PIXEL = 3;
/** Art pixels per second the cosmos slides by on its own. */
const BASE_DRIFT = 16;
/** How hard pointer speed pushes that drift along: barely, by design. */
const DRIFT_GAIN = 25;
/** Seconds for the pushed drift to settle back down. */
const DRIFT_TAU = 0.3;
/** Loudness rises fast and falls slow, so the light breathes instead of flickering. */
const MASS_ATTACK_TAU = 0.08;
const MASS_RELEASE_TAU = 0.5;

export function CosmicScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const pointer = usePointer();
  const { status, request, sample } = useMicLevel();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const root = document.documentElement;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    let renderer: Renderer;
    try {
      // ogl creates its own canvas: reusing one across remounts would hand us
      // back a context we lost on the previous cleanup.
      renderer = new Renderer({
        alpha: false,
        antialias: false,
        dpr: Math.min(window.devicePixelRatio || 1, 2),
      });
    } catch {
      // No WebGL: the stylesheet takes over and shows the page unlit but plain.
      root.classList.add("no-webgl");
      return;
    }

    const gl = renderer.gl;
    gl.canvas.className = "block h-full w-full";
    container.appendChild(gl.canvas);

    // The headings are painted into their own canvas and handed to the shader
    // as a texture, so the lens bends them exactly like the starfield.
    const textCanvas = document.createElement("canvas");
    const textTexture = new Texture(gl, {
      image: textCanvas,
      generateMipmaps: false,
      minFilter: gl.NEAREST,
      magFilter: gl.NEAREST,
      flipY: false,
    });

    const fontFamily =
      getComputedStyle(document.documentElement).getPropertyValue("--font-silkscreen").trim() ||
      "monospace";

    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: [1, 1] },
        uPointer: { value: [0.5, 0.5] },
        uMass: { value: 0 },
        uReduced: { value: reducedMotion.matches ? 1 : 0 },
        uPixel: { value: ART_PIXEL },
        uDrift: { value: 0 },
        uText: { value: textTexture },
        uReveal: { value: 1 },
      },
    });
    const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });

    const resize = () => {
      const { innerWidth: width, innerHeight: height } = window;
      renderer.setSize(width, height);
      program.uniforms.uResolution.value = [gl.drawingBufferWidth, gl.drawingBufferHeight];
      // The grid is defined in CSS pixels, so it looks the same on every screen.
      const pixel = ART_PIXEL * renderer.dpr;
      program.uniforms.uPixel.value = pixel;

      drawTextTexture(textCanvas, gl.drawingBufferWidth / pixel, gl.drawingBufferHeight / pixel, fontFamily);
      textTexture.needsUpdate = true;
    };
    resize();

    // Silkscreen may not be ready on first paint: redraw once it is.
    void document.fonts?.ready.then(resize);

    const onReducedChange = (event: MediaQueryListEvent) => {
      program.uniforms.uReduced.value = event.matches ? 1 : 0;
    };
    reducedMotion.addEventListener("change", onReducedChange);
    window.addEventListener("resize", resize);

    // Smoothed values live outside React: they change every frame.
    let smoothX = 0.5;
    let smoothY = 0.5;
    let mass = 0;
    let drift = 0;
    let lateral = 0;
    let previousX = 0.5;
    let elapsed = 0;
    let last = performance.now();
    let frame = 0;

    const render = (now: number) => {
      frame = requestAnimationFrame(render);

      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      elapsed += dt;

      // Idle: the singularity hovers near the middle and drifts, so the page is
      // never completely still for someone who has not touched anything yet.
      const idle = !pointer.current.engaged;
      const targetX = idle ? 0.5 + Math.sin(elapsed * 0.31) * 0.02 : pointer.current.x;
      const targetY = idle ? 0.5 + Math.cos(elapsed * 0.23) * 0.015 : pointer.current.y;

      const follow = 1 - Math.exp(-dt / POINTER_TAU);
      smoothX += (targetX - smoothX) * follow;
      smoothY += (targetY - smoothY) * follow;

      // Sideways travel is integrated, never derived from the clock: changing
      // speed has to bend the motion, not teleport the sky.
      const swipe = (pointer.current.x - previousX) / Math.max(dt, 1e-3);
      previousX = pointer.current.x;
      lateral += (swipe - lateral) * (1 - Math.exp(-dt / DRIFT_TAU));
      if (!reducedMotion.matches) {
        drift += (BASE_DRIFT + lateral * DRIFT_GAIN) * dt;
      }

      const loudness = sample();
      const tau = loudness > mass ? MASS_ATTACK_TAU : MASS_RELEASE_TAU;
      mass += (loudness - mass) * (1 - Math.exp(-dt / tau));

      program.uniforms.uTime.value = elapsed;
      program.uniforms.uPointer.value = [smoothX, 1 - smoothY];
      program.uniforms.uMass.value = mass;
      program.uniforms.uDrift.value = drift;

      // The reveal radius rides the same mass, in art pixels for the shader.
      const shortest = Math.min(gl.drawingBufferWidth, gl.drawingBufferHeight) / (ART_PIXEL * renderer.dpr);
      program.uniforms.uReveal.value = shortest * (0.42 + mass * 0.5);

      renderer.render({ scene: mesh });
    };

    frame = requestAnimationFrame(render);

    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(frame);
      } else {
        last = performance.now();
        frame = requestAnimationFrame(render);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    root.classList.add("webgl");

    return () => {
      root.classList.remove("webgl");
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("resize", resize);
      reducedMotion.removeEventListener("change", onReducedChange);
      gl.canvas.remove();
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [pointer, sample]);

  return (
    <>
      <div ref={containerRef} aria-hidden className="fixed inset-0" />
      <MicToggle status={status} onRequest={request} />
    </>
  );
}
