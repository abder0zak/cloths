import os
import json
import hmac
import hashlib
import random
import string
from typing import Dict, Any, List, Optional
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend

# Encryption Config
# Node.js scryptSync('EthosEditorialSecretKeySecure', 'salt', 32)
# Standard defaults in Node are N=16384, r=8, p=1
ENCRYPTION_KEY = hashlib.scrypt(
    password=b'EthosEditorialSecretKeySecure',
    salt=b'salt',
    n=16384,
    r=8,
    p=1,
    dklen=32
)
IV_LENGTH = 16

def encrypt_text(text: str) -> str:
    iv = os.urandom(IV_LENGTH)
    # PKCS7 padding
    pad_len = 16 - (len(text) % 16)
    padded_text = text.encode('utf-8') + bytes([pad_len] * pad_len)
    
    cipher = Cipher(algorithms.AES(ENCRYPTION_KEY), modes.CBC(iv), backend=default_backend())
    encryptor = cipher.encryptor()
    encrypted = encryptor.update(padded_text) + encryptor.finalize()
    
    return iv.hex() + ':' + encrypted.hex()

def decrypt_text(encrypted_text: str) -> str:
    try:
        parts = encrypted_text.split(':')
        if len(parts) < 2:
            return 'Decryption failed: Invalid format'
        iv = bytes.fromhex(parts[0])
        ciphertext = bytes.fromhex(parts[1])
        
        cipher = Cipher(algorithms.AES(ENCRYPTION_KEY), modes.CBC(iv), backend=default_backend())
        decryptor = cipher.decryptor()
        padded_text = decryptor.update(ciphertext) + decryptor.finalize()
        
        # PKCS7 unpadding
        pad_len = padded_text[-1]
        if pad_len < 1 or pad_len > 16:
            raise ValueError()
        for i in range(1, pad_len + 1):
            if padded_text[-i] != pad_len:
                raise ValueError()
                
        return padded_text[:-pad_len].decode('utf-8')
    except Exception:
        return 'Decryption failed: Integrity compromised or key mismatch'

def hash_password(password: str) -> str:
    key = b'EthosEditorialSaltKey_123'
    return hmac.new(key, password.encode('utf-8'), hashlib.sha256).hexdigest()

DB_DIR = os.path.join(os.getcwd(), 'data')
DB_FILE = os.path.join(DB_DIR, 'db.json')

