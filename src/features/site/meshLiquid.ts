/**
 * meshLiquid — the animated page background.
 *
 * A single full-screen WebGL fragment shader: the page's four colours
 * as slow liquid silk. A domain-warped noise field folds them into
 * large sweeping bands that flow and undulate into one another, with
 * a soft sheen along the creases. The whole page is colour; the page's
 * Intensity sets how much of the cream ground shows through. Colours
 * are chosen per page in the Page background panel.
 * It reads the same CSS variables the blob fallback uses (`--mesh-c*`,
 * `--mesh-d*`, `--mesh-motion`, set on :root by PageRows), so the
 * admin's Page background panel drives both. Where WebGL is unavailable nothing is stamped and the
 * CSS blobs stay visible.
 *
 * Motion: "calm" = 1×, "lively" = 2×, "off" or a reduced-motion
 * preference = one still frame (also what the screenshot suite sees).
 * The canvas renders at roughly half resolution — the curtains are
 * soft, so the upscale is invisible — and is capped at 30 frames/s.
 */
import { buildPageMeshVars } from "./pageMesh";

export const LIQUID_VERT = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

export const LIQUID_FRAG = `
precision mediump float;
uniform vec2 u_res;
uniform float u_time;
uniform vec4 u_base[4];
uniform vec4 u_drift[4];

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * vnoise(p);
    p = p * 2.03 + vec2(17.1, 9.7);
    a *= 0.5;
  }
  return v;
}

/* ── Liquid ──
   The whole page is colour, like silk or a slow liquid: a domain-warped
   noise field folds the four page colours (and their drift hues) into
   large sweeping bands that flow and undulate into one another. No cream
   gaps; strength sets how much of the page ground shows through. */
vec3 breathe(vec4 base, vec4 drift, float phase) {
  return mix(base.rgb, drift.rgb, 0.5 + 0.5 * sin(phase));
}
vec4 liquid(vec2 uv, float aspect) {
  vec2 p = vec2(uv.x * aspect, uv.y) * 0.9;
  float T = u_time * 0.09;
  /* Two rounds of warping: q bends space, r bends it again, so the
     field flows in slow sweeping folds rather than boiling in place. */
  vec2 q = vec2(
    fbm(p + vec2(T * 0.55, T * 0.25)),
    fbm(p + vec2(2.3 - T * 0.4, 1.7 + T * 0.45))
  );
  vec2 r = vec2(
    fbm(p + 2.6 * q + vec2(1.7, 9.2) + T * 0.6),
    fbm(p + 2.6 * q + vec2(8.3, 2.8) - T * 0.5)
  );
  float f = fbm(p + 3.0 * r);
  /* Silky creases: a gentle sine over the warped field. */
  float fold = 0.5 + 0.5 * sin(f * 7.0 + r.x * 5.0 + u_time * 0.3);

  vec3 c0 = breathe(u_base[0], u_drift[0], u_time * 0.21);
  vec3 c1 = breathe(u_base[1], u_drift[1], u_time * 0.17 + 1.9);
  vec3 c2 = breathe(u_base[2], u_drift[2], u_time * 0.23 + 3.7);
  vec3 c3 = breathe(u_base[3], u_drift[3], u_time * 0.19 + 5.1);

  vec3 warm = mix(c0, c1, smoothstep(0.25, 0.75, f));
  vec3 cool = mix(c2, c3, smoothstep(0.25, 0.75, r.y));
  vec3 col = mix(warm, cool, smoothstep(0.3, 0.7, q.x * 0.7 + fold * 0.3));
  /* A soft sheen along the creases, like light on silk. */
  col += 0.09 * (fold - 0.5);
  float a = u_base[0].a;
  return vec4(col * a, a);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  float aspect = u_res.x / u_res.y;
  gl_FragColor = liquid(uv, aspect);
}
`;

/** `rgba(r, g, b, a)` / `rgb(r, g, b)` / `#rrggbb` → [0..1 r, g, b, a]. */
export const parseCssColor = (value: string): [number, number, number, number] | null => {
  const v = (value || "").trim();
  const m = v.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?\s*\)/i);
  if (m) return [+m[1] / 255, +m[2] / 255, +m[3] / 255, m[4] === undefined ? 1 : +m[4]];
  let h = v.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (!/^[0-9a-f]{6}$/i.test(h)) return null;
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
    1,
  ];
};

export type MeshPalette = { base: Float32Array; drift: Float32Array };

/**
 * Read the four base + four drift colours from CSS variables into two
 * flat RGBA arrays for the shader. Falls back per slot to the brand
 * default so a half-set palette never renders black.
 */
export const readMeshPalette = (getVar: (name: string) => string): MeshPalette => {
  const defaults = buildPageMeshVars();
  const base = new Float32Array(16);
  const drift = new Float32Array(16);
  for (let i = 0; i < 4; i++) {
    const b = parseCssColor(getVar(`--mesh-c${i}`)) ?? parseCssColor(defaults[`--mesh-c${i}`])!;
    const d = parseCssColor(getVar(`--mesh-d${i}`)) ?? parseCssColor(defaults[`--mesh-d${i}`])!;
    base.set(b, i * 4);
    drift.set(d, i * 4);
  }
  return { base, drift };
};

