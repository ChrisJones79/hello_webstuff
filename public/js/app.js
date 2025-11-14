/**
 * Frontend Application for PDE Dashboard
 * Handles UI interactions, API calls, and visualization
 */

// Global state
let currentPDE = null;
let currentSolution = null;
let chart = null;

// API Base URL
const API_BASE = '/api';

/**
 * Initialize the application when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', async () => {
    console.log('PDE Dashboard initializing...');
    
    // Load initial data
    await checkServiceStatus();
    await loadPDEList();
    
    // Set up periodic status updates
    setInterval(checkServiceStatus, 30000); // Update every 30 seconds
    
    console.log('PDE Dashboard ready!');
});

/**
 * Check and display service status
 */
async function checkServiceStatus() {
    try {
        const response = await fetch(`${API_BASE}/services/status`);
        const status = await response.json();
        
        updateServiceStatus('storage', status.storage);
        updateServiceStatus('pde', status.pdeService);
        updateServiceStatus('llm', status.llmService);
    } catch (error) {
        console.error('Error checking service status:', error);
        showError('Could not connect to server');
    }
}

/**
 * Update service status display
 */
function updateServiceStatus(service, status) {
    const card = document.getElementById(`${service}-status`);
    if (!card) return;
    
    const indicator = card.querySelector('.status-dot');
    const text = card.querySelector('.status-text');
    const details = card.querySelector('.status-details');
    
    if (status.healthy || status.available !== false) {
        indicator.classList.add('healthy');
        indicator.classList.remove('unhealthy');
        text.textContent = 'Healthy';
        text.className = 'status-text text-success';
    } else {
        indicator.classList.add('unhealthy');
        indicator.classList.remove('healthy');
        text.textContent = 'Unavailable';
        text.className = 'status-text text-danger';
    }
    
    // Display service-specific details
    let detailsHTML = '';
    if (service === 'storage') {
        detailsHTML = `PDEs: ${status.pdeCount || 0} | Solutions: ${status.solutionCount || 0}`;
    } else if (service === 'pde') {
        detailsHTML = `Methods: ${status.methods?.join(', ') || 'N/A'}`;
    } else if (service === 'llm') {
        if (status.available === false) {
            detailsHTML = `${status.message || 'Not available'}`;
        } else {
            detailsHTML = `Model: ${status.model || 'N/A'} | Endpoint: ${status.endpoint || 'N/A'}`;
        }
    }
    
    details.innerHTML = detailsHTML;
}

/**
 * Load and display PDE list
 */
