import type { RowDataPacket } from 'mysql2/promise';
/** Flujo compartido por rutas y reglas del módulo. */
export type AppointmentStatus =
  'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
/** Reserva proyectada según el contrato REST. */
export interface Appointment extends RowDataPacket {
  id: string;
  clientId: string;
  employeeId: string | null;
  vehicleId: string;
  status: AppointmentStatus;
  startsAt: string;
  endsAt: string;
  currencyCode: string;
  plate: string;
  brand: string;
  model: string;
  color: string;
  serviceSummary: string;
  clientName: string;
  clientPhone: string | null;
  employeeName: string | null;
  version: number;
  totalCents: number;
  paidCents: number;
}
/** Renglón contratado y precio vigente para el tipo elegido. */
export interface QuoteItem extends RowDataPacket {
  serviceId: string;
  name: string;
  durationMinutes: number;
  priceCents: number;
}
/** Intervalo ocupado, con extremos UTC en milisegundos para cálculo puro. */
export interface Interval {
  start: number;
  end: number;
  employeeId: string | null;
  vehicleId: string;
}
