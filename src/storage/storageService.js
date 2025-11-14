/**
 * Storage Service
 * 
 * Handles local file-based storage for:
 * - PDE definitions and systems
 * - Numerical solutions
 * - User configurations
 * 
 * Uses JSON files for simplicity and portability
 */

const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Data directory path
const DATA_DIR = path.join(__dirname, '../../data');
const PDES_FILE = path.join(DATA_DIR, 'pdes.json');
const SOLUTIONS_FILE = path.join(DATA_DIR, 'solutions.json');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

/**
 * Initialize storage by creating data files if they don't exist
 */
async function initialize() {
    try {
        // Ensure data directory exists
        await fs.mkdir(DATA_DIR, { recursive: true });

        // Initialize PDEs file
        try {
            await fs.access(PDES_FILE);
        } catch {
            await fs.writeFile(PDES_FILE, JSON.stringify([], null, 2));
        }

        // Initialize solutions file
        try {
            await fs.access(SOLUTIONS_FILE);
        } catch {
            await fs.writeFile(SOLUTIONS_FILE, JSON.stringify([], null, 2));
        }

        // Initialize config file
        try {
            await fs.access(CONFIG_FILE);
        } catch {
            const defaultConfig = {
                llmEndpoint: 'http://localhost:11434', // Default for Ollama
                llmModel: 'llama2',
                storageVersion: '1.0.0'
            };
            await fs.writeFile(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2));
        }
    } catch (error) {
        console.error('Error initializing storage:', error);
        throw error;
    }
}

/**
 * Read data from a JSON file
 * @param {string} filePath - Path to the JSON file
 * @returns {Promise<any>} Parsed JSON data
 */
async function readJSON(filePath) {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error reading JSON from ${filePath}:`, error);
        throw error;
    }
}

/**
 * Write data to a JSON file
 * @param {string} filePath - Path to the JSON file
 * @param {any} data - Data to write
 */
async function writeJSON(filePath, data) {
    try {
        await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
        console.error(`Error writing JSON to ${filePath}:`, error);
        throw error;
    }
}

/**
 * Get all PDEs from storage
 * @returns {Promise<Array>} Array of PDE objects
 */
async function getAllPDEs() {
    await initialize();
    return await readJSON(PDES_FILE);
}

/**
 * Get a specific PDE by ID
 * @param {string} id - PDE identifier
 * @returns {Promise<Object|null>} PDE object or null if not found
 */
async function getPDE(id) {
    const pdes = await getAllPDEs();
    return pdes.find(pde => pde.id === id) || null;
}

/**
 * Save a new PDE to storage
 * @param {Object} pdeData - PDE definition
 * @returns {Promise<Object>} Saved PDE with generated ID
 */
async function savePDE(pdeData) {
    await initialize();
    const pdes = await getAllPDEs();
    
    const newPDE = {
        id: uuidv4(),
        ...pdeData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    pdes.push(newPDE);
    await writeJSON(PDES_FILE, pdes);
    
    return newPDE;
}

/**
 * Update an existing PDE
 * @param {string} id - PDE identifier
 * @param {Object} updates - Updated fields
 * @returns {Promise<Object|null>} Updated PDE or null if not found
 */
async function updatePDE(id, updates) {
    await initialize();
    const pdes = await getAllPDEs();
    const index = pdes.findIndex(pde => pde.id === id);
    
    if (index === -1) {
        return null;
    }
    
    pdes[index] = {
        ...pdes[index],
        ...updates,
        id, // Preserve original ID
        createdAt: pdes[index].createdAt, // Preserve creation time
        updatedAt: new Date().toISOString()
    };
    
    await writeJSON(PDES_FILE, pdes);
    return pdes[index];
}

/**
 * Delete a PDE from storage
 * @param {string} id - PDE identifier
 * @returns {Promise<boolean>} True if deleted, false if not found
 */
async function deletePDE(id) {
    await initialize();
    const pdes = await getAllPDEs();
    const filteredPDEs = pdes.filter(pde => pde.id !== id);
    
    if (filteredPDEs.length === pdes.length) {
        return false;
    }
    
    await writeJSON(PDES_FILE, filteredPDEs);
    return true;
}

/**
 * Get all solutions for a specific PDE
 * @param {string} pdeId - PDE identifier
 * @returns {Promise<Array>} Array of solution objects
 */
async function getSolutions(pdeId) {
    await initialize();
    const allSolutions = await readJSON(SOLUTIONS_FILE);
    return allSolutions.filter(sol => sol.pdeId === pdeId);
}

/**
 * Save a solution for a PDE
 * @param {string} pdeId - PDE identifier
 * @param {Object} solutionData - Solution data
 * @returns {Promise<Object>} Saved solution
 */
async function saveSolution(pdeId, solutionData) {
    await initialize();
    const solutions = await readJSON(SOLUTIONS_FILE);
    
    const newSolution = {
        id: uuidv4(),
        pdeId,
        ...solutionData,
        createdAt: new Date().toISOString()
    };
    
    solutions.push(newSolution);
    await writeJSON(SOLUTIONS_FILE, solutions);
    
    return newSolution;
}

/**
 * Get configuration settings
 * @returns {Promise<Object>} Configuration object
 */
async function getConfig() {
    await initialize();
    return await readJSON(CONFIG_FILE);
}

/**
 * Update configuration settings
 * @param {Object} updates - Configuration updates
 * @returns {Promise<Object>} Updated configuration
 */
async function updateConfig(updates) {
    await initialize();
    const config = await getConfig();
    const newConfig = { ...config, ...updates };
    await writeJSON(CONFIG_FILE, newConfig);
    return newConfig;
}

/**
 * Get storage service status
 * @returns {Promise<Object>} Status information
 */
async function getStatus() {
    try {
        await initialize();
        const pdes = await getAllPDEs();
        const solutions = await readJSON(SOLUTIONS_FILE);
        
        return {
            healthy: true,
            pdeCount: pdes.length,
            solutionCount: solutions.length,
            dataDir: DATA_DIR
        };
    } catch (error) {
        return {
            healthy: false,
            error: error.message
        };
    }
}

// Initialize storage on module load
initialize().catch(console.error);

module.exports = {
    initialize,
    getAllPDEs,
    getPDE,
    savePDE,
    updatePDE,
    deletePDE,
    getSolutions,
    saveSolution,
    getConfig,
    updateConfig,
    getStatus
};
