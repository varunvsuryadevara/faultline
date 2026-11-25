import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Sparkles } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext.jsx';
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
} from '../../lib/companionConfig.js';

export {
  COMPANION_CONSTANTS,
  DEFAULT_GREETING,
  ALTERNATIVE_GREETINGS,
  CONTEXT_GREETINGS,
  POKE_QUOTES,
  THINKING_QUOTES,
  DONE_QUOTES,
  CONTEXT_QUOTES,
};

export function ChatbotSparkleIcon({ className = 'size-3.5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M12 2C12.3 6.5 15.5 9.7 20 10C15.5 10.3 12.3 13.5 12 18C11.7 13.5 8.5 10.3 4 10C8.5 9.7 11.7 6.5 12 2Z" />
      <circle cx="5" cy="18" r="1.8" />
      <path d="M19 2.5C19.2 3.8 20.2 4.8 21.5 5C20.2 5.2 19.2 6.2 19 7.5C18.8 6.2 17.8 5.2 16.5 5C17.8 4.8 18.8 3.8 19 2.5Z" />
    </svg>
  );
}

export function FaultLineCompanionIcon({ className = 'size-5' }) {
  return (
    <svg viewBox="0 0 120 75" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="flMiniCloudGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#93C5FD" />
          <stop offset="50%" stopColor="#60A5FA" />
          <stop offset="100%" stopColor="#3B82F6" />
        </linearGradient>
      </defs>
      <path
        d="M 28 62 H 92 C 103 62 112 53 112 42 C 112 32 104 24 94 23 C 92 12 82 4 70 4 C 60 4 51 10 47 19 C 43 17 38 16 34 16 C 22 16 12 26 12 38 C 12 51 20 62 28 62 Z"
        fill="url(#flMiniCloudGrad)"
        stroke="#2563EB"
        strokeWidth="2.5"
      />
      <circle cx="52" cy="38" r="4" fill="#0F172A" />
      <circle cx="53" cy="36.5" r="1.5" fill="#FFFFFF" />
      <circle cx="72" cy="38" r="4" fill="#0F172A" />
      <circle cx="73" cy="36.5" r="1.5" fill="#FFFFFF" />
      <circle cx="62" cy="42" r="2" fill="#1E293B" />
    </svg>
  );
}

