-- ═════════════════════════════════════════════════════════════════════════════
-- Max Touch — initial schema
-- Run once in Supabase → SQL Editor (or `supabase db push`).
-- Seeds only structural rows (the "Makeup Kits" category, the three sizes and
-- store settings). Products are added from the shop desk (/admin).
-- After this file, also run 20261015000000_commerce_admin.sql once.
-- ═════════════════════════════════════════════════════════════════════════════

-- ── Enums ────────────────────────────────────────────────────────────────────
create type public.user_role as enum ('customer', 'admin');
create type public.order_status as enum ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded');
create type public.payment_status as enum ('unpaid', 'paid', 'failed', 'refunded');
create type public.payment_method as enum ('cod', 'card');
create type public.discount_type as enum ('percent', 'fixed');
create type public.product_image_kind as enum ('frame', 'gallery');
create type public.content_thumb_kind as enum ('image', 'swatch', 'stick');
create type public.feature_icon as enum ('mirror', 'trays', 'drawer', 'gift');

-- ── Helpers ──────────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ═════════════════════════════════════════════════════════════════════════════
-- Accounts
-- ═════════════════════════════════════════════════════════════════════════════
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  role public.user_role not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'phone', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  label text,
  full_name text not null,
  phone text not null,
  line1 text not null,
  line2 text,
  city text not null,
  region text not null,
  country text not null default 'AE',
  postal_code text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index addresses_user_idx on public.addresses (user_id);
create unique index addresses_one_default_per_user on public.addresses (user_id) where is_default;
create trigger addresses_updated_at before update on public.addresses
  for each row execute function public.set_updated_at();

-- ═════════════════════════════════════════════════════════════════════════════
-- Catalog
-- ═════════════════════════════════════════════════════════════════════════════
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  description text,
  seo_title text,
  seo_description text,
  image_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger categories_updated_at before update on public.categories
  for each row execute function public.set_updated_at();

create table public.sizes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  label text not null,
  description text,
  seo_title text,
  seo_description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id) on delete restrict,
  size_id uuid not null references public.sizes (id) on delete restrict,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  sku text unique,
  name text not null,
  -- Drawer title, one entry per line, e.g. {"Max Touch","Makeup Kit 2022"}. Falls back to `name`.
  title_lines text[] not null default '{}',
  tagline text,
  eyebrow text,
  description text,
  pieces integer check (pieces >= 0),
  price numeric(10, 2) not null check (price >= 0),
  compare_at_price numeric(10, 2) check (compare_at_price is null or compare_at_price >= 0),
  currency text not null default 'AED' check (char_length(currency) = 3),
  stock integer not null default 0 check (stock >= 0),
  -- Image fields accept a full URL or a path inside the `products` storage bucket.
  thumbnail_url text,
  image_url text,
  image_alt text,
  caption text,
  hero_subtitle text,
  cta_label text,
  included_title text,
  extras_title text,
  perfect_for text[] not null default '{}',
  seo_title text,
  seo_description text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_size_idx on public.products (size_id, sort_order);
create index products_category_idx on public.products (category_id);
create index products_active_idx on public.products (is_active);
create trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();

-- Hero opening sequence (kind = 'frame', played in sort_order) and extra photos (kind = 'gallery').
create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  kind public.product_image_kind not null default 'gallery',
  url text not null,
  alt text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index product_images_product_idx on public.product_images (product_id, kind, sort_order);

-- Cut-outs that burst out of the kit in the hero (max 7 are shown).
create table public.product_showcase (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  label text not null,
  image_url text not null,
  sort_order integer not null default 0
);
create index product_showcase_product_idx on public.product_showcase (product_id, sort_order);

-- Big counters in the drawer ("85 Pieces", "36 Eyeshadows", ...).
create table public.product_stats (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  label text not null,
  value integer not null check (value >= 0),
  sort_order integer not null default 0
);
create index product_stats_product_idx on public.product_stats (product_id, sort_order);

-- "What's inside" cards.
create table public.product_contents (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  name text not null,
  quantity integer not null default 1 check (quantity >= 0),
  note text,
  thumb_kind public.content_thumb_kind not null default 'image',
  image_url text,
  colors text[] not null default '{}',
  stick_body text,
  stick_tip text,
  sort_order integer not null default 0
);
create index product_contents_product_idx on public.product_contents (product_id, sort_order);

-- "Built into the case" rows.
create table public.product_features (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  title text not null,
  body text not null,
  icon public.feature_icon not null default 'gift',
  sort_order integer not null default 0
);
create index product_features_product_idx on public.product_features (product_id, sort_order);

