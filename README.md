# 🧮 PDE Dashboard - Local Service

A comprehensive web-based dashboard for describing, solving, and visualizing coupled systems of Partial Differential Equations (PDEs). Integrates with locally hosted Large Language Models (LLMs) to assist with PDE formulation and numerical solution strategies.

## 🎯 Features

### Core Capabilities
- **Local Storage & Serving**: All data stored locally using JSON files - no external database required
- **PDE Management**: Create, edit, and manage multiple PDE definitions
- **Numerical Solving**: Built-in solvers for:
  - Parabolic PDEs (Heat/Diffusion equations)
  - Hyperbolic PDEs (Wave equations)
  - Elliptic PDEs (Laplace/Poisson equations)
  - Coupled PDE systems
- **Real-time Visualization**: Interactive charts showing solution cross-sections
- **LLM Integration**: Connect to local LLM services (Ollama, LM Studio, etc.) for:
  - PDE formulation assistance
  - Numerical method suggestions
  - Solution strategy generation
  - Interactive help and guidance

### Service Dashboard
Monitor the health and status of all integrated services:
- Storage service (local file-based)
- PDE solver engine
- LLM service connection

## 📋 Prerequisites

- **Node.js** (v14 or higher)
- **npm** (comes with Node.js)
- **Optional**: Local LLM service like [Ollama](https://ollama.ai) for AI assistance

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/ChrisJones79/hello_webstuff.git
cd hello_webstuff
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start the Server
```bash
npm start
```

The dashboard will be available at: **http://localhost:3000**

### 4. (Optional) Set Up Local LLM

For enhanced AI assistance, install and run Ollama:

```bash
# Install Ollama (macOS/Linux)
curl -fsSL https://ollama.ai/install.sh | sh

# Pull a model
ollama pull llama2

# Ollama runs automatically on localhost:11434
```

## 📁 Project Structure

```
hello_webstuff/
├── src/
│   ├── server/
│   │   └── app.js              # Main Express server
│   ├── services/
│   │   ├── pdeService.js       # PDE numerical solver
│   │   └── llmService.js       # LLM integration
│   └── storage/
│       └── storageService.js   # Local data persistence
├── public/
│   ├── index.html              # Dashboard UI
│   ├── css/
│   │   └── styles.css          # Styling
│   └── js/
│       └── app.js              # Frontend JavaScript
├── data/                       # Local storage (generated)
│   ├── pdes.json              # PDE definitions
│   ├── solutions.json         # Computed solutions
│   └── config.json            # Configuration
├── config/                     # Configuration files
├── package.json               # Dependencies
└── README.md                  # This file
```

## 🔧 Configuration

Configuration is stored in `data/config.json` and includes:

```json
{
  "llmEndpoint": "http://localhost:11434",
  "llmModel": "llama2",
  "storageVersion": "1.0.0"
}
```

You can modify these settings through the storage service API or by editing the file directly.

## 📖 Usage Guide

### Creating a PDE

1. Click **"+ New PDE"** in the sidebar
2. Fill in the PDE details:
   - **Name**: Descriptive name for your PDE
   - **Type**: Select from Parabolic, Hyperbolic, Elliptic, or Coupled
   - **Description**: Explain what the PDE represents
   - **Equation**: Mathematical representation (e.g., ∂u/∂t = α∇²u)
   - **Initial Condition**: Choose from preset options or custom
3. Click **"💾 Save PDE"**

### Solving a PDE

1. Select a PDE from the library
2. Adjust solver parameters in the Visualization panel:
   - **Grid Points (nx, ny)**: Spatial discretization
   - **Time Steps**: Temporal discretization
3. Click **"▶️ Solve"**
4. View the solution visualization and details

### Using LLM Assistant

1. Type your question in the chat input
2. Examples:
   - "Help me set up a heat equation"
   - "What boundary conditions should I use for a wave equation?"
   - "Suggest parameters for solving this PDE"
3. Press Enter or click **"Send"**
4. The LLM will provide context-aware assistance

## 🔌 API Documentation

### Service Status
```
GET /api/services/status
```
Returns health status of all services.

### PDE Management
```
GET    /api/pdes           # List all PDEs
GET    /api/pdes/:id       # Get specific PDE
POST   /api/pdes           # Create new PDE
PUT    /api/pdes/:id       # Update PDE
DELETE /api/pdes/:id       # Delete PDE
```

### Solving
```
POST /api/pdes/:id/solve
Body: { params: { nx, ny, nt, ... } }
```
Solves the specified PDE with given parameters.

### LLM Integration
```
POST /api/llm/help
Body: { prompt, context }
```
Get help from the LLM.

```
POST /api/llm/generate-solution
Body: { pdeDescription }
```
Generate solution strategy using LLM.

### Solutions
```
GET  /api/pdes/:id/solutions      # Get all solutions for a PDE
POST /api/pdes/:id/solutions      # Save a solution
```

## 🧪 Numerical Methods

### Finite Difference Methods
The solver uses explicit finite difference methods for time-dependent PDEs:

- **Parabolic**: Forward time, central space (FTCS)
- **Hyperbolic**: Leapfrog method
- **Elliptic**: Gauss-Seidel iterative solver

### Stability Considerations
- Parabolic: CFL condition checked automatically
- Hyperbolic: Wave speed and CFL condition validated
- Warnings displayed when stability criteria violated

## 🎨 Visualization

Solutions are visualized using Chart.js showing:
- Horizontal cross-section through the middle of the domain
- Vertical cross-section through the middle of the domain
- Interactive charts with zoom and pan capabilities

## 🔒 Security

- All data stored locally - no external transmission
- LLM communication stays within your local network
- No authentication required (designed for single-user local use)

## 🤝 Contributing

This is a personal exploration project, but suggestions and improvements are welcome!

## 📝 Example PDEs

The system includes examples for common PDEs:

1. **Heat Equation**: Parabolic PDE modeling thermal diffusion
2. **Wave Equation**: Hyperbolic PDE for wave propagation
3. **Laplace Equation**: Elliptic PDE for steady-state phenomena

## 🛠️ Troubleshooting

### LLM Service Not Available
- Ensure Ollama or your LLM service is running
- Check the endpoint in `data/config.json`
- Verify the model is downloaded: `ollama list`

### Port Already in Use
```bash
# Change port with environment variable
PORT=3001 npm start
```

### Storage Issues
- Ensure write permissions for the `data/` directory
- Check `data/` directory is created with `.gitkeep` file

## 📚 Learn More

### Partial Differential Equations
- [PDE Introduction](https://en.wikipedia.org/wiki/Partial_differential_equation)
- [Numerical Methods](https://en.wikipedia.org/wiki/Numerical_methods_for_partial_differential_equations)

### Technologies Used
- **Backend**: Node.js, Express.js
- **Frontend**: Vanilla JavaScript, Chart.js
- **Math**: Math.js for numerical computations
- **LLM**: Ollama for local AI assistance

## 📄 License

ISC

## 🙏 Acknowledgments

Built to explore the integration of AI assistance with scientific computing in a fully local environment.
