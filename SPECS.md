# SPECS.md — MantoApp Impredimex

## Especificaciones funcionales del sistema

Este documento es la **fuente de verdad** del comportamiento de la aplicación. Cualquier cambio futuro debe partir de actualizar primero estas specs y luego implementar el código.

**Versión:** 3.6
**Fecha:** 13 de agosto de 2026
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

# SPEC-015 — Tipos de problema según el tipo de servicio

### Actor
Técnico de mantenimiento (al seleccionar el tipo de problema, Paso 2).

### Precondiciones
- La OT fue tomada y el solicitante confirmó la presencia del técnico
- La OT aún no tiene `tipoProblema` definido

### Flujo principal
1. El sistema invoca `getTipoFallas(ot.tipo)`
2. Se pintan como chips únicamente las opciones correspondientes al tipo de servicio de la OT
3. El técnico selecciona una y confirma

### Catálogos por tipo de servicio

**MTTO-MAQ-PROD** (7 opciones)
Mecánico · Eléctrico · Neumático · Electrónico · Hidráulico · Parámetros · Infraestructura

**MTTO-INFRAESTRUCTURA** (8 opciones)
Eléctrico · Hidráulico · Mobiliario · Pintura · Edificios · Fontanería · Alarmas · Otros

**MTTO-SEGURIDAD** (9 opciones)
Mecánico · Eléctrico · Neumático · Electrónico · Hidráulico · Guardas · Infraestructura · Riesgo de incendio · Riesgo de caídas

### Postcondiciones
- `ot.tipoProblema` guarda el texto seleccionado
- El valor sigue siendo **inmutable** una vez guardado (SPEC-003)

### Reglas de negocio
- Si el tipo de servicio no coincide con ninguno de los tres, se usa el catálogo de MTTO-MAQ-PROD como respaldo
- No hay validación contra el catálogo al guardar: se almacena el texto del chip seleccionado
- **Retrocompatibilidad:** las OT antiguas conservan y muestran su `tipoProblema` original aunque ese valor ya no exista en el catálogo de su tipo, porque la vista de solo lectura muestra el texto guardado
- El catálogo se define en la función `getTipoFallas()`, punto único de cambio

---

# SPEC-016 — Módulo de Turnos (rol de turnos del personal)

### Actor
Supervisor / Jefe de Mantenimiento (contraseña `administrador`).

### Ubicación
Pestaña **"Turnos"** en la barra inferior del supervisor, entre **Técnicos** y **Alertas**.

### Precondiciones
- Existe personal activo en el departamento MANTENIMIENTO

### Flujo principal
1. El supervisor entra a **Turnos** y ve la lista de roles existentes
2. Pulsa **"+ Nuevo rol de turnos"**
3. Captura nombre, periodo (semanal / quincenal / mensual) y fecha de inicio
4. El sistema genera la cuadrícula: una fila por persona activa de Mantenimiento, una columna por día del periodo
5. Asigna un turno por celda desde el catálogo
6. Guarda el rol

### Catálogo de turnos

| Clave | Horario |
|---|---|
| `T1`  | 06:00 – 14:00 |
| `T2`  | 14:00 – 21:30 |
| `T3`  | 21:30 – 06:00 |
| `D12` | 06:00 – 18:00 |
| `N12` | 18:00 – 06:00 |
| `G8`  | 08:00 – 18:00 |
| `LIB` | Horario libre (el supervisor captura entrada y salida manualmente) |

Una celda **vacía** significa descanso / sin turno asignado.

### Periodos

| Periodo | Días |
|---|---|
| Semanal | 7 |
| Quincenal | 14 |
| Mensual | Los días naturales del mes de la fecha de inicio (28–31) |

Los días se generan a partir de la fecha de inicio y pueden cruzar de mes.

### Postcondiciones
- El rol se guarda en `DB.turnos` y se sincroniza a Firebase
- El rol puede consultarse, editarse, exportarse a Excel o eliminarse

### Copiar y pegar turnos
Para agilizar la captura cuando una persona repite el mismo horario:

1. En una celda con turno asignado, pulsar **Copiar**
2. Aparece una barra indicando qué turno está copiado
3. El turno puede pegarse:
   - En una celda concreta, con **Pegar**
   - En **todos los días del periodo** de esa persona, con **Pegar fila** (pide confirmación)
4. **Cancelar** vacía el portapapeles

Cada fila tiene además **Limpiar fila**, que borra todos los turnos de esa persona en el periodo.

El portapapeles guarda una **copia independiente** de la asignación, incluidas las horas del turno libre, de modo que modificar la celda origen no afecta a las pegadas.

### Reglas de negocio
- Se listan **todas las personas activas** del depto MANTENIMIENTO, sin importar su rol en la app
- El portapapeles vive solo durante la sesión de edición; no se guarda en la base de datos
- El nombre del rol y la fecha de inicio son **obligatorios** al guardar
- Al elegir `LIB` se piden las horas de entrada y salida, validadas en formato **HH:MM** (24 h)
- Cambiar el periodo o la fecha de inicio **regenera la cuadrícula** conservando las asignaciones de las fechas que sigan dentro del rango
- Los domingos se resaltan en el encabezado
- La exportación a Excel genera una hoja con una fila por persona y una columna por día

