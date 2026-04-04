/* =========================================================
   SenSim - Table / Projection Script
   MediaPipe hands, calibration, dwell detection, scene UI
   ========================================================= */

// ===== STATE =====
const gsm = new GameStateMachine(onPhaseChange);
let channel = null;

// Hand tracking state
let hands = null;
let camera = null;
let videoEl = null;
let handPos = { x: 0, y: 0 }; // smoothed, in screen coords
let rawHandPos = { x: 0, y: 0 };
let handDetected = false;

// Calibration
let calibrationData = loadCalibration();
let calibrating = false;
let calStep = 0;
let calPoints = []; // [{x, y}] raw webcam coords for 4 corners
let mirrorX = calibrationData.mirror || false;

// Dwell detection
let dwellTarget = null; // toolId currently being dwelled on
let dwellStart = 0;
let dwellComplete = false;

// FPS tracking
let frameCount = 0;
let lastFpsTime = Date.now();
let currentFps = 0;

// ===== DOM =====
const DOM = {};

// ===== CALIBRATION PERSISTENCE =====
function loadCalibration() {
    try {
        const data = JSON.parse(localStorage.getItem('sensim-calibration'));
        return data || { points: null, mirror: false };
    } catch { return { points: null, mirror: false }; }
}

function saveCalibration() {
    localStorage.setItem('sensim-calibration', JSON.stringify({
        points: calPoints.length === 4 ? calPoints : null,
        mirror: mirrorX
    }));
}

// ===== COORDINATE TRANSFORM =====
// Bilinear interpolation from webcam coordinates (0-1) to screen coordinates
function transformPoint(nx, ny) {
    // Apply mirror if needed
    if (mirrorX) nx = 1 - nx;

    if (!calibrationData.points || calibrationData.points.length !== 4) {
        // No calibration: direct mapping
        return { x: nx * CONFIG.CANVAS_W, y: ny * CONFIG.CANVAS_H };
    }

    const [tl, tr, br, bl] = calibrationData.points;

    // Bilinear interpolation
    // Find u, v such that point = (1-u)(1-v)*tl + u*(1-v)*tr + u*v*br + (1-u)*v*bl
    // For simplicity, use inverse bilinear approximation
    // First: compute where nx,ny falls relative to the quad
    const u = inverseBilinear(nx, ny, tl, tr, br, bl);

    return {
        x: Math.max(0, Math.min(CONFIG.CANVAS_W, u.x * CONFIG.CANVAS_W)),
        y: Math.max(0, Math.min(CONFIG.CANVAS_H, u.y * CONFIG.CANVAS_H))
    };
}

function inverseBilinear(px, py, p0, p1, p2, p3) {
    // Simple approach: compute normalized position within the quad
    // Using perspective-correct interpolation approximation

    // Top edge interpolation
    const topX = p0.x + (p1.x - p0.x);
    const topY = p0.y + (p1.y - p0.y);
    // Bottom edge interpolation
    const botX = p3.x + (p2.x - p3.x);
    const botY = p3.y + (p2.y - p3.y);

    // Find horizontal position (u)
    // Compute where px falls between left and right edges
    const leftX = p0.x + (p3.x - p0.x) * ((py - p0.y) / (p3.y - p0.y || 1));
    const rightX = p1.x + (p2.x - p1.x) * ((py - p1.y) / (p2.y - p1.y || 1));
    const u = (px - leftX) / (rightX - leftX || 1);

    // Find vertical position (v)
    const topY2 = p0.y + (p1.y - p0.y) * ((px - p0.x) / (p1.x - p0.x || 1));
    const botY2 = p3.y + (p2.y - p3.y) * ((px - p3.x) / (p2.x - p3.x || 1));
    const v = (py - topY2) / (botY2 - topY2 || 1);

    return {
        x: Math.max(0, Math.min(1, u)),
        y: Math.max(0, Math.min(1, v))
    };
}

// ===== POINTER SMOOTHING =====
function smoothPosition(raw) {
    const alpha = CONFIG.SMOOTH_ALPHA;
    handPos.x = handPos.x + alpha * (raw.x - handPos.x);
    handPos.y = handPos.y + alpha * (raw.y - handPos.y);
}

