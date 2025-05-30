import Image from "next/image"

export function RodnikLogo() {
  return (
    <Image
      src="/logo.png"
      alt="Rodnik Logo"
      width={32}
      height={32}
      className="h-8 w-8"
    />
  )
} 