/** Seconds of shader time per real second. 0 = a single still frame. */
export const meshSpeed = (motion: string | undefined, reducedMotion: boolean): number => {
  if (reducedMotion || motion === "off") return 0;
  return motion === "lively" ? 2 : 1;
};

/** Where the clock starts — well into the noise so frame one already flows. */
export const LIQUID_T0 = 90;
const FRAME_MS = 1000 / 30;

type MinimalCanvas = Pick<HTMLCanvasElement, "getContext" | "parentElement" | "clientWidth" | "clientHeight" | "addEventListener" | "removeEventListener"> & {
  width: number;
  height: number;
};

/**
 * Start painting the liquid on `canvas`. Returns a stop function. If
 * WebGL is unavailable nothing happens and the CSS blobs stay in view.
 */
export const startLiquid = (canvas: MinimalCanvas, doc: Document = document): (() => void) => {
  const gl = canvas.getContext("webgl", {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: "low-power",
  }) as WebGLRenderingContext | null;
  if (!gl) return () => {};

  const compile = (type: number, src: string): WebGLShader | null => {
    const s = gl.createShader(type);
    if (!s) return null;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn("[mesh] shader failed:", gl.getShaderInfoLog(s));
      gl.deleteShader(s);
      return null;
    }
    return s;
  };
  const vs = compile(gl.VERTEX_SHADER, LIQUID_VERT);
  const fs = compile(gl.FRAGMENT_SHADER, LIQUID_FRAG);
  const program = gl.createProgram();
  if (!vs || !fs || !program) return () => {};
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return () => {};
  gl.useProgram(program);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, "a_pos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  const uRes = gl.getUniformLocation(program, "u_res");
  const uTime = gl.getUniformLocation(program, "u_time");
  const uBase = gl.getUniformLocation(program, "u_base");
  const uDrift = gl.getUniformLocation(program, "u_drift");

  const root = doc.documentElement;
  const layer = canvas.parentElement;
  layer?.setAttribute("data-mesh-gl", "1");

  const reduced = doc.defaultView?.matchMedia?.("(prefers-reduced-motion: reduce)");
  const small = doc.defaultView?.matchMedia?.("(max-width: 767px)");
  let speed = 1;
  let raf = 0;
  let last = 0;
  let stopped = false;

  const readSettings = () => {
    const style = doc.defaultView?.getComputedStyle(root);
    const getVar = (name: string) => style?.getPropertyValue(name) ?? "";
    const { base, drift } = readMeshPalette(getVar);
    gl.uniform4fv(uBase, base);
    gl.uniform4fv(uDrift, drift);
    speed = meshSpeed(root.dataset.meshMotion, !!reduced?.matches);
  };

  const resize = () => {
    const scale = small?.matches ? 0.35 : 0.5;
    const w = Math.max(1, Math.round(canvas.clientWidth * scale));
    const h = Math.max(1, Math.round(canvas.clientHeight * scale));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    gl.viewport(0, 0, w, h);
    gl.uniform2f(uRes, w, h);
  };

  const start = doc.defaultView?.performance?.now() ?? 0;
  const draw = (nowMs: number) => {
    gl.uniform1f(uTime, LIQUID_T0 + ((nowMs - start) / 1000) * speed);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const loop = (nowMs: number) => {
    if (stopped) return;
    if (speed === 0) return; // still frame already painted
    if (nowMs - last >= FRAME_MS) {
      last = nowMs;
      draw(nowMs);
    }
    raf = doc.defaultView?.requestAnimationFrame(loop) ?? 0;
  };

  const restart = () => {
    readSettings();
    resize();
    draw(doc.defaultView?.performance?.now() ?? 0);
    if (speed > 0 && !raf) raf = doc.defaultView?.requestAnimationFrame(loop) ?? 0;
    if (speed === 0 && raf) {
      doc.defaultView?.cancelAnimationFrame(raf);
      raf = 0;
    }
  };

  /* PageRows writes the palette and motion onto <html>; follow it. */
  const observer = new MutationObserver(restart);
  observer.observe(root, { attributes: true, attributeFilter: ["style", "data-mesh-motion"] });
  const onResize = () => {
    resize();
    draw(doc.defaultView?.performance?.now() ?? 0);
  };
  doc.defaultView?.addEventListener("resize", onResize);
  const onMotionPref = () => restart();
  reduced?.addEventListener?.("change", onMotionPref);
  const onLost = (e: Event) => {
    e.preventDefault();
    layer?.removeAttribute("data-mesh-gl");
    stopped = true;
  };
  canvas.addEventListener("webglcontextlost", onLost);

  restart();

  return () => {
    stopped = true;
    if (raf) doc.defaultView?.cancelAnimationFrame(raf);
    observer.disconnect();
    doc.defaultView?.removeEventListener("resize", onResize);
    reduced?.removeEventListener?.("change", onMotionPref);
    canvas.removeEventListener("webglcontextlost", onLost);
    layer?.removeAttribute("data-mesh-gl");
    const ext = gl.getExtension("WEBGL_lose_context");
    ext?.loseContext();
  };
};
