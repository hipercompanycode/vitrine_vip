-- "Sem rosto": o admin marca quando a acompanhante anuncia com o rosto borrado
-- ou sem mostrar o rosto. No anúncio aparece um selo informativo — rosto oculto,
-- mas o perfil e as fotos foram verificados (dá confiança sem expor a pessoa).
alter table public.ads add column if not exists face_hidden boolean not null default false;
