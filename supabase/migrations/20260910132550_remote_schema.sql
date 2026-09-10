-- Migration unit 1: schema_changes
-- Transaction mode: transactional
-- Boundary reason: default

SET check_function_bodies = false;

DROP EXTENSION pg_net;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE UPDATE ON SEQUENCES FROM anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE UPDATE ON SEQUENCES FROM authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE UPDATE ON SEQUENCES FROM service_role;

CREATE TYPE public.notification_type AS ENUM (
  'mention',
  'comment'
);

CREATE FUNCTION public.accept_invite (
  token uuid
)
  RETURNS uuid
  LANGUAGE sql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  with linked as (
    update public.workspace_members
    set user_id = auth.uid(),
        invite_token = null
    where public.workspace_members.invite_token = token
      and public.workspace_members.user_id is null
      and public.workspace_members.email = (
        select u.email from auth.users u where u.id = auth.uid()
      )
    returning workspace_id
  )
  select workspace_id from linked;
$function$;

REVOKE ALL ON FUNCTION public.accept_invite(uuid) FROM PUBLIC;

GRANT ALL ON FUNCTION public.accept_invite(uuid) TO authenticated;

CREATE FUNCTION public.bump_page_content_version()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
begin
  new.version = coalesce(old.version, 0) + 1;
  return new;
end;
$function$;