### Notas de integración
- Este módulo es **informativo y de planeación**: no modifica el campo `turno` del catálogo de personal ni la función `turnoActual()`, que sigue derivando el turno de la hora del sistema al tomar una OT
- Si en el futuro se desea que el rol determine el turno registrado en las OT, el punto de integración sería `turnoActual()`

---

# SPEC-017 — Módulo Preventivo (programa mensual de mantenimiento)

### Actor
Supervisor / Jefe de Mantenimiento (contraseña `administrador`).

### Ubicación
Pestaña **"Preventivo"** en la barra inferior del supervisor, entre **Turnos** y **Alertas**.

### Documento que reproduce
Formato controlado **F20-PR-MA-01, Rev. C** — "Programa mensual de mantenimiento preventivo".
Creado: 02/12/2016. Actualizado: 03/09/2026.

El documento se presenta **sin colores de fondo ni texto de color**, en blanco y negro, como el formato impreso. Los tres renglones del recuadro de control (Código, Creado y Actualizado) se construyen con una tabla anidada para que midan **exactamente la misma altura**.

Las columnas de los siete días tienen **el mismo ancho** entre sí, fijado con `table-layout:fixed` y un `colgroup` explícito. Las firmas del pie se alinean con el ancho del calendario, repartidas en cuatro columnas iguales.

### Flujo principal
1. El supervisor entra a **Preventivo** y ve la lista de programas capturados
2. Pulsa **"+ Nuevo programa mensual"**
3. Selecciona **mes** y **año** en las listas desplegables del encabezado
4. El sistema construye la cuadrícula del mes y **numera los días automáticamente**
5. Asigna una máquina por cada día y turno desde las listas desplegables
6. Guarda el programa

### Estructura de la cuadrícula
- Columnas: **TURNO** + los siete días (Lunes a Domingo), cada uno con dos subcolumnas: **máquina** y **número de día**
- Cada semana ocupa **tres filas**, una por turno (1, 2 y 3)
- El número de día se calcula del mes y año seleccionados, y ocupa las tres filas de turno de ese día
- Las semanas arrancan en **lunes**; las posiciones fuera del mes quedan vacías
- El número de semanas se ajusta al mes: **4, 5 o 6** según corresponda

### Celdas y su contenido

| Celda | Contenido |
|---|---|
| Mes | Lista desplegable con los doce meses |
| Año | Lista desplegable, del año actual −3 al +3 |
| Máquina | Lista desplegable con las máquinas **activas** del catálogo |
| Número de día | Calculado automáticamente; no editable |
| Código, Creado, Actualizado | Fijos del formato; no editables |

### Exportación a PDF
El botón **Exportar a PDF** abre una ventana de impresión con el documento ya formateado y sin controles de captura: las listas desplegables se sustituyen por el **nombre de la máquina en texto**.

La hoja se configura con `@page{size: letter landscape}`, es decir **carta horizontal**, con márgenes de 8 mm. El usuario elige *Guardar como PDF* en el diálogo del navegador.

Si el navegador bloquea la ventana emergente, se avisa al usuario para que la permita.

### Presentación en pantalla
- El calendario y los botones comparten un contenedor del **80 % del ancho**, centrado, de modo que ambos quedan alineados
- La tabla usa anchos en **porcentaje** (3.22 % la columna de turno y el número de día, 10.606 % la de máquina), por lo que se expande al contenedor conservando columnas idénticas
- Se conserva un ancho mínimo de 900 px con desplazamiento horizontal en pantallas chicas

### Postcondiciones
- El programa se guarda en `DB.preventivos` y se sincroniza a Firebase
- Puede consultarse, editarse, exportarse a PDF o eliminarse

### Reglas de negocio
- Las asignaciones se guardan por **fecha ISO y turno**, de modo que cambiar de mes o año no arrastra datos de otro periodo
- Solo se listan máquinas con `activo: true`
- Al guardar, si ya existe un programa del mismo mes y año, se pide confirmación
- El pie del documento reproduce las cuatro firmas del formato: Planeación, Jefe de producción, Gerente de operaciones y Jefe de Mantenimiento
- Código, revisión y fecha de creación son **fijos**; no se editan desde la app

---

# SPEC-018 — Sincronización granular con Firebase

### Actor
Sistema (automático).

### Problema que resuelve
La app escribía con `set(DB)` sobre `manto_db` y escuchaba con un único `on('value')` sobre la misma ruta. En consecuencia, **cada cambio escribía la base completa y se la reenviaba entera a todos los usuarios conectados**.

Marcar una actividad enviaba los 120 empleados, las 48 máquinas, las 53 áreas y todo el histórico de OT a cada dispositivo con la app abierta. El costo crecía en dos direcciones a la vez: la base engordaba con cada OT, y ese peso se multiplicaba por cada cambio y por cada usuario. En un escenario de 15 OT diarias con 15 usuarios, el tráfico superaba los 20 GB el primer mes, contra un límite gratuito de 10 GB.

### Escritura granular
`saveDB()` conserva su firma, de modo que ningún punto de llamada cambió. Internamente ahora:

1. Mantiene `_snap`, un mapa de ruta a JSON de lo último sincronizado
2. Al guardar, compara y arma un **update multi-ruta** con lo que realmente cambió
3. Escribe OTs y notificaciones **elemento por elemento** (`manto_db/ots/<id>`)
4. Escribe los catálogos completos, pero solo cuando cambian
5. Si nada cambió, no escribe

