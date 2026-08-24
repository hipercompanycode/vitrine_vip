"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabase/browser";
import PasswordInput from "@/components/PasswordInput";

export default function RedefinirSenhaPage() {
  const supabase = createBrowserClient();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [type, setType] = useState<"error" | "info">("info");

  useEffect(() => {
    // O link do e-mail traz o token no hash; o supabase-js cria a sessão de recuperação.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true); });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 6) { setType("error"); setMsg("A senha precisa ter ao menos 6 caracteres."); return; }
    if (pw !== pw2) { setType("error"); setMsg("As senhas não conferem."); return; }
    setBusy(true); setMsg("");
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) { setType("error"); setMsg(error.message); setBusy(false); return; }
    setType("info"); setMsg("Senha alterada! Redirecionando…");
    setTimeout(() => { window.location.href = "/pos-login?next=/"; }, 900);
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 inline-flex items-baseline gap-0.5">
          <span className="font-display text-2xl font-extrabold tracking-tight text-ink">vitrine<span className="text-accent">vip</span></span>
          <span className="h-2 w-2 rounded-full bg-accent" />
        </Link>

        <div className="rounded-card border border-line bg-surface p-6 shadow-card sm:p-8">
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">Nova senha</h1>
          <p className="mt-1 text-sm text-muted">Defina uma nova senha para sua conta.</p>

          {!ready ? (
            <p className="mt-6 rounded-input bg-surface-2 px-3 py-3 text-sm text-muted">
              Validando o link… Se você não veio pelo e-mail de redefinição, volte ao{" "}
              <Link href="/login" className="text-accent underline">login</Link> e clique em “Esqueci a senha”.
            </p>
          ) : (
            <form onSubmit={salvar} className="mt-6 space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted">Nova senha</span>
                <PasswordInput value={pw} onChange={(e) => setPw(e.target.value)}
                  autoComplete="new-password" placeholder="••••••••"
                  className="w-full rounded-input border border-line bg-surface-2 px-3 py-2.5 text-sm text-ink placeholder:text-muted/70 focus:border-accent focus:outline-none" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted">Confirmar senha</span>
                <PasswordInput value={pw2} onChange={(e) => setPw2(e.target.value)}
                  autoComplete="new-password" placeholder="••••••••"
                  className="w-full rounded-input border border-line bg-surface-2 px-3 py-2.5 text-sm text-ink placeholder:text-muted/70 focus:border-accent focus:outline-none" />
              </label>
              <button type="submit" disabled={busy}
                className="w-full rounded-input bg-accent py-2.5 text-sm font-semibold text-white transition-all hover:bg-accent-strong active:scale-[0.98] disabled:opacity-60">
                {busy ? "Salvando…" : "Salvar nova senha"}
              </button>
            </form>
          )}

          {msg && (
            <p className={`mt-4 rounded-input px-3 py-2 text-sm ${type === "error" ? "bg-red-500/15 text-red-300" : "bg-accent-soft text-accent-strong"}`}>{msg}</p>
          )}
        </div>
      </div>
    </main>
  );
}
