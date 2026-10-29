/** Roles persistidos y emitidos en JWT; el backend verifica siempre su vigencia. */
export type Role = 'client' | 'employee' | 'admin';
/** Actor de la solicitud después de verificar token y usuario activo. */
export interface Actor {
  id: string;
  role: Role;
  authVersion: number;
  canRecordPayments: boolean;
}
/** Perfil público; nunca incluye el hash de contraseña. */
export interface User extends Actor {
  hasPassword: boolean;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl: string | null;
  isActive: boolean;
}
/** Resultado paginado con tamaño limitado por el servidor. */
export interface Page<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}
