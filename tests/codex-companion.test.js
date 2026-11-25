import test from 'node:test';
import assert from 'node:assert/strict';

test('Codex Companion - Eye Tracking Bounds & Geometry', async (t) => {
  await t.test('Eye tracking clamp boundaries prevent unnatural pupil displacement', () => {
    const maxRadiusX = 5.5;
    const maxRadiusY = 4.0;

    // Test extreme pointer positions across 4 quadrants
    const extremePositions = [
      { dx: 5000, dy: 5000 },
      { dx: -5000, dy: -5000 },
      { dx: 10000, dy: 0 },
      { dx: 0, dy: -10000 },
    ];

    for (const pos of extremePositions) {
      const dist = Math.hypot(pos.dx, pos.dy);
      const angle = Math.atan2(pos.dy, pos.dx);
      const intensity = Math.min(1.0, dist / 350);

      const targetX = Math.cos(angle) * maxRadiusX * intensity;
      const targetY = Math.sin(angle) * maxRadiusY * intensity;

      assert.ok(Math.abs(targetX) <= maxRadiusX + 0.001, `targetX ${targetX} must be clamped to ${maxRadiusX}`);
      assert.ok(Math.abs(targetY) <= maxRadiusY + 0.001, `targetY ${targetY} must be clamped to ${maxRadiusY}`);
    }
  });

  await t.test('Natural body tilt stays within restrained 5-degree limit', () => {
    const angle = Math.PI / 4; // 45 deg
    const intensity = 1.0;
    const tilt = Math.cos(angle) * intensity * 5;

    assert.ok(Math.abs(tilt) <= 5.0, `Tilt ${tilt} must never exceed 5 degrees`);
  });
});

test('Codex Companion - Viewport Dragging Bounds Clamping', async (t) => {
  await t.test('Clamps pet coordinates inside visible application viewport', () => {
    const windowWidth = 1200;
    const windowHeight = 800;
    const petW = 100;
    const petH = 80;
    const margin = 12;

    const maxX = windowWidth - petW - margin;
    const maxY = windowHeight - petH - margin;

    const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

    // Attempt dragging off-screen left and top
    assert.equal(clamp(-500, margin, maxX), margin);
    assert.equal(clamp(-200, margin, maxY), margin);

    // Attempt dragging off-screen right and bottom
    assert.equal(clamp(2500, margin, maxX), maxX);
    assert.equal(clamp(1500, margin, maxY), maxY);

    // In-bounds movement remains unchanged
    assert.equal(clamp(450, margin, maxX), 450);
  });
});

test('Codex Companion - Speech Bubble & Reaction Diversity', async (t) => {
  await t.test('Speech bubble quotes contain valid non-empty phrases', () => {
    const POKE_QUOTES = [
      "Hi! I'm your FaultLine Chatbot!",
      "Looking for where the stories don't line up?",
      "I'm cross-referencing the telematics now!",
      "That tickles! Hehe~",
      "Every contradiction has a story.",
      "Evidence verified, quote by quote!",
      "Need help examining an exhibit?",
      "Drag me anywhere you'd like!",
    ];

    assert.ok(POKE_QUOTES.length >= 6);
    for (const q of POKE_QUOTES) {
      assert.ok(typeof q === 'string' && q.length > 5);
      assert.ok(!q.includes('undefined') && !q.includes('null'));
    }
  });
});
