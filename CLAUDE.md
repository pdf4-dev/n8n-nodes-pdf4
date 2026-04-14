# n8n-nodes-pdf4

Official n8n community node for [PDF4.dev](https://pdf4.dev) — a developer-first PDF generation API.

This package publishes to npm as `n8n-nodes-pdf4`, installable from any self-hosted n8n instance via Settings → Community Nodes, and listed in the [n8n verified community node registry](https://n8n.io/integrations/) after submission.

**Parent product**: PDF4.dev. The main app lives in a separate repo (Next.js 16 App Router, SQLite, Playwright, Handlebars). This repo only contains the n8n integration.

## Why this repo exists

- **npm publishing constraints** — an n8n community node is a standalone npm package with strict rules (name prefix, `n8n` field in `package.json`, no runtime dependencies for verified nodes). It cannot live inside the main `pdf4.dev` Next.js repo.
- **Verified node rules** — the n8n team requires no runtime deps, publishing via GitHub Actions with provenance (mandatory from May 2026), and a clean repo structure.
- **Independent release cycle** — bug fixes to the node ship independently of the main product.
- **Public open-source presence** — TemplateFox (competitor) has their own `n8n-nodes-templatefox` repo; we need the same.

## Tech stack

| Layer | Tool |
|-------|------|
| Language | TypeScript 5.9 |
| Runtime peer | `n8n-workflow` (peer dependency only) |
| Build + lint + release | `@n8n/node-cli` (`n8n-node build|dev|lint|release`) |
| Formatter | Prettier 3 |
| ESLint config | `@n8n/node-cli/eslint` |
| Publish | GitHub Actions with npm provenance |
| License | MIT |

**Zero runtime dependencies.** Verified n8n community nodes aren't allowed to have any. All HTTP is done via `this.helpers.httpRequestWithAuthentication.call(this, 'pdf4Api', options)`, which is provided by n8n at runtime.

## Repo structure

```
n8n-nodes-pdf4/
├── credentials/
│   └── Pdf4Api.credentials.ts      # Bearer token + base URL override
├── nodes/
│   └── Pdf4/
│       ├── Pdf4.node.ts            # The node (resources: pdf, template)
│       ├── Pdf4.node.json          # n8n codex metadata (categories, doc links)
│       ├── pdf4.svg                # Light-mode icon
│       └── pdf4.dark.svg           # Dark-mode icon
├── .github/workflows/
│   └── publish.yml                 # Tag push → npm publish with provenance
├── dist/                           # Built output (gitignored, npm-shipped)
├── package.json                    # n8n field points at dist/**/*.js
├── tsconfig.json                   # Compiles credentials + nodes to dist/
├── eslint.config.mjs               # Re-exports @n8n/node-cli/eslint
├── .gitignore
├── .npmignore
├── LICENSE.md                      # MIT
├── CHANGELOG.md
├── README.md                       # User-facing install + usage
└── CLAUDE.md                       # This file
```

## Node architecture

Single node `Pdf4` with two resources:

### Resource: `pdf`
- **Render From Template** (`renderTemplate`) — POST `/api/v1/render` with `{ template_id, data, format? }`
- **Render From HTML** (`renderHtml`) — POST `/api/v1/render` with `{ html, data, format? }`

Both operations:
- Accept optional PDF format overrides (preset, width, height) via a collection parameter.
- Return the PDF as either a **binary property** (default, attached via `helpers.prepareBinaryData`) or as a **base64 string** in JSON. Binary is usually what users want for email attachments / uploads.
- Use `encoding: 'arraybuffer'` on the HTTP request so we get the raw PDF bytes, not a parsed JSON.

### Resource: `template`
- **List** (`list`) — GET `/api/v1/templates`. Returns each template as a separate output item so downstream nodes can iterate.
- **Get** (`get`) — GET `/api/v1/templates/:id`

## Credential: `Pdf4Api`

- `apiKey` — Bearer token from `pdf4.dev/dashboard/settings`. Prefixed `p4_live_`. Required, password-masked.
- `baseUrl` — defaults to `https://pdf4.dev`. Only touched for self-hosted instances.
- `authenticate` is declarative (`type: 'generic'` + Authorization header). n8n injects the header automatically on every `httpRequestWithAuthentication` call.
- `test` — a simple `GET /api/v1/templates` to validate the key when the credential is saved.

## Development

```bash
npm install
npm run dev          # watch mode via n8n-node dev (spins up a local n8n with the node loaded)
npm run build        # production build to dist/
npm run lint         # n8n-node lint
npm run lint:fix
```

### Testing locally in a real n8n

1. `npm run build`
2. `npm link`
3. In another shell, in your n8n data dir: `npm link n8n-nodes-pdf4`
4. Restart n8n, the PDF4.dev node appears in the palette

## Publishing

This package uses **npm provenance** (mandatory for verified community nodes from 2026-05-01). Provenance means npm cryptographically links each release to its source commit + GitHub Actions workflow.

### One-time npm setup

1. Go to npmjs.com → package settings (after first manual publish or after reserving the name)
2. Publish access → Trusted Publishers → Add a publisher → GitHub Actions
3. Fill in: `pdf4-dev/n8n-nodes-pdf4`, workflow `publish.yml`
4. Add `NPM_TOKEN` as a repo secret (classic automation token is fine as a fallback, but Trusted Publishers is preferred)

### Release flow

```bash
# bump version + generate tag via release-it (configured in package.json via n8n-node release)
npm run release
# or manually:
npm version patch   # or minor/major
git push --follow-tags
```

The tag push triggers `.github/workflows/publish.yml` which runs `npm ci && npm run lint && npm run build && npm publish --provenance --access public`.

### Submitting for n8n verification

After the package is live on npm:

1. Make sure it follows all [verified community node guidelines](https://docs.n8n.io/integrations/creating-nodes/build/reference/verified-install-guidelines/)
2. No runtime dependencies ✅
3. Package name starts with `n8n-nodes-` ✅
4. `n8n-community-node-package` keyword ✅
5. `n8n` field in `package.json` ✅
6. Published via GitHub Actions with provenance ✅
7. Submit via the process documented at [n8n submit community nodes](https://docs.n8n.io/integrations/creating-nodes/deploy/submit-community-nodes/)

Verification is optional for install-ability (unverified nodes still install via the Community Nodes UI), but verified nodes appear in the official registry and get listed on n8n.io/integrations.

## Code conventions

- **TypeScript strict mode** — `noImplicitAny`, `strictNullChecks`, `noUnusedLocals` on.
- **No runtime deps** — verified node rule. If something needs a helper, add it to `devDependencies` and inline the logic.
- **HTTP via `httpRequestWithAuthentication`** — never import `axios`, `node-fetch`, or similar. n8n provides the HTTP helper with credentials auto-applied.
- **Binary handling** — always go through `this.helpers.prepareBinaryData(buffer, filename, mimeType)`. Never construct binary objects by hand.
- **Error handling** — wrap each item in try/catch, honor `this.continueOnFail()`, throw `NodeOperationError` with `itemIndex` so n8n can highlight the failing row.
- **Paired items** — always set `pairedItem: { item: i }` on returned items so n8n's data lineage works.
- **Parameter display** — use `displayOptions: { show: { resource: [...], operation: [...] } }` to scope fields to the right operation. Do not try to flatten everything into one form.
- **Icons** — light + dark SVG, <2KB, square viewBox.

## Writing style

Follow the same rules as pdf4.dev (CLAUDE.md of the main repo):

- Sentence case only in all UI strings (display names, descriptions, placeholders)
- No em dashes (`—`) anywhere
- No marketing fluff ("seamlessly", "robust", "powerful", "cutting-edge" are banned)
- Descriptions should state a concrete fact, not editorialize ("Generate a PDF from a saved template" ✅, "Seamlessly create stunning PDFs" ❌)

## Roadmap

- [ ] Publish v0.1.0 to npm
- [ ] Submit for n8n verification (get the blue badge)
- [ ] Publish 3 workflow templates on n8n.io:
  - Generate invoice PDF from Airtable record
  - Certificate from Typeform submission
  - Shipping label from Shopify new order
- [ ] Add `component` resource (list, get) once the use case is validated
- [ ] Add `log` resource for querying render history
- [ ] Consider a separate `PDF4 Trigger` node for webhook-based flows (render.completed, render.failed) once the main API ships webhooks

## Related

- **Main product repo**: [PDF4.dev](https://github.com/pdf4-dev/pdf4.dev) (private)
- **Docs**: https://docs.pdf4.dev
- **Dashboard**: https://pdf4.dev/dashboard
- **Competitor reference** (for parity checks only): [n8n-nodes-templatefox](https://github.com/TemplateFoxPDF/n8n-nodes-templatefox)
