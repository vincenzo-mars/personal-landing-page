import { NAME_LINES, ROLES } from "../_content";

/**
 * Draws the headings into a canvas sized in art pixels, so the text is authored
 * at the same low resolution as the starfield instead of being downscaled into
 * it. The shader samples this with nearest filtering and bends it with the lens.
 */
export function drawTextTexture(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  fontFamily: string,
) {
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // White: the shader decides the colour, this only carries the shape.
  ctx.fillStyle = "#ffffff";

  const nameSize = Math.max(8, Math.round(canvas.height * 0.085));
  const roleSize = Math.max(5, Math.round(canvas.height * 0.034));
  const tracking = Math.max(1, Math.round(roleSize * 0.2));

  const nameFont = (size: number) => `700 ${size}px ${fontFamily}`;
  const roleFont = (size: number) => `400 ${size}px ${fontFamily}`;

  // Shrink until the widest line fits, margins included.
  const limit = canvas.width * 0.86;
  let scale = 1;
  for (let attempt = 0; attempt < 12; attempt++) {
    ctx.font = nameFont(Math.round(nameSize * scale));
    const widest = Math.max(...NAME_LINES.map((line) => ctx.measureText(line).width));

    ctx.font = roleFont(Math.round(roleSize * scale));
    const widestRole = Math.max(
      ...ROLES.map((role) => ctx.measureText(role.toUpperCase()).width + tracking * role.length),
    );

    if (Math.max(widest, widestRole) <= limit) break;
    scale *= 0.92;
  }

  const name = Math.round(nameSize * scale);
  const role = Math.round(roleSize * scale);
  const nameLead = Math.round(name * 1.25);
  const roleLead = Math.round(role * 2.0);
  const blockGap = Math.round(name * 1.1);

  const totalHeight =
    nameLead * (NAME_LINES.length - 1) + blockGap + roleLead * (ROLES.length - 1);
  let y = canvas.height / 2 - totalHeight / 2;
  const x = canvas.width / 2;

  ctx.font = nameFont(name);
  for (const line of NAME_LINES) {
    ctx.fillText(line, x, y);
    y += nameLead;
  }

  y += blockGap - nameLead;

  ctx.font = roleFont(role);
  // letterSpacing is recent; where it is missing the roles just sit tighter.
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${tracking}px`;
  for (const item of ROLES) {
    ctx.fillText(item.toUpperCase(), x, y);
    y += roleLead;
  }
  if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
}