### Lectura granular
- Un listener `on('value')` **por cada catálogo**, en vez de uno sobre toda la base. Modificar una OT ya no vuelve a descargar personal, máquinas, infraestructura, turnos ni programas preventivos
- OTs y notificaciones usan **eventos por elemento**: `child_added`, `child_changed` y `child_removed`. Solo viaja el registro que cambió
- El re-render se agrupa con un retardo de 120 ms para no repintar por cada evento

### Formato de almacenamiento
OTs y notificaciones pasan de guardarse como arreglo (claves `0`, `1`, `2`…) a estar **indexadas por su `id`**, que es lo que permite escribir y recibir por elemento. En memoria se siguen manejando como arreglos, así que el resto del código no cambió.

La migración es **automática y única**: al detectar claves numéricas, la app reescribe la colección indexada por id.

### Unicidad de identificadores
Los ids de notificación se generaban con `Date.now()` y en varios puntos se crean dos seguidas, que podían colisionar en el mismo milisegundo. Antes esto era inocuo; al escribir por clave habría causado sobrescritura. `_asegurarIds()` garantiza unicidad antes de cada escritura.

### Archivado de OT antiguas
Desde **Perfil** del supervisor, la opción *Archivar OT cerradas antiguas* mueve las OT cerradas con más de N meses (3 por omisión) a `manto_db_archivo/ots/<id>`.

Las OT archivadas se conservan en Firebase pero dejan de cargarse en la app, lo que evita que la colección viva crezca sin límite.

### Resultados medidos

| Operación | Antes | Después |
|---|---|---|
| Cambiar una OT | 158 KB | 436 bytes |
| Nueva notificación | 158 KB | 85 bytes |
| Guardar sin cambios | 158 KB | no escribe |

Proyección con 15 OT diarias y 15 usuarios: de **126 GB al mes a 1.4 GB**, y con el archivado el consumo deja de crecer a partir del tercer mes.

---

# SPEC-019 — Reorganización del perfil de supervisor

### Actor
Supervisor / Jefe de Mantenimiento (contraseña `administrador`).

### Módulos retirados
- **Alertas:** eliminado por no aportar información distinta a la que ya muestran las tarjetas de estado y el propio listado de OT
- **Panel:** eliminado como pestaña independiente; sus cuatro tarjetas se integraron al encabezado del módulo de OT

La barra inferior queda con cinco pestañas: **OT · Técnicos · Turnos · Preventivo · Perfil**. El módulo de OT es ahora la pantalla inicial del supervisor.

### Orden de la pantalla de OT
De arriba hacia abajo: **tarjetas de estado → filtros → listado**. Las cuatro tarjetas (Abiertas, En proceso, En espera, Por validar) encabezan la pantalla y se recalculan en cada render. El bloque de filtros vive dentro del área desplazable, debajo de las tarjetas.

### Filtros del listado de OT
Se agregaron dos filtros y un botón de aplicación:

| Filtro | Comportamiento |
|---|---|
| **Mes** | Se arma con los meses que tienen órdenes registradas, del más reciente al más antiguo |
| **Técnico** | Lista el personal activo de Mantenimiento; coincide si el técnico **participó** en la OT, no solo si fue el primero |

**Regla de visualización:** el listado **no muestra ninguna orden** hasta que se pulsa *Aplicar filtros*, ni siquiera al entrar al módulo. Si no se seleccionó ningún criterio, el botón muestra **todas** las órdenes.

`initSupervisor()` deja el estado en "sin aplicar", y el re-render disparado por datos nuevos respeta ese estado: si el supervisor ya aplicó filtros, la lista se refresca; si no, sigue mostrando la invitación.

El botón *Limpiar* vacía los filtros y devuelve la pantalla al estado inicial. Los chips de estado (Todas, Nuevas, Proceso…) cuentan como aplicación explícita.

### Ranking de técnicos
En el módulo de Técnicos se retiró la gráfica *OT activas por persona* y se sustituyó por un **ranking comparativo**:

| Columna | Definición |
|---|---|
| Tomadas | OT en las que el técnico participó |
| Cerradas | De las anteriores, las que llegaron a estado cerrado |
| T. respuesta | Promedio desde la creación de la OT hasta que la tomó (solo cuando fue el primero) |
| T. intervención | Promedio del tiempo neto trabajado, descontando esperas (SPEC-012, SPEC-013, SPEC-014) |

El criterio de ordenamiento es seleccionable. En cantidades, más es mejor; en tiempos, menos es mejor. Los tres primeros se marcan con medalla.

### Histórico de roles de turnos
`DB.turnos` conserva **solo el último mes**. Al abrir el módulo de Turnos se eliminan los roles cuyo periodo terminó hace más de 30 días. Esto acota el crecimiento de la colección y es coherente con SPEC-018.

### Nota técnica
`diffSecs2()` estaba definida dentro de `exportarExcelOTs()` y se elevó a **ámbito global**, ya que el ranking la necesita para calcular los tiempos.

---

# SPEC-020 — Aviso de técnicos ocupados al levantar una OT

### Actor
Solicitante (al crear una orden de trabajo).

### Motivación
El solicitante creaba su OT sin saber si había alguien disponible para atenderla. Si los técnicos del turno ya estaban trabajando en otra orden, la suya quedaba en espera sin explicación.

