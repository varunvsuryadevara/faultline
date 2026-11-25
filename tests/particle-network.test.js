import test from 'node:test';
import assert from 'node:assert/strict';
import {
  THEME_NETWORK_CONFIG,
  getContentIntensity,
  calculateResponsiveParticleCount,
} from '../src/lib/particleConfig.js';

test('Living Intelligence Network - Theme Configuration', async (t) => {
  await t.test('Dark Theme (Midnight Intelligence Network) specifications', () => {
    const dark = THEME_NETWORK_CONFIG.dark;
    assert.equal(dark.id, 'dark');
    assert.equal(dark.name, 'Midnight Intelligence Network');

    // Node colors: fine, standard, primary, focal, telemetry, isolated
    assert.deepEqual(dark.nodeColors.fine, [100, 116, 139]);
    assert.deepEqual(dark.nodeColors.standard, [148, 163, 184]);
    assert.deepEqual(dark.nodeColors.primary, [129, 140, 248]);
    assert.deepEqual(dark.nodeColors.focal, [165, 180, 252]);
    assert.deepEqual(dark.nodeColors.telemetry, [34, 211, 238]);
    assert.deepEqual(dark.nodeColors.isolated, [100, 116, 139]);

    // Line color and calibrated opacity for desktop visibility
    assert.deepEqual(dark.lineColor, [99, 102, 241]);
    assert.equal(dark.lineAlphaBase, 0.48);
    assert.equal(dark.maxConnectionsPerNode, 2);

    // Focal node properties
    assert.equal(dark.focalRatio, 0.15);
    assert.equal(dark.focalHaloAlpha, 0.28);
    assert.equal(dark.focalSpecularAlpha, 0.80);

    // Ambient light field
    assert.equal(dark.ambientLight.enabled, true);
    assert.deepEqual(dark.ambientLight.color, [79, 107, 255]);
    assert.equal(dark.ambientLight.alpha, 0.11);
  });

  await t.test('Light Theme (Forensic Intelligence Network) specifications', () => {
    const light = THEME_NETWORK_CONFIG.light;
    assert.equal(light.id, 'light');
    assert.equal(light.name, 'Forensic Intelligence Network');

    // Section 10 Node colors: medium blue, muted blue, accent focal blue, muted teal
    assert.deepEqual(light.nodeColors.standard, [93, 145, 200]);   // #5D91C8
    assert.deepEqual(light.nodeColors.primary, [111, 159, 208]);  // #6F9FD0
    assert.deepEqual(light.nodeColors.focal, [57, 124, 184]);     // #397CB8
    assert.deepEqual(light.nodeColors.telemetry, [98, 182, 176]); // #62B6B0
    assert.deepEqual(light.nodeColors.cyan, [101, 185, 213]);      // #65B9D5

    // Line color and visible opacity
    assert.deepEqual(light.lineColor, [116, 158, 200]);           // #749EC8
    assert.equal(light.lineAlphaBase, 0.44);
    assert.equal(light.maxConnectionsPerNode, 2);

    // Focal node properties
    assert.equal(light.focalRatio, 0.15);
    assert.equal(light.focalHaloAlpha, 0.22);
    assert.equal(light.focalSpecularAlpha, 0);

    // Ambient light field
    assert.equal(light.ambientLight.enabled, true);
    assert.deepEqual(light.ambientLight.color, [186, 215, 250]);
    assert.equal(light.ambientLight.alpha, 0.085);
  });

  await t.test('Color channels are valid 8-bit integers [0-255]', () => {
    for (const theme of ['dark', 'light']) {
      const cfg = THEME_NETWORK_CONFIG[theme];
      for (const [key, rgb] of Object.entries(cfg.nodeColors)) {
        assert.equal(rgb.length, 3, `${theme}.${key} has 3 channels`);
        for (const c of rgb) {
          assert.ok(c >= 0 && c <= 255, `${theme}.${key} channel ${c} in valid range`);
        }
      }
      for (const c of cfg.lineColor) {
        assert.ok(c >= 0 && c <= 255, `${theme}.lineColor channel ${c} in valid range`);
      }
      for (const c of cfg.ambientLight.color) {
        assert.ok(c >= 0 && c <= 255, `${theme}.ambientLight channel ${c} in valid range`);
      }
    }
  });
});

