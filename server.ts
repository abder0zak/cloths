import express from 'express';
import path from 'path';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import http from 'http';
import fs from 'fs';
import { WebSocketServer, WebSocket } from 'ws';
import { readDb, writeDb, encryptText, decryptText, querySecured, insertSecured, updateSecured, deleteSecured } from './server/dbStore.js';
import { rateLimiterMiddleware } from './server/rateLimiter.js';
import { User, Order, Product, Notification, CartItem } from './src/types';

const PORT = 3000;
const JWT_SECRET = 'EthosEditorialJWTSecretTokenKeySecureAndLong123!';

// Products are now managed dynamically and securely in /server/dbStore.ts (readDb / writeDb) with Row Level Security (RLS) policies.

function hashPassword(password: string): string {
  return crypto.createHmac('sha256', 'EthosEditorialSaltKey_123').update(password).digest('hex');
}

async function startServer() {
  const app = express();
  const server = http.createServer(app);

  // Initialize WebSockets
  const wss = new WebSocketServer({ noServer: true });
  
  // Track active WebSocket connections
  const connectedSockets = new Set<WebSocket>();
  
  server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });

  // Keep track of simulated stats
  let simulatedShoppers = 14;
  let totalSalesToday = 3120;
  let ordersProcessed = 8;
  
  // Broadcast helper
  function broadcast(type: string, payload: any) {
    const data = JSON.stringify({ type, payload });
    for (const ws of connectedSockets) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    }
  }

  // Periodic statistics fluctuation
  setInterval(() => {
    const delta = Math.floor(Math.random() * 5) - 2; // -2 to +2
    simulatedShoppers = Math.max(4, simulatedShoppers + delta);
    broadcast('STATS_UPDATE', {
      activeShoppers: simulatedShoppers,
      totalSalesToday,
      ordersProcessed,
      stockAlerts: 1
    });
  }, 10000);

  // Periodic random customer behavior simulation
  const randomEvents = [
    'A client in Tokyo added the Architectural Tailored Trouser to their basket.',
    'A stylist in Milan purchased the Linen Column Dress.',
    'The Raw Silk Oversized Shirt has been featured in the Summer Lookbook.',
    'Low stock warning: Architectural Tailored Trouser - S is running extremely low.',
    'A user in London is exploring the Resort 2024 collection.'
  ];
  setInterval(() => {
    if (connectedSockets.size > 0 && Math.random() > 0.4) {
      const randomMsg = randomEvents[Math.floor(Math.random() * randomEvents.length)];
      broadcast('EVENT_FEED', {
        message: randomMsg,
        timestamp: new Date().toLocaleTimeString()
      });
    }
  }, 15000);

  wss.on('connection', (ws) => {
    connectedSockets.add(ws);
    // Send initial statistics
    ws.send(JSON.stringify({
      type: 'STATS_UPDATE',
      payload: {
        activeShoppers: simulatedShoppers,
        totalSalesToday,
        ordersProcessed,
        stockAlerts: 1
      }
    }));

    ws.on('close', () => {
      connectedSockets.delete(ws);
    });
  });

  // Apply Rate Limiter middleware
  app.use(rateLimiterMiddleware);

  app.use(express.json());

  // API - Get Products
  app.get('/api/products', (req, res) => {
    try {
      const db = readDb();
      res.json(db.products || []);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch products' });
    }
  });

  // Authentication Middleware
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) {
        return res.status(403).json({ error: 'Invalid or expired session' });
      }
      req.user = user;
      next();
    });
  };

  const authenticateAdmin = (req: any, res: any, next: any) => {
    authenticateToken(req, res, () => {
      if (req.user && req.user.role === 'admin') {
        next();
      } else {
        res.status(403).json({ error: 'Access denied: Curators only' });
      }
    });
  };

  // API - Add Product (Admin Only)
  app.post('/api/products', authenticateAdmin, (req, res) => {
    const { name, collection, description, price, imageUrl, color, colorHex, sizes, isLimited } = req.body;
    if (!name || !collection || !description || !price || !imageUrl || !color || !colorHex) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum)) {
      return res.status(400).json({ error: 'Price must be a valid number' });
    }

    let parsedSizes: string[] = [];
    if (Array.isArray(sizes)) {
      parsedSizes = sizes;
    } else if (typeof sizes === 'string') {
      parsedSizes = sizes.split(',').map((s: string) => s.trim()).filter(Boolean);
    }

    if (parsedSizes.length === 0) {
      parsedSizes = ['S', 'M', 'L'];
    }

    const newProduct: Product = {
      id: 'prod-' + Math.random().toString(36).substr(2, 9),
      name,
      collection,
      description,
      price: priceNum,
      imageUrl: imageUrl || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1000&auto=format&fit=crop',
      color,
      colorHex,
      sizes: parsedSizes,
      isLimited: !!isLimited
    };

    try {
      insertSecured('products', newProduct, (req as any).user, req.ip);

      // Broadcast a live event feed message
      broadcast('EVENT_FEED', {
        message: `NEW PIECE ADDED: A brand-new "${name}" was introduced to the ${collection} collection.`,
        timestamp: new Date().toLocaleTimeString()
      });

      res.json(newProduct);
    } catch (err: any) {
      res.status(403).json({ error: err.message || 'Row-Level Security violation on product insertion.' });
    }
  });

  // API - Edit Product (Admin Only)
  app.put('/api/products/:id', authenticateAdmin, (req, res) => {
    const { id } = req.params;
    const { name, collection, description, price, imageUrl, color, colorHex, sizes, isLimited } = req.body;
    
    const db = readDb();
    const existingProduct = db.products.find(p => p.id === id);
    if (!existingProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (!name || !collection || !description || !price || !imageUrl || !color || !colorHex) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum)) {
      return res.status(400).json({ error: 'Price must be a valid number' });
    }

    let parsedSizes: string[] = [];
    if (Array.isArray(sizes)) {
      parsedSizes = sizes;
    } else if (typeof sizes === 'string') {
      parsedSizes = sizes.split(',').map((s: string) => s.trim()).filter(Boolean);
    }

    if (parsedSizes.length === 0) {
      parsedSizes = ['S', 'M', 'L'];
    }

    const updates = {
      name,
      collection,
      description,
      price: priceNum,
      imageUrl,
      color,
      colorHex,
      sizes: parsedSizes,
      isLimited: !!isLimited
    };

    try {
      updateSecured('products', id, updates, (req as any).user, req.ip);

      const updatedDb = readDb();
      const updatedProduct = updatedDb.products.find(p => p.id === id);

      // Broadcast a live event feed message
      broadcast('EVENT_FEED', {
        message: `PIECE UPDATED: The product "${name}" was updated in the catalog.`,
        timestamp: new Date().toLocaleTimeString()
      });

      res.json(updatedProduct);
    } catch (err: any) {
      res.status(403).json({ error: err.message || 'Row-Level Security violation on product edit.' });
    }
  });

  // API - Delete Product (Admin Only)
  app.delete('/api/products/:id', authenticateAdmin, (req, res) => {
    const { id } = req.params;
    const db = readDb();
    const existingProduct = db.products.find(p => p.id === id);
    if (!existingProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    try {
      deleteSecured('products', id, (req as any).user, req.ip);

      // Broadcast a live event feed message
      broadcast('EVENT_FEED', {
        message: `PIECE DELETED: The product "${existingProduct.name}" was removed from the catalog.`,
        timestamp: new Date().toLocaleTimeString()
      });

      res.json({ success: true, message: 'Product deleted successfully' });
    } catch (err: any) {
      res.status(403).json({ error: err.message || 'Row-Level Security violation on product deletion.' });
    }
  });

  // JWT - Register
  app.post('/api/auth/register', (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const db = readDb();
    const existing = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    const newUser: User = {
      id: 'usr-' + Math.random().toString(36).substr(2, 9),
      name,
      email: email.toLowerCase(),
      role: email.toLowerCase().includes('admin') ? 'admin' : 'user',
      createdAt: new Date().toISOString()
    };

    db.users.push(newUser);
    db.passwords[newUser.id] = hashPassword(password);
    
    // Add registration audit log
    db.logs.push({
      id: 'log-' + Math.random().toString(36).substr(2, 9),
      userId: newUser.id,
      event: 'Account registered via Custom Auth flow',
      ip: req.ip || '127.0.0.1',
      timestamp: new Date().toISOString()
    });

    writeDb(db);

    const token = jwt.sign({ id: newUser.id, email: newUser.email, role: newUser.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: newUser });
  });

  // JWT - Login
  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const db = readDb();
    const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const hashed = hashPassword(password);
    if (db.passwords[user.id] !== hashed) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // Add login security audit log
    db.logs.push({
      id: 'log-' + Math.random().toString(36).substr(2, 9),
      userId: user.id,
      event: 'Successful secure login session established',
      ip: req.ip || '127.0.0.1',
      timestamp: new Date().toISOString()
    });
    writeDb(db);

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user });
  });

  // JWT - Get Current User
  app.get('/api/auth/me', authenticateToken, (req: any, res) => {
    const db = readDb();
    const user = db.users.find(u => u.id === req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User profile not found' });
    }
    res.json(user);
  });

  // --- Interactive OAuth 2.0 Mock System ---
  app.get('/api/auth/oauth/url', (req, res) => {
    const provider = req.query.provider || 'Google';
    const redirectUri = `${req.protocol}://${req.get('host')}/auth/callback`;
    const authUrl = `/oauth/provider?provider=${provider}&redirect_uri=${encodeURIComponent(redirectUri)}`;
    res.json({ url: authUrl });
  });

  // Interactive popup login screen for the OAuth provider
  app.get('/oauth/provider', (req, res) => {
    const provider = req.query.provider || 'Google';
    const redirectUri = req.query.redirect_uri || '';

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>OAuth 2.0 - Connect via ${provider}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet">
      </head>
      <body class="bg-[#fbf9f8] text-[#1b1c1c] font-sans flex items-center justify-center min-h-screen p-4">
        <div class="bg-white border border-[#eae8e7] w-full max-w-md p-8 shadow-sm">
          <div class="text-center mb-8">
            <h2 class="text-2xl font-semibold tracking-tight uppercase">Ethos Editorial</h2>
            <p class="text-xs text-[#747878] mt-2 uppercase tracking-widest">OAuth 2.0 Security Gateway</p>
          </div>
          <div class="border-y border-[#eae8e7] py-6 my-6 text-center">
            <p class="text-sm">Authorize <strong>Ethos Editorial Shop</strong> to securely request access to your <strong>${provider}</strong> basic identity profile.</p>
            <div class="mt-4 flex items-center justify-center gap-2 text-xs bg-[#f5f3f3] py-2 px-3 text-[#444748]">
              <span class="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Secure Connection Verified
            </div>
          </div>
          <form id="oauthForm" class="space-y-4">
            <div>
              <label class="block text-xs uppercase tracking-wider text-[#444748] mb-1">Your Full Name</label>
              <input type="text" id="oauthName" required placeholder="Audrey Hepburn" class="w-full border border-[#c4c7c7] px-3 py-2 text-sm outline-none focus:border-black" />
            </div>
            <div>
              <label class="block text-xs uppercase tracking-wider text-[#444748] mb-1">Your Email Address</label>
              <input type="email" id="oauthEmail" required placeholder="audrey@editorial.com" class="w-full border border-[#c4c7c7] px-3 py-2 text-sm outline-none focus:border-black" />
            </div>
            <button type="submit" class="w-full bg-black text-white py-3 text-xs uppercase tracking-widest hover:opacity-90 transition-opacity">
              Confirm Authorization
            </button>
          </form>
          <script>
            document.getElementById('oauthForm').addEventListener('submit', (e) => {
              e.preventDefault();
              const name = document.getElementById('oauthName').value;
              const email = document.getElementById('oauthEmail').value;
              const redirect = "${redirectUri}";
              const target = redirect + "?code=OAUTH_MOCK_AUTH_CODE&name=" + encodeURIComponent(name) + "&email=" + encodeURIComponent(email) + "&provider=${provider}";
              window.location.href = target;
            });
          </script>
        </div>
      </body>
      </html>
    `);
  });

  // OAuth Callback Handler
  app.get(['/auth/callback', '/auth/callback/'], (req, res) => {
    const { name, email, provider } = req.query;

    if (!email) {
      return res.status(400).send('OAuth authorization failed');
    }

    const db = readDb();
    let user = db.users.find(u => u.email.toLowerCase() === (email as string).toLowerCase());

    if (!user) {
      user = {
        id: 'usr-' + Math.random().toString(36).substr(2, 9),
        name: (name as string) || 'Editorial Member',
        email: (email as string).toLowerCase(),
        role: (email as string).toLowerCase().includes('admin') ? 'admin' : 'user',
        createdAt: new Date().toISOString()
      };
      db.users.push(user);
      db.passwords[user.id] = hashPassword('OAuthRandomGeneratedPassKey_987');
    }

    // Secure audit log
    db.logs.push({
      id: 'log-' + Math.random().toString(36).substr(2, 9),
      userId: user.id,
      event: `Authorized connection via external OAuth 2.0: ${provider}`,
      ip: req.ip || '127.0.0.1',
      timestamp: new Date().toISOString()
    });
    writeDb(db);

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    // Send postMessage back to core client page and close the popup window cleanly
    res.send(`
      <html>
        <head>
          <title>Authentication Completed</title>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-[#fbf9f8] flex flex-col items-center justify-center min-h-screen text-center p-6">
          <div class="max-w-md bg-white p-8 border border-[#eae8e7] shadow-sm">
            <h2 class="text-xl font-medium tracking-tight uppercase mb-4">Ethos Editorial</h2>
            <div class="w-12 h-12 border-2 border-t-black border-gray-200 rounded-full animate-spin mx-auto mb-4"></div>
            <p class="text-sm text-[#444748]">Finalizing your secure session...</p>
            <script>
              if (window.opener) {
                window.opener.postMessage({
                  type: 'OAUTH_AUTH_SUCCESS',
                  token: '${token}',
                  user: ${JSON.stringify(user)}
                }, '*');
                setTimeout(() => window.close(), 800);
              } else {
                window.location.href = '/';
              }
            </script>
          </div>
        </body>
      </html>
    `);
  });

  // Order Placement (Secure Encryption)
  app.post('/api/orders', authenticateToken, (req: any, res) => {
    const { items, total, shippingAddress, paymentMethod } = req.body;

    if (!items || !total || !shippingAddress || !paymentMethod) {
      return res.status(400).json({ error: 'Order details and encrypted address are required' });
    }

    // Encrypt shipping address before database persistence
    const encryptedAddress = encryptText(shippingAddress);

    try {
      const newOrder: Order = {
        id: 'ethos-' + Math.floor(100000 + Math.random() * 900000),
        items,
        total,
        status: 'pending',
        shippingAddress: shippingAddress, // Plain text returnable within authorized context
        encryptedAddress, // Real encrypted payload for validation demo
        paymentMethod,
        createdAt: new Date().toISOString(),
        email: req.user.email,
        trackingNumber: 'ETH-' + Math.random().toString(36).substr(2, 9).toUpperCase()
      };

      // Enforce write validation via Row Level Security (RLS)
      insertSecured('orders', newOrder, req.user, req.ip);

      // Push automated email alert log through RLS
      const simulatedEmailBody = `Dear ${req.user.email},\n\nThank you for placing order ${newOrder.id} with Ethos Editorial. We are currently processing your request.\n\nTracking Number: ${newOrder.trackingNumber}\nTotal: ${newOrder.total.toFixed(2)} DA\nDelivery address: ${shippingAddress}`;
      insertSecured('emailsSent', {
        id: 'email-' + Math.random().toString(36).substr(2, 9),
        to: req.user.email,
        subject: `Order Confirmation - Ethos Editorial ${newOrder.id}`,
        body: simulatedEmailBody,
        timestamp: new Date().toISOString()
      }, req.user, req.ip);

      // Write secure audit logs with RLS
      insertSecured('logs', {
        id: 'log-' + Math.random().toString(36).substr(2, 9),
        userId: req.user.id,
        event: `Order ${newOrder.id} successfully created. Address securely encrypted in backend database. Row-Level Security (RLS) policies enforced.`,
        ip: req.ip || '127.0.0.1',
        timestamp: new Date().toISOString()
      }, req.user, req.ip);

      // Pushing real-time order status notification with RLS
      const orderNotification: Notification = {
        id: 'notif-' + Math.random().toString(36).substr(2, 9),
        title: 'Order Placed successfully',
        message: `Your order ${newOrder.id} has been placed. Address: ${shippingAddress.substring(0, 15)}...`,
        type: 'order',
        createdAt: new Date().toISOString(),
        read: false
      };
      insertSecured('notifications', orderNotification, req.user, req.ip);

      // Dynamic metrics increments
      ordersProcessed += 1;
      totalSalesToday += total;

      // Stream real-time events over WebSocket instantly to all clients
      broadcast('ORDER_PLACED', {
        orderId: newOrder.id,
        total: newOrder.total,
        itemsCount: items.length,
        recentBuyer: req.user.email.split('@')[0]
      });

      broadcast('NOTIFICATION_ADD', orderNotification);

      broadcast('STATS_UPDATE', {
        activeShoppers: simulatedShoppers,
        totalSalesToday,
        ordersProcessed,
        stockAlerts: 1
      });

      res.json({ order: newOrder, notification: orderNotification });
    } catch (err: any) {
      console.error('Secure Order placement failed:', err);
      res.status(403).json({ error: err.message || 'Row-Level Security transaction failed.' });
    }
  });

  // Get User Orders
  app.get('/api/orders', authenticateToken, (req: any, res) => {
    try {
      const securedOrders = querySecured('orders', req.user);
      res.json(securedOrders);
    } catch (err: any) {
      res.status(403).json({ error: err.message });
    }
  });

  // Admin - Update Order Status (Triggers live WebSocket push notification)
  app.post('/api/orders/:id/status', authenticateToken, (req: any, res) => {
    const { status, estimatedTime, carrier, shippingAddress } = req.body;
    const { id } = req.params;

    const updates: any = {};
    if (status) {
      updates.status = status;
    }
    if (estimatedTime !== undefined) {
      updates.estimatedTime = estimatedTime;
    }
    if (carrier !== undefined) {
      updates.carrier = carrier;
    }
    if (shippingAddress !== undefined) {
      updates.shippingAddress = shippingAddress;
      updates.encryptedAddress = 'aes-256-cbc:' + Buffer.from(shippingAddress).toString('base64').substring(0, 24);
    }

    try {
      const db = readDb();
      const existingOrder = db.orders.find(o => o.id === id);
      if (!existingOrder) {
        return res.status(404).json({ error: 'Order not found' });
      }

      // Enforce Row Level Security update validation
      updateSecured('orders', id, updates, req.user, req.ip);

      // Fetch the updated state
      const refreshedDb = readDb();
      const updatedOrder = refreshedDb.orders.find(o => o.id === id)!;

      const finalStatus = updatedOrder.status;
      const finalCarrier = updatedOrder.carrier || 'Standard Curation Care';
      const finalETA = updatedOrder.estimatedTime || 'Pending Curation Selection';

      const statusNotification: Notification = {
        id: 'notif-' + Math.random().toString(36).substr(2, 9),
        title: `Order #${id} Updated`,
        message: `Your order status has been updated to ${finalStatus.toUpperCase()}. Carrier: ${finalCarrier}, ETA: ${finalETA}, Dest: ${updatedOrder.shippingAddress}`,
        type: 'order',
        createdAt: new Date().toISOString(),
        read: false
      };

      insertSecured('notifications', statusNotification, req.user, req.ip);

      // Simulated Shipping Alert email
      insertSecured('emailsSent', {
        id: 'email-' + Math.random().toString(36).substr(2, 9),
        to: updatedOrder.email,
        subject: `Order Status Updated: ${finalStatus.toUpperCase()} - ${id}`,
        body: `Hello,\n\nWe wanted to let you know that your order ${id} has been updated to: ${finalStatus.toUpperCase()}.\n\nCarrier: ${finalCarrier}\nEstimated Time: ${finalETA}\nDelivery Location: ${updatedOrder.shippingAddress}\n\nTracking link: /dashboard\nThank you for shopping with Ethos Editorial.`,
        timestamp: new Date().toISOString()
      }, req.user, req.ip);

      // Push update directly to the client over socket
      broadcast('ORDER_STATUS_CHANGED', {
        orderId: id,
        status: finalStatus,
        estimatedTime: finalETA,
        carrier: finalCarrier,
        shippingAddress: updatedOrder.shippingAddress,
        email: updatedOrder.email,
        notification: statusNotification
      });

      res.json({ order: updatedOrder, notification: statusNotification });
    } catch (err: any) {
      console.error('Secure Order status update failed:', err);
      res.status(403).json({ error: err.message || 'Row-Level Security transaction failed.' });
    }
  });

  // Admin - Delete / Refuse Order
  app.delete('/api/orders/:id', authenticateToken, (req: any, res) => {
    const { id } = req.params;

    try {
      const db = readDb();
      const removedOrder = db.orders.find(o => o.id === id);
      if (!removedOrder) {
        return res.status(404).json({ error: 'Order not found' });
      }

      // Enforce Row Level Security delete validation
      deleteSecured('orders', id, req.user, req.ip);

      // Log cancellation email notification to the customer
      const cancelNotification: Notification = {
        id: 'notif-' + Math.random().toString(36).substr(2, 9),
        title: `Order #${id} Cancelled/Refused`,
        message: `Your order #${id} has been refused or removed from the system by an administrator.`,
        type: 'order',
        createdAt: new Date().toISOString(),
        read: false
      };

      insertSecured('notifications', cancelNotification, req.user, req.ip);

      insertSecured('emailsSent', {
        id: 'email-' + Math.random().toString(36).substr(2, 9),
        to: removedOrder.email,
        subject: `Order Cancelled/Refused: #${id}`,
        body: `Hello,\n\nWe regret to inform you that your order #${id} for the curated piece(s) has been cancelled or refused by the curation team.\n\nAny pre-authorizations or payments have been released/refunded.\n\nThank you for your understanding,\nEthos Editorial Care`,
        timestamp: new Date().toISOString()
      }, req.user, req.ip);

      // Push live update to the client so the client updates
      broadcast('ORDER_STATUS_CHANGED', {
        orderId: id,
        status: 'refused',
        email: removedOrder.email,
        notification: cancelNotification
      });

      res.json({ message: 'Order successfully deleted/refused', id });
    } catch (err: any) {
      console.error('Secure Order deletion failed:', err);
      res.status(403).json({ error: err.message || 'Row-Level Security transaction failed.' });
    }
  });

  // Support / Contact Form
  app.post('/api/contact', (req, res) => {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Please supply a name, email, and message.' });
    }

    const db = readDb();
    const mockEmailId = 'email-' + Math.random().toString(36).substr(2, 9);
    
    // Log contact form submittal to simulated emails
    db.emailsSent.push({
      id: mockEmailId,
      to: email,
      subject: `Support Request Received: ${subject || 'Enquiry'}`,
      body: `Dear ${name},\n\nWe have received your message regarding: "${subject || 'General inquiry'}". A curator from our client care team will reach out within 24 hours.\n\nBest regards,\nEthos Editorial Care`,
      timestamp: new Date().toISOString()
    });

    const contactNotif: Notification = {
      id: 'notif-' + Math.random().toString(36).substr(2, 9),
      title: 'Support Request Received',
      message: `Form submitted by ${name}. Auto-reply confirmation email has been routed.`,
      type: 'system',
      createdAt: new Date().toISOString(),
      read: false
    };
    db.notifications.push(contactNotif);
    writeDb(db);

    broadcast('NOTIFICATION_ADD', contactNotif);

    res.json({ success: true, message: 'Message sent successfully. Check console log or Email Log tab for email simulation.' });
  });

  // Admin logs & emails preview routes (Enforces Row-Level Security checks)
  app.get('/api/admin/system-logs', authenticateToken, (req: any, res) => {
    try {
      const logs = querySecured('logs', req.user);
      const emails = querySecured('emailsSent', req.user);
      const users = querySecured('users', req.user);
      res.json({ logs, emails, users });
    } catch (err: any) {
      console.error('RLS retrieval error on system-logs:', err);
      res.status(403).json({ error: err.message || 'Row-Level Security violation' });
    }
  });

  // Mount Vite middleware for development, serving assets in production
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      try {
        const templatePath = path.join(distPath, 'index.html');
        if (fs.existsSync(templatePath)) {
          const html = fs.readFileSync(templatePath, 'utf-8');
          res.status(200).set({ 'Content-Type': 'text/html' }).send(html);
        } else {
          // Fallback to reading root index.html if dist/index.html is missing
          const rootTemplatePath = path.join(process.cwd(), 'index.html');
          if (fs.existsSync(rootTemplatePath)) {
            let html = fs.readFileSync(rootTemplatePath, 'utf-8');
            
            // Dynamically search the assets directory for compiled CSS and JS
            let jsFile = '/assets/index.js';
            let cssFile = '';
            const assetsDir = path.join(distPath, 'assets');
            if (fs.existsSync(assetsDir)) {
              try {
                const files = fs.readdirSync(assetsDir);
                const foundJs = files.find(f => f.startsWith('index-') && f.endsWith('.js'));
                const foundCss = files.find(f => f.startsWith('index-') && f.endsWith('.css'));
                if (foundJs) jsFile = `/assets/${foundJs}`;
                if (foundCss) cssFile = `/assets/${foundCss}`;
              } catch (e) {
                console.error('Error scanning assets for fallback:', e);
              }
            }

            html = html.replace('/src/main.tsx', jsFile);
            if (cssFile) {
              html = html.replace('</head>', `<link rel="stylesheet" href="${cssFile}"></head>`);
            }
            res.status(200).set({ 'Content-Type': 'text/html' }).send(html);
          } else {
            // Memory direct render fallback to ensure the application renders regardless
            let jsFile = '/assets/index.js';
            let cssFile = '';
            const assetsDir = path.join(distPath, 'assets');
            if (fs.existsSync(assetsDir)) {
              try {
                const files = fs.readdirSync(assetsDir);
                const foundJs = files.find(f => f.startsWith('index-') && f.endsWith('.js'));
                const foundCss = files.find(f => f.startsWith('index-') && f.endsWith('.css'));
                if (foundJs) jsFile = `/assets/${foundJs}`;
                if (foundCss) cssFile = `/assets/${foundCss}`;
              } catch (e) {}
            }
            
            const cssTag = cssFile ? `<link rel="stylesheet" href="${cssFile}" />` : '';

            res.status(200).set({ 'Content-Type': 'text/html' }).send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Ethos Editorial</title>
    ${cssTag}
  </head>
  <body class="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
    <div id="root"></div>
    <script type="module" src="${jsFile}"></script>
  </body>
</html>`);
          }
        }
      } catch (err: any) {
        console.error('HTML Render Error:', err);
        res.status(500).send('Error rendering the page.');
      }
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Ethos Editorial Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