-- Accordion (how to use, care, shipping...). Also published as FAQ structured data.
create table public.product_faqs (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  question text not null,
  answer text not null,
  sort_order integer not null default 0
);
create index product_faqs_product_idx on public.product_faqs (product_id, sort_order);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  author_name text not null,
  rating smallint not null check (rating between 1 and 5),
  title text,
  body text,
  is_approved boolean not null default false,
  created_at timestamptz not null default now(),
  unique (product_id, user_id)
);
create index reviews_product_idx on public.reviews (product_id) where is_approved;

-- ═════════════════════════════════════════════════════════════════════════════
-- Commerce
-- ═════════════════════════════════════════════════════════════════════════════
create table public.store_settings (
  id boolean primary key default true check (id),
  currency text not null default 'AED',
  shipping_fee numeric(10, 2) not null default 0 check (shipping_fee >= 0),
  -- Orders at or above this amount ship free. NULL = never free.
  free_shipping_threshold numeric(10, 2),
  cod_fee numeric(10, 2) not null default 0 check (cod_fee >= 0),
  updated_at timestamptz not null default now()
);
create trigger store_settings_updated_at before update on public.store_settings
  for each row execute function public.set_updated_at();

create table public.cart_items (
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  quantity integer not null check (quantity between 1 and 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, product_id)
);
create trigger cart_items_updated_at before update on public.cart_items
  for each row execute function public.set_updated_at();

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code = upper(code)),
  description text,
  discount_type public.discount_type not null,
  value numeric(10, 2) not null check (value > 0),
  min_subtotal numeric(10, 2) not null default 0,
  max_uses integer check (max_uses is null or max_uses > 0),
  used_count integer not null default 0,
  starts_at timestamptz,
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create sequence public.order_number_seq start 100001;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('MT-' || nextval('public.order_number_seq')),
  user_id uuid references auth.users (id) on delete set null,
  -- Lets guests open their confirmation page without an account.
  access_token text not null default replace(gen_random_uuid()::text, '-', ''),
  status public.order_status not null default 'pending',
  payment_status public.payment_status not null default 'unpaid',
  payment_method public.payment_method not null,
  payment_reference text,
  email text not null,
  full_name text not null,
  phone text not null,
  shipping_address jsonb not null,
  currency text not null,
  subtotal numeric(10, 2) not null,
  discount_total numeric(10, 2) not null default 0,
  shipping_total numeric(10, 2) not null default 0,
  total numeric(10, 2) not null,
  coupon_code text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_user_idx on public.orders (user_id, created_at desc);
create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  product_name text not null,
  product_slug text,
  image_url text,
  size_label text,
  unit_price numeric(10, 2) not null,
  quantity integer not null check (quantity > 0),
  line_total numeric(10, 2) not null,
  created_at timestamptz not null default now()
);
create index order_items_order_idx on public.order_items (order_id);

-- ═════════════════════════════════════════════════════════════════════════════
-- Row Level Security
-- ═════════════════════════════════════════════════════════════════════════════
alter table public.profiles enable row level security;
alter table public.addresses enable row level security;
alter table public.categories enable row level security;
alter table public.sizes enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_showcase enable row level security;
alter table public.product_stats enable row level security;
alter table public.product_contents enable row level security;
alter table public.product_features enable row level security;
alter table public.product_faqs enable row level security;
alter table public.reviews enable row level security;
alter table public.store_settings enable row level security;
alter table public.cart_items enable row level security;
alter table public.coupons enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Profiles: users see and edit their own row; admins see everyone.
create policy "profiles: read own" on public.profiles
  for select to authenticated using (id = (select auth.uid()) or (select public.is_admin()));
create policy "profiles: update own" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "profiles: admin update" on public.profiles
  for update to authenticated using ((select public.is_admin()));

-- Addresses: owner only.
create policy "addresses: owner" on public.addresses
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Catalog: public read of active items, admin write.
create policy "categories: public read" on public.categories
  for select to anon, authenticated using (is_active or (select public.is_admin()));
create policy "sizes: public read" on public.sizes
  for select to anon, authenticated using (true);
create policy "products: public read" on public.products
  for select to anon, authenticated using (is_active or (select public.is_admin()));

create policy "product_images: public read" on public.product_images
  for select to anon, authenticated using (exists (select 1 from public.products p where p.id = product_id and p.is_active));
create policy "product_showcase: public read" on public.product_showcase
  for select to anon, authenticated using (exists (select 1 from public.products p where p.id = product_id and p.is_active));
create policy "product_stats: public read" on public.product_stats
  for select to anon, authenticated using (exists (select 1 from public.products p where p.id = product_id and p.is_active));
