/* =========================================================
   SenSim - TV Screen Script
   AudioEngine, scene management, BroadcastChannel listener
   ========================================================= */

// ===== STATE =====
const gsm = new GameStateMachine(onPhaseChange);
let channel = null;
let audioEngine = null;

// ===== DOM =====
const DOM = {};

// ===== AUDIO ENGINE =====
class AudioEngine {
    constructor() {
        this.ctx = getAudioCtx();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.6;
        this.master.connect(this.ctx.destination);

        // Per-layer gain nodes
        this.layers = {};
        this.oscillators = [];
        this.noiseNodes = [];
        this.intervals = [];
        this.running = false;
    }

    createLayer(name, vol = 0.5) {
        const gain = this.ctx.createGain();
        gain.gain.value = vol;
        gain.connect(this.master);
        this.layers[name] = gain;
        return gain;
    }

    createNoise(layer, vol = 0.1) {
        const bufferSize = this.ctx.sampleRate * 2;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1);
        }
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;

        const gain = this.ctx.createGain();
        gain.gain.value = vol;

        // Low-pass filter for murmur
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 800;

        source.connect(filter);
        filter.connect(gain);
        gain.connect(layer);
        source.start();
        this.noiseNodes.push({ source, gain, filter });
        return { source, gain, filter };
    }

    createOsc(layer, freq, type = 'sine', vol = 0.1) {
        const osc = this.ctx.createOscillator();
        osc.type = type;
        osc.frequency.value = freq;

        const gain = this.ctx.createGain();
        gain.gain.value = vol;

        osc.connect(gain);
        gain.connect(layer);
        osc.start();
        this.oscillators.push({ osc, gain });
        return { osc, gain };
    }

    // Start scene-specific audio profile
    startScene(sceneId) {
        this.stopAll();
        this.running = true;

        switch (sceneId) {
            case 'office': this._startOffice(); break;
            case 'mall': this._startMall(); break;
            case 'school': this._startSchool(); break;
        }
    }

    _startOffice() {
        // Layer: fluorescent hum (120Hz buzz)
        const humLayer = this.createLayer('flicker', 0.4);
        this.createOsc(humLayer, 120, 'sawtooth', 0.04);
        this.createOsc(humLayer, 240, 'sine', 0.02);

        // Layer: phone ringing
        const phoneLayer = this.createLayer('phone', 0.5);
        const phoneOsc = this.createOsc(phoneLayer, 440, 'square', 0);
        const phoneOsc2 = this.createOsc(phoneLayer, 480, 'square', 0);

        // Phone rings in bursts
        let phoneOn = false;
        const phoneInterval = setInterval(() => {
            if (!this.running) return;
            phoneOn = !phoneOn;
            const vol = phoneOn ? 0.06 : 0;
            phoneOsc.gain.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.05);
            phoneOsc2.gain.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.05);
        }, 500);
        // Ring pattern: on 2s, off 3s
        const ringPattern = setInterval(() => {
            if (!this.running) return;
            phoneOsc.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
            phoneOsc2.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
            setTimeout(() => {
                if (!this.running) return;
                phoneOsc.gain.gain.setTargetAtTime(0.06, this.ctx.currentTime, 0.05);
                phoneOsc2.gain.gain.setTargetAtTime(0.06, this.ctx.currentTime, 0.05);
            }, 3000);
        }, 5000);
        this.intervals.push(phoneInterval, ringPattern);

        // Layer: keyboard clatter
        const kbLayer = this.createLayer('keyboard', 0.3);
        const kbInterval = setInterval(() => {
            if (!this.running) return;
            const freq = 2000 + Math.random() * 4000;
            const osc = this.ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freq;
            const g = this.ctx.createGain();
            g.gain.value = 0.02 + Math.random() * 0.02;
            g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);
            osc.connect(g);
            g.connect(kbLayer);
            osc.start();
            osc.stop(this.ctx.currentTime + 0.05);
        }, 80 + Math.random() * 120);
        this.intervals.push(kbInterval);

        // Layer: chatter / murmur
        const chatterLayer = this.createLayer('chatter', 0.5);
        this.createNoise(chatterLayer, 0.06);

        // Layer: printer
        const printerLayer = this.createLayer('printer', 0.3);
        const printerNoise = this.createNoise(printerLayer, 0.03);
        printerNoise.filter.frequency.value = 400;
    }

    _startMall() {
        // Layer: crowd noise
        const crowdLayer = this.createLayer('crowd', 0.5);
        const crowdNoise = this.createNoise(crowdLayer, 0.08);
        crowdNoise.filter.frequency.value = 1200;

        // Layer: PA announcements (periodic tone)
        const paLayer = this.createLayer('pa', 0.4);
        const paOsc = this.createOsc(paLayer, 660, 'sine', 0);
        const paInterval = setInterval(() => {
            if (!this.running) return;
            // PA chime
            paOsc.gain.gain.setTargetAtTime(0.08, this.ctx.currentTime, 0.1);
            setTimeout(() => {
                paOsc.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.3);
            }, 800);
        }, 8000);
        this.intervals.push(paInterval);
        // Initial PA chime
        setTimeout(() => {
            if (!this.running) return;
            paOsc.gain.gain.setTargetAtTime(0.08, this.ctx.currentTime, 0.1);
            setTimeout(() => paOsc.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.3), 800);
        }, 2000);

        // Layer: music (simple beat)
        const musicLayer = this.createLayer('music', 0.4);
        this.createOsc(musicLayer, 80, 'square', 0.04);
        this.createOsc(musicLayer, 160, 'sawtooth', 0.02);

        // Layer: neon buzz
        const neonLayer = this.createLayer('neon', 0.3);
        this.createOsc(neonLayer, 120, 'sawtooth', 0.02);

        // Layer: movement / footsteps
        const moveLayer = this.createLayer('movement', 0.3);
        const stepInterval = setInterval(() => {
            if (!this.running) return;
            const freq = 100 + Math.random() * 200;
            const osc = this.ctx.createOscillator();
            osc.type = 'triangle';
            osc.frequency.value = freq;
            const g = this.ctx.createGain();
            g.gain.value = 0.02;
            g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
            osc.connect(g);
            g.connect(moveLayer);
            osc.start();
            osc.stop(this.ctx.currentTime + 0.1);
        }, 300 + Math.random() * 200);
        this.intervals.push(stepInterval);
    }

    _startSchool() {
        // Layer: fluorescent buzz
        const buzzLayer = this.createLayer('flicker', 0.4);
        this.createOsc(buzzLayer, 120, 'sawtooth', 0.03);
        this.createOsc(buzzLayer, 180, 'triangle', 0.015);

        // Layer: bell ringing (periodic)
        const bellLayer = this.createLayer('bell', 0.5);
        const bellOsc = this.createOsc(bellLayer, 880, 'sine', 0);
        const bellOsc2 = this.createOsc(bellLayer, 1320, 'sine', 0);
        const bellInterval = setInterval(() => {
            if (!this.running) return;
            bellOsc.gain.gain.setTargetAtTime(0.1, this.ctx.currentTime, 0.02);
            bellOsc2.gain.gain.setTargetAtTime(0.05, this.ctx.currentTime, 0.02);
            setTimeout(() => {
                bellOsc.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.5);
                bellOsc2.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.5);
            }, 1500);
        }, 10000);
        this.intervals.push(bellInterval);
        // Initial bell
        setTimeout(() => {
            if (!this.running) return;
            bellOsc.gain.gain.setTargetAtTime(0.1, this.ctx.currentTime, 0.02);
            bellOsc2.gain.gain.setTargetAtTime(0.05, this.ctx.currentTime, 0.02);
            setTimeout(() => {
                bellOsc.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.5);
                bellOsc2.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.5);
            }, 1500);
        }, 1000);

        // Layer: student chatter
        const chatterLayer = this.createLayer('chatter', 0.5);
        this.createNoise(chatterLayer, 0.07);

        // Layer: chair scraping
        const scrapeLayer = this.createLayer('scraping', 0.3);
        const scrapeInterval = setInterval(() => {
            if (!this.running) return;
            const freq = 800 + Math.random() * 1500;
            const osc = this.ctx.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.value = freq;
            const g = this.ctx.createGain();
            g.gain.value = 0.03;
            g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
            osc.connect(g);
            g.connect(scrapeLayer);
            osc.start();
            osc.stop(this.ctx.currentTime + 0.15);
        }, 2000 + Math.random() * 3000);
        this.intervals.push(scrapeInterval);

        // Layer: hallway echo
        const echoLayer = this.createLayer('movement', 0.3);
        const echoNoise = this.createNoise(echoLayer, 0.04);
        echoNoise.filter.frequency.value = 600;
    }

    // Calm a specific layer
    calmLayer(targets) {
        for (const target of targets) {
            const layer = this.layers[target];
            if (layer) {
                layer.gain.setTargetAtTime(0.05, this.ctx.currentTime, 0.5);
            }
        }
    }

    // Restore a specific layer
    restoreLayer(targets) {
        for (const target of targets) {
            const layer = this.layers[target];
            if (layer) {
                layer.gain.setTargetAtTime(0.5, this.ctx.currentTime, 0.3);
            }
        }
    }

    // Calm everything (overall effect)
    calmAll() {
        this.master.gain.setTargetAtTime(0.15, this.ctx.currentTime, 1);
    }

    restoreAll() {
        this.master.gain.setTargetAtTime(0.6, this.ctx.currentTime, 0.3);
    }

    stopAll() {
        this.running = false;
        for (const { osc } of this.oscillators) {
            try { osc.stop(); } catch (e) {}
        }
        for (const { source } of this.noiseNodes) {
            try { source.stop(); } catch (e) {}
        }
        for (const id of this.intervals) {
            clearInterval(id);
        }
        this.oscillators = [];
        this.noiseNodes = [];
        this.intervals = [];
        this.layers = {};
    }
}

