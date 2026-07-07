# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This repository contains an e-commerce application for a clothing store called "Ethos Editorial". The application consists of:
- A frontend built with React, TypeScript, Vite, and Tailwind CSS
- A backend built with Python FastAPI
- WebSocket connections for real-time updates
- Gemini AI integration for AI-powered features
- JWT-based authentication
- Role-based access control (admin/user)

## Technology Stack

### Frontend
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: React Context/API (via custom hooks and context)
- **Animation**: Motion (Framer Motion)
- **Icons**: Lucide React
- **PDF Generation**: jsPDF
- **WebSocket**: Native WebSocket API (backend uses `ws`)

### Backend
- **Framework**: FastAPI (Python)
- **Authentication**: JWT (jsonwebtoken) with password hashing
- **Database**: Custom JSON-based storage with encryption and row-level security (RLS) simulation
- **Real-time Communication**: WebSocket server for live updates
- **HTTP Client**: HTTPX for external API calls
- **Environment**: Python 3.x

### Development Tools
- **Package Manager**: npm (for frontend) and pip (implicit for Python dependencies)
- **Linting**: TypeScript type checking (`tsc --noEmit`)
- **Environment Variables**: `.env` file (see `.env.example`)
- **Type Checking**: TypeScript

## Project Structure

```
├── src/                    # Frontend source code
│   ├── components/         # React components
│   ├── App.tsx             # Main app component
│   ├── index.css           # Global styles
│   ├── main.tsx            # Entry point
│   └── types.ts            # TypeScript type definitions
├── server/
│   ├── db_store.py         # Database storage layer with encryption and RLS
│   └── rate_limiter.py     # Rate limiting middleware
├── server.py               # FastAPI application entry point
├── public/                 # Static assets
├── assets/                 # Additional assets (images, etc.)
├package.json               # npm dependencies and scripts
├ requirements.txt          # Python dependencies (if separate, but we use inline in server.py)
├ tsconfig.json             # TypeScript configuration
├ vite.config.ts            # Vite configuration
├ vercel.json               # Vercel deployment configuration
└ README.md                 # Project overview
```

## Development Commands

### Install Dependencies
```bash
# Install frontend dependencies
npm install

# Install Python dependencies (if using a virtual environment is recommended)
# Note: The server.py imports modules that may need to be installed: fastapi, uvicorn, python-jwt, etc.
# You can install them via:
pip install fastapi uvicorn python-jwt[crypto] python-dotenv
```

### Start Development Server
```bash
# This will start both the Vite dev server (via the Python script) and the FastAPI server
npm run dev
```
The script `npm run dev` runs `python3 server.py`, which:
1. Starts a Vite development server on port 5173 (for frontend)
2. Starts the FastAPI server on port 3000 (for backend)
3. Sets up WebSocket connections for real-time updates
4. Starts background tasks for statistics and event feeds

### Start Production Server
```bash
npm run start
```
This sets `NODE_ENV=production` and runs the Python server, which will serve the built frontend from the `dist` directory.

### Build for Production
```bash
npm run build
```
This will:
1. Build the frontend React app using Vite (output to `dist` directory)
2. The Python server will then serve these static assets in production

### Preview Production Build
```bash
npm run preview
```
This runs `vite preview` to preview the built frontend locally.

### Lint Code
```bash
npm run lint
```
This runs TypeScript type checking (`tsc --noEmit`) to ensure type safety.

### Clean Build Artifacts
```bash
npm run clean
```
Removes the `dist` directory.

## Environment Variables

Create a `.env` file in the root directory based on `.env.example`:

```
# GEMINI_API_KEY: Required for Gemini AI API calls.
# Get your API key from https://makersuite.google.com/app/apikey
GEMINI_API_KEY="your_gemini_api_key_here"

# APP_URL: The URL where this app is hosted.
# For local development, use: http://localhost:3000
APP_URL="http://localhost:3000"
```

Note: In production (Vercel), these are set automatically via the platform.

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user info (protected)

### Products
- `GET /api/products` - Get all products
- `POST /api/products` - Create new product (admin only)
- `PUT /api/products/:id` - Update product (admin only, owner only via RLS)
- `DELETE /api/products/:id` - Delete product (admin only, owner only via RLS)

### Orders
- `POST /api/orders` - Create a new order (protected)

### Cart & Favorites
*(Managed client-side via context/localStorage in this implementation)*

### WebSocket
- `WS /` - WebSocket connection for real-time stats and events

