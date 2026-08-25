"use client";
import { useEffect, useRef, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/browser";
import CameraCapture from "@/components/CameraCapture";
import { maskCpf, isValidCPF } from "@/lib/cpf";

const MAX_IMG = 15 * 1024 * 1024; // 15 MB

type Kind = "doc" | "face" | "body";

function Slot({ label, hint, done, busy, onPick, onCam }: {
  label: string; hint: string; done: boolean; busy: boolean;
  onPick: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCam: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className={`flex flex-col items-center justify-center gap-1 rounded-card border border-dashed px-4 py-5 text-center transition-colors ${done ? "border-[#1f6b3f] bg-[#0f2a1b]" : "border-line bg-surface-2/40"}`}>
      <span className={`flex h-10 w-10 items-center justify-center rounded-full ${done ? "bg-[#164a2c] text-[#7ee2a8]" : "bg-accent-soft text-accent"}`}>
        {done ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12l4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 16V4M12 4l-4 4M12 4l4 4M5 20h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        )}
      </span>
      <span className="text-sm font-semibold text-ink">{busy ? "Enviando…" : done ? `${label} enviada` : label}</span>
      <span className="text-[11px] text-muted">{hint}</span>
      <div className="mt-2 flex gap-2">
        <button type="button" onClick={() => inputRef.current?.click()} disabled={busy}
          className="inline-flex items-center gap-1 rounded-input border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-accent hover:text-accent disabled:opacity-50">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 16V5M12 5l-4 4M12 5l4 4M5 19h14" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Arquivo
        </button>
        <button type="button" onClick={onCam} disabled={busy}
          className="inline-flex items-center gap-1 rounded-input border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-accent hover:text-accent disabled:opacity-50">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 8h3l1.5-2h7L17 8h3v11H4V8z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><circle cx="12" cy="13" r="3.2" stroke="currentColor" strokeWidth="1.8" /></svg>
          Câmera
        </button>
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onPick} disabled={busy} />
    </div>
  );
}

