import type { RowDataPacket } from 'mysql2/promise';
import type { Role, User } from '../../types/domain.js';

/** Registro interno de identidad. passwordHash nunca se serializa. */
export interface Identity extends RowDataPacket {
  id: string;
  email: string;
  passwordHash: string | null;
  role: Role;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl: string | null;
  authVersion: number;
  canRecordPayments: number;
  isActive: number;
  deletedAt: string | null;
}
/** Convierte el registro privado en un perfil público de campos explícitos. */
export function publicUser(row: Identity): User {
  return {
    id: String(row.id),
    hasPassword: Boolean(row.passwordHash),
    email: row.email,
    role: row.role,
    firstName: row.firstName,
    lastName: row.lastName,
    phone: row.phone,
    avatarUrl: row.avatarUrl,
    authVersion: row.authVersion,
    canRecordPayments: Boolean(row.canRecordPayments),
    isActive: Boolean(row.isActive),
  };
}
