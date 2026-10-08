const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function cleanName(value) {
  if (typeof value !== 'string') return null;
  const name = value.trim();
  return name.length >= 1 && name.length <= 40 ? name : null;
}

export function cleanEmail(value) {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && EMAIL_RE.test(email) ? email : null;
}

// bcrypt reads only the first 72 bytes, so a longer password is refused rather than silently cut.
export function validPassword(value) {
  return typeof value === 'string' && value.length >= 8 && new TextEncoder().encode(value).length <= 72;
}

export function validPact(value) {
  return Number.isInteger(value) && value >= 1 && value <= 7;
}
