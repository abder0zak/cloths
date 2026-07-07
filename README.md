# Cloths Store

A full-stack e-commerce application for a clothing store, featuring a React/Vite frontend and a FastAPI backend with WebSocket support for real-time updates.

## Features

- Product browsing and search
- User authentication (JWT-based)
- Shopping cart and checkout
- Order management
- Admin dashboard for product and order management
- Real-time updates via WebSocket (stock updates, order notifications, events)
- Responsive design with Tailwind CSS
- Secure password hashing and encryption
- Role-based access control (admin/user)

## Technology Stack

### Frontend
- React 19
- Vite 6
- TypeScript
- Tailwind CSS 4
- Lucide React icons
- Framer Motion for animations
- JWT decoding for client-side auth

### Backend
- FastAPI (Python)
- Uvicorn ASGI server
- JWT authentication (PyJWT)
- Python-dotenv for environment variables
- WebSocket support
- Custom role-based security layer
- In-memory database simulation (JSON file-based)

### Development Tools
- ESLint (via TypeScript type checking)
- Prettier (configured via VSCode settings)
- Git for version control

## Getting Started

### Prerequisites

- Node.js (v18+)
- Python (v3.8+)
- npm or yarn
- Git

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd cloths store/cloths
   ```

2. Install frontend dependencies:
   ```bash
   npm install
   ```

3. Install Python dependencies:
   ```bash
   pip install fastapi uvicorn python-jwt[crypto] python-dotenv
   ```

4. Create a `.env` file in the root directory based on `.env.example`:
   ```env
   GEMINI_API_KEY="your_gemini_api_key_here"
   APP_URL="http://localhost:3000"
   ```

   > Note: The GEMINI_API_KEY is required for AI features (if implemented). The APP_URL should be the base URL of your application.

5. Start the development server:
   ```bash
   npm run dev
   ```

   This will start both the FastAPI backend (on port 3000) and proxy the Vite development server (on port 5173) through the backend.

6. Open your browser to `http://localhost:3000` to view the application.

### Available Scripts

- `npm run dev` - Start development server (backend + frontend proxy)
- `npm run build` - Build frontend for production
- `npm run start` - Start production backend with built frontend
- `npm run preview` - Preview production build locally
- `npm run clean` - Remove dist directory
- `npm run lint` - Type-check TypeScript code

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | API key for Google Gemini AI (used for AI features) | Yes |
| `APP_URL` | Base URL of the application (used for OAuth callbacks, etc.) | Yes |
| `NODE_ENV` | Environment mode (`development` or `production`) | No (defaults to development) |

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user profile (protected)

### Products
- `GET /api/products` - Get all products
- `POST /api/products` - Create a new product (admin only)
- `PUT /api/products/:id` - Update a product (admin only)
- `DELETE /api/products/:id` - Delete a product (admin only)

### Orders
- `POST /api/orders` - Create a new order
- `GET /api/orders` - Get user's orders (protected)
- `POST /api/orders/:id/status` - Update order status (admin only)
- `DELETE /api/orders/:id` - Delete/cancel order (admin only)

### Cart & Checkout
*(Handled client-side with context/API calls to products and orders endpoints)*

### Contact
- `POST /api/contact` - Submit contact form

### Admin
- `GET /api/admin/system-logs` - Get system logs, emails, and users (admin only)

### WebSocket
- `ws://localhost:3000/` - WebSocket endpoint for real-time updates

## Real-Time Features

The application uses WebSocket connections to provide real-time updates for:
- Store statistics (active shoppers, sales, etc.)
- Event feeds (new products, orders, etc.)
- Order status changes
- Notifications
- Inventory updates

## Database

The application uses a JSON file-based database (`db.json`) located in the project root for simplicity. In a production environment, this would be replaced with a proper database like PostgreSQL or MongoDB.

The database contains collections for:
- `users` - Registered users
- `products` - Product catalog
- `orders` - Customer orders
- `notifications` - User notifications
- `emailsSent` - Simulated email logs
- `logs` - System audit logs
- `carts` - Shopping carts (if implemented)

## Security Features

- JWT-based authentication with expiration
- Password hashing using bcryptjs (via custom implementation)
- Role-based access control (admin vs user)
- Row-level security (RLS) simulation for data access
- Input validation and sanitization
- Secure HTTP headers via CORS configuration
- Environment variable protection

## Development Guidelines

### Code Structure
- `/src` - Frontend React components and logic
- `/server` - Backend Python modules (database, rate limiting)
- `server.py` - Main FastAPI application
- `/public` - Static assets

### Styling
- Tailwind CSS utility-first approach
- Custom CSS in `src/index.css` for base styles
- Responsive design principles

### State Management
- React Context API for global state (auth, cart, etc.)
- Local component state for UI-specific data
- React Query could be added for server state in future enhancements

### API Communication
- Fetch API calls to back enriched context.
  // Custom fetch wrapper with token handling (see src/utils/api.js)
  // WebSocket service for real-time updates

## Deployment

### Production Build
1. Build the frontend: `npm run build`
2. Set `NODE_ENV=production` in your environment
3. Start the server: `npm run start`
4. The backend will serve the built frontend from the `dist` directory

### Deployment Platforms
- **Vercel**: Use the `vercel.json` configuration provided
- **Render**: Create a web service with the build and start commands
- **Docker**: Create a Dockerfile that builds the frontend and runs the backend
- **Traditional VPS**: Install Node.js and Python dependencies, then run the start script

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Inspiration from modern e-commerce platforms
- Open-source libraries and frameworks used
- Ethos Editorial concept for the boutique fashion store theme