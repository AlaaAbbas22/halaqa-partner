# Tafseer Halaqa App

A small [Next.js](https://nextjs.org/) app for a guided **tafseer halaqa**: you pick Qur’anic ayahs (Arabic + English from the Quran Foundation API), choose **English** or **Arabic** for the chat, optionally select **tafsir resources**, and talk with **Google Gemini** using those ayahs and fetched tafsir excerpts as context.

## Features

- **Landing page** (`/`) — short intro and link to the chat.
- **Reflection chat** (`/chat`) — surah / ayah picker, session ayahs, tafsir checkboxes (up to three resource IDs), language choice, then a back-and-forth with Gemini.
- **Quran data** — [`@quranjs/api`](https://www.npmjs.com/package/@quranjs/api) server client (`createServerClient`) for chapters, verses, and tafsir via `content.v4`.
- **Tafsir** — loaded per ayah with `verses.byKey` + `tafsirs: [...]`; list of resources from `GET /api/tafsirs`.

## Requirements

- **Node.js** 18+ (20+ recommended for tooling).
- **Google AI Studio** [API key](https://aistudio.google.com/apikey) for Gemini.
- **Quran Foundation / Quran.com API** [OAuth client](https://api.quran.com/) (`client_id` + `client_secret`).

## Setup

```bash
npm install
```

Copy environment variables and fill them in:

```bash
cp .env.example .env.local
```

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Required. Gemini key from Google AI Studio. |
| `GEMINI_MODEL` | Optional. Default in app: `gemini-2.5-flash`. |
| `QURAN_CLIENT_ID` / `QURAN_CLIENT_SECRET` | Required for `@quranjs/api`. |
| `QURAN_OAUTH2_BASE_URL` | Required. OAuth token base URL from your Quran API / portal (do not commit). |
| `TAFSIR_RESOURCE_IDS` | Optional. Comma-separated defaults if the UI sends none (e.g. `171`). |

## Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Use **Chat** to start a session.

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Run production server (after `build`) |
| `npm run lint` | ESLint |

## Stack

Next.js (App Router), React, TypeScript, Tailwind CSS v4, `@google/generative-ai`, `@quranjs/api`.

## Notes

- Keep **secrets in `.env.local`** (or the host’s env UI) only; do not commit API keys.
- **Netlify:** `QURAN_OAUTH2_BASE_URL` must be set in site environment variables. The repo includes `netlify.toml` with `SECRETS_SCAN_OMIT_KEYS` for that name so builds do not fail when Next inlines its value into server chunks (the OAuth host is public, but Netlify still treats configured env values as secrets).
- Tafsir resource IDs vary by environment; use `GET /api/tafsirs` to see what your credentials return.
