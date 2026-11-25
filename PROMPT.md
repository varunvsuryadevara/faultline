# Add the claims-stage pack to FaultLine

You're working in my FaultLine project: a motor insurance claims assistant with React 19 and Vite on the front end, an Express 5 server on Node 22, and the AI model called from the server only. The folder `faultline-antigravity-pack/` holds a finished, tested set of additions. Add them to my project as this file describes, prove they work with the checks in step 4, and change nothing else.

## What you're adding

- **100 new motor claim scenarios**, taking the library from 166 to 266. They follow the existing country mix: UK 22, US 20, India 22, Canada 5, Australia 5, four each for the UAE, Germany, France, South Africa and Singapore, and one each for Ireland, New Zealand, Japan, Italy, Spain and Malaysia. The original 166 stay exactly as they are.
- **A claim stage on every scenario**: 10 stages in 4 groups (see "Claim stages" under Reference). It becomes the library's 11th filter, the first fact on the scenario page (click it to filter), part of the search, and an API filter and facet.
- **One new fraud type**, `insider-fraud` ("Insider or staff fraud").
- **150 test cases**:
  - TC-001 to TC-100: an AI assessment case for each new scenario.
  - TC-101 to TC-125: counterfactual variants. Each changes one deciding fact in a scenario, so the right answer changes too.
  - TC-126 to TC-150: application test cases. 22 are automated in `tests/claims-pack.test.js`, and the other 3 (TC-142, TC-149, TC-150) are manual checks.
- **An evaluation runner**, `scripts/run-evals.mjs` (`npm run eval`), which runs the AI cases through the existing assessment and grades the answers, and `scripts/export-test-cases.mjs`, which writes the test case documents.

## Rules

1. Don't rebuild, redesign or restyle anything. Don't remove or change any existing feature, screen, route, API field or behaviour. The additions plug into the existing library, scenario page, search, API and assessment.
2. Don't create a separate demo page, and don't add any control that doesn't work against the real data.
3. Don't edit the 20 original data files in `shared/scenarios/data/`: uk.js, uk-b.js, uk-c.js, uk-d.js, us.js, us-b.js, us-c.js, us-d.js, in.js, in-b.js, in-c.js, in-d.js, ca.js, au.js, ae.js, de.js, fr.js, za.js, sg.js and other.js. Test TC-127 fingerprints them.
4. Only one existing test changes: in `tests/scenarios.test.js`, `assert.equal(FILTERS.length, 10)` becomes `11`. Don't edit, skip or delete any other test.
5. Don't change the AI prompt, the assessment pipeline (`shared/assess.js` and the files it uses) or the case file builder (`shared/scenarios/case.js`). The evaluation measures them as they are.
6. The model must never see a scenario's stage or its reference answers (whatHappened, assessment, action, indicators, inconsistencies, innocent, missing, questions, steps, outcomes). The case file builder already ensures this, and TC-143 checks it.
7. Never change a test case's expected results (`evals/cases/*.js`) to make a model run pass. A failed case is a finding to report to me. If you think a case itself is wrong, explain why and wait for my decision.
8. The API key stays on the server. It lives only in `.env`, which is git-ignored and never imported by browser code. Don't ask me to paste a key into the chat.
9. Don't add dependencies, and don't reformat, re-indent or rename existing files.
10. Copy pack files byte for byte; don't retype them. The data files are long, and a retyped record can differ without anyone noticing.
11. If my project doesn't match what this file describes, stop and ask rather than guess.

## Step 1: Inspect before changing anything

Run every command from the project root, the folder with `package.json`, `server/`, `shared/` and `src/`. The pack should be at `./faultline-antigravity-pack`; if it's somewhere else, use its path in the commands below.

1. If the project is a git repository, run `git switch -c claims-stage-pack` so the work goes on its own branch. Uncommitted changes come along untouched.
2. Run `npm test` (after `npm install` if `node_modules` is missing) and note the counts. An unmodified FaultLine reports 30 tests, 30 pass. If anything already fails, stop and tell me.
3. Check that the code edits apply:
   ```
   git apply --check --ignore-whitespace faultline-antigravity-pack/changes.diff
   ```
   Keep `--ignore-whitespace`: on Windows, files often have CRLF line endings and the check fails without it. `git apply` works outside a git repository too. If git isn't installed, compare each CHANGED file with `changes.diff` yourself and take route B.
