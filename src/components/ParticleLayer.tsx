import { useEffect, useRef } from 'react';
import { BOARD_COLS, BOARD_ROWS, ParticleBurst } from '../types/mergeGame';

interface ParticleLayerProps {
  bursts: ParticleBurst[];
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  rotation: number;
  vRot: number;
}

export function ParticleLayer({ bursts }: ParticleLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sparksRef = useRef<Spark[]>([]);
  const processedIdsRef = useRef<Set<number>>(new Set());
  const rafRef = useRef<number>(0);

  // Enqueue newly triggered particle bursts
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width === 0 || height === 0) return;

    for (const burst of bursts) {
      if (processedIdsRef.current.has(burst.id)) continue;
      processedIdsRef.current.add(burst.id);

      // Cap tracked IDs to keep memory clean
      if (processedIdsRef.current.size > 100) {
        const first = processedIdsRef.current.values().next().value;
        if (first !== undefined) processedIdsRef.current.delete(first);
      }

      const cx = ((burst.col + 0.5) / BOARD_COLS) * width;
      const cy = ((burst.row + 0.5) / BOARD_ROWS) * height;

      for (let i = 0; i < burst.count; i++) {
        const angle = (Math.PI * 2 * i) / burst.count + (Math.random() - 0.5) * 0.5;
        const speed = 1.8 + Math.random() * 4.2;
        sparksRef.current.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 0.8,
          size: 3.5 + Math.random() * 4,
          color: burst.color,
          alpha: 1,
          rotation: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 0.25,
        });
      }
    }
  }, [bursts]);

  // Persistent animation loop only while sparks exist
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let last = performance.now();

    const loop = (now: number) => {
      const dt = Math.min((now - last) / 16.667, 2.5);
      last = now;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const targetW = Math.floor(canvas.clientWidth * dpr);
      const targetH = Math.floor(canvas.clientHeight * dpr);
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);

      const active: Spark[] = [];
      for (const s of sparksRef.current) {
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.vy += 0.14 * dt;
        s.vx *= 0.96;
        s.rotation += s.vRot * dt;
        s.alpha -= 0.03 * dt;

        if (s.alpha > 0.03) {
          active.push(s);
          ctx.save();
          ctx.globalAlpha = s.alpha;
          ctx.translate(s.x, s.y);
          ctx.rotate(s.rotation);
          ctx.fillStyle = s.color;
          ctx.fillRect(-s.size / 2, -s.size / 2, s.size, s.size);
          ctx.restore();
        }
      }
      sparksRef.current = active;
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-30"
      aria-hidden="true"
    />
  );
}
