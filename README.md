# Servidor de Gestión de Empaque y Exportación

**Autor:** Edwar Stheven Ariza Torres

> **Aviso Legal y Licencia**
>
> Este software es propiedad intelectual de Edwar Stheven Ariza Torres y se desarrolla para uso exclusivo de la empresa **Celifrut**. Todos los derechos de explotación, uso y distribución corresponden únicamente a Celifrut, pero el derecho de autor intelectual permanece en cabeza del desarrollador original.
>
> Queda prohibida la copia, distribución o uso fuera de la empresa sin autorización expresa y por escrito del autor y de Celifrut.

Este proyecto es un servidor Node.js para la gestión de procesos de empaque, exportación y control de inventarios en una planta de frutas. Permite manejar lotes, contenedores, pallets, calidad, descartes y reportes, integrando diferentes módulos y servicios.

## Características principales
- Gestión de lotes y contenedores
- Control de pallets y cajas
- Registro de calidad y descartes
- Reportes y auditoría de cambios
- Integración con base de datos MongoDB y Redis

## Estructura del proyecto

```
server/
├── api/           # Lógica principal de la API y procesos
├── archive/       # Archivos históricos y registros
├── auth/          # Autenticación de usuarios
├── Class/         # Clases de negocio (Lotes, Contenedores, etc.)
├── constants/     # Archivos JSON de constantes y catálogos
├── controllers/   # Controladores y validaciones
├── DB/            # Conexión y utilidades de base de datos
├── events/        # Eventos y notificaciones internas
├── functions/     # Funciones auxiliares
├── inventory/     # Archivos de inventario y datos estáticos
├── mobile/        # Lógica específica para dispositivos móviles
├── public/        # Archivos públicos y recursos web
├── scripts/       # Scripts de mantenimiento y migración
├── services/      # Servicios auxiliares y lógica compartida
├── validations/   # Validaciones de datos y reglas de negocio
├── index.js       # Punto de entrada del servidor
├── package.json   # Dependencias y scripts de npm
└── README.md      # Documentación principal
```

## Instalación
1. Clona el repositorio o copia la carpeta `server/`.
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Configura las variables de entorno en un archivo `.env` en la raíz del proyecto.

## Ejecución
Para iniciar el servidor:
```bash
npm start
```

## Documentación del código
- El código fuente está documentado con comentarios y JSDoc en los archivos principales.
- Puedes generar documentación automática usando herramientas como [jsdoc](https://jsdoc.app/).

## Contribución
1. Haz un fork o crea una rama.
2. Realiza tus cambios y documenta el código nuevo.
3. Haz un pull request.

## Contacto
Para soporte o dudas, contacta al desarrollador principal.

## Agradecimientos

Este proyecto utiliza y agradece a las siguientes librerías y tecnologías de código abierto:

- [Express](https://expressjs.com/) para la creación del servidor web y API REST.
- [Mongoose](https://mongoosejs.com/) para la gestión de la base de datos MongoDB.
- [Redis](https://redis.io/) y [node-redis](https://github.com/redis/node-redis) para almacenamiento en caché y comunicación entre procesos.
- [Socket.io](https://socket.io/) para comunicación en tiempo real.
- [ExcelJS](https://github.com/exceljs/exceljs) para la generación y manipulación de archivos Excel.
- [dotenv](https://github.com/motdotla/dotenv) para la gestión de variables de entorno.
- [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) para autenticación basada en tokens JWT.
- [bcrypt](https://github.com/kelektiv/node.bcrypt.js) para el cifrado de contraseñas.
- [multer](https://github.com/expressjs/multer) para la gestión de archivos subidos.
- [date-fns](https://date-fns.org/) y [date-fns-tz](https://github.com/marnusw/date-fns-tz) para manejo de fechas y zonas horarias.
- [nodemailer](https://nodemailer.com/) para el envío de correos electrónicos.
- [chalk](https://github.com/chalk/chalk) para mejorar la salida de logs en consola.
- [js-yaml](https://github.com/nodeca/js-yaml) para el manejo de archivos YAML.
- [zod](https://zod.dev/) para validaciones de datos.

Y a todas las demás librerías de la comunidad Node.js.

---
*Este README es solo un punto de partida. Completa y adapta según las necesidades de tu proyecto.*