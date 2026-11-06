# Turnos, partes, atención y asistencia

La reserva se confirma en una transacción que guarda los servicios y sus precios históricos. La misma transacción busca a un empleado activo sin superposición de turnos, priorizando al que lleva más tiempo sin una asignación. Si el equipo no tiene disponibilidad, la reserva queda confirmada sin responsable y Administración puede asignar uno después. La agenda sigue siendo compartida.

En la cotización y en la reserva, `wax` exige `exterior` o `complete`. La migración 010 y el seed fijan inicialmente $15.000 ARS y 15 minutos para encerado, y $20.000 ARS y 35 minutos para tapizados de autos, SUV y camionetas. Los minutos son estimaciones que se ajustan en Servicios y precios. Las reservas anteriores conservan sus renglones y totales.

## Turno y revisión

- `GET /api/v1/appointments?plate=AB123` filtra por patente parcial y pagina en el servidor. Empleados y administradores pueden combinarlo con fecha o estado. El cliente sigue consultando sus propios turnos.
- `PATCH /api/v1/appointments/:id/vehicle-detail` guarda la descripción del titular mientras el turno está confirmado. La descripción no modifica los servicios del contrato.
- `PATCH /api/v1/appointments/:id/status` permite al empleado responsable comenzar. Los turnos anteriores sin asignación se pueden tomar si el empleado tiene disponibilidad.
- `POST /api/v1/appointments/:id/wash-submission` guarda descripción, autor y hora en `wash_submissions` y cambia el estado a `awaiting_review`. Solo lo hace el responsable durante la jornada.
- `PATCH /api/v1/appointments/:id/wash-review` requiere el identificador del parte exacto. Administración aprueba en horario de atención o devuelve con un motivo. Devolver reabre el trabajo y conserva el intento anterior. Aprobar lo pasa a `completed` y habilita comprobante y devolución.
- `GET /api/v1/appointments/:id` muestra nombre del responsable, servicios históricos, descripción del auto y parte correspondiente al rol. El cliente ve el parte cuando está aprobado.

Las operaciones que cambian el trabajo bloquean la fila del turno. Cambiar el estado genérico no permite saltar la revisión. Los reportes cuentan los turnos finalizados e identifican a su responsable. Un lavado finalizado antes de este flujo conserva su comprobante histórico y no tiene un parte verificado.

## Reclamos y devoluciones

`/api/v1/customer-messages` lista y crea reclamos o devoluciones. El reclamo es general. La devolución requiere un turno propio finalizado con parte aprobado y se guarda una vez por parte. El servidor recupera el responsable y la descripción originales. Los clientes ven su bandeja y Administración ve todos los casos. `PATCH /api/v1/customer-messages/:id/reply` guarda la respuesta administrativa y cierra el caso.

## Fichajes y cuentas

`GET /api/v1/attendance?date=AAAA-MM-DD` muestra el plantel activo y las llegadas de hoy, o el registro de la fecha consultada. `POST /api/v1/attendance/:id/arrival` requiere la fecha actual del negocio para evitar fichar accidentalmente en una vista vieja. La hora se guarda en UTC con el administrador que observó la llegada. La clave primaria de `employee_attendance` conserva el primer fichaje del día.

Cada persona usa registro público o inicio social. Un administrador asigna el rol Empleado a la cuenta registrada desde Usuarios. Los cambios de rol invalidan las sesiones anteriores.

## Código

- [Reglas de revisión](../src/modules/appointments/wash.service.ts) y [asignación automática](../src/modules/appointments/responsibility.repository.ts).
- [Bandeja y privacidad](../src/modules/customerMessages/messages.service.ts) y [fichajes](../src/modules/attendance/attendance.service.ts).
- [Esquema incremental](../database/migrations/009_work_operations.sql) y [catálogo de extras](../database/migrations/010_detailing_services.sql).
- [Pruebas de integración](../tests/operations.integration.ts).
