/**
 * LLM Service
 * 
 * Provides integration with a locally hosted Large Language Model (LLM)
 * such as Ollama, LM Studio, or other local LLM servers.
 * 
 * Functions:
 * - Generate PDE formulations from natural language descriptions
 * - Suggest numerical methods for solving PDEs
 * - Provide explanations and help with PDE concepts
 * - Generate solution strategies
 */

const axios = require('axios');
const storageService = require('../storage/storageService');

/**
 * Get LLM configuration from storage
 */
async function getLLMConfig() {
    const config = await storageService.getConfig();
    return {
        endpoint: config.llmEndpoint || 'http://localhost:11434',
        model: config.llmModel || 'llama2',
        timeout: config.llmTimeout || 60000
    };
}

/**
 * Check if LLM service is available
 * @returns {Promise<Object>} Status information
 */
async function getStatus() {
    try {
        const config = await getLLMConfig();
        
        // Try to connect to the LLM endpoint
        const response = await axios.get(`${config.endpoint}/api/tags`, {
            timeout: 5000
        }).catch(() => null);
        
        if (response && response.status === 200) {
            return {
                healthy: true,
                endpoint: config.endpoint,
                model: config.model,
                available: true,
                models: response.data.models || []
            };
        } else {
            return {
                healthy: false,
                endpoint: config.endpoint,
                model: config.model,
                available: false,
                message: 'LLM service not reachable. Please ensure Ollama or your LLM service is running.'
            };
        }
    } catch (error) {
        return {
            healthy: false,
            available: false,
            error: error.message,
            message: 'Could not connect to LLM service. Please check configuration.'
        };
    }
}

/**
 * Send a prompt to the LLM and get a response
 * @param {string} prompt - The prompt to send
 * @param {Object} options - Additional options (temperature, etc.)
 * @returns {Promise<string>} LLM response
 */
async function sendPrompt(prompt, options = {}) {
    try {
        const config = await getLLMConfig();
        
        const requestData = {
            model: config.model,
            prompt: prompt,
            stream: false,
            options: {
                temperature: options.temperature || 0.7,
                ...options
            }
        };
        
        const response = await axios.post(
            `${config.endpoint}/api/generate`,
            requestData,
            {
                timeout: config.timeout,
                headers: { 'Content-Type': 'application/json' }
            }
        );
        
        return response.data.response || '';
    } catch (error) {
        console.error('Error sending prompt to LLM:', error.message);
        
        // Return a helpful fallback message
        return getFallbackResponse(error);
    }
}

/**
 * Get help from LLM about PDE concepts or formulation
 * @param {string} prompt - User's question or request
 * @param {Object} context - Additional context about the current PDE
 * @returns {Promise<Object>} Help response
 */
async function getHelp(prompt, context = {}) {
    const systemPrompt = `You are an expert in partial differential equations (PDEs) and numerical methods. 
You help users formulate, understand, and solve PDEs. Provide clear, concise, and mathematically accurate responses.
Focus on practical guidance for implementing numerical solutions.`;

    const fullPrompt = `${systemPrompt}

${context.pde ? `Current PDE context: ${JSON.stringify(context.pde, null, 2)}` : ''}

User question: ${prompt}

Please provide a helpful response:`;

    const response = await sendPrompt(fullPrompt);
    
    return {
        prompt: prompt,
        response: response,
        timestamp: new Date().toISOString()
    };
}

/**
 * Generate a numerical solution strategy for a PDE description
 * @param {string} pdeDescription - Natural language description of the PDE
 * @returns {Promise<Object>} Suggested solution approach
 */
