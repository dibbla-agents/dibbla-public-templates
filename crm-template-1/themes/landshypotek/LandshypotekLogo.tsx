import type { ImgHTMLAttributes } from "react";
import logoUrl from "./landshypotek-logotyp.png";

export function LandshypotekLogo(props: ImgHTMLAttributes<HTMLImageElement>) {
  return (
    <img
      src={logoUrl}
      alt="Landshypotek Bank"
      className="w-full h-auto"
      {...props}
    />
  );
}