INITIAL_PRODUCTS = [
    {
        "id": "prod-1",
        "name": "Raw Silk Oversized Shirt",
        "collection": "Essentials",
        "description": "A high-end editorial fashion shot of a minimalist silk blouse in soft cream, draped over a wooden chair in a bright, sunlit studio. The lighting is ethereal and soft, emphasizing the luxurious texture of the fabric.",
        "price": 240.00,
        "imageUrl": "https://lh3.googleusercontent.com/aida-public/AB6AXuBlvVstwHODL694wGtWt98dmOf8XvDyq0b6TT79pBmBAe10TAu6OSPqjBiWmOjKBGRCBhfriN5xzumL2k9KcEO3LBarpRbg2KfAt45eEkGjecweNw3cL7IY034NQnpoEj6OABpZlCuPoc9W_uV_KG_XlcdsNfHhYsiY_7mB5wmG0hnMr6jOlFvAatUha-5uQ2sHVrvZi3A6QHll1Mar0R-WnhCUFD1eefzX27VX2fmOq4mtEuwITNakuobX1p-ttNsVVY6-oI6svr_D",
        "color": "Ecru",
        "colorHex": "#F5F5DC",
        "sizes": ["XS", "S", "M", "L", "XL"]
    },
    {
        "id": "prod-2",
        "name": "Architectural Tailored Trouser",
        "collection": "Resort 2024",
        "description": "A professional product photograph of tailored obsidian trousers on a white background, featuring a sharp crease and architectural silhouette. The lighting is crisp and high-contrast, highlighting the impeccable tailoring and premium wool blend.",
        "price": 380.00,
        "imageUrl": "https://lh3.googleusercontent.com/aida-public/AB6AXuBdotgMnonzWTLPAlpymRKQB7R6ibPbJEi0ZFmBtuRJbaCcNvDaHoIzXikv1CJjae1NaO80jAXNU81rnJh-Aeh6uoJRVBNs_mIx74LhDJ7yBmcFsMReyHnnH6ysleRiXcEjFzgqEeLIi7gFH3dw0Y_HZySbd_XvQIExUvLxhoJwKqFSZNqO8LWfEIQ_BuNhMhpj2cgtm_GE0cmhNwFdQJ3IXhmhwYJrHXdVZFp6YFtiIVJF7_5OZyNR8XweS-oPFGmM3hWU8eLVnQ9c",
        "color": "Obsidian",
        "colorHex": "#000000",
        "sizes": ["XS", "S", "M", "L", "XL"],
        "isLimited": True
    },
    {
        "id": "prod-3",
        "name": "Organic Cotton Ribbed Knit",
        "collection": "The Silk Series",
        "description": "A close-up shot of a textured terracotta knit sweater, showing the intricate weave and organic yarn details. The background is a soft beige linen texture, creating a warm and inviting luxury aesthetic.",
        "price": 195.00,
        "imageUrl": "https://lh3.googleusercontent.com/aida-public/AB6AXuAP_P0T7VZO2tBHxod10AVfzouef-vYJSiKmxfG4jYPkDX9x2f9q2IItLY33FbV0W3VCZfx09ZbzQeas3UBZIiBk38xKy5OkS6eh97CbHRDY0iiR1SrzLkt_jR0dcj6XCBu0NUr4QFfQtnkWsF2CuJoWh-YGRovn31hnYovpYBON3ZfuQHSOJhkZ9O8i3Ji0NddLHzTMyihI_19Cg2F-HebPVatJDtZwc8FkMbHQzDv_W6ElJKVkUC86Qdo3wTv84k6Y5Gtal1xVzdS",
        "color": "Terracotta",
        "colorHex": "#ad321c",
        "sizes": ["S", "M", "L"]
    },
    {
        "id": "prod-4",
        "name": "Structured Wool Blazer",
        "collection": "Archival Pieces",
        "description": "A minimalist full-length shot of a model wearing a structured tobacco-colored blazer, standing against a stark concrete wall. High-key natural lighting creates a professional fashion editorial look.",
        "price": 550.00,
        "imageUrl": "https://lh3.googleusercontent.com/aida-public/AB6AXuDHT0ENG7rljTEi3dCVR31RvH3MPr0kn8K1GBZyRkmJ57Q93P33_3WIM5aqr1sXL8t4hqNWnWSmZiYAiPt9OMtFU2Wkr18u9yr8WAi2B1GCBYwGWGLIiZ6nKxXiF-KmMacVcb8soltVxHo_3XFtdNGLxycVYZi74jwBbPuE-AKb40YG8xZvle04bF-waJNLSzEPa4ZSmQDcjC_hxctXoV2TdnuRc-RzUjv5qZVyi3rZ5jaTIlaFfcNMTdkzs04Y-nfgj2RS3s92m56",
        "color": "Tobacco",
        "colorHex": "#8B4513",
        "sizes": ["XS", "S", "M", "L"]
    },
    {
        "id": "prod-5",
        "name": "Large Sculptural Tote",
        "collection": "Accessories",
        "description": "A detailed shot of a minimalist leather tote bag in a deep charcoal grey, resting on a marble plinth. The studio lighting is soft and diffuse, highlighting the supple grain of the leather.",
        "price": 620.00,
        "imageUrl": "https://lh3.googleusercontent.com/aida-public/AB6AXuCYOmqnWmxQSmsHew0HCKBSM5yAP-ZmEwCb11iN_0WBd01utMITuO-3-wQe7jQnmz3CkTmsf0QP-_mWkM1AKviFBKnLCLYYlVOimYQBYTmjW-hLIl05upxF5twWY5UZtUjktF8ELXBHMhNBbWDGXuf25UmXQ1l0uN6iviDZwqjbkgpqmtwwCqHSTyyUM0Y0UnvEbc0rnP2joTYtGnKH_abx4m52gtxAZdF0a39J8qu4CzOgUSA_bjLTrWH5zJKF7Bmeaquc4OHOhoxL",
        "color": "Slate",
        "colorHex": "#708090",
        "sizes": ["One Size"]
    },
    {
        "id": "prod-6",
        "name": "Linen Column Dress",
        "collection": "Resort 2024",
        "description": "A minimalist portrait of a model wearing an alabaster linen dress, captured in soft morning light. The dress has an effortless flow, and the setting is a minimalist interior with warm wood accents.",
        "price": 310.00,
        "imageUrl": "https://lh3.googleusercontent.com/aida-public/AB6AXuDwybE_UBTZ7e9sNLtsdYBAJmtI8UrqdL1Mur-fHhKfiwfrGvJnnzKMXoYY04mtcXbceMB5rs3Bl1yX5ljHW9uWQWMCoP8F44MDXV-vubihdgj-ekvR7fcWu53KUYNGlqR52GzyDTtEaa6i9p4rI1B1YwVHOJecZA59c7rJGR8sZOdln0N7McFXTLcCwXaiv52dAY_ZF90IQqirS5ZOYNhIYsd1u0Qc3F2bpEUiFNbVb9YvKY1DHr1EsBNVOK5ymb-iPOfIY0gNKdI8",
        "color": "Alabaster",
        "colorHex": "#FFFFFF",
        "sizes": ["XS", "S", "M", "L"]
    },
    {
        "id": "prod-7",
        "name": "Square-Toe Chelsea Boot",
        "collection": "Footwear",
        "description": "A studio shot of sleek black leather chelsea boots with a sharp, square toe. The boots are placed on a matte black surface against a light grey background. The lighting is clinical and sharp, highlighting the quality of the craftsmanship.",
        "price": 425.00,
        "imageUrl": "https://lh3.googleusercontent.com/aida-public/AB6AXuBuFh1pIIOjRkdnjH_AN8BYAzZbkaDHyvBT9meIbAlwJd6RA8XZRTkLg60vodXwriylRQqCSaovVutqnq51T9QMVgfOuYHkOwHu0_7fE4hmUBLSQjXkwPXWLoP5hoySdofN7rAsD8OWQ3ZYBdTyBFsONMpzJH8dAgGhX-RfW96mMPHwwFSrbfDgnHspkCtDcPhzuTTkoI4CG2JOgw66JgFR6_QDVAolbe4Hoc3eZsBWHthV9IciTo9q9-G_9btPsEtQfA7E8YgoTY_8",
        "color": "Obsidian",
        "colorHex": "#000000",
        "sizes": ["38", "39", "40", "41", "42"]
    },
    {
        "id": "prod-8",
        "name": "Organic Pearl Necklace",
        "collection": "Fine Jewelry",
        "description": "A close-up of a delicate gold chain necklace with a singular irregular pearl, photographed against a dark velvet background. The lighting is focused and dramatic, creating a sense of preciousness and exclusivity.",
        "price": 280.00,
        "imageUrl": "https://lh3.googleusercontent.com/aida-public/AB6AXuBieJp4QmToqPlfTdWdjUfwxtTSdDVDyZ520igkjHulqzM6VmwBtfyge9MjtiMowUF3ZNJeCtp-Cx9ZsBVmkHNobLugtvJ6wL1eri9cwGDwftohxaVcgnHxgMyy6ZEg5lC3DxPgeQ6ejSAl0C4t5tcWMhJ5Z3uwNw3-RW3hDjRmgpvnzjmVECIxSFv3aCTRGpBRPJe2Ee3IvoC2DalSZpX0GXG_7bK_NlZJ_tjgnTvIa_kxrzbRfrHWLWAshAQosj_GHDb5r2Uaef7Y",
        "color": "Alabaster",
        "colorHex": "#FFFFFF",
        "sizes": ["One Size"]
    },
    {
        "id": "prod-9",
        "name": "Raw Cashmere Wrap",
        "collection": "The Silk Series",
        "description": "A minimalist shot of a charcoal cashmere scarf neatly folded on a stone surface. The texture of the cashmere is visible, looking soft and high-quality. Soft, natural lighting from a window creates a gentle gradient across the fabric.",
        "price": 175.00,
        "imageUrl": "https://lh3.googleusercontent.com/aida-public/AB6AXuDEFsSTXpZm_JZoeCcQKghRZeGdLNQdk-S6ar6JzVGdbVS_UB1QJhfMuW88fN2WDT68BJTlHR4Y6Weg1KIHHz3o756Km3iaaLIF_PH_WotnvfWkG1sVzpGw_SdfdRV9tZuy9ufzcyA8eVqxvCGWhD6-Bg3io8M_m3n9yyz4h9Tj-Wc3xqMeO-VlDdIEsFN4WyatDL-vn2qmQtt4pyLCPZSgQzNWuFuLt8ImSAIaF3W9bAeH0mbmAo2VLSSyzIRu5K9tMS7oPkx1cZtB",
        "color": "Slate",
        "colorHex": "#708090",
        "sizes": ["One Size"]
    }
]

