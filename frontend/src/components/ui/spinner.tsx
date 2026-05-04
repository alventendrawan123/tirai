import { cn } from "@/lib/utils";

export interface SpinnerProps {
  size?: number;
  className?: string;
  label?: string;
}

export function Spinner({
  size = 16,
  className,
  label = "Loading",
}: SpinnerProps) {
  return (
    <output
      aria-label={label}
      className={cn("inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="animate-spin"
        width={size}
        height={size}
        aria-hidden="true"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeOpacity="0.2"
          strokeWidth="2"
        />
        <path
          d="M22 12a10 10 0 0 0-10-10"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </output>
  );
}
