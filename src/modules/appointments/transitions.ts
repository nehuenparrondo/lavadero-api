import type { AppointmentStatus } from './appointments.types.js';
import type { Role } from '../../types/domain.js';
import { ConflictError } from '../../errors/ConflictError.js';
const employeeNext: Partial<Record<AppointmentStatus, AppointmentStatus>> = {
  confirmed: 'in_progress',
  in_progress: 'completed',
};
/** Valida máquina de estados; admin puede corregir estados, preservando demás invariantes en service. */
export function assertTransition(from: AppointmentStatus, to: AppointmentStatus, role: Role) {
  if (
    from === to ||
    (role === 'employee' && employeeNext[from] !== to) ||
    (role === 'client' && (to !== 'cancelled' || !['pending', 'confirmed'].includes(from)))
  )
    throw new ConflictError('No se permite esa transición de estado.');
}
