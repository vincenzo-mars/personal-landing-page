export const vertex = /* glsl */ `
attribute vec2 position;
attribute vec2 uv;

varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

/**
 * Everything is computed in "art pixels": the screen is quantised to a coarse
 * grid first, so stars are square blocks and the horizon has a hard, stepped
 * edge instead of an antialiased curve.
 */
export const fragment = /* glsl */ `
precision highp float;

uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uPointer;   // 0..1, y already flipped to GL space
uniform float uMass;     // 0..1, driven by the microphone
uniform float uReduced;  // 1.0 when the visitor asked for reduced motion
uniform float uPixel;    // device pixels per art pixel
uniform float uDrift;    // accumulated sideways travel, in art pixels
uniform float uPulse;    // 0..1, spikes on click and decays back down
uniform sampler2D uText; // the headings, painted at art-pixel resolution
uniform float uReveal;   // radius of the lit area around the singularity

varying vec2 vUv;

const vec3 TEXT_DIM = vec3(0.722, 0.416, 0.125);
const vec3 TEXT_LIT = vec3(1.000, 0.616, 0.239);

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

/**
 * One parallax layer. The field is a grid of cells; a cell either holds a star
 * or it does not, and a star is a 1, 2 or 3 pixel square, never a soft dot.
 */
vec3 starLayer(vec2 p, float cell, float seed, float density) {
  vec2 id = floor(p / cell);
  vec2 local = p - id * cell;

  float h1 = hash21(id + seed);
  float h2 = hash21(id + seed + 31.7);
  float h3 = hash21(id + seed + 77.3);

  float present = step(1.0 - density, h1);
  // Most stars are a single pixel; a few are 2x2, very few 3x3.
  float size = 1.0 + step(0.86, h2) + step(0.972, h3);

  vec2 pos = floor(vec2(h2, h3) * (cell - size));
  vec2 d = local - pos;
  float inside =
    step(0.0, d.x) * step(d.x, size - 1.0) *
    step(0.0, d.y) * step(d.y, size - 1.0);

  // Twinkle in steps, not as a smooth fade: it has to read as pixel art.
  float beat = floor(uTime * 1.7 + h1 * 17.0);
  float flicker = mix(1.0, 0.55 + 0.45 * step(0.42, hash21(vec2(beat, h1 * 91.0))), 1.0 - uReduced);

  float brightness = (0.35 + 0.65 * pow(h3, 1.6)) * flicker;

  // A handful of stars run cold or warm so the field is not flatly white.
  vec3 tint = vec3(1.0);
  tint = mix(tint, vec3(0.62, 0.76, 1.0), step(0.80, h2));
  tint = mix(tint, vec3(1.0, 0.80, 0.62), step(0.93, h1));

  return tint * present * inside * brightness;
}

void main() {
  // Snap to the art-pixel grid before anything else.
  vec2 ap = floor(gl_FragCoord.xy / uPixel);
  vec2 res = uResolution / uPixel;
  vec2 center = uPointer * res;

  vec2 toCenter = ap - center;
  float dist = length(toCenter);
  vec2 dir = toCenter / max(dist, 1e-4);

  // Horizon grows as the voice feeds it, and swells for an instant on click:
  // since the ring and the lensing below are both derived from rs, the whole
  // shape pulses together instead of just changing colour.
  float rs = (0.021 + 0.038 * uMass + 0.0025 * uPulse) * res.y;

  // Light bends towards the mass: sample the sky pulled outwards, on whole
  // pixels, so the stars stay aligned to the grid while they stretch.
  // Two terms: the wide, gentle bend the whole field feels, plus one that runs
  // away as you approach the rim, the way light does near a photon sphere.
  // Capped, or the sampling turns to noise right at the edge.
  float wide = (rs * rs * 8.0) / (dist + rs * 0.5);
  float rim = (rs * rs * 1.8) / (max(dist - rs, 0.8) + rs * 0.2);
  float deflection = min(wide + rim, res.y * 0.45);
  vec2 sky = floor(ap - dir * deflection);

  // The pointer no longer displaces the field: moving it speeds up the drift
  // instead. Near layers travel further than far ones, which is the parallax.
  vec3 color = vec3(0.0);
  color += starLayer(sky + vec2(uDrift * 0.30, 0.0), 26.0, 1.0, 0.55) * 0.45;
  color += starLayer(sky + vec2(uDrift * 0.60, 0.0), 15.0, 27.0, 0.40) * 0.75;
  color += starLayer(sky + vec2(uDrift * 1.00, 0.0), 9.0, 91.0, 0.22) * 1.00;

  // The headings live in the same bent space as the stars: sampled with the
  // deflected coordinate, they curve around the singularity too.
  vec2 tuv = sky / res;
  float inside =
    step(0.0, tuv.x) * step(tuv.x, 1.0) *
    step(0.0, tuv.y) * step(tuv.y, 1.0);
  float glyph = texture2D(uText, vec2(tuv.x, 1.0 - tuv.y)).a * inside;

  // Lit near the singularity, burnt and dim far from it.
  float reveal = 1.0 - smoothstep(uReveal * 0.35, uReveal, dist);
  color = mix(color, mix(TEXT_DIM, TEXT_LIT, reveal), glyph);

  // A single thin circle around the shadow, no accretion disc. Drawn by
  // coverage so it can stay below one grid pixel: pixels on the radius light
  // fully, their neighbours barely, and the posterise step drops the faintest.
  float ring = 1.0 - smoothstep(0.0, max(0.30, rs * 0.025), abs(dist - rs * 1.45));
  color += ring * (0.42 + 0.34 * uMass + 0.04 * uPulse);

  // The shadow itself: nothing comes back out.
  color *= step(rs, dist);

  // Posterise: pixel art does not have smooth gradients.
  color = floor(color * 14.0 + 0.5) / 14.0;

  gl_FragColor = vec4(color, 1.0);
}
`;
