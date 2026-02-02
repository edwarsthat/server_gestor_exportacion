# Servidor de Gestion de Empaque y Exportacion

**Autor:** Edwar Stheven Ariza Torres
**Version:** 3.0

> **Aviso Legal y Licencia**
>
> Este software es propiedad intelectual de Edwar Stheven Ariza Torres y se desarrolla para uso exclusivo de la empresa **Celifrut**. Todos los derechos de explotacion, uso y distribucion corresponden unicamente a Celifrut, pero el derecho de autor intelectual permanece en cabeza del desarrollador original.
>
> Queda prohibida la copia, distribucion o uso fuera de la empresa sin autorizacion expresa y por escrito del autor y de Celifrut.

Sistema backend para la gestion integral de operaciones de empaque, procesamiento y exportacion de frutas. Cubre desde el ingreso de fruta de proveedores, procesamiento, control de calidad, inventario, desverdizado, empaque en contenedores, hasta el despacho y exportacion final. Incluye modulos de recursos humanos, contabilidad, indicadores operativos y transporte.

---

## Stack tecnologico

| Tecnologia | Version | Proposito |
|-----------|---------|-----------|
| Node.js | ES Modules | Runtime |
| Express | 5.1.0 | Framework HTTP |
| Socket.io | 4.8.1 | Comunicacion en tiempo real |
| Mongoose | 8.16.0 | ODM para MongoDB |
| MongoDB | 3 instancias (Replica Set) | Base de datos principal |
| Redis | 5.5.6 | Cache y datos volatiles |
| Zod | 3.25.67 | Validacion de entrada |
| JWT | 9.0.2 | Autenticacion |
| bcrypt | 6.0.0 | Hashing de passwords |
| Helmet | 8.1.0 | Headers de seguridad |
| gRPC | - | Integracion con servicio Rust |
| Jest | 30.0.2 | Testing |
| ESLint | 9.29.0 | Linting y seguridad de codigo |

---

## Modulos funcionales

| Modulo | Descripcion |
|--------|-------------|
| **Inventarios** | Inventario de fruta sin procesar, descartes (por area y tipo), canastillas, cuartos frios, orden de vaceo, desverdizado |
| **Proceso** | Flujo de procesamiento de fruta, vaciado, calculo de deshidratacion y rendimiento |
| **Comercial** | Precios, clientes nacionales e internacionales, facturacion |
| **Calidad** | Control de plagas, higiene personal, limpieza diaria/mensual, clasificacion, calidad interna |
| **Transporte** | Logistica de vehiculos, precintos, registro de salidas de exportacion |
| **Indicadores** | KPIs operativos, eficiencia, metricas de rendimiento |
| **Talento Humano** | Personal, cargos, carnets, dotaciones |
| **Contabilidad** | Informes financieros, informes de maquila |
| **Sistema** | Configuracion, actualizaciones de app de escritorio, gestion de cuentas |
| **SP32** | Cumplimiento de normativas de exportacion |

---

## Arquitectura

```
[Cliente Desktop / Web / Mobile]
            |
            v
[Express HTTP + Socket.io WebSocket]
            |
            v
[Middleware: Auth JWT, Rate Limiting, Helmet, CORS, Validacion Zod]
            |
            v
[Routes Layer]
    ├── HTTP  (server/routes/https/)
    └── Socket (server/routes/sockets/)
            |
            v
[Controller / API Layer] (server/api/)
            |
            v
[Service Layer] (server/services/)
            |
            v
[Repository / Class Layer] (server/Class/)
    └── BaseRepository (CRUD generico con soporte de transacciones)
            |
            v
[Data Layer]
    ├── MongoDB proceso   (datos operativos)
    ├── MongoDB sistema   (usuarios, roles, logs)
    ├── MongoDB catalogos (proveedores, precios, clientes)
    └── Redis             (cache de inventario desverdizado)
```

### Bases de datos

| Base de datos | Proposito |
|--------------|-----------|
| `proceso` | Lotes, inventarios, formularios de calidad, contenedores, logs operativos |
| `sistema` | Usuarios, cargos/roles, seriales, constantes del sistema |
| `catalogos` | Proveedores, precios, clientes, tipos de fruta, descartes |

Las 3 bases de datos corren en Replica Set para soporte de transacciones ACID multi-documento.

---

## Estructura del proyecto

