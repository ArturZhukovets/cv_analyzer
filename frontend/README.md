# Frontend

React 19 + TypeScript + Vite SPA. Tailwind CSS v4 is wired through `@tailwindcss/vite` (see `vite.config.ts` and `src/index.css`) — there is no separate `tailwind.config.js` or PostCSS step.

## Local development

New utility classes in `src/` are picked up automatically while the dev server is running:

```bash
cd frontend
npm install   # first time only
npm run dev
```

No extra Tailwind compile step is needed in dev; save your files and Vite HMR refreshes the CSS.

## Production static build (Tailwind + app)

After adding or changing Tailwind classes (or `@theme` tokens in `src/index.css`), rebuild the static assets:

```bash
cd frontend
npm install   # if dependencies changed
npm run build
```

This runs TypeScript checking (`tsc -b`) then `vite build`. The Tailwind plugin scans your source files, tree-shakes unused utilities, and emits hashed CSS into `dist/`.

Preview the production bundle locally:

```bash
npm run preview
```

## Deploy

On the VPS, the repo’s deploy script builds via Docker and copies `dist/` to nginx:

```bash
./deploy/deploy-frontend.sh
```

See [deploy.md](../deploy.md) for the full production setup.
