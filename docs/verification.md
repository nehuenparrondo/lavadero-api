# Verificación de versión 1.0

Se ejecutaron typecheck estricto, ESLint sin advertencias, 14 pruebas unitarias/HTTP
y compilación TypeScript. La aceptación se ejecutó contra MySQL 8.4 real, en una base
temporal exclusiva, con las seis migraciones y semillas: 16 escenarios aprobados.

Casos cubiertos: inyección de rol, propiedad de vehículos/turnos, JWT alterado, refresh
rotado/reutilizado, logout inmediato, cambio de rol/contraseña, protección de admin,
flujo de estados del empleado, observaciones, cobro idempotente y exceso de saldo,
dos reservas concurrentes, liberación al cancelar, precio histórico, horario inválido,
servicios duplicados, PKCE/state/grants de los tres proveedores y vinculación de cuenta local
con prueba de contraseña y bloqueo al quinto intento.

Las respuestas de proveedores externos se simulan en esas pruebas OAuth. La validación
de la consola y autorización real debe registrarse por separado en `delivery.md`.
Las pruebas no modifican datos existentes de umbral-r5.

La auditoría estática de fuente se ejecuta con `npm run audit:source`; comprueba tamaños, TSDoc, ciclos y ausencia de HTTP en pantallas/componentes.
