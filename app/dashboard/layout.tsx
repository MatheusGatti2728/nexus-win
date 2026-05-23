import type { Metadata } from "next"

export const metadata: Metadata = { title: "AXIOM — Strategic Commercial Intelligence" }

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight:"100vh", background:"var(--bg-0)", color:"var(--text-hi)" }}>
      {children}
    </div>
  )
}
