# auth

Registro, login, JWT, refresh rotativo, logout revocable y OAuth. Los refresh y códigos efímeros se persisten como hash. Email social debe ser verificado por proveedor. Client secrets solo en entorno de API.

Rutas → middlewares → controller → service → repository. Validaciones en schema y contratos en types.
Consultá [API.md](../../../API.md) para métodos, permisos, ejemplos y errores.
