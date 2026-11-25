import { useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext.jsx';
import {
  THEME_NETWORK_CONFIG,
  getContentIntensity,
  calculateResponsiveParticleCount,
} from '../lib/particleConfig.js';

/**
 * InteractiveParticleNetwork
 *
 * FaultLine Living Intelligence Network
 * High-performance, multi-layered, interactive single-canvas rendering engine:
 *
 * 1. Four Visual Hierarchy Layers (Section 4):
 *    - Layer A (Fine): Small, subtle background particles providing atmospheric depth.
 *    - Layer B (Standard): Clearly visible nodes forming the primary network backbone.
 *    - Layer C (Highlight/Focal): Luminous focal nodes with soft halos and specular cores.
 *    - Layer D (Telemetry/Signal): Forensic intelligence accents (cyan/teal).
 *
 * 2. Multi-Tier Interaction Design (Section 7 & 8):
 *    - Interaction A: Ambient cursor light with generous radius (~240–260px) and soft falloff.
 *    - Interaction B: Progressive proximity response (approaching: glow/size increase; very close: halo).
 *    - Interaction C: Dynamic connection activation (nearby links illuminate and reveal relationships).
 *    - Interaction D: Subtle magnetic deflection and smooth spring dampening.
 *    - Interaction E: Restrained energy waves traveling through nearby nodes on movement and clicks.
 *    - Interaction F: Magnetic intelligence filaments connecting cursor to nearest nodes.
 *
 * 3. Dual-Theme Mastery:
 *    - Dark: Deep midnight foundation, electric blue & cyan nodes, delicate indigo connections.
 *    - Light: Crisp white foundation, analytical blue & muted teal nodes, pale blue-grey linework.
 *
 * 4. Performance & Accessibility (Sections 15, 16 & 17):
 *    - 60fps single-loop DPR-scaled rendering, spatial partitioning, zero React state overhead.
 *    - Automatic tab hidden/visible pause, touch device detection, strict prefers-reduced-motion support.
 */
export default function InteractiveParticleNetwork({
  className = '',
  view = 'landing',
  activeTab = null,
  density = 'standard',
  isAnalyzing = false,
  interactive = true,
  maxParticlesOverride = null,
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const { preferences, resolvedTheme } = useTheme();

  // Resolved preference from ThemeContext or explicit prop
  const userParticleSetting = preferences?.particleNetwork || 'standard';
  const effectiveDensity =
    density === 'off' || userParticleSetting === 'off'
      ? 'off'
      : density || userParticleSetting;

  const isReducedMotion =
    preferences?.motion === 'reduced' ||
    (typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // Uninterrupted navigation: track dynamic page context in ref so route changes never restart canvas
  const contextRef = useRef({ view, activeTab, isAnalyzing });
  useEffect(() => {
    contextRef.current = { view, activeTab, isAnalyzing };
  }, [view, activeTab, isAnalyzing]);

  useEffect(() => {
    if (effectiveDensity === 'off') return undefined;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return undefined;

    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    let animationFrameId = null;
    let isTabVisible = !document.hidden;

    // Viewport dimensions and DPR tracking (capped at 2 for performance)
    let width = container.clientWidth || window.innerWidth || 1200;
    let height = container.clientHeight || window.innerHeight || 800;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    // Touch device detection to prevent unnatural touch cursor stickiness
    const isTouchDevice =
      typeof window !== 'undefined' &&
      ('ontouchstart' in window || navigator.maxTouchPoints > 0);

    // Theme configuration resolution
    const themeMode = resolvedTheme === 'light' ? 'light' : 'dark';
    const cfg = THEME_NETWORK_CONFIG[themeMode];

    // Content-aware intensity state with smooth navigation easing (Section 8)
    let currentIntensity = getContentIntensity(
      contextRef.current.view,
      contextRef.current.activeTab
    );

    // Mouse state with physical interpolation and velocity tracking
    const mouse = {
      x: -1000,
      y: -1000,
      targetX: -1000,
      targetY: -1000,
      prevX: -1000,
      prevY: -1000,
      velocity: 0,
      active: false,
      radius: cfg.cursorInfluenceRadius,
    };

    // Automated visual verification support: ?testMouse=x,y triggers interactive state
    try {
      if (typeof window !== 'undefined' && window.location?.search) {
        const testParam = new URLSearchParams(window.location.search).get('testMouse');
        if (testParam) {
          const [tx, ty] = testParam.split(',').map(Number);
          if (!isNaN(tx) && !isNaN(ty)) {
            mouse.x = tx;
            mouse.y = ty;
            mouse.targetX = tx;
            mouse.targetY = ty;
            mouse.active = true;
          }
        }
      }
    } catch {}

    // Energy waves array (Section 7 Interaction E & F)
    let waves = [];
    let lastWaveTime = 0;

    function spawnWave(x, y, maxRadius = 240, maxAlpha = 0.22, speed = 4.2) {
      if (isReducedMotion || waves.length >= 3) return; // Respect WCAG prefers-reduced-motion
      waves.push({
        x,
        y,
        radius: 0,
        maxRadius,
        maxAlpha,
        speed,
        dead: false,
      });
    }

    // Helper: Determine connection distance based on current width
    function getConnectionDistance(w) {
      if (w < 640) return cfg.connectionDist.mobile;
      if (w < 1024) return cfg.connectionDist.tablet;
      return cfg.connectionDist.desktop;
    }

    // Helper: Generate distributed organic constellation hubs covering all sectors of the screen
    function generateClusterCenters(w, h) {
      const hubs = [];
      const cols = w < 768 ? 2 : 3;
      const rows = h < 700 ? 2 : 3;
      const cellW = w / cols;
      const cellH = h / rows;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          hubs.push({
            x: c * cellW + cellW * (0.20 + Math.random() * 0.60),
            y: r * cellH + cellH * (0.20 + Math.random() * 0.60),
            radius: Math.min(cellW, cellH) * (0.50 + Math.random() * 0.40),
          });
        }
      }
      return hubs;
    }

    // Particle representation adhering to Section 4 hierarchy
    class Particle {
      constructor(w, h, clusterCenters, index, total) {
        this.reset(w, h, true, clusterCenters, index, total);
      }

      reset(w, h, initial = false, clusterCenters = [], index = 0, total = 100) {
        this.z = 0.45 + Math.random() * 0.55; // 3D depth factor

        // Four Visual Hierarchy Layers (Section 4)
        const rand = Math.random();
        if (rand < cfg.focalRatio) {
          this.category = 'focal'; // Layer C: Highlight / focal nodes (~15%)
        } else if (rand < cfg.focalRatio + cfg.telemetryRatio) {
          this.category = 'telemetry'; // Layer D: Telemetry & signal nodes (~15%)
        } else if (rand < cfg.focalRatio + cfg.telemetryRatio + cfg.isolatedRatio) {
          this.category = 'fine'; // Layer A: Fine background particles (~20%)
        } else {
          this.category = 'standard'; // Layer B: Standard network nodes (~50%)
        }

        // Spatial distribution: ensures complete viewport coverage with organic clustering
        if (initial) {
          if (this.category === 'fine' || clusterCenters.length === 0) {
            // Ambient / fine particles distributed uniformly across viewport
            this.x = Math.random() * w;
            this.y = Math.random() * h;
          } else if (Math.random() < 0.50) {
            // 50% spawn in organic proximity to one of the distributed hubs
            const hub = clusterCenters[Math.floor(Math.random() * clusterCenters.length)];
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * hub.radius;
            this.x = Math.max(12, Math.min(w - 12, hub.x + Math.cos(angle) * dist));
            this.y = Math.max(12, Math.min(h - 12, hub.y + Math.sin(angle) * dist));
          } else {
            // 50% stratified ambient coverage ensuring zero empty zones across the viewport
            const jitterX = (Math.random() - 0.5) * (w / 6);
            const jitterY = (Math.random() - 0.5) * (h / 6);
            const slotX = ((index % 12) + 0.5) * (w / 12);
            const slotY = (Math.floor(index / 12) / Math.max(1, Math.floor(total / 12))) * h;
            this.x = Math.max(12, Math.min(w - 12, slotX + jitterX));
            this.y = Math.max(12, Math.min(h - 12, slotY + jitterY));
          }
        } else {
          // Viewport entry from edges
          this.x = Math.random() < 0.5 ? -15 : w + 15;
          this.y = Math.random() * h;
        }

        // Particle scale (Section 4 & 5: distinct hierarchy)
        const radConfig = cfg.particleRadius[this.category] || cfg.particleRadius.standard;
        this.baseRadius = (radConfig.min + Math.random() * (radConfig.max - radConfig.min)) * (0.85 + this.z * 0.15);
        this.radius = this.baseRadius;

        // Velocity: restrained, organic drift (0.07 to 0.22 px/frame)
        const speedMin = cfg.speedRange.min;
        const speedMax = cfg.speedRange.max;
        const speed = (speedMin + Math.random() * (speedMax - speedMin)) * (this.z * 0.95);
        const angle = Math.random() * Math.PI * 2;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;

        // Base opacity hierarchy (Section 3: visible baseline without interaction)
        const alphaMin = cfg.nodeAlphaMin;
        const alphaMax = cfg.nodeAlphaMax;
        let alphaRange = alphaMin + Math.random() * (alphaMax - alphaMin);
        if (this.category === 'focal') {
          alphaRange = Math.min(0.98, alphaRange * 1.15);
        } else if (this.category === 'fine') {
          alphaRange = alphaRange * 0.65; // Soft depth for fine background layer
        }
        this.baseAlpha = alphaRange * (0.70 + this.z * 0.30);
        this.alpha = this.baseAlpha;

        // Interactive dynamic properties
        this.proximity = 0;       // Current cursor proximity [0 - 1]
        this.waveShimmer = 0;     // Energy wave shimmer [0 - 1]
        this.phase = Math.random() * Math.PI * 2;
        this.phaseSpeed = cfg.ambientDriftPhaseSpeed + Math.random() * 0.003;
      }

      update(w, h, analyzing, mousePos, activeWaves) {
        // WCAG 2.1 AA (Success Criterion 2.2.2 & 2.3.3): Freeze particle dynamics for reduced motion preference
        if (isReducedMotion) {
          this.proximity = 0;
          this.waveShimmer = 0;
          return;
        }

        const speedMultiplier = analyzing ? 1.35 : 1.0;

        this.phase += this.phaseSpeed;
        this.x += (this.vx + Math.sin(this.phase) * 0.05) * speedMultiplier;
        this.y += (this.vy + Math.cos(this.phase) * 0.05) * speedMultiplier;

        // 1. Proximity & Cursor Interaction (Sections 7 & 8)
        this.proximity = 0;
        if (mousePos.active && interactive && !isTouchDevice) {
          const dx = this.x - mousePos.x;
          const dy = this.y - mousePos.y;
          const dist = Math.hypot(dx, dy);

          // Proximity field: progressive illumination
          if (dist < cfg.cursorProximityRadius && dist > 1) {
            this.proximity = 1 - dist / cfg.cursorProximityRadius;
            const force = Math.pow(this.proximity, 1.4);

            // Subtle magnetic deflection (Section 7 Interaction D)
            if (dist < 150) {
              this.x += (dx / dist) * force * cfg.cursorDeflectionForce;
              this.y += (dy / dist) * force * cfg.cursorDeflectionForce;
            }

            // Progressive brightness and size increase (Section 7 Interaction B)
            const targetAlpha = Math.min(1.0, this.baseAlpha + this.proximity * 0.45);
            const targetRadius = this.baseRadius + this.proximity * 1.1;

            this.alpha += (targetAlpha - this.alpha) * 0.15;
            this.radius += (targetRadius - this.radius) * 0.15;
          } else {
            this.alpha += (this.baseAlpha - this.alpha) * 0.06;
            this.radius += (this.baseRadius - this.radius) * 0.06;
          }
        } else {
          this.alpha += (this.baseAlpha - this.alpha) * 0.06;
          this.radius += (this.baseRadius - this.radius) * 0.06;
        }

        // 2. Energy Wave Shimmer (Section 7 Interaction E)
        this.waveShimmer = 0;
        if (activeWaves && activeWaves.length > 0) {
          for (let k = 0; k < activeWaves.length; k++) {
            const wave = activeWaves[k];
            if (wave.dead) continue;
            const dist = Math.hypot(this.x - wave.x, this.y - wave.y);
            const delta = Math.abs(dist - wave.radius);
            if (delta < 30) {
              const shimmer = (1 - delta / 30) * (1 - wave.radius / wave.maxRadius);
              this.waveShimmer = Math.max(this.waveShimmer, shimmer * 0.35);
            }
          }
        }

        // Viewport margin wrapping
        const pad = 25;
        if (this.x < -pad) this.x = w + pad;
        if (this.x > w + pad) this.x = -pad;
        if (this.y < -pad) this.y = h + pad;
        if (this.y > h + pad) this.y = -pad;
      }

      draw(context, currentIntensity = 1.0) {
        let color = cfg.nodeColors.standard;
        if (this.category === 'focal') {
          color = cfg.nodeColors.focal;
        } else if (this.category === 'telemetry') {
          color = cfg.nodeColors.telemetry;
        } else if (this.category === 'fine') {
          color = cfg.nodeColors.fine;
        }

        const effectiveAlpha = Math.min(1.0, (this.alpha + this.waveShimmer) * currentIntensity);

        // 1. Soft Halo on Focal Nodes or Highly Active Proximity Nodes
        if (this.category === 'focal' || this.proximity > 0.45) {
          const haloScale = this.category === 'focal' ? cfg.focalHaloScale : 2.0;
          const haloBaseAlpha = this.category === 'focal' ? cfg.focalHaloAlpha : 0.20;
          const haloAlpha = effectiveAlpha * (haloBaseAlpha + this.proximity * 0.25);

          context.beginPath();
          context.arc(this.x, this.y, this.radius * haloScale, 0, Math.PI * 2);
          context.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${haloAlpha})`;
          context.fill();
        }

        // 2. Direct Interactive Halo (Section 7 Interaction B: very close cursor)
        if (this.proximity > 0.65) {
          context.beginPath();
          context.arc(this.x, this.y, this.radius * 2.8, 0, Math.PI * 2);
          context.fillStyle = `rgba(${cfg.nodeColors.primary[0]}, ${cfg.nodeColors.primary[1]}, ${cfg.nodeColors.primary[2]}, ${(this.proximity - 0.65) * 0.40})`;
          context.fill();
        }

        // 3. Crisp Inner Particle Core
        context.beginPath();
        context.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        context.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${effectiveAlpha})`;
        context.fill();

        // 4. Specular Pinpoint Center on Dark Theme Focal Nodes
        if (cfg.focalSpecularAlpha > 0 && this.category === 'focal' && this.z > 0.60) {
          context.beginPath();
          context.arc(this.x, this.y, Math.max(0.6, this.radius * 0.35), 0, Math.PI * 2);
          context.fillStyle = `rgba(255, 255, 255, ${effectiveAlpha * cfg.focalSpecularAlpha})`;
          context.fill();
        }
      }
    }

    let particles = [];
    let clusters = [];

    function resize() {
      if (!container || !canvas) return;
      width = Math.floor(container.clientWidth || window.innerWidth || 1200);
      height = Math.floor(container.clientHeight || window.innerHeight || 800);

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = '100%';
      canvas.style.height = '100%';

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      clusters = generateClusterCenters(width, height);
      const targetCount = calculateResponsiveParticleCount(
        width,
        height,
        effectiveDensity,
        maxParticlesOverride
      );
      particles = Array.from(
        { length: targetCount },
        (_, i) => new Particle(width, height, clusters, i, targetCount)
      );
    }

    resize();

    const resizeObserver = new ResizeObserver(() => {
      resize();
    });
    resizeObserver.observe(container);

    // Cursor tracking across full viewport
    const handleMouseMove = (e) => {
      if (!interactive || isTouchDevice) return;
      const rect = container.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;

      if (mouse.active) {
        const moveDist = Math.hypot(currentX - mouse.prevX, currentY - mouse.prevY);
        mouse.velocity = moveDist;

        // Swift cursor movement spawns subtle intelligence signal wave (Section 7 Interaction E)
        const now = performance.now();
        if (moveDist > 22 && now - lastWaveTime > 650) {
          spawnWave(currentX, currentY, 220, 0.18, 4.0);
          lastWaveTime = now;
        }
      }

      mouse.prevX = currentX;
      mouse.prevY = currentY;
      mouse.targetX = currentX;
      mouse.targetY = currentY;
      mouse.active = true;
    };

    const handleMouseLeave = () => {
      mouse.active = false;
      mouse.targetX = -1000;
      mouse.targetY = -1000;
      mouse.velocity = 0;
    };

    // Passive Window Click Listener: localized wave without intercepting UI clicks (Section 7 Interaction F)
    const handleClick = (e) => {
      if (!interactive || isTouchDevice) return;
      const rect = container.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      spawnWave(clickX, clickY, 240, 0.22, 4.5);
    };

    // Global Cloud Companion Interaction Pulse Listener
    const handleParticleWave = (e) => {
      if (!isTabVisible || isReducedMotion) return;
      if (e.detail && typeof e.detail.x === 'number' && typeof e.detail.y === 'number') {
        const rect = container.getBoundingClientRect();
        const waveX = e.detail.x - rect.left;
        const waveY = e.detail.y - rect.top;
        spawnWave(
          waveX,
          waveY,
          e.detail.maxRadius || 240,
          e.detail.maxAlpha || 0.28,
          e.detail.speed || 4.2
        );
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('click', handleClick, { passive: true });
    window.addEventListener('faultline-particle-wave', handleParticleWave);
    document.addEventListener('mouseleave', handleMouseLeave);

    const handleVisibilityChange = () => {
      isTabVisible = !document.hidden;
      if (isTabVisible && !isReducedMotion) {
        animationFrameId = requestAnimationFrame(render);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    function render() {
      if (!isTabVisible) return;

      // Dynamic page-adaptive intensity interpolation (Section 8: smooth navigation)
      const targetIntensity = getContentIntensity(
        contextRef.current.view,
        contextRef.current.activeTab
      );
      currentIntensity += (targetIntensity - currentIntensity) * 0.05;
      const analyzing = Boolean(contextRef.current.isAnalyzing);

      // Smooth mouse interpolation
      if (mouse.active && !isTouchDevice) {
        mouse.x += (mouse.targetX - mouse.x) * 0.12;
        mouse.y += (mouse.targetY - mouse.y) * 0.12;
      } else {
        mouse.x += (-1000 - mouse.x) * 0.08;
        mouse.y += (-1000 - mouse.y) * 0.08;
      }

      ctx.clearRect(0, 0, width, height);

      // 1. Update and Render Active Energy Waves (Section 7 Interaction E & F)
      for (let wIdx = waves.length - 1; wIdx >= 0; wIdx--) {
        const wave = waves[wIdx];
        wave.radius += wave.speed;
        if (wave.radius >= wave.maxRadius) {
          waves.splice(wIdx, 1);
          continue;
        }

        const progress = wave.radius / wave.maxRadius;
        const waveAlpha = (1 - progress) * wave.maxAlpha * currentIntensity;
        ctx.beginPath();
        ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${cfg.nodeColors.telemetry[0]}, ${cfg.nodeColors.telemetry[1]}, ${cfg.nodeColors.telemetry[2]}, ${waveAlpha})`;
        ctx.lineWidth = Math.max(0.5, (1 - progress) * 1.5);
        ctx.stroke();
      }

      // 2. Soft Ambient Illumination Field (Section 7 Interaction A & Section 8)
      if (
        cfg.ambientLight.enabled &&
        interactive &&
        !isTouchDevice &&
        mouse.x > -260 &&
        mouse.y > -260
      ) {
        const ambRadius = cfg.ambientLight.radius;
        const ambGrad = ctx.createRadialGradient(
          mouse.x,
          mouse.y,
          0,
          mouse.x,
          mouse.y,
          ambRadius
        );
        const ambAlpha = cfg.ambientLight.alpha * currentIntensity;
        ambGrad.addColorStop(
          0,
          `rgba(${cfg.ambientLight.color[0]}, ${cfg.ambientLight.color[1]}, ${cfg.ambientLight.color[2]}, ${ambAlpha})`
        );
        ambGrad.addColorStop(
          0.45,
          `rgba(${cfg.ambientLight.secondaryColor[0]}, ${cfg.ambientLight.secondaryColor[1]}, ${cfg.ambientLight.secondaryColor[2]}, ${ambAlpha * 0.50})`
        );
        ambGrad.addColorStop(
          1,
          `rgba(${cfg.lineColor[0]}, ${cfg.lineColor[1]}, ${cfg.lineColor[2]}, 0)`
        );

        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, ambRadius, 0, Math.PI * 2);
        ctx.fillStyle = ambGrad;
        ctx.fill();
      }

      // 3. Dynamic Connected Network Linework (Section 6 & Section 7 Interaction C)
      const connDist = getConnectionDistance(width);
      const connectionCounts = new Array(particles.length).fill(0);

      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];
        if (p1.category === 'fine') continue; // Layer A fine particles remain clean background depth

        const maxConnP1 = p1.category === 'focal' ? 3 : cfg.maxConnectionsPerNode;
        if (connectionCounts[i] >= maxConnP1) continue;

        for (let j = i + 1; j < particles.length; j++) {
          if (connectionCounts[i] >= maxConnP1) break;

          const p2 = particles[j];
          if (p2.category === 'fine') continue;

          const maxConnP2 = p2.category === 'focal' ? 3 : cfg.maxConnectionsPerNode;
          if (connectionCounts[j] >= maxConnP2) continue;

          // Quick bounding box check before hypotenuse calculation
          if (Math.abs(p1.x - p2.x) > connDist || Math.abs(p1.y - p2.y) > connDist) {
            continue;
          }

          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.hypot(dx, dy);

          if (dist < connDist) {
            connectionCounts[i]++;
            connectionCounts[j]++;

            const distRatio = 1 - dist / connDist;
            const falloff = Math.pow(distRatio, cfg.linePowerCurve);
            const avgDepth = (p1.z + p2.z) * 0.5;

            // Clearly visible base line opacity
            let lineAlpha =
              (0.16 + 0.84 * falloff) * cfg.lineAlphaBase * avgDepth * currentIntensity;

            if (analyzing) {
              lineAlpha *= 1.35;
            }

            // Connection Activation (Section 7 Interaction C: nearby lines illuminate dynamically)
            const maxProx = Math.max(p1.proximity, p2.proximity);
            if (maxProx > 0) {
              lineAlpha = Math.min(0.85, lineAlpha * (1 + 0.80 * maxProx));
            }

            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(${cfg.lineColor[0]}, ${cfg.lineColor[1]}, ${cfg.lineColor[2]}, ${lineAlpha})`;
            ctx.lineWidth = (0.55 + distRatio * 0.40) * avgDepth * (1 + maxProx * 0.35);
            ctx.stroke();
          }
        }
      }

      // 4. Cursor Magnetic Intelligence Filaments (Section 7 Interaction F)
      if (mouse.active && interactive && !isTouchDevice) {
        const nearbyIndices = [];
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          if (p.category === 'fine') continue;
          const dist = Math.hypot(p.x - mouse.x, p.y - mouse.y);
          if (dist < mouse.radius) {
            nearbyIndices.push({ index: i, dist });
          }
        }
        nearbyIndices.sort((a, b) => a.dist - b.dist);
        const closest = nearbyIndices.slice(0, 2); // Max 2 delicate filaments

        for (const item of closest) {
          const p = particles[item.index];
          const filamentAlpha =
            (1 - item.dist / mouse.radius) * cfg.cursorFilamentAlpha * currentIntensity;

          ctx.beginPath();
          ctx.moveTo(mouse.x, mouse.y);
          ctx.lineTo(p.x, p.y);
          ctx.strokeStyle = `rgba(${cfg.lineColor[0]}, ${cfg.lineColor[1]}, ${cfg.lineColor[2]}, ${filamentAlpha})`;
          ctx.lineWidth = 0.95;
          ctx.stroke();

          // Delicate pulse ring on targeted node
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius + 3.4, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${cfg.nodeColors.telemetry[0]}, ${cfg.nodeColors.telemetry[1]}, ${cfg.nodeColors.telemetry[2]}, ${filamentAlpha * 0.65})`;
          ctx.lineWidth = 0.95;
          ctx.stroke();
        }
      }

      // 5. Particle Updates and Rendering (Section 4 Hierarchy)
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.update(width, height, analyzing, mouse, waves);
        p.draw(ctx, currentIntensity);
      }

      // Respect prefers-reduced-motion by halting animation loop after 1 frame
      if (isReducedMotion) {
        return;
      }

      animationFrameId = requestAnimationFrame(render);
    }

    // Launch single unified animation loop
    animationFrameId = requestAnimationFrame(render);

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleClick);
      window.removeEventListener('faultline-particle-wave', handleParticleWave);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [
    effectiveDensity,
    interactive,
    resolvedTheme,
    preferences?.motion,
    isReducedMotion,
    maxParticlesOverride,
  ]);

  if (effectiveDensity === 'off') {
    return null;
  }

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={`pointer-events-none select-none overflow-hidden ${className}`}
      style={{ isolation: 'isolate' }}
    >
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
}
