'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

type Pos = { x: number; y: number };

/**
 * Makes a floating action cluster draggable by pointer (mouse + touch).
 * Position persists in localStorage; taps still activate the buttons
 * (a drag beyond 8px suppresses the click that follows it).
 */
export function useDraggableFab(storageKey: string) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<Pos | null>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? (JSON.parse(raw) as Pos) : null;
    } catch {
      return null;
    }
  });
  const posRef = useRef<Pos | null>(pos);
  const drag = useRef<{ sx: number; sy: number; ox: number; oy: number; pid: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);

  const clamp = useCallback((x: number, y: number) => {
    const el = ref.current;
    const w = el?.offsetWidth ?? 60;
    const h = el?.offsetHeight ?? 60;
    return {
      x: Math.min(Math.max(x, 8), Math.max(8, window.innerWidth - w - 8)),
      y: Math.min(Math.max(y, 8), Math.max(8, window.innerHeight - h - 8)),
    };
  }, []);

  // keep inside viewport on resize / rotate
  useEffect(() => {
    const onResize = () => {
      if (posRef.current) {
        const p = clamp(posRef.current.x, posRef.current.y);
        posRef.current = p;
        setPos(p);
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [clamp]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    // NOTE: do NOT setPointerCapture here — capturing on pointerdown retargets
    // the following click to this container, which would break taps on the
    // buttons/links inside. Capture starts only once a real drag begins.
    const r = el.getBoundingClientRect();
    drag.current = { sx: e.clientX, sy: e.clientY, ox: r.left, oy: r.top, pid: e.pointerId, moved: false };
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.pid) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    if (!d.moved && Math.hypot(dx, dy) < 8) return;
    if (!d.moved) {
      d.moved = true;
      try { ref.current?.setPointerCapture(d.pid); } catch { /* noop */ }
    }
    const p = clamp(d.ox + dx, d.oy + dy);
    posRef.current = p;
    setPos(p);
  }, [clamp]);

  const endDrag = useCallback(() => {
    const d = drag.current;
    drag.current = null;
    if (d?.moved) {
      suppressClick.current = true;
      window.setTimeout(() => { suppressClick.current = false; }, 50);
      try { localStorage.setItem(storageKey, JSON.stringify(posRef.current)); } catch {}
    }
  }, [storageKey]);

  const onClickCapture = useCallback((e: React.SyntheticEvent) => {
    if (suppressClick.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, []);

  const style: React.CSSProperties | undefined = pos
    ? { left: pos.x, top: pos.y, right: 'auto', bottom: 'auto' }
    : undefined;

  return {
    ref,
    style,
    dragHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
      onClickCapture,
    },
  };
}
