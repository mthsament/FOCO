-- FOCO · Perfil, amigos e ofensivas em grupo
-- Rode no Supabase: SQL Editor → New query → cole tudo → Run. Pode rodar de novo sem problema (é idempotente).
-- Só compartilha o mínimo: @usuário, apelido, ID de amigo, foto e "sobre" (se você deixar) e, por dia, se treino / dieta / água foram cumpridos.
-- Peso, medidas, cargas, corridas e o resto continuam só na sua conta (tabela "estados").

-- ---------- tabelas ----------
create table if not exists public.perfis (
  user_id   uuid primary key references auth.users (id) on delete cascade,
  apelido   text not null check (char_length(apelido) between 2 and 24),
  codigo    text not null unique,            -- o "ID" numérico de amigo
  criado_em timestamptz not null default now()
);
alter table public.perfis add column if not exists usuario text;                         -- o @ (minúsculas, números e _)
alter table public.perfis add column if not exists bio text;                             -- "sobre"
alter table public.perfis add column if not exists avatar text;                          -- foto reduzida (data URL)
alter table public.perfis add column if not exists aceita_pedidos boolean not null default true;
alter table public.perfis drop constraint if exists perfis_usuario_formato;
alter table public.perfis add constraint perfis_usuario_formato check (usuario is null or usuario ~ '^[a-z0-9_]{3,20}$');
alter table public.perfis drop constraint if exists perfis_bio_tamanho;
alter table public.perfis add constraint perfis_bio_tamanho check (bio is null or char_length(bio) <= 160);
alter table public.perfis drop constraint if exists perfis_avatar_tamanho;
alter table public.perfis add constraint perfis_avatar_tamanho check (avatar is null or char_length(avatar) <= 60000);
create unique index if not exists perfis_usuario_unico on public.perfis (usuario) where usuario is not null;

create table if not exists public.amizades (
  id        uuid primary key default gen_random_uuid(),
  de        uuid not null references auth.users (id) on delete cascade,
  para      uuid not null references auth.users (id) on delete cascade,
  status    text not null default 'pendente' check (status in ('pendente', 'aceita')),
  criado_em timestamptz not null default now(),
  check (de <> para)
);
create unique index if not exists amizades_par on public.amizades (least(de, para), greatest(de, para));

create table if not exists public.checkins (
  user_id uuid not null references auth.users (id) on delete cascade,
  data    date not null,
  treino  text not null default 'rest' check (treino in ('ok', 'rest', 'miss', 'pend')),
  dieta   text not null default 'rest' check (dieta in ('ok', 'rest', 'miss', 'pend')),
  agua    boolean not null default false,
  primary key (user_id, data)
);

create table if not exists public.ofensivas (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null check (char_length(nome) between 2 and 40),
  tipo       text not null default 'geral' check (tipo in ('geral', 'treino', 'dieta', 'agua')),
  criada_por uuid not null references auth.users (id) on delete cascade,
  inicio     date not null default current_date,
  encerrada  boolean not null default false,
  criada_em  timestamptz not null default now()
);

