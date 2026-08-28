# SPECS.md — MantoApp Impredimex

## Especificaciones funcionales del sistema

Este documento es la **fuente de verdad** del comportamiento de la aplicación. Cualquier cambio futuro debe partir de actualizar primero estas specs y luego implementar el código.

**Versión:** 1.3
**Fecha:** 30 de julio de 2026
**Metodología:** Spec-Driven Development (SDD)

---

## Convenciones del documento

Cada spec sigue esta estructura:

- **Actor** — Quién ejecuta el flujo
- **Precondiciones** — Qué debe cumplirse antes de iniciar
- **Flujo principal** — Pasos exactos del comportamiento esperado
- **Postcondiciones** — Estado del sistema al terminar correctamente
- **Reglas de negocio** — Condiciones especiales y restricciones
- **Flujos alternativos** — Casos de error o rutas opcionales

---

# SPEC-001 — Autenticación de usuario

### Actor
Cualquier persona con acceso a la URL pública de la app.

### Precondiciones
- La app está cargada en el navegador
- Firebase Authentication anónima está activa (uid asignado automáticamente)
- La conexión a Firebase Realtime Database está establecida

### Flujo principal
1. Sistema muestra pantalla de login con dos campos: `# Nómina` y `Contraseña`
2. Usuario ingresa su número de nómina (debe existir en `DB.personal`)
3. Usuario ingresa la contraseña correspondiente a su rol
4. Usuario presiona "ENTRAR"
5. Sistema valida que la nómina exista en el catálogo de personal con estatus "activo"
6. Sistema valida que la contraseña coincida con uno de los 4 roles válidos
7. Sistema asigna el rol según la contraseña ingresada
8. Sistema almacena `currentUser` con: nomina, nombre, puesto, depto, role, turno
9. Sistema invoca `saveFCMToken()` para etiquetar al dispositivo en OneSignal con `nomina`, `role` y `nombre`
10. Sistema navega a la pantalla principal del rol correspondiente

### Postcondiciones
- `currentUser` contiene los datos del usuario autenticado
- El dispositivo está etiquetado en OneSignal con los tags actuales
- Los tags previos (de un usuario anterior en el mismo dispositivo) fueron limpiados
- La UI muestra la vista correspondiente al rol

### Reglas de negocio
- **Contraseñas fijas por rol:**
  - `solicitud` → rol **solicitante**
  - `mantenimiento` → rol **técnico**
  - `administrador` → rol **supervisor**
  - `IMPREDIMEX` → rol **admin**
- Un mismo dispositivo puede cambiar de rol haciendo logout y login con distinta contraseña
- La nómina debe estar registrada en el catálogo de personal y con estatus "activo" para poder ingresar
- No existe sistema de recuperación de contraseña (son fijas por rol)

### Flujos alternativos
- **Nómina no existe o está inactiva:** Sistema muestra mensaje "Usuario no encontrado o inactivo"
- **Contraseña incorrecta:** Sistema muestra mensaje "Contraseña incorrecta"
- **Sin conexión a internet:** Sistema permite el login pero opera en modo offline con datos cacheados; los cambios se sincronizan al recuperar conexión

---

# SPEC-002 — Crear Orden de Trabajo

### Actor
Usuario con rol **solicitante**.

### Precondiciones
- Usuario autenticado como solicitante
- Catálogos cargados: tipos de servicio, naves, máquinas, infraestructura
- Conexión a Firebase activa

### Flujo principal
1. Usuario presiona el botón flotante "+" en la pantalla "Mis solicitudes"
2. Sistema muestra formulario con los campos:
   - **Descripción** (texto libre, obligatorio)
   - **Prioridad** (Normal | Urgente | Máquina parada — obligatorio)
   - **Tipo de servicio** (select dinámico desde catálogo)
   - **Nave** (select dinámico — depende del tipo de servicio seleccionado)
   - **Equipo o área** (select dinámico — depende de la nave)
