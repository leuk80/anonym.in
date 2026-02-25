import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  scrypt,
  timingSafeEqual,
} from 'crypto'
import { promisify } from 'util'
import type { EncryptedData } from '@/types'

const scryptAsync = promisify(scrypt)

// ============================================================
// AES-256-GCM Verschlüsselung
// ============================================================

export function encrypt(text: string, keyHex: string): EncryptedData {
  const key = Buffer.from(keyHex, 'hex')
  const iv = randomBytes(12) // 96-bit IV für GCM

  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])

  return {
    iv: iv.toString('hex'),
    authTag: cipher.getAuthTag().toString('hex'),
    ciphertext: encrypted.toString('hex'),
  }
}

export function decrypt(encryptedData: EncryptedData, keyHex: string): string {
  const key = Buffer.from(keyHex, 'hex')
  const iv = Buffer.from(encryptedData.iv, 'hex')
  const authTag = Buffer.from(encryptedData.authTag, 'hex')
  const ciphertext = Buffer.from(encryptedData.ciphertext, 'hex')

  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  return decrypted.toString('utf8')
}

// Hilfsfunktionen für DB-Speicherung (JSON-String)
export function encryptToString(text: string, keyHex: string): string {
  return JSON.stringify(encrypt(text, keyHex))
}

export function decryptFromString(encryptedJson: string, keyHex: string): string {
  return decrypt(JSON.parse(encryptedJson) as EncryptedData, keyHex)
}

// ============================================================
// Key-Generierung
// ============================================================

export function generateEncryptionKey(): string {
  return randomBytes(32).toString('hex') // 256-bit
}

// Env-Var-Name aus Org-UUID (Bindestriche entfernen)
export function getOrgKeyEnvName(organizationId: string): string {
  return `ORG_KEY_${organizationId.replace(/-/g, '')}`
}

export function getOrgEncryptionKey(organizationId: string): string {
  const envName = getOrgKeyEnvName(organizationId)
  const key = process.env[envName]
  if (!key) {
    throw new Error(`Encryption key not found for organization: ${organizationId}`)
  }
  return key
}

// ============================================================
// Melder-Token Generierung (Format: WOLF-7342-BLAU)
// ============================================================

const TOKEN_ANIMALS = [
  'WOLF', 'FUCHS', 'ADLER', 'BISON', 'LUCHS',
  'FALKE', 'IGEL', 'DACHS', 'RABE', 'HABICHT',
  'OTTER', 'MARDER', 'HIRSCH', 'LACHS', 'BIBER',
]

const TOKEN_COLORS = [
  'BLAU', 'GRUEN', 'GRAU', 'WEISS', 'BRAUN',
  'SCHWARZ', 'SILBER', 'GOLD', 'BEIGE', 'DUNKEL',
]

export function generateMelderToken(): string {
  const animal = TOKEN_ANIMALS[Math.floor(Math.random() * TOKEN_ANIMALS.length)]
  const number = Math.floor(1000 + Math.random() * 9000)
  const color = TOKEN_COLORS[Math.floor(Math.random() * TOKEN_COLORS.length)]
  return `${animal}-${number}-${color}`
}

// ============================================================
// Passwort-Hashing (scrypt)
// ============================================================

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(32)
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer
  return `${salt.toString('hex')}:${derivedKey.toString('hex')}`
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const [saltHex, keyHex] = hash.split(':')
  if (!saltHex || !keyHex) return false

  const salt = Buffer.from(saltHex, 'hex')
  const storedKey = Buffer.from(keyHex, 'hex')
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer

  return timingSafeEqual(storedKey, derivedKey)
}

// ============================================================
// SHA-256 Hash (für Encryption-Key-Verifikation)
// ============================================================

export function hashValue(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}
