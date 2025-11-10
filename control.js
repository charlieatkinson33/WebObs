// Control page JavaScript
let peer;
let connections = [];
let sessionId = null;
let peerAvailable = false;

document.addEventListener('DOMContentLoaded', function() {
    // Check if PeerJS is available
    if (typeof Peer !== 'undefined') {
        peerAvailable = true;
        initializePeer();
    } else {
        // PeerJS not available - show informational message
        console.warn('PeerJS library not loaded. Internet mode unavailable. Using local mode only.');
        document.getElementById('sessionId').textContent = 'PeerJS library not loaded';
        document.getElementById('connectionStatus').textContent = '⚠️ Internet mode unavailable - check CDN access';
        document.getElementById('connectionStatus').className = 'status-warning';
    }
    
    const form = document.getElementById('vitalsForm');
    const successMessage = document.getElementById('successMessage');
    const copyBtn = document.getElementById('copySessionId');
    
    // Copy session ID to clipboard
    copyBtn.addEventListener('click', function() {
        if (sessionId) {
            navigator.clipboard.writeText(sessionId).then(function() {
                copyBtn.textContent = '✓';
                setTimeout(function() {
                    copyBtn.textContent = '📋';
                }, 2000);
            }).catch(function(err) {
                console.error('Failed to copy:', err);
            });
        }
    });
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Gather form data
        const vitalsData = {
            heartRate: document.getElementById('heartRate').value,
            spo2: document.getElementById('spo2').value,
            bloodPressureSys: document.getElementById('bloodPressureSys').value,
            bloodPressureDia: document.getElementById('bloodPressureDia').value,
            temperature: document.getElementById('temperature').value,
            respiratoryRate: document.getElementById('respiratoryRate').value,
            observations: document.getElementById('observations').value,
            timestamp: new Date().toISOString()
        };
        
        // Store data in localStorage for backwards compatibility
        localStorage.setItem('vitalsData', JSON.stringify(vitalsData));
        
        // Send data to all connected displays via WebRTC
        if (peerAvailable) {
            sendToAllConnections(vitalsData);
        }
        
        // Show success message
        successMessage.style.display = 'block';
        
        // Hide success message after 3 seconds
        setTimeout(function() {
            successMessage.style.display = 'none';
        }, 3000);
    });
});

function initializePeer() {
    // Generate a unique session ID
    sessionId = 'webobs-' + Math.random().toString(36).substr(2, 9);
    
    // Create peer with the session ID
    peer = new Peer(sessionId, {
        debug: 0 // Set to 2 for debugging
    });
    
    peer.on('open', function(id) {
        console.log('Peer opened with ID:', id);
        document.getElementById('sessionId').textContent = id;
        updateConnectionStatus();
    });
    
    peer.on('connection', function(conn) {
        console.log('New connection from display');
        connections.push(conn);
        
        conn.on('open', function() {
            console.log('Connection opened');
            updateConnectionStatus();
            
            // Send current vitals data if available
            const vitalsDataString = localStorage.getItem('vitalsData');
            if (vitalsDataString) {
                const vitalsData = JSON.parse(vitalsDataString);
                conn.send(vitalsData);
            }
        });
        
        conn.on('close', function() {
            console.log('Connection closed');
            connections = connections.filter(c => c !== conn);
            updateConnectionStatus();
        });
        
        conn.on('error', function(err) {
            console.error('Connection error:', err);
        });
    });
    
    peer.on('error', function(err) {
        console.error('Peer error:', err);
        document.getElementById('sessionId').textContent = 'Error: ' + err.type;
    });
}

function sendToAllConnections(data) {
    connections.forEach(function(conn) {
        if (conn.open) {
            conn.send(data);
        }
    });
}

function updateConnectionStatus() {
    const statusElement = document.getElementById('connectionStatus');
    const connectedCount = connections.filter(c => c.open).length;
    
    if (connectedCount > 0) {
        statusElement.textContent = `🟢 ${connectedCount} display(s) connected`;
        statusElement.className = 'status-connected';
    } else {
        statusElement.textContent = '⚫ No display connected';
        statusElement.className = 'status-disconnected';
    }
}
