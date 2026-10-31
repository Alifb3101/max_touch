-- ═════════════════════════════════════════════════════════════════════════════
-- Max Touch — shop desk
-- Run once in Supabase → SQL Editor, after 20261013000000_init.sql.
-- Safe to run again. Adds order history, stock returns on cancel, role
-- protection, image rules, and the functions the /admin desk calls.
-- ═════════════════════════════════════════════════════════════════════════════

-- A compare-at price only makes sense when it is higher than the selling price.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'products_compare_at_above_price') then
    alter table public.products
      add constraint products_compare_at_above_price
      check (compare_at_price is null or compare_at_price > price);
  end if;
end $$;

create index if not exists orders_status_created_idx on public.orders (status, created_at desc);
create index if not exists orders_created_idx on public.orders (created_at desc);

-- ── Order history ────────────────────────────────────────────────────────────
create table if not exists public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  actor_id uuid references auth.users (id) on delete set null,
  kind text not null check (kind in ('status', 'payment')),
  from_value text,
  to_value text,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists order_events_order_idx on public.order_events (order_id, created_at);

alter table public.order_events enable row level security;
drop policy if exists "order_events: admin read" on public.order_events;
create policy "order_events: admin read" on public.order_events
  for select to authenticated using ((select public.is_admin()));
grant select on public.order_events to authenticated;
revoke insert, update, delete on public.order_events from anon, authenticated;

create or replace function public.log_order_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.order_events (order_id, actor_id, kind, to_value, note)
    values (new.id, auth.uid(), 'status', new.status::text, 'Order placed');
    return new;
  end if;

  if new.status is distinct from old.status then
    insert into public.order_events (order_id, actor_id, kind, from_value, to_value)
    values (new.id, auth.uid(), 'status', old.status::text, new.status::text);
  end if;

  if new.payment_status is distinct from old.payment_status then
    insert into public.order_events (order_id, actor_id, kind, from_value, to_value)
    values (new.id, auth.uid(), 'payment', old.payment_status::text, new.payment_status::text);
  end if;

  return new;
end;
$$;

drop trigger if exists orders_log_event on public.orders;
create trigger orders_log_event
  after insert or update of status, payment_status on public.orders
  for each row execute function public.log_order_event();

insert into public.order_events (order_id, kind, to_value, note)
select o.id, 'status', o.status::text, 'Recorded when the shop desk was added'
from public.orders o
where not exists (select 1 from public.order_events e where e.order_id = o.id);

-- ── Keep kit pages fresh for the sitemap when photos or copy change ─────────
create or replace function public.touch_parent_product()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid := coalesce(new.product_id, old.product_id);
begin
  update public.products set updated_at = now() where id = v_id;
  return coalesce(new, old);
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'product_images', 'product_showcase', 'product_stats',
    'product_contents', 'product_features', 'product_faqs'
  ]
  loop
    execute format('drop trigger if exists %I on public.%I', t || '_touch_product', t);
    execute format(
      'create trigger %I after insert or update or delete on public.%I
       for each row execute function public.touch_parent_product()',
      t || '_touch_product', t
    );
  end loop;
end $$;

-- ── Customers cannot change their own role ───────────────────────────────────
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role is distinct from old.role and auth.uid() is not null and not public.is_admin() then
    raise exception 'ROLE_LOCKED';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_role on public.profiles;
create trigger profiles_protect_role
  before update of role on public.profiles
  for each row execute function public.protect_profile_role();

-- ── Shop desk functions (admin only, even though they bypass row security) ──
create or replace function public.admin_dashboard()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN';
  end if;

  return jsonb_build_object(
    'products', (select count(*) from public.products),
    'active_products', (select count(*) from public.products where is_active),
    'low_stock', (select count(*) from public.products where is_active and stock <= 5),
    'orders', (select count(*) from public.orders),
    'open_orders', (select count(*) from public.orders where status in ('pending', 'confirmed', 'processing')),
    'unpaid', (select count(*) from public.orders where payment_status = 'unpaid' and status not in ('cancelled', 'refunded')),
    'order_value', (
      select coalesce(sum(total), 0)
      from public.orders
      where status not in ('cancelled', 'refunded')
    ),
    'customers', (select count(*) from public.profiles)
  );