create policy "product_contents: public read" on public.product_contents
  for select to anon, authenticated using (exists (select 1 from public.products p where p.id = product_id and p.is_active));
create policy "product_features: public read" on public.product_features
  for select to anon, authenticated using (exists (select 1 from public.products p where p.id = product_id and p.is_active));
create policy "product_faqs: public read" on public.product_faqs
  for select to anon, authenticated using (exists (select 1 from public.products p where p.id = product_id and p.is_active));

create policy "categories: admin write" on public.categories for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "sizes: admin write" on public.sizes for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "products: admin write" on public.products for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "product_images: admin write" on public.product_images for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "product_showcase: admin write" on public.product_showcase for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "product_stats: admin write" on public.product_stats for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "product_contents: admin write" on public.product_contents for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "product_features: admin write" on public.product_features for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "product_faqs: admin write" on public.product_faqs for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Reviews: approved ones are public; signed-in users submit (pending approval).
create policy "reviews: public read approved" on public.reviews
  for select to anon, authenticated using (is_approved or user_id = (select auth.uid()) or (select public.is_admin()));
create policy "reviews: submit own" on public.reviews
  for insert to authenticated with check (user_id = (select auth.uid()) and not is_approved);
create policy "reviews: admin manage" on public.reviews for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Settings: public read, admin write.
create policy "store_settings: public read" on public.store_settings
  for select to anon, authenticated using (true);
create policy "store_settings: admin write" on public.store_settings for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Cart: owner only.
create policy "cart_items: owner" on public.cart_items
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Coupons: never readable directly (validated through validate_coupon()).
create policy "coupons: admin manage" on public.coupons for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Orders: created only through place_order(); customers read their own.
create policy "orders: read own" on public.orders
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "orders: admin update" on public.orders for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "order_items: read own" on public.order_items
  for select to authenticated using (
    exists (
      select 1 from public.orders o
      where o.id = order_id and (o.user_id = (select auth.uid()) or (select public.is_admin()))
    )
  );

-- ── Table privileges ─────────────────────────────────────────────────────────
grant usage on schema public to anon, authenticated;

grant select on public.categories, public.sizes, public.products, public.product_images,
  public.product_showcase, public.product_stats, public.product_contents, public.product_features,
  public.product_faqs, public.reviews, public.store_settings to anon, authenticated;

grant insert, update, delete on public.categories, public.sizes, public.products, public.product_images,
  public.product_showcase, public.product_stats, public.product_contents, public.product_features,
  public.product_faqs, public.coupons to authenticated;

grant select on public.coupons to authenticated;
grant insert, update, delete on public.reviews to authenticated;
grant update on public.store_settings to authenticated;
grant select, insert, update, delete on public.addresses, public.cart_items to authenticated;
grant select on public.orders, public.order_items to authenticated;
grant update on public.orders to authenticated;

-- Customers may only change their name and phone — never their role.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, phone) on public.profiles to authenticated;

-- Orders are written only by the security-definer functions below.
revoke insert, delete on public.orders, public.order_items from anon, authenticated;

-- ═════════════════════════════════════════════════════════════════════════════
-- Functions used by the website
-- ═════════════════════════════════════════════════════════════════════════════

-- Returns the discount for a coupon code, or an error message.
create or replace function public.validate_coupon(p_code text, p_subtotal numeric)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  c public.coupons%rowtype;
  v_discount numeric(10, 2);
begin
  select * into c from public.coupons where code = upper(trim(p_code));

  if not found or not c.is_active
     or (c.starts_at is not null and c.starts_at > now())
     or (c.expires_at is not null and c.expires_at < now())
     or (c.max_uses is not null and c.used_count >= c.max_uses) then
    return jsonb_build_object('valid', false, 'message', 'This code is not valid.');
  end if;

  if p_subtotal < c.min_subtotal then
    return jsonb_build_object(
      'valid', false,
      'message', format('Spend at least %s to use this code.', c.min_subtotal)
    );
  end if;

  v_discount := case c.discount_type
    when 'percent' then round(p_subtotal * least(c.value, 100) / 100, 2)
    else least(c.value, p_subtotal)
  end;

  return jsonb_build_object(
    'valid', true,
    'code', c.code,
    'discount', v_discount,
    'message', coalesce(c.description, 'Code applied.')
  );
end;
$$;

