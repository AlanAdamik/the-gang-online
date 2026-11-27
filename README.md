# The Gang — online

This is a fan-made game for personal use.

We're a bunch of developers who love the cooperative card game *The Gang*, but we rarely get to play together: we're remote, scattered across France. So we built a small online table to play a bit more often :-)

> **Unofficial.** *The Gang* is designed by John Cooper & Kory Heath and published by KOSMOS. This project is not affiliated with, sponsored or endorsed by the authors or the publisher. If you enjoy it, please buy the real game.

## What it does

- Create a room and share a 4-letter code (or invite link) with 2–6 players.
- Play full heists: private cards, four ranking rounds with white, yellow, orange and red tokens, token stealing, and a showdown in token order.
- Three modes: **Advanced**, **Professional** and **Master Thief**, with challenge and specialist cards.
- A live game log and shareable replays, which never reveal anyone's private cards before the showdown.
- Two card styles: minimal and classic.
- The interface is in French.

## Tech

- [Next.js 16](https://nextjs.org) (App Router) + React 19 + TypeScript
- [Convex](https://convex.dev) for game state and realtime sync
- Deployed on [Vercel](https://vercel.com), built with [v0](https://v0.app)

## Running it locally

```bash
pnpm install
# set NEXT_PUBLIC_CONVEX_URL (and CONVEX_DEPLOY_KEY to deploy functions) in .env.local
pnpm dev
```

After changing anything in `convex/`, deploy the Convex functions (for example `npx convex deploy`).

## Contributing

It's a hobby project among friends. See [`AGENTS.md`](./AGENTS.md) for architecture, the rules as implemented, and the conventions we follow. The main one: **never leak a player's private cards**.