export default function FaultLineCloudCompanion({
  currentView = 'landing',
  isThinking = false,
  hasError = false,
  activeCase = null,
  onOpenIntelligence = null,
  visible = true,
  className = '',
  defaultPosition = null,
}) {
  const { preferences, resolvedTheme } = useTheme();
  const isReducedMotion =
    preferences?.motion === 'reduced' ||
    (typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);

  const isLight = resolvedTheme === 'light';
  const isChatRoute = currentView === 'intelligence' || currentView === 'chat';

  // Automated testing / screenshot inspection helper
  const isInitialTestHover = useMemo(() => {
    try {
      return typeof window !== 'undefined' && window.location.search.includes('testHoverCompanion');
    } catch {
      return false;
    }
  }, []);

  // Interaction & Expression States
  const [mood, setMood] = useState(() => (isInitialTestHover ? 'hover' : 'idle')); // 'idle' | 'hover' | 'happy' | 'thinking' | 'error'
  const [isBlinking, setIsBlinking] = useState(false);
  const [isHovered, setIsHovered] = useState(isInitialTestHover);
  const [activeSpeech, setActiveSpeech] = useState(null); // Explicit poke quote or thinking text
  const [bubbleKey, setBubbleKey] = useState(0);

  // Eye & Head Physics Tracking
  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 });
  const [bodyTilt, setBodyTilt] = useState(0);
  const [magneticOffset, setMagneticOffset] = useState({ x: 0, y: 0 });
  const [proximityRatio, setProximityRatio] = useState(0); // 0 to 1

  // Draggable Positioning State
  const petRef = useRef(null);
  const hoverLeaveTimerRef = useRef(null);
  const [position, setPosition] = useState(() => {
    try {
      const saved = localStorage.getItem('faultline_codex_pet_pos');
      if (saved) return JSON.parse(saved);
    } catch {}
    return defaultPosition || { x: null, y: null }; // null means default CSS fixed anchor
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, posX: 0, posY: 0 });
  const hasMovedDuringDrag = useRef(false);
  const lastQuoteIndexRef = useRef(-1);
  const bubbleTimerRef = useRef(null);

  // Helper to show custom speech bubble
  const showBubble = useCallback((text, duration = 3800) => {
    if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
    setActiveSpeech(text);
    setBubbleKey((k) => k + 1);
    if (duration > 0) {
      bubbleTimerRef.current = setTimeout(() => {
        setActiveSpeech(null);
      }, duration);
    }
  }, []);

  // React to hasError prop
  useEffect(() => {
    if (hasError) {
      setMood('error');
      showBubble("Encountered a connection issue. Click to retry.", 4500);
    } else if (mood === 'error') {
      setMood('idle');
      setActiveSpeech(null);
    }
  }, [hasError, showBubble]);

  // React to isThinking prop (e.g. Chatbot query or Case Analysis running)
  useEffect(() => {
    if (isThinking) {
      setMood('thinking');
      const randomThinking =
        THINKING_QUOTES[Math.floor(Math.random() * THINKING_QUOTES.length)];
      showBubble(randomThinking, 4200);
    } else if (mood === 'thinking') {
      setMood('happy');
      const randomDone = DONE_QUOTES[Math.floor(Math.random() * DONE_QUOTES.length)];
      showBubble(randomDone, 3200);
      const timer = setTimeout(() => setMood('idle'), 2500);
      return () => clearTimeout(timer);
    }
  }, [isThinking, showBubble]);

  // Natural Blinking Cycle (Random 2.8s - 6.5s interval)
  useEffect(() => {
    if (isReducedMotion) return undefined;
    let blinkTimeout;
    const scheduleBlink = () => {
      const nextDelay = 2800 + Math.random() * 3700;
      blinkTimeout = setTimeout(() => {
        setIsBlinking(true);
        setTimeout(() => {
          setIsBlinking(false);
          scheduleBlink();
        }, 160);
      }, nextDelay);
    };
    scheduleBlink();
    return () => clearTimeout(blinkTimeout);
  }, [isReducedMotion]);

  // Smooth Cursor Proximity & Eye Tracking Physics Loop
  useEffect(() => {
    if (isReducedMotion) {
      setEyeOffset({ x: 0, y: 0 });
      setBodyTilt(0);
      setMagneticOffset({ x: 0, y: 0 });
      setProximityRatio(0);
      return undefined;
    }

    let animId;
    let targetEyeX = 0;
    let targetEyeY = 0;
    let currentEyeX = 0;
    let currentEyeY = 0;

    let targetTilt = 0;
    let currentTilt = 0;

    let targetMagX = 0;
    let targetMagY = 0;
    let currentMagX = 0;
    let currentMagY = 0;

    let targetProx = 0;
    let currentProx = 0;

    const isTouchOnly =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(pointer: coarse)')?.matches;

    const handlePointerMove = (e) => {
      if (isTouchOnly || !petRef.current) return;
      const rect = petRef.current.getBoundingClientRect();
      const petCenterX = rect.left + rect.width / 2;
      const petCenterY = rect.top + rect.height / 2;

      const dx = e.clientX - petCenterX;
      const dy = e.clientY - petCenterY;
      const dist = Math.hypot(dx, dy);

      if (dist < 1) {
        targetEyeX = 0;
        targetEyeY = 0;
        targetTilt = 0;
        targetMagX = 0;
        targetMagY = 0;
        targetProx = 1;
        return;
      }

      // Proximity Zone: up to 260px radius
      const PROXIMITY_RADIUS = 260;
      const prox = Math.max(0, Math.min(1.0, 1.0 - (dist - 50) / (PROXIMITY_RADIUS - 50)));
      targetProx = prox;

      // Eye Tracking Boundaries (Clamped to 5.5px horizontal, 4.0px vertical)
      const maxRadiusX = 5.5;
      const maxRadiusY = 4.0;
      const angle = Math.atan2(dy, dx);
      const intensity = Math.min(1.0, dist / 320);

      targetEyeX = Math.cos(angle) * maxRadiusX * intensity;
      targetEyeY = Math.sin(angle) * maxRadiusY * intensity;

      // Natural body tilt toward pointer (clamped to max 4.5 degrees)
      targetTilt = Math.cos(angle) * intensity * 4.5;

      // Gentle magnetic attraction translation (up to 4.5px toward pointer)
      if (prox > 0.1) {
        const magStrength = Math.pow(prox, 1.2) * 4.5;
        targetMagX = Math.cos(angle) * magStrength;
        targetMagY = Math.sin(angle) * magStrength;
      } else {
        targetMagX = 0;
        targetMagY = 0;
      }
    };

    const handlePointerLeave = () => {
      targetEyeX = 0;
      targetEyeY = 0;
      targetTilt = 0;
      targetMagX = 0;
      targetMagY = 0;
      targetProx = 0;
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    document.addEventListener('mouseleave', handlePointerLeave);

    // Smooth Lerp Update Loop (Spring-eased at 60fps)
    const updatePhysics = () => {
      currentEyeX += (targetEyeX - currentEyeX) * 0.18;
      currentEyeY += (targetEyeY - currentEyeY) * 0.18;
      currentTilt += (targetTilt - currentTilt) * 0.14;
      currentMagX += (targetMagX - currentMagX) * 0.12;
      currentMagY += (targetMagY - currentMagY) * 0.12;
      currentProx += (targetProx - currentProx) * 0.15;

      setEyeOffset({
        x: Math.round(currentEyeX * 100) / 100,
        y: Math.round(currentEyeY * 100) / 100,
      });
      setBodyTilt(Math.round(currentTilt * 100) / 100);
      setMagneticOffset({
        x: Math.round(currentMagX * 100) / 100,
        y: Math.round(currentMagY * 100) / 100,
      });
      setProximityRatio(Math.round(currentProx * 100) / 100);

      animId = requestAnimationFrame(updatePhysics);
    };

    animId = requestAnimationFrame(updatePhysics);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('mouseleave', handlePointerLeave);
      cancelAnimationFrame(animId);
    };
  }, [isReducedMotion]);

  // Combined Region Hover Handlers with Debounced Leave to prevent flickering
  const handleMouseEnterRegion = useCallback(() => {
    if (hoverLeaveTimerRef.current) {
      clearTimeout(hoverLeaveTimerRef.current);
      hoverLeaveTimerRef.current = null;
    }
    setIsHovered(true);
    if (mood === 'idle') {
      setMood('hover');
    }
  }, [mood]);

  const handleMouseLeaveRegion = useCallback(() => {
    // 220ms grace window so moving between cloud and speech bubble never flickers
    hoverLeaveTimerRef.current = setTimeout(() => {
      setIsHovered(false);
      setMood((m) => (m === 'hover' ? 'idle' : m));
    }, 220);
  }, []);

  // Click & Poke Interaction with Particle Network Pulse & Immediate Navigation
  const handlePoke = useCallback(() => {
    if (hasMovedDuringDrag.current) return;
    setMood('happy');

    // Trigger Particle Network Energy Wave from companion coordinates
    if (petRef.current && typeof window !== 'undefined') {
      const rect = petRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      window.dispatchEvent(
        new CustomEvent('faultline-particle-wave', {
          detail: { x: cx, y: cy, maxRadius: 260, maxAlpha: 0.32, speed: 4.5 },
        })
      );
    }

    // Pick non-repeating quote
    let nextIdx;
    do {
      nextIdx = Math.floor(Math.random() * POKE_QUOTES.length);
    } while (nextIdx === lastQuoteIndexRef.current && POKE_QUOTES.length > 1);
    lastQuoteIndexRef.current = nextIdx;

    showBubble(POKE_QUOTES[nextIdx], 3600);

    setTimeout(() => {
      setMood((m) => (m === 'happy' ? (isHovered ? 'hover' : 'idle') : m));
    }, 2200);

    // If outside the Chatbot / Intelligence screen, open it immediately
    if (!isChatRoute && onOpenIntelligence) {
      onOpenIntelligence();
    }
  }, [isChatRoute, isHovered, onOpenIntelligence, showBubble]);

  // Viewport Dragging Implementation
  const handlePointerDown = (e) => {
    if (e.button !== 0) return; // Left click only
    hasMovedDuringDrag.current = false;
    setIsDragging(true);

    const rect = petRef.current?.getBoundingClientRect();
    const currentLeft = rect?.left ?? 100;
    const currentTop = rect?.top ?? 100;

    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      posX: currentLeft,
      posY: currentTop,
    };

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStartRef.current.mouseX;
    const deltaY = e.clientY - dragStartRef.current.mouseY;

    if (Math.hypot(deltaX, deltaY) > 5) {
      hasMovedDuringDrag.current = true;
    }

    let newX = dragStartRef.current.posX + deltaX;
    let newY = dragStartRef.current.posY + deltaY;

    // Viewport bounds clamping (16px safe margin)
    const petW = 104;
    const petH = 88;
    const maxX = (window.innerWidth || 1200) - petW - 16;
    const maxY = (window.innerHeight || 800) - petH - 16;

    newX = Math.max(16, Math.min(maxX, newX));
    newY = Math.max(16, Math.min(maxY, newY));

    const nextPos = { x: Math.round(newX), y: Math.round(newY) };
    setPosition(nextPos);
  };

  const handlePointerUp = (e) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    if (position.x !== null && position.y !== null) {
      try {
        localStorage.setItem('faultline_codex_pet_pos', JSON.stringify(position));
      } catch {}
    }
  };

  // Keyboard Navigation, Nudging & Accessible Actions
  const handleKeyDown = (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      handlePoke();
    } else if (e.key === 'Escape') {
      setActiveSpeech(null);
      setIsHovered(false);
    } else if (e.key.toLowerCase() === 'r') {
      // Reset position to default home anchor
      e.preventDefault();
      setPosition({ x: null, y: null });
      try {
        localStorage.removeItem('faultline_codex_pet_pos');
      } catch {}
      showBubble("Reset to my home position!", 2400);
    } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      const rect = petRef.current?.getBoundingClientRect();
      const curX = position.x ?? rect?.left ?? 200;
      const curY = position.y ?? rect?.top ?? 200;
      const step = e.shiftKey ? 40 : 16;

      let nextX = curX;
      let nextY = curY;
      if (e.key === 'ArrowUp') nextY -= step;
      if (e.key === 'ArrowDown') nextY += step;
      if (e.key === 'ArrowLeft') nextX -= step;
      if (e.key === 'ArrowRight') nextX += step;

      const maxX = (window.innerWidth || 1200) - 120;
      const maxY = (window.innerHeight || 800) - 100;
      const updated = {
        x: Math.max(16, Math.min(maxX, nextX)),
        y: Math.max(16, Math.min(maxY, nextY)),
      };
      setPosition(updated);
      try {
        localStorage.setItem('faultline_codex_pet_pos', JSON.stringify(updated));
      } catch {}
    }
  };

  if (!visible) return null;

  // Determine container positioning styles & safe-area classes
  const isCustomPlaced = position.x !== null && position.y !== null;
  const placementStyle = isCustomPlaced
    ? {
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 40,
      }
    : {};

  // Context-safe default placement: elevated on chat screen to clear fixed composer bar
  const defaultPlacementClasses = isCustomPlaced
    ? ''
    : isChatRoute
    ? 'fixed bottom-22 right-6 sm:bottom-24 sm:right-8 z-40'
    : 'fixed bottom-6 right-6 sm:bottom-7 sm:right-8 z-40';

  // Ambient Proximity Glow calculation (Sections 4 & 11)
  const isAwakened = isHovered || mood === 'hover' || mood === 'happy' || mood === 'thinking';
  const glowOpacity = isLight
    ? (isAwakened ? 0.42 : 0.22 + proximityRatio * 0.16)
    : (isAwakened ? 0.65 : 0.35 + proximityRatio * 0.25);
  const glowSpread = isAwakened ? 28 : 16 + proximityRatio * 12;

  // Active greeting resolution: custom speech has priority; otherwise show default hover greeting
  const displayedMessage = activeSpeech || (isHovered && !isThinking ? DEFAULT_GREETING : null);

  return (
    <div
      ref={petRef}
      tabIndex={0}
      role="button"
      title="Open FaultLine Chatbot"
      aria-label="FaultLine Cloud AI Companion. How can I help you? Click or press Enter to open FaultLine Chatbot. Drag to reposition, R to reset position."
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onMouseEnter={handleMouseEnterRegion}
      onMouseLeave={handleMouseLeaveRegion}
      onClick={handlePoke}
      onKeyDown={handleKeyDown}
      style={placementStyle}
      className={`group select-none outline-none focus-visible:ring-2 focus-visible:ring-pen focus-visible:ring-offset-2 rounded-2xl touch-none ${defaultPlacementClasses} ${
        isDragging ? 'cursor-grabbing scale-105' : 'cursor-grab'
      } ${className}`}
    >
      {/* 1. Friendly Hover Greeting & Context Speech Bubble (Sections 4 & 8) */}
      <div
        className={`absolute bottom-full mb-3 left-1/2 -translate-x-1/2 min-w-[160px] max-w-[250px] transition-all duration-300 ease-out pointer-events-auto ${
          displayedMessage
            ? 'opacity-100 translate-y-0 scale-100'
            : 'opacity-0 translate-y-2 scale-95 pointer-events-none'
        }`}
        onClick={(e) => {
          e.stopPropagation();
          handlePoke();
        }}
      >
        <div className="relative rounded-xl border border-pen/30 bg-sheet/95 backdrop-blur-md px-3.5 py-2 text-center shadow-lg transition-colors hover:border-pen/50 cursor-pointer">
          <p className="text-[12.5px] font-semibold text-ink leading-tight">
            {displayedMessage || DEFAULT_GREETING}
          </p>
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 size-3 rotate-45 border-r border-b border-pen/30 bg-sheet" />
        </div>
        {/* Invisible hit-bridge preventing mouseleave flicker when traversing gap */}
        <div className="absolute top-full left-0 right-0 h-4 bg-transparent" />
      </div>

      {/* 2. Cloud Character Container with Smooth Physics Tracking */}
      <div
        className={`relative flex flex-col items-center justify-center transition-all duration-300 ${
          isReducedMotion
            ? ''
            : mood === 'happy'
            ? 'animate-bounce'
            : isAwakened
            ? 'scale-105 -translate-y-1'
            : 'animate-float'
        }`}
        style={{
          transform: isReducedMotion
            ? undefined
            : `translate(${magneticOffset.x}px, ${magneticOffset.y}px) rotate(${bodyTilt}deg)`,
          transformOrigin: '50% 65%',
        }}
      >
        {/* Ambient Proximity Aura Glow Filter */}
        <svg
          width="96"
          height="82"
          viewBox="0 0 120 100"
          style={{
            filter: isLight
              ? `drop-shadow(0 8px ${glowSpread}px rgba(37,99,235,${glowOpacity})) drop-shadow(0 2px 6px rgba(15,23,42,0.12))`
              : `drop-shadow(0 10px ${glowSpread}px rgba(79,107,255,${glowOpacity}))`,
          }}
          className="transition-all duration-300"
        >
          <defs>
            {/* Luminous Soft Blue Cloud Gradient (Authentic Reference Design) */}
            <linearGradient id="flCloudGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={isLight ? '#FFFFFF' : '#E2EDFF'} />
              <stop offset="35%" stopColor={isLight ? '#C7DFFF' : '#A8CDFE'} />
              <stop offset="70%" stopColor={isLight ? '#81B4FC' : '#6CA9FA'} />
              <stop offset="100%" stopColor={isLight ? '#3B82F6' : '#2563EB'} />
            </linearGradient>

            {/* Ambient Underbelly Shading */}
            <linearGradient id="flShadowGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#2563EB" stopOpacity="0" />
              <stop offset="100%" stopColor="#1D4ED8" stopOpacity={isLight ? 0.35 : 0.45} />
            </linearGradient>

            {/* Specular Highlight Arc on top curves */}
            <linearGradient id="flHighlight" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </linearGradient>

            {/* Droplet Puff Radial Gradient matching 3D sphere specular highlights from Image 2 */}
            <radialGradient id="flDropGrad" cx="30%" cy="28%" r="72%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="25%" stopColor="#BFDBFE" />
              <stop offset="65%" stopColor="#60A5FA" />
              <stop offset="100%" stopColor="#2563EB" />
            </radialGradient>
          </defs>

          {/* 1. Main Cloud Body Path (Soft 3D Rounded Billows) */}
          <path
            d="
              M 26 62
              C 16 62 10 52 14 42
              C 17 34 26 30 34 33
              C 38 22 50 14 62 14
              C 76 14 88 23 91 35
              C 99 33 108 39 110 47
              C 112 56 106 62 96 62
              Z
            "
            fill="url(#flCloudGrad)"
            stroke={isLight ? 'rgba(37, 99, 235, 0.40)' : 'rgba(255, 255, 255, 0.70)'}
            strokeWidth={isLight ? 1.4 : 1.2}
          />

          {/* Ambient Shadow Overlay on bottom curve */}
          <path
            d="
              M 22 56
              C 20 60 22 62 26 62
              L 96 62
              C 100 62 103 60 102 56
              C 88 64 36 64 22 56
              Z
            "
            fill="url(#flShadowGrad)"
          />

          {/* Top Edge Specular Highlights */}
          <path
            d="
              M 35 32
              C 38 23 49 16 62 16
              C 74 16 85 24 88 34
            "
            fill="none"
            stroke="url(#flHighlight)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* 2. Floating Cloud Droplets (Authentic Reference Image 2: exactly 3 ascending droplets) */}
          {/* Droplet 1: Small left droplet */}
          <circle
            cx="42"
            cy="76"
            r="3.5"
            fill="url(#flDropGrad)"
            stroke={isLight ? 'rgba(37,99,235,0.3)' : 'rgba(255,255,255,0.45)'}
            strokeWidth="0.6"
            className={`transition-all duration-500 ease-out ${isReducedMotion ? '' : 'animate-droplet-1'}`}
          />

          {/* Droplet 2: Medium center droplet */}
          <circle
            cx="55"
            cy="80"
            r="5.0"
            fill="url(#flDropGrad)"
            stroke={isLight ? 'rgba(37,99,235,0.3)' : 'rgba(255,255,255,0.45)'}
            strokeWidth="0.7"
            className={`transition-all duration-500 ease-out ${isReducedMotion ? '' : 'animate-droplet-2'}`}
          />

          {/* Droplet 3: Large right droplet */}
          <circle
            cx="72"
            cy="76"
            r="7.5"
            fill="url(#flDropGrad)"
            stroke={isLight ? 'rgba(37,99,235,0.3)' : 'rgba(255,255,255,0.45)'}
            strokeWidth="0.8"
            className={`transition-all duration-500 ease-out ${isReducedMotion ? '' : 'animate-droplet-3'}`}
          />

          {/* 3. Expressive Facial Elements */}
          {/* Normal Eyes (Cursor Tracking Mode) */}
          {mood !== 'happy' && !isBlinking && (
            <g transform={`translate(${eyeOffset.x}, ${eyeOffset.y})`}>
              {/* Left Eye */}
              <ellipse
                cx="46"
                cy="42"
                rx={isAwakened ? 4.2 : 3.6}
                ry={isAwakened ? 4.8 : 4.0}
                fill="#0F172A"
              />
              <circle cx="45" cy="40.5" r="1.3" fill="#FFFFFF" />

              {/* Center Dot / Cute Nose-Mouth (Signature 3-dot face) */}
              <circle cx="62" cy="43.5" r="2.2" fill="#0F172A" />

              {/* Right Eye */}
              <ellipse
                cx="78"
                cy="42"
                rx={isAwakened ? 4.2 : 3.6}
                ry={isAwakened ? 4.8 : 4.0}
                fill="#0F172A"
              />
              <circle cx="77" cy="40.5" r="1.3" fill="#FFFFFF" />
            </g>
          )}

          {/* Blinking State */}
          {isBlinking && mood !== 'happy' && (
            <g stroke="#0F172A" strokeWidth="2.5" strokeLinecap="round">
              <line x1="42" y1="42" x2="50" y2="42" />
              <circle cx="62" cy="43.5" r="2" fill="#0F172A" />
              <line x1="74" y1="42" x2="82" y2="42" />
            </g>
          )}

          {/* Happy / Joyful State (Joyful Arches & Smile) */}
          {mood === 'happy' && (
            <g>
              <path
                d="M 42 43 Q 46 36 50 43"
                fill="none"
                stroke="#0F172A"
                strokeWidth="2.6"
                strokeLinecap="round"
              />
              <path
                d="M 74 43 Q 78 36 82 43"
                fill="none"
                stroke="#0F172A"
                strokeWidth="2.6"
                strokeLinecap="round"
              />
              <path
                d="M 58 43 Q 62 49 66 43"
                fill="#0F172A"
                stroke="#0F172A"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
              <circle cx="37" cy="46" r="3.8" fill="#F472B6" opacity="0.65" />
              <circle cx="87" cy="46" r="3.8" fill="#F472B6" opacity="0.65" />
            </g>
          )}

          {/* Thinking / Curious Micro Sparkle Accent */}
          {mood === 'thinking' && (
            <g className="animate-spin" style={{ transformOrigin: '96px 20px', animationDuration: '6s' }}>
              <polygon
                points="96,16 98,20 102,20 99,22 100,26 96,23 92,26 93,22 90,20 94,20"
                fill="#FBBF24"
              />
            </g>
          )}
        </svg>

        {/* Reference-Accurate Name Pill Badge: [ (✦) FaultLine Chatbot AI ] (Image 1 & 2) */}
        <div
          className={`mt-2 flex items-center gap-2.5 rounded-full border transition-all duration-200 ${
            isLight
              ? 'border-slate-300/80 bg-white/95 text-slate-800 shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
              : 'border-[#202E4E] bg-[#0B1220]/95 text-white shadow-[0_4px_14px_rgba(0,0,0,0.45)]'
          } backdrop-blur-md px-3.5 py-1.5 opacity-95 group-hover:opacity-100 group-hover:border-blue-500/50 group-hover:shadow-[0_4px_16px_rgba(37,99,235,0.25)]`}
        >
          {/* Circular Sparkle Icon Badge from Reference Image 1 */}
          <span
            className={`flex size-5.5 items-center justify-center rounded-full shrink-0 transition-transform duration-200 group-hover:scale-110 ${
              isLight
                ? 'bg-blue-100 text-blue-600'
                : 'bg-[#1A2644] text-[#60A5FA]'
            }`}
          >
            <ChatbotSparkleIcon className="size-3 text-[#60A5FA] dark:text-[#60A5FA]" />
          </span>

          {/* FaultLine Chatbot Label */}
          <span
            className={`text-[12.5px] font-bold tracking-tight whitespace-nowrap ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}
          >
            FaultLine Chatbot
          </span>

          {/* AI Badge Pill from Reference Image 1 */}
          <span
            className={`rounded-full px-1.5 py-0.2 text-[9.5px] font-bold tracking-wider uppercase ${
              isLight
                ? 'bg-blue-50 text-blue-600 border border-blue-200/60'
                : 'bg-[#16213D] text-[#60A5FA] border border-blue-500/20'
            }`}
          >
            AI
          </span>
        </div>
      </div>
    </div>
  );
}