-- Creates an order atomically: re-prices every line from the database, checks
-- and decrements stock, applies the coupon and shipping rules.
-- p_items:   [{ "product_id": uuid, "quantity": int }]
-- p_contact: { "email", "full_name", "phone" }
-- p_address: { "line1", "line2", "city", "region", "country", "postal_code" }
create or replace function public.place_order(
  p_items jsonb,
  p_contact jsonb,
  p_address jsonb,
  p_payment_method public.payment_method default 'cod',
  p_coupon_code text default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_settings public.store_settings%rowtype;
  v_coupon public.coupons%rowtype;
  v_order public.orders%rowtype;
  v_line record;
  v_subtotal numeric(10, 2) := 0;
  v_discount numeric(10, 2) := 0;
  v_shipping numeric(10, 2) := 0;
  v_email text := lower(trim(p_contact ->> 'email'));
  v_name text := trim(p_contact ->> 'full_name');
  v_phone text := trim(p_contact ->> 'phone');
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 20 then
    raise exception 'EMPTY_CART';
  end if;

  if coalesce(v_email, '') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
     or coalesce(v_name, '') = '' or coalesce(v_phone, '') = ''
     or coalesce(trim(p_address ->> 'line1'), '') = ''
     or coalesce(trim(p_address ->> 'city'), '') = ''
     or coalesce(trim(p_address ->> 'region'), '') = '' then
    raise exception 'INVALID_DETAILS';
  end if;

  select * into v_settings from public.store_settings where id;

  create temporary table _lines on commit drop as
  select
    (i ->> 'product_id')::uuid as product_id,
    sum((i ->> 'quantity')::int)::int as quantity
  from jsonb_array_elements(p_items) i
  group by 1;

  if exists (select 1 from _lines where quantity < 1 or quantity > 10) then
    raise exception 'INVALID_QUANTITY';
  end if;

  -- Lock the products so two checkouts can't oversell the same stock.
  perform 1 from public.products p join _lines l on l.product_id = p.id for update of p;

  for v_line in
    select l.product_id, l.quantity, p.name, p.slug, p.price, p.stock, p.is_active,
           coalesce(p.thumbnail_url, p.image_url) as image_url, s.label as size_label
    from _lines l
    left join public.products p on p.id = l.product_id
    left join public.sizes s on s.id = p.size_id
  loop
    if v_line.name is null or not v_line.is_active then
      raise exception 'PRODUCT_UNAVAILABLE';
    end if;
    if v_line.stock < v_line.quantity then
      raise exception 'OUT_OF_STOCK:%', v_line.name;
    end if;
    v_subtotal := v_subtotal + v_line.price * v_line.quantity;
  end loop;

  if nullif(trim(p_coupon_code), '') is not null then
    select * into v_coupon from public.coupons where code = upper(trim(p_coupon_code)) for update;
    if not found or not v_coupon.is_active
       or (v_coupon.starts_at is not null and v_coupon.starts_at > now())
       or (v_coupon.expires_at is not null and v_coupon.expires_at < now())
       or (v_coupon.max_uses is not null and v_coupon.used_count >= v_coupon.max_uses)
       or v_subtotal < v_coupon.min_subtotal then
      raise exception 'INVALID_COUPON';
    end if;
    v_discount := case v_coupon.discount_type
      when 'percent' then round(v_subtotal * least(v_coupon.value, 100) / 100, 2)
      else least(v_coupon.value, v_subtotal)
    end;
    update public.coupons set used_count = used_count + 1 where id = v_coupon.id;
  end if;

  v_shipping := case
    when v_settings.free_shipping_threshold is not null
         and v_subtotal - v_discount >= v_settings.free_shipping_threshold then 0
    else coalesce(v_settings.shipping_fee, 0)
  end;
  if p_payment_method = 'cod' then
    v_shipping := v_shipping + coalesce(v_settings.cod_fee, 0);
  end if;

  insert into public.orders (
    user_id, payment_method, email, full_name, phone, shipping_address, currency,
    subtotal, discount_total, shipping_total, total, coupon_code, notes
  ) values (
    auth.uid(), p_payment_method, v_email, v_name, v_phone,
    jsonb_build_object(
      'line1', trim(p_address ->> 'line1'),
      'line2', nullif(trim(p_address ->> 'line2'), ''),
      'city', trim(p_address ->> 'city'),
      'region', trim(p_address ->> 'region'),
      'country', coalesce(nullif(trim(p_address ->> 'country'), ''), 'AE'),
      'postal_code', nullif(trim(p_address ->> 'postal_code'), '')
    ),
    coalesce(v_settings.currency, 'AED'),
    v_subtotal, v_discount, v_shipping, v_subtotal - v_discount + v_shipping,
    case when v_discount > 0 then v_coupon.code end,
    nullif(left(trim(p_notes), 1000), '')
  )
  returning * into v_order;

  insert into public.order_items (
    order_id, product_id, product_name, product_slug, image_url, size_label, unit_price, quantity, line_total
  )
  select v_order.id, p.id, p.name, p.slug, coalesce(p.thumbnail_url, p.image_url), s.label,
         p.price, l.quantity, p.price * l.quantity
  from _lines l
  join public.products p on p.id = l.product_id
  left join public.sizes s on s.id = p.size_id;

  update public.products p set stock = p.stock - l.quantity
  from _lines l where p.id = l.product_id;

  if auth.uid() is not null then
    delete from public.cart_items where user_id = auth.uid();
  end if;

  return jsonb_build_object(
    'order_number', v_order.order_number,
    'access_token', v_order.access_token,
    'total', v_order.total
  );
end;
$$;

-- Order confirmation for guests and signed-in customers.
create or replace function public.get_order_by_token(p_order_number text, p_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'order_number', o.order_number,
    'status', o.status,
    'payment_status', o.payment_status,
    'payment_method', o.payment_method,
    'email', o.email,
    'full_name', o.full_name,
    'phone', o.phone,
    'shipping_address', o.shipping_address,
    'currency', o.currency,
    'subtotal', o.subtotal,
    'discount_total', o.discount_total,
    'shipping_total', o.shipping_total,
    'total', o.total,
    'coupon_code', o.coupon_code,
    'created_at', o.created_at,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'product_name', i.product_name,
        'product_slug', i.product_slug,
        'image_url', i.image_url,
        'size_label', i.size_label,
        'unit_price', i.unit_price,
        'quantity', i.quantity,
        'line_total', i.line_total
      ) order by i.created_at)
      from public.order_items i where i.order_id = o.id
    ), '[]'::jsonb)
  )
  from public.orders o
  where o.order_number = p_order_number and o.access_token = p_token;
