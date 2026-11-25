/**
 * FaultLine Living Intelligence Network - Dual-Theme & Spatial Configuration
 *
 * Defines the comprehensive visual and physics configuration for FaultLine's
 * interactive living intelligence network:
 * - Reference A (Dark): "Midnight Intelligence Network"
 *   Deep midnight foundation, luminous electric blue & cyan nodes, delicate indigo connections,
 *   rich ambient blue cursor illumination, progressive proximity activation, and energy waves.
 * - Reference B (Light): "Forensic Intelligence Network"
 *   Clean white foundation, analytical blue and muted teal nodes (using Section 10 palette),
 *   pale blue-grey connections, soft pale-blue ambient illumination, crisp optical contrast.
 */

export const THEME_NETWORK_CONFIG = {
  dark: {
    id: 'dark',
    name: 'Midnight Intelligence Network',
    // 4-layer node color hierarchy (Section 4 & Section 9)
    nodeColors: {
      fine: [100, 116, 139],       // Layer A: Fine background particles (slate-500)
      standard: [148, 163, 184],   // Layer B: Standard network nodes (slate-400)
      primary: [129, 140, 248],    // Soft electric blue (indigo-400)
      focal: [165, 180, 252],      // Layer C: Highlight focal nodes (indigo-300)
      telemetry: [34, 211, 238],   // Layer D: Telemetry & signal nodes (cyan-400)
      isolated: [100, 116, 139],   // Distant solitary nodes
    },
    lineColor: [99, 102, 241],     // Electric indigo connection filaments (indigo-500)
    lineAlphaBase: 0.48,           // Clearly visible, refined baseline connections
    linePowerCurve: 1.12,          // Gentle falloff curve preserving mid-distance connections
    nodeAlphaMin: 0.65,            // Populated baseline visibility without cursor light
    nodeAlphaMax: 0.94,
    focalRatio: 0.15,              // ~15% highlight focal nodes
    telemetryRatio: 0.15,          // ~15% cyan telemetry nodes
    isolatedRatio: 0.20,           // ~20% fine background depth particles (Layer A)
    focalHaloAlpha: 0.28,
    focalHaloScale: 2.4,
    focalSpecularAlpha: 0.80,      // Specular pinpoint center for luminous depth
    ambientLight: {
      enabled: true,
      color: [79, 107, 255],       // Luminous electric blue
      secondaryColor: [34, 211, 238], // Ambient cyan aura
      radius: 260,                 // Generous ambient radius (~260px)
      alpha: 0.11,                 // Noticeable, refined ambient illumination
    },
    particleRadius: {
      fine: { min: 0.9, max: 1.4 },
      standard: { min: 1.6, max: 2.4 },
      focal: { min: 2.6, max: 3.6 },
      telemetry: { min: 1.8, max: 2.6 },
    },
    speedRange: { min: 0.08, max: 0.22 },
    connectionDist: { desktop: 162, tablet: 135, mobile: 110 },
    maxConnectionsPerNode: 2,      // Standard nodes max 2; focal nodes up to 3
    cursorInfluenceRadius: 200,    // Outer influence field
    cursorProximityRadius: 160,    // Proximity activation field
    cursorDirectRadius: 65,        // Direct halo & highlight field
    cursorDeflectionForce: 0.45,   // Gentle magnetic displacement
    cursorFilamentAlpha: 0.50,     // Magnetic filament opacity
    ambientDriftPhaseSpeed: 0.004,
  },
  light: {
    id: 'light',
    name: 'Forensic Intelligence Network',
    // 4-layer node color hierarchy (Section 4 & Section 10 palette)
    nodeColors: {
      fine: [148, 163, 184],       // Layer A: Fine background particles (#94A3B8)
      standard: [93, 145, 200],    // Layer B: Standard network nodes (#5D91C8 medium blue)
      primary: [111, 159, 208],    // Muted blue (#6F9FD0)
      focal: [57, 124, 184],       // Layer C: Highlight focal nodes (#397CB8 accent blue)
      telemetry: [98, 182, 176],   // Layer D: Telemetry nodes (#62B6B0 muted teal)
      cyan: [101, 185, 213],       // Cyan accent (#65B9D5)
      isolated: [148, 163, 184],
    },
    lineColor: [116, 158, 200],    // Blue-grey connection lines (#749EC8)
    lineAlphaBase: 0.44,           // Clearly visible on white foundation without looking dirty
    linePowerCurve: 1.15,
    nodeAlphaMin: 0.60,            // Strong baseline contrast against white
    nodeAlphaMax: 0.88,
    focalRatio: 0.15,              // ~15% highlight nodes
    telemetryRatio: 0.15,          // ~15% muted teal telemetry nodes
    isolatedRatio: 0.20,           // ~20% fine background particles (Layer A)
    focalHaloAlpha: 0.22,
    focalHaloScale: 2.2,
    focalSpecularAlpha: 0,         // No white glare on white foundation
    ambientLight: {
      enabled: true,
      color: [186, 215, 250],      // Soft pale analytical blue
      secondaryColor: [204, 251, 241], // Pale cyan-teal glow
      radius: 240,
      alpha: 0.085,                // Clearly visible ambient light field
    },
    particleRadius: {
      fine: { min: 0.8, max: 1.3 },
      standard: { min: 1.5, max: 2.2 },
      focal: { min: 2.5, max: 3.4 },
      telemetry: { min: 1.7, max: 2.4 },
    },
    speedRange: { min: 0.07, max: 0.18 },
    connectionDist: { desktop: 154, tablet: 130, mobile: 105 },
    maxConnectionsPerNode: 2,      // Standard nodes max 2; focal nodes up to 3
    cursorInfluenceRadius: 185,
    cursorProximityRadius: 150,
    cursorDirectRadius: 60,
    cursorDeflectionForce: 0.38,
    cursorFilamentAlpha: 0.42,
    ambientDriftPhaseSpeed: 0.003,
  },
};

