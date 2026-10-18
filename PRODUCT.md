# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary users are Microsoft 365 consultants and IT architects. They use the tool during licensing workshops, proposal work, and architecture sessions to recommend the right M365 SKUs for named personas under real customer constraints (Frontline vs Office, security/compliance needs, EEA pricing).

Success for a session: a defendable recommendation with clear decision logic, an As-Is vs To-Be delta the customer can follow, and a quote ready to export (CSV).

## Product Purpose

License Architect is a client-side M365 licensing calculator. It turns persona requirements into a cost-aware license recommendation in real time, including break-even logic (e.g. base + add-ons vs E5) and bundle optimization (e.g. Intune Suite vs individual add-ons).

## Positioning

It is not a static price list. The differentiator is an opinionated recommendation engine with guardrails (Frontline upgrades when enterprise features are required), automatic E5 upsell at break-even, Intune Suite cost optimization, EEA Teams-unbundling pricing, and feature-aware As-Is/To-Be comparison (including hierarchy-aware gained/lost features).

## Operating Context

Used as a single-page tool in the browser during client conversations and desk work. Typical flow: define persona and quantity → toggle requirements across productivity, endpoint, security, compliance, and add-ons → review live recommendation and decision reason → optionally compare to current license → add personas to a quote → import/export CSV. Pricing follows NCE annual vs monthly (+20%). Feature knowledge draws heavily from m365maps.com (Aaron Dinnage).

## Capabilities and Constraints

Must remain functionally equivalent after redesign:

- Live recommendation from persona + workstyle + requirement toggles (including presets)
- Decision-logic explanation for why a SKU was chosen
- Alternative option and price delta vs current license
- As-Is vs To-Be feature comparison modal (gained/lost with hierarchy)
- Quote list with per-persona edit, grand total, and cost dashboard (base vs add-ons)
- CSV import and export
- Annual / monthly term switch
- Light / dark theme toggle
- Client-side only: no backend, no required build step for normal use; engine logic in `src/engine.js`, license data in `data/licenses.js`, UI in `index.html`
- Regression tests via `npm test` must keep passing; calculation behavior must not change unless explicitly requested

UI copy language today is mixed DE/EN; language refresh is allowed if meaning and workflows stay clear. Visual identity is not locked.

Open / undecided: no product-specific accessibility standard was set; no formal brand kit exists.

## Brand Commitments

Product name: **License Architect** (by Leon Machnik). No locked logo, palette, typography, or visual identity — redesign may invent a new visual brand while keeping the product name unless the user changes it.

## Evidence on Hand

- Working app: `index.html` (UI), `src/engine.js` (recommend/compare), `data/licenses.js` (prices, features, presets)
- README feature descriptions and usage guide
- Screenshot asset linked from README (incumbent glassmorphism UI — anti-reference for redesign)
- Tests under `test/` with legacy reference fixtures

Do not fabricate customer logos, testimonials, partner badges, or third-party endorsements beyond the existing credit to m365maps.com / Aaron Dinnage.

## Product Principles

1. Recommendation must stay explainable: every SKU choice has visible decision logic.
2. Cost truth over upsell theater: break-even and bundle math drive upgrades, not decoration.
3. Consultant-speed workflow: persona → requirements → recommendation → quote → export without leaving the page.
4. Engine integrity: pricing and recommendation logic are product truth; UI may change freely around them.
5. Identity is secondary to clarity: new visual brand is welcome; scanability and trust in numbers come first.
