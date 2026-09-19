-- Payment workflow cleanup
-- Applied to Supabase project rwfamxkfqslorxcryjrp on 2026-09-19.
-- Keep payment method separate from payment status:
--   status: Unpaid / Partially Paid / Paid / Not Applicable
--   method: Cash / UPI / Bank Transfer / Card / COD / Cheque / Other / Credit
--
-- COD is intentionally represented as payment_method='COD' with payment_status='Unpaid'
-- until a payment transaction is actually recorded.

update public.invoices
set payment_status = 'Partially Paid'
where payment_status = 'Part Paid';

alter table public.invoices
  alter column payment_status set default 'Unpaid';

alter table public.invoices
  drop constraint if exists invoices_payment_status_check;

alter table public.invoices
  add constraint invoices_payment_status_check
  check (payment_status = any (array[
    'Unpaid'::text,
    'Partially Paid'::text,
    'Paid'::text,
    'Not Applicable'::text,
    'Credit'::text
  ]));

alter table public.payments
  add column if not exists reference text;

create index if not exists payments_invoice_id_idx
  on public.payments(invoice_id);

create index if not exists payments_customer_id_idx
  on public.payments(customer_id);


-- Employee payment approvals use a dedicated RPC so payment references and
-- aggregate invoice totals are updated consistently.
create or replace function public.review_payment_change_request(
  p_request_id uuid,
  p_approve boolean,
  p_note text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  r public.change_requests%rowtype;
  v_invoice public.invoices%rowtype;
  v_payment_id uuid;
  v_paid numeric;
  v_due numeric;
  v_methods text[];
  v_summary_method text;
begin
  if not public.is_admin() then raise exception 'Manager approval required'; end if;
  select * into r from public.change_requests where id=p_request_id for update;
  if r.id is null then raise exception 'Approval request not found'; end if;
  if r.status<>'Pending' then raise exception 'Approval request is already reviewed'; end if;
  if r.action<>'payment_create' then raise exception 'Invalid payment request'; end if;
  if not p_approve then
    update public.change_requests set status='Rejected',reviewed_at=now(),reviewed_by=auth.uid(),review_note=coalesce(p_note,'') where id=r.id;
    insert into public.audit_logs(actor_user_id,employee_id,actor_type,event_type,module,action,target_table,target_id,metadata)
    values(auth.uid(),r.employee_id,'admin','CHANGE_REJECTED',r.module,r.action,r.target_table,r.target_id,jsonb_build_object('request_id',r.id,'note',coalesce(p_note,'')));
    return jsonb_build_object('status','Rejected','request_id',r.id);
  end if;
  select * into v_invoice from public.invoices where id=r.target_id for update;
  if v_invoice.id is null then raise exception 'Invoice not found'; end if;
  if coalesce((r.payload->>'amount')::numeric,0)<=0 or coalesce((r.payload->>'amount')::numeric,0)>greatest(v_invoice.total-coalesce(v_invoice.paid_amount,0),0) then
    raise exception 'Payment exceeds outstanding amount';
  end if;
  insert into public.payments(invoice_id,customer_id,amount,payment_date,payment_method,reference,notes)
  values(v_invoice.id,nullif(r.payload->>'customer_id','')::uuid,(r.payload->>'amount')::numeric,coalesce((r.payload->>'payment_date')::date,current_date),coalesce(r.payload->>'payment_method','Cash'),nullif(trim(r.payload->>'reference'),''),coalesce(r.payload->>'notes',''))
  returning id into v_payment_id;
  select coalesce(sum(amount),0) into v_paid from public.payments where invoice_id=v_invoice.id;
  v_due:=greatest(v_invoice.total-v_paid,0);
  select array_agg(distinct payment_method order by payment_method) into v_methods from public.payments where invoice_id=v_invoice.id and payment_method is not null;
  v_summary_method:=case when coalesce(array_length(v_methods,1),0)=1 then v_methods[1] when coalesce(array_length(v_methods,1),0)>1 then 'Multiple' else null end;
  update public.invoices set paid_amount=v_paid,due_amount=v_due,payment_status=case when v_due=0 then 'Paid' when v_paid>0 then 'Partially Paid' else 'Unpaid' end,due_date=case when v_due=0 then null else due_date end,payment_method=coalesce(v_summary_method,payment_method) where id=v_invoice.id;
  update public.change_requests set status='Approved',reviewed_at=now(),reviewed_by=auth.uid(),review_note=coalesce(p_note,'') where id=r.id;
  insert into public.audit_logs(actor_user_id,employee_id,actor_type,event_type,module,action,target_table,target_id,metadata)
  values(auth.uid(),r.employee_id,'admin','CHANGE_APPROVED',r.module,r.action,r.target_table,v_invoice.id,jsonb_build_object('request_id',r.id,'payment_id',v_payment_id,'amount',(r.payload->>'amount')::numeric,'note',coalesce(p_note,'')));
  return jsonb_build_object('status','Approved','request_id',r.id,'created_id',v_payment_id,'invoice_id',v_invoice.id,'paid',v_paid,'due',v_due);
end;
$function$;

grant execute on function public.review_payment_change_request(uuid,boolean,text) to authenticated;
