/**
 * SWARM CURSORS INTRO — Website Rebuild Animation
 * Inspired by: https://github.com/DhvanilPatel/swarm-cursors
 * 
 * Displays an animated team of cursors that rebuild the website on first load.
 * Respects prefers-reduced-motion and uses sessionStorage to avoid repeat.
 */

(function () {
  'use strict';

  // Detect motion preference
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Configuration
  const CONFIG = {
    duration: 55000, // Total animation duration (ms)
    cursorCount: {
      desktop: 12,  // 1440px
      tablet: 8,    // 768px
      mobile: 4     // 390px
    },
    colors: ['#22d3ee', '#34d399', '#fbbf24', '#ef4444', '#f97316'],
    easing: {
      easeInOutQuad: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
      easeOutCubic: (t) => 1 + (--t) * t * t,
      linear: (t) => t
    }
  };

  // ===== STATE =====
  let isActive = false;
  let startTime = 0;
  let animationFrameId = null;
  let cursors = [];
  let overlayLayer = null;
  let skipButton = null;
  let progressBar = null;

  // ===== UTILITIES =====

  /**
   * Get cursor count based on viewport width
   */
  function getCursorCount() {
    const width = window.innerWidth;
    if (width >= 1200) return CONFIG.cursorCount.desktop;
    if (width >= 600) return CONFIG.cursorCount.tablet;
    return CONFIG.cursorCount.mobile;
  }

  /**
   * Get random color
   */
  function getRandomColor() {
    return CONFIG.colors[Math.floor(Math.random() * CONFIG.colors.length)];
  }

  /**
   * Linear interpolation
   */
  function lerp(start, end, t) {
    return start + (end - start) * t;
  }

  /**
   * Calculate distance between two points
   */
  function distance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  }

  /**
   * Create overlay layer
   */
  function createOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'swarm-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, rgba(6, 10, 18, 0.98), rgba(7, 12, 22, 0.95));
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
    `;

    // SVG Canvas for cursors
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = 'swarm-canvas';
    svg.setAttribute('width', window.innerWidth);
    svg.setAttribute('height', window.innerHeight);
    svg.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      pointer-events: none;
    `;
    overlay.appendChild(svg);

    // Skip button
    const skip = document.createElement('button');
    skip.id = 'swarm-skip';
    skip.textContent = 'Skip Intro';
    skip.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 10px 20px;
      background: rgba(34, 211, 238, 0.2);
      border: 1px solid rgba(34, 211, 238, 0.5);
      color: #22d3ee;
      border-radius: 24px;
      font-size: 14px;
      cursor: pointer;
      z-index: 10001;
      transition: all 0.3s ease;
      font-weight: 600;
    `;
    skip.onmouseover = () => {
      skip.style.background = 'rgba(34, 211, 238, 0.3)';
      skip.style.borderColor = '#22d3ee';
    };
    skip.onmouseout = () => {
      skip.style.background = 'rgba(34, 211, 238, 0.2)';
      skip.style.borderColor = 'rgba(34, 211, 238, 0.5)';
    };
    overlay.appendChild(skip);

    // Progress bar
    const progress = document.createElement('div');
    progress.id = 'swarm-progress';
    progress.style.cssText = `
      position: fixed;
      bottom: 0;
      left: 0;
      height: 3px;
      width: 0%;
      background: linear-gradient(90deg, #22d3ee, #34d399);
      z-index: 10001;
      transition: width 0.1s linear;
    `;
    overlay.appendChild(progress);

    return { overlay, svg, skip, progress };
  }

  /**
   * Create cursor object
   */
  function createCursor(startX, startY) {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    const trail = document.createElementNS('http://www.w3.org/2000/svg', 'path');

    const color = getRandomColor();
    const size = 8 + Math.random() * 4;

    circle.setAttribute('r', size);
    circle.setAttribute('fill', color);
    circle.setAttribute('opacity', '0.8');

    trail.setAttribute('stroke', color);
    trail.setAttribute('stroke-width', '1');
    trail.setAttribute('fill', 'none');
    trail.setAttribute('opacity', '0.3');

    g.appendChild(trail);
    g.appendChild(circle);

    return {
      g,
      circle,
      trail,
      x: startX,
      y: startY,
      vx: 0,
      vy: 0,
      targetX: startX,
      targetY: startY,
      color,
      size,
      pathHistory: [{ x: startX, y: startY }],
      maxPathLength: 20
    };
  }

  /**
   * Initialize cursors
   */
  function initCursors() {
    const svg = document.getElementById('swarm-canvas');
    const count = getCursorCount();

    cursors = [];
    for (let i = 0; i < count; i++) {
      const startX = window.innerWidth * (0.2 + Math.random() * 0.6);
      const startY = window.innerHeight * (0.2 + Math.random() * 0.6);
      const cursor = createCursor(startX, startY);
      cursors.push(cursor);
      svg.appendChild(cursor.g);
    }
  }

  /**
   * Update cursor positions
   */
  function updateCursors(progress) {
    cursors.forEach((cursor, idx) => {
      // Assign target based on animation phase
      const target = getTargetForPhase(progress, idx);
      cursor.targetX = target.x;
      cursor.targetY = target.y;

      // Move towards target
      const dx = cursor.targetX - cursor.x;
      const dy = cursor.targetY - cursor.y;
      const dist = distance(0, 0, dx, dy);

      if (dist > 1) {
        const speed = 2 + Math.random() * 2;
        cursor.vx = (dx / dist) * speed;
        cursor.vy = (dy / dist) * speed;
      } else {
        cursor.vx *= 0.8;
        cursor.vy *= 0.8;
      }

      cursor.x += cursor.vx;
      cursor.y += cursor.vy;

      // Update path history for trail effect
      cursor.pathHistory.push({ x: cursor.x, y: cursor.y });
      if (cursor.pathHistory.length > cursor.maxPathLength) {
        cursor.pathHistory.shift();
      }

      // Draw path trail
      if (cursor.pathHistory.length > 1) {
        let pathData = `M ${cursor.pathHistory[0].x} ${cursor.pathHistory[0].y}`;
        for (let i = 1; i < cursor.pathHistory.length; i++) {
          pathData += ` L ${cursor.pathHistory[i].x} ${cursor.pathHistory[i].y}`;
        }
        cursor.trail.setAttribute('d', pathData);
      }

      // Update circle position
      cursor.g.setAttribute('transform', `translate(${cursor.x}, ${cursor.y})`);
    });
  }

  /**
   * Get target position based on animation phase
   */
  function getTargetForPhase(progress, cursorIdx) {
    const phases = [
      { start: 0.0, end: 0.1, target: 'center' },           // 0–5.5s: center
      { start: 0.1, end: 0.25, target: 'navbar' },          // 5.5–13.75s: navbar
      { start: 0.25, end: 0.5, target: 'hero' },            // 13.75–27.5s: hero
      { start: 0.5, end: 0.75, target: 'content' },         // 27.5–41.25s: content
      { start: 0.75, end: 1.0, target: 'footer' }           // 41.25–55s: footer
    ];

    const phase = phases.find(p => progress >= p.start && progress < p.end) || phases[phases.length - 1];

    const targets = {
      center: () => ({
        x: window.innerWidth / 2 + (Math.random() - 0.5) * 100,
        y: window.innerHeight / 2 + (Math.random() - 0.5) * 100
      }),
      navbar: () => ({
        x: Math.random() * window.innerWidth,
        y: 60 + Math.random() * 40
      }),
      hero: () => ({
        x: window.innerWidth * (0.2 + Math.random() * 0.6),
        y: window.innerHeight * (0.3 + Math.random() * 0.4)
      }),
      content: () => ({
        x: window.innerWidth * (0.1 + Math.random() * 0.8),
        y: window.innerHeight * (0.5 + Math.random() * 0.4)
      }),
      footer: () => ({
        x: Math.random() * window.innerWidth,
        y: window.innerHeight - 100 + Math.random() * 80
      })
    };

    return targets[phase.target]();
  }

  /**
   * Reveal elements based on progress
   */
  function revealElements(progress) {
    const reveals = [
      { selector: '.navbar', start: 0.1, end: 0.25 },
      { selector: '.hero', start: 0.25, end: 0.5 },
      { selector: '#cara', start: 0.5, end: 0.62 },
      { selector: '#skenario', start: 0.62, end: 0.74 },
      { selector: '#alur', start: 0.74, end: 0.86 },
      { selector: '#latensi', start: 0.86, end: 0.92 }
    ];

    reveals.forEach(reveal => {
      const el = document.querySelector(reveal.selector);
      if (!el) return;

      if (progress >= reveal.start && progress <= reveal.end) {
        const phaseProgress = (progress - reveal.start) / (reveal.end - reveal.start);
        el.style.opacity = phaseProgress;
        el.style.transform = `translateY(${20 * (1 - phaseProgress)}px)`;
      } else if (progress > reveal.end) {
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      } else {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
      }
    });
  }

  /**
   * Animation loop
   */
  function animate(timestamp) {
    if (!isActive) return;

    if (startTime === 0) startTime = timestamp;
    const elapsed = timestamp - startTime;
    const progress = Math.min(elapsed / CONFIG.duration, 1);

    // Update cursors
    updateCursors(progress);

    // Reveal elements
    revealElements(progress);

    // Update progress bar
    if (progressBar) {
      progressBar.style.width = `${progress * 100}%`;
    }

    // Continue animation or finish
    if (progress < 1) {
      animationFrameId = requestAnimationFrame(animate);
    } else {
      finish();
    }
  }

  /**
   * Finish animation and show website
   */
  function finish() {
    isActive = false;
    if (overlayLayer) {
      overlayLayer.style.opacity = '0';
      overlayLayer.style.pointerEvents = 'none';
      setTimeout(() => {
        overlayLayer.remove();
      }, 500);
    }

    // Mark intro as shown
    sessionStorage.setItem('swarm-intro-shown', 'true');

    // Show all content
    document.querySelectorAll('body > *').forEach(el => {
      if (!el.id.startsWith('swarm-')) {
        el.style.opacity = '1';
        el.style.transform = 'none';
      }
    });

    // Cancel animation
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
  }

  /**
   * Skip intro
   */
  function skip() {
    isActive = false;
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
    finish();
  }

  /**
   * Initialize intro system
   */
  function init() {
    // Check if intro already shown
    if (sessionStorage.getItem('swarm-intro-shown') === 'true') {
      return;
    }

    // Respect prefers-reduced-motion
    if (prefersReduced) {
      sessionStorage.setItem('swarm-intro-shown', 'true');
      return;
    }

    // Create overlay and elements
    const { overlay, svg, skip: skipBtn, progress } = createOverlay();
    overlayLayer = overlay;
    skipButton = skipBtn;
    progressBar = progress;

    document.body.appendChild(overlay);

    // Initialize cursors
    initCursors();

    // Setup event listeners
    skipBtn.addEventListener('click', skip);
    window.addEventListener('resize', () => {
      if (svg) {
        svg.setAttribute('width', window.innerWidth);
        svg.setAttribute('height', window.innerHeight);
      }
    });

    // Hide initial content (will be revealed during animation)
    document.querySelectorAll('body > *').forEach(el => {
      if (!el.id.startsWith('swarm-')) {
        el.style.opacity = '0';
        el.style.pointerEvents = 'none';
      }
    });

    // Start animation
    isActive = true;
    startTime = 0;
    animationFrameId = requestAnimationFrame(animate);
  }

  // ===== PUBLIC API =====
  window.SwarmIntro = {
    init,
    skip,
    isActive: () => isActive
  };

  // Auto-init on DOMContentLoaded if not already shown
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
