# approve-access-request

Creates an auth user + profile from an `access_requests` row and sends
a Supabase invite email so the investor can set a password.

## Env vars

- `SUPABASE_URL` — auto-injected
- `SUPABASE_SERVICE_ROLE_KEY` — auto-injected

## Auth

`verify_jwt: true`. Caller must be authenticated and have `profiles.role = 'admin'`.

## Request

```
POST /functions/v1/approve-access-request
Authorization: Bearer <admin user jwt>
Content-Type: application/json

{ "access_request_id": "uuid" }
```

## Responses

- `200` — `{ message, user_id, email }` invite sent + access_request marked approved
- `400` — missing/invalid body
- `401` — no auth header or invalid token
- `403` — caller is not admin
- `404` — access_request not found
- `409` — access_request already processed, OR email already has an account
- `500` — invite failure, DB failure

## Flow

1. Verify caller is admin.
2. Fetch `access_requests` row; must be `status = 'pending'`.
3. `supabaseAdmin.auth.admin.inviteUserByEmail(email, { data: { full_name, company } })` — Supabase sends the invite.
4. The `handle_new_user()` trigger auto-inserts a `profiles` row (`role = 'client'`, `full_name`, `email`). We additionally upsert `profiles` to persist `company` (the trigger does not copy that field).
5. Update `access_requests.status = 'approved'` + `reviewed_by = <admin user id>`.

## Supabase dashboard prerequisites

- **Site URL** must be set correctly (e.g. `https://app.resid.nl`) so that the invite email's "Set password" link points to the right host.
- **Invite email template** uses the Supabase default. Branding (logo, copy) is a dashboard config task — out of scope for this function.

## Manual test

```bash
curl -X POST \
  "https://lvueuukiekykudfsvnmk.supabase.co/functions/v1/approve-access-request" \
  -H "Authorization: Bearer <ADMIN_JWT>" \
  -H "Content-Type: application/json" \
  -d '{"access_request_id":"<UUID>"}'
```

Expected: `200` with `user_id` + `email`, invite mail lands in inbox, `access_requests.status` flips to `approved`, new `profiles` row exists with `role='client'`.
