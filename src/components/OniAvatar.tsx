interface Props {
  size?: number;
  speaking?: boolean;
  className?: string;
}

export function OniAvatar({ size = 120, speaking = false, className = "" }: Props) {
  return (
    <div
      className={`oni-orb ${speaking ? "speaking" : ""} ${className}`}
      style={{ width: size, height: size }}
      aria-label="Oni"
    />
  );
}
