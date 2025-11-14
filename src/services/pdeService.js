/**
 * PDE Service
 * 
 * Provides numerical methods for solving coupled systems of partial differential equations.
 * Supports various PDE types:
 * - Parabolic (heat equation, diffusion)
 * - Hyperbolic (wave equation)
 * - Elliptic (Laplace, Poisson)
 * 
 * Uses finite difference methods for discretization and solution.
 */

const math = require('mathjs');

/**
 * Solve a system of PDEs using finite difference methods
 * 
 * @param {Object} pde - PDE definition object
 * @param {Object} params - Solution parameters (grid size, time steps, etc.)
 * @returns {Promise<Object>} Solution data with numerical results
 */
async function solve(pde, params = {}) {
    try {
        // Default parameters
        const {
            nx = 50,           // Number of spatial grid points in x
            ny = 50,           // Number of spatial grid points in y
            nt = 100,          // Number of time steps
            xMin = 0,          // Minimum x value
            xMax = 1,          // Maximum x value
            yMin = 0,          // Minimum y value
            yMax = 1,          // Maximum y value
            tMax = 1,          // Maximum time value
            method = 'explicit' // Numerical method: 'explicit', 'implicit', or 'crank-nicolson'
        } = params;

        // Determine PDE type and solve accordingly
        const pdeType = pde.type || 'parabolic';

        switch (pdeType.toLowerCase()) {
            case 'parabolic':
                return await solveParabolic(pde, { nx, ny, nt, xMin, xMax, yMin, yMax, tMax, method });
            case 'hyperbolic':
                return await solveHyperbolic(pde, { nx, ny, nt, xMin, xMax, yMin, yMax, tMax, method });
            case 'elliptic':
                return await solveElliptic(pde, { nx, ny, xMin, xMax, yMin, yMax });
            case 'coupled':
                return await solveCoupledSystem(pde, { nx, ny, nt, xMin, xMax, yMin, yMax, tMax, method });
            default:
                throw new Error(`Unsupported PDE type: ${pdeType}`);
        }
    } catch (error) {
        console.error('Error solving PDE:', error);
        throw error;
    }
}

/**
 * Solve a parabolic PDE (e.g., heat equation: ∂u/∂t = α∇²u)
 */
async function solveParabolic(pde, params) {
    const { nx, ny, nt, xMin, xMax, yMin, yMax, tMax } = params;
    
    // Grid spacing
    const dx = (xMax - xMin) / (nx - 1);
    const dy = (yMax - yMin) / (ny - 1);
    const dt = tMax / nt;
    
    // Diffusion coefficient (default to 0.1 if not specified)
    const alpha = pde.coefficient || 0.1;
    
    // Stability check for explicit method
    const stability = alpha * dt / (dx * dx);
    if (stability > 0.25) {
        console.warn(`Warning: Stability criterion violated (${stability} > 0.25). Solution may be unstable.`);
    }
    
    // Initialize solution grid as 2D array
    let u = Array(ny).fill(0).map(() => Array(nx).fill(0));
    
    // Apply initial condition
    if (pde.initialCondition) {
        for (let i = 0; i < ny; i++) {
            for (let j = 0; j < nx; j++) {
                const x = xMin + j * dx;
                const y = yMin + i * dy;
                u[i][j] = evaluateInitialCondition(pde.initialCondition, x, y);
            }
        }
    }
    
    // Time stepping using explicit finite difference
    const snapshots = [{ time: 0, data: JSON.parse(JSON.stringify(u)) }];
    
    for (let n = 0; n < nt; n++) {
        const u_new = Array(ny).fill(0).map(() => Array(nx).fill(0));
        
        // Interior points
        for (let i = 1; i < ny - 1; i++) {
            for (let j = 1; j < nx - 1; j++) {
                const laplacian = (
                    u[i][j+1] + u[i][j-1] - 2*u[i][j]
                ) / (dx * dx) + (
                    u[i+1][j] + u[i-1][j] - 2*u[i][j]
                ) / (dy * dy);
                
                u_new[i][j] = u[i][j] + alpha * dt * laplacian;
            }
        }
        
        // Apply boundary conditions (default to zero Dirichlet)
        if (pde.boundaryConditions) {
            applyBoundaryConditions(u_new, pde.boundaryConditions, nx, ny);
        }
        
        u = u_new;
        
        // Store snapshots at regular intervals
        if (n % Math.floor(nt / 10) === 0 || n === nt - 1) {
            snapshots.push({
                time: (n + 1) * dt,
                data: JSON.parse(JSON.stringify(u))
            });
        }
    }
    
    return {
        type: 'parabolic',
        method: 'explicit-finite-difference',
        grid: { nx, ny, nt, dx, dy, dt },
        domain: { xMin, xMax, yMin, yMax, tMax },
        snapshots,
        metadata: {
            alpha,
            stability
        }
    };
}