4. Check that none of the files marked NEW in `faultline-antigravity-pack/MANIFEST.txt` exists in the project yet.
5. Check that the project still has the files the pack builds on: `shared/scenarios/vocab.js`, `query.js`, `index.js`, `validate.js` and `case.js`; `server/scenarios.js`; `src/components/ScenarioLibrary.jsx` and `ScenarioDetail.jsx`; and `shared/assess.js`.

## Step 2: Choose the route

- **Route A.** The patch check was clean and no NEW file exists yet. Go straight on to step 3A.
- **Route B.** Some edits don't apply, or a NEW file's name is taken. Tell me which files and why, then wait for my go-ahead before step 3B.
- **Route C.** The project no longer has the structure above (another framework, language or layout). Tell me where the scenarios, filters, search, API and assessment now live, then wait for my go-ahead before step 3C.

## Step 3A: Apply the pack

1. Apply the edits to the 11 files marked CHANGED:
   ```
   git apply --ignore-whitespace faultline-antigravity-pack/changes.diff
   ```
2. Copy the 35 files marked NEW in `MANIFEST.txt` from `faultline-antigravity-pack/files/<path>` to the same `<path>` in the project. Copy only the NEW files: the CHANGED ones are already done, and copying over them would undo any of my own edits that `git apply` kept.
3. Go to step 4.

## Step 3B: Merge by hand

1. Apply every edit that fits:
   ```
   git apply --ignore-whitespace --reject faultline-antigravity-pack/changes.diff
   ```
   For each file with edits that don't fit, this writes a `.rej` file beside it and reports an error; that's expected here. Your own edits elsewhere in those files are kept.
2. For each `.rej` file, make the same change by hand in my version of the file, keeping my own changes. "What each changed file does" under Reference explains each edit, and `files/<path>` shows the whole file as it should look in an unmodified FaultLine.
3. Delete the `.rej` files and any `.orig` files.
4. Copy the NEW files as in step 3A. If a NEW file's name is already taken, ask me first.
5. Go to step 4.

## Step 3C: Port to another structure

Work from the stack-neutral files rather than the JavaScript:

- `data/scenarios-new.json` has the 100 new records, each with its stage. `data/scenarios-all.json` has all 266 with stages filled in, and `data/stage-map.json` maps every id to its stage.
- `data/vocabulary.json` has every filter's values and labels, the stage groups and the intent families.
- `schema/scenario.schema.json` and `schema/ai-test-case.schema.json` are JSON Schema 2020-12. Validate the data against them after you import it.
- `data/ai-test-cases.json` has TC-001 to TC-125, and `data/app-test-cases.json` has TC-126 to TC-150.

Then, in my project's own structure and style:

1. Add the 100 records wherever the scenarios live. Leave the 166 originals as they are, and give each of them its stage from `data/stage-map.json`.
2. Add the claim stage everywhere the existing filters appear, as "Claim stage behaviour" under Reference describes.
3. Add `insider-fraud` to the fraud types.
4. Port the evaluation runner: build each case file with the existing case builder, apply the counterfactual patches, run the assessment, grade it as "How the AI cases are graded" describes, and write a report with pass rates by stage, kind and country and what each failed case missed.
5. Port TC-126 to TC-148 to my test framework, keeping the TC ids in the test names and the expected numbers as they are.
6. Run the equivalent of every check in step 4.

## Step 4: Verify

All of these must pass:

| Run | Expected |
| --- | --- |
| `npm test` | 22 more tests than in step 1, none failing. On an otherwise unmodified FaultLine: 52 tests, 52 pass, 0 fail |
| `node scripts/run-evals.mjs --dry-run` | Ends with `Checked 125 case files.` It builds and checks every case file without calling a model |
| `node scripts/run-evals.mjs --oracle` | Ends with `Passed 100 of 100 (100%).` It grades each scenario's own reference answers, without calling a model |
| `npm run build` | Succeeds. `dist/assets/scenarios-*.js` is about 876 kB (270 kB gzipped), with no chunk size warning |
| `npm run build:artifact` | Succeeds. `dist-artifact/index.html` is about 1.86 MB and contains `ZA-008` |

