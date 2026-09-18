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
  payment_status text not null default 'Credit',
  paid_amount numeric(12,2) not null default 0,
  due_amount numeric(12,2) not null default 0,
  due_date date,
  payment_method text not null default 'Credit',
 total numeric(12,2) not null default 0, profit numeric(12,2) not null default 0,
 created_at timestamptz not null default now()
);
alter table public.invoices add column if not exists customer_business text not null default '';
alter table public.invoices add column if not exists customer_email text not null default '';
alter table public.invoices add column if not exists billing_address text not null default '';
alter table public.invoices add column if not exists delivery_address text not null default '';
alter table public.invoices add column if not exists gst_percent numeric(6,2) not null default 0;
alter table public.invoices add column if not exists gst_amount numeric(12,2) not null default 0;
alter table public.invoices add column if not exists payment_status text not null default 'Credit';
alter table public.invoices add column if not exists paid_amount numeric(12,2) not null default 0;
alter table public.invoices add column if not exists due_amount numeric(12,2) not null default 0;
alter table public.invoices add column if not exists due_date date;
alter table public.invoices add column if not exists payment_method text not null default 'Credit';

create table if not exists public.invoice_items(
 id uuid primary key default gen_random_uuid(), invoice_id uuid not null references public.invoices(id) on delete cascade,
 product_id uuid references public.products(id) on delete set null, product_name text not null,
 qty integer not null check(qty>0), unit_price numeric(12,2) not null, cost_price numeric(12,2) not null,
 line_total numeric(12,2) not null, line_profit numeric(12,2) not null, created_at timestamptz not null default now()
);

create table if not exists public.payments(
 id uuid primary key default gen_random_uuid(),
 invoice_id uuid not null references public.invoices(id) on delete cascade,
 customer_id uuid references public.customers(id) on delete set null,
 amount numeric(12,2) not null check(amount>0),
 payment_date date not null default current_date,
 payment_method text not null default 'Cash',
 notes text not null default '',
 created_at timestamptz not null default now()
);
create index if not exists payments_invoice_idx on public.payments(invoice_id);
create index if not exists payments_customer_idx on public.payments(customer_id);

