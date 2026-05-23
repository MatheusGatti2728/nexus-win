"use client"

import Link from "next/link"
import { useParams } from "next/navigation"

export default function DossierDetailPage() {
  const { id } = useParams()
  return (
    <div style={{ padding: "48px", maxWidth: 600 }}>
      <Link href="/dashboard" style={{ fontSize: 12, color: "var(--text-lo)", textDecoration: "none" }}>
        ← Voltar ao Dashboard
      </Link>
      <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 24, color: "var(--text-hi)", marginTop: 24 }}>
        Dossiê
      </h1>
      <p style={{ fontSize: 12, color: "var(--text-lo)", marginTop: 8 }}>ID: {String(id)}</p>
      <p style={{ fontSize: 13, color: "var(--text-md)", marginTop: 24, lineHeight: 1.8 }}>
        Use o dashboard principal para gerar inteligência sobre empresas.
      </p>
    </div>
  )
}