3. Si el tipo de servicio es **MTTO-SEGURIDAD**, el campo "Equipo" se reemplaza por 4 casillas de tipo de riesgo
4. Usuario llena el formulario y presiona "Crear"
5. Sistema valida que todos los campos obligatorios estén completos
6. Sistema verifica si `DB.ots` está vacío y, si lo está, reinicia `folioSig` a 1
7. Sistema genera un folio incremental con formato `#000001` (6 dígitos con ceros a la izquierda)
8. Sistema incrementa `folioSig` en 1
9. Sistema crea la OT con `status = "abierto"` y los datos del solicitante
10. Sistema escribe la OT en Firebase
11. Sistema dispara notificación push a todos los técnicos del depto MANTENIMIENTO
12. Sistema cierra el formulario y regresa a "Mis solicitudes"
13. La nueva OT aparece en la lista del solicitante y en la lista de técnicos disponibles

### Postcondiciones
- Nueva OT creada con folio único e incremental
- OT visible para el solicitante en "Mis solicitudes"
- OT visible para todos los técnicos en "Mis órdenes" como disponible
- Todos los técnicos activos del depto MANTENIMIENTO recibieron notificación push

### Reglas de negocio
- **No hay límite** de OTs abiertas por solicitante
- **Folio único e incremental:** nunca se reutilizan folios
- **Reinicio de folio:** si todas las OTs son eliminadas, el contador vuelve a 1
- **Folio se mantiene** si solo se eliminan algunas OTs
- Los selects son dependientes: el catálogo de equipos se filtra por nave seleccionada
- El tipo de servicio MTTO-SEGURIDAD tiene comportamiento especial (4 casillas de riesgo en lugar de equipo)

### Flujos alternativos
- **Campos incompletos:** Sistema muestra alerta indicando qué campos faltan
- **Sin conexión:** Sistema permite crear la OT localmente; se sincroniza con Firebase al recuperar conexión

---

# SPEC-003 — Tomar Orden de Trabajo

### Actor
Usuario con rol **técnico**.

### Precondiciones
- Técnico autenticado
- OT existe en `DB.ots` con `status = "abierto"` o `status = "proceso"` (multi-técnico)
- El técnico no ha tomado previamente esta OT

### Flujo principal
1. Técnico ve la OT en su lista de "Mis órdenes" (sección de OTs disponibles)
2. Técnico presiona el botón "Tomar OT"
3. Sistema agrega al técnico actual al array `tecnicos` de la OT
4. Sistema cambia el `status` de la OT a `"proceso"` (si era `"abierto"`)
5. Sistema escribe el cambio en Firebase
6. Sistema dispara notificación push al solicitante con mensaje "Técnico asignado"
7. Sistema muestra al técnico la pantalla de espera de confirmación del solicitante
8. El técnico NO puede iniciar actividades hasta que el solicitante confirme "Técnico en máquina"

### Postcondiciones
- Técnico agregado al array `tecnicos` de la OT
- Status de la OT actualizado a `"proceso"`
- Solicitante notificado vía push
- OT marcada como "En espera de confirmación" para el técnico que la tomó

### Reglas de negocio
- **Múltiples técnicos pueden tomar la misma OT** (multi-técnico)
- Cada técnico que toma la OT necesita su propia confirmación del solicitante por separado
- Un técnico que ya tomó la OT no puede volver a tomarla
- La OT sigue visible en el panel de técnicos disponibles aunque ya tenga uno o más asignados

### Flujos alternativos
- **OT ya cerrada:** Sistema oculta el botón "Tomar OT" y muestra el status actual
- **Técnico ya asignado:** Sistema muestra estado "En proceso" en lugar del botón

---

# SPEC-004 — Confirmar "Técnico en máquina"

### Actor
Usuario con rol **solicitante** (creador de la OT).

### Precondiciones
- OT existe con `status = "proceso"`
- Al menos un técnico ha tomado la OT (array `tecnicos` no vacío)
- El solicitante es el creador de la OT

### Flujo principal
1. Solicitante ve la OT en "Mis solicitudes" con el técnico ya asignado
2. Por cada técnico asignado aparece un botón "Confirmar [Nombre del técnico] en máquina"
3. Solicitante presiona el botón cuando físicamente verifica que el técnico está atendiendo
4. Sistema marca al técnico como confirmado (`confirmado = true` en su entrada del array)
5. Sistema escribe el cambio en Firebase
6. Sistema notifica al técnico que ya puede iniciar actividades
7. El técnico puede ahora acceder a la pantalla de tipo de problema y actividades

### Postcondiciones
- Técnico marcado como confirmado en la OT
- Técnico habilitado para registrar tipo de problema, actividades y refacciones

