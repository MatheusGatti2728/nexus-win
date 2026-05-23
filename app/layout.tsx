import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "AXIOM — Strategic Commercial Intelligence",
  description: "Strategic Commercial Intelligence Platform",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
