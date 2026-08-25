-- Anti-fake / anti-IA:
--  liveness_code: código aleatório que a pessoa escreve num papel na selfie
--    (o admin confere se a selfie mostra esse código + a data — IA não passa).
--  face_hash / body_hash: "impressão digital" perceptual (dHash) das fotos, pra
--    sinalizar quando a MESMA foto aparece em outro perfil (reaproveitada/roubada).
alter table public.verifications add column if not exists liveness_code text;
alter table public.verifications add column if not exists face_hash text;
alter table public.verifications add column if not exists body_hash text;