### Reglas de negocio
- **Cada técnico requiere confirmación independiente** del solicitante
- El solicitante puede confirmar a un técnico sin haber confirmado a otro
- Una vez confirmado, no se puede revertir

---

# SPEC-005 — Registrar actividades y refacciones

### Actor
Usuario con rol **técnico**, previamente confirmado en máquina por el solicitante.

### Precondiciones
- OT con `status = "proceso"`
- Técnico actual está en el array `tecnicos` con `confirmado = true`
- Técnico ha seleccionado un tipo de problema (paso previo)

### Flujo principal
1. Técnico accede a la pantalla de detalles de la OT
2. Sistema muestra dos secciones: **Actividades** y **Refacciones**
3. Técnico puede:
   - Agregar una actividad con descripción y fecha/hora
   - Agregar una refacción con descripción y cantidad
   - Eliminar actividades o refacciones que él mismo agregó
4. Cada cambio se guarda automáticamente en Firebase
5. El solicitante y otros técnicos ven los cambios en tiempo real

### Postcondiciones
- Actividades y refacciones registradas en la OT
- Cambios visibles para todos los usuarios con acceso a la OT

### Reglas de negocio
- **Tipo de problema es inmutable** una vez guardado (solo se puede seleccionar una vez por técnico)
- Las 7 opciones de tipo de problema son: Mecánico, Eléctrico, Neumático, Electrónico, Hidráulico, Parámetros, Infraestructura
- Cada técnico puede agregar sus propias actividades y refacciones
- Un técnico no puede eliminar las actividades/refacciones de otro técnico

---

# SPEC-006 — Concluir Orden de Trabajo

### Actor
Usuario con rol **técnico**, asignado a la OT.

### Precondiciones
- OT con `status = "proceso"`
- Técnico confirmado en máquina
- Tipo de problema seleccionado
- Al menos una actividad registrada

### Flujo principal
1. Técnico presiona el botón "Concluir OT"
2. Sistema muestra modal preguntando: **"¿La falla fue por error operativo?"** (Sí / No)
3. Técnico selecciona la respuesta
4. Sistema marca la OT con:
   - `status = "validar"`
   - `errorOperativo = true | false`
   - `fechaConclusion` (timestamp actual)
5. Sistema escribe el cambio en Firebase
6. Sistema dispara notificación push al solicitante con mensaje "OT concluida — lista para validar"

### Postcondiciones
- OT con status `"validar"` esperando confirmación del solicitante
- Solicitante notificado para validar

### Reglas de negocio
- Si hay múltiples técnicos asignados, cualquiera puede concluir
- El campo `errorOperativo` se usa para alertar al solicitante en la validación

---

# SPEC-007 — Validar cierre de Orden de Trabajo

### Actor
Usuario con rol **solicitante** (creador de la OT).

### Precondiciones
- OT con `status = "validar"`
- Solicitante es el creador

### Flujo principal
1. Solicitante ve la OT en su lista con estado "Por validar"
2. Sistema muestra detalle completo: técnicos, tipo de problema, actividades, refacciones
3. Si `errorOperativo = true`, sistema muestra **alerta visible** indicando que fue reportado como error operativo
4. Solicitante elige una opción:
   - **Validar y cerrar** → cambia `status = "cerrado"`, registra `fechaCierre`
   - **Rechazar** → cambia `status = "abierto"`, limpia el array `tecnicos`, regresa la OT al pool disponible
5. Sistema escribe el cambio en Firebase
6. Si fue rechazada, sistema dispara notificación push a todos los técnicos

### Postcondiciones
- **Si validó:** OT con status `"cerrado"` con timestamp de cierre
- **Si rechazó:** OT regresa al estado `"abierto"` y vuelve a estar disponible para que cualquier técnico la tome; también es visible en el panel de supervisor

### Reglas de negocio
- Cuando se rechaza, **se limpia el array de técnicos** para que la OT esté disponible nuevamente
- La OT rechazada sigue conservando su folio y descripción original
- La alerta de error operativo solo aparece si el técnico marcó `errorOperativo = true`
- Después de cerrar, la OT no puede volver a editarse

---

# SPEC-008 — Suspender OT en espera

### Actor
Usuario con rol **técnico**, asignado a la OT.

### Precondiciones
- OT con `status = "proceso"`
- Técnico confirmado en máquina

