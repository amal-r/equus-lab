import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET;
if (!SECRET) {
  throw new Error('Falta JWT_SECRET en el entorno (ver .env.example).');
}

export function signSession(user) {
  return jwt.sign({ sub: user.id, email: user.email }, SECRET, { expiresIn: '30d' });
}

export function verifySession(token) {
  return jwt.verify(token, SECRET);
}
