# lavadero-api

API del lavadero, separada de la app móvil. **Etapa 1 completada:** base ejecutable,
MySQL diseñado, migraciones, semillas y sondas HTTP. Auth y CRUD todavía no disponibles.

## Tecnologías y requisitos

Node.js 24 LTS (mínimo 22.13), Express 5, TypeScript strict, mysql2, Zod, bcrypt.
MySQL **8.4 LTS**, InnoDB y UTF-8. Se propone Aiven Free para desarrollo y producción académica.
No requiere instalar ni abrir `lavadero-app`.

## Instalación

```powershell
npm ci
Copy-Item .env.example .env
```

Completar `DATABASE_URL`, `DATABASE_TLS=true` y `DATABASE_CA_BASE64` con Aiven.
Configurar `SEED_ADMIN_EMAIL` y contraseña única de 12–72 bytes. Cada variable está comentada.
No copiar secretos a la app. Ver [guía paso a paso](docs/installation.md).

```powershell
npm run db:migrate
npm run db:seed
npm run check
npm run dev
```

La app móvil consume la URL HTTPS de Render. La ejecución local del backend sirve para desarrollo
y pruebas HTTP; no es la configuración de producción. [Publicar en Render](docs/hosting.md).

## Scripts

| Script                                        | Uso                                              |
| --------------------------------------------- | ------------------------------------------------ |
| `dev`                                         | API en desarrollo con recarga                    |
| `typecheck`, `lint`, `test`                   | Tipos, convenciones y pruebas HTTP/configuración |
| `build`, `start`                              | Compilar a dist y ejecutar el servidor compilado |
| `check`                                       | Tipos + lint + pruebas + compilación             |
| `format`, `format:check`                      | Aplicar/verificar formato                        |
| `db:migrate`, `db:seed`                       | Migraciones y semillas desde TypeScript          |
| `db:migrate:production`, `db:seed:production` | Herramientas compiladas para Render              |

## Estructura

```text
src/
  app.ts, server.ts
  config/, errors/, middlewares/, utils/, types/
  modules/
    health/                   # implementado
    auth/, users/, vehicles/, services/, appointments/
    payments/, reports/, settings/, vehicleTypes/  # próximas etapas
database/
  migrations/, seeds/, migrate.ts, seed.ts, schema.sql
docs/                         # arquitectura, ER, instalación, hosting y contrato
tests/                        # sin dependencia de MySQL para npm test
render.yaml                   # Blueprint gratuito, CA y URI vía panel
```

## Documentación y pruebas

- [Plan completo](docs/plan.md), [arquitectura](docs/architecture.md), [base de datos](docs/database.md).
- [API disponible](API.md), [contrato](docs/openapi.json), Swagger: `/api/docs`.
- [Plan de endpoints de negocio](docs/api-plan.md), [Postman](docs/postman.collection.json).
- [Verificar etapa 1](docs/stage-1.md), [validaciones realizadas](docs/verification.md).
- [Instalación](docs/installation.md), [hosting](docs/hosting.md), [URLs de entrega](docs/delivery.md).

La semilla crea un administrador, nunca lo inicia con una contraseña escrita en SQL.
Los precios son ejemplos ficticios en ARS y se conservan al volver a ejecutar el seed.