### Flujo principal
1. Técnico presiona el botón "Poner en espera"
2. Sistema muestra modal pidiendo motivo de la espera (texto libre)
3. Técnico ingresa motivo y confirma
4. Sistema marca la OT con:
   - `status = "espera"`
   - `motivoEspera` = texto ingresado
   - `fechaEspera` (timestamp)
5. Sistema escribe el cambio en Firebase
6. Sistema dispara notificación push al solicitante con el motivo

### Postcondiciones
- OT con status `"espera"` y motivo registrado
- Solicitante notificado vía push con el motivo

### Reglas de negocio
- La OT en espera puede ser reactivada por el técnico (regresa a `"proceso"`)
- El motivo es obligatorio y queda en el historial de la OT

---

# SPEC-009 — Sistema de notificaciones push

### Actor
Sistema (automático, no requiere acción del usuario).

### Precondiciones
- OneSignal SDK cargado en el navegador
- Service Worker `OneSignalSDKWorker.js` registrado
- Usuario autenticado con tags aplicados (nomina, role, nombre)
- Cloudflare Worker `mantoapp-push` activo

### Flujo principal
1. Sistema detecta un evento que requiere notificar (creación de OT, toma de OT, conclusión, etc.)
2. Sistema construye payload con destinatarios (nóminas) + título + mensaje
3. Sistema invoca la función `notifyPush(toNominas, title, body)`
4. Frontend envía POST al Cloudflare Worker
5. Worker reenvía la petición a OneSignal REST API con la API key oculta
6. OneSignal procesa la petición y entrega la push a los dispositivos suscritos con esos tags

### Postcondiciones
- Notificación entregada a los dispositivos cuyos tags coinciden con las nóminas destinatarias
- Push aparece en el dispositivo aunque la app esté cerrada

### Reglas de negocio
- **Tags de suscripción:** cada dispositivo se etiqueta con `nomina`, `role` y `nombre` al hacer login
- **Limpieza de tags:** al cambiar de usuario o hacer logout, los tags anteriores se eliminan
- **Filtrado por nómina:** las notificaciones se envían a nóminas específicas, no a todos
- **Identificación del solicitante:** las notificaciones dirigidas al solicitante usan el campo `ot.nomina` directamente (guardado al crear la OT), NO se busca por nombre con `getNominaByName()` porque las comparaciones por nombre son frágiles (espacios, mayúsculas, acentos)
- **Re-suscripción forzada:** en cada login, la app llama a `OneSignal.User.PushSubscription.optIn()` para reactivar automáticamente cualquier suscriptor que haya sido marcado como "unsubscribed" en OneSignal Dashboard
- **API key segura:** la REST API Key de OneSignal NUNCA se expone en el frontend; vive solo en Cloudflare Worker
- **Eventos que disparan push:**
  - Nueva OT → a todo el personal activo del depto MANTENIMIENTO (ver SPEC-011)
  - Técnico toma OT → al solicitante
  - OT concluida → al solicitante
  - OT en espera → al solicitante con motivo
  - OT rechazada (cierre rechazado por solicitante) → notificación interna al técnico y supervisor, y push a todo el depto MANTENIMIENTO (ver SPEC-011)

### Flujos alternativos
- **Permiso de notificaciones denegado:** El sistema sigue funcionando pero el usuario no recibe push (solo ve cambios al abrir la app)
- **Worker de Cloudflare caído:** El frontend ignora el error y la app sigue funcionando normalmente
- **OneSignal rechaza la petición:** Error se loguea en consola pero no se muestra al usuario final

---

# SPEC-010 — Gestión de catálogos (Administrador)

### Actor
Usuario con rol **admin**.

### Precondiciones
- Usuario autenticado como admin

### Flujo principal
1. Admin accede al hub principal con módulos: Personal, Tipos de servicio, Naves, Máquinas, Infraestructura, Vistas de otros roles
2. Admin selecciona un catálogo
3. Sistema muestra listado con opción de agregar, editar o eliminar
4. Admin realiza la operación
5. Sistema valida y escribe el cambio en Firebase
6. Todos los usuarios conectados ven el cambio en tiempo real

### Postcondiciones
- Catálogo actualizado en Firebase
- Cambios reflejados inmediatamente en todas las sesiones activas

### Reglas de negocio
- **Catálogo de personal:**
  - Campos: nómina (único), nombre, puesto, depto, role, turno, estatus
  - Eliminar es soft-delete (cambia estatus a "inactivo")
