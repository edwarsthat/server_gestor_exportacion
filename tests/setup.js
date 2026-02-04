// Configurar variables de entorno para tests ANTES de cargar módulos
// ENCRYPTION_KEY debe ser 64 caracteres hex (32 bytes para AES-256)
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';

console.log('🧪 Iniciando pruebas unitarias del servidor...');
console.log('📁 Configurando ambiente de pruebas...\n');