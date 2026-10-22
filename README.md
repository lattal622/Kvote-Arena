# Kvote Arena

Kvote Arena is a Croatian-language, installable PWA for trying sports picks with virtual credits. It is a demo only: it does not accept deposits, process real-money bets, or pay winnings.

## Run the app

Requirements: Node.js 24 and pnpm.

From the repository root:

```sh
pnpm install
pnpm --filter @workspace/kvote-arena run dev
```

Build the static app with:

```sh
pnpm --filter @workspace/kvote-arena run build
```

The app stores its demo tickets and preferences in the browser's local storage. Its sample fixtures and odds are fictional and are not live market data.

## Install on Chrome

Open the published site in Chrome and use the browser's Install app option. The PWA manifest and service worker enable installation and offline access to the app shell.

## API-Football

Live data is optional. Never paste provider keys into client-side code or browser storage. Configure `API_FOOTBALL_KEY` as a server-side Replit Secret before adding a backend integration. Respect the provider's plan, request limits, and terms; do not evade rate limits or suspensions.

## Download the source project

Run `pnpm package:kvote-arena` from the repository root to produce a source archive at `artifacts/kvote-arena/public/kvote-arena-source.zip`. The archive excludes dependencies, build outputs, local workspace metadata, and Git history.
