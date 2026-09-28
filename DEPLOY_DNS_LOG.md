# Domain cutover log — advancedmarketers.co → Railway

## What happened
Publishing the `advanced-marketers-draft` Railway project to the live domain `advancedmarketers.co`.

- Date: 2026-09-24
- Railway project: `advanced-marketers-draft` (ID `0449e824-2a95-4ee9-8e46-4dfff666932e`)
- Environment: `production` (ID `e98b38ac-a507-4821-888f-f3fb2b5540e7`)
- Service: `advanced-marketers` (ID `a5cbe217-5268-4b89-9660-fb71f245076d`)
- GitHub repo backing the service: `dot-jaypeg/advanced-marketers`
- Railway default domain (unaffected, still active): `advanced-marketers-production.up.railway.app`

## Railway-side change made
Ran:
```
railway domain www.advancedmarketers.co
```
This created a **new custom domain** on the service:
- Custom domain ID: `8b108de5-5c3b-40eb-9374-16821d740834`
- Domain: `www.advancedmarketers.co`

Railway's required DNS record for this domain to route traffic:

| Type  | Host | Value                     |
|-------|------|---------------------------|
| CNAME | www  | `hj5z3m2l.up.railway.app` |

Also required — ownership verification (Railway won't issue the TLS cert without this; as of this log it's still unverified):

| Type | Host                  | Value                                                                          |
|------|-----------------------|---------------------------------------------------------------------------------|
| TXT  | `_railway-verify.www` | `railway-verify=df472c0aa8c013d5e3f47a4bbd4519a510482fb90a1e7cbcf969c5409b73e19d` |

## GoDaddy-side change needed (done manually by user — GODADDY_PAT in .secrets/godaddy.env does NOT have access to this domain's shopper account)
On the `advancedmarketers.co` zone at GoDaddy, **only** touch:
1. Add/update CNAME: `www` → `hj5z3m2l.up.railway.app`
2. Add TXT: `_railway-verify.www` → `railway-verify=df472c0aa8c013d5e3f47a4bbd4519a510482fb90a1e7cbcf969c5409b73e19d` (required for cert issuance — remove once `verified: true`, or leave it, doesn't hurt)
3. Set apex (`@`) domain forwarding to redirect to `https://www.advancedmarketers.co` (GoDaddy "Forwarding" feature, not a DNS record edit — leave existing `@`/apex records alone).

Do not modify any other existing records (MX, other CNAMEs, TXT/SPF, etc.).

## How to undo
1. **Railway:** `railway domain delete www.advancedmarketers.co --yes` (from this repo dir, after `railway link` if needed) — removes the custom domain, service falls back to the `.up.railway.app` domain only.
2. **GoDaddy:** remove/revert the `www` CNAME record added above, and turn off the apex → www forwarding rule (or restore whatever it pointed to before, if anything).

## Notes
- This repo's `railway link` was pointed at project `0449e824-2a95-4ee9-8e46-4dfff666932e` / service `a5cbe217-5268-4b89-9660-fb71f245076d` / env `e98b38ac-a507-4821-888f-f3fb2b5540e7` to run the domain command above.
