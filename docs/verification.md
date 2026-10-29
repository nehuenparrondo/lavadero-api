# Verificación de etapa 1 — 29/10/2026

- `npm run check`: TypeScript strict, ESLint, **11 pruebas unitarias/HTTP** y build aprobados.
- `npm run format:check`: formato verificado.
- MySQL **8.4.13 real**, instancia temporal aislada: cuatro migraciones aplicadas y repetición
  sin duplicar versiones; seed ejecutado dos veces sin duplicar catálogos ni administrador.
- **3 pruebas de integración** aprobadas: configuración/días/horarios, unicidad de email y patente,
  FK de rol, duración positiva y rango horario válido. Fixtures con rollback.
- `npm audit`: **0 avisos** reportados en la fecha de ejecución.

Las pruebas MySQL se hicieron en una base descartable de esta computadora. No demuestran conexión
con Aiven ni despliegue Render: se verifican en etapa 2 con los servicios reales.
No se han probado autenticación, roles, turnos ni pagos de negocio porque aún no están implementados.
