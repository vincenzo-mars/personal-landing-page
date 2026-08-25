<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# who-am-i

Personal landing page of Vincenzo Mars. Single Next.js app, no monorepo, no backend of its own.
Local project name and package name are `who-am-i`; the GitHub repository stays
`vincenzo-mars.github.io` on purpose, since that name is what puts the site at the account root.

## Stack

- Next.js 16 (App Router) + React 19, React Compiler enabled via `babel-plugin-react-compiler`
- TypeScript strict, path alias `@/*` -> `src/*`
- Tailwind CSS v4 (PostCSS plugin, no `tailwind.config.*`: theme lives in `src/app/globals.css` via `@theme`)
- ESLint flat config (`eslint.config.mjs`) extending `eslint-config-next`
- npm (`package-lock.json` is the lockfile of record)

## Commands

```bash
npm run dev     # dev server on :3000
npm run build   # production build, also the type check of record
npm run lint    # eslint
npm start       # serve the production build
```

There is no test suite. Do not add one without being asked.

## Layout

```
src/app/          App Router: layout.tsx, page.tsx, globals.css, favicon.ico
public/           static assets served from /
```

Colocate components with the route that uses them until a second consumer appears; shared ones go in `src/components/`.

## Branches

`develop` is the default branch and where work lands: every feature or fix branch opens its PR
against `develop`. `main` is the published state, and nothing is merged into it except a
deliberate release PR from `develop`. Merging that PR is what puts the site online.

## Deploy

Published on GitHub Pages at https://vincenzo-mars.github.io/ by
`.github/workflows/deploy.yml`, which runs on every push to `main` (Pages source is set to
GitHub Actions, not a branch). The repository is named `vincenzo-mars.github.io`, which makes it
the account's user site: it is served from the root, so there is no `basePath` to carry around.

Consequences of `output: "export"` in `next.config.ts`: the whole site is static HTML in `out/`,
so no SSR, Server Actions, ISR, middleware or dynamic route handlers, and `next/image` runs with
`unoptimized: true`.

## Releases

`.github/workflows/release.yml` runs release-please on every push to `main`. It accumulates the
conventional commits since the last tag into a release PR that bumps `package.json` and writes
`CHANGELOG.md`; merging that PR creates the tag and the GitHub Release. Only `feat:`, `fix:` and
breaking changes show up in the changelog and move the version, so a batch of `chore:` commits
produces no release PR at all.

The release PR from `develop` to `main` must be merged with a **merge commit**: squashing would
collapse the history into the PR title and release-please would only see that one message.

Since `develop` is the repository default branch, the action carries an explicit
`target-branch: main`. Drop it and release-please silently inspects `develop` instead, reports
success and opens nothing.

## Conventions

- Server Components by default: add `"use client"` only when the component needs state, effects or browser APIs.
- Metadata goes through the App Router `metadata` export, not hand-written `<head>` tags.
- Style with Tailwind utilities; reach for `globals.css` only for tokens (`@theme`) and true global rules.
- `next/image` for images and `next/font` for fonts: no raw `<img>`, no `<link>` to font CDNs.
- Keep the `nextjs-agent-rules` block above untouched: `next dev` rewrites it, and committing it with the rest keeps the tree clean.
