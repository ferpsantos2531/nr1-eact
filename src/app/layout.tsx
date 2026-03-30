import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Avaliação NR-1 | Conexão Abrasel",
  description:
    "Ferramenta de avaliação de riscos psicossociais em conformidade com a NR-1. Diagnóstico completo com plano de ação gerado por Inteligência Artificial.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
