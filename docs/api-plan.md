# Contrato futuro — todavía no implementado

Prefijo `/api/v1`. Cada endpoint tendrá esquema Zod, request/response de ejemplo, roles,
ownership, parámetros y errores documentados en API.md/OpenAPI al implementarse.
Los roles se validan en backend, incluso con llamadas hechas fuera de la app.

| Método            | Ruta relativa                         | Permiso                                    | Regla                                                                |
| ----------------- | ------------------------------------- | ------------------------------------------ | -------------------------------------------------------------------- |
| POST              | `/auth/register, /auth/login`         | Público                                    | Registro siempre client; Zod, bcrypt y rate limit.                   |
| POST              | `/auth/refresh, /auth/logout`         | Refresh válido                             | Rotación, revocación y detección de reuso.                           |
| GET/POST          | `/auth/oauth/:provider/*`             | Público + state/PKCE                       | Canje backend, callback validado, email verificado.                  |
| GET/PATCH         | `/users/me`                           | Todos                                      | Solo perfil propio, no acepta rol ni habilitación de cobro.          |
| PUT               | `/users/me/password`                  | Todos con password local                   | Requiere contraseña actual e invalida otras sesiones.                |
| GET/POST          | `/users`                              | Admin                                      | Listar/buscar/filtrar/crear.                                         |
| GET/PATCH/DELETE  | `/users/:id`                          | Admin                                      | Editar/activar/desactivar/soft delete; proteger último admin y self. |
| PATCH             | `/users/:id/role`                     | Admin                                      | Cambio de rol separado, invalidación de permisos antiguos.           |
| GET               | `/vehicle-types`                      | Todos                                      | Tipos activos para catálogo.                                         |
| POST/PATCH/DELETE | `/vehicle-types[/:id]`                | Admin                                      | ABML de tipos.                                                       |
| GET/POST          | `/vehicles`                           | Cliente propio / Admin todos               | Owner nunca se toma ciegamente del body de un cliente.               |
| GET/PATCH/DELETE  | `/vehicles/:id`                       | Cliente propietario / Admin                | Soft delete sin perder historial.                                    |
| GET               | `/services[/:id]`                     | Todos                                      | Descripción, duración y precios por tipo.                            |
| POST/PATCH/DELETE | `/services[/:id]`                     | Admin                                      | ABML de servicios y desactivación.                                   |
| PUT               | `/services/:id/prices/:vehicleTypeId` | Admin                                      | Precio en centavos, positivo.                                        |
| GET               | `/availability`                       | Cliente / Admin                            | Fecha, vehículo, servicios; slots calculados con duración.           |
| GET/POST          | `/appointments`                       | Cliente propio / Admin                     | Empleado no puede crear. Lista de empleado solo asignados.           |
| GET               | `/appointments/:id`                   | Cliente propio / Empleado asignado / Admin | Proyección mínima de datos personales para empleado.                 |
| PATCH             | `/appointments/:id/status`            | Empleado asignado / Admin                  | Empleado confirmed→in_progress→completed; inválido 409.              |
| PATCH             | `/appointments/:id/assignment`        | Admin                                      | Asignar o reasignar validando empleado/capacidad.                    |
| POST              | `/appointments/:id/cancel`            | Cliente propio / Admin                     | Cliente pending/confirmed y más de 120 min por defecto.              |
| POST              | `/appointments/:id/notes`             | Empleado asignado / Admin                  | Observación con autor y fecha.                                       |
| GET               | `/appointments/:id/receipt`           | Cliente propio / Admin                     | Turno finalizado, precios históricos y cobros.                       |
| GET               | `/appointments/:id/payments`          | Cliente propio / Admin                     | Sin acceso a pagos ajenos.                                           |
| POST              | `/appointments/:id/payments`          | Empleado asignado y habilitado / Admin     | Idempotencia, no sobrecobrar.                                        |
| GET               | `/reports`                            | Admin                                      | Lavados, ingresos, servicios y rendimiento por período.              |
| GET               | `/reports/me`                         | Empleado                                   | Resumen propio sin ingresos del negocio.                             |
| GET/PATCH         | `/settings`                           | Admin                                      | Horarios, días, capacidad, cancelación y zona horaria.               |

Lista de turnos: separar permiso de lectura de creación: Empleado puede GET solo asignados,
nunca POST. Las rutas abreviadas `[/:id]` se expandirán explícitamente en OpenAPI.
Errores de negocio previstos: 400 validación, 401 sesión inválida/expirada, 403 permiso,
404 recurso no visible, 409 conflicto/transición/capacidad, 500 error interno.
Paginación y filtros se validan y limitan; no se concatena input del usuario en SQL.
