import type { OniGender } from "@/lib/types";

interface Props {
  gender: OniGender;
  size?: number;
  className?: string;
  /** Halo bleu Oni derrière le perso — pour l'écran de bienvenue. */
  halo?: boolean;
}

/**
 * Avatar stylisé 3D-look (SVG). On garde une identité visuelle Cogniwis :
 * halo bleu Oni, palette douce, rendu ombré/lumineux façon illustration
 * moderne. Deux variantes : "il" (cheveux courts denses) et "elle" (coupe
 * pixie). Neutre côté peau, on utilise un beige chaud lumineux qui passe
 * bien sur fond bleu.
 */
export function PersonaAvatar({
  gender,
  size = 120,
  className = "",
  halo = false,
}: Props) {
  const id = gender;
  const skin = `url(#skin-${id})`;
  const hair = gender === "elle" ? "#1a1a24" : "#221a12";
  const hairShade = gender === "elle" ? "#0d0d15" : "#120c07";

  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      role="img"
      aria-label={gender === "elle" ? "Avatar Oni (elle)" : "Avatar Oni (il)"}
      className={className}
    >
      <defs>
        <radialGradient id={`halo-${id}`} cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#a5b6ff" />
          <stop offset="55%" stopColor="#4a63ff" />
          <stop offset="100%" stopColor="#0022ff" />
        </radialGradient>
        <radialGradient id={`skin-${id}`} cx="45%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#f6d5b0" />
          <stop offset="60%" stopColor="#d9a879" />
          <stop offset="100%" stopColor="#a67a4d" />
        </radialGradient>
        <radialGradient id={`shirt-${id}`} cx="50%" cy="30%" r="80%">
          <stop
            offset="0%"
            stopColor={gender === "elle" ? "#3a5cff" : "#1b2b4a"}
          />
          <stop
            offset="100%"
            stopColor={gender === "elle" ? "#0022ff" : "#0a1226"}
          />
        </radialGradient>
        <linearGradient id={`cheek-${id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#ff8a99" stopOpacity="0" />
          <stop offset="100%" stopColor="#ff6b7f" stopOpacity="0.55" />
        </linearGradient>
      </defs>

      {halo && (
        <circle cx="100" cy="100" r="98" fill={`url(#halo-${id})`} />
      )}

      {/* Épaules / buste */}
      <path
        d="M 30 200 C 30 155, 65 130, 100 130 C 135 130, 170 155, 170 200 Z"
        fill={`url(#shirt-${id})`}
      />

      {/* Cou */}
      <path
        d="M 85 128 L 85 145 Q 100 152 115 145 L 115 128 Z"
        fill={skin}
        opacity="0.95"
      />

      {/* Ombre sous menton */}
      <path
        d="M 82 138 Q 100 148 118 138 L 118 145 Q 100 152 82 145 Z"
        fill="#000"
        opacity="0.15"
      />

      {/* Tête */}
      <ellipse cx="100" cy="95" rx="42" ry="48" fill={skin} />

      {/* Cheveux */}
      {gender === "elle" ? (
        <>
          <path
            d="M 58 82 Q 55 45 100 42 Q 145 45 142 82 Q 138 68 118 62 Q 108 58 100 60 Q 92 58 82 62 Q 62 68 58 82 Z"
            fill={hair}
          />
          <path
            d="M 62 78 Q 58 55 100 52 Q 142 55 138 78"
            fill={hairShade}
            opacity="0.6"
          />
        </>
      ) : (
        <>
          <path
            d="M 60 78 Q 58 48 100 45 Q 142 48 140 78 Q 132 62 118 60 Q 100 55 82 60 Q 68 62 60 78 Z"
            fill={hair}
          />
          <path
            d="M 65 72 Q 62 55 100 52 Q 138 55 135 72"
            fill={hairShade}
            opacity="0.5"
          />
        </>
      )}

      {/* Highlight visage */}
      <ellipse
        cx="86"
        cy="86"
        rx="14"
        ry="18"
        fill="#fff"
        opacity="0.18"
      />

      {/* Sourcils */}
      <path
        d="M 78 88 Q 85 84 92 88"
        stroke={hair}
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M 108 88 Q 115 84 122 88"
        stroke={hair}
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />

      {/* Yeux */}
      <ellipse cx="85" cy="98" rx="3.5" ry="4.5" fill="#1a1a24" />
      <ellipse cx="115" cy="98" rx="3.5" ry="4.5" fill="#1a1a24" />
      <circle cx="86" cy="96.5" r="1.2" fill="#fff" />
      <circle cx="116" cy="96.5" r="1.2" fill="#fff" />

      {/* Joues */}
      <ellipse cx="80" cy="112" rx="8" ry="5" fill={`url(#cheek-${id})`} />
      <ellipse cx="120" cy="112" rx="8" ry="5" fill={`url(#cheek-${id})`} />

      {/* Nez */}
      <path
        d="M 100 100 Q 97 110 100 114 Q 103 110 100 100"
        fill="#000"
        opacity="0.12"
      />

      {/* Bouche */}
      <path
        d="M 92 120 Q 100 126 108 120"
        stroke="#7a3a2e"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Boucles d'oreilles (elle) */}
      {gender === "elle" && (
        <>
          <circle cx="60" cy="102" r="2.5" fill="#ffd166" />
          <circle cx="140" cy="102" r="2.5" fill="#ffd166" />
        </>
      )}
    </svg>
  );
}
