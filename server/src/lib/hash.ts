import bcrypt from 'bcrypt';
import { getBcryptCost } from '../config.js';

const SALT_ROUNDS = getBcryptCost();

export async function hashPattern(pattern: string): Promise<string> {
  return bcrypt.hash(pattern, SALT_ROUNDS);
}

export async function verifyPattern(pattern: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pattern, hash);
}