create table if not exists public.website_products(
 id uuid primary key references public.products(id) on delete cascade,
 name text not null,
 unit text not null,
 selling_price numeric(12,2) not null,
 description text not null default '',
 additional_details text not null default '',
 image_urls jsonb not null default '[]'::jsonb,
 video_urls jsonb not null default '[]'::jsonb,
 active boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table if not exists public.enquiries(
 id uuid primary key default gen_random_uuid(), name text not null, phone text, business text, message text,
 status text not null default 'New', created_at timestamptz not null default now()
);

alter table public.enquiries add column if not exists source text not null default 'manager';
alter table public.enquiries add column if not exists product_name text;
alter table public.enquiries add column if not exists quantity numeric(14,3);
alter table public.enquiries add column if not exists email text;

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
alter table public.payments enable row level security;
alter table public.website_products enable row level security;

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
drop policy if exists payments_admin on public.payments;
create policy payments_admin on public.payments for all to authenticated using(public.is_admin()) with check(public.is_admin());
drop policy if exists website_products_public_read on public.website_products;
create policy website_products_public_read on public.website_products for select to anon,authenticated using(active=true);
drop policy if exists website_products_admin_write on public.website_products;
create policy website_products_admin_write on public.website_products for all to authenticated using(public.is_admin()) with check(public.is_admin());
drop policy if exists enquiries_website_insert on public.enquiries;
create policy enquiries_website_insert on public.enquiries for insert to anon,authenticated with check(source='website');

grant usage on schema public to authenticated;
grant select on public.profiles to authenticated;
grant select,insert,update,delete on public.products,public.customers,public.invoices,public.invoice_items,public.enquiries,public.raw_materials,public.expenses,public.payments to authenticated;
grant select on public.website_products to anon,authenticated;
grant insert on public.enquiries to anon;

create or replace function public.sync_website_product()
returns trigger
language plpgsql
security definer
set search_path=public
as $
begin
  if tg_op='DELETE' then
    delete from public.website_products where id=old.id;
    return old;
  end if;
  insert into public.website_products(id,name,unit,selling_price,description,additional_details,image_urls,video_urls,active,updated_at)
  values(new.id,new.name,new.unit,new.selling_price,new.description,new.additional_details,new.image_urls,new.video_urls,true,now())
  on conflict(id) do update set
    name=excluded.name,
    unit=excluded.unit,
    selling_price=excluded.selling_price,
    description=excluded.description,
    additional_details=excluded.additional_details,
    image_urls=excluded.image_urls,
    video_urls=excluded.video_urls,
    active=true,
    updated_at=now();
  return new;
end;
$;
revoke all on function public.sync_website_product() from public;
drop trigger if exists products_sync_website on public.products;
create trigger products_sync_website
after insert or update or delete on public.products
for each row execute function public.sync_website_product();

insert into public.website_products(id,name,unit,selling_price,description,additional_details,image_urls,video_urls,active)
select id,name,unit,selling_price,description,additional_details,image_urls,video_urls,true
from public.products
on conflict(id) do update set
  name=excluded.name,unit=excluded.unit,selling_price=excluded.selling_price,
  description=excluded.description,additional_details=excluded.additional_details,
  image_urls=excluded.image_urls,video_urls=excluded.video_urls,active=true,updated_at=now();

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


-- Customer website accounts and native website orders.
alter table public.customers add column if not exists auth_user_id uuid references auth.users(id) on delete set null;
create unique index if not exists customers_auth_user_unique on public.customers(auth_user_id) where auth_user_id is not null;

create table if not exists public.website_orders(
 id uuid primary key default gen_random_uuid(),
 order_no text not null unique,
 customer_id uuid not null references public.customers(id) on delete cascade,
 status text not null default 'New'
   check(status in ('New','Confirmed','Processing','Out for Delivery','Delivered','Cancelled')),
 subtotal numeric(12,2) not null default 0,
 total numeric(12,2) not null default 0,
 notes text not null default '',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table if not exists public.website_order_items(
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.website_orders(id) on delete cascade,
 product_id uuid references public.products(id) on delete set null,
 product_name text not null,
 unit text not null,
 qty integer not null check(qty>0),
 unit_price numeric(12,2) not null,
 line_total numeric(12,2) not null,
 created_at timestamptz not null default now()
);

create index if not exists website_orders_customer_idx on public.website_orders(customer_id,created_at desc);
create index if not exists website_orders_created_idx on public.website_orders(created_at desc);
create index if not exists website_order_items_order_idx on public.website_order_items(order_id);

alter table public.website_orders enable row level security;
alter table public.website_order_items enable row level security;

drop policy if exists website_orders_admin on public.website_orders;
create policy website_orders_admin on public.website_orders for all to authenticated using(public.is_admin()) with check(public.is_admin());
drop policy if exists website_orders_customer_select on public.website_orders;
create policy website_orders_customer_select on public.website_orders for select to authenticated using(exists(
 select 1 from public.customers c where c.id=customer_id and c.auth_user_id=auth.uid()
));

drop policy if exists website_order_items_admin on public.website_order_items;
create policy website_order_items_admin on public.website_order_items for all to authenticated using(public.is_admin()) with check(public.is_admin());
drop policy if exists website_order_items_customer_select on public.website_order_items;
create policy website_order_items_customer_select on public.website_order_items for select to authenticated using(exists(
 select 1 from public.website_orders o
 join public.customers c on c.id=o.customer_id
 where o.id=order_id and c.auth_user_id=auth.uid()
));

drop policy if exists customers_website_self_select on public.customers;
create policy customers_website_self_select on public.customers for select to authenticated using(auth_user_id=auth.uid());
drop policy if exists customers_website_self_update on public.customers;
create policy customers_website_self_update on public.customers for update to authenticated using(auth_user_id=auth.uid()) with check(auth_user_id=auth.uid());

create or replace function public.handle_new_customer_user()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
 v_name text := coalesce(new.raw_user_meta_data->>'full_name','');
 v_business text := coalesce(new.raw_user_meta_data->>'business_name','');
 v_phone text := regexp_replace(coalesce(new.raw_user_meta_data->>'phone',''),'[^0-9]','','g');
 v_billing text := coalesce(new.raw_user_meta_data->>'billing_address','');
 v_delivery text := coalesce(new.raw_user_meta_data->>'delivery_address','');
 v_customer_id uuid;
begin
 if new.email is null then raise exception 'Customer account requires an email address'; end if;
 select id into v_customer_id from public.customers
 where auth_user_id is null and lower(coalesce(email,''))=lower(new.email) and coalesce(email,'')<>''
 order by created_at limit 1;
 if v_customer_id is null and v_phone<>'' then
  select id into v_customer_id from public.customers
  where auth_user_id is null and phone=v_phone order by created_at limit 1;
 end if;
 if v_customer_id is null then
  insert into public.customers(name,phone,business_name,email,billing_address,delivery_address,auth_user_id,updated_at)
  values(coalesce(nullif(v_name,''),split_part(new.email,'@',1)),nullif(v_phone,''),v_business,new.email,v_billing,v_delivery,new.id,now())
  returning id into v_customer_id;
 else
  update public.customers
  set name=coalesce(nullif(v_name,''),name),
      phone=coalesce(nullif(v_phone,''),phone),
      business_name=case when v_business<>'' then v_business else business_name end,
      email=new.email,
      billing_address=case when v_billing<>'' then v_billing else billing_address end,
      delivery_address=case when v_delivery<>'' then v_delivery else delivery_address end,
      auth_user_id=new.id,
      updated_at=now()
  where id=v_customer_id;
 end if;
 return new;
end;
$$;
revoke all on function public.handle_new_customer_user() from public;
drop trigger if exists on_auth_user_created_customer on auth.users;
create trigger on_auth_user_created_customer after insert on auth.users for each row execute function public.handle_new_customer_user();

create or replace function public.place_website_order(p_product_id uuid,p_quantity integer,p_notes text default '')
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
 v_customer public.customers%rowtype;
 v_product public.products%rowtype;
 v_id uuid;
 v_order_no text;
 v_total numeric(12,2);
begin
 if auth.uid() is null then raise exception 'Login required'; end if;
 if p_quantity is null or p_quantity<1 or p_quantity>100000 then raise exception 'Quantity must be at least 1'; end if;
 select * into v_customer from public.customers where auth_user_id=auth.uid() limit 1;
 if v_customer.id is null then raise exception 'Customer profile not found'; end if;
 select p.* into v_product from public.products p join public.website_products wp on wp.id=p.id
 where p.id=p_product_id and wp.active=true limit 1;
 if v_product.id is null then raise exception 'Product is unavailable'; end if;
 v_total:=round((v_product.selling_price*p_quantity)::numeric,2);
 v_id:=gen_random_uuid();
 v_order_no:='WEB-'||to_char(now(),'YYYYMMDD')||'-'||upper(substr(replace(v_id::text,'-',''),1,6));
 insert into public.website_orders(id,order_no,customer_id,status,subtotal,total,notes)
 values(v_id,v_order_no,v_customer.id,'New',v_total,v_total,coalesce(p_notes,''));
 insert into public.website_order_items(order_id,product_id,product_name,unit,qty,unit_price,line_total)
 values(v_id,v_product.id,v_product.name,v_product.unit,p_quantity,v_product.selling_price,v_total);
 return jsonb_build_object('order_id',v_id,'order_no',v_order_no,'customer_id',v_customer.id,'product_id',v_product.id,
   'product_name',v_product.name,'quantity',p_quantity,'unit_price',v_product.selling_price,'total',v_total,'status','New');
end;
$$;
revoke all on function public.place_website_order(uuid,integer,text) from public;
revoke execute on function public.place_website_order(uuid,integer,text) from anon;
grant execute on function public.place_website_order(uuid,integer,text) to authenticated;
grant select on public.website_orders,public.website_order_items to authenticated;
