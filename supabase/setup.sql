-- =====================================================================
-- Compte en ligne — lot 1 : sauvegarde automatique.
--
-- À coller UNE fois dans Supabase → SQL Editor → Run. Rejouable sans
-- dégât (chaque objet est recréé à l'identique).
--
-- Ce que ce script garantit : chaque compte ne lit, n'écrit et n'efface
-- QUE son propre dossier `<identifiant du compte>/…` dans le seau privé
-- `sauvegardes`. La clé publique de l'appli ne donne accès à rien d'autre.
-- =====================================================================

-- 1. Le seau : privé, JSON seulement, 10 Mo au plus par fichier.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('sauvegardes', 'sauvegardes', false, 10485760, array['application/json'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 2. Un dossier par compte : le premier segment du chemin = auth.uid().
drop policy if exists "sauvegardes : lire son dossier" on storage.objects;
drop policy if exists "sauvegardes : ajouter dans son dossier" on storage.objects;
drop policy if exists "sauvegardes : remplacer dans son dossier" on storage.objects;
drop policy if exists "sauvegardes : effacer son dossier" on storage.objects;

create policy "sauvegardes : lire son dossier" on storage.objects
  for select to authenticated
  using (bucket_id = 'sauvegardes' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "sauvegardes : ajouter dans son dossier" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'sauvegardes' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "sauvegardes : remplacer dans son dossier" on storage.objects
  for update to authenticated
  using (bucket_id = 'sauvegardes' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'sauvegardes' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "sauvegardes : effacer son dossier" on storage.objects
  for delete to authenticated
  using (bucket_id = 'sauvegardes' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- 3. Supprimer SON compte (droit à l'effacement, RGPD). L'appli efface
--    d'abord les fichiers, puis appelle cette fonction.
create or replace function public.supprimer_mon_compte()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Non connecté';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.supprimer_mon_compte() from public, anon;
grant execute on function public.supprimer_mon_compte() to authenticated;
