# Changelog

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
