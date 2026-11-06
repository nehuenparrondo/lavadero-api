# Asistencia

El administrador registra la primera llegada observada del empleado. `attendance.routes.ts` protege los endpoints por rol, `attendance.service.ts` usa la fecha del negocio y valida al empleado, y `attendance.repository.ts` guarda la hora UTC de la primera llegada. La asistencia histórica se conserva aunque cambie el rol de la persona.
