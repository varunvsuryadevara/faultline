import { useEffect, useRef, useState } from 'react';

// Width of an element, kept current with a ResizeObserver (for the SVG fault strip).
export function useElementWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}

// Ticks while `active` so a running clock can render.
export function useNow(active, intervalMs = 250) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return undefined;
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [active, intervalMs]);
  return now;
}

// Grows a textarea to fit its content, up to a maximum height. Re-measures when the web
// fonts finish loading and when the textarea changes width, since both change line wrapping.
export function useAutoGrow(value, maxHeight = 460) {
  const ref = useRef(null);
  const fit = useRef(() => {});
  fit.current = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight + 2, maxHeight)}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden';
  };

  useEffect(() => {
    fit.current();
  }, [value, maxHeight]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    let width = el.clientWidth;
    const observer = new ResizeObserver(() => {
      if (el.clientWidth !== width) {
        width = el.clientWidth;
        fit.current();
      }
    });
    observer.observe(el);
    document.fonts?.ready.then(() => fit.current());
    return () => observer.disconnect();
  }, []);

  return ref;
}
