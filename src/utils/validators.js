const { ValidationError } = require('./errors');

function requireFields(body, fields) {
  const missing = fields.filter((f) => body[f] === undefined || body[f] === null || body[f] === '');
  if (missing.length > 0) {
    throw new ValidationError(`Missing required fields: ${missing.join(', ')}`);
  }
}

function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(email)) {
    throw new ValidationError('Invalid email address');
  }
}

function validatePositiveNumber(value, fieldName) {
  const num = Number(value);
  if (isNaN(num) || num < 0) {
    throw new ValidationError(`${fieldName} must be a non-negative number`);
  }
  return num;
}

function validateEnum(value, allowed, fieldName) {
  if (!allowed.includes(value)) {
    throw new ValidationError(`${fieldName} must be one of: ${allowed.join(', ')}`);
  }
}

function parseJsonField(value, fieldName) {
  if (!value) return null;
  if (Array.isArray(value)) return JSON.stringify(value);
  if (typeof value === 'string') {
    try {
      JSON.parse(value);
      return value;
    } catch {
      throw new ValidationError(`${fieldName} must be valid JSON`);
    }
  }
  return JSON.stringify(value);
}

module.exports = { requireFields, validateEmail, validatePositiveNumber, validateEnum, parseJsonField };
