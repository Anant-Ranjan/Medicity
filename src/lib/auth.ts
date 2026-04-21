import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'medicity_super_secure_jwt_secret_2026';

export interface TokenPayload {
  userId: string;
  role: 'super_admin' | 'hospital_admin' | 'general_user';
  tenantId?: string;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}
