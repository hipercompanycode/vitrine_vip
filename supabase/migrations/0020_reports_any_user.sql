-- Denúncia é recurso de segurança: qualquer usuário AUTENTICADO pode denunciar,
-- inclusive anunciantes (que antes ficavam bloqueados pela regra role='comum').
-- Mantém a proteção de só inserir em nome de si mesmo (auth.uid() = user_id).
drop policy if exists "reports_owner_insert" on public.reports;
create policy "reports_owner_insert" on public.reports for insert
  with check (auth.uid() = user_id);
