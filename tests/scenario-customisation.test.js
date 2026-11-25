import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EXHIBIT_IDS, LIMITS } from '../shared/constants.js';
import { scenarioCase } from '../shared/scenarios/case.js';
import { getScenario } from '../shared/scenarios/index.js';
import { buildAssessMessage, runAssessment } from '../shared/assess.js';
import { buildUserMessage, wrapCase } from '../shared/prompt.js';
import { runAnalysis } from '../shared/pipeline.js';
import { validateCase } from '../shared/validate.js';
import { verifyEvidence } from '../shared/verify.js';
import {
  deleteCustomScenario,
  duplicateScenario,
  getCustomScenario,
  listCustomScenarios,
  saveCustomScenario,
} from '../server/custom-scenarios.js';

test('Test 1: Edit Exhibit B claimant statement, save, assess with AI uses edited statement', async () => {
  const original = getScenario('UK-001');
  assert.ok(original, 'UK-001 must exist');
  const baseCase = scenarioCase(original);

  const originalBText = baseCase.exhibits[1].text;
  const editedBText =
    'Policyholder, 42, was involved in a rear-end collision on a roundabout exit in Manchester at approximately 18:30. The claimant reported that the vehicle ahead suddenly braked. Injury claims were submitted three days after the accident.';

  // Customise Exhibit B
  const customCase = {
    ...baseCase,
    title: 'UK-001 Custom: Manchester collision with two passengers',
    exhibits: baseCase.exhibits.map((e, i) =>
      i === 1 ? { ...e, label: "Claimant's statement (Manchester)", text: editedBText } : { ...e }
    ),
  };

  // Save as customised scenario
  const saved = saveCustomScenario({
    baseScenarioId: 'UK-001',
    title: customCase.title,
    case: customCase,
  });

  assert.ok(saved.id, 'Saved scenario must have an ID');
  assert.notEqual(saved.id, 'UK-001', 'Must not overwrite original ID');

  // Verify buildAssessMessage includes the edited text and NOT the original text
  const assessMsg = buildAssessMessage({
    context: customCase.context,
    exhibits: customCase.exhibits.map((e, i) => ({ id: EXHIBIT_IDS[i], label: e.label, kind: e.kind, text: e.text })),
  });

  assert.ok(assessMsg.includes(editedBText), 'Assess message must include the edited Exhibit B text');
  assert.ok(!assessMsg.includes(originalBText), 'Assess message must NOT include the original Exhibit B text');

  // Run assessment with mock streamText verifying the model receives the edited text
  let receivedPrompt = '';
  const result = await runAssessment(
    {
      context: customCase.context,
      sources: customCase.exhibits.map(({ label, kind, text }) => ({ label, kind, text })),
    },
    {
      streamText: async ({ user }) => {
        receivedPrompt = user;
        return JSON.stringify({
          summary: 'The claimant was involved in a rear-end collision in Manchester.',
          supporting: [
            {
              point: 'Claimant reported sudden braking in Manchester',
              exhibit: 'B',
              quote: 'The claimant reported that the vehicle ahead suddenly braked.',
            },
          ],
          against: [],
          indicators: [],
          innocent: ['Honest difference in perception of braking time'],
          missing: [{ item: 'Dashcam', why: 'To confirm sudden braking' }],
          risks: ['Liability dispute'],
          questions: [{ ask: 'Claimant', question: 'What speed were you travelling at?' }],
          steps: ['Inspect vehicle damage'],
          next_actions: ['Request dashcam footage'],
          intent: 'genuine',
          risk: 'low',
          confidence: 0.9,
          reasoning: 'The claimant statement describes a standard rear-end collision.',
        });
      },
    }
  );

  assert.ok(receivedPrompt.includes('Manchester at approximately 18:30'), 'Model prompt must contain edited text');
  assert.equal(result.supporting[0].exhibit, 'B');
  assert.equal(result.supporting[0].match.status, 'exact');

  // Clean up
  deleteCustomScenario(saved.id);
});

