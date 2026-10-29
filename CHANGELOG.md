# Changelog

## 1.0.0 — 2026-10-29

### Agregado

- Registro Cliente, login tradicional, JWT y refresh con rotación/revocación por familia.
- Roles y propiedad en backend; protección de auto-degradación/desactivación del administrador.
- Usuarios, vehículos, tipos, servicios y tarifas; reservas con control transaccional de capacidad.
- Agenda asignada, estados, notas, pagos idempotentes, comprobantes y reportes administrativos.
- App por rol, formularios RHF/Zod, temas persistentes y navegación protegida.
- OAuth Google/Discord/GitHub con PKCE y secretos exclusivamente en backend.
- Documentación OpenAPI/Postman, pruebas de aceptación y despliegue Render/Aiven.

La autorización real de proveedores OAuth y la disponibilidad del APK se registran en
docs/verification.md y docs/delivery.md, sin confundir implementación con verificación externa.

## 0.1.0 — 2026-10-29

### Agregado

- Estructura independiente de la etapa 1 y TypeScript strict.
- Configuración de formato, lint, checks y CI propios.
- Documentación de arquitectura, instalación y plan por etapas.

- Modelo MySQL 8.4 con 17 tablas de negocio, migrador con lock/checksum y semilla bcrypt idempotente.
- `/health`, `/ready`, Swagger y contrato OpenAPI de infraestructura; plantilla Render/Aiven TLS.
- Pruebas HTTP y de integridad SQL, configuración ARS y agenda confirmada.

### Pendiente

- Etapas 2–10: despliegue real, autenticación, funciones de negocio y APK.
