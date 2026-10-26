-- Run in Supabase SQL Editor. Create users with Supabase Dashboard > Authentication > Users > Invite user.
create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 role text not null default 'viewer' check (role in ('admin','editor','viewer')),
 created_at timestamptz not null default now()
);
create table if not exists public.generations (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 day text not null,
 states text[] not null,
 output jsonb not null,
 created_at timestamptz not null default now()
);
create table if not exists public.generation_quota (
 user_id uuid not null references auth.users(id) on delete cascade,
 usage_day date not null,
 used integer not null default 0,
 primary key(user_id,usage_day)
);
create index if not exists generations_user_created_idx on public.generations(user_id,created_at desc);
alter table public.profiles enable row level security;
alter table public.generations enable row level security;
alter table public.generation_quota enable row level security;
-- A user may see only their own profile.
drop policy if exists "Read own profile" on public.profiles;
create policy "Read own profile" on public.profiles for select to authenticated using (id = (select auth.uid()));
-- Users may read only their own history; admin can see all history.
drop policy if exists "Read allowed generations" on public.generations;
create policy "Read allowed generations" on public.generations for select to authenticated using (
 user_id=(select auth.uid()) or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin')
);
drop policy if exists "Insert own generations" on public.generations;
create policy "Insert own generations" on public.generations for insert to authenticated with check (
 user_id=(select auth.uid()) and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('admin','editor'))
);
-- No direct quota table policies: quota is modified only through SECURITY DEFINER RPC.
create or replace function public.claim_generation_slot(p_user_id uuid,p_daily_limit integer default 25)
returns boolean language plpgsql security definer set search_path=public as $$
declare v_used integer;
begin
 if auth.uid() is null or auth.uid() <> p_user_id then return false; end if;
 if not exists(select 1 from public.profiles where id=p_user_id and role in ('admin','editor')) then return false; end if;
 if p_daily_limit < 1 or p_daily_limit > 25 then return false; end if;
 insert into public.generation_quota(user_id,usage_day,used) values(p_user_id,(now() at time zone 'America/Monterrey')::date,1)
 on conflict(user_id,usage_day) do update set used=public.generation_quota.used+1
 where public.generation_quota.used < p_daily_limit
 returning used into v_used;
 return v_used is not null;
end $$;
revoke all on function public.claim_generation_slot(uuid,integer) from public;
grant execute on function public.claim_generation_slot(uuid,integer) to authenticated;
-- Create profile automatically for newly invited users; defaults to viewer (least privilege).
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into public.profiles(id,role) values(new.id,'viewer') on conflict(id) do nothing;return new;end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
insert into public.profiles(id,role) select id,'viewer' from auth.users on conflict(id) do nothing;
-- Promote trusted users manually from SQL Editor, never from the browser:
-- update public.profiles set role='admin' where id=(select id from auth.users where email='admin@tuempresa.com');
-- update public.profiles set role='editor' where id=(select id from auth.users where email='editor@tuempresa.com');
