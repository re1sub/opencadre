drop policy if exists "Workspaces: authenticated create" on public.workspaces;
create policy "Workspaces: authenticated create" on public.workspaces
  for insert to authenticated
  with check ((select auth.uid()) = owner_id);
