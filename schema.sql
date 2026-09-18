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

-- Employee access, date/time limits, audit trail and manager approval queue.
create table if not exists public.employees(
 id uuid primary key default gen_random_uuid(),
 auth_user_id uuid unique references auth.users(id) on delete cascade,
 username text not null unique,
 full_name text not null default '',
 team text not null default 'custom' check(team in ('account','crm','custom')),
 alert_email text not null default '',
 active boolean not null default true,
 starts_at timestamptz,
 ends_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.employee_permissions(
 employee_id uuid not null references public.employees(id) on delete cascade,
 module text not null check(module in ('dashboard','products','billing','sales','customers','enquiries','website_orders','expenses')),
 enabled boolean not null default true,
 primary key(employee_id,module)
);
create table if not exists public.access_requests(
 id uuid primary key default gen_random_uuid(),
 employee_id uuid references public.employees(id) on delete set null,
 module text not null,
 action text not null,
 reason text not null default '',
 created_at timestamptz not null default now()
);
create table if not exists public.change_requests(
 id uuid primary key default gen_random_uuid(),
 employee_id uuid references public.employees(id) on delete set null,
 module text not null,
 action text not null,
 target_table text,
 target_id uuid,
 payload jsonb not null default '{}'::jsonb,
 status text not null default 'Pending' check(status in ('Pending','Approved','Rejected')),
 requested_at timestamptz not null default now(),
 reviewed_at timestamptz,
 reviewed_by uuid references auth.users(id) on delete set null,
 review_note text not null default ''
);
create table if not exists public.audit_logs(
 id uuid primary key default gen_random_uuid(),
 actor_user_id uuid references auth.users(id) on delete set null,
 employee_id uuid references public.employees(id) on delete set null,
 actor_type text not null default 'employee' check(actor_type in ('admin','employee','system')),
 event_type text not null,
 module text,
 action text,
 target_table text,
 target_id uuid,
 metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
create table if not exists public.manager_notifications(
 id uuid primary key default gen_random_uuid(),
 notification_type text not null,
 subject text not null,
 body text not null,
 related_id uuid,
 email_to text not null default 'cleancorehyd@gmail.com',
 email_status text not null default 'Pending' check(email_status in ('Pending','Sent','Failed','Not configured')),
 created_at timestamptz not null default now(),
 sent_at timestamptz
);

alter table public.employees enable row level security;
alter table public.employee_permissions enable row level security;
alter table public.access_requests enable row level security;
alter table public.change_requests enable row level security;
alter table public.audit_logs enable row level security;
alter table public.manager_notifications enable row level security;

drop policy if exists employees_admin_all on public.employees;
create policy employees_admin_all on public.employees for all to authenticated using(public.is_admin()) with check(public.is_admin());
drop policy if exists employee_self_select on public.employees;
create policy employee_self_select on public.employees for select to authenticated using(auth_user_id=auth.uid());
drop policy if exists employee_permissions_admin_all on public.employee_permissions;
create policy employee_permissions_admin_all on public.employee_permissions for all to authenticated using(public.is_admin()) with check(public.is_admin());
drop policy if exists employee_permissions_self_select on public.employee_permissions;
create policy employee_permissions_self_select on public.employee_permissions for select to authenticated using(exists(select 1 from public.employees e where e.id=employee_id and e.auth_user_id=auth.uid()));
drop policy if exists access_requests_admin_all on public.access_requests;
create policy access_requests_admin_all on public.access_requests for all to authenticated using(public.is_admin()) with check(public.is_admin());
drop policy if exists change_requests_admin_all on public.change_requests;
create policy change_requests_admin_all on public.change_requests for all to authenticated using(public.is_admin()) with check(public.is_admin());
drop policy if exists change_requests_employee_own on public.change_requests;
create policy change_requests_employee_own on public.change_requests for select to authenticated using(exists(select 1 from public.employees e where e.id=employee_id and e.auth_user_id=auth.uid()));
drop policy if exists audit_logs_admin_all on public.audit_logs;
create policy audit_logs_admin_all on public.audit_logs for all to authenticated using(public.is_admin());
drop policy if exists manager_notifications_admin_all on public.manager_notifications;
create policy manager_notifications_admin_all on public.manager_notifications for all to authenticated using(public.is_admin());

create or replace function public.employee_is_active()
returns boolean language sql stable security definer set search_path=public
as $$select exists(select 1 from public.employees e where e.auth_user_id=auth.uid() and e.active=true and (e.starts_at is null or now()>=e.starts_at) and (e.ends_at is null or now()<=e.ends_at));$$;
create or replace function public.employee_has_permission(p_module text)
returns boolean language sql stable security definer set search_path=public
as $$select public.is_admin() or exists(select 1 from public.employees e join public.employee_permissions ep on ep.employee_id=e.id where e.auth_user_id=auth.uid() and e.active=true and ep.enabled=true and ep.module=p_module and (e.starts_at is null or now()>=e.starts_at) and (e.ends_at is null or now()<=e.ends_at));$$;
revoke all on function public.employee_is_active() from public;
revoke all on function public.employee_has_permission(text) from public;
grant execute on function public.employee_is_active() to authenticated;
grant execute on function public.employee_has_permission(text) to authenticated;

drop policy if exists products_employee_read on public.products;
create policy products_employee_read on public.products for select to authenticated using(public.employee_has_permission('products') or public.employee_has_permission('billing'));
drop policy if exists raw_materials_employee_read on public.raw_materials;
create policy raw_materials_employee_read on public.raw_materials for select to authenticated using(public.employee_has_permission('products'));
drop policy if exists invoices_employee_read on public.invoices;
create policy invoices_employee_read on public.invoices for select to authenticated using(public.employee_has_permission('billing') or public.employee_has_permission('sales'));
drop policy if exists invoice_items_employee_read on public.invoice_items;
create policy invoice_items_employee_read on public.invoice_items for select to authenticated using(public.employee_has_permission('billing') or public.employee_has_permission('sales'));
drop policy if exists customers_employee_read on public.customers;
create policy customers_employee_read on public.customers for select to authenticated using(public.employee_has_permission('customers') or public.employee_has_permission('billing'));
drop policy if exists payments_employee_read on public.payments;
create policy payments_employee_read on public.payments for select to authenticated using(public.employee_has_permission('billing') or public.employee_has_permission('sales') or public.employee_has_permission('customers'));
drop policy if exists enquiries_employee_read on public.enquiries;
create policy enquiries_employee_read on public.enquiries for select to authenticated using(public.employee_has_permission('enquiries'));
drop policy if exists expenses_employee_read on public.expenses;
create policy expenses_employee_read on public.expenses for select to authenticated using(public.employee_has_permission('expenses'));
drop policy if exists website_orders_employee_read on public.website_orders;
create policy website_orders_employee_read on public.website_orders for select to authenticated using(public.employee_has_permission('website_orders'));
drop policy if exists website_order_items_employee_read on public.website_order_items;
create policy website_order_items_employee_read on public.website_order_items for select to authenticated using(public.employee_has_permission('website_orders'));

create or replace function public.log_employee_access_attempt(p_module text,p_action text,p_reason text default '')
returns uuid language plpgsql security definer set search_path=public
as $$
declare v_emp public.employees%rowtype; v_id uuid;
begin
 select * into v_emp from public.employees where auth_user_id=auth.uid() limit 1;
 if v_emp.id is null then raise exception 'Employee account not found'; end if;
 insert into public.access_requests(employee_id,module,action,reason) values(v_emp.id,p_module,p_action,coalesce(p_reason,'')) returning id into v_id;
 insert into public.audit_logs(actor_user_id,employee_id,actor_type,event_type,module,action,metadata) values(auth.uid(),v_emp.id,'employee','UNAUTHORIZED_ACCESS',p_module,p_action,jsonb_build_object('reason',coalesce(p_reason,'')));
 insert into public.manager_notifications(notification_type,subject,body,related_id) values('Unauthorized access','CleanCore employee access attempt','Employee "'||v_emp.username||'" attempted to access "'||p_module||'" using "'||p_action||'" at '||to_char(now(),'YYYY-MM-DD HH24:MI:SS TZH:TZM')||'. Reason: '||coalesce(p_reason,''),v_id);
 return v_id;
end; $$;
revoke all on function public.log_employee_access_attempt(text,text,text) from public;
grant execute on function public.log_employee_access_attempt(text,text,text) to authenticated;

create or replace function public.submit_change_request(p_module text,p_action text,p_target_table text,p_target_id uuid,p_payload jsonb,p_reason text default '')
returns uuid language plpgsql security definer set search_path=public
as $$
declare v_emp public.employees%rowtype; v_id uuid;
begin
 select * into v_emp from public.employees where auth_user_id=auth.uid() and active=true and (starts_at is null or now()>=starts_at) and (ends_at is null or now()<=ends_at) limit 1;
 if v_emp.id is null then raise exception 'Employee access is inactive or expired'; end if;
 if not public.employee_has_permission(p_module) then perform public.log_employee_access_attempt(p_module,'CHANGE_REQUEST',coalesce(p_reason,'Change attempted without permission')); raise exception 'You are not allowed to make changes in this section'; end if;
 insert into public.change_requests(employee_id,module,action,target_table,target_id,payload) values(v_emp.id,p_module,p_action,p_target_table,p_target_id,coalesce(p_payload,'{}'::jsonb)) returning id into v_id;
 insert into public.audit_logs(actor_user_id,employee_id,actor_type,event_type,module,action,target_table,target_id,metadata) values(auth.uid(),v_emp.id,'employee','CHANGE_REQUEST',p_module,p_action,p_target_table,p_target_id,jsonb_build_object('reason',coalesce(p_reason,'')));
 insert into public.manager_notifications(notification_type,subject,body,related_id) values('Change approval','CleanCore employee change requires approval','Employee "'||v_emp.username||'" submitted "'||p_action||'" in "'||p_module||'" for manager approval at '||to_char(now(),'YYYY-MM-DD HH24:MI:SS TZH:TZM')||'.',v_id);
 return v_id;
end; $$;
revoke all on function public.submit_change_request(text,text,text,uuid,jsonb,text) from public;
grant execute on function public.submit_change_request(text,text,text,uuid,jsonb,text) to authenticated;

create or replace function public.review_change_request(p_request_id uuid,p_approve boolean,p_note text default '')
returns jsonb language plpgsql security definer set search_path=public
as $$
declare
 r public.change_requests%rowtype; v_id uuid; v_customer_id uuid; v_invoice_id uuid; v_payment_amount numeric; v_new_paid numeric; v_new_due numeric;
begin
 if not public.is_admin() then raise exception 'Manager approval required'; end if;
 select * into r from public.change_requests where id=p_request_id for update;
 if r.id is null then raise exception 'Approval request not found'; end if;
 if r.status<>'Pending' then raise exception 'Approval request is already reviewed'; end if;
 if not p_approve then
   update public.change_requests set status='Rejected',reviewed_at=now(),reviewed_by=auth.uid(),review_note=coalesce(p_note,'') where id=r.id;
   insert into public.audit_logs(actor_user_id,employee_id,actor_type,event_type,module,action,target_table,target_id,metadata) values(auth.uid(),r.employee_id,'admin','CHANGE_REJECTED',r.module,r.action,r.target_table,r.target_id,jsonb_build_object('request_id',r.id,'note',coalesce(p_note,'')));
   return jsonb_build_object('status','Rejected','request_id',r.id);
 end if;

 if r.action='product_create' then
   insert into public.products(name,unit,selling_price,cost_price,stock,low_stock_threshold,description,additional_details,image_urls,video_urls)
   values(coalesce(r.payload->>'name',''),coalesce(r.payload->>'unit','5 Litre Can'),coalesce((r.payload->>'selling_price')::numeric,0),coalesce((r.payload->>'cost_price')::numeric,0),
          coalesce((r.payload->>'stock')::integer,0),coalesce((r.payload->>'low_stock_threshold')::integer,5),coalesce(r.payload->>'description',''),coalesce(r.payload->>'additional_details',''),
          coalesce(r.payload->'image_urls','[]'::jsonb),coalesce(r.payload->'video_urls','[]'::jsonb)) returning id into v_id;
 elsif r.action='product_update' then
   update public.products set name=coalesce(r.payload->>'name',name),unit=coalesce(r.payload->>'unit',unit),
     selling_price=coalesce((r.payload->>'selling_price')::numeric,selling_price),cost_price=coalesce((r.payload->>'cost_price')::numeric,cost_price),
     stock=coalesce((r.payload->>'stock')::integer,stock),low_stock_threshold=coalesce((r.payload->>'low_stock_threshold')::integer,low_stock_threshold),
     description=coalesce(r.payload->>'description',description),additional_details=coalesce(r.payload->>'additional_details',additional_details)
   where id=r.target_id returning id into v_id;
 elsif r.action='product_media_update' then
   if r.payload ? 'image_urls' then update public.products set image_urls=r.payload->'image_urls' where id=r.target_id returning id into v_id;
   elsif r.payload ? 'video_urls' then update public.products set video_urls=r.payload->'video_urls' where id=r.target_id returning id into v_id;
   else raise exception 'No product media payload'; end if;
 elsif r.action='raw_material_create' then
   insert into public.raw_materials(name,unit,cost_per_unit,stock,low_stock_threshold) values(coalesce(r.payload->>'name',''),coalesce(r.payload->>'unit','Kg'),coalesce((r.payload->>'cost_per_unit')::numeric,0),coalesce((r.payload->>'stock')::numeric,0),coalesce((r.payload->>'low_stock_threshold')::numeric,5)) returning id into v_id;
 elsif r.action='raw_material_update' then
   update public.raw_materials set name=coalesce(r.payload->>'name',name),unit=coalesce(r.payload->>'unit',unit),cost_per_unit=coalesce((r.payload->>'cost_per_unit')::numeric,cost_per_unit),
     stock=coalesce((r.payload->>'stock')::numeric,stock),low_stock_threshold=coalesce((r.payload->>'low_stock_threshold')::numeric,low_stock_threshold)
   where id=r.target_id returning id into v_id;
 elsif r.action='customer_create' then
   insert into public.customers(name,phone,gstin,business_name,email,billing_address,delivery_address)
   values(r.payload->>'name',nullif(r.payload->>'phone',''),nullif(r.payload->>'gstin',''),coalesce(r.payload->>'business_name',''),coalesce(r.payload->>'email',''),coalesce(r.payload->>'billing_address',''),coalesce(r.payload->>'delivery_address','')) returning id into v_customer_id;
 elsif r.action='customer_update' then
   update public.customers set name=coalesce(r.payload->>'name',name),phone=coalesce(nullif(r.payload->>'phone',''),phone),gstin=coalesce(nullif(r.payload->>'gstin',''),gstin),
     business_name=coalesce(r.payload->>'business_name',business_name),email=coalesce(r.payload->>'email',email),billing_address=coalesce(r.payload->>'billing_address',billing_address),delivery_address=coalesce(r.payload->>'delivery_address',delivery_address),updated_at=now()
   where id=r.target_id returning id into v_customer_id;
 elsif r.action='expense_create' then
   insert into public.expenses(expense_date,category,amount,vendor,payment_method,notes,raw_material_id,quantity,unit_cost)
   values(coalesce((r.payload->>'expense_date')::date,current_date),r.payload->>'category',coalesce((r.payload->>'amount')::numeric,0),coalesce(r.payload->>'vendor',''),coalesce(r.payload->>'payment_method','Cash'),coalesce(r.payload->>'notes',''),
     case when coalesce(r.payload->>'raw_material_id','')='' then null else (r.payload->>'raw_material_id')::uuid end,
     case when coalesce(r.payload->>'quantity','')='' then null else (r.payload->>'quantity')::numeric end,
     case when coalesce(r.payload->>'unit_cost','')='' then null else (r.payload->>'unit_cost')::numeric end) returning id into v_id;
 elsif r.action='expense_update' then
   update public.expenses set expense_date=coalesce((r.payload->>'expense_date')::date,expense_date),category=coalesce(r.payload->>'category',category),amount=coalesce((r.payload->>'amount')::numeric,amount),
     vendor=coalesce(r.payload->>'vendor',vendor),payment_method=coalesce(r.payload->>'payment_method',payment_method),notes=coalesce(r.payload->>'notes',notes),
     raw_material_id=case when coalesce(r.payload->>'raw_material_id','')='' then null else (r.payload->>'raw_material_id')::uuid end,
     quantity=case when coalesce(r.payload->>'quantity','')='' then null else (r.payload->>'quantity')::numeric end,
     unit_cost=case when coalesce(r.payload->>'unit_cost','')='' then null else (r.payload->>'unit_cost')::numeric end,updated_at=now()
   where id=r.target_id returning id into v_id;
 elsif r.action='expense_delete' then
   delete from public.expenses where id=r.target_id returning id into v_id;
 elsif r.action='enquiry_create' then
   insert into public.enquiries(name,phone,business,message,status,source,product_name,quantity,email)
   values(r.payload->>'name',nullif(r.payload->>'phone',''),coalesce(r.payload->>'business',''),coalesce(r.payload->>'message',''),coalesce(r.payload->>'status','New'),'manager',nullif(r.payload->>'product_name',''),
          case when coalesce(r.payload->>'quantity','')='' then null else (r.payload->>'quantity')::numeric end,coalesce(r.payload->>'email','')) returning id into v_id;
 elsif r.action='payment_create' then
   v_invoice_id:=r.target_id;
   v_payment_amount:=coalesce((r.payload->>'amount')::numeric,0);
   select total-coalesce(paid_amount,0) into v_new_due from public.invoices where id=v_invoice_id for update;
   if v_new_due is null or v_payment_amount<=0 or v_payment_amount>v_new_due then raise exception 'Payment exceeds outstanding credit'; end if;
   insert into public.payments(invoice_id,customer_id,amount,payment_date,payment_method,notes)
   values(v_invoice_id,nullif(r.payload->>'customer_id','')::uuid,v_payment_amount,coalesce((r.payload->>'payment_date')::date,current_date),coalesce(r.payload->>'payment_method','Cash'),coalesce(r.payload->>'notes',''));
   v_new_paid:=least((select total from public.invoices where id=v_invoice_id),coalesce((select paid_amount from public.invoices where id=v_invoice_id),0)+v_payment_amount);
   v_new_due:=greatest((select total from public.invoices where id=v_invoice_id)-v_new_paid,0);
   update public.invoices set paid_amount=v_new_paid,due_amount=v_new_due,payment_status=case when v_new_due=0 then 'Paid' else 'Part Paid' end,due_date=case when v_new_due=0 then null else due_date end where id=v_invoice_id returning id into v_id;
 elsif r.action='website_order_status' then
   update public.website_orders set status=r.payload->>'status',updated_at=now() where id=r.target_id returning id into v_id;
 elsif r.action='invoice_create' then
   if nullif(r.payload->>'customer_id','') is not null then select id into v_customer_id from public.customers where id=(r.payload->>'customer_id')::uuid for update; end if;
   if v_customer_id is null then
     select id into v_customer_id from public.customers where (nullif(r.payload->>'customer_phone','') is not null and phone=nullif(r.payload->>'customer_phone',''))
       or (nullif(r.payload->>'customer_email','') is not null and lower(email)=lower(nullif(r.payload->>'customer_email',''))) order by created_at limit 1;
   end if;
   if v_customer_id is null then
     insert into public.customers(name,phone,gstin,business_name,email,billing_address,delivery_address)
     values(r.payload->>'customer_name',nullif(r.payload->>'customer_phone',''),nullif(r.payload->>'gstin',''),coalesce(r.payload->>'customer_business',''),coalesce(r.payload->>'customer_email',''),
            coalesce(r.payload->>'billing_address',''),coalesce(r.payload->>'delivery_address','')) returning id into v_customer_id;
   else
     update public.customers set name=coalesce(r.payload->>'customer_name',name),phone=coalesce(nullif(r.payload->>'customer_phone',''),phone),gstin=coalesce(nullif(r.payload->>'gstin',''),gstin),
       business_name=coalesce(r.payload->>'customer_business',business_name),email=coalesce(r.payload->>'customer_email',email),billing_address=coalesce(r.payload->>'billing_address',billing_address),
       delivery_address=coalesce(r.payload->>'delivery_address',delivery_address),updated_at=now() where id=v_customer_id;
   end if;
   if exists(select 1 from public.products p join (select (item->>'product_id')::uuid product_id,sum((item->>'qty')::integer) qty from jsonb_array_elements(coalesce(r.payload->'items','[]'::jsonb)) item group by (item->>'product_id')::uuid) q on q.product_id=p.id where p.stock<q.qty)
   then raise exception 'Insufficient stock while approving bill'; end if;
   insert into public.invoices(invoice_no,customer_id,customer_name,customer_phone,gstin,customer_business,customer_email,billing_address,delivery_address,subtotal,discount,gst_percent,gst_amount,cgst_percent,cgst_amount,sgst_percent,sgst_amount,igst_percent,igst_amount,payment_status,paid_amount,due_amount,due_date,payment_method,total,profit)
   values(r.payload->>'invoice_no',v_customer_id,r.payload->>'customer_name',nullif(r.payload->>'customer_phone',''),nullif(r.payload->>'gstin',''),coalesce(r.payload->>'customer_business',''),coalesce(r.payload->>'customer_email',''),
     coalesce(r.payload->>'billing_address',''),coalesce(r.payload->>'delivery_address',''),coalesce((r.payload->>'subtotal')::numeric,0),coalesce((r.payload->>'discount')::numeric,0),
     coalesce((r.payload->>'gst_percent')::numeric,0),coalesce((r.payload->>'gst_amount')::numeric,0),coalesce((r.payload->>'cgst_percent')::numeric,0),coalesce((r.payload->>'cgst_amount')::numeric,0),
     coalesce((r.payload->>'sgst_percent')::numeric,0),coalesce((r.payload->>'sgst_amount')::numeric,0),coalesce((r.payload->>'igst_percent')::numeric,0),coalesce((r.payload->>'igst_amount')::numeric,0),
     coalesce(r.payload->>'payment_status','Credit'),coalesce((r.payload->>'paid_amount')::numeric,0),coalesce((r.payload->>'due_amount')::numeric,0),nullif(r.payload->>'due_date','')::date,
     coalesce(r.payload->>'payment_method','Credit'),coalesce((r.payload->>'total')::numeric,0),coalesce((r.payload->>'profit')::numeric,0)) returning id into v_invoice_id;
   insert into public.invoice_items(invoice_id,product_id,product_name,qty,unit_price,cost_price,line_total,line_profit)
   select v_invoice_id,(item->>'product_id')::uuid,item->>'product_name',(item->>'qty')::integer,(item->>'unit_price')::numeric,(item->>'cost_price')::numeric,(item->>'line_total')::numeric,(item->>'line_profit')::numeric)
   from jsonb_array_elements(coalesce(r.payload->'items','[]'::jsonb)) item;
   update public.products p set stock=p.stock-q.qty from (select (item->>'product_id')::uuid product_id,sum((item->>'qty')::integer) qty from jsonb_array_elements(coalesce(r.payload->'items','[]'::jsonb)) item group by (item->>'product_id')::uuid) q where p.id=q.product_id;
   if coalesce((r.payload->>'paid_amount')::numeric,0)>0 then
     insert into public.payments(invoice_id,customer_id,amount,payment_date,payment_method,notes) values(v_invoice_id,v_customer_id,(r.payload->>'paid_amount')::numeric,current_date,coalesce(r.payload->>'payment_method','Cash'),'Initial payment');
   end if;
   v_id:=v_invoice_id;
 else raise exception 'Unsupported change request action: %',r.action;
 end if;

 update public.change_requests set status='Approved',reviewed_at=now(),reviewed_by=auth.uid(),review_note=coalesce(p_note,'') where id=r.id;
 insert into public.audit_logs(actor_user_id,employee_id,actor_type,event_type,module,action,target_table,target_id,metadata) values(auth.uid(),r.employee_id,'admin','CHANGE_APPROVED',r.module,r.action,r.target_table,coalesce(r.target_id,v_id,v_customer_id,v_invoice_id),jsonb_build_object('request_id',r.id,'note',coalesce(p_note,'')));
 return jsonb_build_object('status','Approved','request_id',r.id,'created_id',coalesce(v_id,v_customer_id,v_invoice_id));
end; $$;
revoke all on function public.review_change_request(uuid,boolean,text) from public;
grant execute on function public.review_change_request(uuid,boolean,text) to authenticated;


-- Separate employee portal links and employee-raised access tickets.
alter table public.employees
  add column if not exists portal_key uuid not null default gen_random_uuid();

create unique index if not exists employees_portal_key_unique
  on public.employees(portal_key);

alter table public.access_requests
  add column if not exists status text not null default 'Pending'
    check(status in ('Pending','Approved','Rejected')),
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null;

create index if not exists access_requests_status_idx
  on public.access_requests(status,created_at desc);

drop policy if exists access_requests_employee_own on public.access_requests;
create policy access_requests_employee_own
  on public.access_requests for select to authenticated
  using(exists(
    select 1 from public.employees e
    where e.id=access_requests.employee_id and e.auth_user_id=auth.uid()
  ));

create or replace function public.request_additional_access(p_module text,p_reason text default '')
returns uuid language plpgsql security definer set search_path=public
as $$
declare v_emp public.employees%rowtype; v_id uuid;
begin
  if not exists(select 1 from (values ('dashboard'),('products'),('billing'),('sales'),('customers'),('enquiries'),('website_orders'),('expenses')) m(module) where m.module=p_module)
    then raise exception 'Invalid access section'; end if;
  select * into v_emp from public.employees where auth_user_id=auth.uid() and active=true
    and (starts_at is null or now()>=starts_at) and (ends_at is null or now()<=ends_at) limit 1;
  if v_emp.id is null then raise exception 'Employee access is inactive or expired'; end if;
  if public.employee_has_permission(p_module) then raise exception 'You already have this access'; end if;
  insert into public.access_requests(employee_id,module,action,reason,status)
  values(v_emp.id,p_module,'REQUEST_ACCESS',coalesce(p_reason,''),'Pending') returning id into v_id;
  insert into public.audit_logs(actor_user_id,employee_id,actor_type,event_type,module,action,metadata)
  values(auth.uid(),v_emp.id,'employee','ACCESS_REQUEST',p_module,'REQUEST_ACCESS',jsonb_build_object('reason',coalesce(p_reason,'')));
  insert into public.manager_notifications(notification_type,subject,body,related_id)
  values('Access request','CleanCore employee requested additional access',
         'Employee "'||v_emp.username||'" requested access to "'||p_module||'" at '||to_char(now(),'YYYY-MM-DD HH24:MI:SS TZH:TZM')||'. Reason: '||coalesce(p_reason,''),v_id);
  return v_id;
end; $$;
revoke all on function public.request_additional_access(text,text) from public;
grant execute on function public.request_additional_access(text,text) to authenticated;

create or replace function public.review_access_request(p_request_id uuid,p_approve boolean,p_note text default '')
returns jsonb language plpgsql security definer set search_path=public
as $$
declare r public.access_requests%rowtype;
begin
  if not public.is_admin() then raise exception 'Manager approval required'; end if;
  select * into r from public.access_requests where id=p_request_id for update;
  if r.id is null then raise exception 'Access request not found'; end if;
  if r.status<>'Pending' then raise exception 'Access request is already reviewed'; end if;
  if p_approve then
    insert into public.employee_permissions(employee_id,module,enabled)
      values(r.employee_id,r.module,true)
      on conflict(employee_id,module) do update set enabled=true;
    update public.access_requests set status='Approved',reviewed_at=now(),reviewed_by=auth.uid() where id=r.id;
    insert into public.audit_logs(actor_user_id,employee_id,actor_type,event_type,module,action,metadata)
      values(auth.uid(),r.employee_id,'admin','ACCESS_APPROVED',r.module,'GRANT_ACCESS',jsonb_build_object('request_id',r.id,'note',coalesce(p_note,'')));
    return jsonb_build_object('status','Approved','request_id',r.id,'module',r.module);
  else
    update public.access_requests set status='Rejected',reviewed_at=now(),reviewed_by=auth.uid() where id=r.id;
    insert into public.audit_logs(actor_user_id,employee_id,actor_type,event_type,module,action,metadata)
      values(auth.uid(),r.employee_id,'admin','ACCESS_REJECTED',r.module,'DENY_ACCESS',jsonb_build_object('request_id',r.id,'note',coalesce(p_note,'')));
    return jsonb_build_object('status','Rejected','request_id',r.id,'module',r.module);
  end if;
end; $$;
revoke all on function public.review_access_request(uuid,boolean,text) from public;
grant execute on function public.review_access_request(uuid,boolean,text) to authenticated;


-- Admin-only raw-material save endpoint used by the Manager UI.
create or replace function public.save_raw_material_admin(
  p_id uuid default null,
  p_name text default '',
  p_unit text default 'Kg',
  p_cost_per_unit numeric default 0,
  p_stock numeric default 0,
  p_low_stock_threshold numeric default 5
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare v_id uuid;
begin
  if not public.is_admin() then raise exception 'Manager approval required'; end if;
  if nullif(trim(coalesce(p_name,'')),'') is null then raise exception 'Raw material name is required'; end if;
  if p_id is null then
    insert into public.raw_materials(name,unit,cost_per_unit,stock,low_stock_threshold)
    values(trim(p_name),coalesce(nullif(trim(p_unit),''),'Kg'),greatest(coalesce(p_cost_per_unit,0),0),greatest(coalesce(p_stock,0),0),greatest(coalesce(p_low_stock_threshold,0),0))
    returning id into v_id;
  else
    update public.raw_materials
    set name=trim(p_name),unit=coalesce(nullif(trim(p_unit),''),'Kg'),
        cost_per_unit=greatest(coalesce(p_cost_per_unit,0),0),
        stock=greatest(coalesce(p_stock,0),0),
        low_stock_threshold=greatest(coalesce(p_low_stock_threshold,0),0),
        updated_at=now()
    where id=p_id
    returning id into v_id;
    if v_id is null then raise exception 'Raw material not found'; end if;
  end if;
  return v_id;
end;
$$;
revoke all on function public.save_raw_material_admin(uuid,text,text,numeric,numeric,numeric) from public;
grant execute on function public.save_raw_material_admin(uuid,text,text,numeric,numeric,numeric) to authenticated;


-- Manager-only raw-material deletion endpoint.
create or replace function public.delete_raw_material_admin(p_id uuid)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare v_id uuid;
begin
  if not public.is_admin() then raise exception 'Manager approval required'; end if;
  delete from public.raw_materials where id=p_id returning id into v_id;
  if v_id is null then raise exception 'Raw material not found'; end if;
  return v_id;
end;
$$;
revoke all on function public.delete_raw_material_admin(uuid) from public;
revoke execute on function public.delete_raw_material_admin(uuid) from anon;
grant execute on function public.delete_raw_material_admin(uuid) to authenticated;

 
-- Archive customers from active lists while preserving financial history.
alter table public.customers
  add column if not exists archived_at timestamptz;

create index if not exists customers_archived_idx
  on public.customers(archived_at);

create or replace function public.archive_customer_admin(p_customer_id uuid)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare v_id uuid;
begin
  if not public.is_admin() then raise exception 'Manager approval required'; end if;
  update public.customers
  set archived_at=coalesce(archived_at,now()),updated_at=now()
  where id=p_customer_id
  returning id into v_id;
  if v_id is null then raise exception 'Customer not found'; end if;
  return v_id;
end;
$$;

revoke all on function public.archive_customer_admin(uuid) from public;
revoke execute on function public.archive_customer_admin(uuid) from anon;
grant execute on function public.archive_customer_admin(uuid) to authenticated;


-- Structured customer address fields.
alter table public.customers
  add column if not exists billing_shop_no text,
  add column if not exists billing_colony text,
  add column if not exists billing_city text,
  add column if not exists billing_state text,
  add column if not exists billing_pincode text,
  add column if not exists delivery_shop_no text,
  add column if not exists delivery_colony text,
  add column if not exists delivery_city text,
  add column if not exists delivery_state text,
  add column if not exists delivery_pincode text;

create or replace function public.review_customer_change_request(p_request_id uuid,p_approve boolean,p_note text default '')
returns jsonb language plpgsql security definer set search_path=public
as $$
declare r public.change_requests%rowtype; v_id uuid; v_bill text; v_delivery text;
begin
  if not public.is_admin() then raise exception 'Manager approval required'; end if;
  select * into r from public.change_requests where id=p_request_id for update;
  if r.id is null then raise exception 'Approval request not found'; end if;
  if r.status<>'Pending' then raise exception 'Approval request is already reviewed'; end if;
  if r.action not in ('customer_create','customer_update') then raise exception 'Invalid customer change request'; end if;
  if not p_approve then
    update public.change_requests set status='Rejected',reviewed_at=now(),reviewed_by=auth.uid(),review_note=coalesce(p_note,'') where id=r.id;
    return jsonb_build_object('status','Rejected','request_id',r.id);
  end if;
  v_bill:=trim(both ', ' from concat_ws(', ',nullif(trim(r.payload->>'billing_shop_no'),''),nullif(trim(r.payload->>'billing_colony'),''),nullif(trim(r.payload->>'billing_city'),''),nullif(trim(r.payload->>'billing_state'),''),nullif(trim(r.payload->>'billing_pincode'),'')));
  v_delivery:=trim(both ', ' from concat_ws(', ',nullif(trim(r.payload->>'delivery_shop_no'),''),nullif(trim(r.payload->>'delivery_colony'),''),nullif(trim(r.payload->>'delivery_city'),''),nullif(trim(r.payload->>'delivery_state'),''),nullif(trim(r.payload->>'delivery_pincode'),'') ));
  if r.action='customer_create' then
    insert into public.customers(name,phone,gstin,business_name,email,billing_address,delivery_address,billing_shop_no,billing_colony,billing_city,billing_state,billing_pincode,delivery_shop_no,delivery_colony,delivery_city,delivery_state,delivery_pincode)
    values(r.payload->>'name',nullif(r.payload->>'phone',''),nullif(r.payload->>'gstin',''),coalesce(r.payload->>'business_name',''),coalesce(r.payload->>'email',''),v_bill,v_delivery,
      coalesce(r.payload->>'billing_shop_no',''),coalesce(r.payload->>'billing_colony',''),coalesce(r.payload->>'billing_city',''),coalesce(r.payload->>'billing_state',''),coalesce(r.payload->>'billing_pincode',''),
      coalesce(r.payload->>'delivery_shop_no',''),coalesce(r.payload->>'delivery_colony',''),coalesce(r.payload->>'delivery_city',''),coalesce(r.payload->>'delivery_state',''),coalesce(r.payload->>'delivery_pincode','')) returning id into v_id;
  else
    update public.customers set name=coalesce(r.payload->>'name',name),phone=coalesce(nullif(r.payload->>'phone',''),phone),gstin=coalesce(nullif(r.payload->>'gstin',''),gstin),business_name=coalesce(r.payload->>'business_name',business_name),email=coalesce(r.payload->>'email',email),
      billing_address=case when r.payload ? 'billing_shop_no' then v_bill else coalesce(r.payload->>'billing_address',billing_address) end,
      delivery_address=case when r.payload ? 'delivery_shop_no' then v_delivery else coalesce(r.payload->>'delivery_address',delivery_address) end,
      billing_shop_no=coalesce(r.payload->>'billing_shop_no',billing_shop_no),billing_colony=coalesce(r.payload->>'billing_colony',billing_colony),billing_city=coalesce(r.payload->>'billing_city',billing_city),billing_state=coalesce(r.payload->>'billing_state',billing_state),billing_pincode=coalesce(r.payload->>'billing_pincode',billing_pincode),
      delivery_shop_no=coalesce(r.payload->>'delivery_shop_no',delivery_shop_no),delivery_colony=coalesce(r.payload->>'delivery_colony',delivery_colony),delivery_city=coalesce(r.payload->>'delivery_city',delivery_city),delivery_state=coalesce(r.payload->>'delivery_state',delivery_state),delivery_pincode=coalesce(r.payload->>'delivery_pincode',delivery_pincode),updated_at=now()
    where id=r.target_id returning id into v_id;
  end if;
  if v_id is null then raise exception 'Customer not found or could not be created'; end if;
  update public.change_requests set status='Approved',reviewed_at=now(),reviewed_by=auth.uid(),review_note=coalesce(p_note,'') where id=r.id;
  return jsonb_build_object('status','Approved','request_id',r.id,'created_id',v_id);
end;
$$;
revoke all on function public.review_customer_change_request(uuid,boolean,text) from public;
grant execute on function public.review_customer_change_request(uuid,boolean,text) to authenticated;


-- website_order_invoice_gst_v2: website checkout GST + automatic invoice linkage
create sequence if not exists public.website_invoice_seq;
alter table public.website_orders
  add column if not exists invoice_id uuid references public.invoices(id) on delete set null,
  add column if not exists invoice_no text,
  add column if not exists gst_enabled boolean not null default false,
  add column if not exists gst_percent numeric(5,2) not null default 0,
  add column if not exists gst_amount numeric(12,2) not null default 0,
  add column if not exists cgst_percent numeric(5,2) not null default 0,
  add column if not exists cgst_amount numeric(12,2) not null default 0,
  add column if not exists sgst_percent numeric(5,2) not null default 0,
  add column if not exists sgst_amount numeric(12,2) not null default 0,
  add column if not exists igst_percent numeric(5,2) not null default 0,
  add column if not exists igst_amount numeric(12,2) not null default 0,
  add column if not exists place_of_supply text,
  add column if not exists customer_gstin text;
create index if not exists website_orders_invoice_idx on public.website_orders(invoice_id);
-- Keep the live Supabase function definitions in sync with the deployed migration.


-- add_product_hsn_invoice_fields
alter table public.products add column if not exists hsn_code text;
alter table public.invoice_items add column if not exists hsn_code text;
alter table public.website_order_items add column if not exists hsn_code text;
alter table public.invoices add column if not exists place_of_supply text;


-- quotation_invoice_document_type
alter table public.invoices
  add column if not exists document_type text not null default 'SALE';
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.invoices'::regclass and conname='invoices_document_type_check'
  ) then
    alter table public.invoices
      add constraint invoices_document_type_check
      check (document_type in ('SALE','QUOTATION'));
  end if;
end $$;
create index if not exists invoices_document_type_created_idx
  on public.invoices(document_type,created_at desc);

-- The deployed review_change_request function contains the quotation-specific
-- behavior: quotations are stored and itemized, but do not create payments,
-- do not decrement product stock, and do not contribute to sales/profit.