/**
 * Calculates content-aware intensity according to Section 13 of the brief.
 * Protects text readability on content-heavy pages without reducing particle
 * density to zero or causing the background to disappear.
 *
 * @param {string} view - Active top-level route
 * @param {string|null} activeTab - Active subtab in workspace
 * @returns {number} Intensity multiplier between 0.70 and 1.0
 */
export function getContentIntensity(view, activeTab) {
  // Investigation Workspace: protect evidentiary tables while preserving living network
  if (view === 'workspace') {
    if (activeTab === 'evidence') return 0.70; // Evidence viewer: subtle, non-interfering
    if (activeTab === 'decision') return 0.74; // Final claim decision: focused reading
    if (activeTab === 'timeline') return 0.78; // Timeline: rich network backdrop
    if (activeTab === 'findings') return 0.78; // Findings: clean atmospheric presence
    if (activeTab === 'conflicts' || activeTab === 'agreed') return 0.80; // Cross-examination
    return 0.80;
  }

  // Legal & Regulatory Library: clear, visible, non-distracting
  if (view === 'legal-library' || view === 'regulations') {
    return 0.75;
  }

  // Scenario Library: populated network surrounding and between cards
  if (view === 'library' || view === 'scenario') {
    return 0.85;
  }

  // FaultLine Intelligence (AI Chatbot): atmospheric intelligence presence
  if (view === 'intelligence' || view === 'chat') {
    return 0.92;
  }

  // Dashboard / Landing: richest presentation
  if (view === 'landing') {
    return 1.0;
  }

  // Fallback for custom views
  return 0.82;
}

/**
 * Viewport-aware responsive particle count adhering to Sections 3 & 5.
 * Uses area-based scaling (5,600 px² / particle) with responsive clamps
 * to ensure a rich, populated intelligence network across all device sizes.
 *
 * @param {number} width - Viewport width
 * @param {number} height - Viewport height
 * @param {string} densitySetting - 'minimal' | 'subtle' | 'standard'
 * @param {number|null} override - Explicit override
 * @returns {number} Optimal particle count
 */
export function calculateResponsiveParticleCount(width, height, densitySetting = 'standard', override = null) {
  if (override && typeof override === 'number') return override;

  const area = width * height;
  // Area scaling: 5,600 square pixels per particle
  let baseCount = Math.floor(area / 5600);

  if (densitySetting === 'minimal') baseCount = Math.floor(baseCount * 0.65);
  else if (densitySetting === 'subtle') baseCount = Math.floor(baseCount * 0.90);
  else if (densitySetting === 'standard') baseCount = Math.floor(baseCount * 1.15);

  // Responsive device clamps:
  // Mobile (<640px): 50 to 75 particles
  // Tablet (640-1024px): 100 to 150 particles
  // Laptop (1024-1440px): 160 to 210 particles
  // Desktop (>1440px): 200 to 275 particles
  let min = 200;
  let max = 275;

  if (width < 640) {
    min = 50;
    max = 75;
  } else if (width < 1024) {
    min = 100;
    max = 150;
  } else if (width < 1440) {
    min = 160;
    max = 210;
  }

  return Math.max(min, Math.min(max, baseCount));
}
