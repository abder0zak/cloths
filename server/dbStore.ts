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
}

const initialSchema: DatabaseSchema = {
  users: [],
  passwords: {},
  orders: [],
  notifications: [],
  logs: [],
  emailsSent: []
};

function ensureDbExists() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(initialSchema, null, 2), 'utf8');
  }
}

export function readDb(): DatabaseSchema {
  ensureDbExists();
  try {
    const content = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    console.error('Error reading DB, resetting to default', err);
    return initialSchema;
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
  }
};

/**
 * Enforces Row Level Security for standard SELECT queries
 */
export function querySecured<K extends 'orders' | 'notifications' | 'logs' | 'emailsSent' | 'users'>(
  table: K,
  user: RLSUser
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
      return policy.select(row, user);
    } catch (e) {
      console.error(`RLS Selection Exception on table ${table}:`, e);
      return false;
    }
  }) as DatabaseSchema[K];
}

/**
 * Enforces Row Level Security for INSERT transactions
 */
export function insertSecured<K extends 'orders' | 'notifications' | 'logs' | 'emailsSent' | 'users'>(
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
export function updateSecured<K extends 'orders' | 'notifications' | 'logs' | 'emailsSent' | 'users'>(
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
export function deleteSecured<K extends 'orders' | 'notifications' | 'logs' | 'emailsSent' | 'users'>(
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
