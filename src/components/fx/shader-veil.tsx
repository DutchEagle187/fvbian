"use client";

import * as React from "react";

/**
 * Fullscreen fragment-shader veil — fbm value-noise aurora, written in raw
 * WebGL (no three.js). Pauses when offscreen, respects reduced motion,
 * silently degrades to nothing if WebGL is unavailable.
 */

const VERT = `
attribute vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }
`;

const FRAG = `
precision mediump float;
uniform vec2 u_res;
uniform float u_time;
uniform vec3 u_colA;
uniform vec3 u_colB;
uniform float u_amp;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(1.7, 9.2);
    a *= 0.55;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  vec2 p = uv * vec2(u_res.x / u_res.y, 1.0) * 2.2;
  float t = u_time * 0.05;

  float q = fbm(p + vec2(t, -t * 0.7));
  float r = fbm(p + q * 1.4 + vec2(-t * 0.6, t * 0.4));
  float v = fbm(p + r * 1.8);

  vec3 col = mix(u_colA, u_colB, smoothstep(0.25, 0.85, r));
  col *= (0.25 + 0.9 * v) * u_amp;

  // soft vertical falloff so it hugs the section edges
  float fade = smoothstep(0.0, 0.25, uv.y) * smoothstep(1.0, 0.7, uv.y);
  gl_FragColor = vec4(col * fade, 1.0);
}
`;

interface ShaderVeilProps {
  /** rgb 0..1 */
  colorA?: [number, number, number];
  colorB?: [number, number, number];
  amplitude?: number;
  className?: string;
}

export function ShaderVeil({
  colorA = [0.55, 0.32, 0.05],
  colorB = [0.04, 0.35, 0.35],
  amplitude = 1,
  className,
}: ShaderVeilProps) {
  const ref = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const gl = canvas.getContext("webgl", {
      antialias: false,
      depth: false,
      powerPreference: "low-power",
    });
    if (!gl) return;

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW
    );
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, "u_res");
    const uTime = gl.getUniformLocation(prog, "u_time");
    const uColA = gl.getUniformLocation(prog, "u_colA");
    const uColB = gl.getUniformLocation(prog, "u_colB");
    const uAmp = gl.getUniformLocation(prog, "u_amp");
    gl.uniform3fv(uColA, colorA);
    gl.uniform3fv(uColB, colorB);
    gl.uniform1f(uAmp, amplitude);

    let raf = 0;
    let running = false;
    const start = performance.now();

    const resize = () => {
      const scale = 0.5; // render at half res — it's a blurry veil anyway
      const w = Math.max(2, Math.floor(canvas.clientWidth * scale));
      const h = Math.max(2, Math.floor(canvas.clientHeight * scale));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
        gl.uniform2f(uRes, w, h);
      }
    };

    const frame = () => {
      resize();
      gl.uniform1f(uTime, reduced ? 40 : (performance.now() - start) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!reduced && running) raf = requestAnimationFrame(frame);
    };

    const io = new IntersectionObserver(([entry]) => {
      running = entry.isIntersecting;
      if (running) {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(frame);
      } else {
        cancelAnimationFrame(raf);
      }
    });
    io.observe(canvas);

    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className={className}
      style={{ width: "100%", height: "100%" }}
    />
  );
}