create table if not exists public.ofensiva_membros (
  ofensiva_id uuid not null references public.ofensivas (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  status      text not null default 'convidado' check (status in ('convidado', 'aceito')),
  primary key (ofensiva_id, user_id)
);

-- ---------- funções auxiliares (evitam recursão nas regras) ----------
create or replace function public.sao_amigos(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from amizades
    where status = 'aceita' and ((de = a and para = b) or (de = b and para = a))
  );
$$;

create or replace function public.ligados(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from amizades where (de = a and para = b) or (de = b and para = a)
  );
$$;

create or replace function public.participa(o uuid, u uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from ofensiva_membros where ofensiva_id = o and user_id = u);
$$;

create or replace function public.dividem_ofensiva(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from ofensiva_membros x
    join ofensiva_membros y on y.ofensiva_id = x.ofensiva_id
    where x.user_id = a and y.user_id = b
  );
$$;

-- o @ está livre? (pode ser chamada na tela de cadastro, antes de entrar)
create or replace function public.usuario_disponivel(u text) returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (select 1 from perfis where usuario = lower(ltrim(trim(u), '@')));
$$;

-- achar alguém para adicionar: precisa do @ E do ID (só o @ não basta)
create or replace function public.buscar_amigo(u text, c text) returns table (user_id uuid, apelido text)
language sql stable security definer set search_path = public as $$
  select p.user_id, p.apelido from perfis p
  where p.usuario = lower(ltrim(trim(u), '@'))
    and regexp_replace(p.codigo, '\D', '', 'g') = regexp_replace(c, '\D', '', 'g')
    and p.aceita_pedidos
  limit 1;
$$;
drop function if exists public.buscar_por_codigo(text);

-- ---------- segurança por linha (RLS) ----------
alter table public.perfis enable row level security;
alter table public.amizades enable row level security;
alter table public.checkins enable row level security;
alter table public.ofensivas enable row level security;
alter table public.ofensiva_membros enable row level security;

drop policy if exists perfis_ler on public.perfis;
create policy perfis_ler on public.perfis for select to authenticated
  using (user_id = auth.uid() or ligados(user_id, auth.uid()) or dividem_ofensiva(user_id, auth.uid()));
drop policy if exists perfis_criar on public.perfis;
create policy perfis_criar on public.perfis for insert to authenticated with check (user_id = auth.uid());
drop policy if exists perfis_editar on public.perfis;
create policy perfis_editar on public.perfis for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists amizades_ler on public.amizades;
create policy amizades_ler on public.amizades for select to authenticated using (auth.uid() in (de, para));
drop policy if exists amizades_pedir on public.amizades;
create policy amizades_pedir on public.amizades for insert to authenticated with check (de = auth.uid() and status = 'pendente');
drop policy if exists amizades_aceitar on public.amizades;
create policy amizades_aceitar on public.amizades for update to authenticated using (para = auth.uid()) with check (para = auth.uid() and status = 'aceita');
drop policy if exists amizades_apagar on public.amizades;
create policy amizades_apagar on public.amizades for delete to authenticated using (auth.uid() in (de, para));

drop policy if exists checkins_ler on public.checkins;
create policy checkins_ler on public.checkins for select to authenticated
  using (user_id = auth.uid() or sao_amigos(user_id, auth.uid()) or dividem_ofensiva(user_id, auth.uid()));
drop policy if exists checkins_criar on public.checkins;
create policy checkins_criar on public.checkins for insert to authenticated with check (user_id = auth.uid());
drop policy if exists checkins_editar on public.checkins;
create policy checkins_editar on public.checkins for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists ofensivas_ler on public.ofensivas;
create policy ofensivas_ler on public.ofensivas for select to authenticated using (criada_por = auth.uid() or participa(id, auth.uid()));
drop policy if exists ofensivas_criar on public.ofensivas;
create policy ofensivas_criar on public.ofensivas for insert to authenticated with check (criada_por = auth.uid());
drop policy if exists ofensivas_editar on public.ofensivas;
create policy ofensivas_editar on public.ofensivas for update to authenticated using (criada_por = auth.uid()) with check (criada_por = auth.uid());
drop policy if exists ofensivas_apagar on public.ofensivas;
create policy ofensivas_apagar on public.ofensivas for delete to authenticated using (criada_por = auth.uid());

drop policy if exists membros_ler on public.ofensiva_membros;
create policy membros_ler on public.ofensiva_membros for select to authenticated using (user_id = auth.uid() or participa(ofensiva_id, auth.uid()));
drop policy if exists membros_convidar on public.ofensiva_membros;
create policy membros_convidar on public.ofensiva_membros for insert to authenticated
  with check (
    exists (select 1 from ofensivas o where o.id = ofensiva_id and o.criada_por = auth.uid())
    and (user_id = auth.uid() or sao_amigos(user_id, auth.uid()))
  );
drop policy if exists membros_aceitar on public.ofensiva_membros;
create policy membros_aceitar on public.ofensiva_membros for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists membros_sair on public.ofensiva_membros;
create policy membros_sair on public.ofensiva_membros for delete to authenticated
  using (user_id = auth.uid() or exists (select 1 from ofensivas o where o.id = ofensiva_id and o.criada_por = auth.uid()));

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.perfis, public.amizades, public.checkins, public.ofensivas, public.ofensiva_membros to authenticated;
grant execute on function public.buscar_amigo(text, text) to authenticated;
grant execute on function public.usuario_disponivel(text) to anon, authenticated;

-- ---------- excluir a própria conta ----------
-- Apaga a conta de quem chama (e, em cascata, perfil, amizades, check-ins e ofensivas que a pessoa criou).
create or replace function public.excluir_minha_conta() returns void
language plpgsql security definer set search_path = public, auth as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'não autenticado'; end if;
  delete from public.estados where user_id = uid;
  delete from auth.users where id = uid;
end;
$$;
revoke all on function public.excluir_minha_conta() from public, anon;
grant execute on function public.excluir_minha_conta() to authenticated;

-- ---------- água dos amigos (quanto bebeu hoje e a meta) ----------
alter table public.checkins add column if not exists agua_ml integer;
alter table public.checkins add column if not exists meta_agua_ml integer;
