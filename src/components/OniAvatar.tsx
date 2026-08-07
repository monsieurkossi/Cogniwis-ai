interface Props {
  size?: number;
  speaking?: boolean;
  className?: string;
  /** Halo diffus fixe derrière l'orbe (hero seulement). */
  aura?: boolean;
  /** Micro-breathing subtle — pour le hero. */
  breathing?: boolean;
}

export function OniAvatar({
  size = 44,
  speaking = false,
  className = "",
  aura = false,
  breathing = false,
}: Props) {
  return (
    <div
      className={`relative inline-block ${className}`}
      style={{ width: size, height: size }}
      aria-label="Oni"
    >
      {aura && <span className="oni-aura" />}
      <div
        className={`oni-orb ${speaking ? "speaking" : ""} ${breathing ? "oni-orb-hero" : ""}`}
        style={{ width: size, height: size }}
      />
    </div>
  );
}