async function loadPDEList() {
    const listContainer = document.getElementById('pde-list');
    
    try {
        const response = await fetch(`${API_BASE}/pdes`);
        const pdes = await response.json();
        
        if (pdes.length === 0) {
            listContainer.innerHTML = '<p class="loading">No PDEs yet. Create one to get started!</p>';
            return;
        }
        
        listContainer.innerHTML = pdes.map(pde => `
            <div class="pde-item" onclick="loadPDE('${pde.id}')">
                <div class="pde-item-name">${pde.name || 'Untitled PDE'}</div>
                <div class="pde-item-type">${pde.type || 'unknown'}</div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading PDEs:', error);
        listContainer.innerHTML = '<p class="loading text-danger">Error loading PDEs</p>';
    }
}

/**
 * Load a specific PDE into the editor
 */
async function loadPDE(id) {
    try {
        const response = await fetch(`${API_BASE}/pdes/${id}`);
        const pde = await response.json();
        
        currentPDE = pde;
        
        // Populate editor
        document.getElementById('pde-name').value = pde.name || '';
        document.getElementById('pde-type').value = pde.type || 'parabolic';
        document.getElementById('pde-description').value = pde.description || '';
        document.getElementById('pde-equation').value = pde.equation || '';
        document.getElementById('pde-initial').value = pde.initialCondition || 'gaussian';
        
        // Highlight active PDE in list
        document.querySelectorAll('.pde-item').forEach(item => {
            item.classList.remove('active');
        });
        event.target.closest('.pde-item').classList.add('active');
        
        // Load solutions if available
        await loadSolutions(id);
    } catch (error) {
        console.error('Error loading PDE:', error);
        showError('Failed to load PDE');
    }
}

/**
 * Show new PDE form (clear editor)
 */
function showNewPDEForm() {
    clearEditor();
    currentPDE = null;
}

/**
 * Clear the PDE editor
 */
function clearEditor() {
    document.getElementById('pde-name').value = '';
    document.getElementById('pde-type').value = 'parabolic';
    document.getElementById('pde-description').value = '';
    document.getElementById('pde-equation').value = '';
    document.getElementById('pde-initial').value = 'gaussian';
    currentPDE = null;
    
    document.querySelectorAll('.pde-item').forEach(item => {
        item.classList.remove('active');
    });
}

/**
 * Save PDE (create or update)
 */
async function savePDE() {
    const pdeData = {
        name: document.getElementById('pde-name').value,
        type: document.getElementById('pde-type').value,
        description: document.getElementById('pde-description').value,
        equation: document.getElementById('pde-equation').value,
        initialCondition: document.getElementById('pde-initial').value,
        boundaryConditions: { left: 0, right: 0, top: 0, bottom: 0 } // Default
    };
    
    if (!pdeData.name) {
        showError('Please enter a name for the PDE');
        return;
    }
    
    try {
        let response;
        if (currentPDE && currentPDE.id) {
            // Update existing PDE
            response = await fetch(`${API_BASE}/pdes/${currentPDE.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(pdeData)
            });
        } else {
            // Create new PDE
            response = await fetch(`${API_BASE}/pdes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(pdeData)
            });
        }
        
        const savedPDE = await response.json();
        currentPDE = savedPDE;
        
        showSuccess('PDE saved successfully!');
        await loadPDEList();
    } catch (error) {
        console.error('Error saving PDE:', error);
        showError('Failed to save PDE');
    }
}

/**
 * Solve the current PDE
 */
async function solvePDE() {
    if (!currentPDE) {
        showError('Please select or create a PDE first');
        return;
    }
    
    const params = {
        nx: parseInt(document.getElementById('param-nx').value),
        ny: parseInt(document.getElementById('param-ny').value),
        nt: parseInt(document.getElementById('param-nt').value)
    };
    
    showLoading('Solving PDE...');
    
    try {
        const response = await fetch(`${API_BASE}/pdes/${currentPDE.id}/solve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ params })
        });
        
        const solution = await response.json();
        currentSolution = solution;
        
        visualizeSolution(solution);
        displaySolutionInfo(solution);
        
        // Save solution to storage
        await saveSolution(currentPDE.id, solution);
        
        hideLoading();
        showSuccess('PDE solved successfully!');
    } catch (error) {
        console.error('Error solving PDE:', error);
        hideLoading();
        showError('Failed to solve PDE: ' + error.message);
    }
}

/**
 * Visualize the solution using Chart.js
 */
function visualizeSolution(solution) {
    const canvas = document.getElementById('solution-chart');
    const ctx = canvas.getContext('2d');
    
    // Destroy existing chart
    if (chart) {
        chart.destroy();
    }
    
    // Prepare data for visualization
    let chartData;
    
    if (solution.snapshots) {
        // Time-dependent solution - show final snapshot as heatmap-like representation
        const finalSnapshot = solution.snapshots[solution.snapshots.length - 1];
        chartData = prepareHeatmapData(finalSnapshot.data);
    } else if (solution.solution) {
        // Static solution (elliptic)
        chartData = prepareHeatmapData(solution.solution);
    }
    
    // Create line chart showing central cross-section
    chart = new Chart(ctx, {
        type: 'line',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                title: {
                    display: true,
                    text: `${currentPDE.name} - Solution Visualization`
                },
                legend: {
                    display: true
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Spatial Position'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Solution Value'
                    }
                }
            }
        }
    });
}

/**
 * Prepare heatmap data for visualization
 */
