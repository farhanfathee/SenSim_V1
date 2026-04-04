/* =========================================================
   SenSim - Shared Configuration & Utilities
   ========================================================= */

// ===== CONFIGURATION =====
const CONFIG = {
    CANVAS_W: 1920,
    CANVAS_H: 1080,
    DWELL_TIME: 500,        // ms to trigger tool activation
    SMOOTH_ALPHA: 0.3,      // pointer smoothing factor
    CHANNEL_NAME: 'sensim-sync',

    SCENES: [
        // ---- SCENE 1: OFFICE ----
        {
            id: 'office',
            label: 'Office / Workplace',
            description: 'Fluorescent flicker, phone ringing, keyboard clatter, coworker chatter',
            color: '#4ecdc4',
            tools: [
                {
                    id: 'headphones',
                    name: 'Noise-Canceling Headphones',
                    description: 'Filters out background noise like phone ringing and coworker chatter to manageable levels.',
                    calmTargets: ['phone', 'chatter', 'keyboard'],
                    calmType: 'audio',
                    svgIcon: `<svg viewBox="0 0 100 100"><path d="M25 55 Q25 25 50 20 Q75 25 75 55" stroke="currentColor" stroke-width="6" fill="none" stroke-linecap="round"/><rect x="18" y="50" width="14" height="24" rx="7" fill="currentColor"/><rect x="68" y="50" width="14" height="24" rx="7" fill="currentColor"/></svg>`
                },
                {
                    id: 'fidget',
                    name: 'Fidget Tool',
                    description: 'Provides tactile regulation to help maintain focus during overwhelming moments.',
                    calmTargets: ['anxiety', 'movement'],
                    calmType: 'tactile',
                    svgIcon: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="30" stroke="currentColor" stroke-width="5" fill="none"/><circle cx="50" cy="50" r="8" fill="currentColor"/><circle cx="50" cy="20" r="6" fill="currentColor"/><circle cx="76" cy="65" r="6" fill="currentColor"/><circle cx="24" cy="65" r="6" fill="currentColor"/></svg>`
                },
                {
                    id: 'sunglasses',
                    name: 'Sunglasses / Light Filter',
                    description: 'Reduces harsh fluorescent lighting that can cause headaches and visual overstimulation.',
                    calmTargets: ['flicker', 'brightness'],
                    calmType: 'visual',
                    svgIcon: `<svg viewBox="0 0 100 100"><path d="M15 45 H85" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><rect x="15" y="40" width="28" height="20" rx="10" fill="currentColor" opacity="0.7"/><rect x="57" y="40" width="28" height="20" rx="10" fill="currentColor" opacity="0.7"/><path d="M43 48 Q50 55 57 48" stroke="currentColor" stroke-width="3" fill="none"/></svg>`
                },
                {
                    id: 'breathing',
                    name: 'Breathing Exercise Card',
                    description: 'Guided 4-7-8 breathing calms the nervous system and reduces overall sensory stress.',
                    calmTargets: ['overall'],
                    calmType: 'overall',
                    svgIcon: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="28" stroke="currentColor" stroke-width="4" fill="none" opacity="0.5"/><circle cx="50" cy="50" r="18" stroke="currentColor" stroke-width="3" fill="none" opacity="0.7"/><circle cx="50" cy="50" r="8" fill="currentColor" opacity="0.8"/><path d="M50 22 L50 15 M50 78 L50 85 M22 50 L15 50 M78 50 L85 50" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`
                }
            ]
        },
        // ---- SCENE 2: SHOPPING MALL ----
        {
            id: 'mall',
            label: 'Shopping Mall',
            description: 'Crowd noise, PA announcements, music blaring, neon signs flashing',
            color: '#F5A623',
            tools: [
                {
                    id: 'earplugs',
                    name: 'Earplugs',
                    description: 'Dampens overwhelming crowd noise and PA announcements to a tolerable level.',
                    calmTargets: ['crowd', 'pa', 'music'],
                    calmType: 'audio',
                    svgIcon: `<svg viewBox="0 0 100 100"><ellipse cx="35" cy="50" rx="10" ry="16" fill="currentColor" opacity="0.8"/><ellipse cx="65" cy="50" rx="10" ry="16" fill="currentColor" opacity="0.8"/><path d="M35 34 Q35 28 40 28" stroke="currentColor" stroke-width="3" fill="none"/><path d="M65 34 Q65 28 60 28" stroke="currentColor" stroke-width="3" fill="none"/></svg>`
                },
                {
                    id: 'plushie',
                    name: 'Comfort Object / Plushie',
                    description: 'A self-soothing tactile anchor that provides grounding when feeling overwhelmed.',
                    calmTargets: ['anxiety', 'movement'],
                    calmType: 'tactile',
                    svgIcon: `<svg viewBox="0 0 100 100"><circle cx="50" cy="52" r="26" fill="currentColor" opacity="0.7"/><circle cx="38" cy="32" r="10" fill="currentColor" opacity="0.6"/><circle cx="62" cy="32" r="10" fill="currentColor" opacity="0.6"/><circle cx="44" cy="48" r="4" fill="var(--bg, #12122a)"/><circle cx="56" cy="48" r="4" fill="var(--bg, #12122a)"/><path d="M45 58 Q50 63 55 58" stroke="var(--bg, #12122a)" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`
                },
                {
                    id: 'tinted-glasses',
                    name: 'Tinted Glasses',
                    description: 'Reduces visual overstimulation from flashing neon signs and bright store displays.',
                    calmTargets: ['neon', 'brightness'],
                    calmType: 'visual',
                    svgIcon: `<svg viewBox="0 0 100 100"><path d="M15 48 H85" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><circle cx="35" cy="50" r="15" stroke="currentColor" stroke-width="4" fill="currentColor" opacity="0.3"/><circle cx="65" cy="50" r="15" stroke="currentColor" stroke-width="4" fill="currentColor" opacity="0.3"/><path d="M50 50 Q50 45 50 50" stroke="currentColor" stroke-width="3"/></svg>`
                },
                {
                    id: 'exit-plan',
                    name: 'Exit Plan Card',
                    description: 'Knowing your escape route reduces anxiety. Having a plan means you can leave when needed.',
                    calmTargets: ['overall'],
                    calmType: 'overall',
                    svgIcon: `<svg viewBox="0 0 100 100"><rect x="25" y="20" width="50" height="60" rx="4" stroke="currentColor" stroke-width="4" fill="none"/><path d="M55 50 L70 50 M65 44 L72 50 L65 56" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M50 30 L50 70" stroke="currentColor" stroke-width="3" stroke-dasharray="4 4"/></svg>`
                }
            ]
        },
        // ---- SCENE 3: SCHOOL ----
        {
            id: 'school',
            label: 'School',
            description: 'Bell ringing, student chatter, chair scraping, fluorescent buzz, hallway chaos',
            color: '#9b85c8',
            tools: [
                {
                    id: 'earmuffs',
                    name: 'Noise-Dampening Earmuffs',
                    description: 'Blocks sudden loud sounds like bells and shouting that trigger sensory overload.',
                    calmTargets: ['bell', 'chatter', 'scraping'],
                    calmType: 'audio',
                    svgIcon: `<svg viewBox="0 0 100 100"><path d="M25 55 Q25 25 50 20 Q75 25 75 55" stroke="currentColor" stroke-width="6" fill="none" stroke-linecap="round"/><ellipse cx="22" cy="55" rx="10" ry="16" fill="currentColor" opacity="0.8"/><ellipse cx="78" cy="55" rx="10" ry="16" fill="currentColor" opacity="0.8"/></svg>`
                },
                {
                    id: 'stress-ball',
                    name: 'Stress Ball',
                    description: 'A discreet fidget for the classroom that helps channel nervous energy productively.',
                    calmTargets: ['anxiety', 'movement'],
                    calmType: 'tactile',
                    svgIcon: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="25" fill="currentColor" opacity="0.7"/><path d="M35 42 Q50 35 65 42" stroke="rgba(255,255,255,0.3)" stroke-width="2" fill="none"/><path d="M35 50 Q50 43 65 50" stroke="rgba(255,255,255,0.3)" stroke-width="2" fill="none"/><path d="M35 58 Q50 51 65 58" stroke="rgba(255,255,255,0.3)" stroke-width="2" fill="none"/></svg>`
                },
                {
                    id: 'weighted-pad',
                    name: 'Weighted Lap Pad',
                    description: 'Proprioceptive deep pressure calms the nervous system like a gentle, steady hug.',
                    calmTargets: ['flicker', 'overall'],
                    calmType: 'visual',
                    svgIcon: `<svg viewBox="0 0 100 100"><rect x="22" y="35" width="56" height="35" rx="6" fill="currentColor" opacity="0.6"/><rect x="22" y="35" width="56" height="35" rx="6" stroke="currentColor" stroke-width="4" fill="none"/><line x1="36" y1="38" x2="36" y2="67" stroke="currentColor" stroke-width="2" opacity="0.4"/><line x1="50" y1="38" x2="50" y2="67" stroke="currentColor" stroke-width="2" opacity="0.4"/><line x1="64" y1="38" x2="64" y2="67" stroke="currentColor" stroke-width="2" opacity="0.4"/></svg>`
                },
                {
                    id: 'quiet-pass',
                    name: 'Quiet Pass Card',
                    description: 'Permission to take a sensory break. Stepping away to recharge is a valid coping strategy.',
                    calmTargets: ['overall'],
                    calmType: 'overall',
                    svgIcon: `<svg viewBox="0 0 100 100"><rect x="20" y="25" width="60" height="50" rx="8" stroke="currentColor" stroke-width="4" fill="none"/><path d="M38 45 L48 55 L65 38" stroke="currentColor" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`
                }
            ]
        }
    ]
};

// ===== BROADCAST CHANNEL MESSAGES =====
const MSG = {
    SCENE_SELECTED: 'SCENE_SELECTED',
    TOOL_ACTIVATED: 'TOOL_ACTIVATED',
    TOOL_DEACTIVATED: 'TOOL_DEACTIVATED',
    ALL_COMPLETE: 'ALL_COMPLETE',
    RESET: 'RESET',
    READY: 'READY',
    START: 'START'
};

// ===== BROADCAST CHANNEL WRAPPER =====
class SenSimChannel {
    constructor(onMessage) {
        this.channel = new BroadcastChannel(CONFIG.CHANNEL_NAME);
        this.channel.onmessage = (e) => {
            if (onMessage) onMessage(e.data);
        };
    }

    send(type, payload = {}) {
        this.channel.postMessage({ type, ...payload });
    }

    destroy() {
        this.channel.close();
    }
}

// ===== GAME STATE MACHINE =====
const PHASE = {
    WAITING: 'WAITING',
    SCENE_SELECT: 'SCENE_SELECT',
    OVERLOAD: 'OVERLOAD',
    TOOL_ACTIVE: 'TOOL_ACTIVE',
    SUMMARY: 'SUMMARY'
};

class GameStateMachine {
    constructor(onChange) {
        this._phase = PHASE.WAITING;
        this._scene = null;
        this._activeTools = new Set();
        this._exploredTools = new Set();
        this._onChange = onChange;
    }

    get phase() { return this._phase; }
    get scene() { return this._scene; }
    get activeTools() { return this._activeTools; }
    get exploredTools() { return this._exploredTools; }

    get sceneData() {
        if (!this._scene) return null;
        return CONFIG.SCENES.find(s => s.id === this._scene) || null;
    }

    get allExplored() {
        const sd = this.sceneData;
        return sd && this._exploredTools.size >= sd.tools.length;
    }

    transition(newPhase, data = {}) {
        const prev = this._phase;
        this._phase = newPhase;
        if (this._onChange) this._onChange(newPhase, prev, data);
    }

    selectScene(sceneId) {
        this._scene = sceneId;
        this._activeTools.clear();
        this._exploredTools.clear();
        this.transition(PHASE.OVERLOAD, { sceneId });
    }

    startScene() {
        this.transition(PHASE.TOOL_ACTIVE);
    }

    activateTool(toolId) {
        this._activeTools.add(toolId);
        this._exploredTools.add(toolId);
    }

    deactivateTool(toolId) {
        this._activeTools.delete(toolId);
    }

    complete() {
        this.transition(PHASE.SUMMARY);
    }

    reset() {
        this._phase = PHASE.WAITING;
        this._scene = null;
        this._activeTools.clear();
        this._exploredTools.clear();
        this.transition(PHASE.SCENE_SELECT);
    }
}

// ===== AUDIO UTILITIES =====
let _audioCtx = null;
function getAudioCtx() {
    if (!_audioCtx) {
        _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (_audioCtx.state === 'suspended') _audioCtx.resume();
    return _audioCtx;
}

function playTone(freq, duration, type = 'sine', vol = 0.15) {
    try {
        const ctx = getAudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.value = vol;
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + duration);
    } catch (e) { /* silent fail */ }
}

// ===== DISPLAY SCALING =====
function scaleToFit() {
    const scaleX = window.innerWidth / CONFIG.CANVAS_W;
    const scaleY = window.innerHeight / CONFIG.CANVAS_H;
    const scale = Math.min(scaleX, scaleY);
    document.body.style.zoom = scale;
}