```
server_gestor_exportacion/
├── index.js                    # Punto de entrada del servidor
├── package.json                # Dependencias y scripts
├── jest.config.js              # Configuracion de testing
├── eslint.config.mjs           # Linting y seguridad
│
├── src/
│   ├── app/app.mjs             # Configuracion de Express y middleware
│   ├── config/index.js         # Variables de entorno
│   ├── middleware/              # Error handler
│   ├── sockets/ws.js           # Configuracion de Socket.io
│   └── cron/                   # Tareas programadas
│
├── DB/
│   ├── mongoDB/
│   │   ├── config/init.js      # Inicializacion de conexiones y modelos
│   │   └── schemas/            # 66 schemas de Mongoose
│   └── redis/init.js           # Cliente Redis
│
├── server/
│   ├── api/                    # Controllers (logica de negocio por dominio)
│   │   ├── inventarios/        # Inventario de descartes, fruta sin procesar, orden de vaceo
│   │   ├── talentoHumano/      # Personal, cargos, carnets
│   │   ├── Calidad.js          # Control de calidad
│   │   ├── Comercial.js        # Operaciones comerciales
│   │   ├── Proceso.mjs         # Flujo de procesamiento
│   │   ├── Transporte.js       # Logistica
│   │   └── ...
│   │
│   ├── services/               # Logica de negocio compleja y operaciones multi-repositorio
│   │   ├── inventarios.js      # Servicio principal de inventarios
│   │   ├── proceso.js          # Servicio de procesamiento
│   │   ├── crearDocumentos.js  # Generacion de PDF/Excel
│   │   └── helpers/            # FileService, utilidades
│   │
│   ├── Class/                  # Repositorios de acceso a datos
│   │   ├── base/BaseRepository.js  # Clase base con CRUD generico
│   │   ├── Inventarios.js      # Repositorio de inventarios
│   │   ├── Lotes.js            # Repositorio de lotes
│   │   ├── RedisData.js        # Operaciones Redis
│   │   └── ...                 # 23+ repositorios
│   │
│   ├── validations/            # Schemas Zod por dominio
│   ├── routes/
│   │   ├── https/              # Rutas HTTP por dominio
│   │   └── sockets/            # Handlers de Socket.io por dominio
│   │
│   ├── auth/users.js           # Autenticacion JWT y permisos RBAC
│   ├── archive/                # Records historicos con versionado optimista
│   ├── cache/                  # Cache en memoria (tipos de fruta, descartes)
│   ├── store/                  # Catalogos de referencia
│   ├── helper/                 # Helpers (lotes, inventario)
│   ├── templates/              # Plantillas de documentos y correos
│   └── events/eventos.js       # EventEmitter para broadcast en tiempo real
│
├── Error/                      # Clases de error personalizadas
│   ├── ConnectionErrors.js     # Errores de DB, Redis, AWS
│   ├── ValidationErrors.js     # Errores de autenticacion/acceso
│   └── logicLayerError.js      # Errores de logica por dominio
│
├── tests/                      # Tests unitarios y de integracion
│   ├── helpers/                # MongoDB en memoria para tests
│   └── ...                     # 26 archivos de test
│
├── config/                     # Scripts de inicio de MongoDB
├── constants/                  # Constantes y enums del sistema
├── scripts/                    # Scripts de mantenimiento y migracion
├── public/                     # Archivos estaticos
└── uploads/                    # Archivos subidos
```

---

## Seguridad

- **Autenticacion JWT** con tokens de 8h de expiracion (HTTP y Socket.io)
- **RBAC granular**: 70+ permisos generales + permisos especificos por cargo
- **bcrypt** para hashing de passwords (10 salt rounds)
- **Validacion Zod** en todos los endpoints con sanitizacion contra inyeccion NoSQL
- **Rate Limiting**: 50 req/min para estaticos, 15 intentos/15min para login
- **Helmet** para headers de seguridad HTTP
- **Bloqueo de extensiones sospechosas** (.php, .asp, .env, wp-admin, etc.)
- **Encriptacion AES-256-GCM** para archivos sensibles
- **Proteccion contra Path Traversal** con doble validacion de rutas
- **ESLint** con plugins de seguridad (eslint-plugin-security, eslint-plugin-no-secrets)

---

## Instalacion

### Requisitos previos
- Node.js (ES Modules)
- MongoDB (configurado en Replica Set)
- Redis
- pnpm

### Pasos

1. Instala las dependencias:
   ```bash
   pnpm install
   ```

2. Configura las variables de entorno en un archivo `.env` en la raiz del proyecto (ver `src/config/index.js` para la lista completa de variables).

3. Inicia MongoDB en Replica Set:
   ```bash
   npm run mongo:start
   ```

### Ejecucion

```bash
# Produccion
npm start

# Desarrollo (con --watch)
npm run dev
```

### Testing

```bash
# Ejecutar tests
npm test

# Tests en modo watch
npm run test:watch

# Cobertura
npm run test:coverage
```

### Linting

```bash
npm run lint
```

---

## Agradecimientos

Este proyecto utiliza las siguientes librerias y tecnologias de codigo abierto:

- [Express](https://expressjs.com/) - Framework web
- [Mongoose](https://mongoosejs.com/) - ODM para MongoDB
- [Redis](https://redis.io/) / [node-redis](https://github.com/redis/node-redis) - Cache
- [Socket.io](https://socket.io/) - Comunicacion en tiempo real
- [Zod](https://zod.dev/) - Validacion de datos
- [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) - Autenticacion JWT
- [bcrypt](https://github.com/kelektiv/node.bcrypt.js) - Cifrado de passwords
- [ExcelJS](https://github.com/exceljs/exceljs) - Generacion de archivos Excel
- [PDFKit](https://pdfkit.org/) - Generacion de documentos PDF
- [Puppeteer](https://pptr.dev/) - Renderizado HTML a imagen/PDF
- [Helmet](https://helmetjs.github.io/) - Headers de seguridad
- [multer](https://github.com/expressjs/multer) - Gestion de archivos
- [date-fns](https://date-fns.org/) - Manejo de fechas
- [nodemailer](https://nodemailer.com/) - Envio de correos
- [node-cron](https://github.com/node-cron/node-cron) - Tareas programadas
- [Jest](https://jestjs.io/) - Framework de testing
- [ESLint](https://eslint.org/) - Linting de codigo