// ===== PHASE CHANGE HANDLER =====
function onPhaseChange(newPhase, prevPhase, data) {
    switch (newPhase) {
        case PHASE.SCENE_SELECT:
            showWaiting();
            break;
        case PHASE.OVERLOAD:
            showScene(data.sceneId);
            break;
        case PHASE.TOOL_ACTIVE:
            startChaos();
            break;
        case PHASE.SUMMARY:
            showSummary();
            break;
    }
}

// ===== SCREEN MANAGEMENT =====
function hideAllScreens() {
    DOM.waitingScreen.classList.add('hidden');
    DOM.sceneContainer.classList.add('hidden');
    DOM.summaryOverlay.classList.add('hidden');
    DOM.sceneLabel.classList.add('hidden');
    DOM.calmMeter.classList.add('hidden');
    DOM.toolInfo.classList.add('hidden');
}

function showWaiting() {
    hideAllScreens();
    DOM.waitingScreen.classList.remove('hidden');
    if (audioEngine) audioEngine.stopAll();
}

function showScene(sceneId) {
    hideAllScreens();

    // Hide all scenes, show target
    document.querySelectorAll('.scene').forEach(s => {
        s.classList.remove('active');
        s.removeAttribute('data-calm-level');
        s.classList.remove('calm-audio', 'calm-visual', 'calm-tactile', 'calm-overall');
    });

    const sceneEl = document.getElementById('scene-' + sceneId);
    if (sceneEl) sceneEl.classList.add('active');

    DOM.sceneContainer.classList.remove('hidden');

    // Scene label
    const sceneData = CONFIG.SCENES.find(s => s.id === sceneId);
    if (sceneData) {
        DOM.sceneLabelText.textContent = sceneData.label;
        DOM.sceneLabel.classList.remove('hidden');
        DOM.sceneLabel.style.borderColor = sceneData.color;
    }
}

