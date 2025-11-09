// --- Page Navigation ---

const pages = ['page-home', 'page-simulation'];
const scenarioButtons = ['btn-s1', 'btn-s2', 'btn-s3']; // Simplified

function showPage(pageId) {
    pages.forEach(id => {
        document.getElementById(id).classList.add('hidden');
    });
    document.getElementById(pageId).classList.remove('hidden');
}

const scenarioInstructions = {
    's1': {
        title: "Scenario 1: Activation & Inattention",
        steps: [
            "<strong>Precondition:</strong> The HMI shows 'Ready'.",
            "<strong>Action 1:</strong> Press <code>a</code> to activate HFDS. The HMI will show 'Active' and the lane markings will start moving.",
            "<strong>Action 2:</strong> Press <code>d</code> to simulate looking away ('Distracted').",
            "<strong>Result (5s):</strong> 'VISUAL' warning appears.",
            "<strong>Result (10s):</strong> 'AUDIO' warning appears.",
            "<strong>Result (15s):</strong> 'HAPTIC' warning appears.",
            "<strong>Result (20s):</strong> System aborts into 'Minimum Risk Maneuver' (MRM).",
            "<strong>To Reset:</strong> Press <code>l</code> (look back) to clear warnings. If in MRM, press <code>s</code>."
        ]
    },
    's2': {
        title: "Scenario 2: System Fault",
        steps: [
            "<strong>Action 1:</strong> First, press <code>a</code> to activate the system.",
            "<strong>Action 2:</strong> Press <code>f</code> to simulate a lane marking fault.",
            "<strong>Result:</strong> The HMI will show 'FAULT DETECTED', and the road lines will disappear. Motion stops.",
            "<strong>Action 3:</strong> Press <code>f</code> again to 'fix' the fault.",
            "<strong>Action 4:</strong> Press <code>s</code> (Manual Override) to reset the system. It will return to 'Ready'."
        ]
    },
    's3': {
        title: "Scenario 3: Manual Override",
        steps: [
            "<strong>Action 1:</strong> First, press <code>a</code> to activate the system.",
            "<strong>Action 2:</strong> At any time, press <code>s</code> (simulates grabbing the wheel).",
            "<strong>Result:</strong> The system immediately returns to 'Ready' status. Motion stops.",
            "<strong>Log:</strong> The Security Log will show an 'ALLOW' for 'MANUAL_OVERRIDE'."
        ]
    }
};

function showScenario(scenarioId) {
    // --- [NEW CODE ADDED] ---
    // This calls the reset function in sketch.js
    if (window.resetSimulation) {
        window.resetSimulation();
    }
    // --- [END OF NEW CODE] ---

    const instructionsEl = document.getElementById('scenario-instructions');
    const scenario = scenarioInstructions[scenarioId];
    
    let html = `<h3 class="text-xl font-bold text-white mb-3">${scenario.title}</h3>`;
    html += '<ul class="space-y-2 text-gray-300">';
    scenario.steps.forEach(step => {
        html += `<li class="flex items-start"><span class="mr-2 mt-1.5">&#9679;</span><span>${step}</span></li>`;
    });
    html += '</ul>';
    instructionsEl.innerHTML = html;

    // Update button active state
    scenarioButtons.forEach(id => {
        document.getElementById(id).classList.remove('active');
    });
    document.getElementById(`btn-${scenarioId}`).classList.add('active');
}

function logToScreen(message, type = 'sim') {
    const logEl = document.getElementById('console-log');
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = document.createElement('div');
    
    logEntry.innerHTML = `[${timestamp}] ${message}`;
    logEntry.classList.add(`log-${type}`);
    
    logEl.appendChild(logEntry);
    logEl.scrollTop = logEl.scrollHeight; // Auto-scroll to bottom
}

function clearLog() {
    document.getElementById('console-log').innerHTML = '';
    logToScreen("Log Cleared.", "sim");
}

// Set default page and scenario
document.addEventListener('DOMContentLoaded', () => {
    showPage('page-home');
    showScenario('s1'); // Pre-load instructions for scenario 1
    logToScreen("HFDS Prototype Initialized.", "sim");
    logToScreen("Security Manager is Active.", "sim");
});