test('Living Intelligence Network - Content-Aware Intensity (Section 13)', async (t) => {
  await t.test('Overview and AI Chatbot maintain full atmospheric presence', () => {
    assert.equal(getContentIntensity('landing', null), 1.0);
    assert.equal(getContentIntensity('intelligence', null), 0.92);
    assert.equal(getContentIntensity('chat', null), 0.92);
  });

  await t.test('Scenario Library maintains rich populated network surrounding cards', () => {
    assert.equal(getContentIntensity('library', null), 0.85);
    assert.equal(getContentIntensity('scenario', null), 0.85);
  });

  await t.test('Investigation Workspace preserves network without interfering with analysis', () => {
    assert.equal(getContentIntensity('workspace', null), 0.80);
    assert.equal(getContentIntensity('workspace', 'conflicts'), 0.80);
    assert.equal(getContentIntensity('workspace', 'agreed'), 0.80);
    assert.equal(getContentIntensity('workspace', 'findings'), 0.78);
    assert.equal(getContentIntensity('workspace', 'timeline'), 0.78);
  });

  await t.test('Evidence Viewer, Final Decision, and Legal Library remain clearly visible', () => {
    assert.equal(getContentIntensity('workspace', 'evidence'), 0.70);
    assert.equal(getContentIntensity('workspace', 'decision'), 0.74);
    assert.equal(getContentIntensity('legal-library', null), 0.75);
    assert.equal(getContentIntensity('regulations', null), 0.75);
  });
});

test('Living Intelligence Network - Responsive Particle Count (Section 3 & 5)', async (t) => {
  await t.test('Mobile screens (<640px) use restrained particle count (50-75)', () => {
    const mobileCount = calculateResponsiveParticleCount(390, 844, 'standard');
    assert.ok(mobileCount >= 50 && mobileCount <= 75, `Mobile count was ${mobileCount}`);
  });

  await t.test('Tablet screens (640-1024px) scale appropriately (100-150)', () => {
    const tabletCount = calculateResponsiveParticleCount(768, 1024, 'standard');
    assert.ok(tabletCount >= 100 && tabletCount <= 150, `Tablet count was ${tabletCount}`);
  });

  await t.test('Laptop screens (1024-1440px) provide rich density (160-210)', () => {
    const laptopCount = calculateResponsiveParticleCount(1280, 800, 'standard');
    assert.ok(laptopCount >= 160 && laptopCount <= 210, `Laptop count was ${laptopCount}`);
  });

  await t.test('Desktop screens (>1440px) provide full network (200-275)', () => {
    const desktopCount = calculateResponsiveParticleCount(1920, 1080, 'standard');
    assert.ok(desktopCount >= 200 && desktopCount <= 275, `Desktop count was ${desktopCount}`);
  });

  await t.test('Density preference scales particle count', () => {
    const minimal = calculateResponsiveParticleCount(1920, 1080, 'minimal');
    const subtle = calculateResponsiveParticleCount(1920, 1080, 'subtle');
    const standard = calculateResponsiveParticleCount(1920, 1080, 'standard');

    assert.ok(minimal <= subtle, `minimal (${minimal}) <= subtle (${subtle})`);
    assert.ok(subtle <= standard, `subtle (${subtle}) <= standard (${standard})`);
  });

  await t.test('Explicit particle count override is respected', () => {
    const overridden = calculateResponsiveParticleCount(1920, 1080, 'standard', 42);
    assert.equal(overridden, 42);
  });
});