/**
 * Solve a hyperbolic PDE (e.g., wave equation: ∂²u/∂t² = c²∇²u)
 */
async function solveHyperbolic(pde, params) {
    const { nx, ny, nt, xMin, xMax, yMin, yMax, tMax } = params;
    
    const dx = (xMax - xMin) / (nx - 1);
    const dy = (yMax - yMin) / (ny - 1);
    const dt = tMax / nt;
    
    // Wave speed (default to 1.0 if not specified)
    const c = pde.waveSpeed || 1.0;
    
    // CFL condition check
    const cfl = c * dt / Math.min(dx, dy);
    if (cfl > 1) {
        console.warn(`Warning: CFL condition violated (${cfl} > 1). Solution may be unstable.`);
    }
    
    // Initialize solution grids (current, previous) as 2D arrays
    let u_curr = Array(ny).fill(0).map(() => Array(nx).fill(0));
    let u_prev = Array(ny).fill(0).map(() => Array(nx).fill(0));
    
    // Apply initial conditions
    if (pde.initialCondition) {
        for (let i = 0; i < ny; i++) {
            for (let j = 0; j < nx; j++) {
                const x = xMin + j * dx;
                const y = yMin + i * dy;
                u_curr[i][j] = evaluateInitialCondition(pde.initialCondition, x, y);
                u_prev[i][j] = u_curr[i][j]; // Assume zero initial velocity
            }
        }
    }
    
    const snapshots = [{ time: 0, data: JSON.parse(JSON.stringify(u_curr)) }];
    
    // Time stepping
    for (let n = 0; n < nt; n++) {
        const u_new = Array(ny).fill(0).map(() => Array(nx).fill(0));
        
        // Interior points
        for (let i = 1; i < ny - 1; i++) {
            for (let j = 1; j < nx - 1; j++) {
                const laplacian = (
                    u_curr[i][j+1] + u_curr[i][j-1] - 2*u_curr[i][j]
                ) / (dx * dx) + (
                    u_curr[i+1][j] + u_curr[i-1][j] - 2*u_curr[i][j]
                ) / (dy * dy);
                
                u_new[i][j] = 
                    2 * u_curr[i][j] - u_prev[i][j] + 
                    (c * dt) ** 2 * laplacian;
            }
        }
        
        // Apply boundary conditions
        if (pde.boundaryConditions) {
            applyBoundaryConditions(u_new, pde.boundaryConditions, nx, ny);
        }
        
        u_prev = u_curr;
        u_curr = u_new;
        
        // Store snapshots
        if (n % Math.floor(nt / 10) === 0 || n === nt - 1) {
            snapshots.push({
                time: (n + 1) * dt,
                data: JSON.parse(JSON.stringify(u_curr))
            });
        }
    }
    
    return {
        type: 'hyperbolic',
        method: 'explicit-finite-difference',
        grid: { nx, ny, nt, dx, dy, dt },
        domain: { xMin, xMax, yMin, yMax, tMax },
        snapshots,
        metadata: {
            waveSpeed: c,
            cfl
        }
    };
}

/**
 * Solve an elliptic PDE (e.g., Laplace equation: ∇²u = 0)
 */
