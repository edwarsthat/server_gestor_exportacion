# Middleware de Auditoría con Soporte para Transacciones MongoDB

## Cambios Realizados

Se han actualizado los middlewares de auditoría en `auditPLug.js` para que soporten **sesiones de MongoDB** y **transacciones**. Esto asegura que:

1. ✅ Las operaciones de auditoría se ejecutan dentro de la misma transacción que las operaciones principales
2. ✅ Si la operación principal falla, la auditoría también se revierte (atomicidad)
3. ✅ No se crean registros de auditoría huérfanos
4. ✅ Mantiene la consistencia de datos en operaciones complejas

## Características Implementadas

### 1. Función `writeLog` con Soporte de Sesión
```javascript
const writeLog = async (entry, session = null) => {
    if (session) {
        await AuditLogs.create([entry], { session });
    } else {
        await AuditLogs.create(entry);
    }
}
```

### 2. Función `getAuditCtx` Actualizada
Ahora extrae automáticamente la sesión de las opciones de la query o de `$locals`:
```javascript
const getAuditCtx = (ctx) => {
    const q = typeof ctx.getOptions === "function" ? ctx.getOptions() : {};
    const auditData = (q && q.$audit) || (ctx.$locals && ctx.$locals.$audit) || {};
    const session = q?.session || ctx.$locals?.session || null;
    return { ...auditData, session };
};
```

### 3. Middlewares Actualizados

Todos los middlewares ahora soportan sesiones:
- ✅ **save** (create/update)
- ✅ **findOneAndUpdate**
- ✅ **updateOne/updateMany**
- ✅ **deleteOne**
- ✅ **deleteMany**
- ✅ **insertMany**

## Cómo Usar

### Operaciones de Nivel de Documento (save, deleteOne)

Pasar la sesión a través de `$locals`:

```javascript
const session = await mongoose.startSession();
session.startTransaction();

try {
    const doc = new Model(data);
    doc.$locals = {
        $audit: {
            user: userId,
            action: 'crear-usuario',
            description: 'Creación de nuevo usuario',
            session // ← Pasar sesión aquí
        }
    };
    
    await doc.save({ session }); // ← También pasar a save
    await session.commitTransaction();
} catch (error) {
    await session.abortTransaction();
    throw error;
} finally {
    session.endSession();
}
```

### Operaciones de Nivel de Query (findOneAndUpdate, updateMany, etc.)

Pasar la sesión en las opciones:

```javascript
const session = await mongoose.startSession();
session.startTransaction();

try {
    await Model.findOneAndUpdate(
        { _id: id },
        { $set: updates },
        {
            new: true,
            session, // ← Sesión aquí
            user: userId,
            action: 'actualizar-perfil',
            description: 'Actualización de perfil de usuario'
        }
    );
    
    await session.commitTransaction();
} catch (error) {
    await session.abortTransaction();
    throw error;
} finally {
    session.endSession();
}
```

### Transacciones Complejas con Múltiples Operaciones

```javascript
const session = await mongoose.startSession();
session.startTransaction();

try {
    // Operación 1
    const user = new User(userData);
    user.$locals = {
        $audit: { user: adminId, action: 'crear-usuario', session }
    };
    await user.save({ session });

    // Operación 2
    await Profile.findOneAndUpdate(
        { userId: user._id },
        { $set: profileData },
        { session, user: adminId, action: 'crear-perfil' }
    );

    // Operación 3
    await AuditLog.create([{
        type: 'user-creation',
        userId: user._id
    }], { session });

    await session.commitTransaction();
} catch (error) {
    await session.abortTransaction();
    throw error;
} finally {
    session.endSession();
}
```

## Compatibilidad hacia Atrás

✅ **Los middlewares siguen funcionando sin sesiones**. Si no pasas una sesión, las operaciones de auditoría se ejecutan normalmente sin transacción:

```javascript
// Esto sigue funcionando como antes
const doc = new Model(data);
doc.$locals = {
    $audit: {
        user: userId,
        action: 'crear-registro'
    }
};
await doc.save();
```

## Requisitos

1. **MongoDB debe estar configurado como Replica Set** para que las transacciones funcionen
2. **MongoDB versión 4.0 o superior**
3. **Mongoose versión 5.2 o superior**

## Verificar si tu MongoDB soporta transacciones

```javascript
const session = await mongoose.startSession();
if (session.constructor.name === 'ClientSession') {
    console.log('✅ Las transacciones están disponibles');
} else {
    console.log('❌ Las transacciones NO están disponibles');
}
session.endSession();
```

## Ejemplos Completos

Consulta el archivo `ejemplo-uso-transacciones.js` para ver ejemplos completos de uso con cada tipo de operación.

## Ventajas

1. **Atomicidad**: Si falla la operación principal, la auditoría no se guarda
2. **Consistencia**: Los datos principales y de auditoría siempre están sincronizados
3. **Aislamiento**: Las transacciones no interfieren entre sí
4. **Durabilidad**: Una vez confirmada la transacción, todos los cambios persisten

## Notas Importantes

- 🔴 **SIEMPRE** cerrar la sesión con `session.endSession()` en el bloque `finally`
- 🔴 **SIEMPRE** hacer `abortTransaction()` en el bloque `catch` antes de relanzar el error
- 🟡 Las transacciones tienen un timeout (por defecto 60 segundos)
- 🟡 Las transacciones consumen más recursos que operaciones individuales
- 🟢 Usa transacciones solo cuando necesites atomicidad entre múltiples operaciones
