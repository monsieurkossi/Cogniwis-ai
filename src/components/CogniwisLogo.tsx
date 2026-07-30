import Image from "next/image";

interface Props {
  size?: number;
  rounded?: boolean;
  className?: string;
  priority?: boolean;
}

// Renders the official Cogniwis logo from /public/logo-cogniwis.jpg.
// The source image is a square blue tile with a white "CO ∞" mark —
// rounded={true} (default) softens the corners for in-UI usage.
export function CogniwisLogo({
  size = 32,
  rounded = true,
  className = "",
  priority = false,
}: Props) {
  return (
    <Image
      src="/logo-cogniwis.jpg"
      alt="Cogniwis"
      width={size}
      height={size}
      priority={priority}
      className={`${rounded ? "rounded-[22%]" : ""} ${className}`}
    />
  );
}
