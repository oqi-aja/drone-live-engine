/**
 * SWARM CURSORS INTRO — Website Rebuild Animation (FIXED)
 * Inspired by: https://github.com/DhvanilPatel/swarm-cursors
 * 
 * FIXED: Proper element snapshot, task queue, cursor coordination
 * - Snapshot elemen asli sebelum animasi
 * - Buat task queue dengan target koordinat valid
 * - Distribusikan task ke cursor dengan koordinasi
 * - Reveal elemen saat cursor mencapai target
 * - Fallback jika animasi gagal
 */

(function () {
  'use strict';

  // Detect motion preference
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Configuration
  const CONFIG = {
    duration: 55000, // Total animation duration (ms)
    cursorCount: {
      desktop: 12,
      tablet: 8,
      mobile: 4
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
  let elementSnapshot = [];
  let taskQueue = [];
  let completedTasks = 0;

  // ===== UTILITIES =====

  function getCursorCount() {
    const width = window.innerWidth;
    if (width >= 1200) return CONFIG.cursorCount.desktop;
    if (width >= 600) return CONFIG.cursorCount.tablet;
    return CONFIG.cursorCount.mobile;
  }

  function getRandomColor() {
    return CONFIG.colors[Math.floor(Math.random() * CONFIG.colors.length)];
  }

  function lerp(start, end, t) {
    return start + (end - start) * t;
  }

  function distance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  }

  /**
   * SNAPSHOT: Capture element positions and visibility state
   */
  function snapshotElements() {
    elementSnapshot = [];
    const selectors = [
      '.navbar',
      '.hero',
      '.section',
      '.replica-card',
      '.btn-primary',
      '.nav-link',
      'h2',
      'h3',
      '.step-card',
      '.bento-card'
    ];

    selectors.forEach(selector => {
      document.querySelectorAll(selector).forEach((el, idx) => {
        const rect = el.getBoundingClientRect();
        const scrollX = window.scrollX || window.pageXOffset;
        const scrollY = window.scrollY || window.pageYOffset;

        // Valid target check
        if (rect.width > 0 && rect.height > 0) {
          elementSnapshot.push({
            element: el,
            selector: selector,
            index: idx,
            x: rect.left + scrollX + rect.width / 2,
            y: rect.top + scrollY + rect.height / 2,
            width: rect.width,
            height: rect.height
          });
        }
      });
    });

    return elementSnapshot;
  }

  /**
   * BUILD TASK QUEUE: Distribute snapshot targets to cursor workers
   */
  function buildTaskQueue() {
    taskQueue = [];
    const cursorCount = getCursorCount();
    const tasksPerCursor = Math.max(1, Math.ceil(elementSnapshot.length / cursorCount));

    elementSnapshot.forEach((snap, idx) => {
      const cursorId = Math.floor(idx / tasksPerCursor) % cursorCount;
      const phase = Math.floor(idx / elementSnapshot.length * 5); // 5 phases

      taskQueue.push({
        id: idx,
        cursorId: cursorId,
        phase: phase,
        targetX: snap.x,
        targetY: snap.y,
        element: snap.element,
        completed: false,
        startTime: (phase / 5) * CONFIG.duration,
        endTime: ((phase + 1) / 5) * CONFIG.duration
      });
    });

    return taskQueue;
  }

  /**
   * Reveal element when cursor reaches it
   */
  function revealElement(task) {
    if (task.completed || !task.element) return;

    const el = task.element;
    el.style.opacity = '1';
    el.style.transform = 'translateY(0)';
    el.style.pointerEvents = 'auto';
    task.completed = true;
    completedTasks++;
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
      maxPathLength: 20,
      assignedTasks: [],
      currentTaskIdx: 0
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
      const startX = window.innerWidth / 2 + (Math.random() - 0.5) * 200;
      const startY = window.innerHeight / 2 + (Math.random() - 0.5) * 200;
      const cursor = createCursor(startX, startY);
      cursors.push(cursor);
      svg.appendChild(cursor.g);
    }

    // Assign tasks to cursors
    taskQueue.forEach(task => {
      const cursor = cursors[task.cursorId % cursors.length];
      cursor.assignedTasks.push(task);
    });
  }

  /**
   * Update cursor positions towards assigned tasks
   */
  function updateCursors(progress) {
    cursors.forEach((cursor) => {
      if (!cursor.assignedTasks || cursor.assignedTasks.length === 0) return;

      // Get current task
      const task = cursor.assignedTasks[cursor.currentTaskIdx];
      if (!task) {
        // All tasks done, move to center
        cursor.targetX = window.innerWidth / 2;
        cursor.targetY = window.innerHeight / 2;
      } else {
        // Check if task is in current phase
        const taskProgress = (progress * CONFIG.duration - task.startTime) / (task.endTime - task.startTime);
        
        if (taskProgress >= 0 && taskProgress <= 1) {
          cursor.targetX = task.targetX;
          cursor.targetY = task.targetY;

          // Reveal when cursor is close
          const distToTarget = distance(cursor.x, cursor.y, cursor.targetX, cursor.targetY);
          if (distToTarget < 50) {
            revealElement(task);
            cursor.currentTaskIdx++;
          }
        }
      }

      // Move towards target
      const dx = cursor.targetX - cursor.x;
      const dy = cursor.targetY - cursor.y;
      const dist = distance(0, 0, dx, dy);

      if (dist > 1) {
        const speed = 3 + Math.random() * 2;
        cursor.vx = (dx / dist) * speed;
        cursor.vy = (dy / dist) * speed;
      } else {
        cursor.vx *= 0.9;
        cursor.vy *= 0.9;
      }

      cursor.x += cursor.vx;
      cursor.y += cursor.vy;

      // Update path history
      cursor.pathHistory.push({ x: cursor.x, y: cursor.y });
      if (cursor.pathHistory.length > cursor.maxPathLength) {
        cursor.pathHistory.shift();
      }

      // Draw trail
      if (cursor.pathHistory.length > 1) {
        let pathData = `M ${cursor.pathHistory[0].x} ${cursor.pathHistory[0].y}`;
        for (let i = 1; i < cursor.pathHistory.length; i++) {
          pathData += ` L ${cursor.pathHistory[i].x} ${cursor.pathHistory[i].y}`;
        }
        cursor.trail.setAttribute('d', pathData);
      }

      // Update circle position
      cursor.circle.setAttribute('cx', cursor.x);
      cursor.circle.setAttribute('cy', cursor.y);
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

    // Update progress bar
    if (progressBar) {
      progressBar.style.width = `${progress * 100}%`;
    }

    // Continue or finish
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

    // Ensure all elements are visible
    document.querySelectorAll('body > *').forEach(el => {
      if (!el.id.startsWith('swarm-')) {
        el.style.opacity = '1';
        el.style.transform = 'none';
        el.style.pointerEvents = 'auto';
      }
    });

    // Fade out overlay
    if (overlayLayer) {
      overlayLayer.style.opacity = '0';
      overlayLayer.style.pointerEvents = 'none';
      setTimeout(() => {
        if (overlayLayer && overlayLayer.parentNode) {
          overlayLayer.remove();
        }
      }, 500);
    }

    // Mark as shown
    sessionStorage.setItem('swarm-intro-shown', 'true');

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
   * Fallback: Show website immediately
   */
  function fallback() {
    document.querySelectorAll('body > *').forEach(el => {
      if (!el.id.startsWith('swarm-')) {
        el.style.opacity = '1';
        el.style.transform = 'none';
        el.style.pointerEvents = 'auto';
      }
    });

    if (overlayLayer && overlayLayer.parentNode) {
      overlayLayer.remove();
    }

    sessionStorage.setItem('swarm-intro-shown', 'true');
    console.warn('[SwarmIntro] Fallback triggered — showing website');
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

    try {
      // Snapshot elements FIRST (before hiding)
      snapshotElements();
      
      if (elementSnapshot.length === 0) {
        console.warn('[SwarmIntro] No elements to snapshot — fallback');
        fallback();
        return;
      }

      // Build task queue
      buildTaskQueue();

      if (taskQueue.length === 0) {
        console.warn('[SwarmIntro] No tasks created — fallback');
        fallback();
        return;
      }

      // Create overlay
      const { overlay, svg, skip: skipBtn, progress } = createOverlay();
      overlayLayer = overlay;
      skipButton = skipBtn;
      progressBar = progress;

      // Hide content (now that snapshot is done)
      document.querySelectorAll('body > *').forEach(el => {
        if (!el.id.startsWith('swarm-')) {
          el.style.opacity = '0';
          el.style.transform = 'translateY(10px)';
          el.style.pointerEvents = 'none';
        }
      });

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

      // Start animation
      isActive = true;
      startTime = 0;
      animationFrameId = requestAnimationFrame(animate);

      // Safety fallback: if animation doesn't finish after timeout
      setTimeout(() => {
        if (isActive) {
          console.warn('[SwarmIntro] Animation timeout — fallback');
          finish();
        }
      }, CONFIG.duration + 1000);

    } catch (error) {
      console.error('[SwarmIntro] Error during init:', error);
      fallback();
    }
  }

  // ===== PUBLIC API =====
  window.SwarmIntro = {
    init,
    skip,
    isActive: () => isActive
  };

  // Auto-init on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
