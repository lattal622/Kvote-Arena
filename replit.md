# Kvote Arena

Hrvatska, instalabilna PWA za simulaciju sportskog klađenja virtualnim kreditima.

## Run & Operate

- `pnpm --filter @workspace/kvote-arena run dev` — pokretanje web-aplikacije
- `pnpm --filter @workspace/kvote-arena run typecheck` — provjera TypeScripta za aplikaciju
- `pnpm --filter @workspace/kvote-arena run build` — produkcijska web-izgradnja
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- The web workflow supplies `PORT` and `BASE_PATH`.
- Live API-Football access is optional and must use the server-side `API_FOOTBALL_KEY` secret; never store provider credentials in browser storage.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/kvote-arena/` — Kvote Arena PWA frontend and install assets.
- `artifacts/api-server/` — shared Express API service.
- `lib/api-spec/openapi.yaml` — shared API contract when backend endpoints are added.

## Architecture decisions

- The first version is a client-side demo; tickets and virtual balance persist in local storage.
- Credits and sample odds are fictional. The app does not accept deposits, process cash bets, or pay winnings.
- Any future API-Football key must stay server-side and API calls must respect the provider's quotas and terms.
- Kvote Arena uses its own identity and must not present copied sportsbook branding or unauthorized odds as live data.

## Product

Hrvatski virtualni listići za nogomet, rukomet i košarku, s kvotama za demo, izračunom mogućeg dobitka i poviješću riješenih listića.

## User preferences

- Sučelje je na hrvatskom jeziku i prilagođeno instalaciji iz Chromea na računalu i mobitelu.
- Virtualni krediti nisu stvarni novac i ne smiju se zamijeniti za isplatu.

## Gotchas

- Ne izlaži API ključeve u frontend kodu, localStorageu, logovima ni odgovorima.
- Ne zaobilazi ograničenja poziva API-Footballa; koristi predmemoriju i poštuj uvjete pružatelja.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
