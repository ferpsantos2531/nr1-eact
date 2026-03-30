"use client"
import Image from "next/image"
import { useRouter } from "next/navigation"

type Props = {
  backLabel?: string
  backHref?: string
  rightSlot?: React.ReactNode
}

export default function Header({ backLabel, backHref, rightSlot }: Props) {
  const router = useRouter()
  return (
    <header style={{ background: "#006635" }} className="px-6 py-3">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <button
          onClick={() => router.push(backHref ?? "/")}
          className="flex items-center gap-3"
        >
          <Image
            src="/abrasel-logo.svg"
            alt="Abrasel"
            width={100}
            height={20}
            style={{ filter: "brightness(0) invert(1)" }}
          />
        </button>
        {rightSlot}
      </div>
    </header>
  )
}
