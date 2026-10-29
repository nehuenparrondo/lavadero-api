# Hosting y despliegue temprano

Revisión de documentación oficial: **29/10/2026**. Importes en USD, no ARS.
Decisión del usuario: **Render Free para API + Aiven MySQL Free para base de datos**.

| Opción                       | Costo y límites verificados                                                                                                                                                                                                                                     | Adecuación                                                                                |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **Render Free + Aiven Free** | API y MySQL con planes de USD 0. Render suspende la API tras 15 minutos sin tráfico y puede tardar alrededor de un minuto al reactivar. Aiven Free tiene 1 GB RAM, 1 GB disco, un nodo y backups, sin vencimiento fijo; puede apagar servicios por inactividad. | Elegida para la evaluación. Dos paneles y TLS externo, sin administrar un servidor MySQL. |
| Railway                      | Hobby tiene mínimo USD 5/mes, que incluye USD 5 de uso; excedentes por consumo. API y MySQL se despliegan juntos, revisar responsabilidades de operación y backup.                                                                                              | Sencilla, pero no elegida por preferencia del usuario.                                    |
| Fly.io                       | Precio por máquinas, volúmenes y transferencia. Requiere presupuestar también MySQL o usar Aiven externo.                                                                                                                                                       | Más control operativo, mayor configuración para este proyecto.                            |

Fuentes: [Render Free](https://render.com/docs/free), [Aiven Free](https://aiven.io/docs/products/mysql/concepts/mysql-free-tier),
[Aiven precios/trial](https://aiven.io/pricing/mysql), [Railway](https://railway.com/pricing),
[Fly](https://fly.io/pricing/), [MySQL en Render](https://render.com/docs/deploy-mysql).

**Free y trial son distintos.** Aiven ofrece Free sin plazo fijo y pruebas de planes pagos
de 30 días. Para conservar el proyecto académico, elegir explícitamente Free cuando esté disponible;
si se elige trial, registrar su vencimiento y migrar/bajar de plan antes de perder disponibilidad.
Verificar precios, elegibilidad, retención y restauración de backups en el panel antes de crear recursos.

## Etapa 2 — pasos en Aiven

1. Crear cuenta y servicio **MySQL Free**, confirmar versión 8.4 compatible y estado Running.
2. Crear `lavadero_dev` y `lavadero_prod` en la sección Databases, con credenciales separadas.
   Un único servidor Free puede alojar ambas bases si la cuenta lo permite; eso no es aislamiento
   de infraestructura. No usar producción para pruebas destructivas.
3. Descargar el **CA Certificate**. No desactivar su verificación para resolver errores de TLS.
4. Copiar host y puerto reales: Aiven no necesariamente usa 3306.
5. Usar un usuario de aplicación y otro de migraciones con permisos limitados cuando el plan
   permita administrarlos. El arranque Free necesita DDL para migrar: revisar este compromiso
   y separar el comando de migración del usuario de ejecución al pasar a un plan superior.
6. Guardar URI en el entorno de cada proyecto/servicio. No publicarla ni enviarla a Expo.

Para convertir el CA en base64 en PowerShell (no es un secreto, pero no se versiona):

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes((Resolve-Path .\ca.pem)))
```

Colocar el resultado en `DATABASE_CA_BASE64`; `DATABASE_TLS=true`. El pool usa CA y verifica
identidad del servidor. [Referencia TLS de Aiven](https://aiven.io/docs/platform/concepts/tls-ssl-certificates).

## Etapa 2 — pasos en Render

1. Publicar **solo lavadero-api** en su propio repositorio GitHub.
2. Crear un Blueprint desde `render.yaml`, revisar que el plan diga **Free**.
3. Completar `DATABASE_URL` (base prod) y `DATABASE_CA_BASE64` en el panel; no en Git.
4. Build: `npm ci && npm run build`. Start: `npm run db:migrate:production && npm start`.
   Free no ofrece pre-deploy command: por eso la migración corre al arrancar y usa lock.
5. Health check `/ready` valida MySQL; `/health` verifica solo proceso.
6. Obtener dominio HTTPS y comprobar `/health`, `/ready`, `/api/docs` y `/api/openapi.json`.
7. Activar despliegue automático desde `main`, con checks previos de GitHub.
8. Registrar las URLs reales en `docs/delivery.md` de ambos repositorios.

Para la semilla inicial, desde un entorno con acceso a Aiven prod y variables SEED_ADMIN:
`npm run build`, `npm run db:migrate:production`, `npm run db:seed:production`.
El seed no se ejecuta en cada arranque ni se agrega al start command. Quitar su contraseña del
panel cuando ya no sea necesaria. No depende de que Free tenga una consola shell disponible.
Tras sembrar, verificar en MySQL Workbench con TLS que hay un administrador activo y catálogos.

## Conectar la app

Configurar `EXPO_PUBLIC_API_URL` con el origen HTTPS obtenido de Render. Una app nativa no necesita
un origen en CORS; si se publica una web, agregar su origen exacto a CORS_ORIGINS. Nunca usar `*`
como sustituto de permisos. En EAS crear la misma variable en development/preview/production,
con valores separados; cambiarla exige reconstruir el bundle/APK o publicar un Update compatible.

## Antes de la evaluación

Revisar que Aiven esté encendido y que trial no haya vencido; abrir `/health` y luego `/ready`
unos minutos antes. Si Render está dormido, esperar arranque y repetir. No confundir timeout
del móvil con credenciales incorrectas. Comprobar backup/restauración, límite de espacio,
cuota Render y conectividad. No prometer disponibilidad continua en los planes gratuitos.

OAuth requiere consolas de Google/Discord/GitHub, callback HTTPS y scheme móvil de build propio.
Usar clientes separados por entorno. Expo Go no sirve para validar OAuth con scheme personalizado.
[Guía Expo](https://docs.expo.dev/guides/authentication/).
