# Instalación y configuración — API

1. Instalar Node 24 LTS y Git. Clonar el repositorio backend y abrir su raíz.
2. Ejecutar `npm ci` y copiar `.env.example` a `.env`.
3. Crear base de desarrollo Aiven y completar URI, TLS y CA como indica [hosting](hosting.md).
4. Configurar email y contraseña segura del administrador semilla. No hay credenciales por defecto.
5. Ejecutar `npm run db:migrate` y `npm run db:seed`. Repetir debe conservar datos y claves existentes.
6. Ejecutar `npm run check` y `npm run format:check`.
7. Ejecutar `npm run dev`. Para compilado, `npm run build` y `npm start`.
8. Probar las rutas de [API.md](../API.md) y la colección Postman con la URL del entorno.
9. Publicar en Render en etapa 2, con variables y base de producción diferentes.

## Sin base configurada

Para probar únicamente los checks HTTP en limpio: `npm ci` y `npm run check`, sin `.env`.
`npm test` inyecta la verificación de base y no requiere credenciales.
Al ejecutar el servidor sin DATABASE_URL, `/health` responde 200 y `/ready` 503; esto no acredita
que MySQL esté funcionando. Producción rechaza configuración sin MySQL/TLS.

## SQL manual

Para revisar/importar `database/schema.sql` puede usarse MySQL Workbench conectado con TLS.
Crear previamente una base vacía y seleccionarla. El archivo no borra ni crea la base del proveedor.
Para despliegues normales usar migraciones, no mezclar importación manual con registro de migraciones.
El catálogo SQL no crea una contraseña administrativa: ejecutar el seed TypeScript para bcrypt.

## Entornos

Desarrollo: base lavadero_dev y credenciales de dev. Producción: lavadero_prod y credenciales prod.
Los scripts leen el entorno del proceso; `.env` solo facilita desarrollo. No subir `.env` a GitHub.
No usar NODE_TLS_REJECT_UNAUTHORIZED=0 ni ssl.rejectUnauthorized=false para conectar Aiven.