### Flujo principal
1. El solicitante crea la OT (SPEC-002)
2. El sistema determina **qué técnicos están en turno** en ese momento, según el rol de turnos (SPEC-016)
3. Para cada uno revisa si tiene una **OT activa asignada**
4. Si **al menos uno está libre**, la OT se confirma con el mensaje normal
5. Si **todos están ocupados**, se muestra una ventana emergente con la situación de cada técnico

### Contenido de la ventana emergente
Por cada técnico ocupado:

| Dato | Origen |
|---|---|
| Nombre y puesto | Catálogo de personal |
| OT que atiende | Folio de la orden activa |
| Ubicación | Nave y equipo de esa orden |
| Etapa de intervención | Calculada según el avance de la orden |

### Etapas de intervención

| Condición | Etapa mostrada |
|---|---|
| OT suspendida | *Suspendida en espera — <motivo>* |
| Sin confirmación del solicitante | *Asignado, en camino a la máquina* |
| Confirmado, sin tipo de problema | *En máquina, diagnosticando la falla* |
| Con tipo de problema | *Trabajando — <tipo> (avance N%)* |

### Cómo se determina quién está en turno
Se consulta el rol de turnos (`DB.turnos`) buscando la asignación de cada persona para la fecha actual, y se compara la hora del sistema con el rango del turno asignado.

**Roles traslapados:** cuando varios roles cubren la misma fecha, gana el **más reciente**, determinado por su fecha de última modificación y, en empate, por su fecha de inicio. La pantalla de Turnos avisa cuando detecta roles traslapados, para que el supervisor elimine los que ya no use.

El catálogo de turnos incluye `ini` y `fin` en minutos desde medianoche. Cuando `fin <= ini`, el turno **cruza la medianoche** (T3 y N12); en ese caso también se revisa la asignación del **día anterior**, de modo que a las 02:00 se reconoce al técnico que entró a las 21:30 del día previo.

Para el turno libre (`LIB`) se usan las horas capturadas manualmente.

### Comparación de nombres
El catálogo de personal guarda los nombres en **mayúsculas**, pero al iniciar sesión la app los convierte a **formato título** (`toTitleCase`), y ese es el valor que queda registrado en `ot.tecnicos`. Por eso toda comparación de nombres se hace con `_mismoNombre()`, que normaliza mayúsculas, acentos y espacios. Una comparación exacta nunca coincidiría.

### Reglas de negocio
- Solo se considera personal **activo** del departamento MANTENIMIENTO
- Un técnico cuenta como **ocupado** si tiene una OT en estado `proceso` o `espera` en la que participa y de la que no ha registrado salida (SPEC-012)
- Si **no hay rol de turnos** que cubra la fecha, no se puede determinar quién está en turno y **no se muestra el aviso**. La función depende de mantener el rol actualizado
- Con un solo técnico en turno y ocupado, el aviso se muestra igualmente
- El aviso **no bloquea** la creación: la OT ya quedó registrada y el mensaje lo confirma

---

# SPEC-021 — Pausar una orden para atender otra

### Actor
Técnico de mantenimiento.

### Motivación
Por urgencia o prioridad, un técnico a veces debe dejar la orden que atiende e ir a otra máquina. Antes no había forma de registrarlo, así que se perdía la trazabilidad y su tiempo seguía corriendo en la orden abandonada.

### Regla principal
**La pausa solo es posible tomando otra orden.** No se puede pausar sin más: el sistema exige elegir la orden que se va a atender, de modo que siempre quede claro a dónde fue el técnico.

### Acceso
Un **botón flotante** con el signo `=`, del mismo estilo y color que el de crear orden, aparece en la lista del técnico **desde que toma una orden** y desaparece cuando ya no tiene ninguna en curso.

### Flujo principal
1. El técnico pulsa el botón flotante
2. Se abre una ventana que indica qué orden va a pausar y lista las **órdenes disponibles**, con las urgentes primero
3. El técnico elige una y confirma
4. El sistema pausa la actual y toma la nueva en una sola operación

### Qué se registra al pausar

| Dato | Efecto |
|---|---|
| `fechaSalida` del técnico | Su tiempo en esa orden **deja de contar** (SPEC-012) |
| Estado `espera` + motivo | La orden queda en espera indicando a qué OT se fue el técnico |
| Registro en `esperas` | El tiempo de pausa se **descuenta** del tiempo de intervención (SPEC-013) |
| Registro en `pausas` | Trazabilidad: quién pausó, cuándo y hacia qué orden |
| Comentario en la OT | Queda visible en el historial de la orden |
| Notificación al supervisor | Aviso interno de la pausa |
| Push al solicitante | Se le informa que su orden quedó en espera |

### Reglas de negocio
- Solo se ofrecen órdenes en estado `abierto`; las urgentes y de máquina parada aparecen primero
- Si otro técnico toma la orden destino entre la apertura de la ventana y la confirmación, se avisa y se vuelve a mostrar la lista actualizada
- Si no hay órdenes disponibles, no se puede pausar y así se indica
- La orden pausada **conserva su técnico** en el historial y puede reanudarse registrando una actividad (SPEC-008)
- Un técnico puede encadenar pausas: cada una queda registrada por separado

---

# SPEC-022 — La orden pausada no se abandona

### Motivación
Pausar una orden no debe convertirse en abandonarla. Estas reglas garantizan que alguien la retome.

### Restricción al técnico que pausó
Mientras exista una orden que él pausó y que **nadie esté atendiendo**, el técnico **no puede tomar órdenes nuevas**. Solo puede:

