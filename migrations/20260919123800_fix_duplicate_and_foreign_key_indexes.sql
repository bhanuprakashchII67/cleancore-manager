-- Remove duplicate indexes and add covering indexes for error_logs foreign keys.

drop index if exists public.payments_customer_idx;
drop index if exists public.payments_invoice_idx;

create index if not exists error_logs_resolved_by_idx
  on public.error_logs (resolved_by);
create index if not exists error_logs_user_id_idx
  on public.error_logs (user_id);