function startChaos() {
    // Start audio engine for current scene
    if (!audioEngine) audioEngine = new AudioEngine();
    audioEngine.startScene(gsm.scene);

    // Show calm meter
    DOM.calmMeter.classList.remove('hidden');
    updateCalmMeter();
}

function updateCalmMeter() {
    const sd = gsm.sceneData;
    if (!sd) return;
    const total = sd.tools.length;
    const explored = gsm.exploredTools.size;
    const pct = Math.round((explored / total) * 100);
    DOM.calmFill.style.width = pct + '%';
    DOM.calmPct.textContent = pct + '%';

    // Update scene calm level attribute
    const sceneEl = document.getElementById('scene-' + gsm.scene);
    if (sceneEl) {
        sceneEl.setAttribute('data-calm-level', explored);
    }
}

// ===== TOOL ACTIVATION =====
function onToolActivated(toolId) {
    const sd = gsm.sceneData;
    if (!sd) return;

    const tool = sd.tools.find(t => t.id === toolId);
    if (!tool) return;

    gsm.activateTool(toolId);

    // Apply CSS calm class
    const sceneEl = document.getElementById('scene-' + gsm.scene);
    if (sceneEl) {
        sceneEl.classList.add('calm-' + tool.calmType);
    }

    // Calm audio layers
    if (audioEngine) {
        if (tool.calmType === 'overall') {
            audioEngine.calmAll();
        } else {
            audioEngine.calmLayer(tool.calmTargets);
        }
    }

    // Show tool info
    showToolInfo(tool);
    updateCalmMeter();
}