- **Tipos de servicio:** 3 tipos fijos por ahora (MAQ-PROD, INFRAESTRUCTURA, SEGURIDAD)
- **Naves:** 4 naves fijas (A1, A2, B16, B17)
- **Máquinas:** agrupadas por nave; cada nave tiene su catálogo independiente
- **Infraestructura:** agrupadas por nave; cada nave tiene sus áreas
- Las modificaciones de catálogo afectan solo a OTs nuevas (no a OTs ya creadas)

---

# SPEC-011 — Destinatarios de las notificaciones por tipo de servicio

### Actor
Sistema (automático).

### Precondiciones
- Se crea una OT (SPEC-002) o el solicitante rechaza un cierre (SPEC-007)
- El catálogo `DB.personal` está cargado

### Flujo principal
1. El sistema invoca `getNominasByTipoServicio(ot.tipo)`
2. La función retorna **todas las nóminas activas del departamento MANTENIMIENTO**, sin distinguir el tipo de servicio
3. Se invoca `notifyPush()` con esa lista (ver SPEC-009)

### Reglas de negocio
- **Todos los tipos de servicio notifican a todo el departamento:** MTTO-MAQ-PROD, MTTO-INFRAESTRUCTURA y MTTO-SEGURIDAD tienen los mismos destinatarios
- **Filtro por estatus y depto:** solo se notifica a quienes estén `activo` y en depto `MANTENIMIENTO`
- **Aplica a la creación y al rechazo de cierre.** Las notificaciones dirigidas al solicitante (técnico asignado, OT concluida, OT en espera) no se ven afectadas por esta spec

### Historial de esta spec
- **v1.1.0:** se introdujo enrutamiento diferenciado — Infraestructura y Seguridad notificaban solo a Jefe, Auxiliar y Analista de Mantenimiento (filtrado por puesto)
- **v1.3.0:** se desactivó el enrutamiento diferenciado por decisión operativa. Todos los tipos notifican a todo el departamento. La función `getNominasByTipoServicio()` se conserva como punto único de cambio por si se requiere reactivar

---

# SPEC-012 — Fin de turno del técnico (paro de fin de semana)

### Actor
Técnico de mantenimiento.

### Contexto
Entre semana aplica la **regla de relevo continuo**: el técnico no abandona la OT hasta que el técnico del siguiente turno la toma. Por eso el corte de su tiempo es la entrada del relevo y no se necesita registrar salida.

En el paro de fin de semana no hay relevo, así que el técnico necesita cerrar su participación explícitamente para que no se le siga contando el tiempo.

### Precondiciones
- El técnico tiene una participación abierta en la OT (una entrada en `ot.tecnicos` sin `fechaSalida`)
- La fecha/hora actual está dentro de la ventana de paro

### Ventana de disponibilidad
El botón **"Fin de mi turno"** solo se muestra:
- **Sábado** desde las **21:20**
- **Domingo** completo
- **Lunes** hasta las **06:00**

Fuera de esa ventana el botón no aparece, y la función lo revalida por si se invoca de otro modo.

### Flujo principal
1. El técnico abre la OT y pulsa **"Fin de mi turno"**
2. El sistema pide confirmación
3. Se registra `fechaSalida` en su entrada de `ot.tecnicos`
4. Se cierra cualquier periodo de espera abierto (ver SPEC-013)
5. Se agrega comentario en la OT y notificación interna al supervisor

### Postcondiciones
- El tiempo de intervención del técnico deja de correr en ese instante
- **La OT permanece abierta** y disponible para el siguiente turno
- El técnico puede volver a tomarla después (genera una nueva entrada)

### Reglas de negocio
- No cambia el estatus de la OT
- Si el técnico tiene varias participaciones, se cierra la más reciente abierta
- El corte por `fechaSalida` tiene **prioridad** sobre cualquier otro criterio al calcular su tiempo

---

# SPEC-013 — Registro y descuento del tiempo en espera

### Actor
Sistema (automático).

### Motivación
El tiempo que una OT pasa suspendida (falta de refacción, sin tiempo, etc.) no es tiempo de trabajo del técnico y no debe cargársele.

### Flujo principal
1. Al poner la OT en espera (SPEC-008) se agrega un registro a `ot.esperas`:
   `{inicio, fin: null, motivo, tecnico, nomina}`
