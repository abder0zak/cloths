import os
import sys
import json
import random
import string
import datetime
import asyncio
import subprocess
import urllib.parse
from typing import Dict, Any, List, Optional
from contextlib import asynccontextmanager

import jwt
import httpx
from fastapi import FastAPI, Request, HTTPException, Depends, Header, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware

# Local Imports
from server.db_store import (
    read_db, write_db, hash_password, encrypt_text, decrypt_text,
    query_secured, insert_secured, update_secured, delete_secured, get_random_id
)
from server.rate_limiter import RateLimiterMiddleware

JWT_SECRET = 'EthosEditorialJWTSecretTokenKeySecureAndLong123!'
PORT = 3000

# Server Stats & WebSocket Connections
STATS = {
    "activeShoppers": 14,
    "totalSalesToday": 3120,
    "ordersProcessed": 8,
    "stockAlerts": 1
}

connected_sockets = set()

async def broadcast(message_type: str, payload: Any):
    data = json.dumps({"type": message_type, "payload": payload})
    for ws in list(connected_sockets):
        try:
            await ws.send_text(data)
        except Exception:
            connected_sockets.discard(ws)

# Periodic statistical fluctuation loop
async def stats_fluctuation_loop():
    global STATS
    while True:
        try:
            await asyncio.sleep(10)
            delta = random.randint(-2, 2)
            STATS["activeShoppers"] = max(4, STATS["activeShoppers"] + delta)
            await broadcast("STATS_UPDATE", STATS)
        except asyncio.CancelledError:
            break
        except Exception as e:
            print("[StatsLoop] Error:", e)
            await asyncio.sleep(5)

random_events = [
    'A client in Tokyo added the Architectural Tailored Trouser to their basket.',
    'A stylist in Milan purchased the Linen Column Dress.',
    'The Raw Silk Oversized Shirt has been featured in the Summer Lookbook.',
    'Low stock warning: Architectural Tailored Trouser - S is running extremely low.',
    'A user in London is exploring the Resort 2024 collection.'
]

# Periodic random customer behaviors loop
async def event_feed_loop():
    while True:
        try:
            await asyncio.sleep(15)
            if connected_sockets and random.random() > 0.4:
                msg = random.choice(random_events)
                await broadcast("EVENT_FEED", {
                    "message": msg,
                    "timestamp": datetime.datetime.now().strftime("%I:%M:%S %p")
                })
        except asyncio.CancelledError:
            break
        except Exception as e:
            print("[EventFeedLoop] Error:", e)
            await asyncio.sleep(5)

