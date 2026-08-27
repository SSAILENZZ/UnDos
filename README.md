# UnDos

Plataforma de gestión académica para el Liceo Tecnológico Montemaria.

## Funciones actuales

- Inicio de sesión real por RUT y contraseña.
- Roles de estudiante, profesor y administrador.
- Administración de usuarios, cursos, asignaturas y asignaciones docentes.
- Inscripción de estudiantes por año académico.
- Creación de evaluaciones por profesor, con fecha, semestre, estado y ponderación.
- Registro de notas chilenas entre 2.0 y 7.0.
- Cálculo de promedios semestrales, anuales y general.
- Historial separado por año académico.
- PostgreSQL persistente como base de datos.

## Variables de entorno

- `DATABASE_URL`
- `JWT_SECRET`
- `NODE_ENV=production`

Opcionalmente se pueden usar `BOOTSTRAP_ADMIN_RUT`, `BOOTSTRAP_ADMIN_PASSWORD` y `BOOTSTRAP_ADMIN_NAME`. Si no se usan, la primera apertura permite crear el administrador inicial de forma segura mientras todavía no exista ninguno.