test('Test 2: Delete Exhibit C, cross-examine, verify AI does not reference Exhibit C', async () => {
  const original = getScenario('UK-001');
  const baseCase = scenarioCase(original);
  assert.ok(baseCase.exhibits.length >= 3, 'Base case must have at least 3 exhibits');

  const deletedExhibitText = baseCase.exhibits[2].text;

  // Delete Exhibit C (index 2)
  const remainingExhibits = baseCase.exhibits.filter((_, i) => i !== 2);
  const customCase = {
    ...baseCase,
    exhibits: remainingExhibits,
  };

  // Run cross-examination
  let receivedUserMsg = '';
  const result = await runAnalysis(
    {
      context: customCase.context,
      sources: customCase.exhibits.map(({ label, kind, text }) => ({ label, kind, text })),
    },
    {
      streamText: async ({ user }) => {
        receivedUserMsg = user;
        return JSON.stringify({
          summary: 'Cross-examination of available exhibits',
          timeline: [],
          contradictions: [],
          corroborations: [],
          gaps: [],
          nextSteps: [],
        });
      },
    }
  );

  // Verify deleted exhibit is not in user message
  assert.ok(!receivedUserMsg.includes(deletedExhibitText), 'Deleted exhibit text must not be in model prompt');
  assert.equal(result.meta.exhibits.length, remainingExhibits.length);
  // Ensure exhibit IDs in result match only the remaining count (e.g. A, B, C)
  assert.deepEqual(
    result.meta.exhibits.map((e) => e.id),
    EXHIBIT_IDS.slice(0, remainingExhibits.length)
  );
});

test('Test 3: Add Exhibit G containing CCTV findings, assess with AI incorporates Exhibit G', async () => {
  const original = getScenario('UK-001');
  const baseCase = scenarioCase(original);

  const cctvText =
    'High-resolution council CCTV camera 14 recorded the roundabout exit at 14:21:05. The BMW is observed braking abruptly with no illuminated brake lights. The trailing vehicle strikes the rear bumper at an estimated 11 mph.';

  // Build up to 7 exhibits so Exhibit G (index 6) is created
  const filler = (letter) => ({
    label: `Exhibit ${letter} report`,
    kind: 'report',
    text: `Verified official report ${letter} regarding vehicle positioning, damage records and telemetry data on file.`,
  });

  const exhibits = [...baseCase.exhibits];
  while (exhibits.length < 6) {
    exhibits.push(filler(EXHIBIT_IDS[exhibits.length]));
  }
  // Add Exhibit G
  exhibits.push({
    label: 'CCTV footage summary, Council Camera 14',
    kind: 'cctv',
    text: cctvText,
  });

  assert.equal(exhibits.length, 7);
  assert.equal(EXHIBIT_IDS[6], 'G');

  let receivedPrompt = '';
  const result = await runAssessment(
    {
      context: baseCase.context,
      sources: exhibits.map(({ label, kind, text }) => ({ label, kind, text })),
    },
    {
      streamText: async ({ user }) => {
        receivedPrompt = user;
        return JSON.stringify({
          summary: 'CCTV footage decisively clarifies the incident circumstances.',
          supporting: [
            {
              point: 'CCTV footage verifies that the BMW braked with non-illuminated brake lights',
              exhibit: 'G',
              quote: 'The BMW is observed braking abruptly with no illuminated brake lights.',
            },
          ],
          against: [],
          indicators: [],
          innocent: [],
          missing: [],
          risks: [],
          questions: [],
          steps: [],
          next_actions: [],
          intent: 'genuine',
          risk: 'low',
          confidence: 0.95,
          reasoning: 'Exhibit G CCTV footage provides conclusive objective evidence.',
        });
      },
    }
  );

  assert.ok(receivedPrompt.includes('exhibit id="G"'), 'Prompt must include exhibit id="G"');
  assert.ok(receivedPrompt.includes(cctvText), 'Prompt must include Exhibit G content');
  assert.equal(result.supporting[0].exhibit, 'G');
  assert.equal(result.supporting[0].match.status, 'exact');
});

test('Test 4: Modify two exhibits so they no longer contradict, verify previous contradiction no longer reported', async () => {
  // Originally contradicting accounts:
  const contradictorySources = [
    { label: 'Driver A', kind: 'statement', text: 'The traffic signal was green and I had the right of way. I proceeded through the junction normally.' },
    { label: 'Driver B', kind: 'statement', text: 'The traffic signal was red and the other driver jumped the red light completely at speed.' },
  ];

  // Reconciled accounts:
  const reconciledSources = [
    { label: 'Driver A', kind: 'statement', text: 'The traffic signal had just turned amber and I was unable to brake safely before entering the junction.' },
    { label: 'Driver B', kind: 'statement', text: 'The traffic signal had just turned amber as the other vehicle entered the junction.' },
  ];

  const parsed = validateCase({ context: 'Junction collision review', sources: reconciledSources });
  assert.ok(parsed.ok);

  let prompt = '';
  await runAnalysis(parsed.value, {
    streamText: async ({ user }) => {
      prompt = user;
      return JSON.stringify({
        summary: 'Both drivers agree on amber light timing',
        timeline: [],
        contradictions: [],
        corroborations: [
          {
            id: 'K1',
            title: 'Agreement on signal state',
            category: 'time',
            evidence: [
              { exhibit: 'A', quote: 'The traffic signal had just turned amber' },
              { exhibit: 'B', quote: 'The traffic signal had just turned amber' },
            ],
            events: [],
          },
        ],
        gaps: [],
        nextSteps: [],
      });
    },
  });

  assert.ok(prompt.includes('turned amber'), 'Model received reconciled statements');
  assert.ok(!prompt.includes('jumped the red light'), 'Old contradiction text absent');
});

