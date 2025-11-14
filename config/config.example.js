/**
 * Configuration Example
 * 
 * This file shows example configuration options.
 * Actual configuration is stored in data/config.json
 * and created automatically on first run.
 */

module.exports = {
    // Server Configuration
    server: {
        port: process.env.PORT || 3000,
        host: 'localhost'
    },
    
    // LLM Configuration
    llm: {
        // Endpoint for local LLM service
        // Default is Ollama's default endpoint
        endpoint: process.env.LLM_ENDPOINT || 'http://localhost:11434',
        
        // Model to use
        // For Ollama: 'llama2', 'llama3', 'mistral', etc.
        model: process.env.LLM_MODEL || 'llama2',
        
        // Request timeout (ms)
        timeout: 60000,
        
        // Temperature for responses (0.0 - 1.0)
        // Lower = more deterministic, Higher = more creative
        temperature: 0.7
    },
    
    // Storage Configuration
    storage: {
        // Directory for data storage
        dataDir: './data',
        
        // File names
        files: {
            pdes: 'pdes.json',
            solutions: 'solutions.json',
            config: 'config.json'
        }
    },
    
    // PDE Solver Configuration
    solver: {
        // Default grid size
        defaultGridSize: 50,
        
        // Default time steps
        defaultTimeSteps: 100,
        
        // Maximum iterations for iterative solvers
        maxIterations: 1000,
        
        // Convergence tolerance
        tolerance: 1e-6
    }
};
