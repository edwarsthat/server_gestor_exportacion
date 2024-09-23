# Instrucciones de Instalación del Servidor

Este documento proporciona los pasos necesarios para instalar y configurar el servidor.

## Requisitos previos

- Sistema operativo Ubuntu (preferiblemente Ubuntu 22.04 Jammy Jellyfish)
- Acceso de superusuario (sudo)

## Pasos de instalación

### 1. Descargar e instalar Node.js

```bash
sudo apt-get update
sudo apt-get upgrade
sudo apt-get install curl
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
. ~/.bashrc
nvm --version
nvm install 20
nvm use 20
node -v
npm -v
```

### 2. Instalar MongoDB

```bash
cat /etc/lsb-release
sudo apt-get install gnupg curl
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg \
--dearmor
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
```

### 3. Instalar Redis

Instala Redis versión 7.4 o superior. (Los pasos específicos no fueron proporcionados)

### 4. Inicializar el inventario

Ejecuta el script `InicializarInventario` que se encuentra en la carpeta `scripts`. Esto creará los archivos JSON necesarios.

**Nota importante**: Algunos archivos necesitan ser modificados manualmente:
- Cajas sin pallet: `[]`
- inventariodescarte: `[]`
- ordenVaceo: `[]`
- Dentro de seriales, agregar: `{"idCelifrut":38,"enf":1241}`

### 5. Configurar el archivo .env

Crea un archivo `.env` en la raíz del proyecto con el siguiente contenido:

```
# HOST
HOST = "La direccion ip"

# Celifrut app port
PORT = "El puerto del servidor"
MONGO_PORT = "EL puerto donde esta el servicio de mongo"

# direccion mongoDB se debe cambiar el puerto por el puerto de mongo
MONGODB_PROCESO = "mongodb://localhost:27017/proceso"
MONGODB_SISTEMA = "mongodb://localhost:27017/sistema"

# acces token
ACCES_TOKEN = 65fa5383a192707f19c3d50fad26604d24f8fce15725caa8c2c3390385cc5004f45910d9e08b624a5fd41c107880bc19b0182a504e7943d158bee8b9f400320b
REFRESH_TOKEN = e57d4ca7be0fb32467ca36ff851978fe5e64d9c1aea3154783bb08ec8dd56f442f2d891e2dbbff8aa2cfc5f7e7fbd9b7172992f06d6d2a02231ff8c36e645e07

# salt
SALT_ROUNDS = 10

# Salt AES_SECRET = 0ae245e2d7a589914b9725e714a2a8fb9149096f173dc0e9cddd7530a6cfa6ad
```

### 6. Modificar la configuración de MongoDB

En el archivo `DB/mongoDB/config/init.js`, modifica la función `startMongoDB`. Ajusta el `exec` con el puerto correspondiente.

### 7. Iniciar el servidor

Ejecuta el servidor con:

```bash
node index.js
```

Se recomienda usar una librería como pm2 para gestionar el proceso del servidor.

## Notas adicionales

- Asegúrate de tener todos los permisos necesarios antes de ejecutar los comandos.
- Verifica que todas las dependencias estén correctamente instaladas antes de iniciar el servidor.
- Para cualquier problema durante la instalación, consulta la documentación oficial de cada tecnología o contacta al equipo de soporte.
