# Configuración y defensa del flujo OAuth

La app usa AuthSession + PKCE S256. Solo el backend conoce los secretos. Configurar
PUBLIC_API_URL=https://lavadero-api-48m4.onrender.com y estos callbacks exactos:

| Proveedor | Callback HTTPS                                                            | Scopes               |
| --------- | ------------------------------------------------------------------------- | -------------------- |
| Google    | https://lavadero-api-48m4.onrender.com/api/v1/auth/oauth/google/callback  | openid email profile |
| Discord   | https://lavadero-api-48m4.onrender.com/api/v1/auth/oauth/discord/callback | identify email       |
| GitHub    | https://lavadero-api-48m4.onrender.com/api/v1/auth/oauth/github/callback  | read:user user:email |

Google Cloud → Google Auth Platform: configurar marca/audiencia/usuarios de prueba si
está en Testing; crear cliente Web Application con callback anterior y conservar
GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET solo en Render. No hace falta facturación para
estas APIs de identidad. No habilitar servicios pagos ni ampliar scopes sin necesidad.
Para público general revisar verificación/publicación de Google y políticas vigentes.

Discord Developer Portal → aplicación Lavadero → OAuth2: añadir callback y guardar
DISCORD_CLIENT_ID/DISCORD_CLIENT_SECRET en Render. No requiere bot ni permisos de servidor.
GitHub Settings → Developer settings → OAuth Apps → Lavadero: callback anterior,
sin comodines y sin device flow. GITHUB_CLIENT_ID/GITHUB_CLIENT_SECRET van en Render.

Allowlist del retorno final: OAUTH_REDIRECT_URIS=lavadero://oauth,https://lavadero-app-2558.onrender.com/oauth.
Agregar solo direcciones bajo control del proyecto. El backend exige email verificado,
asocia la identidad social o crea un Cliente. Cuenta desactivada nunca vuelve a entrar.
Las cuentas con el mismo email verificado se vinculan; explicar esta política al usuario.

El state del proveedor vence a los 10 minutos y se consume una vez. El grant móvil vence
a los 60 segundos, necesita el verifier y también es de un solo uso. Los refresh/access
propios jamás aparecen en el deep link. Cancelar autorización devuelve access_denied.

Consultar delivery.md para distinguir proveedores configurados de pruebas automatizadas
con respuestas simuladas. Una respuesta enabled=true solo acredita presencia de variables,
no que el usuario haya completado el consentimiento del proveedor.
