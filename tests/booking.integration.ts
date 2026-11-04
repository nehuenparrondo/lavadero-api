import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  api,
  admin,
  client,
  employee,
  vehicle,
  future,
  firstSlot,
  login,
  completeAt,
} from './support/context.js';

test('reserva, propiedad, flujo del empleado, observaciones, cobro y comprobante', async () => {
  const owner = await admin();
  const customer = await client();
  const outsider = await client();
  const staff = await employee(owner.accessToken, true);
  const otherStaff = await employee(owner.accessToken);
  const car = await vehicle(customer.accessToken);
  const { serviceId, quote } = await firstSlot(customer.accessToken, car.id, future(20));
  assert.equal(quote.durationMinutes, 35);
  assert.ok(quote.slots.length);
  const created = (
    await api('post', '/appointments', customer.accessToken, {
      vehicleId: car.id,
      serviceIds: [serviceId],
      startsAt: quote.slots[0],
    }).expect(201)
  ).body.data;
  await api('get', `/appointments/${created.id}`, outsider.accessToken).expect(404);
  assert.equal(created.status, 'confirmed');
  assert.ok(!('employeeId' in created));
  assert.ok(!('employeeName' in created));
  const shared = await api(
    'get',
    `/appointments/${created.id}`,
    otherStaff.accessToken,
  ).expect(200);
  assert.ok(!('totalCents' in shared.body.data));
  await api('post', `/appointments/${created.id}/payments`, otherStaff.accessToken, {
    amountCents: 1,
    method: 'cash',
    idempotencyKey: crypto.randomUUID(),
  }).expect(403);
  await api('patch', `/appointments/${created.id}/status`, staff.accessToken, {
    status: 'completed',
  }).expect(409);
  await api('post', `/appointments/${created.id}/notes`, staff.accessToken, {
    body: 'Raya previa observada en puerta derecha.',
  }).expect(201);
  await api('patch', `/appointments/${created.id}/status`, staff.accessToken, {
    status: 'in_progress',
  }).expect(200);
  for (const [token, instant] of [
    [otherStaff.accessToken, '2026-11-03T09:29:59-03:00'],
    [owner.accessToken, '2026-11-03T16:30:00-03:00'],
    [otherStaff.accessToken, '2026-11-08T12:00:00-03:00'],
  ] as const) {
    const rejected = await completeAt(token, created.id, instant);
    assert.equal(rejected.status, 409);
    assert.equal(rejected.body.error.code, 'OUTSIDE_BUSINESS_HOURS');
  }
  const stillRunning = await api(
    'get',
    `/appointments/${created.id}`,
    staff.accessToken,
  ).expect(200);
  assert.equal(stillRunning.body.data.status, 'in_progress');
  const completed = await completeAt(otherStaff.accessToken, created.id, quote.slots[0]!);
  assert.equal(completed.status, 200);
  const key = crypto.randomUUID();
  const payment = { amountCents: quote.totalCents, method: 'cash', idempotencyKey: key };
  await api('post', `/appointments/${created.id}/payments`, staff.accessToken, payment).expect(
    201,
  );
  const replay = await api(
    'post',
    `/appointments/${created.id}/payments`,
    staff.accessToken,
    payment,
  ).expect(201);
  assert.equal(replay.body.data.replayed, true);
  await api('post', `/appointments/${created.id}/payments`, owner.accessToken, {
    ...payment,
    idempotencyKey: crypto.randomUUID(),
  }).expect(409);
  const receipt = await api(
    'get',
    `/appointments/${created.id}/receipt`,
    customer.accessToken,
  ).expect(200);
  assert.equal(receipt.body.data.totalCents, quote.totalCents);
  assert.equal(receipt.body.data.paidCents, quote.totalCents);
  const projection = await api('get', `/appointments/${created.id}`, staff.accessToken).expect(
    200,
  );
  assert.ok(!('email' in projection.body.data));
});
test('dos reservas simultáneas no superan capacidad; cancelar libera horario', async () => {
  const a = await client();
  const b = await client();
  const va = await vehicle(a.accessToken);
  const vb = await vehicle(b.accessToken);
  const { serviceId, quote } = await firstSlot(a.accessToken, va.id, future(30));
  const first = api('post', '/appointments', a.accessToken, {
    vehicleId: va.id,
    serviceIds: [serviceId],
    startsAt: quote.slots[0],
  });
  const second = api('post', '/appointments', b.accessToken, {
    vehicleId: vb.id,
    serviceIds: [serviceId],
    startsAt: quote.slots[0],
  });
  const results = await Promise.all([first, second]);
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
  const winner = results[0]!.status === 201 ? a : b;
  const id = results.find((r) => r.status === 201)!.body.data.id;
  await api('delete', `/vehicles/${winner === a ? va.id : vb.id}`, winner.accessToken).expect(
    409,
  );
  await api('post', `/appointments/${id}/cancel`, winner.accessToken, {
    reason: 'Cambio de planes',
  }).expect(200);
  await api('post', `/appointments/${id}/cancel`, winner.accessToken, {}).expect(409);
  await api('post', '/appointments', a.accessToken, {
    vehicleId: va.id,
    serviceIds: [serviceId],
    startsAt: quote.slots[0],
  }).expect(201);
});
test('catálogo actualizado conserva precio histórico y todos los empleados ven el turno', async () => {
  const owner = await admin();
  const customer = await client();
  const staff = await employee(owner.accessToken);
  const car = await vehicle(customer.accessToken);
  const { serviceId, quote } = await firstSlot(customer.accessToken, car.id, future(40));
  const created = (
    await api('post', '/appointments', customer.accessToken, {
      vehicleId: car.id,
      serviceIds: [serviceId],
      startsAt: quote.slots[0],
    }).expect(201)
  ).body.data;
  await api('put', `/services/${serviceId}/prices/1`, owner.accessToken, {
    priceCents: quote.totalCents + 100,
  }).expect(200);
  const detail = await api('get', `/appointments/${created.id}`, customer.accessToken).expect(
    200,
  );
  assert.equal(detail.body.data.totalCents, quote.totalCents);
  const list = await api('get', '/appointments', staff.accessToken).expect(200);
  assert.ok(list.body.data.items.some((item: { id: string }) => item.id === created.id));
  await api('get', `/appointments/${created.id}/receipt`, customer.accessToken).expect(409);
  await login(customer.user.email);
});
test('fuera de atención, servicio duplicado o vehículo ajeno se rechazan', async () => {
  const customer = await client();
  const other = await client();
  const car = await vehicle(customer.accessToken);
  const { serviceId } = await firstSlot(customer.accessToken, car.id, future(50));
  await api('post', '/appointments', customer.accessToken, {
    vehicleId: car.id,
    serviceIds: [serviceId],
    startsAt: `${future(50)}T22:00:00-03:00`,
  }).expect(409);
  await api('post', '/appointments', customer.accessToken, {
    vehicleId: car.id,
    serviceIds: [serviceId, serviceId],
    startsAt: `${future(50)}T09:30:00-03:00`,
  }).expect(400);
  await api('get', '/availability', other.accessToken)
    .query({ date: future(50), vehicleId: car.id, serviceIds: serviceId })
    .expect(404);
});