- **Retomar la pausada**, o
- Esperar a que **otro técnico la tome**, lo que lo libera automáticamente

Al intentar tomar otra orden se le indica cuál tiene pendiente. En su listado aparece además un recordatorio permanente con el folio.

La toma que acompaña a la pausa sí está permitida: es el destino que justificó dejar la anterior.

### Reingreso a la propia orden
Cuando el técnico vuelve a la orden que dejó, se registra una **nueva entrada** en `ot.tecnicos` con la hora de reingreso, en lugar de reabrir la anterior, de modo que el historial refleja los dos tramos. Al retomarla se **cierra el periodo de espera**, y el tiempo de la pausa queda descontado.

La validación que impide registrarse dos veces en el mismo turno **no aplica al reingreso**, ya que se trata de una vuelta legítima.

### Prioridad para los demás técnicos
Las órdenes pausadas que quedaron sin atención se muestran a **cualquier otro técnico** en una sección propia, **antes** de las disponibles, encabezada como *Prioridad — órdenes pausadas sin atender*, con la explicación de que un compañero las dejó por una urgencia.

Al técnico que la pausó no se le ofrece en esa sección, porque para él aparece como orden propia.

### Reglas de negocio
- Una orden se considera **sin atender** cuando está en `espera`, tiene registro de pausa y ningún técnico activo (todos con salida registrada)
- En cuanto alguien la toma deja de ser prioritaria y libera al técnico original
- La restricción se evalúa por la **última pausa** registrada en la orden

---

# SPEC-023 — Estado real de una OT ya tomada, visible a los demás técnicos

### Problema que resuelve
En la lista de "Disponibles para tomar", toda OT en estado `abierto` o `proceso` que el técnico aún no hubiera registrado en su turno mostraba el mismo badge **"Sin tomar"**, aunque ya tuviera un técnico trabajando en ella. Un segundo técnico no podía distinguir, de un vistazo, si la orden estaba realmente libre o si solo se le invitaba a sumarse.

En el detalle, el mensaje de invitación decía siempre *"relevaste al turno anterior"*, asumiendo que cualquier segundo técnico llegaba por cambio de turno. Eso es falso cuando dos técnicos comparten el mismo turno y uno se suma para ayudar al otro.

### Cambios en la tarjeta de lista (`otCardTec`)

| Situación | Antes | Ahora |
|---|---|---|
| OT en `abierto`, sin técnico | Badge "Sin tomar" | Badge "Sin tomar" (sin cambio) |
| OT en `proceso`, con técnico | Badge "Sin tomar" | Badge **"En proceso"** (mismo estilo que en el resto de la app) + **nombre del técnico** a la izquierda del badge, en el encabezado |

Además, el cuerpo de la tarjeta agrega una fila **"Técnico:"** con el nombre de quien ya la tomó, cuando aplica.

### Corrección del mensaje al abrir el detalle
Se compara el turno guardado en la última entrada de `ot.tecnicos` contra `turnoActual()`:

- **Turnos distintos** → *"OT en proceso — relevo de turno"*, con el nombre del técnico anterior y su turno.
- **Mismo turno** → *"OT en proceso — mismo turno"*, indicando que el técnico ya está atendiendo la orden en el turno actual y que el nuevo puede sumarse a ayudar.
- **Sin técnico previo** → *"OT sin atender"*, sin cambios.

### Reglas de negocio
- La comparación de turno usa el texto guardado al tomar la orden (`turno: turnoActual()`), no una nueva consulta al rol de turnos
- Estos cambios son de presentación: no alteran el flujo de toma, unión ni los tiempos de intervención

---

# SPEC-024 — Persistencia de sesión y encabezado simplificado

### Actor
Todos los roles (solicitante, técnico, supervisor, admin).

### Motivación
`currentUser` vivía solo en memoria. Al presionar F5 o recargar la página, la variable volvía a `null` y la app regresaba a la pantalla de login, obligando a capturar nómina y contraseña de nuevo.

### Persistencia de sesión
- Al iniciar sesión (`doLogin()`), `currentUser` se guarda también en **`sessionStorage`** bajo la clave `mantoSession`
- Al cargar la página, `restoreSession()` se ejecuta antes de `initFirebase()`: si hay una sesión guardada, restaura `currentUser`, carga el cache local de la base (`mantoDB`, en `localStorage`) para tener datos con qué renderizar de inmediato, y navega directo a la pantalla del rol correspondiente — sin pasar por login
- Los listeners de Firebase actualizan la información en cuanto conectan, igual que en cualquier sesión iniciada de cero
- Al cerrar sesión (`logout()`), se borra la clave `mantoSession` de `sessionStorage`

### Por qué sessionStorage y no localStorage (SPEC-026)
La sesión usa deliberadamente `sessionStorage`, exclusivo de **cada pestaña o ventana**, y no `localStorage`, que se comparte entre **todas** las ventanas del mismo navegador.

En pruebas con dos personas usando dos ventanas del mismo Chrome (una como solicitante, otra como técnico), guardar la sesión en `localStorage` provocaba que la sesión de quien iniciaba sesión después sobrescribiera la del otro: al refrescar la primera ventana, aparecía el usuario equivocado.

El cache de datos (`mantoDB`) sí sigue en `localStorage` a propósito, porque no es específico de un usuario — es una copia de la información compartida de Firebase, útil de compartir entre ventanas para renderizar más rápido.

