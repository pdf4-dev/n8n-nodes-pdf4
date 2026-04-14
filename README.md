# n8n-nodes-pdf4

This is an [n8n](https://n8n.io/) community node that lets you generate PDFs from HTML templates using [PDF4.dev](https://pdf4.dev).

PDF4.dev is a developer-first PDF generation API. Create HTML templates with Handlebars variables, preview them live, and render PDFs via REST. Think Resend, but for PDFs.

[Installation](#installation) · [Operations](#operations) · [Credentials](#credentials) · [Compatibility](#compatibility) · [Usage](#usage) · [Resources](#resources)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

**Name:** `n8n-nodes-pdf4`

On self-hosted n8n: Settings → Community Nodes → Install → paste the package name.

## Operations

### PDF
- **Render From Template** — generate a PDF from a saved template with variable data. Works by ID (`tmpl_...`) or by slug.
- **Render From HTML** — generate a PDF from raw HTML without creating a template first. Handlebars variables supported.

Both operations return the PDF either as a **binary property** (ready to attach, email, or upload downstream) or as a **base64 string**.

### Template
- **List** — list all templates in your PDF4.dev account.
- **Get** — fetch a single template by ID or slug.

### Format overrides

Every PDF operation accepts optional format overrides (preset, custom width/height) that override the template's default format at render time.

## Credentials

1. Sign up at [pdf4.dev](https://pdf4.dev) (free tier available)
2. Go to **Dashboard → Settings → API Keys**
3. Create a key (starts with `p4_live_`)
4. In n8n, create a new **PDF4.dev API** credential and paste the key

The **Base URL** field only needs to be changed for self-hosted PDF4.dev instances. Leave it as `https://pdf4.dev` for the hosted service.

## Compatibility

- n8n v1.0 or later
- Node.js 20.15+

Tested against PDF4.dev API v1.

## Usage

### Invoice from Airtable record

1. **Airtable Trigger** — on new record in `Invoices`
2. **PDF4.dev** — Render From Template
   - Template ID: `invoice`
   - Data: `{{ { customer: $json.customer, total: $json.total, items: $json.items } }}`
3. **Gmail** — send email with the PDF as attachment (use the binary property from step 2)

### Certificate from form submission

1. **Typeform Trigger** — on form submission
2. **PDF4.dev** — Render From Template
   - Template ID: `certificate`
   - Data: `{{ { name: $json.name, course: $json.course, date: $now.toISO() } }}`
3. **Google Drive** — upload the binary PDF

### Raw HTML quick render

Use **Render From HTML** when you want to ship a one-off PDF without creating a template in the dashboard. Write your HTML inline (`<h1>Hello {{name}}</h1>`) and pass a JSON data object.

## Resources

- [PDF4.dev docs](https://docs.pdf4.dev)
- [PDF4.dev dashboard](https://pdf4.dev/dashboard)
- [n8n community nodes docs](https://docs.n8n.io/integrations/community-nodes/)
- [Report an issue](https://github.com/pdf4/n8n-nodes-pdf4/issues)

## License

[MIT](LICENSE.md)