function onToolDeactivated(toolId) {
    const sd = gsm.sceneData;
    if (!sd) return;

    const tool = sd.tools.find(t => t.id === toolId);
    if (!tool) return;

    gsm.deactivateTool(toolId);

    // Check if any other active tool has same calmType
    const stillActive = [...gsm.activeTools].some(tid => {
        const t = sd.tools.find(x => x.id === tid);
        return t && t.calmType === tool.calmType;
    });

    if (!stillActive) {
        const sceneEl = document.getElementById('scene-' + gsm.scene);
        if (sceneEl) {
            sceneEl.classList.remove('calm-' + tool.calmType);
        }

        if (audioEngine) {
            if (tool.calmType === 'overall') {
                audioEngine.restoreAll();
            } else {
                audioEngine.restoreLayer(tool.calmTargets);
            }
        }
    }

    // Hide tool info
    DOM.toolInfo.classList.add('hidden');
}

function showToolInfo(tool) {
    DOM.toolInfoIcon.innerHTML = tool.svgIcon;
    DOM.toolInfoName.textContent = tool.name;
    DOM.toolInfoDesc.textContent = tool.description;
    DOM.toolInfo.classList.remove('hidden');
}

// ===== SUMMARY =====
function showSummary() {
    if (audioEngine) audioEngine.stopAll();

    const sd = gsm.sceneData;
    DOM.toolInfo.classList.add('hidden');

    // Build summary tool cards
    const container = DOM.summaryTools;
    container.innerHTML = '';
    if (sd) {
        for (const tool of sd.tools) {
            const card = document.createElement('div');
            card.className = 'summary-tool-card';
            card.innerHTML = `
                <div class="stc-icon">${tool.svgIcon}</div>
                <div class="stc-name">${tool.name}</div>
                <div class="stc-type">${tool.calmType} support</div>
            `;
            container.appendChild(card);
        }
    }

    DOM.summaryOverlay.classList.remove('hidden');
}

// ===== BROADCAST CHANNEL HANDLER =====
function handleMessage(data) {
    switch (data.type) {
        case MSG.SCENE_SELECTED:
            gsm.selectScene(data.sceneId);
            break;

        case MSG.START:
            gsm.startScene();
            break;

        case MSG.TOOL_ACTIVATED:
            onToolActivated(data.toolId);
            break;

        case MSG.TOOL_DEACTIVATED:
            onToolDeactivated(data.toolId);
            break;

        case MSG.ALL_COMPLETE:
            gsm.complete();
            break;

        case MSG.RESET:
            gsm.reset();
            break;
    }
}

// ===== INIT =====
window.addEventListener('DOMContentLoaded', () => {
    DOM.clickOverlay = document.getElementById('click-overlay');
    DOM.waitingScreen = document.getElementById('waiting-screen');
    DOM.sceneContainer = document.getElementById('scene-container');
    DOM.sceneLabel = document.getElementById('scene-label');
    DOM.sceneLabelText = document.getElementById('scene-label-text');
    DOM.calmMeter = document.getElementById('calm-meter');
    DOM.calmFill = document.getElementById('calm-fill');
    DOM.calmPct = document.getElementById('calm-pct');
    DOM.toolInfo = document.getElementById('tool-info');
    DOM.toolInfoIcon = document.getElementById('tool-info-icon');
    DOM.toolInfoName = document.getElementById('tool-info-name');
    DOM.toolInfoDesc = document.getElementById('tool-info-desc');
    DOM.summaryOverlay = document.getElementById('summary-overlay');
    DOM.summaryTools = document.getElementById('summary-tools');

    // Scale to fit
    scaleToFit();
    window.addEventListener('resize', scaleToFit);

    // Click overlay: init audio context on first click
    DOM.clickOverlay.addEventListener('click', () => {
        getAudioCtx(); // ensure audio is initialized
        DOM.clickOverlay.classList.add('hiding');
        setTimeout(() => {
            DOM.clickOverlay.classList.add('hidden');
            // Show waiting screen
            gsm.transition(PHASE.SCENE_SELECT);
        }, 600);
    });

    // Connect BroadcastChannel
    channel = new SenSimChannel(handleMessage);
    channel.send(MSG.READY, { screen: 'tv' });
});
