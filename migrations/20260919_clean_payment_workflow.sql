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
