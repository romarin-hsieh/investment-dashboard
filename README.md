# Kiro Investment Dashboard

> **The Bloomberg Terminal for the Static Web** — a private, zero-runtime-backend stock analysis dashboard powered by daily pre-computed quant signals.
>
> **Status**: Production · **Version**: 2.5 (Quant Edition) · **Live**: https://romarin-hsieh.github.io/investment-dashboard/

---

## What it does

- 🧊 **3D Quant Kinetic State** — proprietary 3-axis stock-state visualization (Trend × Momentum × Structure) for instant Launchpad / Climax / Dip-Buy classification
- 🐋 **Smart Money Tracking** — institutional flows (Dataroma 13F) + insider sentiment + MFI volume profile
- 📊 **Macro & Technical Analysis** — TradingView charts, Fear & Greed, sector rotation, regime classification

All running on **GitHub Pages** with **zero servers**. Heavy computation runs in nightly GitHub Actions; the frontend reads pre-computed JSON from a CDN.

## Quick Start

```bash
git clone https://github.com/romarin-hsieh/investment-dashboard.git
cd investment-dashboard
npm install

# Dev server at http://localhost:3000/
npm run dev

# (Optional) Generate static data locally
npm run update-daily
```

Requires: Node 18+, Python 3.11+ (only for the ETL pipeline).

---

## Documentation

Start at **[docs/INDEX.md](docs/INDEX.md)** — the single navigation hub.

Frequent destinations:

- **[Product spec](docs/product/PRD.md)** — what this product is, who it's for, what it won't do
- **[Roadmap](docs/product/ROADMAP.md)** — what's coming
- **[Architecture overview](docs/architecture/OVERVIEW.md)** — how the Static-First system fits together
- **[Quant strategy](docs/specs/QUANT_STRATEGY_DOSSIER.md)** — the math behind the signals
- **[Runbook](docs/operations/RUNBOOK.md)** — what to do when something breaks
- **[Glossary](docs/product/GLOSSARY.md)** — terminology (EN / 繁中)

## License & Audience

Private project. No license granted. Designed for solo-operator + ≤5 trusted partners. See [PRD §4 Non-Goals](docs/product/PRD.md#4-non-goals-explicit) for what's out of scope (no live trading, no accounts, no streaming).