$$;

revoke all on function public.validate_coupon(text, numeric) from public;
revoke all on function public.place_order(jsonb, jsonb, jsonb, public.payment_method, text, text) from public;
revoke all on function public.get_order_by_token(text, text) from public;
grant execute on function public.validate_coupon(text, numeric) to anon, authenticated;
grant execute on function public.place_order(jsonb, jsonb, jsonb, public.payment_method, text, text) to anon, authenticated;
grant execute on function public.get_order_by_token(text, text) to anon, authenticated;

-- ═════════════════════════════════════════════════════════════════════════════
-- Storage: public bucket for product images (admins upload)
-- ═════════════════════════════════════════════════════════════════════════════
insert into storage.buckets (id, name, public)
values ('products', 'products', true)
on conflict (id) do nothing;

create policy "products bucket: admin upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'products' and (select public.is_admin()));
create policy "products bucket: admin update" on storage.objects
  for update to authenticated using (bucket_id = 'products' and (select public.is_admin()));
create policy "products bucket: admin delete" on storage.objects
  for delete to authenticated using (bucket_id = 'products' and (select public.is_admin()));

-- ═════════════════════════════════════════════════════════════════════════════
-- Structural seed
-- ═════════════════════════════════════════════════════════════════════════════
insert into public.categories (slug, name, description, seo_title, seo_description, sort_order)
values (
  'makeup-kits',
  'Makeup Kits',
  'Complete makeup kits in keepsake cases — eyeshadows, blush, lip colours and brushes, ready to gift.',
  'Makeup Kits & Gift Sets',
  'Shop Max Touch makeup kits in big, medium and small sizes. Complete beauty sets with eyeshadows, blush, lip colours and brushes — the perfect gift.',
  0
);

insert into public.sizes (slug, label, description, seo_title, seo_description, sort_order) values
  ('big', 'Big',
   'Grand tiered cases that open like a jewellery box, with every shade and tool for any occasion.',
   'Big Makeup Kits',
   'Large Max Touch makeup kits with tiered trays, fold-out palettes and a vanity mirror — a complete beauty wardrobe in one case.',
   1),
  ('medium', 'Medium',
   'The everyday edit — rich palettes and essentials, sized for your dresser.',
   'Medium Makeup Kits',
   'Medium Max Touch makeup kits: balanced, gift-ready sets with eyeshadows, blush, lip colours and a built-in mirror.',
   2),
  ('small', 'Small',
   'Petite cases with all the shades you reach for most — made for touch-ups on the go.',
   'Small Makeup Kits',
   'Small Max Touch makeup kits: travel-size beauty sets with eyes, lips and cheeks in one click-shut case.',
   3);

insert into public.store_settings (id, currency, shipping_fee, free_shipping_threshold, cod_fee)
values (true, 'AED', 0, null, 0);