INITIAL_SCHEMA = {
    "users": [],
    "passwords": {},
    "orders": [],
    "notifications": [],
    "logs": [],
    "emailsSent": [],
    "products": []
}

def ensure_db_exists():
    if not os.path.exists(DB_DIR):
        os.makedirs(DB_DIR, exist_ok=True)
    if not os.path.exists(DB_FILE):
        with open(DB_FILE, 'w', encoding='utf-8') as f:
            json.dump({**INITIAL_SCHEMA, "products": INITIAL_PRODUCTS}, f, indent=2)

def read_db() -> Dict[str, Any]:
    ensure_db_exists()
    try:
        with open(DB_FILE, 'r', encoding='utf-8') as f:
            parsed = json.load(f)
        # Backfill products if not initialized
        if "products" not in parsed or not isinstance(parsed["products"], list) or len(parsed["products"]) == 0:
            parsed["products"] = list(INITIAL_PRODUCTS)
            with open(DB_FILE, 'w', encoding='utf-8') as f:
                json.dump(parsed, f, indent=2)
        return parsed
    except Exception as e:
        print("Error reading DB, resetting to default:", e)
        return {**INITIAL_SCHEMA, "products": list(INITIAL_PRODUCTS)}

def write_db(data: Dict[str, Any]):
    ensure_db_exists()
    try:
        with open(DB_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        print("Error writing DB:", e)


# RLS POLICIES EVALUATION
class RLSPolicies:
    @staticmethod
    def select_orders(row: Dict[str, Any], user: Dict[str, Any]) -> bool:
        return user.get("role") == "admin" or row.get("email", "").lower() == user.get("email", "").lower()

    @staticmethod
    def insert_orders(row: Dict[str, Any], user: Dict[str, Any]) -> bool:
        return user.get("role") == "admin" or row.get("email", "").lower() == user.get("email", "").lower()

    @staticmethod
    def update_orders(row: Dict[str, Any], user: Dict[str, Any]) -> bool:
        return user.get("role") == "admin"

    @staticmethod
    def delete_orders(row: Dict[str, Any], user: Dict[str, Any]) -> bool:
        return user.get("role") == "admin"

    @staticmethod
    def select_notifications(row: Dict[str, Any], user: Dict[str, Any]) -> bool:
        return True

    @staticmethod
    def insert_notifications(row: Dict[str, Any], user: Dict[str, Any]) -> bool:
        return user.get("role") == "admin"

    @staticmethod
    def update_notifications(row: Dict[str, Any], user: Dict[str, Any]) -> bool:
        return user.get("role") == "admin" or row.get("id") is not None

    @staticmethod
    def delete_notifications(row: Dict[str, Any], user: Dict[str, Any]) -> bool:
        return user.get("role") == "admin"

    @staticmethod
    def select_logs(row: Dict[str, Any], user: Dict[str, Any]) -> bool:
        return user.get("role") == "admin" or row.get("userId") == user.get("id")

    @staticmethod
    def insert_logs(row: Dict[str, Any], user: Optional[Dict[str, Any]]) -> bool:
        return True

    @staticmethod
    def update_logs(row: Dict[str, Any], user: Dict[str, Any]) -> bool:
        return False  # IMMUTABLE

    @staticmethod
    def delete_logs(row: Dict[str, Any], user: Dict[str, Any]) -> bool:
        return False  # IMMUTABLE

    @staticmethod
    def select_emailsSent(row: Dict[str, Any], user: Dict[str, Any]) -> bool:
        return user.get("role") == "admin" or row.get("to", "").lower() == user.get("email", "").lower()

    @staticmethod
    def insert_emailsSent(row: Dict[str, Any], user: Optional[Dict[str, Any]]) -> bool:
        return True

    @staticmethod
    def update_emailsSent(row: Dict[str, Any], user: Dict[str, Any]) -> bool:
        return False  # IMMUTABLE

    @staticmethod
    def delete_emailsSent(row: Dict[str, Any], user: Dict[str, Any]) -> bool:
        return False  # IMMUTABLE

    @staticmethod
    def select_users(row: Dict[str, Any], user: Dict[str, Any]) -> bool:
        return user.get("role") == "admin" or row.get("id") == user.get("id")

    @staticmethod
    def insert_users(row: Dict[str, Any], user: Optional[Dict[str, Any]]) -> bool:
        return True

    @staticmethod
    def update_users(row: Dict[str, Any], user: Dict[str, Any]) -> bool:
        return user.get("role") == "admin" or row.get("id") == user.get("id")

    @staticmethod
    def delete_users(row: Dict[str, Any], user: Dict[str, Any]) -> bool:
        return user.get("role") == "admin"

    @staticmethod
    def select_products(row: Dict[str, Any], user: Optional[Dict[str, Any]]) -> bool:
        return True

    @staticmethod
    def insert_products(row: Dict[str, Any], user: Dict[str, Any]) -> bool:
        return user.get("role") == "admin"

    @staticmethod
    def update_products(row: Dict[str, Any], user: Dict[str, Any]) -> bool:
        return user.get("role") == "admin"

    @staticmethod
    def delete_products(row: Dict[str, Any], user: Dict[str, Any]) -> bool:
        return user.get("role") == "admin"


def get_random_id(prefix: str = "") -> str:
    chars = string.ascii_lowercase + string.digits
    rand = ''.join(random.choice(chars) for _ in range(9))
    return f"{prefix}{rand}"


def query_secured(table: str, user: Optional[Dict[str, Any]] = None) -> List[Any]:
    db = read_db()
    rows = db.get(table, [])
    
    # Selection matching policy methods
    select_method_name = f"select_{table}"
    policy_method = getattr(RLSPolicies, select_method_name, None)
    
    if not policy_method:
        raise ValueError(f"RLS POLICY FAILURE: No security rules configured for collection \"{table}\"")
        
    filtered = []
    for row in rows:
        try:
            if policy_method(row, user):
                filtered.append(row)
        except Exception as e:
            print(f"RLS Selection Exception on table {table}:", e)
            
    return filtered


def insert_secured(table: str, row: Any, user: Optional[Dict[str, Any]] = None, client_ip: str = "127.0.0.1") -> None:
    db = read_db()
    insert_method_name = f"insert_{table}"
    policy_method = getattr(RLSPolicies, insert_method_name, None)
    
    if not policy_method:
        raise ValueError(f"RLS POLICY FAILURE: No security rules configured for collection \"{table}\"")
        
    is_authorized = policy_method(row, user) if user else (table in ['users', 'logs', 'emailsSent'])
    
    if not is_authorized:
        user_id = user.get("id") if user else "anonymous"
        security_log = {
            "id": get_random_id("log-"),
            "userId": user_id,
            "event": f"SECURITY VIOLATION DETECTED: Row-level write validation failed for table \"{table}\". Request IP: {client_ip}.",
            "ip": client_ip,
            "timestamp": hashlib.datetime.datetime.utcnow().isoformat() + "Z" if hasattr(hashlib, "datetime") else "2026-07-01T09:30:00Z"
        }
        # Safely import datetime
        import datetime
        security_log["timestamp"] = datetime.datetime.utcnow().isoformat() + "Z"
        
        db.setdefault("logs", []).append(security_log)
        write_db(db)
        raise PermissionError(f"RLS TRANSACTION DENIED: Unauthorized insert into \"{table}\" bypassed core authorization checks.")
        
    db.setdefault(table, []).append(row)
    write_db(db)


def update_secured(table: str, id_val: str, updates: Any, user: Dict[str, Any], client_ip: str = "127.0.0.1") -> bool:
    db = read_db()
    rows = db.get(table, [])
    
    idx = -1
    for i, r in enumerate(rows):
        if r.get("id") == id_val:
            idx = i
            break
            
    if idx == -1:
        return False
        
    existing_item = rows[idx]
    update_method_name = f"update_{table}"
    policy_method = getattr(RLSPolicies, update_method_name, None)
    
    if not policy_method:
        raise ValueError(f"RLS POLICY FAILURE: No security rules configured for collection \"{table}\"")
        
    is_authorized = policy_method(existing_item, user)
    
    if not is_authorized:
        import datetime
        security_log = {
            "id": get_random_id("log-"),
            "userId": user.get("id"),
            "event": f"SECURITY VIOLATION DETECTED: Row-level update violation on table \"{table}\" for row ID \"{id_val}\". Request IP: {client_ip}.",
            "ip": client_ip,
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z"
        }
        db.setdefault("logs", []).append(security_log)
        write_db(db)
        raise PermissionError("RLS TRANSACTION DENIED: Unauthorized update attempts on protected entity.")
        
    rows[idx] = {**existing_item, **updates}
    db[table] = rows
    write_db(db)
    return True


def delete_secured(table: str, id_val: str, user: Dict[str, Any], client_ip: str = "127.0.0.1") -> bool:
    db = read_db()
    rows = db.get(table, [])
    
    idx = -1
    for i, r in enumerate(rows):
        if r.get("id") == id_val:
            idx = i
            break
            
    if idx == -1:
        return False
        
    existing_item = rows[idx]
    delete_method_name = f"delete_{table}"
    policy_method = getattr(RLSPolicies, delete_method_name, None)
    
    if not policy_method:
        raise ValueError(f"RLS POLICY FAILURE: No security rules configured for collection \"{table}\"")
        
    is_authorized = policy_method(existing_item, user)
    
    if not is_authorized:
        import datetime
        security_log = {
            "id": get_random_id("log-"),
            "userId": user.get("id"),
            "event": f"SECURITY VIOLATION DETECTED: Row-level delete violation on table \"{table}\" for row ID \"{id_val}\". Request IP: {client_ip}.",
            "ip": client_ip,
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z"
        }
        db.setdefault("logs", []).append(security_log)
        write_db(db)
        raise PermissionError("RLS TRANSACTION DENIED: Unauthorized deletion of protected entity.")
        
    rows.pop(idx)
    db[table] = rows
    write_db(db)
    return True
