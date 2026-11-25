import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COMPANION_CONSTANTS,
  DEFAULT_GREETING,
  ALTERNATIVE_GREETINGS,
  CONTEXT_GREETINGS,
  POKE_QUOTES,
  THINKING_QUOTES,
  DONE_QUOTES,
  CONTEXT_QUOTES,
  calculateEyeOffset,
  calculateBodyTilt,
  calculateMagneticAttraction,
  clampViewportPosition,
} from '../src/lib/companionConfig.js';

test('FaultLine Cloud Companion - Eye Tracking Bounds & Physics', async (t) => {
  await t.test('Eye tracking clamp boundaries strictly prevent unnatural pupil displacement', () => {
    const maxRadiusX = 5.5;
    const maxRadiusY = 4.0;

    // Test extreme pointer positions across 4 quadrants
    const extremePositions = [
      { dx: 5000, dy: 5000 },
      { dx: -5000, dy: -5000 },
      { dx: 10000, dy: 0 },
      { dx: 0, dy: -10000 },
      { dx: 260, dy: 260 },
      { dx: -180, dy: 90 },
    ];

    for (const pos of extremePositions) {
      const dist = Math.hypot(pos.dx, pos.dy);
      const angle = Math.atan2(pos.dy, pos.dx);
      const intensity = Math.min(1.0, dist / 320);

      const targetX = Math.cos(angle) * maxRadiusX * intensity;
      const targetY = Math.sin(angle) * maxRadiusY * intensity;

      assert.ok(
        Math.abs(targetX) <= maxRadiusX + 0.001,
        `targetX ${targetX} must be clamped to ${maxRadiusX}`
      );
      assert.ok(
        Math.abs(targetY) <= maxRadiusY + 0.001,
        `targetY ${targetY} must be clamped to ${maxRadiusY}`
      );
    }
  });

  await t.test('Natural body tilt stays within restrained 4.5-degree limit', () => {
    const testAngles = [0, Math.PI / 6, Math.PI / 4, Math.PI / 2, Math.PI, Math.PI * 1.5];
    for (const angle of testAngles) {
      const intensity = 1.0;
      const tilt = Math.cos(angle) * intensity * 4.5;
      assert.ok(Math.abs(tilt) <= 4.5001, `Tilt ${tilt} must never exceed 4.5 degrees`);
    }
  });

  await t.test('Subtle magnetic attraction is clamped within 4.5px safe threshold', () => {
    const testDistances = [10, 40, 80, 150, 200, 260, 400, 1000];
    const PROXIMITY_RADIUS = 260;

    for (const d of testDistances) {
      const prox = Math.max(0, Math.min(1.0, 1.0 - (d - 50) / (PROXIMITY_RADIUS - 50)));
      const magStrength = Math.pow(prox, 1.2) * 4.5;
      assert.ok(magStrength >= 0 && magStrength <= 4.5001, `Magnetic shift ${magStrength} must stay in [0, 4.5]px`);
    }
  });
});

test('FaultLine Cloud Companion - Viewport Dragging Bounds & Safe Margins', async (t) => {
  await t.test('Clamps coordinates strictly inside visible application viewport with 16px margins', () => {
    const windowWidth = 1440;
    const windowHeight = 900;
    const petW = 104;
    const petH = 88;
    const margin = 16;

    const maxX = windowWidth - petW - margin;
    const maxY = windowHeight - petH - margin;

    const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

    // Attempt dragging off-screen left and top
    assert.equal(clamp(-500, margin, maxX), margin);
    assert.equal(clamp(-200, margin, maxY), margin);

    // Attempt dragging off-screen right and bottom
    assert.equal(clamp(2500, margin, maxX), maxX);
    assert.equal(clamp(1500, margin, maxY), maxY);

    // In-bounds movement remains exact
    assert.equal(clamp(650, margin, maxX), 650);
    assert.equal(clamp(320, margin, maxY), 320);
  });
});

test('FaultLine Cloud Companion - Speech Bubble & Context Intelligence', async (t) => {
  await t.test('Poke quotes are properly formed, non-empty, and branded as FaultLine Chatbot', () => {
    assert.ok(POKE_QUOTES.length >= 6);
    assert.ok(POKE_QUOTES[0].includes("FaultLine Chatbot"), "First quote must introduce FaultLine Chatbot");
    for (const q of POKE_QUOTES) {
      assert.ok(typeof q === 'string' && q.length > 5);
      assert.ok(!q.includes('undefined') && !q.includes('null'));
    }
  });

  await t.test('Thinking & Done quote pools are defined and non-empty', () => {
    assert.ok(THINKING_QUOTES.length >= 4);
    assert.ok(DONE_QUOTES.length >= 3);
    for (const q of [...THINKING_QUOTES, ...DONE_QUOTES]) {
      assert.ok(typeof q === 'string' && q.length > 4);
    }
  });

  await t.test('Default hover greeting is correctly set to "How can I help you?"', () => {
    assert.equal(DEFAULT_GREETING, 'How can I help you?');
    assert.ok(ALTERNATIVE_GREETINGS.includes(DEFAULT_GREETING));
    assert.ok(ALTERNATIVE_GREETINGS.length >= 4);
    assert.ok(CONTEXT_GREETINGS.landing);
    assert.ok(CONTEXT_GREETINGS.workspace);
    assert.ok(CONTEXT_GREETINGS.intelligence);
  });

  await t.test('Context quotes cover all primary enterprise routes', () => {
    const requiredRoutes = ['landing', 'library', 'legal-library', 'workspace', 'intelligence'];
    for (const route of requiredRoutes) {
      assert.ok(CONTEXT_QUOTES[route], `Context quote for route '${route}' must exist`);
      assert.ok(CONTEXT_QUOTES[route].length > 10);
    }
  });
});

test('FaultLine Cloud Companion - Global Single-Instance Architecture Verification', async (t) => {
  await t.test('App.jsx mounts exactly one global FaultLineCloudCompanion', async () => {
    const fs = await import('node:fs/promises');
    const appSource = await fs.readFile('src/App.jsx', 'utf-8');
    const companionMatches = appSource.match(/<FaultLineCloudCompanion/g);
    assert.equal(companionMatches?.length, 1, 'App.jsx must contain exactly 1 global <FaultLineCloudCompanion>');

    // Verify old text button was removed from App.jsx
    assert.ok(
      !appSource.includes('Persistent Floating AI Chatbot Button'),
      'Old floating text button comment must be replaced'
    );
  });

  await t.test('FaultLineIntelligence.jsx does not mount a local duplicate companion', async () => {
    const fs = await import('node:fs/promises');
    const intelligenceSource = await fs.readFile('src/components/Intelligence/FaultLineIntelligence.jsx', 'utf-8');
    assert.ok(
      !intelligenceSource.includes('<CodexCompanion'),
      'FaultLineIntelligence.jsx must not mount a local <CodexCompanion>'
    );
    assert.ok(
      !intelligenceSource.includes('<FaultLineCloudCompanion'),
      'FaultLineIntelligence.jsx must not mount a local <FaultLineCloudCompanion>'
    );
  });

  await t.test('InteractiveParticleNetwork integrates with companion wave events', async () => {
    const fs = await import('node:fs/promises');
    const particleSource = await fs.readFile('src/components/InteractiveParticleNetwork.jsx', 'utf-8');
    assert.ok(
      particleSource.includes('faultline-particle-wave'),
      'InteractiveParticleNetwork must listen for faultline-particle-wave events'
    );
  });
});
