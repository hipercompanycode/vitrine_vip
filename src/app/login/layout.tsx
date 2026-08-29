import type { Metadata } from "next";

// Página utilitária (entrar/criar conta): não deve ser indexada.
export const metadata: Metadata = {
  title: "Entrar",
  alternates: { canonical: "/login" },
  robots: { index: false, follow: true },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
