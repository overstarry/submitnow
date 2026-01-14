# Repository Guidelines

## Project Structure & Module Organization
- `app/` contains Next.js App Router pages and layouts; locale routes live under `app/[locale]/`.
- `components/` holds shared UI; feature components live in subfolders.
- `actions/` contains server actions for IndexNow submission and related workflows.
- `lib/`, `hooks/`, `stores/`, and `types/` provide utilities, React hooks, Zustand state, and shared types.
- `content/` and `blogs/` store MDX content; `i18n/messages/` holds translations.
- `public/` is for static assets; `styles/` contains Tailwind and global styles.
- `open-next.config.ts` and `wrangler.jsonc` define Cloudflare build and deploy settings.

## Build, Test, and Development Commands
- `pnpm dev` starts the local Next.js dev server at `http://localhost:3000`.
- `pnpm build` builds the OpenNext Cloudflare output.
- `pnpm start` runs the production Next.js server for local smoke checks.
- `pnpm preview` builds, then runs `wrangler dev` for Workers preview.
- `pnpm deploy` builds, then deploys via `wrangler deploy`.
- `pnpm lint` runs ESLint across the repo.

## Coding Style & Naming Conventions
- TypeScript + React with 2-space indentation.
- Component files use PascalCase (for example, `Showcase.tsx`).
- Hooks follow `useX` naming; state lives under `stores/`.
- Tailwind config is in `tailwind.config.ts`; keep class order stable and avoid ad-hoc inline styles.
- ESLint is configured via `eslint.config.mjs` and `.eslintrc.json`.

## Testing Guidelines
- No automated test runner is configured in `package.json`.
- Use `pnpm lint` plus manual UI checks for now.
- If you add tests, document the runner and naming conventions here and in `package.json`.

## Commit & Pull Request Guidelines
- Commit messages are short, imperative, and sentence case (for example, "Add Wrangler deployment support"). PR numbers are sometimes appended in parentheses.
- PRs should include a clear summary, rationale, manual test steps, and screenshots for UI changes.
- Call out any behavior changes to IndexNow submission or Cloudflare deployment.

## Security & Configuration
- Copy `.env.example` to `.env` for local secrets and never commit real keys.
- Keep `wrangler.jsonc` and `open-next.config.ts` in sync with deployment changes.
