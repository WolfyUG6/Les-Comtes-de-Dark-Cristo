-- Correctif notifications chapitres
-- Objectif :
-- - notifier quand un chapitre devient publie / sort
-- - ne plus notifier lors d'une simple modification d'un chapitre deja publie
-- - eviter les doublons pour un meme lecteur et un meme chapitre

create or replace function public.notifier_sortie_chapitre()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    date_sortie timestamptz;
begin
    if new.est_publie is distinct from true then
        return new;
    end if;

    date_sortie := coalesce(new.date_publication, now());

    -- Si le chapitre etait deja publie et deja visible, une modification ne doit pas notifier.
    if tg_op = 'UPDATE'
        and old.est_publie is true
        and coalesce(old.date_publication, now()) <= now()
    then
        return new;
    end if;

    insert into public.notifications (
        user_id_receveur,
        histoire_id,
        chapitre_id,
        titre_chapitre,
        date_declenchement,
        lu
    )
    select
        f.user_id,
        new.histoire_id,
        new.id,
        new.titre,
        date_sortie,
        false
    from public.favoris f
    where f.histoire_id = new.histoire_id
      and coalesce(f.est_archive, false) = false
      and not exists (
          select 1
          from public.notifications n
          where n.user_id_receveur = f.user_id
            and n.chapitre_id = new.id
      );

    return new;
end;
$$;

-- Supprime uniquement les anciens triggers de notification sur les chapitres
-- si leur nom ou leur fonction contient "notif".
do $$
declare
    trigger_a_supprimer record;
begin
    for trigger_a_supprimer in
        select trigger_name
        from information_schema.triggers
        where event_object_schema = 'public'
          and event_object_table = 'chapitres'
          and (
              trigger_name ilike '%notif%'
              or action_statement ilike '%notif%'
          )
    loop
        execute format(
            'drop trigger if exists %I on public.chapitres',
            trigger_a_supprimer.trigger_name
        );
    end loop;
end $$;

create trigger notifier_sortie_chapitre_apres_sauvegarde
after insert or update on public.chapitres
for each row
execute function public.notifier_sortie_chapitre();