// ===== MEDIAPIPE INITIALIZATION =====
async function initMediaPipe() {
    updateLoadingStatus('Creating video element...');
    updateLoadingBar(10);

    videoEl = document.createElement('video');
    videoEl.setAttribute('playsinline', '');
    videoEl.setAttribute('autoplay', '');
    videoEl.style.display = 'none';
    document.body.appendChild(videoEl);

    updateLoadingStatus('Loading MediaPipe Hands model...');
    updateLoadingBar(20);

    try {
        if (typeof Hands === 'undefined' || typeof Camera === 'undefined') {
            throw new Error('MediaPipe libraries not loaded');
        }

        hands = new Hands({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`;
            }
        });

        hands.setOptions({
            maxNumHands: 2,
            modelComplexity: 1,
            minDetectionConfidence: 0.6,
            minTrackingConfidence: 0.5
        });

        hands.onResults(onHandResults);

        updateLoadingStatus('Requesting webcam access...');
        updateLoadingBar(60);

        camera = new Camera(videoEl, {
            onFrame: async () => {
                if (hands) {
                    await hands.send({ image: videoEl });
                }
            },
            width: 640,
            height: 480
        });

        await camera.start();

        updateLoadingStatus('Ready!');
        updateLoadingBar(100);

        // Set up debug video reference
        const debugVideo = document.getElementById('debug-video');
        if (debugVideo && videoEl.srcObject) {
            debugVideo.srcObject = videoEl.srcObject;
        }

        setTimeout(() => {
            DOM.loadingOverlay.classList.add('hiding');
            setTimeout(() => DOM.loadingOverlay.classList.add('hidden'), 500);
        }, 500);

    } catch (err) {
        console.error('MediaPipe init error:', err);
        updateLoadingStatus('Webcam not available. Use mouse/keyboard instead.');
        updateLoadingBar(100);
        setTimeout(() => {
            DOM.loadingOverlay.classList.add('hiding');
            setTimeout(() => DOM.loadingOverlay.classList.add('hidden'), 500);
        }, 2000);
    }
}

function updateLoadingStatus(text) {
    const el = document.getElementById('loading-status');
    if (el) el.textContent = text;
}

function updateLoadingBar(pct) {
    const el = document.getElementById('loading-fill');
    if (el) el.style.width = pct + '%';
}

// ===== HAND RESULTS CALLBACK =====
function onHandResults(results) {
    frameCount++;
    const now = Date.now();
    if (now - lastFpsTime >= 1000) {
        currentFps = frameCount;
        frameCount = 0;
        lastFpsTime = now;
    }

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        handDetected = true;
        // Use index finger tip (landmark 8) of first hand
        const landmarks = results.multiHandLandmarks[0];
        const tip = landmarks[8];

        rawHandPos = { x: tip.x, y: tip.y };

        if (calibrating) {
            // Don't transform during calibration
            return;
        }

        const transformed = transformPoint(tip.x, tip.y);
        smoothPosition(transformed);

        updateHandCursor();
        checkDwell();
        drawDebugOverlay(results);
    } else {
        handDetected = false;
        DOM.handCursor.classList.add('hidden');
        DOM.dwellRing.classList.add('hidden');

        // Reset dwell if hand disappears
        if (dwellTarget) {
            onDwellCancel();
        }

        drawDebugOverlay(results);
    }

    updateDebugInfo();
}

// ===== HAND CURSOR =====
function updateHandCursor() {
    DOM.handCursor.classList.remove('hidden');
    DOM.handCursor.style.left = handPos.x + 'px';
    DOM.handCursor.style.top = handPos.y + 'px';
}

// ===== DWELL DETECTION =====
function checkDwell() {
    if (gsm.phase !== PHASE.TOOL_ACTIVE) return;

    const toolCards = document.querySelectorAll('.tool-card.ready, .tool-card.explored');
    let hoveredTool = null;

    for (const card of toolCards) {
        const rect = card.getBoundingClientRect();
        // Account for zoom scaling
        const zoom = parseFloat(document.body.style.zoom) || 1;
        const cardLeft = rect.left / zoom;
        const cardTop = rect.top / zoom;
        const cardRight = rect.right / zoom;
        const cardBottom = rect.bottom / zoom;

        if (handPos.x >= cardLeft && handPos.x <= cardRight &&
            handPos.y >= cardTop && handPos.y <= cardBottom) {
            hoveredTool = card.dataset.toolId;
            break;
        }
    }

    if (hoveredTool) {
        // Update hover visual
        toolCards.forEach(c => c.classList.remove('hovering'));
        const card = document.querySelector(`.tool-card[data-tool-id="${hoveredTool}"]`);
        if (card && !card.classList.contains('active')) {
            card.classList.add('hovering');
        }

        if (hoveredTool !== dwellTarget) {
            // Started hovering a new target
            dwellTarget = hoveredTool;
            dwellStart = Date.now();
            dwellComplete = false;
            showDwellRing();
        } else if (!dwellComplete) {
            // Continuing to dwell
            const elapsed = Date.now() - dwellStart;
            const progress = Math.min(1, elapsed / CONFIG.DWELL_TIME);
            updateDwellRing(progress);

            if (progress >= 1) {
                dwellComplete = true;
                onDwellActivate(hoveredTool);
            }
        }
    } else {
        // Not hovering any tool
        toolCards.forEach(c => c.classList.remove('hovering'));
        if (dwellTarget) {
            onDwellCancel();
        }
    }
}

function showDwellRing() {
    DOM.dwellRing.classList.remove('hidden');
    updateDwellRing(0);
}

function updateDwellRing(progress) {
    DOM.dwellRing.style.left = handPos.x + 'px';
    DOM.dwellRing.style.top = handPos.y + 'px';

    const circumference = 2 * Math.PI * 54; // r=54
    const offset = circumference * (1 - progress);
    DOM.dwellProgress.style.strokeDashoffset = offset;
}

function onDwellActivate(toolId) {
    // Check if already explored
    const wasExplored = gsm.exploredTools.has(toolId);

    // Activate tool
    channel.send(MSG.TOOL_ACTIVATED, { toolId });
    gsm.activateTool(toolId);

    // Update card visual
    const card = document.querySelector(`.tool-card[data-tool-id="${toolId}"]`);
    if (card) {
        card.classList.remove('ready', 'hovering');
        card.classList.add('active');
    }

    // Play activation sound
    playTone(523, 0.15);
    setTimeout(() => playTone(659, 0.15), 100);

    updateProgress();

    // Check if all explored
    if (gsm.allExplored && !wasExplored) {
        setTimeout(() => {
            channel.send(MSG.ALL_COMPLETE);
            gsm.complete();
        }, 1500);
    }
}

function onDwellCancel() {
    const prevTarget = dwellTarget;
    dwellTarget = null;
    dwellStart = 0;
    dwellComplete = false;
    DOM.dwellRing.classList.add('hidden');

    // If tool was active, deactivate it
    if (prevTarget && gsm.activeTools.has(prevTarget)) {
        channel.send(MSG.TOOL_DEACTIVATED, { toolId: prevTarget });
        gsm.deactivateTool(prevTarget);

        const card = document.querySelector(`.tool-card[data-tool-id="${prevTarget}"]`);
        if (card) {
            card.classList.remove('active', 'hovering');
            if (gsm.exploredTools.has(prevTarget)) {
                card.classList.add('explored');
            } else {
                card.classList.add('ready');
            }
        }
    }
}

// ===== DEBUG OVERLAY =====
function drawDebugOverlay(results) {
    const canvas = document.getElementById('debug-canvas');
    if (!canvas || DOM.debugOverlay.classList.contains('hidden')) return;

    const ctx = canvas.getContext('2d');
    canvas.width = 320;
    canvas.height = 240;
    ctx.clearRect(0, 0, 320, 240);

    if (results.multiHandLandmarks) {
        for (const landmarks of results.multiHandLandmarks) {
            // Draw connections
            ctx.strokeStyle = 'rgba(78, 205, 196, 0.6)';
            ctx.lineWidth = 1;

            const connections = [
                [0,1],[1,2],[2,3],[3,4],
                [0,5],[5,6],[6,7],[7,8],
                [0,9],[9,10],[10,11],[11,12],
                [0,13],[13,14],[14,15],[15,16],
                [0,17],[17,18],[18,19],[19,20],
                [5,9],[9,13],[13,17]
            ];

            for (const [a, b] of connections) {
                const la = landmarks[a];
                const lb = landmarks[b];
                ctx.beginPath();
                ctx.moveTo(la.x * 320, la.y * 240);
                ctx.lineTo(lb.x * 320, lb.y * 240);
                ctx.stroke();
            }

            // Draw landmarks
            for (let i = 0; i < landmarks.length; i++) {
                const lm = landmarks[i];
                ctx.fillStyle = i === 8 ? '#ff3366' : 'rgba(78, 205, 196, 0.9)';
                ctx.beginPath();
                ctx.arc(lm.x * 320, lm.y * 240, i === 8 ? 5 : 3, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
}

function updateDebugInfo() {
    if (DOM.debugOverlay.classList.contains('hidden')) return;
    document.getElementById('debug-fps').textContent = `FPS: ${currentFps}`;
    document.getElementById('debug-hands').textContent = `Hands: ${handDetected ? 1 : 0}`;
    document.getElementById('debug-pos').textContent = `Pos: ${Math.round(handPos.x)}, ${Math.round(handPos.y)}`;
}

// ===== CALIBRATION =====
function startCalibration() {
    calibrating = true;
    calStep = 0;
    calPoints = [];
    DOM.calibrationOverlay.classList.remove('hidden');
    updateCalInstruction();
    updateCalCorners();
}

function endCalibration() {
    calibrating = false;
    DOM.calibrationOverlay.classList.add('hidden');
}

function updateCalInstruction() {
    const names = ['TOP-LEFT', 'TOP-RIGHT', 'BOTTOM-RIGHT', 'BOTTOM-LEFT'];
    const el = document.getElementById('cal-instruction');
    if (calStep < 4) {
        el.innerHTML = `Click the <strong>${names[calStep]}</strong> corner of the projected area`;
    } else {
        el.textContent = 'Calibration complete!';
    }
}

function updateCalCorners() {
    const corners = document.querySelectorAll('.cal-corner');
    corners.forEach((c, i) => {
        c.classList.remove('active', 'done');
        if (i < calStep) c.classList.add('done');
        if (i === calStep) c.classList.add('active');
    });
}

function onCalibrationClick(e) {
    if (!calibrating || calStep >= 4) return;

    // Use the raw hand position if available, else use mouse click
    let px, py;
    if (handDetected) {
        px = rawHandPos.x;
        py = rawHandPos.y;
    } else {
        // Mouse click - normalize to 0-1
        const zoom = parseFloat(document.body.style.zoom) || 1;
        px = (e.clientX / zoom) / CONFIG.CANVAS_W;
        py = (e.clientY / zoom) / CONFIG.CANVAS_H;
    }

    calPoints.push({ x: px, y: py });
    calStep++;
    updateCalInstruction();
    updateCalCorners();

    if (calStep >= 4) {
        // Calibration complete
        calibrationData.points = calPoints;
        saveCalibration();
        playTone(880, 0.2);
        setTimeout(() => {
            endCalibration();
        }, 1000);
    } else {
        playTone(440 + calStep * 100, 0.1);
    }
}

// ===== SCENE SELECTOR =====
function buildSceneSelector() {
    const container = DOM.sceneCards;
    container.innerHTML = '';

    const sceneIcons = {
        office: `<svg viewBox="0 0 100 100"><rect x="15" y="30" width="70" height="55" rx="4" stroke="currentColor" stroke-width="4" fill="none"/><rect x="25" y="15" width="50" height="20" rx="2" stroke="currentColor" stroke-width="3" fill="none"/><line x1="50" y1="35" x2="50" y2="80" stroke="currentColor" stroke-width="2" opacity="0.4"/><line x1="20" y1="55" x2="80" y2="55" stroke="currentColor" stroke-width="2" opacity="0.4"/></svg>`,
        mall: `<svg viewBox="0 0 100 100"><rect x="10" y="25" width="80" height="55" rx="4" stroke="currentColor" stroke-width="4" fill="none"/><rect x="20" y="35" width="20" height="30" rx="2" stroke="currentColor" stroke-width="2" fill="none"/><rect x="50" y="35" width="20" height="30" rx="2" stroke="currentColor" stroke-width="2" fill="none"/><path d="M30 20 L50 10 L70 20" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`,
        school: `<svg viewBox="0 0 100 100"><rect x="20" y="35" width="60" height="45" rx="3" stroke="currentColor" stroke-width="4" fill="none"/><path d="M35 35 L50 18 L65 35" stroke="currentColor" stroke-width="4" fill="none" stroke-linejoin="round"/><rect x="42" y="55" width="16" height="25" rx="2" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="50" cy="28" r="4" fill="currentColor"/></svg>`
    };

    for (const scene of CONFIG.SCENES) {
        const card = document.createElement('div');
        card.className = 'scene-card';
        card.dataset.sceneId = scene.id;
        card.style.setProperty('--scene-color', scene.color);

        card.innerHTML = `
            <div class="sc-icon" style="color: ${scene.color}">${sceneIcons[scene.id] || ''}</div>
            <div class="sc-label">${scene.label}</div>
            <div class="sc-desc">${scene.description}</div>
            <div class="sc-tools-preview">
                ${scene.tools.map(() => `<div class="sc-tool-dot" style="background: ${scene.color}40"></div>`).join('')}
            </div>
        `;

        card.addEventListener('click', () => selectScene(scene.id));
        card.style.borderColor = scene.color + '30';

        card.addEventListener('mouseenter', () => {
            card.style.boxShadow = `0 8px 40px ${scene.color}30`;
            card.style.borderColor = scene.color + '60';
        });
        card.addEventListener('mouseleave', () => {
            card.style.boxShadow = '';
            card.style.borderColor = scene.color + '30';
        });

        container.appendChild(card);
    }
}

function selectScene(sceneId) {
    channel.send(MSG.SCENE_SELECTED, { sceneId });
    gsm.selectScene(sceneId);
}

// ===== TOOL SCREEN =====
function buildToolScreen(sceneId) {
    const scene = CONFIG.SCENES.find(s => s.id === sceneId);
    if (!scene) return;

    DOM.toolSceneLabel.textContent = scene.label;
    DOM.toolSceneLabel.style.color = scene.color;
    DOM.toolSceneDesc.textContent = scene.description;

    // Build tool cards
    DOM.toolGrid.innerHTML = '';
    for (const tool of scene.tools) {
        const card = document.createElement('div');
        card.className = 'tool-card inactive';
        card.dataset.toolId = tool.id;

        card.innerHTML = `
            <div class="tc-icon" style="color: ${scene.color}">${tool.svgIcon}</div>
            <div class="tc-name">${tool.name}</div>
            <div class="tc-desc">${tool.description}</div>
            <div class="tc-type">${tool.calmType}</div>
        `;

        // Mouse fallback for testing without webcam
        card.addEventListener('click', () => {
            if (gsm.phase !== PHASE.TOOL_ACTIVE) return;
            if (card.classList.contains('active')) {
                onDwellCancel();
            } else if (card.classList.contains('ready') || card.classList.contains('explored')) {
                dwellTarget = tool.id;
                onDwellActivate(tool.id);
            }
        });

        DOM.toolGrid.appendChild(card);
    }

    // Show start button
    DOM.startPrompt.classList.remove('hidden');
    DOM.toolProgress.style.display = 'none';
}

function activateToolCards() {
    document.querySelectorAll('.tool-card').forEach(c => {
        c.classList.remove('inactive');
        c.classList.add('ready');
    });
    DOM.startPrompt.classList.add('hidden');
    DOM.toolProgress.style.display = '';
    updateProgress();
}

function updateProgress() {
    const sd = gsm.sceneData;
    if (!sd) return;
    const total = sd.tools.length;
    const explored = gsm.exploredTools.size;
    const pct = (explored / total) * 100;

    DOM.tpFill.style.width = pct + '%';
    DOM.tpCount.textContent = `${explored} / ${total}`;
}

// ===== TABLE SUMMARY =====
function showTableSummary() {
    const sd = gsm.sceneData;
    DOM.toolScreen.classList.add('hidden');
    DOM.tableSummary.classList.remove('hidden');

    // Build tool list
    const container = DOM.tsTools;
    container.innerHTML = '';
    if (sd) {
        for (const tool of sd.tools) {
            const card = document.createElement('div');
            card.className = 'ts-tool-card';
            card.innerHTML = `
                <div class="tst-icon">${tool.svgIcon}</div>
                <div class="tst-name">${tool.name}</div>
            `;
            container.appendChild(card);
        }
    }

    // Play complete sound
    [523, 659, 784, 1047].forEach((f, i) => {
        setTimeout(() => playTone(f, 0.3, 'sine', 0.12), i * 150);
    });
}

// ===== PHASE CHANGE HANDLER =====
function onPhaseChange(newPhase, prevPhase, data) {
    switch (newPhase) {
        case PHASE.SCENE_SELECT:
            showSceneSelect();
            break;
        case PHASE.OVERLOAD:
            showToolScreenPhase(data.sceneId);
            break;
        case PHASE.TOOL_ACTIVE:
            activateToolCards();
            break;
        case PHASE.SUMMARY:
            showTableSummary();
            break;
    }
}

function showSceneSelect() {
    DOM.sceneSelect.classList.remove('hidden');
    DOM.toolScreen.classList.add('hidden');
    DOM.tableSummary.classList.add('hidden');
    buildSceneSelector();
}

function showToolScreenPhase(sceneId) {
    DOM.sceneSelect.classList.add('hidden');
    DOM.toolScreen.classList.remove('hidden');
    DOM.tableSummary.classList.add('hidden');
    buildToolScreen(sceneId);
}

// ===== BROADCAST CHANNEL HANDLER =====
function handleMessage(data) {
    switch (data.type) {
        case MSG.READY:
            // TV is ready
            break;
    }
}

// ===== KEYBOARD SHORTCUTS =====
function onKeyDown(e) {
    switch (e.key.toLowerCase()) {
        case 'c':
            if (calibrating) {
                endCalibration();
            } else {
                startCalibration();
            }
            break;

        case 'm':
            mirrorX = !mirrorX;
            calibrationData.mirror = mirrorX;
            saveCalibration();
            break;

        case 'd':
            DOM.debugOverlay.classList.toggle('hidden');
            break;

        case 'r':
            channel.send(MSG.RESET);
            gsm.reset();
            break;

        case 'h':
            DOM.kbHelp.classList.toggle('hidden');
            break;

        case '1':
            if (gsm.phase === PHASE.SCENE_SELECT) selectScene('office');
            break;
        case '2':
            if (gsm.phase === PHASE.SCENE_SELECT) selectScene('mall');
            break;
        case '3':
            if (gsm.phase === PHASE.SCENE_SELECT) selectScene('school');
            break;

        case 'escape':
            if (calibrating) endCalibration();
            break;
    }
}

// ===== INITIALIZATION =====
window.addEventListener('DOMContentLoaded', () => {
    // Cache DOM
    DOM.loadingOverlay = document.getElementById('loading-overlay');
    DOM.sceneSelect = document.getElementById('scene-select');
    DOM.sceneCards = document.getElementById('scene-cards');
    DOM.toolScreen = document.getElementById('tool-screen');
    DOM.toolSceneLabel = document.getElementById('tool-scene-label');
    DOM.toolSceneDesc = document.getElementById('tool-scene-desc');
    DOM.startPrompt = document.getElementById('start-prompt');
    DOM.startBtn = document.getElementById('start-btn');
    DOM.toolGrid = document.getElementById('tool-grid');
    DOM.toolProgress = document.getElementById('tool-progress');
    DOM.tpFill = document.getElementById('tp-fill');
    DOM.tpCount = document.getElementById('tp-count');
    DOM.tableSummary = document.getElementById('table-summary');
    DOM.tsTools = document.getElementById('ts-tools');
    DOM.handCursor = document.getElementById('hand-cursor');
    DOM.dwellRing = document.getElementById('dwell-ring');
    DOM.dwellProgress = document.getElementById('dwell-progress');
    DOM.calibrationOverlay = document.getElementById('calibration-overlay');
    DOM.debugOverlay = document.getElementById('debug-overlay');
    DOM.kbHelp = document.getElementById('kb-help');

    // Scale
    scaleToFit();
    window.addEventListener('resize', scaleToFit);

    // Start button
    DOM.startBtn.addEventListener('click', () => {
        if (gsm.phase === PHASE.OVERLOAD) {
            channel.send(MSG.START);
            gsm.startScene();
        }
    });

    // Another scene button
    document.getElementById('btn-another').addEventListener('click', () => {
        channel.send(MSG.RESET);
        gsm.reset();
    });

    // Calibration click
    DOM.calibrationOverlay.addEventListener('click', onCalibrationClick);

    // Keyboard
    window.addEventListener('keydown', onKeyDown);

    // Connect BroadcastChannel
    channel = new SenSimChannel(handleMessage);
    channel.send(MSG.READY, { screen: 'table' });

    // Build scene selector
    buildSceneSelector();

    // Init MediaPipe
    initMediaPipe();

    // Show scene select (initial phase)
    gsm.transition(PHASE.SCENE_SELECT);
});