function prepareHeatmapData(data) {
    // Extract central horizontal and vertical slices
    const ny = data.length;
    const nx = data[0].length;
    const midY = Math.floor(ny / 2);
    const midX = Math.floor(nx / 2);
    
    const horizontalSlice = data[midY];
    const verticalSlice = data.map(row => row[midX]);
    
    return {
        labels: Array.from({ length: nx }, (_, i) => i),
        datasets: [
            {
                label: 'Horizontal Cross-section',
                data: horizontalSlice,
                borderColor: 'rgb(37, 99, 235)',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                tension: 0.1
            },
            {
                label: 'Vertical Cross-section',
                data: verticalSlice,
                borderColor: 'rgb(124, 58, 237)',
                backgroundColor: 'rgba(124, 58, 237, 0.1)',
                tension: 0.1
            }
        ]
    };
}

/**
 * Display solution information
 */
function displaySolutionInfo(solution) {
    const infoBox = document.getElementById('solution-info');
    const detailsDiv = document.getElementById('solution-details');
    
    let infoHTML = `
        <p><strong>Type:</strong> ${solution.type}</p>
        <p><strong>Method:</strong> ${solution.method}</p>
        <p><strong>Grid:</strong> ${solution.grid.nx} × ${solution.grid.ny}</p>
    `;
    
    if (solution.grid.nt) {
        infoHTML += `<p><strong>Time Steps:</strong> ${solution.grid.nt}</p>`;
    }
    
    if (solution.metadata) {
        infoHTML += `<p><strong>Metadata:</strong></p><pre>${JSON.stringify(solution.metadata, null, 2)}</pre>`;
    }
    
    detailsDiv.innerHTML = infoHTML;
    infoBox.style.display = 'block';
}

/**
 * Save solution to storage
 */
async function saveSolution(pdeId, solution) {
    try {
        await fetch(`${API_BASE}/pdes/${pdeId}/solutions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(solution)
        });
    } catch (error) {
        console.error('Error saving solution:', error);
    }
}

/**
 * Load solutions for a PDE
 */
async function loadSolutions(pdeId) {
    try {
        const response = await fetch(`${API_BASE}/pdes/${pdeId}/solutions`);
        const solutions = await response.json();
        
        console.log(`Loaded ${solutions.length} solutions for PDE ${pdeId}`);
    } catch (error) {
        console.error('Error loading solutions:', error);
    }
}

/**
 * Send message to LLM
 */
async function sendToLLM() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Add user message to chat
    addChatMessage('user', message);
    input.value = '';
    
    // Show loading
    const loadingMsg = addChatMessage('assistant', 'Thinking...');
    
    try {
        const context = currentPDE ? { pde: currentPDE } : {};
        
        const response = await fetch(`${API_BASE}/llm/help`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: message, context })
        });
        
        const data = await response.json();
        
        // Remove loading message
        loadingMsg.remove();
        
        // Add LLM response
        addChatMessage('assistant', data.response);
    } catch (error) {
        console.error('Error getting LLM help:', error);
        loadingMsg.remove();
        addChatMessage('assistant', 'Sorry, I encountered an error. Please make sure the LLM service is running.');
    }
}

/**
 * Add message to chat
 */
function addChatMessage(role, content) {
    const messagesDiv = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${role}`;
    messageDiv.innerHTML = `<p>${content}</p>`;
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    return messageDiv;
}

/**
 * Utility: Show loading indicator
 */
function showLoading(message = 'Loading...') {
    // Could implement a modal or overlay
    console.log('Loading:', message);
}

/**
 * Utility: Hide loading indicator
 */
function hideLoading() {
    console.log('Loading complete');
}

/**
 * Utility: Show error message
 */
function showError(message) {
    alert('Error: ' + message);
    console.error(message);
}

/**
 * Utility: Show success message
 */
function showSuccess(message) {
    console.log('Success:', message);
    // Could implement a toast notification
}

/**
 * Handle Enter key in chat input
 */
document.addEventListener('DOMContentLoaded', () => {
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendToLLM();
            }
        });
    }
});
