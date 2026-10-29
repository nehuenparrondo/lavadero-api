import { DateTime } from 'luxon';
import type { z } from 'zod';
import { getSettings } from '../settings/settings.service.js';
import { AppError } from '../../errors/AppError.js';
import * as repo from './reports.repository.js';
import type { reportSchema } from './reports.schema.js';
/** Resuelve límites de un día/semana/mes con calendario y zona IANA del negocio. */
async function window(input: z.infer<typeof reportSchema>) {
  const settings = await getSettings();
  const at = input.date
    ? DateTime.fromISO(input.date, { zone: settings.timeZone })
    : DateTime.now().setZone(settings.timeZone);
  if (!at.isValid)
    throw new AppError(400, 'INVALID_DATE', 'La fecha del reporte no es válida.');
  const start = at.startOf(input.period);
  const end =
    input.period === 'day'
      ? start.plus({ days: 1 })
      : input.period === 'week'
        ? start.plus({ weeks: 1 })
        : start.plus({ months: 1 });
  return {
    settings,
    start,
    end,
    from: start.toUTC().toFormat('yyyy-MM-dd HH:mm:ss'),
    to: end.toUTC().toFormat('yyyy-MM-dd HH:mm:ss'),
  };
}
/** Reporte administrativo: lavados, ingresos, populares y rendimiento por empleado. */
export async function businessReport(input: z.infer<typeof reportSchema>) {
  const range = await window(input);
  const [work, payments, services] = await Promise.all([
    repo.completedWork(range.from, range.to),
    repo.revenue(range.from, range.to),
    repo.popularServices(range.from, range.to),
  ]);
  const days = new Map<string, { date: string; washes: number; revenueCents: number }>();
  const employees = new Map<string, { id: string; name: string; completed: number }>();
  for (let d = range.start; d < range.end; d = d.plus({ days: 1 }))
    days.set(d.toISODate()!, { date: d.toISODate()!, washes: 0, revenueCents: 0 });
  for (const item of work) {
    const day = DateTime.fromSQL(item.endsAt, { zone: 'utc' })
      .setZone(range.settings.timeZone)
      .toISODate()!;
    const bucket = days.get(day);
    if (bucket) bucket.washes++;
    const id = String(item.employeeId);
    const employee = employees.get(id) ?? {
      id,
      name: String(item.employeeName ?? 'Sin asignar'),
      completed: 0,
    };
    employee.completed++;
    employees.set(id, employee);
  }
  for (const payment of payments) {
    const day = DateTime.fromSQL(payment.paidAt, { zone: 'utc' })
      .setZone(range.settings.timeZone)
      .toISODate()!;
    const bucket = days.get(day);
    if (bucket) bucket.revenueCents += Number(payment.amountCents);
  }
  return {
    period: input.period,
    from: range.start.toISODate(),
    to: range.end.minus({ days: 1 }).toISODate(),
    currencyCode: 'ARS',
    totalWashes: work.length,
    revenueCents: payments.reduce((sum, p) => sum + Number(p.amountCents), 0),
    days: [...days.values()],
    services: services.map((service) => ({
      name: String(service.name),
      count: Number(service.count),
    })),
    employees: [...employees.values()],
  };
}
/** Resumen exclusivo de la jornada asignada al empleado. */
export async function personalReport(id: string, input: z.infer<typeof reportSchema>) {
  const range = await window({ ...input, period: 'day' });
  const counts = await repo.employeeSummary(id, range.from, range.to);
  return {
    date: range.start.toISODate(),
    completed: Number(counts.find((c) => c.status === 'completed')?.count ?? 0),
    pending: counts
      .filter((c) => ['pending', 'confirmed', 'in_progress'].includes(String(c.status)))
      .reduce((sum, c) => sum + Number(c.count), 0),
  };
}