2. Al reanudar la OT registrando una actividad, se cierra el periodo (`fin`)
3. Al calcular el tiempo de un técnico, se descuentan los segundos de espera que caen dentro de su ventana

### Postcondiciones
- El tiempo de intervención reportado es **neto de esperas**
- El tiempo en espera se reporta en su **propia columna**

### Reglas de negocio
- Se calcula por intersección de rangos: solo se descuenta la parte de la espera que cae dentro de la ventana del técnico
- Una espera abierta (sin `fin`) se considera vigente hasta el corte de esa ventana
- El resultado nunca es negativo
- El "Fin de mi turno" (SPEC-012) también cierra la espera abierta

---

# SPEC-014 — Separación del tiempo de validación del solicitante

### Actor
Sistema (automático).

### Motivación
Antes, el tiempo del último técnico corría hasta que el **solicitante** validaba el cierre, cargándole una espera que no dependía de él.

### Flujo principal
1. El técnico concluye la OT → se guarda `fechaCierreMantenimiento`
2. El solicitante valida → se guarda `fechaCierre`
3. El tiempo de intervención del último técnico corta en `fechaCierreMantenimiento`
4. La diferencia entre ambos se reporta como **tiempo de validación del solicitante**

### Postcondiciones
- El técnico ya no absorbe la espera de validación
- Se obtiene un indicador de qué tan rápido validan los solicitantes

### Reglas de negocio
- La columna de validación solo se llena en la fila del **último técnico**
- Si no existe `fechaCierreMantenimiento`, se usa la última actividad con avance 100% (retrocompatibilidad)
- El tiempo total de la orden **sigue midiendo** de `fechaAlta` a `fechaCierre`

---

# Anexo A — Modelo de datos en Firebase

```
manto_db/
├── ots/                  (array de Órdenes de Trabajo)
│   └── [n]/
│       ├── folio: "#000001"
│       ├── desc: "descripción"
│       ├── tipoServicio: "MAQUINARIA"
│       ├── nave: "A1"
│       ├── equipo: "FL1"
│       ├── prioridad: "Normal"
│       ├── solicitante: {nomina, nombre}
│       ├── tecnicos: [{nomina, nombre, confirmado, fechaToma}]
│       ├── tipoProblema: "Mecánico"
│       ├── actividades: [...]
│       ├── refacciones: [...]
│       ├── status: "abierto" | "proceso" | "espera" | "validar" | "cerrado"
│       ├── errorOperativo: bool
│       ├── motivoEspera: "string"
│       ├── fechaCreacion, fechaConclusion, fechaCierre: timestamps
│
├── folioSig: 1           (contador de folio, reinicia a 1 si ots está vacío)
│
├── personal/             (catálogo de personas)
│   └── [n]/ {nomina, nombre, puesto, depto, role, turno, estatus}
│
├── tiposServicio/        (3 tipos)
├── naves/                (4 naves)
├── maquinas/             (48 máquinas)
└── infraestructura/      (53 áreas)
```

---

# Anexo B — Estados de una OT

```
        ┌─────────┐
        │ abierto │ ◄─────────────────┐
        └────┬────┘                   │
             │ técnico toma           │ solicitante rechaza
             ▼                        │
        ┌─────────┐                   │
        │ proceso │ ◄──────┐          │
        └────┬────┘        │          │
             │             │ reactivar│
   ┌─────────┴─────────┐   │          │
   │                   │   │          │
   ▼                   ▼   │          │
┌──────┐         ┌────────┴┐          │
│espera│         │ validar │──────────┘
└──────┘         └────┬────┘
   │                  │ solicitante valida
   └─► proceso        ▼
                 ┌─────────┐
                 │ cerrado │ (estado final)
                 └─────────┘
```

---

# Cambios a implementar (pendientes detectados)

Estos son ajustes al código actual para alinearlo con las specs:

| # | Pendiente | Spec relacionada |
|---|---|---|
| 1 | Implementar reinicio de `folioSig` cuando `ots` está vacío | SPEC-002 |
| 2 | Verificar que rechazar cierre limpia array de técnicos | SPEC-007 |
| 3 | Documentar oficialmente el flujo multi-técnico en el código | SPEC-003 |

---

*Documento actualizado el 30 de julio de 2026 — versión 1.3 (actualiza SPEC-011).*
*A partir de aquí, cualquier cambio a la app debe iniciar actualizando este documento.*
