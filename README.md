# Lavadero API 1.0

Backend independiente de gestión de lavadero: autenticación local y social, permisos de
Cliente/Empleado/Administrador, vehículos, catálogo, turnos, cobros y reportes.

API pública: https://lavadero-api-48m4.onrender.com · [Swagger](https://lavadero-api-48m4.onrender.com/api/docs/).
Repositorio privado: https://github.com/nehuenparrondo/lavadero-api.

## Ejecutar

Requiere Node 24 LTS y MySQL 8.4. No necesita el repositorio móvil.

```powershell
npm ci
Copy-Item .env.example .env
# Completar la conexión, CA TLS, JWT y administrador inicial.
npm run db:migrate
npm run db:seed
npm run check
npm run dev
```

`npm run build` compila; `npm start` ejecuta el resultado. En Render se ejecuta
`npm run db:migrate:production && npm start`; las semillas se ejecutan una vez,
con `npm run db:seed:production`. Las migraciones comprueban su checksum.

## Comportamiento

- Registro público siempre Cliente. Contraseñas bcrypt; access JWT de 15 minutos y
  refresh opaco de 30 días, rotado y revocable. Reutilizar refresh revoca su familia.
- Propiedad y rol se comprueban en cada solicitud. Cambios de rol invalidan sesiones.
- Reservas bajo transacción: horario, capacidad, propietario y precio se recalculan.
  Los precios y duraciones históricos permanecen aunque cambie el catálogo.
- Empleados solo acceden a trabajos asignados. Cobran únicamente si están habilitados.
- Importes enteros en centavos ARS; fechas UTC y calendario Buenos Aires.
- Atención inicial lunes a sábado 09:30–16:30, capacidad 1, grilla 5 minutos.
  Servicios de ejemplo: interior 30, exterior 35 y completo 40 minutos.

## Documentación

[Contrato por endpoint](API.md), [OpenAPI](docs/openapi.json), [Postman](docs/postman.collection.json),
[instalación](docs/installation.md), [hosting](docs/hosting.md),
[arquitectura](docs/architecture.md), [base y ER](docs/database.md),
[verificación](docs/verification.md), [entrega](docs/delivery.md).

`npm test` ejecuta pruebas unitarias/HTTP sin MySQL. `npm run test:acceptance` usa una
base exclusiva de pruebas con `NODE_ENV=test`: nunca ejecutarlo sobre producción.
Ver requisitos en `tests/README.md`.

No publicar `.env`, claves, tokens, contraseñas ni copias de la base. OAuth exige
credenciales reales de cada proveedor; sus pruebas automatizadas usan proveedores
simulados y no acreditan por sí solas una autorización externa real.

## Revisión de la consigna

[Matriz de requisitos y evidencia](docs/requirements-review.md) · [Prueba desde iPhone/Expo Go](docs/iphone-expo-go.md).

## Lectura y mantenimiento del código

- [Guía de código e invariantes](docs/code-guide.md)
- [Mapa de todos los módulos](docs/source-map.md)
