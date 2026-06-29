import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { User, Order, Product, Notification } from '../src/types';

// Encryption Config
const ENCRYPTION_KEY = crypto.scryptSync('EthosEditorialSecretKeySecure', 'salt', 32);
const IV_LENGTH = 16;

/**
 * Encrypts sensitive text using AES-256-CBC
 */
export function encryptText(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypts sensitive text using AES-256-CBC
 */
export function decryptText(encryptedText: string): string {
  try {
    const textParts = encryptedText.split(':');
    const iv = Buffer.from(textParts.shift() || '', 'hex');
    const encryptedTextStr = textParts.join(':');
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedTextStr, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    return 'Decryption failed: Integrity compromised or key mismatch';
  }
}

// Ensure database path exists
const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    name: 'Raw Silk Oversized Shirt',
    collection: 'Essentials',
    description: 'A high-end editorial fashion shot of a minimalist silk blouse in soft cream, draped over a wooden chair in a bright, sunlit studio. The lighting is ethereal and soft, emphasizing the luxurious texture of the fabric.',
    price: 240.00,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBlvVstwHODL694wGtWt98dmOf8XvDyq0b6TT79pBmBAe10TAu6OSPqjBiWmOjKBGRCBhfriN5xzumL2k9KcEO3LBarpRbg2KfAt45eEkGjecweNw3cL7IY034NQnpoEj6OABpZlCuPoc9W_uV_KG_XlcdsNfHhYsiY_7mB5wmG0hnMr6jOlFvAatUha-5uQ2sHVrvZi3A6QHll1Mar0R-WnhCUFD1eefzX27VX2fmOq4mtEuwITNakuobX1p-ttNsVVY6-oI6svr_D',
    color: 'Ecru',
    colorHex: '#F5F5DC',
    sizes: ['XS', 'S', 'M', 'L', 'XL']
  },
  {
    id: 'prod-2',
    name: 'Architectural Tailored Trouser',
    collection: 'Resort 2024',
    description: 'A professional product photograph of tailored obsidian trousers on a white background, featuring a sharp crease and architectural silhouette. The lighting is crisp and high-contrast, highlighting the impeccable tailoring and premium wool blend.',
    price: 380.00,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBdotgMnonzWTLPAlpymRKQB7R6ibPbJEi0ZFmBtuRJbaCcNvDaHoIzXikv1CJjae1NaO80jAXNU81rnJh-Aeh6uoJRVBNs_mIx74LhDJ7yBmcFsMReyHnnH6ysleRiXcEjFzgqEeLIi7gFH3dw0Y_HZySbd_XvQIExUvLxhoJwKqFSZNqO8LWfEIQ_BuNhMhpj2cgtm_GE0cmhNwFdQJ3IXhmhwYJrHXdVZFp6YFtiIVJF7_5OZyNR8XweS-oPFGmM3hWU8eLVnQ9c',
    color: 'Obsidian',
    colorHex: '#000000',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    isLimited: true
  },
  {
    id: 'prod-3',
    name: 'Organic Cotton Ribbed Knit',
    collection: 'The Silk Series',
    description: 'A close-up shot of a textured terracotta knit sweater, showing the intricate weave and organic yarn details. The background is a soft beige linen texture, creating a warm and inviting luxury aesthetic.',
    price: 195.00,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAP_P0T7VZO2tBHxod10AVfzouef-vYJSiKmxfG4jYPkDX9x2f9q2IItLY33FbV0W3VCZfx09ZbzQeas3UBZIiBk38xKy5OkS6eh97CbHRDY0iiR1SrzLkt_jR0dcj6XCBu0NUr4QFfQtnkWsF2CuJoWh-YGRovn31hnYovpYBON3ZfuQHSOJhkZ9O8i3Ji0NddLHzTMyihI_19Cg2F-HebPVatJDtZwc8FkMbHQzDv_W6ElJKVkUC86Qdo3wTv84k6Y5Gtal1xVzdS',
    color: 'Terracotta',
    colorHex: '#ad321c',
    sizes: ['S', 'M', 'L']
  },
  {
    id: 'prod-4',
    name: 'Structured Wool Blazer',
    collection: 'Archival Pieces',
    description: 'A minimalist full-length shot of a model wearing a structured tobacco-colored blazer, standing against a stark concrete wall. High-key natural lighting creates a professional fashion editorial look.',
    price: 550.00,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDHT0ENG7rljTEi3dCVR31RvH3MPr0kn8K1GBZyRkmJ57Q93P33_3WIM5aqr1sXL8t4hqNWnWSmZiYAiPt9OMtFU2Wkr18u9yr8WAi2B1GCBYwGWGLIiZ6nKxXiF-KmMacVcb8soltVxHo_3XFtdNGLxycVYZi74jwBbPuE-AKb40YG8xZvle04bF-waJNLSzEPa4ZSmQDcjC_hxctqXoV2TdnuRc-RzUjv5qZVyi3rZ5jaTIlaFfcNMTdkzs04Y-nfgj2RS3s92m56',
    color: 'Tobacco',
    colorHex: '#8B4513',
    sizes: ['XS', 'S', 'M', 'L']
  },
  {
    id: 'prod-5',
    name: 'Large Sculptural Tote',
    collection: 'Accessories',
    description: 'A detailed shot of a minimalist leather tote bag in a deep charcoal grey, resting on a marble plinth. The studio lighting is soft and diffuse, highlighting the supple grain of the leather.',
    price: 620.00,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCYOmqnWmxQSmsHew0HCKBSM5yAP-ZmEwCb11iN_0WBd01utMITuO-3-wQe7jQnmz3CkTmsf0QP-_mWkM1AKviFBKnLCLYYlVOimYQBYTmjW-hLIl05upxF5twWY5UZtUjktF8ELXBHMhNBbWDGXuf25UmXQ1l0uN6iviDZwqjbkgpqmtwwCqHSTyyUM0Y0UnvEbc0rnP2joTYtGnKH_abx4m52gtxAZdF0a39J8qu4CzOgUSA_bjLTrWH5zJKF7Bmeaquc4OHOhoxL',
    color: 'Slate',
    colorHex: '#708090',
    sizes: ['One Size']
  },
  {
    id: 'prod-6',
    name: 'Linen Column Dress',
    collection: 'Resort 2024',
    description: 'A minimalist portrait of a model wearing an alabaster linen dress, captured in soft morning light. The dress has an effortless flow, and the setting is a minimalist interior with warm wood accents.',
    price: 310.00,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDwybE_UBTZ7e9sNLtsdYBAJmtI8UrqdL1Mur-fHhKfiwfrGvJnnzKMXoYY04mtcXbceMB5rs3Bl1yX5ljHW9uWQWMCoP8F44MDXV-vubihdgj-ekvR7fcWu53KUYNGlqR52GzyDTtEaa6i9p4rI1B1YwVHOJecZA59c7rJGR8sZOdln0N7McFXTLcCwXaiv52dAY_ZF90IQqirS5ZOYNhIYsd1u0Qc3F2bpEUiFNbVb9YvKY1DHr1EsBNVOK5ymb-iPOfIY0gNKdI8',
    color: 'Alabaster',
    colorHex: '#FFFFFF',
    sizes: ['XS', 'S', 'M', 'L']
  },
  {
    id: 'prod-7',
    name: 'Square-Toe Chelsea Boot',
    collection: 'Footwear',
    description: 'A studio shot of sleek black leather chelsea boots with a sharp, square toe. The boots are placed on a matte black surface against a light grey background. The lighting is clinical and sharp, highlighting the quality of the craftsmanship.',
    price: 425.00,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBuFh1pIIOjRkdnjH_AN8BYAzZbkaDHyvBT9meIbAlwJd6RA8XZRTkLg60vodXwriylRQqCSaovVutqnq51T9QMVgfOuYHkOwHu0_7fE4hmUBLSQjXkwPXWLoP5hoySdofN7rAsD8OWQ3ZYBdTyBFsONMpzJH8dAgGhX-RfW96mMPHwwFSrbfDgnHspkCtDcPhzuTTkoI4CG2JOgw66JgFR6_QDVAolbe4Hoc3eZsBWHthV9IciTo9q9-G_9btPsEtQfA7E8YgoTY_8',
    color: 'Obsidian',
    colorHex: '#000000',
    sizes: ['38', '39', '40', '41', '42']
  },
  {
    id: 'prod-8',
    name: 'Organic Pearl Necklace',
    collection: 'Fine Jewelry',
    description: 'A close-up of a delicate gold chain necklace with a singular irregular pearl, photographed against a dark velvet background. The lighting is focused and dramatic, creating a sense of preciousness and exclusivity.',
    price: 280.00,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBieJp4QmToqPlfTdWdjUfwxtTSdDVDyZ520igkjHulqzM6VmwBtfyge9MjtiMowUF3ZNJeCtp-Cx9ZsBVmkHNobLugtvJ6wL1eri9cwGDwftohxaVcgnHxgMyy6ZEg5lC3DxPgeQ6ejSAl0C4t5tcWMhJ5Z3uwNw3-RW3hDjRmgpvnzjmVECIxSFv3aCTRGpBRPJe2Ee3IvoC2DalSZpX0GXG_7bK_NlZJ_tjgnTvIa_kxrzbRfrHWLWAshAQosj_GHDb5r2Uaef7Y',
    color: 'Alabaster',
    colorHex: '#FFFFFF',
    sizes: ['One Size']
  },
  {
    id: 'prod-9',
    name: 'Raw Cashmere Wrap',
    collection: 'The Silk Series',
    description: 'A minimalist shot of a charcoal cashmere scarf neatly folded on a stone surface. The texture of the cashmere is visible, looking soft and high-quality. Soft, natural lighting from a window creates a gentle gradient across the fabric.',
    price: 175.00,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDEFsSTXpZm_JZoeCcQKghRZeGdLNQdk-S6ar6JzVGdbVS_UB1QJhfMuW88fN2WDT68BJTlHR4Y6Weg1KIHHz3o756Km3iaaLIF_PH_WotnvfWkG1sVzpGw_SdfdRV9tZuy9ufzcyA8eVqxvCGWhD6-Bg3io8M_m3n9yyz4h9Tj-Wc3xqMeO-VlDdIEsFN4WyatDL-vn2qmQtt4pyLCPZSgQzNWuFuLt8ImSAIaF3W9bAeH0mbmAo2VLSSyzIRu5K9tMS7oPkx1cZtB',
    color: 'Slate',
    colorHex: '#708090',
    sizes: ['One Size']
  }
];

