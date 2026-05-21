import type { ImgHTMLAttributes } from "react";
import logoDark from "./kivra-logotyp.png";
import logoLight from "./kivra-logotyp-light.png";

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt"> & {
  variant?: "dark" | "light";
};

// Pick the variant by surface, not by brand colour:
// - "dark" (default) → on lime, cream, white, or any light surface
// - "light"          → on the kivra-green-deep nav strip, or any dark surface
// Rendering "dark" on the deep-green strip produces an invisible logo
// (both are #003004). See kivra-colors.md for the surface map.
export function KivraLogo({ variant = "dark", ...props }: Props) {
  return (
    <img
      src={variant === "light" ? logoLight : logoDark}
      alt="Kivra"
      className="w-full h-auto"
      {...props}
    />
  );
}
