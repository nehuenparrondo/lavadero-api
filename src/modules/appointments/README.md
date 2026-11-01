# modules/appointments

Agenda y contratos históricos. Compartir el lock de settings para reservar/asignar/cambiar estado; no confiar en precios del cliente.

## Archivos y responsabilidades

| Archivo                                                                  | Responsabilidad                                                                                    |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| [appointments.access.ts](appointments.access.ts)                         | Oculta la existencia de turnos ajenos al actor.                                                    |
| [appointments.controller.ts](appointments.controller.ts)                 | Lista por rol y filtros.                                                                           |
| [appointments.filters.repository.ts](appointments.filters.repository.ts) | Construye únicamente predicados cerrados; los datos siempre viajan como parámetros.                |
| [appointments.repository.ts](appointments.repository.ts)                 | Busca un turno sin revelar datos fuera del servicio autorizado.                                    |
| [appointments.routes.ts](appointments.routes.ts)                         | Turnos con controles adicionales de propiedad/asignación dentro de cada servicio.                  |
| [appointments.schema.ts](appointments.schema.ts)                         | Valores únicos y acotados evitan consultas y totales ambiguos.                                     |
| [appointments.service.ts](appointments.service.ts)                       | Lista exclusivamente propios/asignados y admite filtros administrativos sin ampliar acceso.        |
| [appointments.types.ts](appointments.types.ts)                           | Flujo compartido por rutas y reglas del módulo.                                                    |
| [appointments.write.repository.ts](appointments.write.repository.ts)     | Inserta turno pendiente. El llamador mantiene lock de agenda y snapshot de precios.                |
| [availability.service.ts](availability.service.ts)                       | Cotiza servicios activos para un vehículo visible y habilitado.                                    |
| [booking.service.ts](booking.service.ts)                                 | Reserva y guarda el contrato histórico bajo el bloqueo compartido de agenda.                       |
| [bookingSlot.service.ts](bookingSlot.service.ts)                         | Revalida horario y ocupación dentro de la transacción que mantiene el lock de agenda.              |
| [intervals.ts](intervals.ts)                                             | Convierte filas SQL UTC al formato único del cálculo de capacidad.                                 |
| [mutation.service.ts](mutation.service.ts)                               | Cambia estado con permisos, ownership, ventana de cancelación y bloqueo de agenda.                 |
| [notes.repository.ts](notes.repository.ts)                               | Lee notas atribuidas a su autor, después de autorizar el turno en service.                         |
| [schedule.ts](schedule.ts)                                               | Interpreta un DATETIME de MySQL como UTC sin depender de la zona del servidor.                     |
| [transitions.ts](transitions.ts)                                         | Valida máquina de estados; admin puede corregir estados, preservando demás invariantes en service. |

## Mantenimiento

Consultar los TSDoc de cada función antes de cambiar sus precondiciones. Mantener los efectos en su capa y actualizar esta tabla junto con el módulo. Ejecutar npm run check desde la raíz del repositorio.
