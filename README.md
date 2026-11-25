# FaultLine

**Find where the stories don't line up.**

FaultLine cross-examines several accounts of the same incident, such as statements, witness accounts, reports, job cards and system logs, and shows exactly where they cannot all be true. It rebuilds one timeline, lists every contradiction with the verbatim quotes behind it, checks each quote against the original text, offers the most plausible innocent explanation, and writes the question an investigator should ask next.

It's built for anyone who reconciles conflicting accounts by hand today: claims adjusters, HR and safety investigators, incident-review leads, compliance teams and journalists.

It also includes a [motor claims scenario library](#motor-claims-scenario-library): 266 realistic claims from 20 countries, across every stage of a claim and from genuine accidents to organised fraud, that you can search, filter, assess with AI against reference answers, or cross-examine. [150 test cases](#test-cases-and-ai-evaluation) check the app and the AI against expected results.

---

## Quick start (about 5 minutes)

You need **Node.js 22 LTS or newer** ([nodejs.org](https://nodejs.org)). Check with `node -v`.

```powershell
# 1. In the project folder, install dependencies
npm install

# 2. Create your settings file
copy .env.example .env        # Windows (PowerShell or Command Prompt)
cp .env.example .env          # macOS / Linux

# 3. Open .env and paste your key after ANTHROPIC_API_KEY=

# 4. Start the API server and the app together
npm run dev
```

Open **http://localhost:5173**, choose a sample case and click **Cross-examine**, or open the **Scenario library** to browse 266 motor claims and ask the AI to assess one.

To run everything on one port (handy for a demo laptop), build once and start the server:

```powershell
npm run build
npm start                     # http://localhost:8787
```

---

## API configuration

All settings live in `.env` in the project folder. The server re-reads the file whenever it changes, so a new key or model takes effect on the next analysis without a restart. Only `PORT` and `HOST` need one.

### Claude (default)

| Setting | Default | What it does |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | (empty) | Your key from the Claude Console (platform.claude.com, under API keys). |
| `ANTHROPIC_MODEL` | `claude-sonnet-5-5` | `claude-haiku-5-5` is faster and cheaper; `claude-opus-5-5` is stronger. |
| `ANTHROPIC_EFFORT` | `medium` | `low`, `medium` or `high`. Lower is faster; `medium` is a good balance for a live demo. |
| `ANTHROPIC_SHOW_REASONING` | `true` | Streams the model's summarised reasoning into the live progress log. |

FaultLine calls the Messages API (`anthropic-version: 2026-10-21`) with streaming and **structured outputs** (`output_config.format` with a JSON Schema), so the answer matches the shape the UI expects. The two documented exceptions, a refusal and an answer cut off at the token limit, are caught and shown as clear errors.

### Any OpenAI-compatible API

Set `LLM_PROVIDER=openai`, then:

| Provider | `OPENAI_BASE_URL` | `OPENAI_MODEL` (example) |
| --- | --- | --- |
| OpenAI | `https://api.openai.com/v1` | `gpt-5.4-mini` |
| Google Gemini | `https://generativelanguage.googleapis.com/v1beta/openai` | `gemini-3.8-flash` |
| Groq | `https://api.groq.com/openai/v1` | a Groq model id |
| Ollama (local, no key) | `http://localhost:11434/v1` | a model you have pulled |

Put the key in `OPENAI_API_KEY`. Model names change often, so check your provider's model list if one is rejected. These APIs can't all enforce a JSON Schema, so FaultLine asks for JSON mode, includes the schema in the prompt, and repairs the result before showing it.

### How the key is kept safe

- The key is read only by the Node server (`server/index.js`). The browser never receives it, and `/api/health` reports only whether a key is configured.
- Vite exposes only variables that start with `VITE_` to the browser. Never rename the key with that prefix.
- `.env` is in `.gitignore`, so it isn't committed.
- The server sends no CORS headers, so other websites can't use your server (and your key) from a visitor's browser.
- Each client gets 30 analyses or claim assessments per 10 minutes (`RATE_LIMIT_PER_10_MIN`). Request bodies are capped at 200 KB and inputs are validated.
- The server listens on `127.0.0.1` only. Set `HOST=0.0.0.0` if you deploy it or want to demo it across a network.
- Non-empty values in `.env` override variables already set on your machine, so an old system-wide `ANTHROPIC_API_KEY` can't silently take over.

To deploy (Render, Railway, Fly and similar), use the build command `npm install && npm run build`, the start command `npm start`, and set the same variables, including `HOST=0.0.0.0`, in the host's dashboard. Add authentication before you put real case data on a public URL.

---

## How it works

```
Browser (React)                     Node server (Express)                   Model
───────────────                     ─────────────────────                   ─────
Case file: 2–6 exhibits  ──POST──▶  validate + wrap exhibits as untrusted
                                    <exhibit> blocks                ──────▶ Claude: streaming,
                                                                            structured output,
Live log ◀── NDJSON progress ─────  read the half-written JSON:     ◀────── summarised thinking
(stages, conflicts as they           stage, events, each conflict,
 are found, reasoning)               reasoning headline
                                    normalise → verify every quote
Findings ◀── result ──────────────  against the exhibit text
```

1. **Prompt.** The system prompt makes the model a neutral cross-examiner: respect approximate times, weigh system records against recollection, grade severity, quote verbatim, always give an innocent explanation, never accuse. Exhibit text is treated as evidence, never as instructions.
2. **Live progress, not a fake spinner.** As tokens arrive, `shared/progress.js` parses the partial JSON and reports what the model has actually written: events rebuilt, each conflict as it's committed, and the heading of its current reasoning.
3. **Normalise.** `shared/normalize.js` drops unknown exhibit ids, coerces enums, sorts conflicts by severity, re-numbers them and links each one to its timeline events.
4. **Verify.** `shared/verify.js` searches every quoted passage in the cited exhibit, ignoring case, curly quotes and spacing. Each quote is marked *word for word*, *close match* or *not found*, with character offsets for the highlights. A verbatim quote cited to the wrong exhibit is re-attributed and flagged.
5. **Score.** The consistency score starts at 100. Each open conflict subtracts its severity weight (critical 24, major 12, minor 4) multiplied by the model's confidence, counted as at least 30%. Dismissing a conflict removes it from the score and its highlights from the exhibits.

The same pipeline code (`shared/`) runs on the server and, for the hosted claude.ai build, in the browser.

---

## Motor claims scenario library

A library of **266 realistic motor insurance claims** from 20 countries, built into the app: open it with **Scenario library** in the top bar, or from the start page.

| | |
| --- | --- |
| Countries | United Kingdom 58, India 58, United States 54, Canada 13, Australia 13, UAE 11, Germany 11, France 11, South Africa 11, Singapore 10, two each from Ireland, New Zealand, Japan, Italy, Spain and Malaysia, and one each from Brazil, Nigeria, Kenya and the Netherlands |
| Claim stages | Where the scenario's key decision sits, in four areas. *Intake and cover:* notice and reporting 17, cover checks 53. *Assessment and settlement:* survey and valuation 33, settlement and payment 24. *Third parties, recovery and legal:* third-party claims 44, court and tribunal 14, recovery and subrogation 21. *Fraud, compliance and customer:* fraud investigation 45, regulatory compliance 6, complaints and customer care 9 |
| Categories | Genuine accidents, unintentional damage, weather and natural events, mechanical and vehicle-related, theft and vandalism, negligence, intentional fraud, grey areas |
| Intent | All 12 classifications, from *Genuine* through *Genuine with negligence*, *reporting errors* and *potential exaggeration*, *Suspicious*, *Disputed*, *Insufficient evidence* and *Mixed*, to *Potential*, *Confirmed*, *Third-party* and *Organised fraud*. Suspicious is never treated as fraudulent. |
| Each scenario | ID, title, country, claim stage, category, scenario type, intent, difficulty, the claim notification, the claimant's statement, up to three other accounts (other drivers, witnesses, police, telematics, garages), what may actually have happened, damage, third parties, evidence available, missing evidence, inconsistencies, fraud indicators, innocent explanations, investigation questions, recommended steps, a reference assessment, risk level, confidence, recommended action and possible outcomes |

All people, garages and companies are fictional. Public bodies and legal rules (CUE, the MIB, Part 36 offers and the whiplash tariff in the UK; PIP, comparative negligence, time-limited demands and Medicare reporting in the US; FIRs, IDV, IRDAI claim timelines, the 2025 cashless treatment scheme and the Motor Accident Claims Tribunal in India; the SAAQ, the Badinter law, SASRIA, the Road Accident Fund, the General Insurance Code of Practice, ACC, and so on) are real and described as they generally apply; check the current rules and policy wording before relying on them for a real claim.

**What you can do with it**

- **Search in plain words**, for example *monsoon flood in India*, *UK crash for cash* or *garage invoices*. Synonyms are understood (*bike* finds motorcycles and scooters, *write-off* finds total losses), countries in the query become filters, and quoted phrases must match exactly.
- **Filter** by country, claim stage, category, claim type, intent, fraud type, risk level, difficulty, vehicle type, weather and accident type. Each option shows how many scenarios it would leave.
- **Open a random scenario**, from the whole library or from your current results.
- **Read the full case** on the scenario page: the case file (the documents a handler would hold), and the reference answers.
- **Assess with AI.** The model reads only the case file, never the reference answers, and returns what probably happened, evidence for and against with verified quotes, suspicious indicators, innocent explanations, missing evidence, risks, investigation questions, steps, next actions, an intent, a risk level, a confidence and its reasoning. FaultLine then compares its call with the reference: *agrees*, *close* or *differs*.
- **Cross-examine the statements.** One click opens the scenario's exhibits as a FaultLine case file, so the existing timeline and contradiction analysis runs on it. A *Back to* button returns to the scenario.

Each screen has its own address (`#/scenarios`, `#/scenarios/UK-001`), so the browser's Back button and bookmarks work.

**API**

| Request | Returns |
| --- | --- |
| `GET /api/scenarios?q=flood&country=IN,UK&risk=high&sort=risk-desc&limit=50&offset=0` | Summaries of matching scenarios, the total, and facet counts for every filter |
| `GET /api/scenarios/random?intent=potential-fraud` | One random scenario matching the filters, with its case file |
| `GET /api/scenarios?stage=compliance,customer` | Scenarios at those claim stages (any filter works the same way) |
| `GET /api/scenarios/UK-021` | The full scenario and the case file built from it |
| `POST /api/scenarios/UK-021/assess` | Streams the AI assessment as newline-delimited JSON, ending with the result and the comparison with the reference |

Filter parameters use the values in `shared/scenarios/vocab.js` (for example `claimType=hire-recovery`, `vehicle=two-wheeler`); several values are separated by commas. The assess endpoint shares the analysis rate limit.

**Adding scenarios.** Scenarios are plain records in `shared/scenarios/data/`. Add one to any file (with a `stage`) and it appears in the library, the filters, the search and the API. The original 166 records take their stage from `shared/scenarios/stages.js` so their files stay unchanged. `npm test` checks every record: required fields, allowed values, unique ids and titles, a valid case file, and that no reference answer can reach the model.

### Test cases and AI evaluation

150 test cases check the library and the AI against expected results. The full list, with steps and expected results, is in `docs/test-cases/TEST-CASES.md`, and as `test-cases.csv` with blank Status, Tester, Date and Notes columns for UAT.

| Cases | What they test | How to run |
| --- | --- | --- |
| TC-001 to TC-100 | One per new scenario (UK-037 onwards): the AI assessment must reach the expected intent family and risk level and include the required concepts, such as a regulator deadline or a recovery step | `npm run eval` |
| TC-101 to TC-125 | Counterfactual variants: one deciding fact is changed in a scenario, so the right answer changes too | `npm run eval -- --kind counterfactual` |
| TC-126 to TC-150 | The app: data, stage filter, search, API, case files, assessment stream, and the evaluation suite itself | `npm test` (a few are manual browser checks) |

`npm run eval` uses the model configured in `.env` and writes `eval-results/<date-time>/report.md` with pass rates by stage, kind and country, and what each failed case missed. Useful options: `--only TC-014,UK-051`, `--limit 10`, `--concurrency 3`, `--min-pass 0.8`. Two modes need no key: `--dry-run` builds and checks every case file, and `--oracle` grades each scenario's own reference answers, which must all pass.

An AI case passes when the intent family and risk level are among those expected and every required concept is present. A concept counts as present when any of its phrases (in `evals/cases/`) appears in the assessment. No required phrase appears in the case file itself, so a concept only counts when the assessment adds it; an answer that only repeats the case file fails every case. A phrase match shows that a point was raised, not that it was argued well, so read the failed and borderline answers in the report yourself. After editing the cases, run `npm run export:test-cases` to refresh the documents.

---

## Project structure

```
faultline/
├── index.html                  Vite entry page
├── package.json                scripts: dev, build, start, test, eval, export:test-cases, build:artifact
├── vite.config.js              React + Tailwind; proxies /api to the server during dev
├── .env.example                copy to .env and add your API key
├── server/                     Express API, the only place the API key lives
│   ├── index.js                GET /api/health, POST /api/analyze (streams NDJSON), static app
│   ├── scenarios.js            /api/scenarios: list, search, random, detail, AI assessment
│   ├── rate-limit.js           per-client limit
│   └── providers/
│       ├── anthropic.js        Claude Messages API: structured outputs + streamed reasoning
│       ├── openai.js           any OpenAI-compatible API
│       └── http.js             SSE reader, retries when the model is busy, provider error mapping
├── shared/                     the analysis pipeline, used by the server and the browser
│   ├── prompt.js               system prompt, exhibit wrapper, JSON Schema
│   ├── pipeline.js             prompt → stream → progress → normalise → verify
│   ├── progress.js             live progress from partial JSON
│   ├── normalize.js            repairs and reshapes model output
│   ├── verify.js               checks every quote against the exhibit text
│   ├── validate.js             input limits and text cleaning
│   ├── constants.js
│   ├── errors.js
│   ├── samples.js              the three demo cases
│   ├── assess.js               claim assessment: prompt, JSON Schema, progress, normalising
│   └── scenarios/              the motor claims scenario library
│       ├── data/               266 scenarios, one file per country (large countries split in parts)
│       ├── stages.js           the claim stage of each of the original 166 scenarios
│       ├── vocab.js            countries, categories, intents, filters and their labels
│       ├── query.js            search, filters, facet counts, sorting, random picks
│       ├── case.js             builds a case file from a scenario (facts only, no answers)
│       ├── compare.js          compares an AI assessment with the reference answers
│       ├── validate.js         checks every record
│       └── index.js            the library, lookups by id
├── src/                        React app
│   ├── App.jsx                 case file, run state, review state, selection
│   ├── components/
│   │   ├── Landing.jsx         headline, sample cases, way into the scenario library
│   │   ├── ScenarioLibrary.jsx search, eleven filters, sort, random, scenario cards
│   │   ├── ScenarioDetail.jsx  one scenario: case file, AI assessment, reference answers
│   │   ├── ScenarioAssessment.jsx  live progress and results of the AI assessment
│   │   ├── ScenarioBits.jsx    risk badge, intent tag, folder tab, lists
│   │   ├── CaseFile.jsx        exhibit editor and highlighted exhibits
│   │   ├── LiveLog.jsx         streaming progress while the model works
│   │   ├── Findings.jsx        score, summary, exports, tabs
│   │   ├── FaultStrip.jsx      the case as a seismograph: spikes at disputed events
│   │   ├── Conflicts.jsx       conflict list with evidence, explanation, question, review
│   │   ├── Views.jsx           timeline, agreed facts, gaps and next steps
│   │   ├── AnalysisPanel.jsx   ready, error and setup states
│   │   └── TopBar.jsx, Toast.jsx, ui.jsx
│   ├── lib/                    transport (server or claude.ai), score, report export, highlights, hooks,
│   │                           lazy loading of the scenario library
│   ├── data/samples.js         re-exports shared/samples.js
│   ├── index.css               design tokens, highlighter marks, fault headline
│   ├── fonts.css               self-hosted Archivo and Source Serif 4
│   └── main.jsx
├── evals/                      AI evaluation test cases
│   ├── ai-cases.js             TC-001 to TC-125, and the counterfactual patching
│   ├── cases/                  expected results for each case
│   ├── app-cases.js            TC-126 to TC-150, the application test cases
│   ├── grade.js                grades an assessment against its expected results
│   └── oracle.js               turns a scenario's reference answers into an assessment
├── scripts/
│   ├── run-evals.mjs           npm run eval
│   └── export-test-cases.mjs   npm run export:test-cases
├── docs/test-cases/            TEST-CASES.md, test-cases.csv, test-cases.json
└── tests/
    ├── pipeline.test.js        offline tests for verification, normalising, progress, validation
    ├── scenarios.test.js       the library data, search, case builder, assessment and comparison
    └── claims-pack.test.js     application test cases TC-126 to TC-148
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | API server on :8787 (auto-restarts) and Vite on :5173 |
| `npm run build` | Production build into `dist/` |
| `npm start` | Server on :8787 serving the API and the built app |
| `npm test` | Offline tests; no API key needed |
| `npm run eval` | The 125 AI evaluation cases against the configured model (see [Test cases and AI evaluation](#test-cases-and-ai-evaluation)) |
| `npm run export:test-cases` | Rewrites `docs/test-cases/` from the case definitions |
| `npm run build:artifact` | One self-contained HTML file in `dist-artifact/` that runs inside claude.ai and asks Claude through the artifact runtime, so it needs no key |

---

## Troubleshooting

| You see | Do this |
| --- | --- |
| PowerShell: *running scripts is disabled on this system* | Run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once, or use Command Prompt. |
| Pill says **Server offline** | The API isn't running. `npm run dev` starts both parts; keep that terminal open. |
| Pill says **API key missing** | Check that `.env` exists in the project folder (not `.env.txt`) and has the key, then save it. The pill updates when you switch back to the page. |
| *The API account needs credit* | The account behind the key has no API credit left. Add credit in the Claude Console under Billing, then click **Try again**. |
| The first analysis is slower | Claude compiles FaultLine's output schema the first time it sees it and caches it for 24 hours. Run one sample before you present. |
| *The API key was rejected* | The key is wrong or has been revoked. Claude keys start with `sk-ant-`. Make a new one in the Claude Console, paste it into `.env` and save. |
| *Port 8787 is already in use* | Stop the other process, or set `PORT=8788` in `.env` and run `npm run dev` again. The dev proxy follows the new port. |
| Errors mentioning the Node version | Install Node.js 22 LTS. Vite 8 and the dev tooling need it. |
| `npm audit` reports *picomatch* | A build-time dependency of Vite with no patched release yet. It isn't part of the running app. |
| A quote shows **Not found in exhibit** | The verifier caught a quote the model didn't copy exactly. Treat that point with caution. This is the safety check working. |

## Responsible use

FaultLine flags inconsistencies for a person to review. It doesn't decide who is telling the truth, and it never labels anyone a liar or a fraudster. Every finding links to the exact words it rests on, includes an innocent explanation, and can be confirmed or dismissed by the reviewer. Only paste material you're allowed to share with your model provider.

The claim assessment classifies the claim, not the person. It is told to choose the least serious classification the evidence supports, to treat suspicion as a reason to check rather than proof, and to give innocent explanations and the evidence that would change its view. It is a triage aid for a claims handler, not a decision.
