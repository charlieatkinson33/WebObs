// Display page JavaScript
let audioEnabled = true;
let heartRateInterval;
let spo2Interval;
let audioContext;
let heartRateBeepCount = 0;
let peer;
let connection;
let useLocalMode = false;
let peerAvailable = false;

// Waveform animation variables
let ecgCanvas, spo2Canvas, etco2Canvas;
let ecgCtx, spo2Ctx, etco2Ctx;
let ecgAnimationId, spo2AnimationId, etco2AnimationId;
let ecgOffset = 0;
let spo2Offset = 0;
let etco2Offset = 0;
let currentHeartRate = 75;

// Variability parameters for realistic waveforms
let baselineWander = 0;
let baselineWanderSpeed = 0.0000;
let ecgBeatVariation = 0;
let spo2AmplitudeVariation = 0;
let breathingCycleVariation = 0;

document.addEventListener('DOMContentLoaded', function() {
    // Initialize audio context
    initAudioContext();
    
    // Check if PeerJS is available
    if (typeof Peer !== 'undefined') {
        peerAvailable = true;
    } else {
        console.warn('PeerJS library not loaded. Internet mode unavailable.');
        // Hide internet connection option if PeerJS not available
        const internetOption = document.querySelector('.connection-option:first-child');
        if (internetOption) {
            internetOption.style.display = 'none';
        }
        const divider = document.querySelector('.connection-divider');
        if (divider) {
            divider.style.display = 'none';
        }
    }
    
    // Set up audio toggle
    const toggleAudioBtn = document.getElementById('toggleAudio');
    toggleAudioBtn.addEventListener('click', toggleAudio);
    
    // Set up connection buttons
    const connectBtn = document.getElementById('connectBtn');
    const localModeBtn = document.getElementById('localModeBtn');
    const sessionIdInput = document.getElementById('sessionIdInput');
    
    connectBtn.addEventListener('click', function() {
        if (!peerAvailable) {
            showConnectionStatus('PeerJS library not loaded. Please use Local Mode.', 'error');
            return;
        }
        const sessionId = sessionIdInput.value.trim();
        if (sessionId) {
            connectToSession(sessionId);
        } else {
            showConnectionStatus('Please enter a Session ID', 'error');
        }
    });
    
    localModeBtn.addEventListener('click', function() {
        useLocalMode = true;
        showMonitorDisplay();
        // Load and display vitals data from localStorage
        loadVitalsData();
        // Set up periodic refresh for local mode
        setInterval(loadVitalsData, 1000);
    });
    
    // Allow Enter key to connect
    sessionIdInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            connectBtn.click();
        }
    });
});