### Admin
- `GET /api/admin/system-logs` - Get system logs, emails, and users (admin only)

### OAuth Mock
- `GET /api/auth/oauth/url` - Get OAuth URL for mock providers
- `GET /oauth/provider` - Mock OAuth provider page
- `GET /auth/callback` - OAuth callback handler

## Database Structure (Simulated)

The application uses a simulated database stored in a JSON file (managed by `server/db_store.py`). Collections include:
- `users`: User accounts
- `passwords`: Hashed passwords (keyed by user ID)
- `products`: Product catalog
- `orders`: Customer orders
- `notifications`: User notifications
- `emailsSent`: Sent email simulations
- `logs`: System and user activity logs
- `notifications`: In-app notifications

Each collection implements row-level security (RLS) where users can only access their own data unless they are an admin.

## Security Features

1. **Authentication**: JWT-based with 7-day expiration
2. **Authorization**: Role-based (admin/user) and route-specific protections
3. **Row-Level Security (RLS)**: Simulated in the data access layer; users can only modify their own resources
4. **Password Hashing**: Using bcryptjs equivalent (custom implementation in `db_store.py`)
5. **Data Encryption**: Sensitive fields like shipping addresses are encrypted at rest
6. **Rate Limiting**: Custom middleware to prevent abuse
7. **CORS**: Configured to allow all origins (adjust for production)
8. **Input Validation**: Server-side validation for all endpoints

## Real-Time Features

- WebSocket connection for live updates
- Statistics fluctuation simulation (active shoppers, sales, etc.)
- Event feed simulation (customer activities)
- Automatic broadcasting of state changes to connected clients

## AI Integration

- Integrated with Google's Gemini AI via the `@google/genai` package
- Used for generating product descriptions, marketing copy, or other AI-driven features
- API key stored in environment variables

## Deployment

The application is configured for deployment on Vercel:
- `vercel.json` configures the build and routes
- The frontend is built as a static SPA
- The backend (FastAPI) is deployed as a serverless function or container

## Development Guidelines

1. **Code Style**:
   - Follow TypeScript ES6+ standards
   - Use descriptive variable and function names
   - Keep functions small and focused
   - Add comments for complex logic
   - Follow existing code patterns in the repository

2. **State Management**:
   - Prefer React Context for global state (auth, cart, etc.)
   - Use local component state for UI-specific data
   - Consider state synchronization with WebSocket updates

3. **API Design**:
   - Follow RESTful conventions
   - Use appropriate HTTP status codes
   - Validate all inputs server-side
   - Implement proper error handling

4. **Security**:
   - Never hardcode secrets
   - Always validate and sanitize user input
   - Implement proper CORS policies in production
   - Use HTTPS in production

5. **Testing**:
   - While there's no test suite configured yet, consider adding unit and integration tests
   - Test authentication flows, product CRUD operations, and WebSocket interactions

## Troubleshooting

### Common Issues

1. **Module Not Found Errors (Python)**
   - Solution: Install required Python packages: `pip install fastapi uvicorn python-jwt[crypto] python-dotenv`

2. **Port Already in Use**
   - The backend runs on port 3000, frontend on 5173 (dev)
   - Change ports in `server.py` and `vite.config.ts` if needed

3. **Environment Variables Not Loading**
   - Ensure `.env` file is in the root directory
   - Restart the development server after adding/editing `.env`

4. **TypeScript Errors**
   - Run `npm run lint` to see type errors
   - Ensure all imports have proper type definitions

5. **WebSocket Connection Issues**
   - Check browser console for WebSocket errors
   - Ensure the backend is running and accessible
   - Verify CORS settings if frontend and backend are on different ports/domains

## Getting Started

1. Clone the repository
2. Run `npm install` to install frontend dependencies
3. Install Python dependencies: `pip install fastapi uvicorn python-jwt[crypto] python-dotenv`
4. Create a `.env` file based on `.env.example` with your GEMINI_API_KEY and APP_URL
5. Start the development server: `npm run dev`
6. Open your browser to `http://localhost:3000` (the proxy will serve the Vite dev server)
7. The API will be available at `http://localhost:3000/api`

## Additional Resources

- React Documentation: https://react.dev/
- Vite Documentation: https://vitejs.dev/
- Tailwind CSS: https://tailwindcss.com/
- FastAPI Documentation: https://fastapi.tiangolo.com/
- TypeScript Documentation: https://www.typescriptlang.org/docs/
- JWT Authentication: https://jwt.io/introduction/
- WebSocket API: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket_API