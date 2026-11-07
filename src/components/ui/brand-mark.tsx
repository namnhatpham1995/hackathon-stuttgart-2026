import Image from "next/image";

export function BrandMark({ className = "", alt = "" }: { className?: string; alt?: string }) {
  return (
    <Image
      src="/tradeready-passport.png"
      alt={alt}
      width={1102}
      height={1427}
      sizes="96px"
      className={`brand-mark ${className}`}
    />
  );
}
