# Pro Print Designer

Open-source (MIT) visual print designer for labels, receipts, and business forms.
Clean-room project — embeddable Vue 3 editor library plus a Nuxt 4 web app.

## Structure

```
packages/editor   @pro-print/editor — embeddable Vue 3 editor library (Vite lib mode)
apps/web          Nuxt 4 + Nuxt UI app: landing, template manager, editor host
```

## Development

Requires Node >= 20 and pnpm >= 11 (pinned via `packageManager` — `corepack enable` recommended).

```bash
pnpm install
pnpm dev        # Nuxt app (apps/web)
pnpm dev:lib    # editor library watch build
pnpm build      # build all packages
pnpm test       # unit tests (vitest)
pnpm lint       # eslint
pnpm typecheck  # vue-tsc / nuxt typecheck
```

## Roadmap

Round 1 (in progress): monorepo scaffold, canvas foundation (zoom/pan, rulers,
guides), element interactions (drag/resize/rotate, snapping, undo/redo),
Canva-like editor shell, IndexedDB template persistence.

Later rounds: barcode/QR, table + smart pagination, print/PDF pipeline,
web component wrapper, server sync. See `plans/` for detailed phase docs.

## License

[MIT](./LICENSE)
