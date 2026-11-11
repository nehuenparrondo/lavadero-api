# MariaDB y tablas en español

El proyecto usa MariaDB 11.8 e InnoDB. El conector `mysql2` habla el protocolo compatible de MariaDB; el esquema y las pruebas se ejecutan contra el motor real, no una simulación. `mysql://` en la conexión describe ese protocolo, no identifica el motor instalado.

## Ubicación y separación

- Servidor: `mysql-nehuenlavadero.alwaysdata.net`, puerto 3306, TLS con certificado verificado.
- `nehuenlavadero_prod`: datos de la web publicada. Usuario exclusivo del backend `nehuenlavadero_app`.
- `nehuenlavadero_dev`: desarrollo y trabajo escolar. Usuario `nehuenlavadero_escuela`, sin acceso a producción.
- `nehuenlavadero_qa`: pruebas automáticas desechables, sin datos reales.
- Render conserva la API y la web original. alwaysdata aloja MariaDB y una copia funcional de la web; el plan gratuito no permite alojar exclusivamente bases.

No guardar credenciales en GitHub ni enviarlas desde Expo. La API recibe la conexión mediante su entorno privado. El equipo de desarrollo usa `.env` ignorado por Git.

## Diccionario

| Tabla                     | Contenido                                               |
| ------------------------- | ------------------------------------------------------- |
| `roles`                   | Cliente, empleado y administrador                       |
| `usuarios`                | Perfil, contraseña cifrada, permisos y baja lógica      |
| `cuentas_sociales`        | Relación del usuario con Google, Discord o GitHub       |
| `sesiones_renovacion`     | Hashes de sesiones, rotación y revocación               |
| `estados_oauth`           | Solicitudes temporales de inicio social y PKCE          |
| `autorizaciones_oauth`    | Códigos temporales de un único uso                      |
| `tipos_vehiculo`          | Auto, SUV, camioneta, moto y categorías administrativas |
| `vehiculos`               | Patente, marca, modelo, color y titular                 |
| `servicios`               | Lavados, encerado y tapizados; duración y estado        |
| `tarifas_servicio`        | Precio por categoría y servicio, en centavos ARS        |
| `estados_turno`           | Estados válidos del trabajo                             |
| `turnos`                  | Reserva confirmada, titular, horario, tipo y asignación |
| `servicios_turno`         | Precio y duración históricos de cada servicio reservado |
| `detalles_vehiculo_turno` | Descripción aportada por el cliente                     |
| `notas_turno`             | Observaciones del equipo con autor                      |
| `historial_estados_turno` | Auditoría de cambios de estado                          |
| `partes_lavado`           | Trabajo realizado, empleado, revisión y correcciones    |
| `mensajes_cliente`        | Reclamos, devoluciones y respuesta administrativa       |
| `asistencia_empleados`    | Fichajes registrados por el administrador               |
| `pagos`                   | Cobros, método y saldo de cada turno                    |
| `configuracion_negocio`   | Moneda, zona, capacidad y anticipación de cancelación   |
| `horarios_atencion`       | Días y horas de atención                                |
| `bloqueos_agenda`         | Serialización de operaciones de agenda                  |
| `migraciones_esquema`     | Versiones SQL y checksums aplicados                     |

Las columnas y el contrato JSON conservan sus nombres para no romper clientes existentes. Las consultas SQL del backend ya usan los nombres españoles.

## Migraciones y conservación de datos

`npm run db:migrate` verifica los archivos históricos sin editarlos. Detecta el motor con `SELECT VERSION()` y adapta únicamente la sintaxis histórica `DROP CHECK` a `DROP CONSTRAINT` y la colación antigua cuando corre en MariaDB. Las restricciones siguen activas.

Las migraciones 013 y 014 renombran las tablas existentes sin copiar ni borrar filas; InnoDB conserva las relaciones. Durante la transición crean vistas compatibles con nombres antiguos para que el proceso anterior de Render pueda terminar sus solicitudes. Esas vistas no son tablas de negocio. La copia final a MariaDB importa únicamente las tablas españolas.

Para cambiar de servidor: respaldar, desplegar código compatible, activar `MAINTENANCE_MODE=true`, esperar que drenen las solicitudes anteriores, obtener una instantánea consistente, importar en una base vacía separada y comprobar hashes de todas las filas y ausencia de referencias huérfanas. Solo entonces cambiar `DATABASE_URL` y volver a `MAINTENANCE_MODE=false`. No ejecutar semillas sobre una copia de producción.

La base anterior de Aiven queda como respaldo. Después del cambio, los datos nuevos se escriben únicamente en MariaDB. Volver a Aiven exige copiar también los cambios posteriores; no basta con cambiar la conexión.

## Gestor SQL

`Abrir-gestor-sql.cmd` abre DBeaver con la base de desarrollo, TLS verificado y la contraseña desde el entorno local. Ejemplo seguro de lectura:

```sql
SELECT t.id, t.starts_at, v.plate, e.code AS estado
FROM turnos t
JOIN estados_turno e ON e.id = t.status_id
LEFT JOIN vehiculos v ON v.id = t.vehicle_id
ORDER BY t.starts_at DESC;
```

Las reglas de reservar, verificar trabajos y cobrar están en los servicios de la API. Las modificaciones manuales por SQL pueden omitir esa auditoría; usar la aplicación para operaciones del negocio.