export default function VerificationUploader({ userId, status: initStatus, hasDoc, hasFace, hasBody, feedback, reverifyReason }: {
  userId: string; status: string | null; hasDoc: boolean; hasFace: boolean; hasBody: boolean; feedback?: string | null; reverifyReason?: string | null;
}) {
  const supabase = createBrowserClient();
  const [docPath, setDocPath] = useState<string | null>(null);
  const [facePath, setFacePath] = useState<string | null>(null);
  const [bodyPath, setBodyPath] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(initStatus);
  const [busy, setBusy] = useState<"" | Kind | "submit">("");
  const [msg, setMsg] = useState("");
  const [cam, setCam] = useState<Kind | null>(null);
  const [cpf, setCpf] = useState("");
  const [code, setCode] = useState("");
  const [today, setToday] = useState("");

  // código aleatório do desafio de vivacidade (papel na selfie) — gerado no mount
  // (fora do render, pra não quebrar a regra de pureza do React).
  useEffect(() => {
    const alphabet = "ACDEFGHJKLMNPQRSTUVWXYZ2345679";
    const arr = new Uint32Array(6);
    crypto.getRandomValues(arr);
    setCode(Array.from(arr, (n) => alphabet[n % alphabet.length]).join(""));
    setToday(new Date().toLocaleDateString("pt-BR"));
  }, []);

  const docDone = !!docPath || hasDoc;
  const faceDone = !!facePath || hasFace;
  const bodyDone = !!bodyPath || hasBody;

  const setters: Record<Kind, (p: string) => void> = { doc: setDocPath, face: setFacePath, body: setBodyPath };
  const facing: Record<Kind, "user" | "environment"> = { doc: "environment", face: "user", body: "user" };

  async function upload(file: File, kind: Kind): Promise<string | null> {
    setBusy(kind); setMsg("");
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${userId}/${kind}-${crypto.randomUUID()}.${ext}`;
    const up = await supabase.storage.from("verifications").upload(path, file, { contentType: file.type, upsert: true });
    setBusy("");
    if (up.error) { setMsg(up.error.message); return null; }
    return path;
  }

  async function handleFile(f: File | undefined | null, kind: Kind) {
    if (!f) return;
    if (!f.type.startsWith("image/")) { setMsg("Envie uma imagem (foto)."); return; }
    if (f.size > MAX_IMG) { setMsg("Imagem acima de 15 MB."); return; }
    const p = await upload(f, kind);
    if (p) setters[kind](p);
  }

  function picker(kind: Kind) {
    return async (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0]; e.target.value = "";
      await handleFile(f, kind);
    };
  }

  async function submit() {
    if (!docPath || !facePath || !bodyPath) { setMsg("Envie o documento, a foto do rosto e a foto de corpo antes de enviar."); return; }
    if (!isValidCPF(cpf)) { setMsg("Informe um CPF válido."); return; }
    if (!code) { setMsg("Aguarde o código do desafio carregar."); return; }
    setBusy("submit");
    const body = new FormData();
    body.set("doc_path", docPath); body.set("face_path", facePath); body.set("body_path", bodyPath);
    body.set("cpf", cpf);
    body.set("liveness_code", code);
    const res = await fetch("/api/verification", { method: "POST", body });
    setBusy("");
    if (!res.ok) { const j = await res.json().catch(() => ({})); setMsg(j.error ?? "Falha ao enviar."); return; }
    setStatus("pending"); setMsg("");
  }

  if (status === "approved") {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-4 shadow-card ring-1 ring-[#43d17f]/15">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#12331f] text-[#43d17f]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12l4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </span>
        <div>
          <p className="font-semibold text-ink">Verificação aprovada</p>
          <p className="text-xs text-muted">Seu selo “Verificada” está ativo.</p>
        </div>
        <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-pill bg-[#12331f] px-2.5 py-1 text-[11px] font-bold text-[#43d17f]">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12l4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>Verificada
        </span>
      </div>
    );
  }

  const canSubmit = !!docPath && !!facePath && !!bodyPath && isValidCPF(cpf);

  return (
    <div className="space-y-3">
      {status === "pending" && (
        <div className="rounded-card border border-accent/40 bg-accent-soft px-4 py-3 text-sm text-accent">Comprovação enviada — em análise. Você recebe o selo assim que aprovarmos.</div>
      )}
      {status === "rejected" && (
        <div className="rounded-card border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <p className="font-semibold">Comprovação recusada. Reenvie o documento e as fotos nítidas.</p>
          {feedback && <p className="mt-1 text-red-200/90"><span className="font-semibold">Motivo:</span> {feedback}</p>}
        </div>
      )}
      {status === "reverify" && (
        <div className="rounded-card border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          <p className="font-semibold">🔐 Reverificação necessária — refaça o documento e a selfie com o novo código abaixo.</p>
          <p className="mt-1 text-amber-100/80">É pra confirmar que é você mesma operando o perfil (anti-golpe/anti-revenda). Seu anúncio fica pausado até refazer.{reverifyReason && <> Motivo: <span className="font-semibold">{reverifyReason}</span>.</>}</p>
        </div>
      )}

      <p className="text-xs text-muted">
        Pra ganhar o selo <strong className="text-ink">Verificada</strong> (e mais confiança), envie: uma foto de um <strong className="text-ink">documento com foto</strong> (RG/CNH), a <strong className="text-ink">selfie segurando o papel com o código</strong> (abaixo) e uma <strong className="text-ink">foto de corpo inteiro com o rosto visível</strong>. Pode <strong className="text-ink">enviar do dispositivo ou tirar na hora pela câmera</strong>. Arquivos <strong className="text-ink">privados</strong> — só a moderação vê, nunca aparecem no anúncio.
      </p>

      <div className="rounded-card border border-accent/40 bg-accent-soft/60 p-3.5">
        <p className="text-sm font-semibold text-ink">🔒 Prova de que é você (anti-fake / anti-IA)</p>
        <p className="mt-1 text-xs text-muted">
          Escreva num papel <strong className="text-ink">exatamente</strong> isto e tire a <strong className="text-ink">selfie segurando o papel</strong>, com o rosto visível:
        </p>
        <div className="mt-2 rounded-input border border-line bg-surface px-3 py-2 text-center font-mono text-lg font-extrabold tracking-widest text-accent">
          {code ? `VITRINE ${code}` : "gerando código…"}
        </div>
        <p className="mt-1.5 text-center text-xs text-muted">+ a data de hoje: <strong className="text-ink">{today || "…"}</strong></p>
        <p className="mt-2 text-[11px] text-muted/80">Esse código é único e muda a cada envio. É assim que garantimos que a foto é real e recente — foto de IA ou roubada não passa.</p>
      </div>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-muted">Seu CPF <span className="text-muted/70">(confere com o documento — privado, só a moderação vê)</span></span>
        <input
          value={cpf}
          onChange={(e) => setCpf(maskCpf(e.target.value))}
          inputMode="numeric"
          placeholder="000.000.000-00"
          className={`w-full rounded-input border bg-surface-2 px-3 py-2.5 text-sm text-ink placeholder:text-muted/70 focus:outline-none ${cpf && !isValidCPF(cpf) ? "border-red-500/60 focus:border-red-500" : "border-line focus:border-accent"}`}
        />
      </label>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Slot label="Documento com foto" hint="RG ou CNH (imagem)" done={docDone} busy={busy === "doc"} onPick={picker("doc")} onCam={() => setCam("doc")} />
        <Slot label="Selfie com o papel" hint="Segurando o papel com o código, rosto visível" done={faceDone} busy={busy === "face"} onPick={picker("face")} onCam={() => setCam("face")} />
        <Slot label="Foto de corpo + rosto" hint="Corpo inteiro com o rosto visível" done={bodyDone} busy={busy === "body"} onPick={picker("body")} onCam={() => setCam("body")} />
      </div>

      <button onClick={submit} disabled={busy === "submit" || !canSubmit}
        className="w-full rounded-input bg-accent py-2.5 text-sm font-bold text-white transition-all hover:bg-accent-strong active:scale-[0.98] disabled:opacity-50">
        {busy === "submit" ? "Enviando…" : "Enviar para verificação"}
      </button>
      {msg && <p className="text-sm text-red-400">{msg}</p>}

      {cam && (
        <CameraCapture
          facingMode={facing[cam]}
          namePrefix={cam}
          onCapture={(file) => handleFile(file, cam)}
          onClose={() => setCam(null)}
        />
      )}
    </div>
  );
}
