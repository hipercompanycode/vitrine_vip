-- Verificação por fotos (vídeo desligado até upgrade do Storage).
-- Substitui o vídeo por: foto do rosto + foto de corpo. Documento mantido.
alter table public.verifications
  add column if not exists face_path text,
  add column if not exists body_path text;
