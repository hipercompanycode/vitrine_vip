"use client";
import { useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabase/browser";
import PasswordInput from "@/components/PasswordInput";
import BirthdateInput from "@/components/BirthdateInput";
import ReferralInput from "@/components/ReferralInput";

// destino após login (?next=/perfil), lido na hora do redirecionamento
function proximoDestino(): string {
  if (typeof window === "undefined") return "/";
  const n = new URLSearchParams(window.location.search).get("next");
  return n && n.startsWith("/") ? n : "/";
}

// Traduz erros do Supabase (inglês/técnico) para PT amigável.
function amigavel(raw?: string): string {
  const m = (raw ?? "").toLowerCase();
  if (m.includes("invalid login")) return "E-mail ou senha incorretos.";
  if (m.includes("already registered") || m.includes("already been registered") || m.includes("already exists"))
    return "Esse e-mail já tem uma conta. Tente entrar.";
  if (m.includes("password should be at least") || m.includes("at least 6")) return "A senha precisa ter pelo menos 6 caracteres.";
  if (m.includes("unable to validate email") || m.includes("invalid email") || m.includes("invalid format"))
    return "Digite um e-mail válido.";
  if (m.includes("email not confirmed")) return "Confirme seu e-mail antes de entrar (veja sua caixa de entrada).";
  if (m.includes("rate limit") || m.includes("too many") || m.includes("seconds")) return "Muitas tentativas. Aguarde um instante e tente de novo.";
  return "Não foi possível concluir agora. Tente novamente.";
}

const inputCls =
  "w-full rounded-input border border-line bg-surface-2 px-3 py-2.5 text-sm text-ink placeholder:text-muted/70 focus:border-accent focus:outline-none";

export default function LoginPage() {
  const supabase = createBrowserClient();
  const [mode, setMode] = useState<"entrar" | "criar">("entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [nasc, setNasc] = useState("");
  const [agree, setAgree] = useState(false);
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState<"error" | "info">("info");
  const [loading, setLoading] = useState(false);

  function trocar(m: "entrar" | "criar") {
    setMode(m);
    setMsg("");
  }

  function erro(texto: string) {
    setMsgType("error");
    setMsg(texto);
  }

  async function esqueci() {
    if (!email) return erro("Digite seu e-mail primeiro.");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });
    if (error) return erro(amigavel(error.message));
    setMsgType("info");
    setMsg("Enviamos um link de redefinição pro seu e-mail. Verifique sua caixa de entrada.");
  }

  async function entrar() {
    if (!email || !senha) return erro("Preencha e-mail e senha.");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) {
      erro(amigavel(error.message));
      setLoading(false);
      return;
    }
    window.location.href = `/pos-login?next=${encodeURIComponent(proximoDestino())}`;
  }

  async function criar() {
    if (!email.includes("@")) return erro("Digite um e-mail válido.");
    if (senha.length < 6) return erro("A senha precisa ter pelo menos 6 caracteres.");
    if (senha !== confirmar) return erro("As senhas não conferem. Digite a mesma nos dois campos.");
    if (!nasc) return erro("Informe sua data de nascimento.");
    {
      const d = new Date(`${nasc}T00:00:00`);
      if (Number.isNaN(d.getTime()) || d > new Date()) return erro("Informe uma data de nascimento válida.");
    }
    if (!agree) return erro("Confirme que você tem 18 anos ou mais e aceita os Termos e a Política de Privacidade.");

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: { data: { role: "comum", birthdate: nasc }, emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      erro(amigavel(error.message));
      setLoading(false);
      return;
    }
    if (data.session) {
      window.location.href = `/pos-login?next=${encodeURIComponent(proximoDestino())}`;
      return;
    }
    setMsgType("info");
    setMsg("Enviamos um e-mail de confirmação. Verifique sua caixa de entrada para ativar a conta.");
    setLoading(false);
  }

  const criando = mode === "criar";

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 inline-flex items-baseline gap-0.5">
          <span className="font-display text-2xl font-extrabold tracking-tight text-ink">vitrine<span className="text-accent">vip</span></span>
          <span className="h-2 w-2 rounded-full bg-accent" />
        </Link>

        <div className="rounded-card border border-line bg-surface p-6 shadow-card sm:p-8">
          {/* abas */}
          <div className="mb-6 grid grid-cols-2 gap-1 rounded-pill border border-line bg-surface-2 p-1">
            <button type="button" onClick={() => trocar("entrar")}
              className={`rounded-pill py-2 text-sm font-semibold transition-colors ${!criando ? "bg-accent text-white" : "text-muted hover:text-ink"}`}>
              Entrar
            </button>
            <button type="button" onClick={() => trocar("criar")}
              className={`rounded-pill py-2 text-sm font-semibold transition-colors ${criando ? "bg-accent text-white" : "text-muted hover:text-ink"}`}>
              Criar conta
            </button>
          </div>

          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">
            {criando ? "Criar sua conta" : "Entrar"}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {criando ? "É rápido. Depois de entrar, toque em “Anunciar” para criar seu anúncio." : "Bem-vindo de volta."}
          </p>

          <form className="mt-6 space-y-3" onSubmit={(e) => { e.preventDefault(); if (criando) { criar(); } else { entrar(); } }}>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">E-mail</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                autoComplete="email" placeholder="voce@email.com" className={inputCls} />
            </label>

            <label className="block">
              <span className="mb-1 flex items-center justify-between text-xs font-medium text-muted">
                Senha
                {!criando && (
                  <button type="button" onClick={esqueci} className="font-semibold text-accent hover:underline">Esqueci a senha</button>
                )}
              </span>
              <PasswordInput value={senha} onChange={(e) => setSenha(e.target.value)}
                autoComplete={criando ? "new-password" : "current-password"}
                placeholder={criando ? "Crie uma senha (mín. 6 caracteres)" : "••••••••"} className={inputCls} />
            </label>

            {criando && (
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted">Conferir senha</span>
                <PasswordInput value={confirmar} onChange={(e) => setConfirmar(e.target.value)}
                  autoComplete="new-password" placeholder="Digite a senha de novo" className={inputCls} />
              </label>
            )}

            {criando && (
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted">Data de nascimento</span>
                <BirthdateInput onIso={setNasc} className={inputCls} />
                <span className="mt-1 block text-[11px] text-muted">Usada para confirmar que você é maior de 18. Não aparece no seu perfil público.</span>
              </label>
            )}

            {criando && <ReferralInput inputClassName={inputCls} />}

            {criando && (
              <label className="flex cursor-pointer items-start gap-3 rounded-input border border-line bg-surface-2 p-3.5 text-sm text-muted transition-colors hover:border-accent/50">
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)}
                  className="mt-0.5 h-6 w-6 shrink-0 accent-[var(--accent)]" />
                <span className="leading-snug">
                  Confirmo que tenho <strong className="text-ink">18 anos ou mais</strong> e li e aceito os{" "}
                  <Link href="/termos" className="text-accent underline">Termos</Link> e a{" "}
                  <Link href="/privacidade" className="text-accent underline">Política de Privacidade</Link>.
                </span>
              </label>
            )}

            <button type="submit" disabled={loading}
              className="w-full rounded-input bg-accent py-3 text-sm font-bold text-white transition-all hover:bg-accent-strong active:scale-[0.98] disabled:opacity-60">
              {loading ? (criando ? "Criando…" : "Entrando…") : (criando ? "Criar conta" : "Entrar")}
            </button>
          </form>

          {msg && (
            <p className={`mt-4 rounded-input px-3 py-2 text-sm ${msgType === "error" ? "bg-red-500/15 text-red-300" : "bg-accent-soft text-accent-strong"}`}>
              {msg}
            </p>
          )}

          <p className="mt-5 text-center text-sm text-muted">
            {criando ? (
              <>Já tem conta?{" "}
                <button type="button" onClick={() => trocar("entrar")} className="font-semibold text-accent hover:underline">Entrar</button>
              </>
            ) : (
              <>Não tem conta?{" "}
                <button type="button" onClick={() => trocar("criar")} className="font-semibold text-accent hover:underline">Criar conta</button>
              </>
            )}
          </p>
        </div>
      </div>
    </main>
  );
}