CREATE FUNCTION public.create_mention_notification (
  p_page_id      uuid,
  p_recipient_id uuid,
  p_page_title   text DEFAULT NULL::text,
  p_excerpt      text DEFAULT NULL::text
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_actor_id uuid;
  v_workspace_id uuid;
  v_actor_member boolean;
  v_recipient_member boolean;
  v_actor_name text;
  v_title text;
begin
  v_actor_id := auth.uid();
  if v_actor_id is null then
    raise exception 'not authenticated';
  end if;

  -- No self-notifications.
  if p_recipient_id = v_actor_id then
    return;
  end if;

  -- Resolve workspace from the page the mention appears in.
  select p.workspace_id into v_workspace_id
    from public.pages p where p.id = p_page_id;
  if v_workspace_id is null then
    return;
  end if;

  -- Caller must be a member of the workspace.
  select exists(
    select 1 from public.workspace_members wm
    where wm.workspace_id = v_workspace_id and wm.user_id = v_actor_id
  ) into v_actor_member;
  if not v_actor_member then
    raise exception 'caller is not a workspace member';
  end if;

  -- Recipient must be a confirmed member of the workspace.
  select exists(
    select 1 from public.workspace_members wm
    where wm.workspace_id = v_workspace_id and wm.user_id = p_recipient_id
  ) into v_recipient_member;
  if not v_recipient_member then
    return;
  end if;

  -- Recipient must not have disabled mentions.
  if exists(
    select 1 from public.user_settings us
    where us.user_id = p_recipient_id
      and us.notifications is not null
      and coalesce(us.notifications ->> 'mentions', 'true') = 'false'
  ) then
    return;
  end if;

  select coalesce(pr.display_name, pr.id::text) into v_actor_name
    from public.profiles pr where pr.id = v_actor_id;
  if v_actor_name is null then
    v_actor_name := v_actor_id::text;
  end if;

  v_title := v_actor_name || ' mentioned you in ' || coalesce(nullif(p_page_title, ''), 'a page');

  insert into public.notifications (
    user_id, type, actor_id, workspace_id,
    entity_type, entity_id, page_id, title, body
  ) values (
    p_recipient_id,
    'mention',
    v_actor_id,
    v_workspace_id,
    'page',
    p_page_id,
    p_page_id,
    v_title,
    p_excerpt
  );
end;
$function$;

REVOKE ALL ON FUNCTION public.create_mention_notification(uuid, uuid, text, text) FROM PUBLIC;

GRANT ALL ON FUNCTION public.create_mention_notification(uuid, uuid, text, text) TO authenticated;

CREATE FUNCTION public.delete_user_account (
  p_user_id uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public', 'auth'
  AS $function$
begin
  -- Release page ownership. pages.owner_id -> auth.users is NO ACTION and
  -- blocks user deletion, so drop the link for pages in workspaces owned by
  -- other users. Pages in workspaces owned by this user are removed by the
  -- cascades triggered below.
  update public.pages
     set owner_id = null
   where owner_id = p_user_id;

  -- Personal data belonging to the user.
  delete from public.comment_reactions where user_id = p_user_id;
  delete from public.comments where author_id = p_user_id;
  delete from public.page_visits where user_id = p_user_id;
  delete from public.ai_requests where user_id = p_user_id;
  delete from public.activity_logs where user_id = p_user_id;
  delete from public.notifications where user_id = p_user_id or actor_id = p_user_id;
  delete from public.user_settings where user_id = p_user_id;
  delete from public.workspace_members where user_id = p_user_id;
  delete from public.profiles where id = p_user_id;

  -- Delete the auth user. Cascades remove owned workspaces (and their pages,
  -- tags, members, ydocs, visits, activity logs), sessions, identities, etc.
  -- Runs inside this same transaction, so any failure rolls everything back.
  delete from auth.users where id = p_user_id;

  if not found then
    raise exception 'user not found' using errcode = 'P0001';
  end if;
end;
$function$;

REVOKE ALL ON FUNCTION public.delete_user_account(uuid) FROM PUBLIC;

GRANT ALL ON FUNCTION public.delete_user_account(uuid) TO service_role;

CREATE FUNCTION public.get_invite_details (
  p_token uuid
)
  RETURNS TABLE (
    workspace_id   uuid,
    workspace_name text,
    email          text,
    role           text
  )
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select w.id, w.name, m.email, m.role
  from public.workspace_members m
  join public.workspaces w on w.id = m.workspace_id
  where m.invite_token = p_token
    and m.user_id is null
  limit 1;
$function$;

REVOKE ALL ON FUNCTION public.get_invite_details(uuid) FROM PUBLIC;

GRANT ALL ON FUNCTION public.get_invite_details(uuid) TO anon;

GRANT ALL ON FUNCTION public.get_invite_details(uuid) TO authenticated;

GRANT ALL ON FUNCTION public.get_invite_details(uuid) TO service_role;

CREATE FUNCTION public.get_user_role (
  workspace_id uuid,
  user_id      uuid
)
  RETURNS text
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select role
  from public.workspace_members
  where public.workspace_members.workspace_id = workspace_id
    and public.workspace_members.user_id = user_id;
$function$;

REVOKE ALL ON FUNCTION public.get_user_role(uuid, uuid) FROM PUBLIC;

GRANT ALL ON FUNCTION public.get_user_role(uuid, uuid) TO authenticated;

CREATE FUNCTION public.handle_comment_notifications()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_workspace_id uuid;
  v_entity_type text;
  v_entity_id uuid;
  v_page_id uuid;
  v_page_title text;
  v_actor_name text;
  v_member record;
  v_prefs jsonb;
  v_mentioned_ids uuid[];
begin
  -- Resolve workspace + entity from the comment's thread.
  select ct.entity_type, ct.entity_id
    into v_entity_type, v_entity_id
    from public.comment_threads ct
   where ct.id = new.thread_id;

  if v_entity_type is null then
    return new;
  end if;

  if v_entity_type = 'page' then
    v_page_id := v_entity_id;
    select p.workspace_id, p.title into v_workspace_id, v_page_title
      from public.pages p where p.id = v_entity_id;
  elsif v_entity_type = 'card' then
    select c.page_id into v_page_id from public.cards c where c.id = v_entity_id;
    select p.workspace_id, p.title into v_workspace_id, v_page_title
      from public.pages p where p.id = v_page_id;
  else
    return new;
  end if;

  if v_workspace_id is null then
    return new;
  end if;

  -- Collect users mentioned in the comment; they receive a dedicated mention
  -- notification via create_mention_notification, so skip them here.
  select coalesce(array_agg((t.match_arr)[1]::uuid), '{}'::uuid[])
    into v_mentioned_ids
    from regexp_matches(new.content, 'mention:([0-9a-fA-F-]{36})', 'g') as t(match_arr);

  -- Actor display name.
  select coalesce(pr.display_name, pr.id::text) into v_actor_name
    from public.profiles pr where pr.id = new.author_id;
  if v_actor_name is null then
    v_actor_name := new.author_id::text;
  end if;

  -- Fan out to every confirmed member except the author and mentioned users.
  for v_member in
    select wm.user_id
      from public.workspace_members wm
     where wm.workspace_id = v_workspace_id
       and wm.user_id is not null
       and wm.user_id <> new.author_id
    loop
      if v_member.user_id = any(v_mentioned_ids) then
        continue;
      end if;

      select us.notifications into v_prefs
        from public.user_settings us
       where us.user_id = v_member.user_id;

      -- null prefs = default on; only explicit 'false' suppresses.
      if v_prefs is null or coalesce(v_prefs ->> 'comments', 'true') <> 'false' then
        insert into public.notifications (
          user_id, type, actor_id, workspace_id,
          entity_type, entity_id, page_id, title, body
        ) values (
          v_member.user_id,
          'comment',
          new.author_id,
          v_workspace_id,
          v_entity_type,
          v_entity_id,
          v_page_id,
          v_actor_name || ' commented on ' || coalesce(nullif(v_page_title, ''), 'a page'),
          left(nullif(btrim(new.content), ''), 300)
        );
      end if;
    end loop;

  return new;
end;
$function$;

REVOKE ALL ON FUNCTION public.handle_comment_notifications() FROM PUBLIC;

CREATE FUNCTION public.handle_new_user()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  insert into public.profiles (id, display_name)
  values (new.id, nullif(new.raw_user_meta_data ->> 'display_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$function$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;

CREATE FUNCTION public.is_workspace_member (
  workspace_id uuid,
  user_id      uuid
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select exists (
    select 1
    from public.workspace_members
    where public.workspace_members.workspace_id = workspace_id
      and public.workspace_members.user_id = user_id
  );
$function$;

REVOKE ALL ON FUNCTION public.is_workspace_member(uuid, uuid) FROM PUBLIC;

GRANT ALL ON FUNCTION public.is_workspace_member(uuid, uuid) TO authenticated;

CREATE FUNCTION public.is_workspace_owner_or_admin (
  ws_id uuid,
  uid   uuid
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = ws_id
      and user_id = uid
      and role in ('owner','admin')
  );
$function$;

CREATE FUNCTION public.lookup_confirmed_user_id (
  p_email text
)
  RETURNS uuid
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select id
  from auth.users
  where lower(email) = lower(p_email)
    and email_confirmed_at is not null
  limit 1;
$function$;

REVOKE ALL ON FUNCTION public.lookup_confirmed_user_id(text) FROM PUBLIC;

GRANT ALL ON FUNCTION public.lookup_confirmed_user_id(text) TO authenticated;

GRANT ALL ON FUNCTION public.lookup_confirmed_user_id(text) TO service_role;

CREATE FUNCTION public.mark_notifications_read()
  RETURNS void
  LANGUAGE sql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  update public.notifications
     set read_at = now()
   where user_id = auth.uid()
     and read_at is null;
$function$;

REVOKE ALL ON FUNCTION public.mark_notifications_read() FROM PUBLIC;

GRANT ALL ON FUNCTION public.mark_notifications_read() TO authenticated;

CREATE FUNCTION public.rls_auto_enable()
  RETURNS event_trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'pg_catalog'
  AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$;

CREATE FUNCTION public.sync_profile_display_name()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  if new.raw_user_meta_data is distinct from old.raw_user_meta_data then
    update public.profiles
    set display_name = nullif(new.raw_user_meta_data ->> 'display_name', ''),
        updated_at = now()
    where id = new.id;
  end if;
  return new;
end;
$function$;

CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_display_name();

REVOKE ALL ON FUNCTION public.sync_profile_display_name() FROM PUBLIC;

CREATE FUNCTION public.update_updated_at()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

CREATE TABLE public.activity_logs (
  id           uuid                     DEFAULT extensions.uuid_generate_v4() NOT NULL,
  workspace_id uuid                     NOT NULL,
  user_id      uuid,
  action       text                     NOT NULL,
  entity_type  text                     NOT NULL,
  entity_id    uuid,
  metadata     jsonb                    DEFAULT '{}'::jsonb,
  created_at   timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.activity_logs
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.activity_logs
  ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (id);

ALTER TABLE public.activity_logs
  ADD CONSTRAINT activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

GRANT ALL ON public.activity_logs TO anon;

GRANT ALL ON public.activity_logs TO authenticated;

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.activity_logs TO service_role;

CREATE INDEX idx_activity_logs_created_at ON public.activity_logs (created_at);

CREATE INDEX idx_activity_logs_workspace_id ON public.activity_logs (workspace_id);

CREATE POLICY "Activity logs: members read" ON public.activity_logs
  FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Activity logs: system insert" ON public.activity_logs
  FOR INSERT
  WITH CHECK (true);

CREATE TABLE public.ai_requests (
  id          uuid                     DEFAULT extensions.uuid_generate_v4() NOT NULL,
  user_id     uuid                     NOT NULL,
  page_id     uuid,
  card_id     uuid,
  model       text                     NOT NULL,
  prompt      text                     NOT NULL,
  response    text,
  tokens_used integer,
  created_at  timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.ai_requests
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.ai_requests
  ADD CONSTRAINT ai_requests_pkey PRIMARY KEY (id);

ALTER TABLE public.ai_requests
  ADD CONSTRAINT ai_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

GRANT ALL ON public.ai_requests TO anon;

GRANT ALL ON public.ai_requests TO authenticated;

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.ai_requests TO service_role;

CREATE INDEX idx_ai_requests_user_id ON public.ai_requests (user_id);

CREATE POLICY "AI requests: own insert" ON public.ai_requests
  FOR INSERT
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "AI requests: own read" ON public.ai_requests
  FOR SELECT
  USING ((auth.uid() = user_id));

CREATE TABLE public.card_tags (
  id         uuid                     DEFAULT extensions.uuid_generate_v4() NOT NULL,
  card_id    uuid                     NOT NULL,
  tag_id     uuid                     NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.card_tags
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.card_tags
  ADD CONSTRAINT card_tags_card_id_tag_id_key UNIQUE (card_id, tag_id);

ALTER TABLE public.card_tags
  ADD CONSTRAINT card_tags_pkey PRIMARY KEY (id);

GRANT ALL ON public.card_tags TO anon;

GRANT ALL ON public.card_tags TO authenticated;

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.card_tags TO service_role;

CREATE INDEX idx_card_tags_card_id ON public.card_tags (card_id);

CREATE INDEX idx_card_tags_tag_id ON public.card_tags (tag_id);

CREATE TABLE public.cards (
  id           uuid                     DEFAULT extensions.uuid_generate_v4() NOT NULL,
  column_id    uuid                     NOT NULL,
  page_id      uuid                     NOT NULL,
  title        text                     NOT NULL,
  description  text,
  "position"   integer                  DEFAULT 0 NOT NULL,
  due_date     timestamp with time zone,
  assignee_ids uuid[]                   DEFAULT ARRAY[]::uuid[],
  created_at   timestamp with time zone DEFAULT now() NOT NULL,
  updated_at   timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.cards
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.cards
  ADD CONSTRAINT cards_pkey PRIMARY KEY (id);

ALTER TABLE public.ai_requests
  ADD CONSTRAINT ai_requests_card_id_fkey FOREIGN KEY (card_id) REFERENCES public.cards(id) ON DELETE SET NULL;

ALTER TABLE public.card_tags
  ADD CONSTRAINT card_tags_card_id_fkey FOREIGN KEY (card_id) REFERENCES public.cards(id) ON DELETE CASCADE;

GRANT ALL ON public.cards TO anon;

GRANT ALL ON public.cards TO authenticated;

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.cards TO service_role;

CREATE INDEX idx_cards_column_id ON public.cards (column_id);

CREATE INDEX idx_cards_page_id ON public.cards (page_id);

CREATE INDEX idx_cards_assignee_ids ON public.cards USING gin (assignee_ids);

CREATE TRIGGER update_cards_updated_at
  BEFORE UPDATE ON public.cards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE public.columns (
  id         uuid                     DEFAULT extensions.uuid_generate_v4() NOT NULL,
  page_id    uuid                     NOT NULL,
  title      text                     NOT NULL,
  "position" integer                  DEFAULT 0 NOT NULL,
  color      text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.columns
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.columns
  ADD CONSTRAINT columns_pkey PRIMARY KEY (id);

ALTER TABLE public.cards
  ADD CONSTRAINT cards_column_id_fkey FOREIGN KEY (column_id) REFERENCES public.columns(id) ON DELETE CASCADE;

GRANT ALL ON public.columns TO anon;

GRANT ALL ON public.columns TO authenticated;

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.columns TO service_role;

CREATE INDEX idx_columns_page_id ON public.columns (page_id);

CREATE TRIGGER update_columns_updated_at
  BEFORE UPDATE ON public.columns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE public.comment_reactions (
  id         uuid                     DEFAULT gen_random_uuid() NOT NULL,
  comment_id uuid                     NOT NULL,
  user_id    uuid                     NOT NULL,
  reaction   text                     NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.comment_reactions
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.comment_reactions
  ADD CONSTRAINT comment_reactions_comment_id_user_id_reaction_key UNIQUE (comment_id, user_id, reaction);

ALTER TABLE public.comment_reactions
  ADD CONSTRAINT comment_reactions_pkey PRIMARY KEY (id);

ALTER TABLE public.comment_reactions
  ADD CONSTRAINT comment_reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON public.comment_reactions TO anon;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON public.comment_reactions TO authenticated;

GRANT ALL ON public.comment_reactions TO service_role;

CREATE POLICY "Comment reactions: own delete" ON public.comment_reactions
  FOR DELETE
  USING ((auth.uid() = user_id));

CREATE POLICY "Comment reactions: own insert" ON public.comment_reactions
  FOR INSERT
  WITH CHECK ((auth.uid() = user_id));

CREATE TABLE public.comment_threads (
  id          uuid                     DEFAULT extensions.uuid_generate_v4() NOT NULL,
  created_at  timestamp with time zone DEFAULT now() NOT NULL,
  entity_type text                     NOT NULL,
  entity_id   uuid                     NOT NULL
);

ALTER TABLE public.comment_threads
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.comment_threads
  ADD CONSTRAINT comment_threads_entity_type_check CHECK (entity_type = ANY (ARRAY['page'::text, 'card'::text]));

ALTER TABLE public.comment_threads
  ADD CONSTRAINT comment_threads_pkey PRIMARY KEY (id);

GRANT ALL ON public.comment_threads TO anon;

GRANT ALL ON public.comment_threads TO authenticated;

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comment_threads TO service_role;

CREATE INDEX comment_threads_entity_idx ON public.comment_threads (entity_type, entity_id);

CREATE POLICY "Comment threads: authenticated create" ON public.comment_threads
  FOR INSERT
  WITH CHECK ((auth.uid() IS NOT NULL));

CREATE TABLE public.comments (
  id         uuid                     DEFAULT extensions.uuid_generate_v4() NOT NULL,
  thread_id  uuid                     NOT NULL,
  author_id  uuid                     NOT NULL,
  content    text                     NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE POLICY "Comment reactions: members read" ON public.comment_reactions
  FOR SELECT
  USING ((EXISTS ( SELECT 1
   FROM public.comments co
  WHERE (co.id = comment_reactions.comment_id))));

ALTER TABLE public.comments
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.comments
  ADD CONSTRAINT comments_author_id_fkey FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.comments
  ADD CONSTRAINT comments_pkey PRIMARY KEY (id);

ALTER TABLE public.comment_reactions
  ADD CONSTRAINT comment_reactions_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.comments(id) ON DELETE CASCADE;

ALTER TABLE public.comments
  ADD CONSTRAINT comments_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.comment_threads(id) ON DELETE CASCADE;

GRANT ALL ON public.comments TO anon;

GRANT ALL ON public.comments TO authenticated;

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.comments TO service_role;

CREATE INDEX idx_comments_thread_id ON public.comments (thread_id);

CREATE INDEX idx_comments_author_id ON public.comments (author_id);

CREATE TRIGGER trg_comment_notifications
  AFTER INSERT ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_comment_notifications();

CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE POLICY "Comments: authenticated create" ON public.comments
  FOR INSERT
  WITH CHECK ((auth.uid() = author_id));

CREATE POLICY "Comments: author delete" ON public.comments
  FOR DELETE
  USING ((auth.uid() = author_id));

CREATE POLICY "Comments: author update" ON public.comments
  FOR UPDATE
  USING ((auth.uid() = author_id));

CREATE TABLE public.notifications (
  id           uuid                     DEFAULT gen_random_uuid() NOT NULL,
  user_id      uuid                     NOT NULL,
  type         public.notification_type NOT NULL,
  actor_id     uuid,
  workspace_id uuid                     NOT NULL,
  entity_type  text                     NOT NULL,
  entity_id    uuid                     NOT NULL,
  page_id      uuid,
  title        text                     NOT NULL,
  body         text,
  data         jsonb                    DEFAULT '{}'::jsonb NOT NULL,
  read_at      timestamp with time zone,
  created_at   timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.notifications
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.notifications TO anon;

GRANT ALL ON public.notifications TO authenticated;

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.notifications TO service_role;

CREATE INDEX notifications_user_created_idx ON public.notifications (user_id, created_at DESC);

CREATE INDEX notifications_user_unread_idx ON public.notifications (user_id)
  WHERE read_at IS NULL;

CREATE POLICY "Notifications: delete own" ON public.notifications
  FOR DELETE
  TO authenticated
  USING ((auth.uid() = user_id));

CREATE POLICY "Notifications: mark own read" ON public.notifications
  FOR UPDATE
  TO authenticated
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Notifications: read own" ON public.notifications
  FOR SELECT
  TO authenticated
  USING ((auth.uid() = user_id));

CREATE TABLE public.page_content (
  id         uuid                     DEFAULT extensions.uuid_generate_v4() NOT NULL,
  page_id    uuid                     NOT NULL,
  content    jsonb                    DEFAULT '{}'::jsonb NOT NULL,
  version    integer                  DEFAULT 1 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.page_content
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.page_content
  ADD CONSTRAINT page_content_page_id_key UNIQUE (page_id);

ALTER TABLE public.page_content
  ADD CONSTRAINT page_content_pkey PRIMARY KEY (id);

GRANT ALL ON public.page_content TO anon;

GRANT ALL ON public.page_content TO authenticated;

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.page_content TO service_role;

CREATE TRIGGER bump_page_content_version
  BEFORE UPDATE ON public.page_content
  FOR EACH ROW
  EXECUTE FUNCTION public.bump_page_content_version();

CREATE TRIGGER update_page_content_updated_at
  BEFORE UPDATE ON public.page_content
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE public.page_visits (
  id           uuid                     DEFAULT extensions.uuid_generate_v4() NOT NULL,
  user_id      uuid                     NOT NULL,
  page_id      uuid                     NOT NULL,
  workspace_id uuid                     NOT NULL,
  viewed_at    timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.page_visits
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.page_visits
  ADD CONSTRAINT page_visits_pkey PRIMARY KEY (id);

ALTER TABLE public.page_visits
  ADD CONSTRAINT page_visits_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.page_visits
  ADD CONSTRAINT page_visits_user_id_page_id_key UNIQUE (user_id, page_id);

GRANT ALL ON public.page_visits TO anon;

GRANT ALL ON public.page_visits TO authenticated;

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.page_visits TO service_role;

CREATE INDEX page_visits_page_id_idx ON public.page_visits (page_id);

CREATE INDEX page_visits_user_workspace_viewed_idx ON public.page_visits (user_id, workspace_id, viewed_at DESC);

CREATE POLICY page_visits_delete_own ON public.page_visits
  FOR DELETE
  TO authenticated
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY page_visits_insert_own ON public.page_visits
  FOR INSERT
  TO authenticated
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY page_visits_select_own ON public.page_visits
  FOR SELECT
  TO authenticated
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY page_visits_update_own ON public.page_visits
  FOR UPDATE
  TO authenticated
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

CREATE TABLE public.pages (
  id           uuid                     DEFAULT extensions.uuid_generate_v4() NOT NULL,
  workspace_id uuid                     NOT NULL,
  title        text                     DEFAULT 'Untitled'::text NOT NULL,
  kind         text                     NOT NULL,
  icon         text,
  is_favorite  boolean                  DEFAULT false NOT NULL,
  is_deleted   boolean                  DEFAULT false NOT NULL,
  deleted_at   timestamp with time zone,
  created_at   timestamp with time zone DEFAULT now() NOT NULL,
  updated_at   timestamp with time zone DEFAULT now() NOT NULL,
  "position"   integer                  DEFAULT 0,
  owner_id     uuid
);

CREATE POLICY "Card tags: member delete" ON public.card_tags
  FOR DELETE
  USING ((public.get_user_role(( SELECT p.workspace_id
   FROM (public.pages p
     JOIN public.cards c ON ((c.page_id = p.id)))
  WHERE (c.id = card_tags.card_id)), auth.uid()) = ANY (ARRAY['owner'::text, 'admin'::text, 'member'::text])));

CREATE POLICY "Card tags: member insert" ON public.card_tags
  FOR INSERT
  WITH CHECK ((public.get_user_role(( SELECT p.workspace_id
   FROM (public.pages p
     JOIN public.cards c ON ((c.page_id = p.id)))
  WHERE (c.id = card_tags.card_id)), auth.uid()) = ANY (ARRAY['owner'::text, 'admin'::text, 'member'::text])));

CREATE POLICY "Card tags: members read" ON public.card_tags
  FOR SELECT
  USING (public.is_workspace_member(( SELECT p.workspace_id
   FROM (public.pages p
     JOIN public.cards c ON ((c.page_id = p.id)))
  WHERE (c.id = card_tags.card_id)), auth.uid()));

CREATE POLICY "Cards: member delete" ON public.cards
  FOR DELETE
  USING ((public.get_user_role(( SELECT pages.workspace_id
   FROM public.pages
  WHERE (pages.id = cards.page_id)), auth.uid()) = ANY (ARRAY['owner'::text, 'admin'::text, 'member'::text])));

CREATE POLICY "Cards: member insert" ON public.cards
  FOR INSERT
  WITH CHECK ((public.get_user_role(( SELECT pages.workspace_id
   FROM public.pages
  WHERE (pages.id = cards.page_id)), auth.uid()) = ANY (ARRAY['owner'::text, 'admin'::text, 'member'::text])));

CREATE POLICY "Cards: member update" ON public.cards
  FOR UPDATE
  USING ((public.get_user_role(( SELECT pages.workspace_id
   FROM public.pages
  WHERE (pages.id = cards.page_id)), auth.uid()) = ANY (ARRAY['owner'::text, 'admin'::text, 'member'::text])));

CREATE POLICY "Cards: members read" ON public.cards
  FOR SELECT
  USING (public.is_workspace_member(( SELECT pages.workspace_id
   FROM public.pages
  WHERE (pages.id = cards.page_id)), auth.uid()));

CREATE POLICY "Columns: member delete" ON public.columns
  FOR DELETE
  USING ((public.get_user_role(( SELECT pages.workspace_id
   FROM public.pages
  WHERE (pages.id = columns.page_id)), auth.uid()) = ANY (ARRAY['owner'::text, 'admin'::text, 'member'::text])));

CREATE POLICY "Columns: member insert" ON public.columns
  FOR INSERT
  WITH CHECK ((public.get_user_role(( SELECT pages.workspace_id
   FROM public.pages
  WHERE (pages.id = columns.page_id)), auth.uid()) = ANY (ARRAY['owner'::text, 'admin'::text, 'member'::text])));

CREATE POLICY "Columns: member update" ON public.columns
  FOR UPDATE
  USING ((public.get_user_role(( SELECT pages.workspace_id
   FROM public.pages
  WHERE (pages.id = columns.page_id)), auth.uid()) = ANY (ARRAY['owner'::text, 'admin'::text, 'member'::text])));

CREATE POLICY "Columns: members read" ON public.columns
  FOR SELECT
  USING (public.is_workspace_member(( SELECT pages.workspace_id
   FROM public.pages
  WHERE (pages.id = columns.page_id)), auth.uid()));

CREATE POLICY "Comment threads: members read" ON public.comment_threads
  FOR SELECT
  USING (public.is_workspace_member(COALESCE(( SELECT p.workspace_id
   FROM public.pages p
  WHERE ((p.id = comment_threads.entity_id) AND (comment_threads.entity_type = 'page'::text))), ( SELECT p.workspace_id
   FROM (public.pages p
     JOIN public.cards c ON ((c.page_id = p.id)))
  WHERE ((c.id = comment_threads.entity_id) AND (comment_threads.entity_type = 'card'::text)))), auth.uid()));

CREATE POLICY "Comments: members read" ON public.comments
  FOR SELECT
  USING (public.is_workspace_member(COALESCE(( SELECT p.workspace_id
   FROM (public.comment_threads ct
     JOIN public.pages p ON ((p.id = ct.entity_id)))
  WHERE ((ct.id = comments.thread_id) AND (ct.entity_type = 'page'::text))), ( SELECT p.workspace_id
   FROM ((public.comment_threads ct
     JOIN public.cards c ON ((c.id = ct.entity_id)))
     JOIN public.pages p ON ((p.id = c.page_id)))
  WHERE ((ct.id = comments.thread_id) AND (ct.entity_type = 'card'::text)))), auth.uid()));

CREATE POLICY "Comments: owner/admin delete" ON public.comments
  FOR DELETE
  TO authenticated
  USING (public.is_workspace_owner_or_admin(COALESCE(( SELECT p.workspace_id
   FROM (public.comment_threads ct
     JOIN public.pages p ON ((p.id = ct.entity_id)))
  WHERE ((ct.id = comments.thread_id) AND (ct.entity_type = 'page'::text))), ( SELECT p.workspace_id
   FROM ((public.comment_threads ct
     JOIN public.cards c ON ((c.id = ct.entity_id)))
     JOIN public.pages p ON ((p.id = c.page_id)))
  WHERE ((ct.id = comments.thread_id) AND (ct.entity_type = 'card'::text)))), auth.uid()));

CREATE POLICY "Page content: member insert" ON public.page_content
  FOR INSERT
  WITH CHECK ((public.get_user_role(( SELECT pages.workspace_id
   FROM public.pages
  WHERE (pages.id = page_content.page_id)), auth.uid()) = ANY (ARRAY['owner'::text, 'admin'::text, 'member'::text])));

CREATE POLICY "Page content: member update" ON public.page_content
  FOR UPDATE
  USING ((public.get_user_role(( SELECT pages.workspace_id
   FROM public.pages
  WHERE (pages.id = page_content.page_id)), auth.uid()) = ANY (ARRAY['owner'::text, 'admin'::text, 'member'::text])));

CREATE POLICY "Page content: members read" ON public.page_content
  FOR SELECT
  USING (public.is_workspace_member(( SELECT pages.workspace_id
   FROM public.pages
  WHERE (pages.id = page_content.page_id)), auth.uid()));

ALTER TABLE public.pages
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.pages
  ADD CONSTRAINT pages_kind_check CHECK (kind = ANY (ARRAY['markdown'::text, 'kanban'::text, 'table'::text]));

ALTER TABLE public.pages
  ADD CONSTRAINT pages_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id);

ALTER TABLE public.pages
  ADD CONSTRAINT pages_pkey PRIMARY KEY (id);

ALTER TABLE public.ai_requests
  ADD CONSTRAINT ai_requests_page_id_fkey FOREIGN KEY (page_id) REFERENCES public.pages(id) ON DELETE SET NULL;

ALTER TABLE public.cards
  ADD CONSTRAINT cards_page_id_fkey FOREIGN KEY (page_id) REFERENCES public.pages(id) ON DELETE CASCADE;

ALTER TABLE public.columns
  ADD CONSTRAINT columns_page_id_fkey FOREIGN KEY (page_id) REFERENCES public.pages(id) ON DELETE CASCADE;

ALTER TABLE public.page_content
  ADD CONSTRAINT page_content_page_id_fkey FOREIGN KEY (page_id) REFERENCES public.pages(id) ON DELETE CASCADE;

ALTER TABLE public.page_visits
  ADD CONSTRAINT page_visits_page_id_fkey FOREIGN KEY (page_id) REFERENCES public.pages(id) ON DELETE CASCADE;

GRANT ALL ON public.pages TO anon;

GRANT ALL ON public.pages TO authenticated;

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.pages TO service_role;

CREATE INDEX idx_pages_workspace_id ON public.pages (workspace_id);

CREATE INDEX idx_pages_is_deleted ON public.pages (is_deleted);

CREATE TRIGGER update_pages_updated_at
  BEFORE UPDATE ON public.pages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE POLICY "Pages: admin delete" ON public.pages
  FOR DELETE
  USING ((public.get_user_role(workspace_id, auth.uid()) = ANY (ARRAY['owner'::text, 'admin'::text])));

CREATE POLICY "Pages: member create" ON public.pages
  FOR INSERT
  WITH CHECK ((public.get_user_role(workspace_id, auth.uid()) = ANY (ARRAY['owner'::text, 'admin'::text, 'member'::text])));

CREATE POLICY "Pages: member update" ON public.pages
  FOR UPDATE
  USING ((public.get_user_role(workspace_id, auth.uid()) = ANY (ARRAY['owner'::text, 'admin'::text, 'member'::text])));

CREATE POLICY "Pages: members read" ON public.pages
  FOR SELECT
  USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE TABLE public.profiles (
  id           uuid                     NOT NULL,
  display_name text,
  avatar_url   text,
  updated_at   timestamp with time zone DEFAULT now()
);

ALTER TABLE public.profiles
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.profiles TO anon;

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON public.profiles TO authenticated;

GRANT ALL ON public.profiles TO service_role;

CREATE TABLE public.tags (
  id           uuid                     DEFAULT extensions.uuid_generate_v4() NOT NULL,
  workspace_id uuid                     NOT NULL,
  name         text                     NOT NULL,
  color        text                     DEFAULT '#6b7280'::text NOT NULL,
  created_at   timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.tags
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.tags
  ADD CONSTRAINT tags_pkey PRIMARY KEY (id);

ALTER TABLE public.card_tags
  ADD CONSTRAINT card_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE;

GRANT ALL ON public.tags TO anon;

GRANT ALL ON public.tags TO authenticated;

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.tags TO service_role;

CREATE INDEX idx_tags_workspace_id ON public.tags (workspace_id);

CREATE POLICY "Tags: member delete" ON public.tags
  FOR DELETE
  USING ((public.get_user_role(workspace_id, auth.uid()) = ANY (ARRAY['owner'::text, 'admin'::text, 'member'::text])));

CREATE POLICY "Tags: member insert" ON public.tags
  FOR INSERT
  WITH CHECK ((public.get_user_role(workspace_id, auth.uid()) = ANY (ARRAY['owner'::text, 'admin'::text, 'member'::text])));

CREATE POLICY "Tags: member update" ON public.tags
  FOR UPDATE
  USING ((public.get_user_role(workspace_id, auth.uid()) = ANY (ARRAY['owner'::text, 'admin'::text, 'member'::text])));

CREATE POLICY "Tags: members read" ON public.tags
  FOR SELECT
  USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE TABLE public.user_settings (
  user_id       uuid                     NOT NULL,
  shortcuts     jsonb                    DEFAULT '{}'::jsonb NOT NULL,
  created_at    timestamp with time zone DEFAULT now() NOT NULL,
  updated_at    timestamp with time zone DEFAULT now() NOT NULL,
  notifications jsonb
);

ALTER TABLE public.user_settings
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_settings
  ADD CONSTRAINT user_settings_pkey PRIMARY KEY (user_id);

ALTER TABLE public.user_settings
  ADD CONSTRAINT user_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

GRANT ALL ON public.user_settings TO anon;

GRANT ALL ON public.user_settings TO authenticated;

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON public.user_settings TO service_role;

CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE POLICY user_settings_insert_own ON public.user_settings
  FOR INSERT
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY user_settings_select_own ON public.user_settings
  FOR SELECT
  USING ((auth.uid() = user_id));

CREATE POLICY user_settings_update_own ON public.user_settings
  FOR UPDATE
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));

CREATE TABLE public.workspace_members (
  id           uuid                     DEFAULT gen_random_uuid() NOT NULL,
  workspace_id uuid                     NOT NULL,
  user_id      uuid,
  role         text                     NOT NULL,
  created_at   timestamp with time zone DEFAULT now() NOT NULL,
  email        text                     DEFAULT ''::text NOT NULL,
  invite_token uuid
);

ALTER TABLE public.workspace_members
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.workspace_members
  ADD CONSTRAINT workspace_members_pkey PRIMARY KEY (id);

ALTER TABLE public.workspace_members
  ADD CONSTRAINT workspace_members_role_check CHECK (role = ANY (ARRAY['owner'::text, 'admin'::text, 'member'::text, 'guest'::text]));

ALTER TABLE public.workspace_members
  ADD CONSTRAINT workspace_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.workspace_members
  ADD CONSTRAINT workspace_members_workspace_id_user_id_key UNIQUE (workspace_id, user_id);

GRANT ALL ON public.workspace_members TO anon;

GRANT ALL ON public.workspace_members TO authenticated;

GRANT ALL ON public.workspace_members TO service_role;

CREATE UNIQUE INDEX workspace_members_invite_token_uidx ON public.workspace_members (invite_token);

CREATE POLICY "Workspace members: admin delete" ON public.workspace_members
  FOR DELETE
  USING ((public.get_user_role(workspace_id, auth.uid()) = ANY (ARRAY['owner'::text, 'admin'::text])));

CREATE POLICY "Workspace members: admin insert" ON public.workspace_members
  FOR INSERT
  WITH CHECK (((user_id = auth.uid()) OR (public.get_user_role(workspace_id, auth.uid()) = ANY (ARRAY['owner'::text, 'admin'::text]))));

CREATE POLICY "Workspace members: admin update" ON public.workspace_members
  FOR UPDATE
  USING ((public.get_user_role(workspace_id, auth.uid()) = ANY (ARRAY['owner'::text, 'admin'::text])));

CREATE POLICY "Workspace members: members read" ON public.workspace_members
  FOR SELECT
  USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE TABLE public.workspaces (
  id                uuid                     DEFAULT extensions.uuid_generate_v4() NOT NULL,
  name              text                     NOT NULL,
  description       text,
  owner_id          uuid                     NOT NULL,
  created_at        timestamp with time zone DEFAULT now() NOT NULL,
  updated_at        timestamp with time zone DEFAULT now() NOT NULL,
  default_page_kind text                     DEFAULT 'markdown'::text NOT NULL
);

CREATE POLICY "Profiles: workspace read" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (((EXISTS ( SELECT 1
   FROM public.workspace_members viewer
  WHERE ((viewer.user_id = auth.uid()) AND (EXISTS ( SELECT 1
           FROM public.workspace_members target
          WHERE ((target.workspace_id = viewer.workspace_id) AND (target.user_id = profiles.id))))))) OR (EXISTS ( SELECT 1
   FROM public.workspaces w
  WHERE ((w.owner_id = auth.uid()) AND (w.owner_id = profiles.id))))));

ALTER TABLE public.workspaces
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.workspaces
  ADD CONSTRAINT workspaces_default_page_kind_check CHECK (default_page_kind = ANY (ARRAY['markdown'::text, 'kanban'::text, 'table'::text]));

ALTER TABLE public.workspaces
  ADD CONSTRAINT workspaces_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.workspaces
  ADD CONSTRAINT workspaces_pkey PRIMARY KEY (id);

ALTER TABLE public.activity_logs
  ADD CONSTRAINT activity_logs_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;

ALTER TABLE public.page_visits
  ADD CONSTRAINT page_visits_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;

ALTER TABLE public.pages
  ADD CONSTRAINT pages_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;

ALTER TABLE public.tags
  ADD CONSTRAINT tags_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;

ALTER TABLE public.workspace_members
  ADD CONSTRAINT workspace_members_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;

GRANT ALL ON public.workspaces TO anon;

GRANT ALL ON public.workspaces TO authenticated;

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.workspaces TO service_role;

CREATE TRIGGER update_workspaces_updated_at
  BEFORE UPDATE ON public.workspaces
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE POLICY "Workspaces: authenticated create" ON public.workspaces
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Workspaces: authenticated read" ON public.workspaces
  FOR SELECT
  TO authenticated
  USING ((public.is_workspace_member(id, auth.uid()) OR (auth.uid() = owner_id)));

CREATE POLICY "Workspaces: owner delete" ON public.workspaces
  FOR DELETE
  TO authenticated
  USING ((public.get_user_role(id, auth.uid()) = 'owner'::text));

CREATE POLICY "Workspaces: owner update" ON public.workspaces
  FOR UPDATE
  TO authenticated
  USING ((public.get_user_role(id, auth.uid()) = 'owner'::text));

CREATE TABLE public.ydocs (
  id           uuid                     DEFAULT gen_random_uuid() NOT NULL,
  workspace_id uuid                     NOT NULL,
  entity_type  text                     NOT NULL,
  entity_id    uuid                     NOT NULL,
  state        text                     DEFAULT ''::text NOT NULL,
  version      bigint                   DEFAULT 1 NOT NULL,
  updated_at   timestamp with time zone DEFAULT now() NOT NULL
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs,
  TABLE public.card_tags,
  TABLE public.cards,
  TABLE public.columns,
  TABLE public.comment_reactions,
  TABLE public.comment_threads,
  TABLE public.comments,
  TABLE public.notifications,
  TABLE public.page_content, TABLE public.pages, TABLE public.tags, TABLE public.user_settings, TABLE public.workspace_members, TABLE public.workspaces, TABLE public.ydocs;

ALTER TABLE public.ydocs
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.ydocs
  ADD CONSTRAINT y_doc_entity_type_entity_id_key UNIQUE (entity_type, entity_id);

ALTER TABLE public.ydocs
  ADD CONSTRAINT y_doc_pkey PRIMARY KEY (id);

ALTER TABLE public.ydocs
  ADD CONSTRAINT y_doc_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;

GRANT ALL ON public.ydocs TO anon;

GRANT ALL ON public.ydocs TO authenticated;

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.ydocs TO service_role;

CREATE INDEX idx_y_doc_entity ON public.ydocs (entity_type, entity_id);

CREATE POLICY "Everything public" ON public.ydocs
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Members can delete ydocs" ON public.ydocs
  FOR DELETE
  USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Members can insert ydocs" ON public.ydocs
  FOR INSERT
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Members can update ydocs" ON public.ydocs
  FOR UPDATE
  USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Members can view ydocs" ON public.ydocs
  FOR SELECT
  USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE EVENT TRIGGER ensure_rls
  ON ddl_command_end
  WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  EXECUTE FUNCTION public.rls_auto_enable();
