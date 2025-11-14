/**
 * Main Express Application Server
 * 
 * This server provides:
 * - Web-based dashboard interface for PDE visualization
 * - RESTful API endpoints for service management
 * - Integration with locally hosted LLM for PDE solutions
 * - Local data storage and retrieval
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

// Import custom modules
const storageService = require('../storage/storageService');
const pdeService = require('../services/pdeService');
const llmService = require('../services/llmService');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware configuration
app.use(cors()); // Enable CORS for all origins
app.use(bodyParser.json()); // Parse JSON request bodies
app.use(bodyParser.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../../public')));

/**
 * Health check endpoint
 * Returns server status and uptime
 */
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

/**
 * Get service status endpoint
 * Returns status of all integrated services (storage, PDE solver, LLM)
 */
app.get('/api/services/status', async (req, res) => {
    try {
        const status = {
            storage: await storageService.getStatus(),
            pdeService: pdeService.getStatus(),
            llmService: await llmService.getStatus()
        };
        res.json(status);
    } catch (error) {
        console.error('Error fetching service status:', error);
        res.status(500).json({ error: 'Failed to retrieve service status' });
    }
});

/**
 * PDE Management Endpoints
 */

// Get all stored PDEs
app.get('/api/pdes', async (req, res) => {
    try {
        const pdes = await storageService.getAllPDEs();
        res.json(pdes);
    } catch (error) {
        console.error('Error fetching PDEs:', error);
        res.status(500).json({ error: 'Failed to fetch PDEs' });
    }
});

// Get a specific PDE by ID
app.get('/api/pdes/:id', async (req, res) => {
    try {
        const pde = await storageService.getPDE(req.params.id);
        if (!pde) {
            return res.status(404).json({ error: 'PDE not found' });
        }
        res.json(pde);
    } catch (error) {
        console.error('Error fetching PDE:', error);
        res.status(500).json({ error: 'Failed to fetch PDE' });
    }
});

// Create a new PDE definition
app.post('/api/pdes', async (req, res) => {
    try {
        const pdeData = req.body;
        const savedPDE = await storageService.savePDE(pdeData);
        res.status(201).json(savedPDE);
    } catch (error) {
        console.error('Error saving PDE:', error);
        res.status(500).json({ error: 'Failed to save PDE' });
    }
});

// Update an existing PDE
app.put('/api/pdes/:id', async (req, res) => {
    try {
        const updatedPDE = await storageService.updatePDE(req.params.id, req.body);
        if (!updatedPDE) {
            return res.status(404).json({ error: 'PDE not found' });
        }
        res.json(updatedPDE);
    } catch (error) {
        console.error('Error updating PDE:', error);
        res.status(500).json({ error: 'Failed to update PDE' });
    }
});

// Delete a PDE
app.delete('/api/pdes/:id', async (req, res) => {
    try {
        const deleted = await storageService.deletePDE(req.params.id);
        if (!deleted) {
            return res.status(404).json({ error: 'PDE not found' });
        }
        res.json({ message: 'PDE deleted successfully' });
    } catch (error) {
        console.error('Error deleting PDE:', error);
        res.status(500).json({ error: 'Failed to delete PDE' });
    }
});

/**
 * PDE Solving and Visualization Endpoints
 */

// Solve a PDE system using the PDE service
app.post('/api/pdes/:id/solve', async (req, res) => {
    try {
        const pde = await storageService.getPDE(req.params.id);
        if (!pde) {
            return res.status(404).json({ error: 'PDE not found' });
        }

        const solution = await pdeService.solve(pde, req.body.params);
        res.json(solution);
    } catch (error) {
        console.error('Error solving PDE:', error);
        res.status(500).json({ error: 'Failed to solve PDE: ' + error.message });
    }
});

/**
 * LLM Integration Endpoints
 */

// Get help from LLM to formulate a PDE
app.post('/api/llm/help', async (req, res) => {
    try {
        const { prompt, context } = req.body;
        const response = await llmService.getHelp(prompt, context);
        res.json(response);
    } catch (error) {
        console.error('Error getting LLM help:', error);
        res.status(500).json({ error: 'Failed to get LLM response: ' + error.message });
    }
});

// Generate numerical solution method using LLM
app.post('/api/llm/generate-solution', async (req, res) => {
    try {
        const { pdeDescription } = req.body;
        const solution = await llmService.generateSolution(pdeDescription);
        res.json(solution);
    } catch (error) {
        console.error('Error generating solution:', error);
        res.status(500).json({ error: 'Failed to generate solution: ' + error.message });
    }
});

/**
 * Solution Storage Endpoints
 */

// Get all solutions for a specific PDE
app.get('/api/pdes/:id/solutions', async (req, res) => {
    try {
        const solutions = await storageService.getSolutions(req.params.id);
        res.json(solutions);
    } catch (error) {
        console.error('Error fetching solutions:', error);
        res.status(500).json({ error: 'Failed to fetch solutions' });
    }
});

// Save a solution
app.post('/api/pdes/:id/solutions', async (req, res) => {
    try {
        const solution = await storageService.saveSolution(req.params.id, req.body);
        res.status(201).json(solution);
    } catch (error) {
        console.error('Error saving solution:', error);
        res.status(500).json({ error: 'Failed to save solution' });
    }
});

/**
 * Root route - serve the dashboard
 */
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/index.html'));
});

/**
 * Error handling middleware
 */
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

/**
 * 404 handler for undefined routes
 */
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

/**
 * Start the server
 */
function startServer() {
    app.listen(PORT, () => {
        console.log(`\n========================================`);
        console.log(`  PDE Dashboard Server`);
        console.log(`========================================`);
        console.log(`  Server running on port ${PORT}`);
        console.log(`  Dashboard: http://localhost:${PORT}`);
        console.log(`  API: http://localhost:${PORT}/api`);
        console.log(`========================================\n`);
    });
}

// Start server if this file is run directly
if (require.main === module) {
    startServer();
}

module.exports = app;
