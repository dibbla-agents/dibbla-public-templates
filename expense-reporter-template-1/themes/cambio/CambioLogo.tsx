import type { ImgHTMLAttributes } from "react";
import logoUrl from "./cambio-logotyp.png";

// The shipped logotype is the black "CAMBIO" wordmark + red woven "C" mark.
// It is fixed-colour artwork, so render it on light surfaces only
// (cambio-white / cambio-gray). On a dark surface the black wordmark
// disappears — no white/negative variant ships with this theme.
export function CambioLogo(props: ImgHTMLAttributes<HTMLImageElement>) {
  return (
    <img
      src={logoUrl}
      alt="Cambio"
      className="w-full h-auto"
      {...props}
    />
  );
}