function initAudioContext() {
    // Create audio context (will be started on user interaction)
    if (window.AudioContext || window.webkitAudioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function connectToSession(sessionId) {
    showConnectionStatus('Connecting...', 'info');
    
    // Create peer connection
    peer = new Peer({
        debug: 0
    });
    
    peer.on('open', function(id) {
        console.log('Peer opened with ID:', id);
        
        // Connect to the control session
        connection = peer.connect(sessionId);
        
        connection.on('open', function() {
            console.log('Connected to control session');
            showConnectionStatus('Connected to control session!', 'success');
            setTimeout(showMonitorDisplay, 1000);
        });
        
        connection.on('data', function(data) {
            console.log('Received data:', data);
            updateVitalsDisplay(data);
        });
        
        connection.on('close', function() {
            console.log('Connection closed');
            updateConnectionIndicator(false);
        });
        
        connection.on('error', function(err) {
            console.error('Connection error:', err);
            showConnectionStatus('Connection error: ' + err.type, 'error');
        });
    });
    
    peer.on('error', function(err) {
        console.error('Peer error:', err);
        let errorMsg = 'Connection failed';
        if (err.type === 'peer-unavailable') {
            errorMsg = 'Session ID not found. Please check and try again.';
        } else if (err.type === 'network') {
            errorMsg = 'Network error. Please check your internet connection.';
        }
        showConnectionStatus(errorMsg, 'error');
    });
}

function showConnectionStatus(message, type) {
    const statusDiv = document.getElementById('connectionStatus');
    statusDiv.textContent = message;
    statusDiv.className = 'connection-status ' + type;
}

function showMonitorDisplay() {
    document.getElementById('sessionConnect').style.display = 'none';
    document.getElementById('monitorDisplay').style.display = 'block';
    updateConnectionIndicator(true);
    
    // Initialize canvases
    initializeCanvases();
    // Start waveform animations
    startWaveformAnimations();
}

function initializeCanvases() {
    ecgCanvas = document.getElementById('ecgCanvas');
    spo2Canvas = document.getElementById('spo2Canvas');
    etco2Canvas = document.getElementById('etco2Canvas');
    
    if (ecgCanvas) ecgCtx = ecgCanvas.getContext('2d');
    if (spo2Canvas) spo2Ctx = spo2Canvas.getContext('2d');
    if (etco2Canvas) etco2Ctx = etco2Canvas.getContext('2d');
    
    // Set canvas dimensions to match display size
    function resizeCanvas(canvas) {
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
    }
    
    resizeCanvas(ecgCanvas);
    resizeCanvas(spo2Canvas);
    resizeCanvas(etco2Canvas);
    
    // Handle window resize
    window.addEventListener('resize', function() {
        resizeCanvas(ecgCanvas);
        resizeCanvas(spo2Canvas);
        resizeCanvas(etco2Canvas);
    });
}

function startWaveformAnimations() {
    // Cancel any existing animations
    if (ecgAnimationId) cancelAnimationFrame(ecgAnimationId);
    if (spo2AnimationId) cancelAnimationFrame(spo2AnimationId);
    if (etco2AnimationId) cancelAnimationFrame(etco2AnimationId);
    
    // Start new animations
    animateECG();
    animateSpO2();
    animateEtCO2();
}

function animateECG() {
    if (!ecgCtx || !ecgCanvas) return;
    
    const width = ecgCanvas.width;
    const height = ecgCanvas.height;
    const centerY = height / 2;
    
    // ECG parameters (Gaussian model)
    const heartRateBPM = currentHeartRate || 75;
    const cycleTimeS = 60 / heartRateBPM; // seconds per beat
    const pixelsPerSecond = 50; // sweep speed
    const beatWidthPixels = cycleTimeS * pixelsPerSecond;
    
    // ECG component parameters (relative to R peak at t=0)
    const components = {
        P: { amp: 0.15, dur: 0.09, tCenter: -0.17 },
        Q: { amp: -0.20, dur: 0.02, tCenter: -0.025 },
        R: { amp: 1.60, dur: 0.03, tCenter: 0.0 },
        S: { amp: -0.30, dur: 0.04, tCenter: 0.045 },
        T: { amp: 0.35, dur: 0.16, tCenter: 0.24 }
    };
    
    // Amplitude scale (pixels per mV)
    const amplitudeScale = 25;
    
    // Animation speed
    const speed = 2;
    
    // Update baseline wander
    baselineWander = Math.sin(ecgOffset * 0.00002) * 2;
    
    // Update beat-to-beat variation (smoothly)
    if (Math.floor(ecgOffset) % Math.floor(beatWidthPixels) < speed) {
        ecgBeatVariation = (Math.random() - 0.5) * 0.05;
    }
    
    // Clear canvas
    ecgCtx.fillStyle = '#000';
    ecgCtx.fillRect(0, 0, width, height);
    
    // Draw grid
    ecgCtx.strokeStyle = '#0f0';
    ecgCtx.globalAlpha = 0.1;
    ecgCtx.lineWidth = 1;
    
    for (let x = 0; x < width; x += 20) {
        ecgCtx.beginPath();
        ecgCtx.moveTo(x, 0);
        ecgCtx.lineTo(x, height);
        ecgCtx.stroke();
    }
    
    for (let y = 0; y < height; y += 20) {
        ecgCtx.beginPath();
        ecgCtx.moveTo(0, y);
        ecgCtx.lineTo(width, y);
        ecgCtx.stroke();
    }
    
    ecgCtx.globalAlpha = 1.0;
    
    // Draw ECG waveform using Gaussian model
    ecgCtx.strokeStyle = '#0f0';
    ecgCtx.lineWidth = 2;
    ecgCtx.shadowBlur = 10;
    ecgCtx.shadowColor = '#0f0';
    ecgCtx.beginPath();
    
    for (let x = 0; x < width; x++) {
        const adjustedX = (x + ecgOffset) % beatWidthPixels;
        const tSeconds = (adjustedX / pixelsPerSecond) - (cycleTimeS * 0.2); // offset to center waveform
        
        // Sum of Gaussians for each component
        let ecgValue = 0;
        for (const [name, params] of Object.entries(components)) {
            const sigma = params.dur / 2.355; // FWHM to sigma
            const gaussian = params.amp * Math.exp(-0.5 * Math.pow((tSeconds - params.tCenter) / sigma, 2));
            ecgValue += gaussian;
        }
        
        // Apply beat-to-beat variation
        ecgValue *= (1 + ecgBeatVariation);
        
        // Add minimal noise for realism
        const noise = (Math.random() - 0.5) * 0.008;
        ecgValue += noise;
        
        // Convert to pixels
        const y = centerY - (ecgValue * amplitudeScale) + baselineWander;
        
        if (x === 0) {
            ecgCtx.moveTo(x, y);
        } else {
            ecgCtx.lineTo(x, y);
        }
    }
    
    ecgCtx.stroke();
    ecgCtx.shadowBlur = 0;
    
    ecgOffset += speed;
    // Use modulo to avoid discontinuities
    ecgOffset = ecgOffset % beatWidthPixels;
    
    ecgAnimationId = requestAnimationFrame(animateECG);
}

function animateSpO2() {
    if (!spo2Ctx || !spo2Canvas) return;
    
    const width = spo2Canvas.width;
    const height = spo2Canvas.height;
    const centerY = height / 2;
    
    // SpO2 plethysmograph parameters
    const heartRateBPM = currentHeartRate || 75;
    const cycleTimeS = 60 / heartRateBPM;
    const pixelsPerSecond = 50;
    const beatWidthPixels = cycleTimeS * pixelsPerSecond;
    
    // Plethysmograph parameters
    const upstrokeFraction = 0.18;
    const upstrokeSteepness = 14.0;
    const notchTimeFraction = 0.35;
    const notchDepth = 0.25;
    const reboundFraction = 0.45;
    const reboundHeight = 0.10;
    const diastolicTauFraction = 0.30;
    const acAmplitude = 35; // pixels
    const dcLevel = 20; // baseline offset
    
    // Animation speed
    const speed = 2;
    
    // Update amplitude variation (smoothly)
    if (Math.floor(spo2Offset) % Math.floor(beatWidthPixels) < speed) {
        spo2AmplitudeVariation = 0.95 + Math.random() * 0.1;
    }
    
    // Baseline drift
    const baselineDrift = Math.sin(spo2Offset * 0.003) * 1.5;
    
    // Clear canvas
    spo2Ctx.fillStyle = '#000';
    spo2Ctx.fillRect(0, 0, width, height);
    
    // Draw grid
    spo2Ctx.strokeStyle = '#ff0';
    spo2Ctx.globalAlpha = 0.1;
    spo2Ctx.lineWidth = 1;
    
    for (let x = 0; x < width; x += 20) {
        spo2Ctx.beginPath();
        spo2Ctx.moveTo(x, 0);
        spo2Ctx.lineTo(x, height);
        spo2Ctx.stroke();
    }
    
    for (let y = 0; y < height; y += 20) {
        spo2Ctx.beginPath();
        spo2Ctx.moveTo(0, y);
        spo2Ctx.lineTo(width, y);
        spo2Ctx.stroke();
    }
    
    spo2Ctx.globalAlpha = 1.0;
    
    // Draw SpO2 plethysmograph waveform
    spo2Ctx.strokeStyle = '#ff0';
    spo2Ctx.lineWidth = 2;
    spo2Ctx.shadowBlur = 10;
    spo2Ctx.shadowColor = '#ff0';
    spo2Ctx.beginPath();
    
    // Helper function: sigmoid/logistic function
    function sigmoid(x) {
        return 1 / (1 + Math.exp(-x));
    }
    
    for (let x = 0; x < width; x++) {
        const adjustedX = (x + spo2Offset) % beatWidthPixels;
        const t = adjustedX / beatWidthPixels; // normalized time [0, 1)
        
        let plethValue = 0;
        
        // Piecewise plethysmograph shape
        if (t < upstrokeFraction) {
            // Systolic upstroke: logistic rise
            const u = t / upstrokeFraction;
            const rawSigmoid = sigmoid(upstrokeSteepness * (u - 0.5));
            const minSig = sigmoid(upstrokeSteepness * (-0.5));
            const maxSig = sigmoid(upstrokeSteepness * 0.5);
            plethValue = (rawSigmoid - minSig) / (maxSig - minSig);
            
        } else if (t < notchTimeFraction) {
            // Early fall to dicrotic notch
            const fallProgress = (t - upstrokeFraction) / (notchTimeFraction - upstrokeFraction);
            plethValue = 1 - (notchDepth * fallProgress);
            
        } else if (t < reboundFraction) {
            // Notch rebound
            const reboundProgress = (t - notchTimeFraction) / (reboundFraction - notchTimeFraction);
            const yNotch = 1 - notchDepth;
            // Use cosine ease for smooth rebound
            const ease = (1 - Math.cos(reboundProgress * Math.PI)) / 2;
            plethValue = yNotch + (reboundHeight * ease);
            
        } else {
            // Diastolic decay: exponential tail
            const tauPixels = diastolicTauFraction * beatWidthPixels;
            const tElapsed = (t - reboundFraction) * beatWidthPixels;
            const yReb = 1 - notchDepth + reboundHeight;
            plethValue = yReb * Math.exp(-tElapsed / tauPixels);
        }
        
        // Apply amplitude variation
        plethValue *= spo2AmplitudeVariation;
        
        // Add minimal noise for realism
        const noise = (Math.random() - 0.5) * 0.008;
        plethValue += noise;
        
        // Clamp to [0, 1]
        plethValue = Math.max(0, Math.min(1, plethValue));
        
        // Convert to pixels
        const y = centerY + dcLevel - (plethValue * acAmplitude) + baselineDrift;
        
        if (x === 0) {
            spo2Ctx.moveTo(x, y);
        } else {
            spo2Ctx.lineTo(x, y);
        }
    }
    
    spo2Ctx.stroke();
    spo2Ctx.shadowBlur = 0;
    
    spo2Offset += speed;
    // Use modulo to avoid discontinuities
    spo2Offset = spo2Offset % beatWidthPixels;
    
    spo2AnimationId = requestAnimationFrame(animateSpO2);
}

function animateEtCO2() {
    if (!etco2Ctx || !etco2Canvas) return;
    
    const width = etco2Canvas.width;
    const height = etco2Canvas.height;
    const centerY = height / 2;
    
    // Update breathing cycle variation (breath-to-breath variability)
    if (etco2Offset % (width / 2) < 1.5) {
        breathingCycleVariation = 0.9 + Math.random() * 0.2; // 90-110% variation
    }
    
    // Clear canvas
    etco2Ctx.fillStyle = '#000';
    etco2Ctx.fillRect(0, 0, width, height);
    
    // Draw grid
    etco2Ctx.strokeStyle = '#fff';
    etco2Ctx.globalAlpha = 0.1;
    etco2Ctx.lineWidth = 1;
    
    for (let x = 0; x < width; x += 20) {
        etco2Ctx.beginPath();
        etco2Ctx.moveTo(x, 0);
        etco2Ctx.lineTo(x, height);
        etco2Ctx.stroke();
    }
    
    for (let y = 0; y < height; y += 20) {
        etco2Ctx.beginPath();
        etco2Ctx.moveTo(0, y);
        etco2Ctx.lineTo(width, y);
        etco2Ctx.stroke();
    }
    
    etco2Ctx.globalAlpha = 1.0;
    
    // Draw EtCO2 capnography waveform
    etco2Ctx.strokeStyle = '#fff';
    etco2Ctx.lineWidth = 2;
    etco2Ctx.shadowBlur = 10;
    etco2Ctx.shadowColor = '#fff';
    etco2Ctx.beginPath();
    
    const speed = 1.5;
    const breathsPerScreen = 2;
    const breathWidth = width / breathsPerScreen;
    
    for (let x = 0; x < width; x++) {
        const adjustedX = (x + etco2Offset) % breathWidth;
        const progress = adjustedX / breathWidth;
        
        // Add subtle noise to capnography
        const noise = (Math.random() - 0.5) * 0.6;
        
        let y = centerY + 30 + noise; // Baseline
        
        // Capnography wave - more realistic with rounded transitions
        if (progress >= 0.08 && progress < 0.18) {
            // Phase I - Beginning of exhalation (dead space)
            // Gradual rise from baseline
            const phase1Progress = (progress - 0.08) / 0.1;
            const riseShape = Math.pow(phase1Progress, 0.4); // Gradual start
            y = centerY + 30 - riseShape * 15 * breathingCycleVariation + noise;
        } else if (progress >= 0.18 && progress < 0.28) {
            // Phase II - Rapid rise (mixed dead space and alveolar gas)
            const phase2Progress = (progress - 0.18) / 0.1;
            // Exponential rise for realistic rapid increase
            const rapidRise = 15 + (25 * Math.pow(phase2Progress, 0.7));
            y = centerY + 30 - rapidRise * breathingCycleVariation + noise;
        } else if (progress >= 0.28 && progress < 0.50) {
            // Phase III - Alveolar plateau (slight upward slope)
            const phase3Progress = (progress - 0.28) / 0.22;
            // Slight upward slope during plateau (normal physiology)
            const plateauHeight = 40 + (phase3Progress * 3);
            y = centerY - 10 - (phase3Progress * 2) + noise * 1.5; // More noise in plateau
        } else if (progress >= 0.50 && progress < 0.62) {
            // Phase 0/IV - Beginning of inspiration (rapid drop but not instant)
            const phase0Progress = (progress - 0.50) / 0.12;
            // Smooth exponential decay for more realistic drop
            const fallShape = 1 - Math.pow(phase0Progress, 0.5);
            y = centerY - 10 + (1 - fallShape) * 40 * breathingCycleVariation + noise;
        }
        // Rest is baseline (inspiratory phase)
        
        if (x === 0) {
            etco2Ctx.moveTo(x, y);
        } else {
            etco2Ctx.lineTo(x, y);
        }
    }
    
    etco2Ctx.stroke();
    etco2Ctx.shadowBlur = 0;
    
    etco2Offset += speed;
    if (etco2Offset >= breathWidth) {
        etco2Offset = 0;
    }
    
    etco2AnimationId = requestAnimationFrame(animateEtCO2);
}

function updateConnectionIndicator(connected) {
    const indicator = document.getElementById('connectionIndicator');
    const text = document.getElementById('connectionText');
    
    if (connected) {
        indicator.className = 'indicator-dot connected';
        text.textContent = useLocalMode ? 'Local Mode' : 'Connected';
    } else {
        indicator.className = 'indicator-dot disconnected';
        text.textContent = 'Disconnected';
    }
}

function updateVitalsDisplay(vitalsData) {
    // Update display values
    document.getElementById('hrValue').textContent = vitalsData.heartRate;
    document.getElementById('spo2Value').textContent = vitalsData.spo2;
    document.getElementById('bpValue').textContent = `${vitalsData.bloodPressureSys}/${vitalsData.bloodPressureDia}`;
    document.getElementById('rrValue').textContent = vitalsData.respiratoryRate;
    
    // Store heart rate for waveform animation
    currentHeartRate = parseInt(vitalsData.heartRate) || 75;
    
    // Update observations
    const observationsContent = document.getElementById('observationsContent');
    if (vitalsData.observations && vitalsData.observations.trim() !== '') {
        observationsContent.innerHTML = `<p>${vitalsData.observations}</p>`;
    } else {
        observationsContent.innerHTML = '<p class="no-data">No observations recorded</p>';
    }
    
    // Update timestamp
    const timestamp = new Date(vitalsData.timestamp);
    document.getElementById('timestamp').textContent = `Last updated: ${timestamp.toLocaleString()}`;
    
    // Start beeping sounds if audio is enabled
    if (audioEnabled && audioContext) {
        startHeartRateBeep(parseInt(vitalsData.heartRate));
        startSpo2Beep(parseInt(vitalsData.spo2));
    }
}

function loadVitalsData() {
    // This function is used for local mode only
    if (!useLocalMode) {
        return;
    }
    
    const vitalsDataString = localStorage.getItem('vitalsData');
    
    if (!vitalsDataString) {
        return;
    }
    
    const vitalsData = JSON.parse(vitalsDataString);
    updateVitalsDisplay(vitalsData);
}

function startHeartRateBeep(bpm) {
    // Clear existing interval
    if (heartRateInterval) {
        clearInterval(heartRateInterval);
    }
    
    // Don't beep if heart rate is 0 or invalid
    if (!bpm || bpm <= 0) {
        return;
    }
    
    // Calculate interval in milliseconds (60000ms per minute / BPM)
    const interval = 60000 / bpm;
    
    // Play initial beep
    playHeartRateBeep();
    
    // Set up repeating beep
    heartRateInterval = setInterval(function() {
        playHeartRateBeep();
    }, interval);
}

function startSpo2Beep(spo2Value) {
    // Clear existing interval
    if (spo2Interval) {
        clearInterval(spo2Interval);
    }
    
    // Don't beep if SpO2 is 0 or invalid
    if (!spo2Value || spo2Value <= 0) {
        return;
    }
    
    // SpO2 beeps every 2 seconds
    playSpo2Beep();
    
    spo2Interval = setInterval(function() {
        playSpo2Beep();
    }, 2000);
}

function playHeartRateBeep() {
    if (!audioEnabled || !audioContext) {
        return;
    }
    
    // Resume audio context if needed (browsers require user interaction)
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    
    // Create oscillator for heart rate beep (lower pitch)
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Heart rate beep: 800 Hz, short duration
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    // Volume envelope
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
}

function playSpo2Beep() {
    if (!audioEnabled || !audioContext) {
        return;
    }
    
    // Resume audio context if needed
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    
    // Create oscillator for SpO2 beep (higher pitch)
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // SpO2 beep: 1200 Hz, medium duration
    oscillator.frequency.value = 1200;
    oscillator.type = 'sine';
    
    // Volume envelope
    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.15);
}

function toggleAudio() {
    audioEnabled = !audioEnabled;
    
    const audioIcon = document.getElementById('audioIcon');
    const audioText = document.getElementById('audioText');
    const audioBtn = document.getElementById('toggleAudio');
    
    if (audioEnabled) {
        audioIcon.textContent = '🔊';
        audioText.textContent = 'Sounds On';
        audioBtn.classList.remove('muted');
        
        // Resume audio context and restart beeps
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume();
        }
        
        // Reload vitals to restart beeps
        if (useLocalMode) {
            loadVitalsData();
        }
    } else {
        audioIcon.textContent = '🔇';
        audioText.textContent = 'Sounds Off';
        audioBtn.classList.add('muted');
        
        // Stop all beeps
        if (heartRateInterval) {
            clearInterval(heartRateInterval);
        }
        if (spo2Interval) {
            clearInterval(spo2Interval);
        }
    }
}
