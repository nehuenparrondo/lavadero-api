# Salud y disponibilidad

health.routes define rutas públicas; controller adapta las respuestas; repository verifica
MySQL sin escribir. `/health` no implica base disponible, `/ready` sí la comprueba.
La dependencia de readiness se inyecta en createApp para probar escenarios de falla sin MySQL.
