# Infrastructure notice — 13 October 2026

Requested by Nio; implemented by Codex on `main`, then merged into `staging`.

Production `/admin` and both production/staging `/studio` display a full-page unpaid-infrastructure notice for restricted visitors, including Wayne. The message asks visitors to settle unpaid invoices and contact the developers. Nio and Heins retain their existing authenticated access. The separate `/admin-ocms` portal and player/operator surfaces are excluded.

`ADMIN_INFRASTRUCTURE_SUSPENDED=true` and `STUDIO_INFRASTRUCTURE_SUSPENDED=true` enable production suspension. On Vercel Preview scoped to the `staging` branch, use `ADMIN_INFRASTRUCTURE_SUSPENDED=false` and `STUDIO_INFRASTRUCTURE_SUSPENDED=true`. Defaults are false. Both switches are server-only and non-secret.

Implementation: `src/lib/infrastructure-access.ts`, `src/proxy.ts`, `src/components/ResourceUnavailable.tsx`, `/resource-unavailable`, and admin/studio login entry pages. The notice precedes the network gate, so previously revoked studio IPs see it. The developer sign-in link opens the existing login form with `?developer=1`; that parameter grants no access and password/IP checks remain enforced. Signed sessions must identify Nio or Heins with role `superadmin` to bypass suspension. Other superadmins and legacy studio sessions are blocked.

Suspended APIs return HTTP 503 and `error_code=infrastructure_unpaid`. The studio shared-credential fallback is disabled during suspension, and the studio lobby-ticket branch checks the signed identity and forwards `X-Studio-Token`. Player ticket requests are unaffected. The backend contains matching enforcement for previously issued sessions.

Verification: TypeScript checking, local production build, and four Playwright checks passed. Desktop/mobile captures fit without horizontal overflow. The mechanical UI detector found no findings. Run the isolated check without real credentials:

```bash
ADMIN_INFRASTRUCTURE_SUSPENDED=true STUDIO_INFRASTRUCTURE_SUSPENDED=true ADMIN_JWT_SECRET=infra-test-only STUDIO_JWT_SECRET=infra-test-only npm run dev -- --port 3113
# In a second terminal:
INFRASTRUCTURE_E2E=1 BASE_URL=http://localhost:3113 npx playwright test e2e/infrastructure-access.spec.ts --workers=1
```

Live readback must verify both studio hosts, production admin, OCMS login pages, and named-developer exemptions. To restore, set the relevant flag to false on both Vercel and Render and redeploy. Previously disabled accounts/IP records stay disabled until separately reactivated at Nio's instruction.

Backend configuration and additional checks: `topless-casino-backend/docs/SESSION_2026-10-13_INFRASTRUCTURE_SUSPENSION.md`.
