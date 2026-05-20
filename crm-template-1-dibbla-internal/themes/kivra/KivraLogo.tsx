import type { ImgHTMLAttributes } from "react";
import logoUrl from "./kivra-logotyp.png";

export function KivraLogo(props: ImgHTMLAttributes<HTMLImageElement>) {
  return (
    <img
      src={logoUrl}
      alt="Kivra"
      className="w-full h-auto"
      {...props}
    />
  );
}