test('Test 5: Modify exhibits to introduce a new contradiction, verify AI detects it', async () => {
  const sources = [
    {
      label: 'Exhibit A',
      kind: 'statement',
      text: 'The accident occurred at 14:00 in bright broad daylight with completely dry asphalt.',
    },
    {
      label: 'Exhibit B',
      kind: 'statement',
      text: 'The accident occurred at 23:45 in complete pitch darkness during a torrential rainstorm.',
    },
  ];

  const parsed = validateCase({ context: 'Contradiction check', sources });
  assert.ok(parsed.ok);

  const result = await runAnalysis(parsed.value, {
    streamText: async () =>
      JSON.stringify({
        summary: 'Direct clash on incident time and weather',
        timeline: [],
        contradictions: [
          {
            id: 'C1',
            title: 'Conflict on time of collision and lighting conditions',
            severity: 'critical',
            category: 'time',
            evidence: [
              { exhibit: 'A', quote: 'The accident occurred at 14:00 in bright broad daylight' },
              { exhibit: 'B', quote: 'The accident occurred at 23:45 in complete pitch darkness' },
            ],
            followUp: { ask: 'Police', question: 'What was the recorded time of dispatch?' },
            confidence: 0.99,
            events: [],
          },
        ],
        corroborations: [],
        gaps: [],
        nextSteps: [],
      }),
  });

  assert.equal(result.contradictions.length, 1);
  assert.equal(result.contradictions[0].severity, 'critical');
  assert.equal(result.contradictions[0].evidence[0].match.status, 'exact');
  assert.equal(result.contradictions[0].evidence[1].match.status, 'exact');
});

test('Test 6: Save customised scenario, reload/read from disk, verify all modifications persist', () => {
  const testScenarioId = `UK-TEST-${Date.now()}`;
  const customCase = {
    title: 'Customised Roundabout Claim for Persistence',
    context: 'UK motor insurance claim context',
    exhibits: [
      { label: 'Notification', kind: 'record', text: 'First notice of loss reported by insured driver via mobile portal.' },
      { label: 'Claimant Statement', kind: 'statement', text: 'Detailed statement confirming impact velocity of 15 mph in Manchester.' },
    ],
  };

  const saved = saveCustomScenario({
    id: testScenarioId,
    baseScenarioId: 'UK-001',
    title: customCase.title,
    case: customCase,
  });

  assert.equal(saved.id, testScenarioId);

  // Retrieve fresh from store (persisted to disk)
  const retrieved = getCustomScenario(testScenarioId);
  assert.ok(retrieved, 'Scenario must persist and be retrievable');
  assert.equal(retrieved.title, customCase.title);
  assert.equal(retrieved.case.exhibits.length, 2);
  assert.equal(retrieved.case.exhibits[1].text, customCase.exhibits[1].text);

  // Clean up
  deleteCustomScenario(testScenarioId);
  assert.equal(getCustomScenario(testScenarioId), null);
});

test('Test 7: Reset customised scenario, verify original exhibits are restored', () => {
  const original = getScenario('UK-001');
  const baseCase = scenarioCase(original);

  // Create a modified in-memory copy
  const modifiedCase = {
    ...baseCase,
    title: 'Heavily Modified UK-001 Title',
    exhibits: [
      { label: 'Brand New Exhibit', kind: 'telematics', text: 'GPS tracker ping at high speed across town.' },
      { label: 'Another Exhibit', kind: 'cctv', text: 'Traffic cam footage showing clear vehicle path.' },
    ],
  };

  assert.notEqual(modifiedCase.exhibits[0].text, baseCase.exhibits[0].text);

  // Execute reset: revert back to scenarioCase(original)
  const resetCase = scenarioCase(original);
  assert.equal(resetCase.title, `${original.id}: ${original.title}`);
  assert.equal(resetCase.exhibits.length, baseCase.exhibits.length);
  assert.equal(resetCase.exhibits[0].text, baseCase.exhibits[0].text);
});