async function generateSolution(pdeDescription) {
    const systemPrompt = `You are an expert in numerical methods for solving partial differential equations.
Given a description of a PDE problem, suggest:
1. The type of PDE (parabolic, hyperbolic, elliptic, or coupled)
2. Appropriate numerical method (finite difference, finite element, etc.)
3. Initial and boundary conditions needed
4. Key parameters (grid size, time step, etc.)
5. Stability considerations

Provide your response in a structured JSON format.`;

    const fullPrompt = `${systemPrompt}

PDE Description: ${pdeDescription}

Provide a structured solution approach in JSON format with the following fields:
- type: (parabolic/hyperbolic/elliptic/coupled)
- method: (suggested numerical method)
- initialCondition: (description)
- boundaryConditions: (description)
- parameters: (suggested values)
- stability: (considerations)
- implementation: (step-by-step guide)

Response:`;

    const response = await sendPrompt(fullPrompt, { temperature: 0.3 });
    
    // Try to parse JSON response
    let structuredResponse;
    try {
        // Extract JSON if it's embedded in markdown code blocks
        const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || 
                         response.match(/```\s*([\s\S]*?)\s*```/);
        const jsonStr = jsonMatch ? jsonMatch[1] : response;
        structuredResponse = JSON.parse(jsonStr);
    } catch (error) {
        // If parsing fails, return the raw response
        structuredResponse = {
            type: 'unknown',
            rawResponse: response,
            note: 'Could not parse structured response. See rawResponse field.'
        };
    }
    
    return {
        description: pdeDescription,
        solution: structuredResponse,
        timestamp: new Date().toISOString()
    };
}

/**
 * Convert natural language PDE description to structured format
 * @param {string} description - Natural language description
 * @returns {Promise<Object>} Structured PDE definition
 */
async function parsePDEDescription(description) {
    const systemPrompt = `You are an expert at converting natural language descriptions of PDEs 
into structured mathematical representations. Extract the key components and return a JSON object.`;

    const fullPrompt = `${systemPrompt}

Description: ${description}

Extract and return a JSON object with these fields:
- name: (short descriptive name)
- type: (parabolic/hyperbolic/elliptic/coupled)
- equations: (array of equation strings)
- variables: (array of variable names)
- coefficients: (object with coefficient values)
- domain: (spatial domain description)
- initialCondition: (description)
- boundaryConditions: (description)

JSON Response:`;

    const response = await sendPrompt(fullPrompt, { temperature: 0.3 });
    
    try {
        const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || 
                         response.match(/```\s*([\s\S]*?)\s*```/);
        const jsonStr = jsonMatch ? jsonMatch[1] : response;
        return JSON.parse(jsonStr);
    } catch (error) {
        return {
            error: 'Could not parse PDE description',
            rawResponse: response,
            originalDescription: description
        };
    }
}

/**
 * Provide fallback response when LLM is unavailable
 */
function getFallbackResponse(error) {
    const isConnectionError = error.code === 'ECONNREFUSED' || 
                             error.message.includes('connect') ||
                             error.message.includes('ECONNREFUSED');
    
    if (isConnectionError) {
        return `LLM Service is not available. Please ensure your local LLM server (e.g., Ollama) is running.

To start Ollama:
1. Install Ollama from https://ollama.ai
2. Run: ollama pull llama2
3. The service should start automatically

To use a different LLM service, update the configuration in the dashboard settings.

In the meantime, you can still use the built-in PDE solver with predefined equation types.`;
    }
    
    return `An error occurred while communicating with the LLM service: ${error.message}

Please check your LLM configuration and try again.`;
}

/**
 * Generate example PDE problems for demonstration
 * @returns {Promise<Array>} Array of example PDE definitions
 */
async function generateExamples() {
    return [
        {
            name: 'Heat Equation',
            type: 'parabolic',
            description: 'Classic heat diffusion equation',
            equation: '∂u/∂t = α∇²u',
            coefficient: 0.1,
            initialCondition: 'gaussian',
            boundaryConditions: { left: 0, right: 0, top: 0, bottom: 0 }
        },
        {
            name: 'Wave Equation',
            type: 'hyperbolic',
            description: '2D wave propagation',
            equation: '∂²u/∂t² = c²∇²u',
            waveSpeed: 1.0,
            initialCondition: 'gaussian',
            boundaryConditions: { left: 0, right: 0, top: 0, bottom: 0 }
        },
        {
            name: 'Laplace Equation',
            type: 'elliptic',
            description: 'Steady-state potential',
            equation: '∇²u = 0',
            boundaryConditions: { left: 0, right: 1, top: 0, bottom: 0 }
        }
    ];
}

module.exports = {
    getStatus,
    getHelp,
    generateSolution,
    parsePDEDescription,
    sendPrompt,
    generateExamples
};
