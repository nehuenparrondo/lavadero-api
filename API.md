# API disponible — v0.1.0

Backend independiente; rutas de negocio se versionarán bajo `/api/v1`.
Contrato [OpenAPI](docs/openapi.json), Swagger en **GET /api/docs/**.
En etapa 1 **todas las rutas siguientes son públicas**, sin parámetros ni body.

| Método | Ruta              | Roles   | Respuesta                                                                                       |
| ------ | ----------------- | ------- | ----------------------------------------------------------------------------------------------- |
| GET    | /health           | Público | 200 `{ "status":"ok", "service":"lavadero-api", "version":"0.1.0" }`                            |
| GET    | /ready            | Público | 200 `{ "status":"ready", "database":"up" }` o 503 `{ "status":"not_ready", "database":"down" }` |
| GET    | /api/v1           | Público | 200 `{ "version":"v1", "stage":1 }`                                                             |
| GET    | /api/openapi.json | Público | 200 documento OpenAPI                                                                           |
| GET    | /api/docs/        | Público | 200 interfaz Swagger HTML                                                                       |

Ejemplo contra el dominio real de Render:

```http
GET /health HTTP/1.1
Host: DOMINIO-REAL.onrender.com
Accept: application/json
```

Errores uniformes: `{ "error": { "code":"NOT_FOUND", "message":"No se encontró el recurso." } }`.
400 JSON inválido, 403 origen web ajeno a CORS, 404 ruta inexistente y 500 error interno.
No hay credenciales de prueba ni endpoints de login/CRUD activos. Esas rutas devuelven 404.
[Diseño de permisos y endpoints futuros](docs/api-plan.md).
