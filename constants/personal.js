export const CARNET_ENUMS = {
  type: {
    TEMP: { value: 'temp', label: 'Temporal', color: '#FFA500' },
    FINAL: { value: 'final', label: 'Final', color: '#4CAF50' }
  },
  status: {
    STOCK: { value: 'stock', label: 'En Stock', color: '#9E9E9E' },
    ACTIVE: { value: 'active', label: 'Activo', color: '#4CAF50' },
    REVOKED: { value: 'revoked', label: 'Revocado', color: '#F44336' },
    LOST: { value: 'lost', label: 'Perdido', color: '#FF9800' },
    EXPIRED: { value: 'expired', label: 'Expirado', color: '#795548' }
  }
};
// Helpers para obtener solo los valores (útil para validación)
export const CARNET_TYPES = Object.values(CARNET_ENUMS.type).map(t => t.value);
export const CARNET_STATUSES = Object.values(CARNET_ENUMS.status).map(s => s.value);

export const TIPOS_IDENTIFICACION_ENUMS = {
  tipo: {
    CEDULA: { value: 'cedula', label: 'Cédula' },
    PASAPORTE: { value: 'pasaporte', label: 'Pasaporte' },
    CEDULA_EXTRANJERA: { value: 'cedula_extranjera', label: 'Cédula Extranjera' }
  }
}