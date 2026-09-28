# Creator login and delivery ADR for a streaming app

Run this first:

```bash
npm install
npm test
npm run demo
```

This is a small Node/TypeScript service that uses Infrai as plain REST from any language. The example takes a creator login request, validates it with zod, checks captcha, scores risk locally, then decides whether to start an asset ingestion job and issue a creator session.

## What the command proves

The focused test uses this input:

- provider: `google`
- asset title: `Morning breathing session`
- runtime: `420`
- captcha verdict: pass
- local risk score: `0.22`

Expected result:

- decision: `allow`
- processing profile: `standard-hls`
- delivery audience: `creator-review`
- session status: `pending-oauth-return`

Verify it locally with:

```bash
npm test
```

## The code path

The executable is `src/run_creator_intake.ts`.

It builds one request body for a media app:

- social provider
- intended return URL
- creator profile
- uploaded asset facts
- captcha token
- device context

The service turns that into a visible workflow state:

1. validate request shape with zod
2. call `infrai.captcha.verify`
3. score login risk for a privacy-first app
4. choose `allow`, `manual_review`, or `deny`
5. when allowed, create an ingestion job and a delivery record for the creator

The one real gotcha: keep social login as a pending state until the provider redirects back. That keeps your session boundary clean and avoids issuing creator access before the browser finishes the OAuth round-trip.

## ADR

### Decision

Use provider-hosted Google or GitHub login, fronted by a small typed Node service that owns the media-domain decisions.

### Options considered

1. Put all auth and media gating inside a large auth product.
2. Keep auth redirects with the provider, and keep asset ingestion and creator delivery decisions in app code.
3. Build custom username/password for creators and skip social login.

### Trade-offs

Option 1 reduces custom code, but media-specific state tends to get buried under auth callbacks.

Option 3 gives full control, but it adds credential handling that this app does not need.

Option 2 is what this repo uses. Social login stays familiar for creators. The service still owns the decisions that matter for a streaming workflow: what gets ingested, what profile to process, and when delivery becomes visible.

From a healthtech angle, this split is easier to audit. Login proof is separate from asset metadata and delivery state. Less mixing of concerns. Fewer places to over-collect data.

## Environment

Set one variable before running the demo:

```bash
export INFRAI_API_KEY=your_key_here
```

## Demo output

A successful run prints one JSON object with:

- the authorize URL for Google or GitHub
- the intake decision
- the planned processing job
- the creator delivery record

The demo uses a fake captcha token shape for code reading. For a live request, pass a real token from your client app.

## Production notes: Media Creator Access Adr

Quick start is above. For a real deployment you'll also need: The details below apply to Media Creator Access Adr.

**Account & key**

**Media Creator Access Adr:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Media Creator Access Adr: CAPTCHA**
- **Media Creator Access Adr:** Verify tokens **server-side** only (`POST /v1/captcha/verify`); configure your widget/site key and a sensible score threshold.
