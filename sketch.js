/**
 * p5.js sketch in instance mode.
 */
const sketch = (p) => {
    // --- State Variables ---
    // We declare them here, but initialize them in resetSimulation()
    let HFDSState, driverState, warningLevel, distractionTimer, mrmActive, faultActive;
    let areLaneMarkingsVisible;

    // --- System Parameters ---
    let vehicleSpeed = 80;
    let isRoadSupported = true;
    let mapFreshness = 12;
    
    // --- Motion Variables ---
    let roadOffset = 0;
    const roadSpeed = 5; // Pixels per frame

    // --- Resize Fix Variables ---
    let lastWidth = 0;
    let lastHeight = 0;
    
    // --- Scenario 5 Security Manager (runs in background) ---
    const SecurityManager = {
        acl: {
            'ENGAGE': ['DriverAssist'],
            'MANUAL_OVERRIDE': ['DriverInput'],
            'ABORT_FAULT': ['SystemMonitor'],
            'ABORT_INATTENTION': ['DriverAttentionSystem']
        },
        authorize: function(command, origin) {
            if (this.acl[command] && this.acl[command].includes(origin)) {
                logToScreen(`ALLOW: Command '${command}' from '${origin}' authorized.`, 'allow');
                return true;
            } else {
                logToScreen(`DENY: Command '${command}' from '${origin}' rejected.`, 'deny');
                return false;
            }
        }
    };

    // --- [NEW FUNCTION] ---
    // This function resets all simulation variables to their default state
    function resetSimulation() {
        HFDSState = 'Off';
        driverState = 'Attentive';
        warningLevel = 0;
        distractionTimer = 0.0;
        mrmActive = false;
        faultActive = false;
        areLaneMarkingsVisible = true;
        roadOffset = 0;
        
        checkEligibility(); // Check if system should be 'Eligible'
        logToScreen("Simulation Reset.", "sim");
    }
    // --- [END OF NEW FUNCTION] ---


    // --- p5.js Setup ---
    p.setup = () => {
        const holder = document.getElementById('sketch-holder');
        const canvas = p.createCanvas(holder.clientWidth, holder.clientHeight);
        canvas.parent('sketch-holder');
        p.textSize(16);
        p.textFont('Arial');
        
        // --- [MODIFIED] ---
        // Expose the reset function to the global 'window' object
        // so that app.js can call window.resetSimulation()
        window.resetSimulation = resetSimulation;
        
        // Call reset once to set the initial state
        resetSimulation();
        // --- [END OF MODIFICATION] ---
        
        // Store initial (likely 0) dimensions
        lastWidth = holder.clientWidth;
        lastHeight = holder.clientHeight;
    };

    // --- p5.js Draw Loop ---
    p.draw = () => {
        
        // --- [THE BUG FIX] ---
        // Check if the holder's size has changed (e.g., from 0x0 to its real size)
        const holder = document.getElementById('sketch-holder');
        if (holder.clientWidth > 0 && (holder.clientWidth !== lastWidth || holder.clientHeight !== lastHeight)) {
            p.resizeCanvas(holder.clientWidth, holder.clientHeight);
            lastWidth = holder.clientWidth;
            lastHeight = holder.clientHeight;
        }
        // --- [END OF FIX] ---

        p.background(40); // Dark grey road

        // --- Update Motion ---
        if (HFDSState === 'Engaged' && !mrmActive) {
            roadOffset = (roadOffset + roadSpeed); // Increment offset
        }

        // --- Draw Visuals ---
        drawLanes();
        drawCar();

        // --- Run Logic ---
        runSystemLogic();

        // --- Draw HMI ---
        drawHMI();
    };
    
    /**
     * --- drawLanes Function (MODIFIED for 3 Lanes) ---
     */
    function drawLanes() {
        if (!areLaneMarkingsVisible) return; // Exit if fault is active
        
        // Define lane positions
        const laneWidth = 100; // Define a width for our lanes
        const lineLeftmost = p.width / 2 - laneWidth * 1.5;
        const lineLeftMiddle = p.width / 2 - laneWidth * 0.5;
        const lineRightMiddle = p.width / 2 + laneWidth * 0.5;
        const lineRightmost = p.width / 2 + laneWidth * 1.5;

        // 1. Draw solid outer lines (left and right)
        p.stroke(255);
        p.strokeWeight(5);
        p.drawingContext.setLineDash([]); // Ensure solid
        p.line(lineLeftmost, 0, lineLeftmost, p.height);
        p.line(lineRightmost, 0, lineRightmost, p.height);

        // 2. Draw moving dashed inner lines
        const dashLength = 40;
        const gapLength = 20;
        const segmentLength = dashLength + gapLength; // Total length of one dash + one gap
        const numSegments = p.ceil(p.height / segmentLength) + 1;
        
        // Use modulo to wrap the offset, creating a seamless loop
        const yOffset = roadOffset % segmentLength;

        for (let i = -1; i < numSegments; i++) { // Start from -1 to draw segment scrolling in
            const y1 = (i * segmentLength) + yOffset;
            const y2 = y1 + dashLength;
            
            // Draw the two inner dashed lines
            p.line(lineLeftMiddle, y1, lineLeftMiddle, y2);
            p.line(lineRightMiddle, y1, lineRightMiddle, y2);
        }
    }
    
    function drawCar() {
        p.fill(0, 150, 255);
        p.noStroke();
        p.rectMode(p.CENTER);
        // Car is static at p.width / 2, which is the center of the middle lane
        p.rect(p.width / 2, p.height - 80, 80, 130);
    }

    // --- p5.js Key-Press Handler ---
    p.keyTyped = () => {
        // Prevent key presses from being read if the canvas isn't in view
        if (lastWidth === 0) return; 

        if (mrmActive) {
            if (p.key === 's') { 
                if (SecurityManager.authorize('MANUAL_OVERRIDE', 'DriverInput')) {
                    manualOverride();
                }
            }
            return;
        }

        switch (p.key) {
            case 'a': // Scenario 1: Activate
                if (HFDSState === 'Eligible') {
                    if (SecurityManager.authorize('ENGAGE', 'DriverAssist')) {
                        HFDSState = 'Engaged';
                        warningLevel = 0;
                        distractionTimer = 0;
                    }
                }
                break;
            case 'd': // Scenario 1: Inattention
                if (driverState === 'Attentive' && HFDSState === 'Engaged') {
                    driverState = 'Distracted';
                    distractionTimer = 0;
                }
                break;
            case 'l': // Scenario 1: Reset Inattention
                driverState = 'Attentive';
                break;
            case 's': // Scenario 3: Manual Override
                if (SecurityManager.authorize('MANUAL_OVERRIDE', 'DriverInput')) {
                    manualOverride();
                }
                break;
            case 'f': // Scenario 2: System Fault
                if (!faultActive) { // Only trigger if not already faulted
                    areLaneMarkingsVisible = false;
                    faultActive = true;
                    logToScreen("SIM: FAULT TRIGGERED. Lane markings lost.", "sim");
                }
                break;
            case 'r': // Scenario 2: Repair Fault
                if (faultActive) { // Only repair if faulted
                    areLaneMarkingsVisible = true;
                    faultActive = false;
                    logToScreen("SIM: Fault Cleared. Lane markings visible.", "sim");
                    checkEligibility();
                }
                break;
        }
    };
    
    // This function is still useful for resizing the browser window
    p.windowResized = () => {
        const holder = document.getElementById('sketch-holder');
        // Check if holder is visible before resizing
        if (holder.clientWidth > 0 && holder.clientHeight > 0) {
             p.resizeCanvas(holder.clientWidth, holder.clientHeight);
             lastWidth = holder.clientWidth;
             lastHeight = holder.clientHeight;
        }
    };

    // --- Core System Logic Functions ---

    function runSystemLogic() {
        if (mrmActive) return;

        // Scenario 2: System Fault Check
        if (HFDSState === 'Engaged' && faultActive) {
            if (SecurityManager.authorize('ABORT_FAULT', 'SystemMonitor')) {
                triggerFaultAbort("Lane Markings Lost");
            }
        }

        // Scenario 1 (Inattention):
        if (HFDSState === 'Engaged' && driverState === 'Distracted') {
            distractionTimer += p.deltaTime / 1000.0;

            if (distractionTimer > 5 && warningLevel === 0) warningLevel = 1;
            if (distractionTimer > 10 && warningLevel === 1) warningLevel = 2;
            if (distractionTimer > 15 && warningLevel === 2) warningLevel = 3;
            if (distractionTimer > 20 && warningLevel === 3) {
                if (SecurityManager.authorize('ABORT_INATTENTION', 'DriverAttentionSystem')) {
                    abortHFDS("Driver Unresponsive");
                }
            }
        }

        if (driverState === 'Attentive') {
            distractionTimer = 0;
            if (warningLevel > 0) warningLevel = 0;
        }
    }

    function checkEligibility() {
        if (faultActive) {
            HFDSState = 'Off';
            return;
        }
        if (vehicleSpeed >= 72 && vehicleSpeed <= 130 && isRoadSupported && mapFreshness < 24) {
            if (HFDSState === 'Off') HFDSState = 'Eligible';
        } else {
            HFDSState = 'Off';
        }
    }
    
    function manualOverride() {
        logToScreen("SIM: Driver has taken manual control.", "sim");
        HFDSState = 'Off';
        mrmActive = false;
        warningLevel = 0;
        distractionTimer = 0;
        checkEligibility();
    }

    function abortHFDS(reason) {
        logToScreen(`SIM: ABORTING HFDS: ${reason}. MRM Initiated.`, "sim");
        HFDSState = 'Aborting';
        warningLevel = 0;
        mrmActive = true;
    }

    function triggerFaultAbort(reason) {
        logToScreen(`SIM: SYSTEM FAULT: ${reason}. Relinquishing control.`, "sim");
        HFDSState = 'Fault';
        warningLevel = 0;
        mrmActive = false;
    }

    // --- HMI Drawing Function ---
    function drawHMI() {
        p.push(); // Save current drawing style
        
        // --- HMI Status Panel ---
        let statusText = `HFDS Status: ${HFDSState}`;
        let statusColor = p.color(255);

        if (HFDSState === 'Engaged') {
            statusColor = p.color(0, 255, 0); // Green
            statusText = 'HFDS Status: Active';
        } else if (HFDSState === 'Eligible') {
            statusColor = p.color(173, 216, 230); // Light blue
            statusText = 'HFDS Status: Ready';
        } else if (HFDSState === 'Off') {
            statusColor = p.color(150);
            statusText = 'HFDS Status: Unavailable / Manual';
        } else if (HFDSState === 'Fault') {
            statusColor = p.color(255, 165, 0); // Orange
            statusText = 'HFDS Status: FAULT. Take Control.';
        } else if (HFDSState === 'Aborting') {
            statusColor = p.color(255, 0, 0); // Red
            statusText = 'HFDS Status: ABORTING';
        }
        
        p.fill(statusColor);
        p.noStroke();
        p.textAlign(p.LEFT, p.TOP);
        p.textSize(20);
        p.text(statusText, 10, 10);

        // --- Driver Status ---
        let driverText = `Driver Status: ${driverState}`;
        let driverColor = (driverState === 'Attentive') ? p.color(255) : p.color(255, 200, 0);
        p.fill(driverColor);
        p.textSize(16);
        p.text(driverText, 10, 40);
        if (driverState === 'Distracted') {
            p.text(`Timer: ${distractionTimer.toFixed(1)}s`, 10, 60);
        }

        // --- Warning Display ---
        let warningText = '';
        let warningColor = p.color(255, 255, 0); // Yellow
        
        switch(warningLevel) {
            case 1: warningText = "VISUAL: Eyes on Road!"; break;
            case 2: warningText = "AUDIO: Eyes on Road!"; break;
            case 3: warningText = "HAPTIC: Take Control Now!"; warningColor = p.color(255, 0, 0); break;
        }
        
        if (warningLevel > 0) {
            p.fill(warningColor);
            p.textAlign(p.CENTER, p.CENTER);
            p.textSize(24);
            p.text(warningText, p.width / 2, p.height / 2);
        }

        // --- MRM Display ---
        if (mrmActive) {
            p.fill(255, 0, 0);
            p.textAlign(p.CENTER, p.CENTER);
            p.textSize(30);
            p.text("MINIMUM RISK MANEUVER\nVehicle Stopping", p.width / 2, p.height / 2 - 50);
        }
        
        p.pop(); // Restore original drawing style
    }
};

// Create the p5.js instance, attaching it to the 'sketch-holder' div
let myp5 = new p5(sketch, 'sketch-holder');