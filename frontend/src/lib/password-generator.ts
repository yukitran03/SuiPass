// frontend/src/lib/password-generator.ts

export interface PasswordOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
}

const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const NUMBERS = '0123456789';
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';

/**
 * Generate a random password based on options
 */
export function generatePassword(options: PasswordOptions): string {
  let charset = '';
  let password = '';

  // Build charset based on options
  if (options.uppercase) charset += UPPERCASE;
  if (options.lowercase) charset += LOWERCASE;
  if (options.numbers) charset += NUMBERS;
  if (options.symbols) charset += SYMBOLS;

  if (charset.length === 0) {
    charset = LOWERCASE + NUMBERS; // Default fallback
  }

  // Generate password using crypto.getRandomValues for security
  const randomValues = new Uint32Array(options.length);
  crypto.getRandomValues(randomValues);

  for (let i = 0; i < options.length; i++) {
    const randomIndex = randomValues[i] % charset.length;
    password += charset[randomIndex];
  }

  // Ensure at least one character from each enabled category
  if (options.uppercase && !hasUppercase(password)) {
    password = replaceRandomChar(password, getRandomChar(UPPERCASE));
  }
  if (options.lowercase && !hasLowercase(password)) {
    password = replaceRandomChar(password, getRandomChar(LOWERCASE));
  }
  if (options.numbers && !hasNumber(password)) {
    password = replaceRandomChar(password, getRandomChar(NUMBERS));
  }
  if (options.symbols && !hasSymbol(password)) {
    password = replaceRandomChar(password, getRandomChar(SYMBOLS));
  }

  return password;
}

/**
 * Calculate password strength (0-100)
 */
export function calculatePasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
} {
  let score = 0;

  // Length score (max 40 points)
  if (password.length >= 8) score += 10;
  if (password.length >= 12) score += 10;
  if (password.length >= 16) score += 10;
  if (password.length >= 20) score += 10;

  // Character variety (max 40 points)
  if (hasUppercase(password)) score += 10;
  if (hasLowercase(password)) score += 10;
  if (hasNumber(password)) score += 10;
  if (hasSymbol(password)) score += 10;

  // Complexity bonus (max 20 points)
  const uniqueChars = new Set(password).size;
  if (uniqueChars >= password.length * 0.5) score += 10;
  if (uniqueChars >= password.length * 0.75) score += 10;

  // Determine label and color
  let label: string;
  let color: string;

  if (score < 40) {
    label = 'Weak';
    color = '#ef4444'; // red
  } else if (score < 60) {
    label = 'Fair';
    color = '#f59e0b'; // orange
  } else if (score < 80) {
    label = 'Good';
    color = '#eab308'; // yellow
  } else {
    label = 'Strong';
    color = '#22c55e'; // green
  }

  return { score, label, color };
}

// Helper functions
function hasUppercase(str: string): boolean {
  return /[A-Z]/.test(str);
}

function hasLowercase(str: string): boolean {
  return /[a-z]/.test(str);
}

function hasNumber(str: string): boolean {
  return /[0-9]/.test(str);
}

function hasSymbol(str: string): boolean {
  return /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(str);
}

function getRandomChar(charset: string): string {
  const randomValues = new Uint32Array(1);
  crypto.getRandomValues(randomValues);
  return charset[randomValues[0] % charset.length];
}

function replaceRandomChar(str: string, newChar: string): string {
  const randomValues = new Uint32Array(1);
  crypto.getRandomValues(randomValues);
  const index = randomValues[0] % str.length;
  return str.substring(0, index) + newChar + str.substring(index + 1);
}

/**
 * Default password options
 */
export const DEFAULT_PASSWORD_OPTIONS: PasswordOptions = {
  length: 16,
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: true,
};