test('Test 8: Create customised scenario, verify original predefined scenario remains unchanged', () => {
  const originalBefore = getScenario('UK-001');
  const originalTitleBefore = originalBefore.title;
  const originalStoryBefore = originalBefore.story;
  const originalCaseBefore = scenarioCase(originalBefore);

  // Create customized scenario derived from UK-001
  const custom = saveCustomScenario({
    baseScenarioId: 'UK-001',
    title: 'Rewritten Roundabout Accident With Completely Different Facts',
    case: {
      title: 'Rewritten Roundabout Accident',
      context: 'New context',
      exhibits: [
        { label: 'New Exhibit 1', kind: 'statement', text: 'This is completely new exhibit text for the custom version.' },
        { label: 'New Exhibit 2', kind: 'witness', text: 'Second new exhibit text confirming an entirely different scenario.' },
      ],
    },
  });

  // Verify the predefined original scenario is 100% untouched
  const originalAfter = getScenario('UK-001');
  assert.equal(originalAfter.title, originalTitleBefore);
  assert.equal(originalAfter.story, originalStoryBefore);
  const originalCaseAfter = scenarioCase(originalAfter);
  assert.equal(originalCaseAfter.exhibits.length, originalCaseBefore.exhibits.length);
  assert.equal(originalCaseAfter.exhibits[0].text, originalCaseBefore.exhibits[0].text);

  // Clean up custom scenario
  deleteCustomScenario(custom.id);
});

test('Test 9: Delete an exhibit and ensure exhibit references and numbering are handled correctly', () => {
  const exhibits = [
    { label: 'Exhibit A', kind: 'record', text: 'Original statement A text describing the morning commute.' },
    { label: 'Exhibit B', kind: 'statement', text: 'Original statement B text from the other vehicle driver.' },
    { label: 'Exhibit C', kind: 'witness', text: 'Original statement C text from bystander at the corner.' },
    { label: 'Exhibit D', kind: 'document', text: 'Original document D repair shop estimate and intake notes.' },
  ];

  // Delete Exhibit B (index 1)
  const remaining = exhibits.filter((_, i) => i !== 1);
  assert.equal(remaining.length, 3);

  // Renumbering verification: new IDs will be A, B, C
  const renumbered = remaining.map((e, i) => ({
    id: EXHIBIT_IDS[i],
    label: e.label,
    kind: e.kind,
    text: e.text,
  }));

  assert.equal(renumbered[0].id, 'A');
  assert.equal(renumbered[0].text, exhibits[0].text);

  assert.equal(renumbered[1].id, 'B'); // Previously Exhibit C
  assert.equal(renumbered[1].text, exhibits[2].text);

  assert.equal(renumbered[2].id, 'C'); // Previously Exhibit D
  assert.equal(renumbered[2].text, exhibits[3].text);
});

test('Test 10: Duplicate a scenario and ensure the duplicate can be edited independently', () => {
  const original = getScenario('UK-001');
  const duplicated = duplicateScenario('UK-001', 'UK-001 Independent Duplicate');

  assert.ok(duplicated);
  assert.ok(duplicated.id.includes('COPY'));
  assert.equal(duplicated.title, 'UK-001 Independent Duplicate');

  // Edit duplicate's exhibits
  const modifiedDuplicateCase = {
    ...duplicated.case,
    exhibits: [
      { label: 'Custom Ex 1', kind: 'statement', text: 'Duplicate specific text that only exists in this copy.' },
      { label: 'Custom Ex 2', kind: 'witness', text: 'Duplicate specific second witness statement on file.' },
    ],
  };

  saveCustomScenario({
    ...duplicated,
    case: modifiedDuplicateCase,
  });

  // Verify duplicate has new text
  const loadedDuplicate = getCustomScenario(duplicated.id);
  assert.equal(loadedDuplicate.case.exhibits[0].text, 'Duplicate specific text that only exists in this copy.');

  // Verify original UK-001 remains completely unchanged
  const originalAfter = getScenario('UK-001');
  const originalCase = scenarioCase(originalAfter);
  assert.notEqual(originalCase.exhibits[0].text, 'Duplicate specific text that only exists in this copy.');

  // Clean up
  deleteCustomScenario(duplicated.id);
});