export interface RLSUser {
  id: string;
  email: string;
  role: 'user' | 'admin';
}

interface DatabaseSchema {
  users: User[];
  passwords: Record<string, string>; // userId -> password hash
  orders: Order[];
  notifications: Notification[];
  logs: { id: string; userId: string; event: string; ip: string; timestamp: string }[];
  emailsSent: { id: string; to: string; subject: string; body: string; timestamp: string }[];
  products: Product[];
}

const initialSchema: DatabaseSchema = {
  users: [],
  passwords: {},
  orders: [],
  notifications: [],
  logs: [],
  emailsSent: [],
  products: []
};

function ensureDbExists() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ ...initialSchema, products: INITIAL_PRODUCTS }, null, 2), 'utf8');
  }
}

export function readDb(): DatabaseSchema {
  ensureDbExists();
  try {
    const content = fs.readFileSync(DB_FILE, 'utf8');
    const parsed = JSON.parse(content);
    // Auto-backfill products if they aren't initialized yet
    if (!parsed.products || !Array.isArray(parsed.products) || parsed.products.length === 0) {
      parsed.products = [...INITIAL_PRODUCTS];
      fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2), 'utf8');
    }
    return parsed;
  } catch (err) {
    console.error('Error reading DB, resetting to default', err);
    return { ...initialSchema, products: [...INITIAL_PRODUCTS] };
  }
}

