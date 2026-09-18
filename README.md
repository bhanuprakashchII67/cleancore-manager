# CleanCore Manager — Supabase-connected starter

Supabase URL: https://rwfamxkfqslorxcryjrp.supabase.co

## First setup
1. Supabase → SQL Editor.
2. Paste `schema.sql` and Run.
3. Confirm the seven products appear in Table Editor → products.
4. Open this app and sign in with your existing Auth user.

## Security
The browser contains only the Supabase publishable key. Never add a secret/service-role key.
RLS policies restrict business tables to the admin row in `profiles`.

## Important authentication detail
Supabase email OTP is a passwordless sign-in method. It is not currently a native second factor for email+password MFA; native MFA factors are TOTP and phone. The app therefore offers password login and email-OTP login as separate methods. Password changes use Supabase reauthentication and the current-password requirement you enabled.

## Production
For real business use, configure custom SMTP and deploy the admin app behind an authentication-capable private host. Do not use free GitHub Pages for a private admin site.