`node scripts/run-evals.mjs` is the same as `npm run eval`. Calling node directly avoids differences between shells in how options pass through npm. In PowerShell, quote comma lists: `--only "TC-001,TC-101"`. Reports go to `eval-results/`, which is git-ignored.

If a check fails, fix the cause in what you added or merged, never the test or its expected numbers, then run all the checks again.

## Step 5: Check the screens

Run `npm run dev`, open the app, and take screenshots if you can:

1. **TC-132.** The library's filters include **Claim stage**, second after Country. Its list starts with "All claim stages (266)" and shows the 10 stages under 4 group headings, each with a count.
2. **TC-142.** Open `#/scenarios/UK-057`. **Claim stage** is the first fact and reads "Regulatory compliance", and the nine facts sit in three rows of three. Clicking the stage opens the library filtered to Regulatory compliance: 6 scenarios.
3. **TC-149.** At 390 px wide, the facts sit in two columns. Choosing "Complaints and customer care" in the stage filter shows 9 scenarios and a chip that clears the filter.
4. **Regression.** The other filters, search, sorting, the random pick, the scenario page and the case analysis behave as before.

## Step 6: Run the AI evaluation

Only after steps 4 and 5 pass, and only if `.env` has a model key (the same settings the server uses):

1. **TC-144.** In the app, open UK-037 and run the AI assessment. It streams progress and ends with the comparison card showing agrees, close or differs.
2. Run `node scripts/run-evals.mjs --limit 10` and tell me how long it took before running the rest.
3. When I say go, run `npm run eval` for all 125 cases.
4. Summarise `eval-results/<time>/report.md` for me: the pass rate overall and by stage, kind and country, and for each failed case, the concept the answer missed.

Answers vary between runs, so don't expect 100%. Rule 7 applies: report failures, and don't edit the cases.

## Step 7: Finish

1. Show me what you did: the files added and changed, the check results, the screenshots, and anything you couldn't do.
2. Don't commit the `faultline-antigravity-pack/` folder. Ask me before deleting it.
3. If the project uses git, commit on the `claims-stage-pack` branch once I've approved, with a message like "Add claims-stage pack: 100 scenarios, claim stage filter, 150 test cases".

---

## Reference

### What each changed file does

`changes.diff` has the exact edits.

