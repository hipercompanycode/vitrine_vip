"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabase/browser";

export default function LoginPage() {
  const supabase = createBrowserClient();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [next, setNext] = useState("/");
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState<"error" | "info">("info");
  const [loading, setLoading] = useState<"" | "entrar" | "cadastrar">("");
  const [agree, setAgree] = useState(false);
  const busy = loading !== "";

  // destino após login (?next=/perfil) — setado pelo botão que trouxe a pessoa
  useEffect(() => {
    const n = new URLSearchParams(window.location.search).get("next");
    if (n && n.startsWith("/")) setNext(n);
  }, []);

  async function esqueci() {
    if (!email) { setMsgType("error"); setMsg("Digite seu e-mail primeiro."); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });
    if (error) { setMsgType("error"); setMsg(error.message); return; }
    setMsgType("info"); setMsg("Enviamos um link de redefinição pro seu e-mail. Verifique sua caixa de entrada.");
  }

  async function entrar() {
    setLoading("entrar");
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) {
      setMsgType("error");
      setMsg(error.message);
      setLoading("");
    } else {
      window.location.href = `/pos-login?next=${encodeURIComponent(next)}`;
    }
  }

  async function cadastrar() {
    if (!agree) {
      setMsgType("error");
      setMsg("Você precisa confirmar que tem 18+ e aceitar os Termos e a Política de Privacidade.");
      return;
    }
    setLoading("cadastrar");
    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        data: { role: "comum" },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setMsgType("error");
      setMsg(error.message);
      setLoading("");
      return;
    }
    // Confirmação de e-mail desligada -> já vem com sessão -> entra direto.
    if (data.session) {
      window.location.href = `/pos-login?next=${encodeURIComponent(next)}`;
      return;
    }
    setMsgType("info");
    setMsg("Enviamos um e-mail de confirmação. Verifique sua caixa de entrada para ativar a conta.");
    setLoading("");
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 inline-flex items-baseline gap-0.5">
          <span className="font-display text-2xl font-extrabold tracking-tight text-ink">vitrine<span className="text-accent">vip</span></span>
          <span className="h-2 w-2 rounded-full bg-accent" />
        </Link>

        <div className="rounded-card border border-line bg-surface p-6 shadow-card sm:p-8">
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">Entrar ou criar conta</h1>
          <p className="mt-1 text-sm text-muted">Entre com seu e-mail. Para anunciar, é só clicar em “Anunciar” depois de entrar.</p>

          <form className="mt-6 space-y-3" onSubmit={(e) => { e.preventDefault(); entrar(); }}>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">E-mail</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                autoComplete="email" placeholder="voce@email.com"
                className="w-full rounded-input border border-line bg-surface-2 px-3 py-2.5 text-sm text-ink placeholder:text-muted/70 focus:border-accent focus:outline-none" />
            </label>
            <label className="block">
              <span className="mb-1 flex items-center justify-between text-xs font-medium text-muted">
                Senha
                <button type="button" onClick={esqueci} className="font-semibold text-accent hover:underline">Esqueci a senha</button>
              </span>
              <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)}
                autoComplete="current-password" placeholder="••••••••"
                className="w-full rounded-input border border-line bg-surface-2 px-3 py-2.5 text-sm text-ink placeholder:text-muted/70 focus:border-accent focus:outline-none" />
            </label>

            <label className="flex cursor-pointer items-start gap-2 pt-1 text-xs text-muted">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 accent-[var(--accent)]" />
              <span>
                Confirmo que tenho <strong className="text-ink">18 anos ou mais</strong> e li e aceito os{" "}
                <Link href="/termos" className="text-accent underline">Termos</Link> e a{" "}
                <Link href="/privacidade" className="text-accent underline">Política de Privacidade</Link>.
              </span>
            </label>

            <button type="submit" disabled={busy}
              className="w-full rounded-input bg-accent py-2.5 text-sm font-semibold text-white transition-all hover:bg-accent-strong active:scale-[0.98] disabled:opacity-60">
              {loading === "entrar" ? "Entrando…" : "Entrar"}
            </button>
            <button type="button" onClick={cadastrar} disabled={busy}
              className="w-full rounded-input border border-line bg-surface py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-accent-soft disabled:opacity-60">
              {loading === "cadastrar" ? "Criando…" : "Criar conta"}
            </button>
          </form>

          {msg && (
            <p className={`mt-4 rounded-input px-3 py-2 text-sm ${msgType === "error" ? "bg-red-500/15 text-red-300" : "bg-accent-soft text-accent-strong"}`}>
              {msg}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