export function writeDb(data: DatabaseSchema) {
  ensureDbExists();
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing DB', err);
  }
}

/**
 * ROW LEVEL SECURITY (RLS) ENGINE POLICIES
 */
export const RLSPolicies = {
  orders: {
    select: (row: Order, user: RLSUser) => 
      user.role === 'admin' || row.email.toLowerCase() === user.email.toLowerCase(),
    insert: (row: Order, user: RLSUser) => 
      user.role === 'admin' || row.email.toLowerCase() === user.email.toLowerCase(),
    update: (row: Order, user: RLSUser) => 
      user.role === 'admin',
    delete: (row: Order, user: RLSUser) => 
      user.role === 'admin'
  },
  notifications: {
    select: (row: Notification, user: RLSUser) => 
      true, // General announcements or system-wide triggers
    insert: (row: Notification, user: RLSUser) => 
      user.role === 'admin',
    update: (row: Notification, user: RLSUser) => 
      user.role === 'admin' || row.id !== undefined, // Standard state modification permitted
    delete: (row: Notification, user: RLSUser) => 
      user.role === 'admin'
  },
  logs: {
    select: (row: any, user: RLSUser) => 
      user.role === 'admin' || row.userId === user.id,
    insert: (row: any, user: RLSUser | null) => 
      true, // Server operations or registration hooks
    update: (row: any, user: RLSUser) => 
      false, // STRICTLY IMMUTABLE AUDIT TRAIL
    delete: (row: any, user: RLSUser) => 
      false  // STRICTLY IMMUTABLE AUDIT TRAIL
  },
  emailsSent: {
    select: (row: any, user: RLSUser) => 
      user.role === 'admin' || row.to.toLowerCase() === user.email.toLowerCase(),
    insert: (row: any, user: RLSUser | null) => 
      true, // Mail delivery loops are automated
    update: (row: any, user: RLSUser) => 
      false, // IMMUTABLE
    delete: (row: any, user: RLSUser) => 
      false  // IMMUTABLE
  },
  users: {
    select: (row: User, user: RLSUser) => 
      user.role === 'admin' || row.id === user.id,
    insert: (row: User, user: RLSUser | null) => 
      true, // Registration permitted
    update: (row: User, user: RLSUser) => 
      user.role === 'admin' || row.id === user.id,
    delete: (row: User, user: RLSUser) => 
      user.role === 'admin'
  },
  products: {
    select: (row: Product, user?: RLSUser) => 
      true, // Products catalog is public
    insert: (row: Product, user: RLSUser) => 
      user.role === 'admin',
    update: (row: Product, user: RLSUser) => 
      user.role === 'admin',
    delete: (row: Product, user: RLSUser) => 
      user.role === 'admin'
  }
};