### Encabezado
- Se retiró el ícono de campana del encabezado de **solicitante** y **técnico**. El acceso a notificaciones se mantiene igual desde las pestañas inferiores **Avisos** / **Historial**, que ahora llaman directamente a `renderNotifsSol()` / `renderNotifsTec()` al pulsarse (antes ese renderizado dependía de pasar por la campana, que era el único punto que lo invocaba)
- Se agregó un botón circular pequeño y discreto con ícono de apagar, a la izquierda del indicador de conexión (**En línea / Conectando…**). Solo es visible mientras hay una sesión activa; cierra sesión al pulsarlo

### Reglas de negocio
- El botón de apagar es el mismo para los cuatro roles, porque el indicador de conexión es un elemento global fijo en pantalla, no parte del encabezado de cada rol
- La restauración de sesión **no vuelve a validar** el estatus del trabajador contra el catálogo (por ejemplo, si fue dado de baja después de haber iniciado sesión). Esa validación solo ocurre en `doLogin()`
- Si `localStorage` no está disponible o el contenido guardado es inválido, `restoreSession()` no falla: simplemente no restaura nada y la app muestra el login normalmente

---

# SPEC-025 — Máquina parada se distingue igual que Urgente

### Problema que resuelve
El formulario de nueva OT ofrece tres prioridades: Normal, Urgente y Máquina parada. Solo **Urgente** se resaltaba visualmente (línea/badge en rojo con el texto "Urgente") en las tarjetas y en el detalle. **Máquina parada** quedaba visualmente idéntica a Normal, sin ninguna marca, tanto en el listado del técnico como en el del solicitante y el del supervisor.

### Cambio
Se agregó el helper `esPrioridadUrgente(ot)`, que devuelve verdadero para `prioridad==='urgente'` **o** `prioridad==='maquina-parada'`. Todos los puntos que antes comparaban solo contra `'urgente'` ahora usan este helper:

| Función | Pantalla |
|---|---|
| `otCardSol` | Tarjetas de OT del solicitante |
| `otCardTec` | Tarjetas de OT del técnico (propias y disponibles) |
| `otCardSup` | Tarjetas de OT del supervisor |
| `buildDetalleTec` | Fila "Prioridad" en el detalle del técnico |
| `buildDetalleSup` | Etiqueta de prioridad en la línea de tiempo del supervisor |
| `notifyPush` (título del push) | Ya trataba ambas por igual desde SPEC-011; se unificó para usar el mismo helper |

### Reglas de negocio
- El texto mostrado es **"Urgente"** para ambas prioridades, igual que antes para `urgente` — no se introduce un texto distinto para "Máquina parada"
- El reporte de Excel (`prioLabel`) sí distingue internamente el texto exportado: `urgente` → "Urgente", `maquina-parada` → "Urgente — Máquina parada", para no perder la información exacta en el histórico exportable
- Un único punto de cambio (`esPrioridadUrgente`) evita que futuras prioridades "altas" se olviden de marcarse en alguna de las pantallas

---

# SPEC-027 — Un técnico, una orden en proceso a la vez

### Problema que resuelve
SPEC-022 bloqueaba tomar una orden nueva solo cuando el técnico tenía una **pausada** pendiente (es decir, después de haber usado el botón "="). Pero el caso más básico quedaba sin cubrir: un técnico con una orden **en proceso normal** —sin haberla pausado nunca— podía entrar a "Disponibles" y tomar una segunda, una tercera, cualquier cantidad, sin ninguna restricción.

### Corrección
`tomarOT()` ahora también valida, mediante `otEnProcesoDelTecnico()`, si el técnico ya tiene otra orden en estado `proceso` en la que participa sin haber registrado salida. Si la hay, se bloquea la toma y se le indica que use el botón **"="** para pausar la actual antes de tomar una nueva.

### Qué NO bloquea, a propósito
- **Reingresar a su propia orden** (mismo `id`): sigue permitido; ni siquiera entra a esta validación
- **Tomar una orden mientras la propia está en `espera` por falta de refacción u otro motivo** (SPEC-008, sin pasar por el botón de pausar): esta validación se acotó deliberadamente a `status==='proceso'`, sin incluir `espera`, para no bloquear al técnico mientras espera un insumo por un motivo distinto a haber pausado
- **La toma que acompaña al flujo de pausar** (`desdePausa=true`, SPEC-021): se omite esta validación porque esa toma es precisamente la forma correcta de cambiar de orden

### Reglas de negocio
- El mensaje de bloqueo indica el folio de la orden en proceso y remite al botón de pausar
- Esta validación corre **después** de la de SPEC-022 (orden pausada pendiente); si ambas aplicaran, se muestra primero la de la pausada, por ser más específica

---

# SPEC-028 — Ventanas propias en lugar de los diálogos nativos del navegador

### Problema que resuelve
Las funciones nativas `alert()`, `confirm()` y `prompt()` del navegador muestran un prefijo con el dominio del sitio (por ejemplo, *"victormorenogarcia05-ux.github.io dice"*), que el navegador agrega como medida de seguridad para que el usuario sepa qué sitio le está hablando. **Ninguna app puede quitar ese prefijo** mientras siga usando esas funciones — no existe opción de CSS ni de JavaScript para ocultarlo. La única forma de eliminarlo es dejar de usar los diálogos nativos y mostrar ventanas propias.

