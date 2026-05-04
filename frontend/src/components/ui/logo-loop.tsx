"use client";

import {
  type CSSProperties,
  memo,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type LogoItem = {
  node: ReactNode;
  href?: string;
  ariaLabel?: string;
};

export interface LogoLoopProps {
  logos: LogoItem[];
  speed?: number;
  direction?: "left" | "right";
  width?: number | string;
  logoHeight?: number;
  gap?: number;
  pauseOnHover?: boolean;
  ariaLabel?: string;
  className?: string;
  style?: CSSProperties;
}

const SMOOTH_TAU = 0.25;
const MIN_COPIES = 2;
const COPY_HEADROOM = 2;

function toCssLength(value?: number | string): string | undefined {
  return typeof value === "number" ? `${value}px` : (value ?? undefined);
}

export const LogoLoop = memo(function LogoLoop({
  logos,
  speed = 60,
  direction = "left",
  width = "100%",
  logoHeight = 24,
  gap = 48,
  pauseOnHover = true,
  ariaLabel = "Logos",
  className = "",
  style,
}: LogoLoopProps) {
  const containerRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const seqRef = useRef<HTMLUListElement>(null);
  const [seqWidth, setSeqWidth] = useState(0);
  const [copyCount, setCopyCount] = useState(MIN_COPIES);
  const [isHovered, setIsHovered] = useState(false);

  const targetVelocity = useMemo(() => {
    const sign = direction === "left" ? 1 : -1;
    return Math.abs(speed) * sign;
  }, [speed, direction]);

  const updateDimensions = useCallback(() => {
    const containerWidth = containerRef.current?.clientWidth ?? 0;
    const w = seqRef.current?.getBoundingClientRect().width ?? 0;
    if (w > 0) {
      setSeqWidth(Math.ceil(w));
      const copies = Math.ceil(containerWidth / w) + COPY_HEADROOM;
      setCopyCount(Math.max(MIN_COPIES, copies));
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    const seq = seqRef.current;
    if (!container || !seq) return;
    const ro = new ResizeObserver(updateDimensions);
    ro.observe(container);
    ro.observe(seq);
    updateDimensions();
    return () => ro.disconnect();
  }, [updateDimensions]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let rafId = 0;
    let last: number | null = null;
    let offset = 0;
    let velocity = 0;

    if (reduced) {
      track.style.transform = "translate3d(0, 0, 0)";
      return;
    }

    const animate = (timestamp: number) => {
      if (last === null) last = timestamp;
      const dt = Math.max(0, timestamp - last) / 1000;
      last = timestamp;
      const target = isHovered && pauseOnHover ? 0 : targetVelocity;
      const ease = 1 - Math.exp(-dt / SMOOTH_TAU);
      velocity += (target - velocity) * ease;
      if (seqWidth > 0) {
        offset = (((offset + velocity * dt) % seqWidth) + seqWidth) % seqWidth;
        track.style.transform = `translate3d(${-offset}px, 0, 0)`;
      }
      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [targetVelocity, seqWidth, isHovered, pauseOnHover]);

  const cssVars = useMemo(
    () =>
      ({
        "--logoloop-gap": `${gap}px`,
        "--logoloop-logoHeight": `${logoHeight}px`,
      }) as CSSProperties,
    [gap, logoHeight],
  );

  const handleEnter = useCallback(() => {
    if (pauseOnHover) setIsHovered(true);
  }, [pauseOnHover]);

  const handleLeave = useCallback(() => {
    if (pauseOnHover) setIsHovered(false);
  }, [pauseOnHover]);

  const lists = useMemo(
    () =>
      Array.from({ length: copyCount }, (_, copyIndex) => (
        <ul
          // biome-ignore lint/suspicious/noArrayIndexKey: copy index is the natural key
          key={`copy-${copyIndex}`}
          className="flex items-center"
          aria-hidden={copyIndex > 0}
          ref={copyIndex === 0 ? seqRef : undefined}
        >
          {logos.map((item, i) => {
            const inner = (
              <span className="text-secondary inline-flex items-center text-[length:var(--logoloop-logoHeight)] leading-[1]">
                {item.node}
              </span>
            );
            return (
              <li
                key={`${copyIndex}-${i}-${item.ariaLabel ?? ""}`}
                className="mr-[var(--logoloop-gap)] flex-none text-[length:var(--logoloop-logoHeight)] leading-[1]"
              >
                {item.href ? (
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    aria-label={item.ariaLabel}
                    className="hover:text-primary text-secondary inline-flex items-center transition-colors duration-(--duration-fast)"
                  >
                    {inner}
                  </a>
                ) : (
                  inner
                )}
              </li>
            );
          })}
        </ul>
      )),
    [copyCount, logos],
  );

  return (
    <section
      ref={containerRef}
      className={`relative overflow-x-hidden ${className}`}
      style={{ width: toCssLength(width), ...cssVars, ...style }}
      aria-label={ariaLabel}
    >
      {/* biome-ignore lint/a11y/noStaticElementInteractions: marquee pause-on-hover is a decorative enhancement with no keyboard equivalent */}
      <div
        ref={trackRef}
        role="presentation"
        className="flex w-max flex-row will-change-transform select-none"
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
      >
        {lists}
      </div>
    </section>
  );
});