end;
$$;

create or replace function public.admin_customers()
returns table (
  id uuid,
  email text,
  full_name text,
  phone text,
  role public.user_role,
  created_at timestamptz,
  orders bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN';
  end if;

  return query
  select p.id, u.email::text, p.full_name, p.phone, p.role, p.created_at,
         (select count(*) from public.orders o where o.user_id = p.id)
  from public.profiles p
  join auth.users u on u.id = p.id
  order by p.created_at desc;
end;
$$;

create or replace function public.set_user_role(p_user_id uuid, p_role public.user_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN';
  end if;
  if p_user_id = auth.uid() and p_role <> 'admin' then
    raise exception 'CANNOT_DEMOTE_SELF';
  end if;
  update public.profiles set role = p_role where id = p_user_id;
  if not found then
    raise exception 'NOT_FOUND';
  end if;
end;
$$;

-- Saves a kit and every related row in one step. Child rows are replaced
-- by the lists in the payload, so the form is the source of truth.
create or replace function public.admin_save_product(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid := nullif(p ->> 'id', '')::uuid;
  v_size uuid;
  v_category uuid;
  v_currency text;
  v_slug text := lower(trim(coalesce(p ->> 'slug', '')));
  v_name text := trim(coalesce(p ->> 'name', ''));
  v_price numeric(10, 2);
  v_compare numeric(10, 2);
  v_stock integer;
  v_pieces integer;
  v_sort integer;
  v_title text[];
  v_perfect text[];
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN';
  end if;

  if v_name = '' or char_length(v_name) > 160
     or v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
     or coalesce(p ->> 'price', '') !~ '^[0-9]+(\.[0-9]{1,2})?$'
     or coalesce(p ->> 'stock', '') !~ '^[0-9]+$' then
    raise exception 'INVALID_PRODUCT';
  end if;

  v_price := (p ->> 'price')::numeric;
  v_stock := (p ->> 'stock')::integer;
  if v_stock > 100000 then
    raise exception 'INVALID_PRODUCT';
  end if;

  if nullif(p ->> 'compare_at_price', '') is not null then
    if (p ->> 'compare_at_price') !~ '^[0-9]+(\.[0-9]{1,2})?$' then
      raise exception 'INVALID_PRODUCT';
    end if;
    v_compare := (p ->> 'compare_at_price')::numeric;
    if v_compare <= v_price then
      raise exception 'COMPARE_PRICE';
    end if;
  end if;

  if nullif(trim(coalesce(p ->> 'thumbnail_url', '')), '') is null
     and nullif(trim(coalesce(p ->> 'image_url', '')), '') is null then
    raise exception 'IMAGE_REQUIRED';
  end if;

  if coalesce(p ->> 'pieces', '') = '' then
    v_pieces := null;
  elsif (p ->> 'pieces') !~ '^[0-9]+$' then
    raise exception 'INVALID_PRODUCT';
  else
    v_pieces := (p ->> 'pieces')::integer;
  end if;

  v_sort := case
    when coalesce(p ->> 'sort_order', '') ~ '^[0-9]+$' then least((p ->> 'sort_order')::integer, 9999)
    else 0
  end;

  select id into v_size from public.sizes where slug = p ->> 'size_slug';
  if v_size is null then
    raise exception 'SIZE_NOT_FOUND';
  end if;

  select id into v_category
  from public.categories
  where slug = coalesce(nullif(p ->> 'category_slug', ''), 'makeup-kits');
  if v_category is null then
    raise exception 'CATEGORY_NOT_FOUND';
  end if;

  select coalesce(currency, 'AED') into v_currency from public.store_settings where id;

  select coalesce(array_agg(line order by ord), '{}'::text[]) into v_title
  from (
    select left(trim(value), 80) as line, ordinality as ord
    from jsonb_array_elements_text(case when jsonb_typeof(p -> 'title_lines') = 'array' then p -> 'title_lines' else '[]'::jsonb end)
      with ordinality
  ) s
  where line <> '';

  select coalesce(array_agg(line order by ord), '{}'::text[]) into v_perfect
  from (
    select left(trim(value), 80) as line, ordinality as ord
    from jsonb_array_elements_text(case when jsonb_typeof(p -> 'perfect_for') = 'array' then p -> 'perfect_for' else '[]'::jsonb end)
      with ordinality
  ) s
  where line <> '';

  if v_id is null then
    insert into public.products (
      category_id, size_id, slug, sku, name, title_lines, tagline, eyebrow, description, pieces,
      price, compare_at_price, currency, stock, thumbnail_url, image_url, image_alt, caption,
      hero_subtitle, cta_label, included_title, extras_title, perfect_for, seo_title, seo_description,
      is_active, sort_order
    ) values (
      v_category, v_size, v_slug,
      nullif(left(trim(coalesce(p ->> 'sku', '')), 40), ''),
      left(v_name, 160), v_title,
      nullif(left(trim(coalesce(p ->> 'tagline', '')), 240), ''),
      nullif(left(trim(coalesce(p ->> 'eyebrow', '')), 80), ''),
      nullif(left(trim(coalesce(p ->> 'description', '')), 5000), ''),
      v_pieces, v_price, v_compare, coalesce(v_currency, 'AED'), v_stock,
      nullif(left(trim(coalesce(p ->> 'thumbnail_url', '')), 500), ''),
      nullif(left(trim(coalesce(p ->> 'image_url', '')), 500), ''),
      nullif(left(trim(coalesce(p ->> 'image_alt', '')), 200), ''),
      nullif(left(trim(coalesce(p ->> 'caption', '')), 240), ''),
      nullif(left(trim(coalesce(p ->> 'hero_subtitle', '')), 240), ''),
      nullif(left(trim(coalesce(p ->> 'cta_label', '')), 40), ''),
      nullif(left(trim(coalesce(p ->> 'included_title', '')), 120), ''),
      nullif(left(trim(coalesce(p ->> 'extras_title', '')), 120), ''),
      v_perfect,
      nullif(left(trim(coalesce(p ->> 'seo_title', '')), 160), ''),
      nullif(left(trim(coalesce(p ->> 'seo_description', '')), 320), ''),
      coalesce((p ->> 'is_active')::boolean, false),
      v_sort
    )
    returning id into v_id;
  else
    update public.products set
      category_id = v_category,
      size_id = v_size,
      slug = v_slug,
      sku = nullif(left(trim(coalesce(p ->> 'sku', '')), 40), ''),
      name = left(v_name, 160),
      title_lines = v_title,
      tagline = nullif(left(trim(coalesce(p ->> 'tagline', '')), 240), ''),
      eyebrow = nullif(left(trim(coalesce(p ->> 'eyebrow', '')), 80), ''),
      description = nullif(left(trim(coalesce(p ->> 'description', '')), 5000), ''),
      pieces = v_pieces,
      price = v_price,
      compare_at_price = v_compare,
      currency = coalesce(v_currency, 'AED'),
      stock = v_stock,
      thumbnail_url = nullif(left(trim(coalesce(p ->> 'thumbnail_url', '')), 500), ''),
      image_url = nullif(left(trim(coalesce(p ->> 'image_url', '')), 500), ''),
      image_alt = nullif(left(trim(coalesce(p ->> 'image_alt', '')), 200), ''),
      caption = nullif(left(trim(coalesce(p ->> 'caption', '')), 240), ''),
      hero_subtitle = nullif(left(trim(coalesce(p ->> 'hero_subtitle', '')), 240), ''),
      cta_label = nullif(left(trim(coalesce(p ->> 'cta_label', '')), 40), ''),
      included_title = nullif(left(trim(coalesce(p ->> 'included_title', '')), 120), ''),
      extras_title = nullif(left(trim(coalesce(p ->> 'extras_title', '')), 120), ''),
      perfect_for = v_perfect,
      seo_title = nullif(left(trim(coalesce(p ->> 'seo_title', '')), 160), ''),
      seo_description = nullif(left(trim(coalesce(p ->> 'seo_description', '')), 320), ''),
      is_active = coalesce((p ->> 'is_active')::boolean, false),
      sort_order = v_sort
    where id = v_id;
    if not found then
      raise exception 'NOT_FOUND';
    end if;
  end if;

  delete from public.product_images where product_id = v_id;
  insert into public.product_images (product_id, kind, url, alt, sort_order)
  select v_id, (x ->> 'kind')::public.product_image_kind, left(trim(x ->> 'url'), 500),
         nullif(left(trim(coalesce(x ->> 'alt', '')), 200), ''), (ordinality - 1)::integer
  from jsonb_array_elements(case when jsonb_typeof(p -> 'images') = 'array' then p -> 'images' else '[]'::jsonb end)
    with ordinality as t(x, ordinality)
  where ordinality <= 40
    and trim(coalesce(x ->> 'url', '')) <> ''
    and (x ->> 'kind') in ('frame', 'gallery');

  delete from public.product_showcase where product_id = v_id;
  insert into public.product_showcase (product_id, label, image_url, sort_order)
  select v_id, left(trim(x ->> 'label'), 40), left(trim(x ->> 'image_url'), 500), (ordinality - 1)::integer
  from jsonb_array_elements(case when jsonb_typeof(p -> 'showcase') = 'array' then p -> 'showcase' else '[]'::jsonb end)
    with ordinality as t(x, ordinality)
  where ordinality <= 7
    and trim(coalesce(x ->> 'label', '')) <> ''
    and trim(coalesce(x ->> 'image_url', '')) <> '';

  delete from public.product_stats where product_id = v_id;
  insert into public.product_stats (product_id, label, value, sort_order)
  select v_id, left(trim(x ->> 'label'), 40), (x ->> 'value')::integer, (ordinality - 1)::integer
  from jsonb_array_elements(case when jsonb_typeof(p -> 'stats') = 'array' then p -> 'stats' else '[]'::jsonb end)
    with ordinality as t(x, ordinality)
  where ordinality <= 8
    and trim(coalesce(x ->> 'label', '')) <> ''
    and coalesce(x ->> 'value', '') ~ '^[0-9]+$';

  delete from public.product_contents where product_id = v_id;
  insert into public.product_contents (product_id, name, quantity, note, thumb_kind, image_url, sort_order)
  select v_id, left(trim(x ->> 'name'), 80),
         least(greatest(coalesce(nullif(x ->> 'quantity', ''), '1')::integer, 1), 99),
         nullif(left(trim(coalesce(x ->> 'note', '')), 120), ''),
         'image',
         nullif(left(trim(coalesce(x ->> 'image_url', '')), 500), ''),
         (ordinality - 1)::integer
  from jsonb_array_elements(case when jsonb_typeof(p -> 'contents') = 'array' then p -> 'contents' else '[]'::jsonb end)
    with ordinality as t(x, ordinality)
  where ordinality <= 40
    and trim(coalesce(x ->> 'name', '')) <> ''
    and coalesce(nullif(x ->> 'quantity', ''), '1') ~ '^[0-9]+$';

  delete from public.product_features where product_id = v_id;
  insert into public.product_features (product_id, title, body, icon, sort_order)
  select v_id, left(trim(x ->> 'title'), 80), left(trim(x ->> 'body'), 400),
         (x ->> 'icon')::public.feature_icon, (ordinality - 1)::integer
  from jsonb_array_elements(case when jsonb_typeof(p -> 'features') = 'array' then p -> 'features' else '[]'::jsonb end)
    with ordinality as t(x, ordinality)
  where ordinality <= 8
    and trim(coalesce(x ->> 'title', '')) <> ''
    and trim(coalesce(x ->> 'body', '')) <> ''
    and (x ->> 'icon') in ('mirror', 'trays', 'drawer', 'gift');

  delete from public.product_faqs where product_id = v_id;
  insert into public.product_faqs (product_id, question, answer, sort_order)
  select v_id, left(trim(x ->> 'question'), 180), left(trim(x ->> 'answer'), 1000), (ordinality - 1)::integer
  from jsonb_array_elements(case when jsonb_typeof(p -> 'faqs') = 'array' then p -> 'faqs' else '[]'::jsonb end)
    with ordinality as t(x, ordinality)
  where ordinality <= 12
    and trim(coalesce(x ->> 'question', '')) <> ''
    and trim(coalesce(x ->> 'answer', '')) <> '';

  return jsonb_build_object('id', v_id, 'slug', v_slug);
end;
$$;

-- Status, payment and the private note. Cancelling or refunding puts stock back
-- once. Reopening takes it again, and fails if there is not enough left.
create or replace function public.admin_update_order(
  p_order_number text,
  p_status public.order_status,
  p_payment_status public.payment_status,
  p_notes text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_was_open boolean;
  v_will_open boolean;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN';
  end if;

  select * into v_order from public.orders where order_number = p_order_number for update;
  if not found then
    raise exception 'NOT_FOUND';
  end if;

  perform 1
  from public.products p
  join public.order_items i on i.product_id = p.id
  where i.order_id = v_order.id
  for update of p;

  v_was_open := v_order.status not in ('cancelled', 'refunded');
  v_will_open := p_status not in ('cancelled', 'refunded');

  if v_was_open and not v_will_open then
    update public.products p
    set stock = p.stock + i.quantity
    from public.order_items i
    where i.order_id = v_order.id and i.product_id = p.id;
  elsif not v_was_open and v_will_open then
    if exists (
      select 1
      from public.order_items i
      join public.products p on p.id = i.product_id
      where i.order_id = v_order.id and p.stock < i.quantity
    ) then
      raise exception 'OUT_OF_STOCK';
    end if;
    update public.products p
    set stock = p.stock - i.quantity
    from public.order_items i
    where i.order_id = v_order.id and i.product_id = p.id;
  end if;

  update public.orders
  set status = p_status,
      payment_status = p_payment_status,
      notes = nullif(left(trim(coalesce(p_notes, '')), 1000), '')
  where id = v_order.id;
end;
$$;

revoke all on function public.admin_dashboard() from public, anon;
revoke all on function public.admin_customers() from public, anon;
revoke all on function public.set_user_role(uuid, public.user_role) from public, anon;
revoke all on function public.admin_save_product(jsonb) from public, anon;
revoke all on function public.admin_update_order(text, public.order_status, public.payment_status, text) from public, anon;
grant execute on function public.admin_dashboard() to authenticated;
grant execute on function public.admin_customers() to authenticated;
grant execute on function public.set_user_role(uuid, public.user_role) to authenticated;
grant execute on function public.admin_save_product(jsonb) to authenticated;
grant execute on function public.admin_update_order(text, public.order_status, public.payment_status, text) to authenticated;

-- ── Product photos: public to view, admin to change, images only, 8 MB ──────
do $$
begin
  update storage.buckets
  set public = true,
      file_size_limit = 8388608,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
  where id = 'products';
exception
  when undefined_column then
    update storage.buckets set public = true where id = 'products';
end $$;

drop policy if exists "products bucket: public read" on storage.objects;
create policy "products bucket: public read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'products');
