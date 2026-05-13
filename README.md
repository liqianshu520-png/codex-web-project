# codex-web-project

Dynamic personal website built with `Express + EJS`.

## Features

- Testing projects section for game and software QA work
- Novel portal section for chapters, worldbuilding, and update notes
- Developer tools section for personal utilities
- Server-rendered homepage
- Contact form that stores messages in `data/messages.json`
- Original hero artwork at `public/assets/shinobi-hero.png`

## Local Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Deploy

```bash
npm install
npm start
```

Then configure Nginx to proxy traffic to port `3000`.
