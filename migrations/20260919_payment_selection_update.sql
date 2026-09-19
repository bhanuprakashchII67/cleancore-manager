-- Payment selection from Update Bill Status.
-- Paid records the outstanding balance as a payment; COD/Credit remain unpaid.
-- Partially Paid records the amount entered in the modal.
-- Employee approvals use review_invoice_payment_selection_change_request.

create or replace function public.set_invoice_payment_selection(
  p_invoice_id uuid,
  p_payment_choice text,
  p_payment_method text default null,
  p_partial_amount numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  inv record;
  ledger_paid numeric;
  due numeric;
  method text;
  status text;
  add_amount numeric := 0;
begin
  if not public.is_admin() then raise exception 'Manager approval required'; end if;
  select * into inv from public.invoices where id=p_invoice_id for update;
  if not found then raise exception 'Invoice not found'; end if;
  select coalesce(sum(amount),0) into ledger_paid from public.payments where invoice_id=p_invoice_id;
  if p_payment_choice not in ('PAID','UNPAID','COD','CREDIT','PARTIAL') then raise exception 'Invalid payment choice'; end if;
  if p_payment_choice in ('UNPAID','COD','CREDIT') and ledger_paid>0 then raise exception 'This invoice already has recorded payments. Use Record payment instead.'; end if;

  if p_payment_choice='PAID' then
    add_amount:=greatest(inv.total-ledger_paid,0);
    if add_amount>0 then
      insert into public.payments(invoice_id,customer_id,amount,payment_date,payment_method,notes)
      values(inv.id,inv.customer_id,add_amount,current_date,coalesce(nullif(p_payment_method,''),'Cash'),'Payment marked as paid from Update Bill Status');
      ledger_paid:=ledger_paid+add_amount;
    end if;
    method:=coalesce(nullif(p_payment_method,''),'Cash');
  elsif p_payment_choice='PARTIAL' then
    add_amount:=coalesce(p_partial_amount,0);
    if add_amount<=0 or add_amount>greatest(inv.total-ledger_paid,0) then raise exception 'Enter a partial payment amount within the outstanding amount'; end if;
    insert into public.payments(invoice_id,customer_id,amount,payment_date,payment_method,notes)
    values(inv.id,inv.customer_id,add_amount,current_date,coalesce(nullif(p_payment_method,''),'Cash'),'Part payment recorded from Update Bill Status');
    ledger_paid:=ledger_paid+add_amount;
    method:=coalesce(nullif(p_payment_method,''),'Cash');
  elsif p_payment_choice='COD' then ledger_paid:=0; method:='COD';
  elsif p_payment_choice='CREDIT' then ledger_paid:=0; method:='Credit';
  else ledger_paid:=0; method:='Cash'; end if;

  due:=greatest(inv.total-ledger_paid,0);
  status:=case when due=0 then 'Paid' when ledger_paid>0 then 'Partially Paid' else 'Unpaid' end;
  update public.invoices set paid_amount=ledger_paid,due_amount=due,payment_status=status,payment_method=method,
    due_date=case when due=0 or p_payment_choice in ('COD','UNPAID') then null else due_date end
  where id=inv.id;
  return jsonb_build_object('status',status,'paid_amount',ledger_paid,'due_amount',due,'payment_method',method);
end;
$$;

grant execute on function public.set_invoice_payment_selection(uuid,text,text,numeric) to authenticated;

create or replace function public.review_invoice_payment_selection_change_request(
  p_request_id uuid,p_approve boolean,p_note text default ''
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  req record; inv record; payload jsonb; ledger_paid numeric; due numeric; method text; status text; choice text; partial_amount numeric; add_amount numeric:=0;
begin
  if not public.is_admin() then raise exception 'Manager approval required'; end if;
  select * into req from public.change_requests where id=p_request_id for update;
  if not found then raise exception 'Change request not found'; end if;
  if req.status<>'Pending' then raise exception 'Change request is already reviewed'; end if;
  if req.action<>'invoice_payment_selection_update' then raise exception 'Invalid payment selection request'; end if;
  if not p_approve then
    update public.change_requests set status='Rejected',reviewed_at=now(),reviewed_by=auth.uid(),review_note=coalesce(p_note,'') where id=p_request_id;
    return jsonb_build_object('status','Rejected');
  end if;

  payload:=coalesce(req.payload,'{}'::jsonb);
  select * into inv from public.invoices where id=req.target_id for update;
  if not found then raise exception 'Invoice not found'; end if;
  choice:=payload->>'payment_choice';
  method:=nullif(payload->>'payment_method','');
  partial_amount:=nullif(payload->>'partial_amount','')::numeric;
  select coalesce(sum(amount),0) into ledger_paid from public.payments where invoice_id=inv.id;
  if choice in ('UNPAID','COD','CREDIT') and ledger_paid>0 then raise exception 'This invoice already has recorded payments. Use Record payment instead.'; end if;

  if choice='PAID' then
    add_amount:=greatest(inv.total-ledger_paid,0);
    if add_amount>0 then
      insert into public.payments(invoice_id,customer_id,amount,payment_date,payment_method,notes)
      values(inv.id,inv.customer_id,add_amount,current_date,coalesce(method,'Cash'),'Payment marked as paid from Manager approval');
      ledger_paid:=ledger_paid+add_amount;
    end if;
    method:=coalesce(method,'Cash');
  elsif choice='PARTIAL' then
    add_amount:=coalesce(partial_amount,0);
    if add_amount<=0 or add_amount>greatest(inv.total-ledger_paid,0) then raise exception 'Invalid partial payment amount'; end if;
    insert into public.payments(invoice_id,customer_id,amount,payment_date,payment_method,notes)
    values(inv.id,inv.customer_id,add_amount,current_date,coalesce(method,'Cash'),'Part payment recorded from Manager approval');
    ledger_paid:=ledger_paid+add_amount;
    method:=coalesce(method,'Cash');
  elsif choice='COD' then ledger_paid:=0; method:='COD';
  elsif choice='CREDIT' then ledger_paid:=0; method:='Credit';
  elsif choice='UNPAID' then ledger_paid:=0; method:='Cash';
  else raise exception 'Invalid payment choice'; end if;

  due:=greatest(inv.total-ledger_paid,0);
  status:=case when due=0 then 'Paid' when ledger_paid>0 then 'Partially Paid' else 'Unpaid' end;
  update public.invoices set paid_amount=ledger_paid,due_amount=due,payment_status=status,payment_method=method,
    due_date=case when due=0 or choice in ('COD','UNPAID') then null else due_date end where id=inv.id;
  update public.change_requests set status='Approved',reviewed_at=now(),reviewed_by=auth.uid(),review_note=coalesce(p_note,'') where id=p_request_id;
  return jsonb_build_object('status','Approved','payment_status',status,'paid_amount',ledger_paid,'due_amount',due,'payment_method',method);
end;
$$;

grant execute on function public.review_invoice_payment_selection_change_request(uuid,boolean,text) to authenticated;