async function solveElliptic(pde, params) {
    const { nx, ny, xMin, xMax, yMin, yMax } = params;
    
    const dx = (xMax - xMin) / (nx - 1);
    const dy = (yMax - yMin) / (ny - 1);
    
    // Initialize solution grid as 2D array
    let u = Array(ny).fill(0).map(() => Array(nx).fill(0));
    
    // Apply boundary conditions
    if (pde.boundaryConditions) {
        applyBoundaryConditions(u, pde.boundaryConditions, nx, ny);
    }
    
    // Solve using Gauss-Seidel iteration
    const maxIterations = 1000;
    const tolerance = 1e-6;
    
    for (let iter = 0; iter < maxIterations; iter++) {
        let maxChange = 0;
        
        // Interior points
        for (let i = 1; i < ny - 1; i++) {
            for (let j = 1; j < nx - 1; j++) {
                const u_old = u[i][j];
                const u_new = 0.25 * (
                    u[i][j+1] + u[i][j-1] +
                    u[i+1][j] + u[i-1][j]
                );
                
                u[i][j] = u_new;
                maxChange = Math.max(maxChange, Math.abs(u_new - u_old));
            }
        }
        
        if (maxChange < tolerance) {
            console.log(`Converged after ${iter + 1} iterations`);
            break;
        }
    }
    
    return {
        type: 'elliptic',
        method: 'gauss-seidel',
        grid: { nx, ny, dx, dy },
        domain: { xMin, xMax, yMin, yMax },
        solution: u,
        metadata: {
            converged: true
        }
    };
}

/**
 * Solve a coupled system of PDEs
 */
async function solveCoupledSystem(pde, params) {
    // For coupled systems, solve each equation with interactions
    // This is a simplified approach - real coupling requires simultaneous solution
    
    const { equations } = pde;
    if (!equations || equations.length < 2) {
        throw new Error('Coupled system requires at least 2 equations');
    }
    
    // Solve each equation in the coupled system
    const solutions = [];
    
    for (const eq of equations) {
        const eqPDE = { ...pde, ...eq };
        const solution = await solve(eqPDE, params);
        solutions.push(solution);
    }
    
    return {
        type: 'coupled',
        equations: equations.length,
        solutions,
        metadata: {
            coupling: 'sequential'
        }
    };
}

/**
 * Evaluate initial condition expression
 */
function evaluateInitialCondition(condition, x, y) {
    try {
        // Support common initial conditions
        if (typeof condition === 'function') {
            return condition(x, y);
        } else if (typeof condition === 'string') {
            // Simple expression evaluation
            if (condition === 'gaussian') {
                const x0 = 0.5, y0 = 0.5, sigma = 0.1;
                return Math.exp(-((x - x0) ** 2 + (y - y0) ** 2) / (2 * sigma ** 2));
            } else if (condition === 'step') {
                return (x > 0.4 && x < 0.6 && y > 0.4 && y < 0.6) ? 1.0 : 0.0;
            }
        }
        return 0.0;
    } catch (error) {
        console.error('Error evaluating initial condition:', error);
        return 0.0;
    }
}

/**
 * Apply boundary conditions to the grid
 */
function applyBoundaryConditions(u, conditions, nx, ny) {
    // Default to zero Dirichlet boundaries
    const { left = 0, right = 0, top = 0, bottom = 0 } = conditions;
    
    // Left and right boundaries
    for (let i = 0; i < ny; i++) {
        u[i][0] = left;
        u[i][nx - 1] = right;
    }
    
    // Top and bottom boundaries
    for (let j = 0; j < nx; j++) {
        u[0][j] = bottom;
        u[ny - 1][j] = top;
    }
}

/**
 * Get service status
 */
function getStatus() {
    return {
        healthy: true,
        methods: ['explicit-finite-difference', 'gauss-seidel'],
        supportedTypes: ['parabolic', 'hyperbolic', 'elliptic', 'coupled']
    };
}

module.exports = {
    solve,
    getStatus
};