/**
 * Enforces Row Level Security for standard SELECT queries
 */
export function querySecured<K extends 'orders' | 'notifications' | 'logs' | 'emailsSent' | 'users' | 'products'>(
  table: K,
  user?: RLSUser
): DatabaseSchema[K] {
  const db = readDb();
  const rows = db[table] as any[];
  const policy = RLSPolicies[table];

  if (!policy) {
    throw new Error(`RLS POLICY FAILURE: No security rules configured for collection "${table}"`);
  }

  // Filter rows according to user's identity context
  return rows.filter((row) => {
    try {
      return (policy as any).select(row, user);
    } catch (e) {
      console.error(`RLS Selection Exception on table ${table}:`, e);
      return false;
    }
  }) as DatabaseSchema[K];
}

/**
 * Enforces Row Level Security for INSERT transactions
 */
export function insertSecured<K extends 'orders' | 'notifications' | 'logs' | 'emailsSent' | 'users' | 'products'>(
  table: K,
  row: any,
  user: RLSUser | null,
  clientIp?: string
): void {
  const db = readDb();
  const policy = RLSPolicies[table];

  if (!policy) {
    throw new Error(`RLS POLICY FAILURE: No security rules configured for collection "${table}"`);
  }

  // Evaluate insert permission
  const isAuthorized = user ? policy.insert(row, user) : (table === 'users' || table === 'logs' || table === 'emailsSent');

  if (!isAuthorized) {
    const errorMsg = `RLS TRANSACTION DENIED: Unauthorized insert into "${table}" bypassed core authorization checks.`;
    
    // Register security breach log
    db.logs.push({
      id: 'log-' + Math.random().toString(36).substr(2, 9),
      userId: user ? user.id : 'anonymous',
      event: `SECURITY VIOLATION DETECTED: Row-level write validation failed for table "${table}". Request IP: ${clientIp || '127.0.0.1'}.`,
      ip: clientIp || '127.0.0.1',
      timestamp: new Date().toISOString()
    });
    writeDb(db);
    
    throw new Error(errorMsg);
  }

  (db[table] as any[]).push(row);
  writeDb(db);
}

