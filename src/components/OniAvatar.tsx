interface Props {
  size?: number;
  speaking?: boolean;
  className?: string;
  /** Ajoute un halo bleu diffus derrière l'orbe (pour la welcome). */
  halo?: boolean;
}

export function OniAvatar({
  size = 120,
  speaking = false,
  className = "",
  halo = false,
}: Props) {
  return (
    <div
      className={`relative inline-block ${className}`}
      style={{ width: size, height: size }}
      aria-label="Oni"
    >
      {halo && <span className="oni-halo" />}
      <div
        className={`oni-orb ${speaking ? "speaking" : ""}`}
        style={{ width: size, height: size }}
      />
    </div>
  );
}