# Lifespan context manager for startup and shutdown
@asynccontextmanager
async def lifespan(app: FastAPI):
    vite_process = None
    if os.getenv("NODE_ENV") != "production":
        print("[DevServer] Starting internal Vite server on port 5173...")
        vite_process = subprocess.Popen(
            ["npx", "vite", "--port", "5173", "--host", "127.0.0.1"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
        await asyncio.sleep(1.5)  # Let Vite boot up

    # Start asyncio tasks
    stats_task = asyncio.create_task(stats_fluctuation_loop())
    feed_task = asyncio.create_task(event_feed_loop())

    yield

    # Clean up tasks and subprocess
    stats_task.cancel()
    feed_task.cancel()
    if vite_process:
        print("[DevServer] Terminating internal Vite server...")
        vite_process.terminate()
        try:
            vite_process.wait(timeout=3)
        except subprocess.TimeoutExpired:
            vite_process.kill()

app = FastAPI(lifespan=lifespan)

# Add Rate Limiting Middleware
app.add_middleware(RateLimiterMiddleware)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "127.0.0.1"

# Auth Helpers
async def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication required")
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=403, detail="Session expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=403, detail="Invalid or expired session")

async def get_current_admin(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Access denied: Curators only")
    return user


# --- REST API ENDPOINTS ---

# GET Products
@app.get("/api/products")
async def get_products():
    try:
        db = read_db()
        return db.get("products", [])
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch products")

# POST Product (Admin only)
@app.post("/api/products")
async def add_product(request: Request, user: Dict[str, Any] = Depends(get_current_admin)):
    body = await request.json()
    name = body.get("name")
    collection = body.get("collection")
    description = body.get("description")
    price = body.get("price")
    image_url = body.get("imageUrl")
    color = body.get("color")
    color_hex = body.get("colorHex")
    sizes = body.get("sizes")
    is_limited = body.get("isLimited")

    if not name or not collection or not description or price is None or not color or not color_hex:
        raise HTTPException(status_code=400, detail="All fields are required")

    try:
        price_num = float(price)
    except ValueError:
        raise HTTPException(status_code=400, detail="Price must be a valid number")

    parsed_sizes = []
    if isinstance(sizes, list):
        parsed_sizes = sizes
    elif isinstance(sizes, str):
        parsed_sizes = [s.strip() for s in sizes.split(",") if s.strip()]

    if not parsed_sizes:
        parsed_sizes = ['S', 'M', 'L']

    new_product = {
        "id": get_random_id("prod-"),
        "name": name,
        "collection": collection,
        "description": description,
        "price": price_num,
        "imageUrl": image_url or "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1000&auto=format&fit=crop",
        "color": color,
        "colorHex": color_hex,
        "sizes": parsed_sizes,
        "isLimited": bool(is_limited)
    }

    try:
        client_ip = get_client_ip(request)
        insert_secured("products", new_product, user, client_ip)
        
        await broadcast("EVENT_FEED", {
            "message": f"NEW PIECE ADDED: A brand-new \"{name}\" was introduced to the {collection} collection.",
            "timestamp": datetime.datetime.now().strftime("%I:%M:%S %p")
        })
        return new_product
    except PermissionError as pe:
        raise HTTPException(status_code=403, detail=str(pe))
    except Exception as e:
        raise HTTPException(status_code=403, detail="Row-Level Security violation on product insertion.")

# PUT Product (Admin only)
@app.put("/api/products/{id}")
async def edit_product(id: str, request: Request, user: Dict[str, Any] = Depends(get_current_admin)):
    body = await request.json()
    name = body.get("name")
    collection = body.get("collection")
    description = body.get("description")
    price = body.get("price")
    image_url = body.get("imageUrl")
    color = body.get("color")
    color_hex = body.get("colorHex")
    sizes = body.get("sizes")
    is_limited = body.get("isLimited")

    db = read_db()
    existing_product = next((p for p in db.get("products", []) if p["id"] == id), None)
    if not existing_product:
        raise HTTPException(status_code=404, detail="Product not found")

    if not name or not collection or not description or price is None or not image_url or not color or not color_hex:
        raise HTTPException(status_code=400, detail="All fields are required")

    try:
        price_num = float(price)
    except ValueError:
        raise HTTPException(status_code=400, detail="Price must be a valid number")

    parsed_sizes = []
    if isinstance(sizes, list):
        parsed_sizes = sizes
    elif isinstance(sizes, str):
        parsed_sizes = [s.strip() for s in sizes.split(",") if s.strip()]

    if not parsed_sizes:
        parsed_sizes = ['S', 'M', 'L']

    updates = {
        "name": name,
        "collection": collection,
        "description": description,
        "price": price_num,
        "imageUrl": image_url,
        "color": color,
        "colorHex": color_hex,
        "sizes": parsed_sizes,
        "isLimited": bool(is_limited)
    }

    try:
        client_ip = get_client_ip(request)
        update_secured("products", id, updates, user, client_ip)
        
        updated_db = read_db()
        updated_product = next((p for p in updated_db.get("products", []) if p["id"] == id), None)

        await broadcast("EVENT_FEED", {
            "message": f"PIECE UPDATED: The product \"{name}\" was updated in the catalog.",
            "timestamp": datetime.datetime.now().strftime("%I:%M:%S %p")
        })
        return updated_product
    except PermissionError as pe:
        raise HTTPException(status_code=403, detail=str(pe))
    except Exception as e:
        raise HTTPException(status_code=403, detail="Row-Level Security violation on product edit.")

# DELETE Product (Admin only)
@app.delete("/api/products/{id}")
async def delete_product(id: str, request: Request, user: Dict[str, Any] = Depends(get_current_admin)):
    db = read_db()
    existing_product = next((p for p in db.get("products", []) if p["id"] == id), None)
    if not existing_product:
        raise HTTPException(status_code=404, detail="Product not found")

    try:
        client_ip = get_client_ip(request)
        delete_secured("products", id, user, client_ip)

        await broadcast("EVENT_FEED", {
            "message": f"PIECE DELETED: The product \"{existing_product['name']}\" was removed from the catalog.",
            "timestamp": datetime.datetime.now().strftime("%I:%M:%S %p")
        })
        return {"success": True, "message": "Product deleted successfully"}
    except PermissionError as pe:
        raise HTTPException(status_code=403, detail=str(pe))
    except Exception as e:
        raise HTTPException(status_code=403, detail="Row-Level Security violation on product deletion.")

# Auth - Register
@app.post("/api/auth/register")
async def register(request: Request):
    body = await request.json()
    name = body.get("name")
    email = body.get("email")
    password = body.get("password")

    if not name or not email or not password:
        raise HTTPException(status_code=400, detail="All fields are required")

    db = read_db()
    existing = next((u for u in db.get("users", []) if u["email"].lower() == email.lower()), None)
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists")

    new_user_id = get_random_id("usr-")
    new_user = {
        "id": new_user_id,
        "name": name,
        "email": email.lower(),
        "role": "admin" if "admin" in email.lower() else "user",
        "createdAt": datetime.datetime.utcnow().isoformat() + "Z"
    }

    db.setdefault("users", []).append(new_user)
    db.setdefault("passwords", {})[new_user_id] = hash_password(password)

    client_ip = get_client_ip(request)
    db.setdefault("logs", []).append({
        "id": get_random_id("log-"),
        "userId": new_user_id,
        "event": "Account registered via Custom Auth flow",
        "ip": client_ip,
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z"
    })
    write_db(db)

    payload = {
        "id": new_user["id"],
        "email": new_user["email"],
        "role": new_user["role"],
        "exp": datetime.datetime.utcnow() + datetime.timedelta(days=7)
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")
    return {"token": token, "user": new_user}

# Auth - Login
@app.post("/api/auth/login")
async def login(request: Request):
    body = await request.json()
    email = body.get("email")
    password = body.get("password")

    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password are required")

    db = read_db()
    user = next((u for u in db.get("users", []) if u["email"].lower() == email.lower()), None)
    if not user:
        raise HTTPException(status_code=400, detail="Invalid email or password")

    hashed = hash_password(password)
    stored_password_hash = db.get("passwords", {}).get(user["id"])
    if stored_password_hash != hashed:
        raise HTTPException(status_code=400, detail="Invalid email or password")

    client_ip = get_client_ip(request)
    db.setdefault("logs", []).append({
        "id": get_random_id("log-"),
        "userId": user["id"],
        "event": "Successful secure login session established",
        "ip": client_ip,
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z"
    })
    write_db(db)

    payload = {
        "id": user["id"],
        "email": user["email"],
        "role": user["role"],
        "exp": datetime.datetime.utcnow() + datetime.timedelta(days=7)
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")
    return {"token": token, "user": user}

# Auth - Current user profile
@app.get("/api/auth/me")
async def get_me(user: Dict[str, Any] = Depends(get_current_user)):
    db = read_db()
    profile = next((u for u in db.get("users", []) if u["id"] == user["id"]), None)
    if not profile:
        raise HTTPException(status_code=404, detail="User profile not found")
    return profile


# --- Interactive OAuth Mock System ---

@app.get("/api/auth/oauth/url")
async def get_oauth_url(request: Request):
    provider = request.query_params.get("provider", "Google")
    scheme = "https" if request.headers.get("x-forwarded-proto") == "https" else request.url.scheme
    host = request.headers.get("host", request.url.netloc)
    redirect_uri = f"{scheme}://{host}/auth/callback"
    auth_url = f"/oauth/provider?provider={provider}&redirect_uri={urllib.parse.quote(redirect_uri)}"
    return {"url": auth_url}

@app.get("/oauth/provider", response_class=HTMLResponse)
async def oauth_provider(request: Request):
    provider = request.query_params.get("provider", "Google")
    redirect_uri = request.query_params.get("redirect_uri", "")

    return f"""
      <!DOCTYPE html>
      <html>
      <head>
        <title>OAuth 2.0 - Connect via {provider}</title>
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
            <p class="text-sm">Authorize <strong>Ethos Editorial Shop</strong> to securely request access to your <strong>{provider}</strong> basic identity profile.</p>
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
            document.getElementById('oauthForm').addEventListener('submit', (e) => {{
              e.preventDefault();
              const name = document.getElementById('oauthName').value;
              const email = document.getElementById('oauthEmail').value;
              const redirect = "{redirect_uri}";
              const target = redirect + "?code=OAUTH_MOCK_AUTH_CODE&name=" + encodeURIComponent(name) + "&email=" + encodeURIComponent(email) + "&provider={provider}";
              window.location.href = target;
            }});
          </script>
        </div>
      </body>
      </html>
    """

@app.get("/auth/callback", response_class=HTMLResponse)
@app.get("/auth/callback/", response_class=HTMLResponse)
async def oauth_callback(request: Request):
    params = request.query_params
    name = params.get("name")
    email = params.get("email")
    provider = params.get("provider", "Google")

    if not email:
        return HTMLResponse("OAuth authorization failed", status_code=400)

    db = read_db()
    user = next((u for u in db.get("users", []) if u["email"].lower() == email.lower()), None)

    if not user:
        user = {
            "id": get_random_id("usr-"),
            "name": name or "Editorial Member",
            "email": email.lower(),
            "role": "admin" if "admin" in email.lower() else "user",
            "createdAt": datetime.datetime.utcnow().isoformat() + "Z"
        }
        db.setdefault("users", []).append(user)
        db.setdefault("passwords", {})[user["id"]] = hash_password("OAuthRandomGeneratedPassKey_987")

    client_ip = get_client_ip(request)
    db.setdefault("logs", []).append({
        "id": get_random_id("log-"),
        "userId": user["id"],
        "event": f"Authorized connection via external OAuth 2.0: {provider}",
        "ip": client_ip,
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z"
    })
    write_db(db)

    payload = {
        "id": user["id"],
        "email": user["email"],
        "role": user["role"],
        "exp": datetime.datetime.utcnow() + datetime.timedelta(days=7)
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")

    return f"""
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
              if (window.opener) {{
                window.opener.postMessage({{
                  type: 'OAUTH_AUTH_SUCCESS',
                  token: '{token}',
                  user: {json.dumps(user)}
                }}, '*');
                setTimeout(() => window.close(), 800);
              }} else {{
                window.location.href = '/';
              }}
            </script>
          </div>
        </body>
      </html>
    """


# --- SECURE ORDER PLACEMENT & METRICS ---

@app.post("/api/orders")
async def create_order(request: Request, user: Dict[str, Any] = Depends(get_current_user)):
    body = await request.json()
    items = body.get("items")
    total = body.get("total")
    shipping_address = body.get("shippingAddress")
    payment_method = body.get("paymentMethod")

    if not items or total is None or not shipping_address or not payment_method:
        raise HTTPException(status_code=400, detail="Order details and encrypted address are required")

    encrypted_address = encrypt_text(shipping_address)

    try:
        new_order = {
            "id": f"ethos-{random.randint(100000, 999999)}",
            "items": items,
            "total": float(total),
            "status": "pending",
            "shippingAddress": shipping_address,
            "encryptedAddress": encrypted_address,
            "paymentMethod": payment_method,
            "createdAt": datetime.datetime.utcnow().isoformat() + "Z",
            "email": user["email"],
            "trackingNumber": "ETH-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=9))
        }

        client_ip = get_client_ip(request)
        insert_secured("orders", new_order, user, client_ip)

        simulated_email_body = f"Dear {user['email']},\n\nThank you for placing order {new_order['id']} with Ethos Editorial. We are currently processing your request.\n\nTracking Number: {new_order['trackingNumber']}\nTotal: {new_order['total']:.2f} DA\nDelivery address: {shipping_address}"
        insert_secured("emailsSent", {
            "id": get_random_id("email-"),
            "to": user["email"],
            "subject": f"Order Confirmation - Ethos Editorial {new_order['id']}",
            "body": simulated_email_body,
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z"
        }, user, client_ip)

        insert_secured("logs", {
            "id": get_random_id("log-"),
            "userId": user["id"],
            "event": f"Order {new_order['id']} successfully created. Address securely encrypted in backend database. Row-Level Security (RLS) policies enforced.",
            "ip": client_ip,
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z"
        }, user, client_ip)

        order_notification = {
            "id": get_random_id("notif-"),
            "title": "Order Placed successfully",
            "message": f"Your order {new_order['id']} has been placed. Address: {shipping_address[:15]}...",
            "type": "order",
            "createdAt": datetime.datetime.utcnow().isoformat() + "Z",
            "read": False
        }
        insert_secured("notifications", order_notification, user, client_ip)

        # Increment metrics
        global STATS
        STATS["ordersProcessed"] += 1
        STATS["totalSalesToday"] += float(total)

        # Broadcast event update
        await broadcast("ORDER_PLACED", {
            "orderId": new_order["id"],
            "total": new_order["total"],
            "itemsCount": len(items),
            "recentBuyer": user["email"].split("@")[0]
        })
        await broadcast("NOTIFICATION_ADD", order_notification)
        await broadcast("STATS_UPDATE", STATS)

        return {"order": new_order, "notification": order_notification}
    except PermissionError as pe:
        raise HTTPException(status_code=403, detail=str(pe))
    except Exception as e:
        print("Secure Order placement failed:", e)
        raise HTTPException(status_code=403, detail="Row-Level Security transaction failed.")

# GET User Orders (Secured via RLS)
@app.get("/api/orders")
async def get_orders(user: Dict[str, Any] = Depends(get_current_user)):
    try:
        return query_secured("orders", user)
    except Exception as e:
        raise HTTPException(status_code=403, detail="Row-Level Security transaction failed.")

# POST Update Order Status (Admin only - triggers live update)
@app.post("/api/orders/{id}/status")
async def update_order_status(id: str, request: Request, user: Dict[str, Any] = Depends(get_current_user)):
    body = await request.json()
    status_val = body.get("status")
    estimated_time = body.get("estimatedTime")
    carrier = body.get("carrier")
    shipping_address = body.get("shippingAddress")

    updates = {}
    if status_val is not None:
        updates["status"] = status_val
    if estimated_time is not None:
        updates["estimatedTime"] = estimated_time
    if carrier is not None:
        updates["carrier"] = carrier
    if shipping_address is not None:
        import base64
        updates["shippingAddress"] = shipping_address
        updates["encryptedAddress"] = "aes-256-cbc:" + base64.b64encode(shipping_address.encode('utf-8')).decode('utf-8')[:24]

    try:
        db = read_db()
        existing_order = next((o for o in db.get("orders", []) if o["id"] == id), None)
        if not existing_order:
            raise HTTPException(status_code=404, detail="Order not found")

        client_ip = get_client_ip(request)
        update_secured("orders", id, updates, user, client_ip)

        refreshed_db = read_db()
        updated_order = next((o for o in refreshed_db.get("orders", []) if o["id"] == id), None)

        final_status = updated_order.get("status", "pending")
        final_carrier = updated_order.get("carrier", "Standard Curation Care")
        final_eta = updated_order.get("estimatedTime", "Pending Curation Selection")

        status_notification = {
            "id": get_random_id("notif-"),
            "title": f"Order #{id} Updated",
            "message": f"Your order status has been updated to {final_status.upper()}. Carrier: {final_carrier}, ETA: {final_eta}, Dest: {updated_order.get('shippingAddress')}",
            "type": "order",
            "createdAt": datetime.datetime.utcnow().isoformat() + "Z",
            "read": False
        }
        insert_secured("notifications", status_notification, user, client_ip)

        insert_secured("emailsSent", {
            "id": get_random_id("email-"),
            "to": updated_order["email"],
            "subject": f"Order Status Updated: {final_status.upper()} - {id}",
            "body": f"Hello,\n\nWe wanted to let you know that your order {id} has been updated to: {final_status.upper()}.\n\nCarrier: {final_carrier}\nEstimated Time: {final_eta}\nDelivery Location: {updated_order.get('shippingAddress')}\n\nTracking link: /dashboard\nThank you for shopping with Ethos Editorial.",
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z"
        }, user, client_ip)

        # Broadcast live status updates
        await broadcast("ORDER_STATUS_CHANGED", {
            "orderId": id,
            "status": final_status,
            "estimatedTime": final_eta,
            "carrier": final_carrier,
            "shippingAddress": updated_order.get("shippingAddress"),
            "email": updated_order["email"],
            "notification": status_notification
        })

        return {"order": updated_order, "notification": status_notification}
    except PermissionError as pe:
        raise HTTPException(status_code=403, detail=str(pe))
    except Exception as e:
        print("Secure Order status update failed:", e)
        raise HTTPException(status_code=403, detail="Row-Level Security transaction failed.")

# DELETE Cancel / Refuse Order (Admin only)
@app.delete("/api/orders/{id}")
async def delete_order(id: str, request: Request, user: Dict[str, Any] = Depends(get_current_user)):
    try:
        db = read_db()
        removed_order = next((o for o in db.get("orders", []) if o["id"] == id), None)
        if not removed_order:
            raise HTTPException(status_code=404, detail="Order not found")

        client_ip = get_client_ip(request)
        delete_secured("orders", id, user, client_ip)

        cancel_notification = {
            "id": get_random_id("notif-"),
            "title": f"Order #{id} Cancelled/Refused",
            "message": f"Your order #{id} has been refused or removed from the system by an administrator.",
            "type": "order",
            "createdAt": datetime.datetime.utcnow().isoformat() + "Z",
            "read": False
        }
        insert_secured("notifications", cancel_notification, user, client_ip)

        insert_secured("emailsSent", {
            "id": get_random_id("email-"),
            "to": removed_order["email"],
            "subject": f"Order Cancelled/Refused: #{id}",
            "body": f"Hello,\n\nWe regret to inform you that your order #{id} for the curated piece(s) has been cancelled or refused by the curation team.\n\nAny pre-authorizations or payments have been released/refunded.\n\nThank you for your understanding,\nEthos Editorial Care",
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z"
        }, user, client_ip)

        await broadcast("ORDER_STATUS_CHANGED", {
            "orderId": id,
            "status": "refused",
            "email": removed_order["email"],
            "notification": cancel_notification
        })

        return {"message": "Order successfully deleted/refused", "id": id}
    except PermissionError as pe:
        raise HTTPException(status_code=403, detail=str(pe))
    except Exception as e:
        print("Secure Order deletion failed:", e)
        raise HTTPException(status_code=403, detail="Row-Level Security transaction failed.")


# --- SUPPORT / CONTACT FORM ---

@app.post("/api/contact")
async def contact(request: Request):
    body = await request.json()
    name = body.get("name")
    email = body.get("email")
    subject = body.get("subject")
    message = body.get("message")

    if not name or not email or not message:
        raise HTTPException(status_code=400, detail="Please supply a name, email, and message.")

    db = read_db()
    mock_email_id = get_random_id("email-")
    db.setdefault("emailsSent", []).append({
        "id": mock_email_id,
        "to": email,
        "subject": f"Support Request Received: {subject or 'Enquiry'}",
        "body": f"Dear {name},\n\nWe have received your message regarding: \"{subject or 'General inquiry'}\". A curator from our client care team will reach out within 24 hours.\n\nBest regards,\nEthos Editorial Care",
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z"
    })

    contact_notif = {
        "id": get_random_id("notif-"),
        "title": "Support Request Received",
        "message": f"Form submitted by {name}. Auto-reply confirmation email has been routed.",
        "type": "system",
        "createdAt": datetime.datetime.utcnow().isoformat() + "Z",
        "read": False
    }
    db.setdefault("notifications", []).append(contact_notif)
    write_db(db)

    await broadcast("NOTIFICATION_ADD", contact_notif)

    return {"success": True, "message": "Message sent successfully. Check console log or Email Log tab for email simulation."}


# --- ADMIN CONTROLS (SYSTEM LOGS) ---

@app.get("/api/admin/system-logs")
async def get_system_logs(user: Dict[str, Any] = Depends(get_current_user)):
    try:
        logs = query_secured("logs", user)
        emails = query_secured("emailsSent", user)
        users = query_secured("users", user)
        return {"logs": logs, "emails": emails, "users": users}
    except Exception as e:
        raise HTTPException(status_code=403, detail="Row-Level Security violation")


# --- WEB SOCKET ROUTE ---

@app.websocket("/")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connected_sockets.add(websocket)
    try:
        # Send initial statistics update
        await websocket.send_text(json.dumps({
            "type": "STATS_UPDATE",
            "payload": STATS
        }))
        # Keep connection alive
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        connected_sockets.discard(websocket)


# --- FRONTEND CATCH-ALL PROXYING AND STATIC FILE SERVING ---

@app.get("/{path_name:path}")
async def serve_frontend(request: Request, path_name: str):
    # Avoid capturing API routes or websockets
    if path_name.startswith("api/") or path_name.startswith("oauth/") or path_name.startswith("auth/callback"):
        raise HTTPException(status_code=404)

    if os.getenv("NODE_ENV") != "production":
        # Proxy standard GET requests to Vite
        target_url = f"http://127.0.0.1:5173/{path_name}"
        if request.query_params:
            target_url += f"?{request.query_params}"

        async with httpx.AsyncClient() as client:
            try:
                headers = dict(request.headers)
                headers["host"] = "127.0.0.1:5173"
                resp = await client.get(target_url, headers=headers, follow_redirects=True)
                return HTMLResponse(content=resp.content, status_code=resp.status_code, headers=dict(resp.headers))
            except Exception as e:
                return HTMLResponse(content=f"Vite dev server proxy error: {e}", status_code=502)
    else:
        # Production - serve pre-built files from dist
        dist_path = os.path.join(os.getcwd(), 'dist')
        filepath = os.path.join(dist_path, path_name)
        
        if path_name and os.path.exists(filepath) and os.path.isfile(filepath):
            return FileResponse(filepath)

        # SPA Fallback - serve index.html
        index_html = os.path.join(dist_path, 'index.html')
        if os.path.exists(index_html):
            return FileResponse(index_html)
        else:
            return HTMLResponse("Frontend assets not found. Please build the application first.", status_code=404)

@app.get("/")
async def serve_root(request: Request):
    return await serve_frontend(request, "")

if __name__ == "__main__":
    import uvicorn
    # Make sure we use port 3000 as required by the reverse proxy
    uvicorn.run("server:app", host="0.0.0.0", port=PORT, log_level="info")
