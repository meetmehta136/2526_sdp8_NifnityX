import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
// Ensure this is 32 chars long in your env, or we pad it here. 
// For dev simplicity, we use a fixed secret if env is missing (DO NOT DO THIS IN PROD)
const SECRET_KEY = process.env.ENCRYPTION_KEY || "nifnityx_secure_trading_secret_32b"; 
const IV_LENGTH = 16;

export const encrypt = (text) => {
  if (!text) return null;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(SECRET_KEY.slice(0, 32)), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
};

export const decrypt = (text) => {
  if (!text) return null;
  const [ivPart, encryptedPart] = text.split(':');
  const iv = Buffer.from(ivPart, 'hex');
  const encryptedText = Buffer.from(encryptedPart, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(SECRET_KEY.slice(0, 32)), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
};