/**
 * Enforces Row Level Security for UPDATE transactions
 */
export function updateSecured<K extends 'orders' | 'notifications' | 'logs' | 'emailsSent' | 'users' | 'products'>(
  table: K,
  id: string,
  updates: any,
  user: RLSUser,
  clientIp?: string
): boolean {
  const db = readDb();
  const rows = db[table] as any[];
  const itemIndex = rows.findIndex((r: any) => r.id === id);

  if (itemIndex === -1) {
    return false;
  }

  const existingItem = rows[itemIndex];
  const policy = RLSPolicies[table];

  if (!policy) {
    throw new Error(`RLS POLICY FAILURE: No security rules configured for collection "${table}"`);
  }

  // Validate update operation
  const isAuthorized = policy.update(existingItem, user);

  if (!isAuthorized) {
    db.logs.push({
      id: 'log-' + Math.random().toString(36).substr(2, 9),
      userId: user.id,
      event: `SECURITY VIOLATION DETECTED: Row-level update violation on table "${table}" for row ID "${id}". Request IP: ${clientIp || '127.0.0.1'}.`,
      ip: clientIp || '127.0.0.1',
      timestamp: new Date().toISOString()
    });
    writeDb(db);
    throw new Error(`RLS TRANSACTION DENIED: Unauthorized update attempts on protected entity.`);
  }

  // Merge updates
  rows[itemIndex] = { ...existingItem, ...updates };
  writeDb(db);
  return true;
}

/**
 * Enforces Row Level Security for DELETE transactions
 */
export function deleteSecured<K extends 'orders' | 'notifications' | 'logs' | 'emailsSent' | 'users' | 'products'>(
  table: K,
  id: string,
  user: RLSUser,
  clientIp?: string
): boolean {
  const db = readDb();
  const rows = db[table] as any[];
  const itemIndex = rows.findIndex((r: any) => r.id === id);

  if (itemIndex === -1) {
    return false;
  }

  const existingItem = rows[itemIndex];
  const policy = RLSPolicies[table];

  if (!policy) {
    throw new Error(`RLS POLICY FAILURE: No security rules configured for collection "${table}"`);
  }

  // Validate delete operation
  const isAuthorized = policy.delete(existingItem, user);

  if (!isAuthorized) {
    db.logs.push({
      id: 'log-' + Math.random().toString(36).substr(2, 9),
      userId: user.id,
      event: `SECURITY VIOLATION DETECTED: Row-level delete violation on table "${table}" for row ID "${id}". Request IP: ${clientIp || '127.0.0.1'}.`,
      ip: clientIp || '127.0.0.1',
      timestamp: new Date().toISOString()
    });
    writeDb(db);
    throw new Error(`RLS TRANSACTION DENIED: Unauthorized deletion of protected entity.`);
  }

  rows.splice(itemIndex, 1);
  writeDb(db);
  return true;
}
