"use client";

import {
  motion,
  type SpringOptions,
  useMotionValue,
  useSpring,
} from "motion/react";
import {
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
  useRef,
} from "react";

const SPRING: SpringOptions = { damping: 28, stiffness: 200, mass: 1.4 };

export interface TiltedCardProps {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
  rotateAmplitude?: number;
  scaleOnHover?: number;
  style?: CSSProperties;
}

export function TiltedCard({
  children,
  className = "",
  innerClassName = "",
  rotateAmplitude = 6,
  scaleOnHover = 1.02,
  style,
}: TiltedCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const rotateX = useSpring(useMotionValue(0), SPRING);
  const rotateY = useSpring(useMotionValue(0), SPRING);
  const scale = useSpring(1, SPRING);

  const handleMouse = (e: MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left - rect.width / 2;
    const offsetY = e.clientY - rect.top - rect.height / 2;
    rotateX.set((offsetY / (rect.height / 2)) * -rotateAmplitude);
    rotateY.set((offsetX / (rect.width / 2)) * rotateAmplitude);
  };

  const handleEnter = () => {
    scale.set(scaleOnHover);
  };

  const handleLeave = () => {
    rotateX.set(0);
    rotateY.set(0);
    scale.set(1);
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: 3D tilt is a decorative cursor effect with no semantic action
    <div
      ref={ref}
      role="presentation"
      className={`[perspective:1000px] ${className}`}
      style={style}
      onMouseMove={handleMouse}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <motion.div
        className={`h-full w-full [transform-style:preserve-3d] ${innerClassName}`}
        style={{ rotateX, rotateY, scale }}
      >
        {children}
      </motion.div>
    </div>
  );
}