### Solución
Se agregó un modal genérico y reutilizable (`#modal-app-dialog`), con el mismo estilo visual que el resto de los modales de la app, y tres funciones que lo controlan:

| Función | Reemplaza a | Devuelve |
|---|---|---|
| `appAlert(msg, title)` | `alert()` | `Promise` (se resuelve al pulsar Aceptar) |
| `appConfirm(msg, title)` | `confirm()` | `Promise<boolean>` |
| `appPrompt(msg, defaultValue)` | `prompt()` | `Promise<string \| null>` |

### Alcance del cambio
- **83 llamadas a `alert()`** se renombraron mecánicamente a `appAlert()`. Es un cambio seguro porque ninguna llamada usaba el valor de retorno de `alert()` (que siempre es `undefined`).
- **13 llamadas a `confirm()`**, todas con el patrón `if(!confirm('...')) return;`, se convirtieron a `if(!(await appConfirm('...'))) return;`. Las 13 funciones que las contienen pasaron a ser `async function`.
- **3 llamadas a `prompt()`** (en `setAsignacion` y `archivarOTsAntiguas`) se convirtieron a `await appPrompt('...')`, con las mismas dos funciones marcadas `async`.

### Por qué es seguro convertir esas funciones a `async`
Se verificó que las 14 funciones afectadas se invocan **exclusivamente** desde atributos `onclick`/`onchange` del HTML, nunca desde otro código JavaScript que dependa de su valor de retorno de forma síncrona. Un `onclick="miFuncion()"` funciona igual de bien si `miFuncion` es `async`; el navegador no necesita esperar su resolución para nada más.

### Comportamiento del modal
- `appAlert`: un solo botón "Aceptar"
- `appConfirm`: "Cancelar" y "Confirmar"; devuelve `false`/`true` según cuál se pulse
- `appPrompt`: muestra un campo de texto con el valor por defecto, y los botones "Cancelar" (devuelve `null`) y "Aceptar" (devuelve el texto escrito)
- Los flujos que antes encadenaban un `prompt()` seguido de un `confirm()` (como `archivarOTsAntiguas`) siguen funcionando igual, solo que ahora cada paso espera (`await`) a que el usuario responda la ventana antes de continuar

### Reglas de negocio
- No quedó ninguna llamada nativa a `alert()`, `confirm()` ni `prompt()` en el código
- El texto y el orden de los mensajes no cambiaron; solo el mecanismo de presentación

---

# SPEC-029 — La pausa solo afecta a quien se retira, no a toda la orden

### Problema que resuelve
En `confirmarPausarYTomar()` (SPEC-021), la orden pausada pasaba a estado `espera` **sin importar si otro técnico seguía activo en ella**. En una orden con dos técnicos del mismo turno, si el segundo se retiraba con el botón "=", la orden completa se marcaba "En espera" aunque el primero siguiera trabajando con total normalidad — y de hecho podía concluirla sin problema. El estatus mostrado no reflejaba la realidad.

### Corrección
Tras registrar la salida del técnico que se retira, se evalúa si **queda alguien más activo** en `ot.tecnicos` (sin `fechaSalida`):

- **Si nadie más sigue activo:** comportamiento igual que antes — la orden pasa a `espera`, se registra el motivo, se abre un periodo en `esperas[]` y se notifica al solicitante que su orden quedó sin atender.
- **Si alguien más sigue activo:** la orden **permanece en su estado actual** (normalmente `proceso`). No se abre periodo de espera. Se registra igualmente la trazabilidad de la pausa (`ot.pausas`) y un comentario distinto, más preciso: *"[Técnico] se retiró de la OT para atender la [folio]. Otro técnico continúa."* El supervisor recibe una notificación informativa; al solicitante no se le avisa que su orden quedó en espera, porque no es cierto.

### Reglas de negocio
- El único criterio es si queda algún técnico sin `fechaSalida` tras la salida del que pausa
- El registro de `pausas[]` (SPEC-021) ocurre siempre, independientemente del resultado

---

# SPEC-030 — Elegibilidad por puesto en el aviso de técnicos ocupados

### Problema que resuelve
`avisarSiNoHayTecnicoLibre()` (SPEC-020) consideraba "en turno" a cualquier persona con asignación en el rol de turnos, incluyendo puestos que en la práctica no toman órdenes de trabajo. Esto podía dar lugar a evaluaciones incorrectas: por ejemplo, si el Jefe de Mantenimiento aparecía en el rol y estaba libre, el sistema asumía que había alguien disponible aunque él no fuera quien realmente atendería la orden.

### Reglas de elegibilidad aplicadas
Antes de evaluar quién está libre u ocupado, se filtra la lista de personas en turno:

| Puesto | Regla |
|---|---|
| Jefe de Mantenimiento | **Nunca** cuenta como disponible para tomar OT, aunque aparezca en el rol de turnos |
| Analista de Mantenimiento | **Nunca** cuenta como disponible para tomar OT, aunque aparezca en el rol de turnos |
| Auxiliar de Mantenimiento | Solo cuenta para OT de **MTTO-INFRAESTRUCTURA** y **MTTO-SEGURIDAD**. Para MTTO-MAQ-PROD no se considera, esté libre u ocupado |
| Cualquier otro puesto | Sin cambios, se evalúa con normalidad |

