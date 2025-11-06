#!/bin/bash
set -e

echo "🔥 Iniciando Replica Set de MongoDB (rs0)..."

# rutas de configuración
CONF0="/etc/mongod-rs0-0.conf"
CONF1="/etc/mongod-rs0-1.conf"
CONF2="/etc/mongod-rs0-2.conf"

# elimina sockets viejos
sudo rm -f /tmp/mongodb-27017.sock /tmp/mongodb-27018.sock /tmp/mongodb-27019.sock 2>/dev/null || true

# verifica que no haya mongod vivos
if pgrep -x "mongod" > /dev/null; then
  echo "⚠️  mongod ya está corriendo, deténlo primero si quieres reiniciar."
  pgrep -fl mongod
  exit 1
fi

# arranca los tres nodos
echo "🟢 Nodo 0 (PRIMARY)"
mongod -f "$CONF0" & sleep 3

echo "🟢 Nodo 1"
mongod -f "$CONF1" & sleep 3

echo "🟢 Nodo 2"
mongod -f "$CONF2" & sleep 3

# espera a que los tres estén arriba
sleep 5

# inicializa replica set si aún no existe
mongosh --port 27017 --quiet --eval '
try {
  if (rs.status().ok !== 1) {
    print("Inicializando replica set...");
    rs.initiate({
      _id: "rs0",
      members: [
        { _id: 0, host: "127.0.0.1:27017", priority: 2 },
        { _id: 1, host: "127.0.0.1:27018", priority: 1 },
        { _id: 2, host: "127.0.0.1:27019", priority: 0 }
      ]
    });
  } else {
    print("Replica set ya inicializado.");
  }
} catch(e) { print(e); }
'

echo "✅ MongoDB rs0 iniciado correctamente."
