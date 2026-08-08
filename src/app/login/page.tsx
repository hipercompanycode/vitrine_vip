"use client";
import { useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabase/browser";

export default function LoginPage() {
  const supabase = createBrowserClient();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState<"error" | "info">("info");
  const [loading, setLoading] = useState<"" | "entrar" | "cadastrar" | "google">("");

  const busy = loading !== "";

  async function entrar() {
    setLoading("entrar");
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) {
      setMsgType("error");
      setMsg(error.message);
      setLoading("");
    } else {
      window.location.href = "/perfil";
    }
  }

  async function cadastrar() {
    setLoading("cadastrar");
    const { error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setMsgType(error ? "error" : "info");
    setMsg(error ? error.message : "Enviamos um e-mail de confirmação. Verifique sua caixa de entrada.");
    setLoading("");
  }

  async function google() {
    setLoading("google");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setMsgType("error");
      setMsg(error.message);
      setLoading("");
    }
    // sucesso: o navegador é redirecionado para o Google.
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 inline-flex items-baseline gap-0.5">
          <span className="font-display text-2xl font-extrabold tracking-tight text-ink">serviços</span>
          <span className="h-2 w-2 rounded-full bg-accent" />
        </Link>

        <div className="rounded-card border border-line bg-surface p-6 shadow-card sm:p-8">
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">Entrar</h1>
          <p className="mt-1 text-sm text-muted">Acesse sua conta para gerenciar seu anúncio.</p>

          <form
            className="mt-6 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              entrar();
            }}
          >
            <Field
              label="E-mail"
              type="email"
              placeholder="voce@email.com"
              value={email}
              onChange={setEmail}
              autoComplete="email"
            />
            <Field
              label="Senha"
              type="password"
              placeholder="••••••••"
              value={senha}
              onChange={setSenha}
              autoComplete="current-password"
            />

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-input bg-accent py-2.5 text-sm font-semibold text-white transition-all hover:bg-accent-strong active:scale-[0.98] disabled:opacity-60"
            >
              {loading === "entrar" ? "Entrando…" : "Entrar"}
            </button>
            <button
              type="button"
              onClick={cadastrar}
              disabled={busy}
              className="w-full rounded-input border border-line bg-surface py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-accent-soft disabled:opacity-60"
            >
              {loading === "cadastrar" ? "Criando…" : "Criar conta"}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs text-muted">
            <span className="h-px flex-1 bg-line" />
            ou
            <span className="h-px flex-1 bg-line" />
          </div>

          <button
            type="button"
            onClick={google}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-input border border-line bg-surface py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-surface-2 disabled:opacity-60"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
            </svg>
            {loading === "google" ? "Redirecionando…" : "Entrar com Google"}
          </button>

          {msg && (
            <p
              className={`mt-4 rounded-input px-3 py-2 text-sm ${
                msgType === "error"
                  ? "bg-red-50 text-red-700"
                  : "bg-accent-soft text-accent-strong"
              }`}
            >
              {msg}
            </p>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted">
          Só quem anuncia precisa de conta. Buscar serviços é livre.
        </p>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="w-full rounded-input border border-line bg-surface-2 px-3 py-2.5 text-sm text-ink placeholder:text-muted/70 focus:border-accent focus:outline-none"
      />
    </label>
  );
}
