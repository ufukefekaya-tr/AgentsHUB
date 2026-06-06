# AgentsHUB

> **AgentsHUB is a local-first, open-source Agentic OS that orchestrates autonomous AI agents on your machine — no cloud dependency, no vendor lock-in.** Built on Gemini's free tier, it gives developers and SMBs a multi-agent runtime that runs entirely under their control, with native Turkish language support and MIT licensing.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/ufukefekaya-tr/AgentsHUB?style=social)](https://github.com/ufukefekaya-tr/AgentsHUB)
[![Version](https://img.shields.io/badge/version-2.0.0--beta-blue)](https://github.com/ufukefekaya-tr/AgentsHUB/releases)
[![Language](https://img.shields.io/badge/lang-TR%20%7C%20EN-orange)]()
[![Website](https://img.shields.io/badge/Website-agentshub.com.tr-8A2BE2)](https://agentshub.com.tr)
[![Python](https://img.shields.io/badge/python-3.10%2B-blue)](https://python.org)

---

<!-- DEMO GIF -->
<p align="center">
  <img src="assets/demo.gif" alt="AgentsHUB terminal demo — agent spawning, task execution, multi-agent collaboration in 60 seconds" width="800">
</p>
<p align="center"><em>60-second muted demo: spawn agents, assign tasks, watch them collaborate — all local, all yours.</em></p>

<!-- TODO: Record with asciinema, convert via agg. Storyboard below. -->

<!--
DEMO GIF STORYBOARD (60-90 seconds, muted, terminal recording)
================================================================
[0-5s]   Title card: "AgentsHUB — Your Local Agentic OS" (clean terminal, cursor blink)
[5-12s]  $ agentshub init → project scaffold created (3 files appear)
[12-20s] $ agentshub spawn researcher --model gemini-flash → "Agent 'researcher' ready"
[20-30s] $ agentshub spawn writer --model gemini-flash → "Agent 'writer' ready"
          $ agentshub team create content-pipeline --agents researcher,writer
[30-45s] $ agentshub run content-pipeline --task "Analyze top 5 competitors and draft a blog post"
          → Real-time streaming: researcher fetches data, passes context to writer
          → Writer produces structured markdown output
[45-55s] Terminal splits: left=agent logs (tool calls, reasoning), right=final output
[55-65s] $ agentshub cost → "Session total: $0.00 (Gemini free tier)" ← money shot
[65-75s] $ agentshub export --format markdown → saved to ./output/blog-post.md
[75-85s] Show file content (clean, production-ready output)
[85-90s] End card: "MIT Licensed | Star us on GitHub"
================================================================
-->

---

## Why AgentsHUB?

| Problem | How AgentsHUB solves it |
|---------|------------------------|
| Cloud-based agent platforms lock you in, read your data, and charge per token | Runs 100% on your machine. Your data never leaves your disk. Zero recurring cloud fees. |
| Existing frameworks (CrewAI, LangGraph) require heavy boilerplate and vendor SDKs | 3-command setup. Single CLI. No mandatory cloud accounts. |
| LLM API costs spiral out of control ($50-200/month for basic agent workflows) | Built on Gemini Flash free tier — real multi-agent workflows at $0/month for most use cases. |
| No Turkish language support in any major agent framework | Native Turkish prompts, tool descriptions, and error messages. Bilingual by design. |
| Multi-agent coordination is complex — most devs give up before shipping | Opinionated defaults: spawn agents, assign roles, let the orchestrator handle coordination. Ship in hours, not weeks. |

---

## Quick Start

### Prerequisites
- Python 3.10+
- A Google AI Studio API key ([free, no credit card](https://aistudio.google.com/apikey))

### 3 Steps to Your First Agent Team

```bash
# 1. Install
pip install agentshub

# 2. Configure (one-time)
agentshub config set --api-key YOUR_GEMINI_API_KEY

# 3. Run your first multi-agent task
agentshub run --task "Research Python async best practices and write a summary"
```

Or clone and run from source:

```bash
git clone https://github.com/ufukefekaya-tr/AgentsHUB.git
cd AgentsHUB
pip install -e .
cp .env.example .env  # Add your API key
agentshub run --task "Your task here"
```

---

## Features

| Feature | Description |
|---------|-------------|
| **Multi-Agent Orchestration** | Spawn multiple agents with distinct roles, let them collaborate autonomously |
| **Local-First Architecture** | All processing on your machine — no cloud middleman, no data exfiltration |
| **Gemini Free Tier Native** | Optimized for Gemini Flash/Flash-Lite free tier (10 RPM, 1M context) |
| **Model-Agnostic** | Swap to OpenAI, Anthropic, Ollama, or any OpenAI-compatible endpoint |
| **Skill System** | Extensible skill/tool plugins — file I/O, web search, code execution, custom tools |
| **Human-in-the-Loop** | Built-in approval gates — agents propose, you decide |
| **Cost Tracking** | Real-time token/cost dashboard per agent, per session |
| **Turkish + English** | Bilingual prompts, outputs, and documentation |
| **CLI-First** | No GUI dependency — scriptable, pipeable, CI/CD friendly |
| **MIT Licensed** | Fork it, sell it, embed it. No elastic license traps. |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   AgentsHUB CLI                       │
├─────────────────────────────────────────────────────┤
│                 Orchestrator (Brain)                  │
│         task decomposition / delegation / merge      │
├──────────┬──────────┬──────────┬────────────────────┤
│ Agent 1  │ Agent 2  │ Agent 3  │  ... Agent N       │
│ (Role A) │ (Role B) │ (Role C) │  (Custom Role)     │
├──────────┴──────────┴──────────┴────────────────────┤
│              Shared Memory / Context Layer            │
├─────────────────────────────────────────────────────┤
│                    Skill Registry                     │
│  [web_search] [file_io] [code_exec] [custom_tool]   │
├─────────────────────────────────────────────────────┤
│               Model Router (LLM Layer)               │
│  Gemini Flash | GPT-4o | Claude | Ollama | Custom   │
└─────────────────────────────────────────────────────┘
```

**Key design decisions:**
- Agents are stateless workers — state lives in shared checkpoints (no RAM bloat)
- Orchestrator handles task decomposition; agents never need to know about each other
- Model Router enables hot-swapping between providers mid-session
- Skills are isolated plugins — a failing skill cannot crash the runtime

---

## Supported Models

| Provider | Model | Status | Cost (AgentsHUB default config) |
|----------|-------|--------|------|
| **Google Gemini** | Flash 2.5 / Flash-Lite | Full support (default) | $0 (free tier) |
| **Google Gemini** | Pro 2.5 | Full support | Pay-as-you-go |
| **OpenAI** | GPT-4o / GPT-4o-mini | Full support | Standard API pricing |
| **Anthropic** | Claude Sonnet/Haiku | Full support | Standard API pricing |
| **Ollama** | Llama 3, Mistral, Qwen | Full support | $0 (local) |
| **Any OpenAI-compatible** | LM Studio, vLLM, etc. | Full support | Varies |

> Default: Gemini Flash free tier. Switch with `agentshub config set --model <provider/model>`.

---

## Comparison with Alternatives

| | **AgentsHUB** | CrewAI | LangGraph | AutoGen |
|---|---|---|---|---|
| **License** | MIT | MIT | MIT (core) / Elastic (server) | MIT (maintenance mode) |
| **Local-first** | Yes (default) | No (cloud-first) | No (LangSmith cloud) | Partial |
| **Setup complexity** | 3 commands | pip + config + code | pip + multiple packages + graph definition | pip + complex config |
| **Free LLM tier built-in** | Yes (Gemini Flash) | No | No | No |
| **Turkish support** | Native | None | None | None |
| **Human-in-the-loop** | Built-in CLI gates | Plugin required | Checkpoint-based | Conversation-based |
| **Min cost for multi-agent** | $0/month | $20+/month (API costs) | $20+/month | $20+/month |
| **GitHub Stars** | Growing | ~52K | ~126K (LangChain org) | ~57K |
| **Target user** | Solo devs, SMBs, Turkish market | Enterprise teams | Production ML pipelines | Research |
| **Vendor lock-in risk** | Zero | Low-Medium | Medium (LangSmith) | Low |

---

## Usage Examples

### 1. Research + Content Pipeline

```python
from agentshub import Team, Agent

researcher = Agent(
    role="researcher",
    goal="Find accurate, up-to-date information on the given topic",
    model="gemini-flash"
)

writer = Agent(
    role="writer",
    goal="Transform research into clear, engaging content",
    model="gemini-flash"
)

team = Team(agents=[researcher, writer])
result = team.run("Analyze the Turkish manufacturing sector's AI adoption rate and write a 1000-word report")

print(result.output)       # Final report
print(result.cost)         # "$0.00"
print(result.tokens_used)  # Token breakdown per agent
```

### 2. Autonomous Code Review Agent

```bash
# Single command — reads your staged git changes, reviews, suggests fixes
agentshub run \
  --task "Review my staged git changes for bugs, security issues, and style problems" \
  --skills git_diff,code_analysis \
  --output-format markdown
```

### 3. Multi-Agent Customer Support (Turkish)

```python
from agentshub import Team, Agent

siniflandirici = Agent(
    role="siniflandirici",
    goal="Gelen musteri mesajini kategorize et: teknik/fatura/genel",
    model="gemini-flash",
    language="tr"
)

cozumcu = Agent(
    role="cozumcu",
    goal="Kategoriye gore musteri sorununu coz ve Turkce yanit uret",
    model="gemini-flash",
    language="tr"
)

ekip = Team(agents=[siniflandirici, cozumcu])
yanit = ekip.run("Makinam surekli E-04 hatasi veriyor, 3 gundur uretim duruyor")
# → Kategori: teknik
# → Yanit: "E-04 hatası servo motor encoder arızasına işaret eder. Şu adımları uygulayın: ..."
```

---

## Project Structure

```
AgentsHUB/
├── agentshub/
│   ├── core/           # Orchestrator, Agent base, Team logic
│   ├── models/         # Model router, provider adapters
│   ├── skills/         # Built-in skill plugins
│   ├── memory/         # Shared context, checkpoints
│   └── cli/            # CLI entry points
├── examples/           # Ready-to-run example scripts
├── docs/               # Extended documentation
├── tests/
├── .env.example
├── pyproject.toml
└── README.md
```

---

## Contributing

We welcome contributions of all sizes — from typo fixes to new skill plugins.

```bash
# Fork, clone, create a branch
git checkout -b feat/your-feature

# Install dev dependencies
pip install -e ".[dev]"

# Run tests
pytest

# Submit a PR
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines, code style, and the contributor covenant.

**Good first issues:** Check the [`good-first-issue`](https://github.com/ufukefekaya-tr/AgentsHUB/labels/good-first-issue) label for beginner-friendly tasks.

---

## Roadmap

| Phase | Status | Target |
|-------|--------|--------|
| Multi-agent orchestration (v2.0) | Done | Core runtime |
| Gemini free tier optimization | Done | $0 default operation |
| Skill plugin system | Done | Extensibility |
| Human-in-the-loop gates | Done | Safety |
| MCP (Model Context Protocol) support | In Progress | Tool ecosystem |
| Web UI dashboard | Planned | Visual monitoring |
| Agent marketplace / skill store | Planned | Community skills |
| Distributed agent execution | Planned | Scale-out |
| Voice interface (Turkish TTS/STT) | Planned | Accessibility |

---

## License

[MIT](LICENSE) — Use it however you want. Fork it. Sell it. Embed it in your product. No strings attached.

---

## Community

- [Website](https://agentshub.com.tr) — Official site
- [GitHub Discussions](https://github.com/ufukefekaya-tr/AgentsHUB/discussions) — Questions, ideas, show & tell
- [Telegram](https://t.me/agentshub) — Real-time chat (TR + EN)
- [Twitter/X](https://x.com/agaborhub) — Updates and releases

**Built by [EHARTE Ltd](https://eharte.com)** (ITU Cekirdek + Mersin Teknopark)

---

<details>
<summary><strong>Turkce / Turkish</strong></summary>

## AgentsHUB Nedir?

AgentsHUB, bilgisayarinizda calisan, acik kaynakli, Turkce destekli bir Agentic OS'tur. Yapay zeka ajanlarinizi yerel olarak olusturur, yonetir ve calistirir — veriniz sizde kalir, bulut bagimliligina son.

### Neden AgentsHUB?

- **Yerel calisir:** Veriniz diskinizden cikmaz. Bulut koleliGine son.
- **Ucretsiz:** Gemini Flash ucretsiz katmaniyla $0/ay cok-ajan is akislari.
- **Turkce-native:** Turkce prompt, cikti ve dokumantasyon.
- **MIT Lisans:** Catal, sat, gomulu kullan — hicbir kisitlama yok.
- **3 komutla basla:** Kurulum, ayar, calistir.

### Hizli Baslangic

```bash
pip install agentshub
agentshub config set --api-key GEMINI_API_ANAHTARINIZ
agentshub run --task "Turkiye imalat sektorunde AI kullanim oranini arastir"
```

</details>

---

<!-- 
GitHub Repository Description (OG / meta):
"Local-first open-source Agentic OS — orchestrate autonomous AI agents on your machine. Gemini-powered, MIT licensed, Turkish + English. No cloud, no lock-in."

Topics: agentic-ai, llm, gemini, autonomous-agents, multi-agent, turkish, local-first, open-source, ai-agents, developer-tools, orchestration, gemini-flash, mit-license, no-vendor-lock-in, agentic-os
-->