### Efecto práctico
- Si tras filtrar no queda **nadie elegible** en turno, no se muestra el aviso (no hay con quién comparar)
- Si el Auxiliar está libre pero la orden es de MAQ-PROD, su disponibilidad **no cuenta** para decidir si hay alguien libre: el aviso se basa únicamente en el resto del personal elegible
- La comparación de puesto usa `_normNombre()`, tolerante a mayúsculas y acentos

### Alcance
Este filtro aplica únicamente a `avisarSiNoHayTecnicoLibre()`. No afecta la capacidad real de estas personas de tomar órdenes desde su propio panel, ni el módulo de Turnos, ni el ranking de técnicos.

---

# SPEC-031 — Rechazar cierre: botón roto y motivos predefinidos

### Problema que resuelve
El botón **"Rechazar"** en el detalle de la OT llamaba a `mostrarRechazo(id)`, una función que **nunca se había escrito**. Al pulsarlo no pasaba nada, salvo un error en la consola del navegador (`mostrarRechazo is not defined`).

### Corrección del bug
Se agregó `mostrarRechazo(id)`, que guarda el id en `otParaRechazar`, limpia la selección anterior del modal y lo abre. Es la pieza que faltaba para que el botón funcionara.

### Motivos predefinidos
El motivo ya no se captura como texto libre obligatorio. Se presentan cuatro opciones fijas, con el mismo patrón visual (chips) que usa "Poner en espera" (SPEC-008):

- Sin reparación al 100%
- Técnico aún no termina
- Suciedad en máquina
- Sin acuerdo en dictamen

Seleccionar uno es **obligatorio**; sin selección, `confirmarRechazo()` no continúa y pide elegir un motivo. Debajo del selector hay un campo de texto **opcional** para agregar detalle adicional, que se concatena al motivo (`"Suciedad en máquina — Quedaron rebabas en la banda"`).

### Qué se guarda
Además de lo que ya existía (comentario en la OT, notificación interna al técnico y al supervisor, push enrutado por tipo de servicio), se agrega `ot.rechazo = {motivo, detalle, fecha}` como registro estructurado del último rechazo.

### Postcondiciones
- La OT vuelve a estado `proceso` — sin cambios respecto al comportamiento previo, una vez corregido el bug del botón
- El técnico y el supervisor reciben el motivo completo (predefinido + detalle si lo hay)

---

# SPEC-032 — Regla única para "puede tomar esta orden"

### Problema que resuelve
Existían varias copias, ligeramente distintas, de la lógica que decide si un técnico puede tomar o unirse a una OT: la del detalle (`puedeUnirse`), la del listado de disponibles, y la de "pausar y tomar otra" (`abrirPausarOT`). Esta última era más estrecha que las demás — solo consideraba OT en `abierto`, dejando fuera:

1. Una OT `en proceso` cuyo técnico ya cambió de turno (aunque unirse a ella **sí** era posible desde el detalle)
2. Cualquier OT pausada (SPEC-021), que **nadie** podía tomar todavía — ni siquiera desde el detalle, porque `puedeUnirse` nunca contemplaba el estado `espera`

### Solución
Se creó `puedeTomarOrden(ot, nombreTecnico)`, la única función que responde esa pregunta, usada ahora en los tres lugares (`buildDetalleTec`, `abrirPausarOT`, `confirmarPausarYTomar`):

1. **OT abierta o en proceso:** puede tomarse/unirse si el técnico no se ha registrado ya en el turno actual — sin cambios respecto a la regla de siempre
2. **OT pausada (con registro en `ot.pausas`) y sin nadie activo:** solo puede tomarse si el técnico que la pausó **ya salió de su turno** — mientras siga en el mismo turno en el que la pausó, la responsabilidad de resolverla sigue siendo suya, para que nadie se la "quite" antes de que le dé tiempo de retomarla. La comparación es entre el turno guardado en su entrada de `ot.tecnicos` y el turno actual (`turnoActual()`)

### Efectos del cambio

**En "Pausar orden y tomar otra"** (`abrirPausarOT`): la lista de candidatas ahora incluye también OT en proceso uniéndose y OT pausadas tomables, no solo abiertas. La tarjeta de cada candidata indica su situación ("Reasignada de [técnico]" o "Pausada por [técnico], ya salió de turno") para que quede claro qué se está tomando. `confirmarPausarYTomar` revalida con la misma regla al confirmar, por si la candidata dejó de estar disponible entre que se abrió la lista y se confirmó.

**En el detalle de la OT** (`buildDetalleTec`): una OT pausada y tomable ahora sí muestra el botón para tomarla, con un mensaje propio: *"OT pausada — disponible para retomar"*, indicando quién la pausó.

### Reglas de negocio
- Tomar una OT pausada la regresa a `proceso` y cierra el periodo de espera abierto — mismo mecanismo que ya usaba el reingreso normal (SPEC-013)
- Siguen aplicando los candados existentes: un técnico con su propia OT pausada pendiente (SPEC-022) o con otra en proceso (SPEC-027) no puede tomar una OT pausada de otro sin resolver primero la suya
- Si no hay dato de turno registrado para quien pausó, se permite tomarla igualmente, para no dejarla indefinidamente sin resolver por falta de información

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

*Documento actualizado el 13 de agosto de 2026 — versión 2.7 (agrega SPEC-022).*
*A partir de aquí, cualquier cambio a la app debe iniciar actualizando este documento.*
