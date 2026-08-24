"use client";
import { useEffect, useRef, useState } from "react";

// Modal de câmera: abre o stream (getUserMedia), mostra o preview e captura um frame como File JPEG.
// Requer HTTPS (ou localhost). Em falha/negação de permissão, mostra aviso e o usuário fecha e usa "Arquivo".
export default function CameraCapture({
  onCapture,
  onClose,
  facingMode = "environment",
  namePrefix = "foto",
}: {
  onCapture: (file: File) => void;
  onClose: () => void;
  facingMode?: "user" | "environment";
  namePrefix?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<"user" | "environment">(facingMode);
  const [err, setErr] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  useEffect(() => {
    let cancelled = false;
    async function start() {
      setReady(false);
      setErr(null);
      stopStream();
      if (!navigator.mediaDevices?.getUserMedia) {
        setErr("Câmera indisponível neste navegador. Use o envio de arquivo.");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setReady(true);
      } catch {
        setErr("Não foi possível acessar a câmera. Verifique a permissão do navegador ou use o envio de arquivo.");
      }
    }
    start();
    return () => {
      cancelled = true;
      stopStream();
    };
  }, [facing]);

  function capture() {
    const video = videoRef.current;
    if (!video) return;
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `${namePrefix}-${crypto.randomUUID()}.jpg`, { type: "image/jpeg" });
        stopStream();
        onCapture(file);
        onClose();
      },
      "image/jpeg",
      0.9
    );
  }

  function close() {
    stopStream();
    onClose();
  }

  const mirror = facing === "user";

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black/95">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm font-semibold text-white">Tirar foto</span>
        <button type="button" onClick={close} aria-label="Fechar câmera" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center overflow-hidden px-4">
        {err ? (
          <p className="max-w-sm text-center text-sm text-white/80">{err}</p>
        ) : (
          <video
            ref={videoRef}
            playsInline
            muted
            className="max-h-full max-w-full rounded-xl"
            style={mirror ? { transform: "scaleX(-1)" } : undefined}
          />
        )}
      </div>

      <div className="flex items-center justify-center gap-6 px-4 py-6">
        <button
          type="button"
          onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
          aria-label="Trocar câmera"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7h3l2-2h6l2 2h3v12H4V7z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="M9.5 13a2.5 2.5 0 0 1 4.9-.7M14.5 13a2.5 2.5 0 0 1-4.9.7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
        </button>

        <button
          type="button"
          onClick={capture}
          disabled={!ready || !!err}
          aria-label="Capturar"
          className="flex h-18 w-18 items-center justify-center rounded-full bg-white ring-4 ring-white/40 transition-transform active:scale-95 disabled:opacity-40"
          style={{ height: 72, width: 72 }}
        >
          <span className="h-14 w-14 rounded-full bg-accent" style={{ height: 56, width: 56 }} />
        </button>

        <span className="h-12 w-12" aria-hidden="true" />
      </div>
    </div>
  );
}
