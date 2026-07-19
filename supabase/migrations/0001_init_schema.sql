-- Rambow schema. All tables prefixed rmb_ so they can share the
-- herringbone-market-intel Supabase project without colliding, and be lifted
-- into a standalone project later. Applied to project yibuqsvcxugpkxogwspn.

create table if not exists rmb_players (
  name        text primary key,
  featured    boolean not null default false,
  jersey_no   text,
  sort_order  int not null default 100
);

create table if not exists rmb_card_sets (
  id        bigint generated always as identity primary key,
  player    text not null references rmb_players(name),
  year      int  not null,
  product   text not null,           -- canonical display product ("Select", "Prizm")
  card_no   text,                    -- text; '' when the card has no number
  featured  boolean not null default false,
  created_at timestamptz not null default now(),
  unique (player, year, product, card_no)
);
create index if not exists rmb_card_sets_player_idx on rmb_card_sets(player);

create table if not exists rmb_parallels (
  id           bigint generated always as identity primary key,
  card_set_id  bigint not null references rmb_card_sets(id) on delete cascade,
  name         text not null,
  tier         text not null default 'numbered',   -- base | numbered | short_print | one_of_one
  print_run    int,
  source_url   text,
  status       text not null default 'estimated',  -- verified | estimated | discovered
  image_url    text,                -- reference image for a parallel you don't own
  thumbnail    text,
  created_at   timestamptz not null default now(),
  unique (card_set_id, name)
);

create table if not exists rmb_cards (
  id              bigint generated always as identity primary key,
  card_set_id     bigint not null references rmb_card_sets(id) on delete cascade,
  parallel_id     bigint references rmb_parallels(id) on delete set null,  -- linked in rainbow increment
  parallel_name   text,                -- "Card Type" col; null = base
  tier            text,                -- base | numbered | short_print | one_of_one | unknown
  serial_no       int,
  print_run       int,                 -- "Qty Manufactured"
  graded          text,                -- "PSA 10" etc; null = raw
  purchase_price  numeric(10,2),
  notes           text,
  image_url         text,
  image_source      text,              -- ebay | comc | upload
  likely_your_copy  boolean not null default false,
  created_at      timestamptz not null default now()
);
create index if not exists rmb_cards_set_idx on rmb_cards(card_set_id);

create table if not exists rmb_watches (
  id             bigint generated always as identity primary key,
  card_set_id    bigint references rmb_card_sets(id) on delete cascade,
  parallel_name  text not null,
  query_template text,
  neg_keywords   text[],
  target_price   numeric(10,2),
  graded_pref    text,                 -- any | raw | graded
  status         text not null default 'active',  -- active | paused | acquired
  created_at     timestamptz not null default now()
);

create table if not exists rmb_alerts (
  id           bigint generated always as identity primary key,
  watch_id     bigint references rmb_watches(id) on delete cascade,
  marketplace  text not null,
  listing_id   text,
  title        text,
  price        numeric(10,2),
  url          text,
  thumbnail    text,
  outcome      text,                   -- new | bought | passed | junk
  created_at   timestamptz not null default now()
);

-- private key/value (seed token). RLS on with NO policies => unreadable and
-- unwritable by anon/authenticated; only SECURITY DEFINER functions touch it.
create table if not exists rmb_secrets (key text primary key, value text not null);
alter table rmb_secrets enable row level security;

-- RLS: single-user personal app. Anon gets read on everything; writes happen
-- via the seed RPC / service role. Client-write policies land in a later increment.
alter table rmb_players   enable row level security;
alter table rmb_card_sets enable row level security;
alter table rmb_parallels enable row level security;
alter table rmb_cards     enable row level security;
alter table rmb_watches   enable row level security;
alter table rmb_alerts    enable row level security;

do $$
declare t text;
begin
  foreach t in array array['rmb_players','rmb_card_sets','rmb_parallels','rmb_cards','rmb_watches','rmb_alerts']
  loop
    execute format('drop policy if exists %I on %I', t||'_anon_read', t);
    execute format('create policy %I on %I for select to anon using (true)', t||'_anon_read', t);
  end loop;
end $$;
