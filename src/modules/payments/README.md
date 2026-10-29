# payments

Cobros en efectivo/transferencia por turno. Lock del turno, clave de idempotencia y límite de saldo evitan duplicados o sobrepagos concurrentes. Empleado requiere asignación y habilitación administrativa.

Rutas → middlewares → controller → service → repository. Validaciones en schema y contratos en types.
Consultá [API.md](../../../API.md) para métodos, permisos, ejemplos y errores.