| File | Change |
| --- | --- |
| `shared/scenarios/vocab.js` | Adds `insider-fraud` to FRAUD_TYPES; adds STAGE_GROUPS and STAGES; adds the stage filter to FILTERS after country, with `groups: STAGE_GROUPS`; adds `stage: STAGES` to LISTS; exports `stageGroupOf(stage)` |
| `shared/scenarios/index.js` | Imports the 14 new data files (each country's after its existing ones) and EXISTING_STAGES from the new `stages.js`, and gives the originals their stage (code below) |
| `shared/scenarios/validate.js` | Adds `'stage'` to VOCAB_FIELDS, so every scenario needs a valid stage |
| `shared/scenarios/query.js` | Adds the stage label and its group label to each scenario's search text, and `stage` to scenario summaries |
| `src/components/ScenarioLibrary.jsx` | A filter with `groups` is drawn as `<optgroup>` sections, each showing the options with a count above 0, plus the selected one. Other filters are drawn as before |
| `src/components/ScenarioDetail.jsx` | `['stage', 'Claim stage']` becomes the first fact, and the facts grid changes from `sm:grid-cols-4` to `sm:grid-cols-3`, so the nine facts sit three by three |
| `tests/scenarios.test.js` | `FILTERS.length` changes from 10 to 11 |
| `package.json` | The `test` script adds `tests/claims-pack.test.js`, and there are new `eval` and `export:test-cases` scripts. No new dependencies |
| `vite.config.js` | `chunkSizeWarningLimit` goes from 700 to 1000 for the larger, lazy-loaded library chunk |
| `.gitignore` | Adds `eval-results/` |
| `README.md` | Updates the counts and documents the stage filter, the test cases and the AI evaluation |

```js
// shared/scenarios/index.js: the original records get their stage from stages.js
const withStage = (s) => (s.stage || !EXISTING_STAGES[s.id] ? s : { ...s, stage: EXISTING_STAGES[s.id] });
export const SCENARIOS = RECORDS.map(withStage);
```

The server needs no change. `server/scenarios.js` reads filters with `filtersFromParams` in `shared/scenarios/query.js`, which loops over FILTER_KEYS, so `GET /api/scenarios?stage=compliance,customer` works once vocab.js has the stage filter. Facets and filtering pick it up the same way; TC-138 and TC-139 test this.

### New files

| Path | What it is |
| --- | --- |
| `shared/scenarios/stages.js` | The stage of each of the 166 original scenarios |
| `shared/scenarios/data/` (14 files: `uk-e.js`, `uk-f.js`, `us-e.js`, `us-f.js`, `in-e.js`, `in-f.js`, `ca-b.js`, `au-b.js`, `ae-b.js`, `de-b.js`, `fr-b.js`, `za-b.js`, `sg-b.js`, `other-b.js`) | The 100 new scenarios |
| `evals/cases/` (10 files) | The 125 AI test cases |
| `evals/ai-cases.js` | Loads the AI cases and applies counterfactual patches |
| `evals/grade.js` | The grader |
| `evals/oracle.js` | Builds an answer from a scenario's reference answers, for the oracle check |
| `evals/app-cases.js` | The 25 application test cases |
| `scripts/run-evals.mjs` | The evaluation runner |
| `scripts/export-test-cases.mjs` | Writes `docs/test-cases/` |
| `docs/test-cases/` | The 150 test cases as TEST-CASES.md, test-cases.csv and test-cases.json |
| `tests/claims-pack.test.js` | The 22 automated application tests |

### Claim stages

| Group | Stage value | Label | All 266 | New 100 |
| --- | --- | --- | --- | --- |
| Intake and cover (`intake`) | `notification` | Notice and reporting | 17 | 8 |
| | `coverage` | Cover checks | 53 | 14 |
| Assessment and settlement (`assessment-settlement`) | `assessment` | Survey and valuation | 33 | 8 |
| | `settlement` | Settlement and payment | 24 | 12 |
| Third parties, recovery and legal (`third-parties`) | `third-party` | Third-party claims | 44 | 13 |
| | `legal` | Court and tribunal | 14 | 10 |
| | `recovery` | Recovery and subrogation | 21 | 8 |
| Fraud, compliance and customer (`fraud-compliance`) | `fraud` | Fraud investigation | 45 | 13 |
| | `compliance` | Regulatory compliance | 6 | 6 |
| | `customer` | Complaints and customer care | 9 | 8 |

### Claim stage behaviour

Routes A and B get this from the code; route C has to build it.

- **Filter.** Labelled "Claim stage", second after Country. The first option is "All claim stages (n)". The stages are grouped under the four group headings in the order above, each shown as "Label (count)", and a stage with no matches is hidden unless it's selected. Like every filter, the counts respect the search and the other filters but not the filter's own selection, and a chosen stage shows as a chip that clears it.
- **Search.** Each scenario's searchable text includes its stage label and group label, so "regulatory compliance" finds the compliance scenarios.
- **Scenario page.** "Claim stage" is the first fact. Clicking it opens the library filtered by that stage.
- **API.** The list and random endpoints accept `stage` as a comma-separated list, the facets include stage, and list items include `stage`.
- **Validation.** Every scenario's stage must be one of the 10 values.
- **Model.** The stage is never sent to the model (rule 6).

### Scenario records

`schema/scenario.schema.json` has the types and limits. In short:

- **Identity and labels:** id (two letters, a hyphen and three digits, such as UK-037), title, country, stage, category, claimType, intent, fraudType, difficulty, risk, confidence, vehicle, weather, accidentType, and optional tags. Labels must be vocabulary values.
- **Case file, which the model sees:** story (exhibit A, the claim notification), statement (exhibit B, with the optional claimant name), up to 3 accounts (who, kind, text), and a last exhibit built from damage, thirdParties and evidence. Each exhibit is 40 to 8,000 characters.
- **Reference answers, never sent to the model:** whatHappened, missing, inconsistencies, indicators, innocent, questions, steps, assessment, action and outcomes.
- thirdParties, evidence, missing, innocent, questions, steps and outcomes need at least one item, and fraud intents need at least one indicator.

### How the AI cases are graded

Each case names a scenario, the rule or practice it tests, and the expected result:

```js
expect: {
  family: ['genuine', 'uncertain'],   // accepted intent families
  risk: ['low', 'medium', 'high'],     // accepted risk levels
  flags: [                             // concepts the answer must or should raise
    { label: 'Accepts the accident happened after the policy started', any: ['after the policy', 'after inception' /* ... */], required: true },
  ],
}
```

1. A counterfactual case first patches the scenario. Each patch item has a `field` (a path such as `statement` or `accounts.0.text`), a `find` and a `replace`. In a text field, `find` must occur exactly once; in a list, exactly one item must contain it, once. That occurrence is replaced. Anything else is an error in the case.
2. Build the case file from the scenario, patched or not, with the existing case builder, and run the normal assessment.
3. Grade the assessment:
   - **Family.** The intent family of the assessment's `intent` must be in `expect.family`. Each intent's family is in `data/vocabulary.json`.
   - **Risk.** The assessment's `risk` must be in `expect.risk`.
   - **Text.** Collect every string anywhere in the assessment, except under the keys meta, intent, risk, confidence, exhibit and weight. Join them with newlines, lowercase them, turn curly quotes into straight ones and the dashes U+2010 to U+2013 into hyphens, and collapse each run of whitespace into one space.
   - **Concepts.** A flag is present if any of its `any` phrases, normalised the same way, appears in the text.
   - **Pass** needs the family, the risk and every required flag. **Score** is (family + risk + required flags present + 0.5 × optional flags present) ÷ (2 + required flags + 0.5 × optional flags), to two decimals.
4. Two checks keep the cases honest without a model. An answer built from each scenario's own reference answers (`evals/oracle.js`) passes all 100 scenario cases. And no required phrase appears in the case file, so an answer that only repeats the file fails (TC-147).

A phrase match shows that a point was raised, not that it was argued well, so failed and borderline answers need a person to read them.

### Runner options

| Option | Effect |
| --- | --- |
| `--only "TC-001,UK-037"` | Only these cases, by test case or scenario id |
| `--kind scenario` or `--kind counterfactual` | Only one kind of case |
| `--limit 10` | The first 10 of the selected cases |
| `--concurrency 3` | How many cases run at once (default 2) |
| `--dry-run` | Build and check every case file, without a model |
| `--oracle` | Grade the scenarios' own reference answers, without a model |
| `--min-pass 0.8` | Exit with an error below an 80% pass rate |
| `--out <folder>` | Where reports go (default `eval-results/`) |

Each case may take up to ANALYSIS_TIMEOUT_SECONDS from `.env` (default 240) and is retried once after a temporary error. Each run writes `results.json` and `report.md` to its own folder.

### Acceptance checklist

- [ ] 266 scenarios, with the 166 originals unchanged (TC-126, TC-127)
- [ ] Every scenario has a valid stage, new ids continue each country's numbering, and the new scenarios keep the country mix and cover all four claim areas (TC-128 to TC-131)
- [ ] The Claim stage filter is grouped with counts, combines with the other filters, and keeps the facets consistent (TC-132 to TC-134)
- [ ] Search finds the new scenarios and the stage names, and existing searches give the same results as before (TC-135 to TC-137)
- [ ] The API filters by stage, returns stage facets, serves new scenarios with their case files, and the random pick honours the stage (TC-138 to TC-141)
- [ ] The scenario page shows the stage, filters by it, and lays out correctly on desktop and phone (TC-142, TC-149)
- [ ] Case files never reveal the stage or the answers, and assessing a new scenario streams a result with the comparison (TC-143, TC-144)
- [ ] The dry run checks 125 case files, the oracle passes 100 of 100, and the cases and grader pass their tests (TC-145 to TC-148)
- [ ] Both builds pass and include the new scenarios (TC-150)
- [ ] No existing test changed except `FILTERS.length`, no existing feature changed or removed, no new dependencies, and `.env` not committed
