"use client";
import { useState } from "react";
import { createBrowserClient } from "@/lib/supabase/browser";

export default function LoginPage() {
  const supabase = createBrowserClient();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [msg, setMsg] = useState("");

  async function entrar() {
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    setMsg(error ? error.message : "");
    if (!error) window.location.href = "/perfil";
  }
  async function cadastrar() {
    const { error } = await supabase.auth.signUp({
      email, password: senha,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setMsg(error ? error.message : "Verifique seu e-mail para confirmar.");
  }
  async function google() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <div className="mx-auto max-w-sm p-6 space-y-4">
      <h1 className="text-2xl font-bold">Entrar</h1>
      <input className="w-full border rounded p-2" placeholder="E-mail"
        value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className="w-full border rounded p-2" type="password" placeholder="Senha"
        value={senha} onChange={(e) => setSenha(e.target.value)} />
      <div className="flex gap-2">
        <button className="bg-black text-white rounded p-2 flex-1" onClick={entrar}>Entrar</button>
        <button className="border rounded p-2 flex-1" onClick={cadastrar}>Cadastrar</button>
      </div>
      <button className="w-full border rounded p-2" onClick={google}>Entrar com Google</button>
      {msg && <p className="text-sm text-red-600">{msg}</p>}
    </div>
  );
}
