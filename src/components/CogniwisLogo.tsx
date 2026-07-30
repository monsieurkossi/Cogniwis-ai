interface Props {
  size?: number;
  variant?: "mark" | "reverse" | "plain";
  className?: string;
}

// SVG mark inspired by the Cogniwis "CO ∞" logo — two mirrored C rings
// joined at the center like an infinity glyph. Three variants:
//   mark    → white glyph on blue rounded-square (default, use on light UI)
//   reverse → blue glyph on white rounded-square (use on colored surface)
//   plain   → glyph only, currentColor, no background (for inline use in text)
export function CogniwisLogo({
  size = 32,
  variant = "mark",
  className = "",
}: Props) {
  const hasBg = variant !== "plain";
  const bg = variant === "mark" ? "#0022ff" : "#ffffff";
  const fg =
    variant === "mark"
      ? "#ffffff"
      : variant === "reverse"
        ? "#0022ff"
        : "currentColor";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Cogniwis"
      role="img"
    >
      {hasBg && <rect width="100" height="100" rx="18" fill={bg} />}
      {/* Two mirrored C's forming an infinity mark.
          Built as one filled path: outer silhouette minus the two inner eye
          holes (evenodd fill-rule so the eyes cut through cleanly). */}
      <path
        fill={fg}
        fillRule="evenodd"
        clipRule="evenodd"
        d="M32 30c-11.05 0-20 8.95-20 20s8.95 20 20 20c6.94 0 13.05-3.53 16.64-8.9 3.6 5.37 9.7 8.9 16.65 8.9 11.05 0 20-8.95 20-20s-8.95-20-20-20c-6.94 0-13.05 3.53-16.65 8.9-3.59-5.37-9.7-8.9-16.64-8.9Zm0 12a8 8 0 0 0 0 16c3.24 0 6.06-1.93 7.32-4.7L45 50l-5.68-3.3A8 8 0 0 0 32 42Zm36 0a8 8 0 0 1 0 16c-3.24 0-6.06-1.93-7.32-4.7L55 50l5.68-3.3A8 8 0 0 1 68 42Z"
      />
    </svg>
  );
}
