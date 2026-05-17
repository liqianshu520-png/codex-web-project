# codex-web-project

Novel-first website built with `Express + EJS`.

## Features

- Novel homepage and chapter reader for `《渊》`
- Image gallery upload area for covers, characters, maps, and scene art
- Contact form that stores messages in `data/messages.json`
- Server-rendered pages with local chapter files

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

For the novel gallery upload route, make sure the Nginx site config also includes:

```nginx
client_max_body_size 50M;
```

Keep this value aligned with the upload limit in `server.js`, so the reverse proxy and app reject files at the same threshold.
