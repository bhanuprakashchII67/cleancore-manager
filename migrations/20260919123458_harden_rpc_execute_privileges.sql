-- Security hardening: RPCs that mutate Manager data or run as triggers
-- must not be directly callable by browser roles.

revoke execute on function public.approve_invoice_status_change_request(uuid, boolean, text) from public, anon, authenticated;
revoke execute on function public.create_manager_bill(jsonb, jsonb) from public, anon, authenticated;
revoke execute on function public.notify_manager_new_website_activity() from public, anon, authenticated;
revoke execute on function public.purge_deleted_records() from public, anon, authenticated;
revoke execute on function public.request_additional_access(text, text) from public, anon, authenticated;
revoke execute on function public.review_access_request(uuid, boolean, text) from public, anon, authenticated;
revoke execute on function public.review_invoice_payment_selection_change_request(uuid, boolean, text) from public, anon, authenticated;
revoke execute on function public.review_payment_change_request(uuid, boolean, text) from public, anon, authenticated;
revoke execute on function public.set_invoice_payment_selection(uuid, text, text, numeric) from public, anon, authenticated;
revoke execute on function public.sync_website_order_invoice_status() from public, anon, authenticated;
revoke execute on function public.update_invoice_fulfillment(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.update_website_customer_profile(text, text, text, text) from public, anon;
revoke execute on function public.update_website_customer_profile(text, text, text, text, text, text, text) from public, anon;

-- Intentionally browser-callable so unauthenticated client errors can be logged.
revoke execute on function public.log_client_error(text, text, text, text, text, text, text, text, jsonb, text) from public;

-- Make the SQL helper's search path explicit.
alter function public.format_customer_address(text, text, text, text, text)
  set search_path = public;
