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
