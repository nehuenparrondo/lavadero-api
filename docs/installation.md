# Instalación y configuración independiente

Requiere Node 24 LTS, npm y MySQL 8.4. Clonar lavadero-api, ejecutar `npm ci`, copiar
`.env.example` a `.env`. Nunca versionar ese archivo. Cada variable tiene su explicación
en el ejemplo: conexión, TLS/CA, pool, JWT, CORS, administrador semilla y OAuth.

## Base y semillas

Crear una base vacía y usuario con permisos limitados sobre ella. Para Aiven usar su
puerto real, URI mysql:// y CA descargada. `DATABASE_TLS=true` y CA base64 permiten
verificar la identidad del servidor; nunca deshabilitar validación por un error de conexión.
La URI necesita codificación URL para caracteres especiales de usuario/contraseña.

```powershell
npm run db:migrate
npm run db:seed
npm run check
npm run dev
```

Seis migraciones crean tablas y registran checksum en schema_migrations. El segundo
arranque no repite escrituras ya aplicadas; modificar una migración histórica produce
error, por lo que cambios posteriores deben añadirse como nueva migración.
`database/schema.sql` es una alternativa completa para una base nueva; no mezclarla
con el migrador en la misma base, porque no registra su historial.

Las semillas insertan roles, estados, tipos, servicios/tarifas y horario inicial.
El administrador se crea solo si no existe, desde SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD
(mínimo 12 y máximo 72 bytes). Volver a sembrar no cambia su contraseña.

## Compilar y producción

`npm run build` produce dist; `npm start` inicia dist/src/server.js.
En Render: `npm ci --include=dev && npm run build && npm prune --omit=dev`;
inicio `npm run db:migrate:production && npm start`. Health check `/ready` comprueba MySQL;
`/health` solo comprueba el proceso. PORT lo suministra Render.

Variables obligatorias en producción: NODE_ENV=production, DATABASE_URL,
DATABASE_TLS=true, DATABASE_CA_BASE64 y JWT_ACCESS_SECRET aleatorio de al menos 32 caracteres.
PUBLIC_API_URL es el origen público y CORS_ORIGINS contiene orígenes web exactos separados
por coma. La app nativa no envía un Origin web, pero sigue necesitando JWT.

Se usan lavadero_dev y lavadero_prod con usuarios distintos en el mismo servidor Aiven;
es separación de datos/credenciales, no aislamiento físico. No se modifican otras bases.
Las credenciales productivas permanecen en Render y en archivos privados locales excluidos
de la entrega pública. Los recursos se despliegan desde main de su propio repositorio.

## Verificación

Abrir /health, /ready, /api/docs/ y /api/openapi.json. Iniciar sesión y consultar
/api/v1/users/me con Bearer token. Postman incluye todos los endpoints con roles.
Las pruebas de aceptación requieren NODE_ENV=test, una base desechable exclusiva con
migraciones/semillas y SEED_ADMIN_EMAIL/PASSWORD. Nunca apuntarlas a producción.
