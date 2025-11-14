# Usage Examples

This document provides practical examples of using the PDE Dashboard.

## Example 1: Solving the Heat Equation

The heat equation models thermal diffusion in 2D space.

### Step 1: Create the PDE
1. Click "+ New PDE" in the sidebar
2. Fill in the details:
   - **Name**: "2D Heat Diffusion"
   - **Type**: Parabolic (Heat/Diffusion)
   - **Description**: "Temperature distribution in a metal plate"
   - **Equation**: `∂u/∂t = α∇²u`
   - **Initial Condition**: Gaussian (hot spot in center)
3. Click "💾 Save PDE"

### Step 2: Configure Solver Parameters
- **Grid Points (nx)**: 50
- **Grid Points (ny)**: 50
- **Time Steps**: 100

### Step 3: Solve and Visualize
1. Click "▶️ Solve"
2. View the cross-section plots showing heat distribution
3. Check the Solution Info panel for numerical details

### Results
- The solution shows how heat diffuses from the initial hot spot
- Horizontal and vertical cross-sections display the temperature profile
- Stability information helps validate the numerical method

## Example 2: Wave Equation

Model wave propagation in 2D.

### Configuration
- **Name**: "2D Wave Propagation"
- **Type**: Hyperbolic (Wave)
- **Description**: "Vibrating membrane"
- **Equation**: `∂²u/∂t² = c²∇²u`
- **Initial Condition**: Gaussian (initial displacement)

### Solver Settings
- Grid: 50×50
- Time Steps: 200 (more steps to see wave propagation)

## Example 3: Laplace Equation

Solve for steady-state potential distribution.

### Configuration
- **Name**: "Electrostatic Potential"
- **Type**: Elliptic (Laplace/Poisson)
- **Description**: "Potential between charged plates"
- **Equation**: `∇²u = 0`

### Boundary Conditions
- Default: Left=0, Right=1, Top=0, Bottom=0
- This creates a potential gradient from right to left

## Using the LLM Assistant

### Getting Help with PDE Formulation
1. Type in the chat: "Help me set up a diffusion-reaction equation"
2. The LLM will suggest:
   - Equation form
   - Initial conditions
   - Boundary conditions
   - Numerical method

### Asking for Parameter Suggestions
1. Type: "What grid size should I use for a heat equation?"
2. The LLM provides guidance on:
   - Spatial resolution
   - Time step size
   - Stability criteria

**Note**: LLM requires Ollama or compatible service running locally.

## API Examples

### Create PDE via API
```bash
curl -X POST http://localhost:3000/api/pdes \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Heat Equation",
    "type": "parabolic",
    "description": "2D heat diffusion",
    "equation": "∂u/∂t = α∇²u",
    "coefficient": 0.1,
    "initialCondition": "gaussian",
    "boundaryConditions": {"left": 0, "right": 0, "top": 0, "bottom": 0}
  }'
```

### Solve PDE via API
```bash
curl -X POST http://localhost:3000/api/pdes/{id}/solve \
  -H "Content-Type: application/json" \
  -d '{
    "params": {
      "nx": 50,
      "ny": 50,
      "nt": 100
    }
  }'
```

### Get Service Status
```bash
curl http://localhost:3000/api/services/status
```

## Tips and Best Practices

### Numerical Stability
- For parabolic PDEs: Keep `α × dt / (dx²) < 0.5`
- For hyperbolic PDEs: Keep `c × dt / dx < 1` (CFL condition)
- The dashboard displays warnings when stability criteria are violated

### Grid Resolution
- Start with coarse grids (20×20) for testing
- Increase resolution for production runs (100×100 or higher)
- Balance accuracy vs. computation time

### Visualization
- Cross-sections show 1D slices through the 2D solution
- ASCII plots work without external dependencies
- For better visualization, allow Chart.js CDN access

### Data Storage
- All PDEs saved in `data/pdes.json`
- Solutions saved in `data/solutions.json`
- Backup these files to preserve your work

## Troubleshooting

### LLM Service Unavailable
```bash
# Install and start Ollama
curl -fsSL https://ollama.ai/install.sh | sh
ollama pull llama2
```

### Solver Takes Too Long
- Reduce grid size (nx, ny)
- Reduce time steps (nt)
- Use coarser discretization

### Numerical Instability
- Reduce time step size
- Check stability criteria in Solution Info
- Consider using implicit methods (future feature)
