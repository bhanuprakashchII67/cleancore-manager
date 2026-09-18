create extension if not exists pgcrypto;

create table if not exists public.profiles(
 id uuid primary key references auth.users(id) on delete cascade,
 role text not null default 'admin' check(role='admin'),
 full_name text,
 created_at timestamptz not null default now()
);

insert into public.profiles(id,role,full_name)
values('439dd52b-f5ed-4ed4-8e7a-242abae3453c','admin','CleanCore Admin')
on conflict(id) do update set role='admin';

create table if not exists public.products(
 id uuid primary key default gen_random_uuid(), name text not null,
 unit text not null default '5 Litre Can', selling_price numeric(12,2) not null default 349,
 cost_price numeric(12,2) not null default 0, stock integer not null default 0 check(stock>=0),
 low_stock_threshold integer not null default 5 check(low_stock_threshold>=0),
 description text not null default '', additional_details text not null default '',
 image_urls jsonb not null default '[]'::jsonb, video_urls jsonb not null default '[]'::jsonb,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

-- Add the new product fields when this script is run on the existing database.
alter table public.products add column if not exists description text not null default '';
alter table public.products add column if not exists additional_details text not null default '';
alter table public.products add column if not exists image_urls jsonb not null default '[]'::jsonb;
alter table public.products add column if not exists video_urls jsonb not null default '[]'::jsonb;

create table if not exists public.customers(
 id uuid primary key default gen_random_uuid(), name text not null, phone text, gstin text,
 business_name text not null default '', email text not null default '',
 billing_address text not null default '', delivery_address text not null default '',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.customers add column if not exists business_name text not null default '';
alter table public.customers add column if not exists email text not null default '';
alter table public.customers add column if not exists billing_address text not null default '';
alter table public.customers add column if not exists delivery_address text not null default '';
alter table public.customers add column if not exists updated_at timestamptz not null default now();
create unique index if not exists customers_phone_unique on public.customers(phone) where phone is not null and phone<>'';

create table if not exists public.invoices(
 id uuid primary key default gen_random_uuid(), invoice_no text not null unique,
 customer_id uuid references public.customers(id) on delete set null,
 customer_name text not null, customer_phone text, gstin text,
 customer_business text not null default '', customer_email text not null default '',
 billing_address text not null default '', delivery_address text not null default '',
 subtotal numeric(12,2) not null default 0, discount numeric(12,2) not null default 0,
 gst_percent numeric(6,2) not null default 0, gst_amount numeric(12,2) not null default 0,
  cgst_percent numeric(6,2) not null default 0,
  cgst_amount numeric(12,2) not null default 0,
  sgst_percent numeric(6,2) not null default 0,
  sgst_amount numeric(12,2) not null default 0,
  igst_percent numeric(6,2) not null default 0,
  igst_amount numeric(12,2) not null default 0,
 total numeric(12,2) not null default 0, profit numeric(12,2) not null default 0,
 created_at timestamptz not null default now()
);
alter table public.invoices add column if not exists customer_business text not null default '';
alter table public.invoices add column if not exists customer_email text not null default '';
alter table public.invoices add column if not exists billing_address text not null default '';
alter table public.invoices add column if not exists delivery_address text not null default '';
alter table public.invoices add column if not exists gst_percent numeric(6,2) not null default 0;
alter table public.invoices add column if not exists gst_amount numeric(12,2) not null default 0;

create table if not exists public.invoice_items(
 id uuid primary key default gen_random_uuid(), invoice_id uuid not null references public.invoices(id) on delete cascade,
 product_id uuid references public.products(id) on delete set null, product_name text not null,
 qty integer not null check(qty>0), unit_price numeric(12,2) not null, cost_price numeric(12,2) not null,
 line_total numeric(12,2) not null, line_profit numeric(12,2) not null, created_at timestamptz not null default now()
);

create table if not exists public.enquiries(
 id uuid primary key default gen_random_uuid(), name text not null, phone text, business text, message text,
 status text not null default 'New', created_at timestamptz not null default now()
);

create table if not exists public.raw_materials(
 id uuid primary key default gen_random_uuid(),
 name text not null,
 unit text not null default 'Kg',
 cost_per_unit numeric(12,2) not null default 0,
 stock numeric(14,3) not null default 0 check(stock>=0),
 low_stock_threshold numeric(14,3) not null default 5 check(low_stock_threshold>=0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table if not exists public.expenses(
 id uuid primary key default gen_random_uuid(),
 expense_date date not null default current_date,
 category text not null,
 amount numeric(12,2) not null check(amount>0),
 vendor text not null default '',
 payment_method text not null default 'Cash',
 notes text not null default '',
 raw_material_id uuid references public.raw_materials(id) on delete set null,
 quantity numeric(14,3),
 unit_cost numeric(12,2),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists expenses_date_idx on public.expenses(expense_date desc);

insert into public.products(name,unit,selling_price,cost_price,stock)
select x.name,'5 Litre Can',349,0,0 from (values
('Dishwash Liquid'),('Floor Cleaner'),('Toilet Cleaner'),('Glass Cleaner'),('Hand Wash'),('Hard Surface Cleaner'),('All-in-One Cleaner')
)x(name) where not exists(select 1 from public.products p where p.name=x.name);

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$
select exists(select 1 from public.profiles where id=auth.uid() and role='admin');
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.customers enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.enquiries enable row level security;
alter table public.raw_materials enable row level security;
alter table public.expenses enable row level security;

drop policy if exists profiles_self on public.profiles;
create policy profiles_self on public.profiles for select to authenticated using(id=auth.uid() and role='admin');

drop policy if exists products_admin on public.products;
create policy products_admin on public.products for all to authenticated using(public.is_admin()) with check(public.is_admin());
drop policy if exists customers_admin on public.customers;
create policy customers_admin on public.customers for all to authenticated using(public.is_admin()) with check(public.is_admin());
drop policy if exists invoices_admin on public.invoices;
create policy invoices_admin on public.invoices for all to authenticated using(public.is_admin()) with check(public.is_admin());
drop policy if exists invoice_items_admin on public.invoice_items;
create policy invoice_items_admin on public.invoice_items for all to authenticated using(public.is_admin()) with check(public.is_admin());
drop policy if exists enquiries_admin on public.enquiries;
create policy enquiries_admin on public.enquiries for all to authenticated using(public.is_admin()) with check(public.is_admin());
drop policy if exists raw_materials_admin on public.raw_materials;
create policy raw_materials_admin on public.raw_materials for all to authenticated using(public.is_admin()) with check(public.is_admin());
drop policy if exists expenses_admin on public.expenses;
create policy expenses_admin on public.expenses for all to authenticated using(public.is_admin()) with check(public.is_admin());

grant usage on schema public to authenticated;
grant select on public.profiles to authenticated;
grant select,insert,update,delete on public.products,public.customers,public.invoices,public.invoice_items,public.enquiries,public.raw_materials,public.expenses to authenticated;

-- Product photos/videos: public read for the future public website, admin-only upload/change/delete.
insert into storage.buckets(id,name,public)
values('product-media','product-media',true)
on conflict(id) do update set public=true;

drop policy if exists product_media_public_read on storage.objects;
create policy product_media_public_read on storage.objects for select to public using(bucket_id='product-media');
drop policy if exists product_media_admin_insert on storage.objects;
create policy product_media_admin_insert on storage.objects for insert to authenticated with check(bucket_id='product-media' and public.is_admin());
drop policy if exists product_media_admin_update on storage.objects;
create policy product_media_admin_update on storage.objects for update to authenticated using(bucket_id='product-media' and public.is_admin()) with check(bucket_id='product-media' and public.is_admin());
drop policy if exists product_media_admin_delete on storage.objects;
create policy product_media_admin_delete on storage.objects for delete to authenticated using(bucket_id='product-media' and public.is_admin());
