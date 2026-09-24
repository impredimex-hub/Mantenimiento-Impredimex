# SPECS.md — Recursos Humanos (rrhh-pwa)

## Especificaciones funcionales del sistema

Este documento es la **fuente de verdad** del comportamiento de la aplicación.
Cualquier cambio futuro debe partir de actualizar primero estas specs y luego
implementar el código.

**Versión objetivo:** 2.32
**Fecha:** 18 de septiembre de 2026
**Metodología:** Spec-Driven Development (SDD)

> **Nota de origen.** La aplicación se construyó antes de que existiera la suite
> y hasta hoy no tiene ningún control de acceso. Estas son sus primeras specs:
> los módulos de incidencias, capacitación, cursos y vacantes se documentan aquí
> a grandes rasgos, tal como están implementados, y se detallarán conforme se
> toquen.

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

## Reglas transversales del proyecto

Estas reglas no pertenecen a una spec: valen para toda la aplicación y hay que
respetarlas en cualquier cambio futuro. **Cada una nació de un problema
concreto, y está escrita aquí para que nadie la reinvente ni la rompa sin
saberlo.** Quien vaya a tocar el código —persona o asistente— debería leer esta
sección antes que ninguna otra.

### R1 — Los permisos se administran como dato, no como código

Un permiso nuevo **se guarda como campo en el padrón `colaboradores`** y se
edita desde una pantalla dentro de la aplicación. Nunca como lista de nóminas
escrita en el código ni como archivo de configuración.

El motivo: un archivo de configuración obligaría a editar y recompilar cada vez
que alguien entra, sale o cambia de área, y ataría los permisos a nombres
escritos a mano. En el padrón, `ADMIN` los cambia solo, sin que nadie toque el
repositorio.

Campos creados con este patrón: `departamentosTurnos` (SPEC-013),
`reporteFaltasTodas` (SPEC-015), `capturaPromociones` (SPEC-016), `verGraficas`
(SPEC-019).

Reglas que acompañan al patrón:

- **Un `ADMIN` lo puede todo sin traer la marca.** El campo sirve para conceder
  a quien no es administrador, no para limitar al que sí lo es.
- **Ausencia equivale a «no».** Nunca se concede un privilegio por omisión.
- **Cuando la misma regla se consulta desde varias pantallas, se escribe una
  sola vez.** `puedeVerGraficas` vive en `src/services/permisosPadron.ts` porque
  las gráficas aparecen en tres pestañas: repetida tres veces, tarde o temprano
  una se quedaría atrás y alguien vería en una pestaña lo que no puede ver en
  otra.

### R2 — Hay campos que no pueden viajar en `construirDocumento`

`construirDocumento` es el camino de la importación de Excel. **Todo campo que
pase por ahí se borra cuando llega un archivo que no trae esa columna.**

Por eso se escriben por su propia función, o de forma condicional:

| Campo | Quién lo escribe |
|---|---|
| `departamentosTurnos` | `asignarDepartamentosTurnos` |
| `reporteFaltasTodas` | `asignarReporteFaltasTodas` |
| `capturaPromociones` | `asignarCapturaPromociones` |
| `verGraficas` | `asignarVerGraficas` |
| `fechaNacimiento` | condicional, y `guardarFechasNacimiento` |
| `fechaBaja` | `cambiarEstatus` y `fecharBaja` |
| `estatus` | condicional, y `cambiarEstatus` |

Un permiso nuevo va en esta tabla, no en `construirDocumento`.

### R3 — Las fechas `AAAA-MM-DD` se parten a mano

**Nunca `new Date(cadena)`.** Ese constructor interpreta la cadena como UTC, y
en México (UTC−6) todo se corre un día hacia atrás: quien nació o entró un día 1
cae en el mes anterior. El error no se ve hasta que alguien reclama que su
cumpleaños no salió en la lista.

Las utilidades están en `src/utils/fechas.ts`: `partesFecha`, `fechaLocal`,
`diaYMes`, `edadQueCumple`, `hoyISO`.

Corolario útil: como todas las fechas viajan en ese formato, **dos fechas se
comparan como texto**. `'2026-03-01' < '2026-03-02'` es cierto, y no hace falta
construir un `Date` solo para saber cuál es anterior.

### R4 — Las gráficas se dibujan a mano en SVG, sin librerías

Todo vive en `src/components/Graficas.tsx`. **No se agregan dependencias
nuevas.** El proyecto se compila desde el navegador de un teléfono, sin forma de
correr `npm` para regenerar `package-lock.json`, así que una dependencia nueva
rompería la publicación sin dejar claro por qué.

### R5 — Datos que existen en el padrón y esta aplicación no toca

El documento de cada colaborador trae campos que pertenecen a la suite, no a
RRHH: `apps`, `roles`, `creadoEn`. Se conservan intactos, y por eso
`construirDocumento` lleva lista blanca explícita en lugar de propagar el objeto
completo.

Hay además un campo **`rol`** heredado de antes de la suite. **Está muerto:**
ninguna de las cinco aplicaciones lo lee. Todas derivan el papel del usuario de
`roles[<id de la app>]`. Se deja donde está porque borrarlo obligaría a tocar
más de cien documentos sin ganar nada, pero **no debe usarse ni revivirse**.

### R6 — Los candados son de interfaz

El proyecto `rrhh-pwa` usa sesión anónima y sus reglas de Firestore no
distinguen usuarios (SPEC-008). Todo permiso descrito en estas specs se sostiene
en la pantalla, no en el servidor: quien tenga conocimientos técnicos puede leer
los datos de todos modos. Hacerlo real exigiría cambiar la autenticación de ese
proyecto. Es deuda conocida y aceptada, no un descuido.

---

# SPEC-001 — Acceso a la aplicación

**Estado:** implementado

### Actor
Personal autorizado de Recursos Humanos.

### Precondiciones
- La persona existe en la colección `colaboradores` del proyecto
  **impredimex-suite**
- Su campo `estatus` es `ACTIVO`
- Su campo `apps` incluye el valor `rrhh`
- Tiene cuenta en Firebase Auth del proyecto suite, con identificador
  `<noNomina>@impredimex.local`
- Conexión a internet

### Flujo principal
1. Sistema muestra la pantalla de acceso con dos campos: número de nómina y clave
2. Usuario escribe su nómina y su clave de 6 dígitos
3. Sistema arma el identificador `<nómina>@impredimex.local`
4. Sistema invoca `signInWithEmailAndPassword` contra Auth del proyecto suite
5. Sistema lee el documento `colaboradores/<nómina>`
6. Sistema valida que `estatus` sea `ACTIVO` y que `apps` incluya `rrhh`
7. Sistema toma el papel de `roles.rrhh`
8. Sistema muestra la aplicación con los módulos que ese papel permite

### Postcondiciones
- Existe una sesión activa con nómina, nombre y papel
- La sesión sobrevive al recargar y al cerrar el navegador
- Salir es un acto explícito

### Reglas de negocio
- **Nunca hay contraseñas ni PIN en el código.** El dominio
  `@impredimex.local` no existe de verdad: solo forma un identificador único.
  Firebase no envía correos ni lo verifica.
- **Tener cuenta no da acceso.** Lo da estar en `apps`. Una persona con cuenta
  para EPP no entra aquí salvo que se le agregue `rrhh`.
- **Ausencia de papel equivale a `CONSULTA`**, el más bajo. Nunca se concede
  privilegio por omisión.
- **Los cambios de papel surten efecto al siguiente inicio de sesión**, porque
  el papel se lee una vez al entrar.
- **No hay autoservicio de recuperación.** El administrador restablece la clave
  desde la consola.

### Flujos alternativos
- **Nómina o clave incorrecta:** mensaje genérico, sin distinguir cuál de los
  dos falló
- **`estatus` es `BAJA`:** se rechaza el acceso y se cierra la sesión
- **`apps` no incluye `rrhh`:** se rechaza el acceso y se cierra la sesión
- **Sin conexión:** se avisa que no se pudo verificar la identidad

---

# SPEC-002 — Papeles y permisos

**Estado:** implementado
**Nuevo en la v2**

### Papeles
`ADMIN`, `CAPTURA` y `CONSULTA`, tomados de `roles.rrhh` en la suite.

### Matriz de permisos

| Acción | ADMIN | CAPTURA | CONSULTA |
|---|:--:|:--:|:--:|
| Ver el directorio de personal | sí | sí | sí |
| Alta o edición de un colaborador | sí | no | no |
| Dar de baja o reactivar | sí | no | no |
| Importar desde Excel | sí | no | no |
| Eliminar un colaborador | sí | no | no |
| Ver incidencias | sí | sí | sí |
| Registrar incidencias | sí | sí | no |
| Registrar capacitación y cursos | sí | sí | no |
| Registrar vacantes | sí | sí | no |
| Exportar a Excel y PDF | sí | sí | sí |

### Reglas de negocio
- **El padrón tiene la puerta más angosta.** `colaboradores` sostiene el inicio
  de sesión de las cinco apps de la suite, así que solo `ADMIN` lo escribe.
  `CAPTURA` alimenta los datos propios de RRHH pero no toca el padrón.
- **`CONSULTA` sí exporta.** Es descarga bajo demanda y no modifica nada.
- **`CONSULTA` ve las incidencias de toda la planta.** Decidido a conciencia:
  las quince cuentas actuales entran con este papel y ven faltas
  injustificadas, incidencias del reglamento e incapacidades de las 121
  personas, con nombre, fechas y motivo. Como también pueden exportar,
  cualquiera de ellas puede descargar ese historial completo a un Excel. Se
  aceptó el riesgo: son empleados de confianza y la alternativa —ocultar el
  módulo— dejaba sin uso una parte de la aplicación.
- **`CAPTURA` queda definido pero sin usar todavía.** Existirá cuando se agregue
  la sección donde estos quince capturen. Hoy nadie lo tiene asignado.
- **Los módulos que el papel no permite escribir se muestran igual**, en modo
  lectura. Ocultarlos haría creer que no existen.

---

# SPEC-003 — Directorio de personal

**Estado:** implementado
**Actor:** `ADMIN` para escribir; cualquier papel para leer

### Precondiciones
- Sesión iniciada

### Flujo principal
1. Sistema se suscribe a la colección `colaboradores` del proyecto
   **impredimex-suite**
2. Sistema muestra la lista ordenada numéricamente por nómina, con búsqueda y
   paginación
3. `ADMIN` puede dar de alta, editar, dar de baja o importar

### Reglas de negocio
- **Esta es la única lista de personal válida de toda la suite.** Ninguna otra
  app la escribe, ni guarda su propia copia, ni tiene nombres en el código.
- **RRHH es la única app que escribe aquí.** Es su responsabilidad y también su
  riesgo: un error en este módulo se propaga a las cinco apps.
- **`apps`, `roles` y `rol` no se tocan nunca.** No aparecen en los formularios
  de RRHH y no se escriben. Toda escritura usa `merge` para no borrarlos. Esta
  regla es la que impide que RRHH deje sin acceso a alguien sin darse cuenta.
- **`nombreNormalizado` se recalcula al guardar.** Son las palabras de
  `nombreCompleto` sin acentos, en mayúsculas y **ordenadas alfabéticamente**:
  `MORENO GARCIA VICTOR` se guarda como `GARCIA MORENO VICTOR`. Ordenarlas hace
  que la búsqueda no dependa del orden en que se escriba, así que «Víctor
  Moreno» y «Moreno Víctor» encuentran a la misma persona. Calcularlo de otra
  forma dejaría los registros nuevos en un formato y el resto de la colección en
  otro, y las búsquedas de las demás apps fallarían a medias.
- **Cada escritura deja `actualizadoEn` y `actualizadoPor`**, con la nómina de
  quien la hizo. Hasta ahora no había forma de saber quién tocó el padrón.
- **`departamento` pertenece a un catálogo cerrado de 13 valores.** Se comparan
  como texto exacto en varias apps: un acento o una mayúscula distinta deja a un
  trabajador sin equipo de protección asignado en EPP, y falla sin avisar.
- **La antigüedad no se guarda.** Se calcula al vuelo desde `fechaIngreso`.
  Guardarla significa que queda desactualizada cada mes.

### Flujos alternativos
- **La suite no responde:** la lista se muestra vacía con un aviso claro, no en
  blanco sin explicación

---

# SPEC-004 — Alta y edición de un colaborador

**Estado:** implementado
**Actor:** `ADMIN`

### Flujo principal
1. Usuario llena nómina, nombre completo, puesto, fecha de ingreso y
   departamento
2. Sistema normaliza el nombre, el puesto y el departamento a mayúsculas
3. Sistema calcula `nombreNormalizado`
4. Sistema guarda con `merge` usando la nómina como identificador del documento

### Reglas de negocio
- **La nómina es el identificador del documento.** Guardar con una nómina que ya
  existe actualiza a esa persona, no crea una nueva.
- **El departamento se elige de una lista, no se escribe.** Es lo único que
  evita las variantes con acento distinto.
- **Un alta nueva nace sin `apps` ni `roles`**, o sea sin acceso a ninguna
  aplicación. Darle acceso es un acto aparte y deliberado.

---

# SPEC-005 — Baja, reactivación y eliminación

**Estado:** implementado
**Actor:** `ADMIN`

### Flujo principal — baja
1. Usuario presiona «Dar de baja» sobre un colaborador
2. Sistema pide confirmación
3. Sistema cambia `estatus` a `BAJA`; el documento se conserva completo

### Flujo principal — eliminación
1. Usuario presiona el botón de eliminar
2. Sistema muestra una confirmación que **nombra a la persona** y advierte que
   se perderán sus accesos a las demás aplicaciones
3. Usuario confirma
4. Sistema borra el documento

### Reglas de negocio
- **Dar de baja es lo normal; eliminar es la excepción.** La baja conserva el
  historial y permite reactivar. Eliminar existe solo para registros creados por
  error, por ejemplo con la nómina mal escrita.
- **Eliminar se lleva `apps` y `roles`.** Esa persona pierde el acceso a EPP,
  Procesos y a lo que tuviera, sin dejar rastro. Por eso la confirmación tiene
  que decirlo, no basta un «¿estás seguro?».
- **Una persona en `BAJA` no puede iniciar sesión en ninguna app**, aunque
  conserve `apps` y `roles`.
- **Reactivar es cambiar `estatus` a `ACTIVO`.** No hay que volver a capturar
  nada ni se reasignan permisos: los que tenía siguen ahí.

---

# SPEC-006 — Importación desde Excel

**Estado:** implementado
**Actor:** `ADMIN`

### Flujo principal
1. Usuario selecciona un archivo `.xlsx`
2. Sistema lee la primera hoja y reconoce las columnas de nómina, nombre,
   puesto, fecha de ingreso y departamento
3. Sistema descarta las filas sin nómina o sin nombre
4. Sistema compara contra lo que ya existe y muestra un **resumen previo**:
   cuántas altas, cuántas actualizaciones, y **qué personas en `BAJA` serían
   reactivadas**, con nombre y nómina
5. Usuario confirma o cancela
6. Sistema guarda en lote, con `merge`

### Reglas de negocio
- **La importación nunca reactiva a nadie en silencio.** Si el archivo trae a
  alguien que está en `BAJA`, se lista antes y el usuario decide. Hoy la
  aplicación fuerza `ACTIVO` en todos los registros importados, así que volver a
  subir la plantilla completa revive a todo el personal dado de baja sin avisar.
- **Un alta que llega por importación nace `ACTIVO`.** Una persona que ya existe
  conserva su estatus salvo que el usuario acepte reactivarla.
- **La importación pisa nombre, puesto, fecha y departamento con lo que traiga
  el archivo.** Si el Excel viene mal, el padrón queda mal. Es la vía por la que
  entró el error de las nóminas 2396 y 2398.
- **Los departamentos que no pertenezcan al catálogo cerrado se reportan como
  error** y esas filas no se guardan. Es preferible rechazar una fila a meter
  «FLEXOGRAFIA» sin acento y dejar a esa gente sin EPP asignado.
- **`apps` y `roles` no se tocan.** Aplica la regla de la SPEC-003.

### Flujos alternativos
- **Ninguna fila válida:** se avisa qué columnas se esperaban
- **Archivo ilegible:** se avisa y no se guarda nada

---

# SPEC-007 — Módulos propios de RRHH

**Estado:** implementado
**Actor:** `ADMIN` para escribir; `CAPTURA` y `CONSULTA` para leer

### Alcance
Incidencias, capacitación, cursos, antigüedad y vacantes.

### Reglas de negocio
- **Estos datos se quedan en el proyecto propio de RRHH**, no en la suite. Es
  deliberado y no debe «optimizarse» juntándolo todo: el plan gratuito da cuota
  por proyecto, y concentrar las cinco apps en uno la colapsaría. La suite solo
  carga con identidad y directorio.
- **Los registros guardan copia, no referencia.** Una incidencia conserva la
  nómina **y** el nombre tal como estaban al capturarla, para que el histórico
  no cambie si después se corrige el padrón.
- **La antigüedad se calcula al vuelo** desde `fechaIngreso`. No se guarda.
- **Solo `ADMIN` captura (v2.3).** Quien no lo sea no ve formularios de alta,
  botones de eliminar ni edición en línea en ningún módulo: ve un aviso de
  modo consulta. `CAPTURA` perdió la escritura aquí y se comporta como
  `CONSULTA`; el papel sigue vigente en las demás aplicaciones de la suite.
- **Consultar, filtrar, paginar y exportar quedan abiertos a todos.** Una
  descarga a Excel o PDF no modifica nada, así que no se restringe.
- **Ocultar el formulario no es el control de acceso.** Lo que impide de
  verdad la escritura son las reglas de la SPEC-008; la interfaz solo evita
  que alguien intente algo que la base le va a rechazar.

---

# SPEC-008 — Reglas de acceso a los datos

**Estado:** pendiente
**Nuevo en la v2**

### Alcance
Dos proyectos con reglas distintas.

### Proyecto de la suite — `colaboradores`
Las reglas deben permitir la lectura a cualquier sesión autenticada, porque las
cinco apps necesitan el directorio, y **restringir la escritura**. Como las
reglas de un proyecto no pueden validar los tokens de otro, y aquí la sesión sí
es del propio proyecto suite, la escritura puede exigir que la nómina de quien
escribe tenga `rrhh` en su campo `apps` y `ADMIN` en `roles.rrhh`.

### Proyecto propio de RRHH
Cada app inicia además una sesión anónima en su propio proyecto, y las reglas
exigen esa sesión junto con App Check. Eso cierra el acceso a extraños pero no
distingue entre usuarios. Riesgo aceptado a conciencia: la trazabilidad no
depende de las reglas sino de los datos que la app graba.

### Estado real, comprobado en el código (v2.22.1)

El proyecto propio de RRHH **no abre ninguna sesión**. `src/firebase/config.ts`
inicializa Firestore y nada más: no hay `getAuth` ni inicio de sesión contra ese
proyecto. La sesión de la persona vive en `impredimex-suite`, y **las sesiones
de Firebase Auth no cruzan de un proyecto a otro**.

Por lo tanto, en el proyecto de RRHH `request.auth` es siempre `null`, y una
regla que exigiera sesión dejaría la aplicación entera sin datos. La sesión
anónima que describe esta spec nunca se implementó.

Lo que sí se hizo, y está en `firestore.rules` dentro del repositorio:

- **Las ocho colecciones que la app usa quedan abiertas**, porque no hay con qué
  autenticar todavía.
- **Todo lo demás queda cerrado.** Antes se podían crear colecciones nuevas y
  usar la base como almacenamiento gratuito, gastando la cuota del plan.
- **Las reglas están versionadas.** Antes solo existían en la consola, sin
  historial y sin forma de saber qué decían.

Falta, en este orden: habilitar el proveedor anónimo en la consola, iniciar
sesión anónima desde `config.ts`, probarlo publicado, y solo entonces cambiar
las reglas a `request.auth != null`. Publicar las reglas antes que el código
deja la aplicación sin acceso a nada.

Aun así eso no distinguiría usuarios: quien tome el JavaScript publicado puede
abrir una sesión anónima igual que la app. Cerrarlo de verdad exige que este
proyecto comparta la autenticación de la suite.

### Reglas de negocio
- **Hoy no hay ninguna regla que impida escribir el padrón.** La aplicación no
  tiene control de acceso y el repositorio es público, así que cualquiera con la
  dirección puede alterar la lista de personal. Es lo más urgente de esta
  versión.
- **El orden de puesta en marcha no se puede invertir:** primero se publica la
  aplicación con sesión y App Check en monitoreo, se verifica, y hasta entonces
  se aplican las reglas. Al revés, la versión que está en producción deja de
  funcionar en ese momento.

---

# SPEC-009 — Migración del padrón a la suite

**Estado:** implementado

### Qué resultó ser
Esta spec se escribió esperando una reconciliación delicada entre dos listas
divergentes. Al revisar los datos reales, ese trabajo no existía.

El proyecto propio de RRHH tenía **tres** colaboradores —86, 852 y 885—, todos
con el formato viejo: `updatedAt` en inglés, sin `nombreNormalizado`, sin `apps`
ni `roles`. Eran registros de prueba de cuando se construyó la aplicación.

Los 121 de la suite nunca salieron de esa aplicación: se cargaron directo desde
un archivo de Excel el 3 de septiembre de 2026, con una herramienta aparte. Por
eso las dos colecciones nunca estuvieron sincronizadas ni tenían por qué estarlo.

Verificado que las tres nóminas ya existían en la suite con sus datos correctos,
la migración se redujo a cambiar el origen de la base en `personalService.ts`.

### Reglas de negocio
- **El padrón queda solo en la suite.** Los tres registros del proyecto
  `rrhh-pwa` dejan de leerse y se eliminan a mano, para que nadie encuentre
  después una segunda colección `colaboradores` y dude de cuál es la buena.
- **Los demás módulos no se mueven.** Incidencias, capacitación, cursos y
  vacantes siguen en el proyecto propio, con datos reales. Es la regla 4 de la
  suite: la cuota del plan gratuito es por proyecto.
- **La corrección de las nóminas 2396 y 2398 sigue pendiente**, y ahora es un
  trabajo aparte que se hace desde la propia aplicación, ya no parte de una
  migración.

---

# SPEC-010 — Instalación como aplicación

**Estado:** parcialmente implementado
**Actor:** cualquier usuario

### Reglas de negocio
- **Los iconos deben vivir en el repositorio.** Hoy el manifiesto apunta a
  `cdn-icons-png.flaticon.com`, un servicio ajeno: si cambia o el dispositivo
  está sin red al instalar, la app queda sin icono. Tampoco hay
  `apple-touch-icon`, así que en iPhone la pantalla de inicio usa una captura en
  vez de un icono.
- **El icono distingue a esta app de las demás.** Las cinco comparten marca; el
  de RRHH es la silueta de dos personas.
- **Los colores son los de la suite:** `#003580` en `theme_color` y
  `background_color`. Hoy declara `#2563eb` y `#f8fafc`.

---

# SPEC-011 — Registro de incidencias

**Estado:** implementado
**Actor:** `ADMIN` y `CAPTURA` para capturar; `CONSULTA` para ver y exportar

### Flujo principal
1. El usuario selecciona al colaborador, el tipo de incidencia y, si aplica,
   escribe observaciones libres.
2. Si la incidencia implica una suspensión, marca la casilla **Suspensión**.
   Eso pide primero el número de días y después abre un calendario donde se
   eligen esos días uno por uno; no tienen que ser consecutivos.
3. Al guardar, la incidencia queda con la nómina y el nombre del colaborador
   copiados tal como estaban en ese momento (regla general de la SPEC-007).

### Postcondiciones
- Se crea un documento en `incidencias` (proyecto `rrhh-pwa`) con `tipo`,
  `observaciones`, `suspension` y, si aplica, `diasSuspension` y
  `fechasSuspension` (una fecha `YYYY-MM-DD` por cada día elegido).
- El botón **Guardar Incidencia** queda deshabilitado mientras el número de
  fechas elegidas no coincida exactamente con `diasSuspension`.

### Reglas de negocio
- **No hay fecha de inicio y fin genéricas.** La v2.1 las retira: la única
  fecha que la aplicación captura es la de una suspensión real, y son fechas
  puntuales elegidas a mano, no un rango.
- **El estatus de aprobación se retira.** La versión anterior guardaba un
  campo `estatus` que solo podía valer `APROBADO`: no había ningún flujo que
  lo cambiara, así que no describía nada real.
- **El historial muestra # Nómina, Nombre, Tipo, Suspensión, Observaciones y
  Acción.** La columna Suspensión lista las fechas elegidas si la incidencia
  las tiene, o un guion si no.
- **El indicador de "días acumulados" del resumen ahora cuenta solo días de
  suspensión.** El total genérico que existía antes perdió sentido al quitarse
  el rango de fechas: ya no hay un número de días asociado a una falta o un
  retardo, así que sumar «días» de todas las incidencias por igual ya no
  describía nada real.

### Flujos alternativos
- Si se cambia el número de días de una suspensión ya en captura, las fechas
  elegidas se borran y hay que volver a marcarlas: evita que queden fechas de
  más o de menos sin que el usuario se dé cuenta.

---

# SPEC-012 — Sucesos y rol de turnos

**Estado:** implementado
**Actor:** cualquier sesión, sea o no `ADMIN`

### Alcance
Pestaña **Sucesos y Turnos**. Es la excepción deliberada a la SPEC-007: aquí
la captura está abierta a todos, porque quien levanta un reporte de piso o
arma un rol es precisamente quien está en el turno, no un administrador.

### Sucesos

1. Quien reporta elige fecha, colaborador y tipo de suceso, y puede describirlo.
2. Al guardar, el suceso conserva nómina, nombre y departamento del colaborador
   **y** la nómina y el nombre de quien lo reportó, copiados en ese momento.

Catálogo: no se presentó a laborar, abandonó el turno, llegada tarde, cambio de
turno, accidente o incidente, otro.

- **Un suceso siempre va ligado a una persona.** No existen sucesos generales.
- **Un suceso no es una incidencia.** No afecta nómina, suspensiones ni el
  historial de la SPEC-011: es bitácora de lo ocurrido, nada más.
- **Solo `ADMIN` puede borrar un suceso.** Un reporte no se deshace porque a
  quien lo levantó le haya incomodado después.
- Todos pueden filtrar la bitácora y exportarla a Excel y PDF.

### Rol de turnos

Réplica del módulo de turnos de la aplicación de Mantenimiento (su SPEC-016),
reescrita para React y Firestore. Sirve para saber dónde está ubicado el
personal, no para calcular nómina.

1. Se captura nombre, **departamento**, periodo y fecha de inicio.
2. El sistema genera una cuadrícula: una fila por persona activa de ese
   departamento, una columna por día del periodo.
3. Se asigna un turno por celda.

| Clave | Horario | | Periodo | Días |
|---|---|---|---|---|
| `T1` | 06:00 – 14:00 | | Semanal | 7 |
| `T2` | 14:00 – 21:30 | | Quincenal | 14 |
| `T3` | 21:30 – 06:00 | | Mensual | el mes completo (28–31) |
| `D12` | 06:00 – 18:00 |
| `N12` | 18:00 – 06:00 |
| `G8` | 08:00 – 18:00 |
| `LIB` | horario libre, se capturan entrada y salida |

Una celda vacía significa descanso. Los domingos se resaltan.

### Reglas de negocio
- **El departamento se elige al crear el rol** y determina qué personas salen
  en la cuadrícula. Solo aparece personal activo.
- **Cualquiera puede crear un rol; solo quien lo creó o un `ADMIN` puede
  editarlo o borrarlo.** Los demás lo abren en modo lectura, con la cuadrícula
  deshabilitada y sin botón de guardar, para que nadie capture un periodo
  entero y descubra al final que no podía guardarlo.
- **Cambiar periodo o fecha de inicio conserva solo las asignaciones cuyas
  fechas siguen dentro del rango**; las que quedan fuera se descartan, porque
  arrastrarlas haría reaparecer turnos de días que ya no son del rol.
- **Cambiar de departamento vacía las asignaciones**, ya que la lista de
  personas deja de ser la misma.
- **Con `LIB` se piden entrada y salida** en formato `HH:MM` de 24 horas, y se
  validan.
- **El portapapeles guarda una copia independiente.** Editar la celda de origen
  no altera las que ya se pegaron. Vive solo durante la edición.
- **Las fechas se generan con aritmética de calendario**, no sumando
  milisegundos: con el horario de verano un día dura 23 o 25 horas dos veces al
  año y el periodo repetiría o se saltaría un día.
- Cada rol se exporta a Excel con una fila por persona y una columna por día.

### Deuda
Igual que el resto de esta aplicación, la restricción de quién puede editar un
rol vive en la interfaz. Las reglas del proyecto de RRHH usan sesión anónima y
no distinguen usuarios (SPEC-008), así que no pueden sostenerla.

---

# SPEC-013 — Quién puede programar turnos

**Estado:** implementado
**Actor:** `ADMIN` asigna; cualquiera puede resultar asignado

### Por qué
La SPEC-012 dejó la creación de roles abierta a todos. En la práctica cada área
tiene a quien le toca programarla, y un rol capturado por quien no conoce la
línea es peor que no tener rol.

### Cómo funciona
- Cada colaborador puede tener `departamentosTurnos`: la lista de departamentos
  cuyos roles puede crear y editar. Vacío o ausente significa que solo consulta.
- `ADMIN` puede programar **todos** los departamentos sin aparecer en ninguna
  lista, y es el único que puede asignar permisos a los demás.
- La asignación se hace desde la pantalla **Permisos**, dentro de la pestaña de
  Sucesos y Turnos, visible solo para `ADMIN`. Cada marca se guarda al
  instante.

### Reglas de negocio
- **El permiso es por departamento, no por autoría.** Quien puede programar un
  área puede corregir cualquier rol de esa área, lo haya creado o no. Es lo que
  hace falta cuando varios supervisores cubren la misma línea, o cuando alguien
  falta y su rol hay que ajustarlo igual. Esto **reemplaza** la regla de la
  SPEC-012, donde mandaba quien lo había creado.
- **Consultar y exportar siguen abiertos a todos.** El candado es solo sobre
  crear y editar.
- **Un rol que no se puede editar se abre en modo lectura**, con la cuadrícula
  deshabilitada y sin botón de guardar.
- **El selector de departamento solo ofrece los permitidos**, así que no es
  posible crear un rol de un área ajena ni por descuido.
- **La lista de departamentos sale del padrón**, no de un catálogo escrito a
  mano: si mañana nace un área, aparece sola.
- **Los permisos asignados se cruzan contra los departamentos que existen hoy.**
  Si un área se renombra o se queda sin personal, deja de ofrecerse aunque el
  permiso siga guardado; no se borra, por si el área vuelve.

### Por qué el campo vive en el padrón y no en el código
Un archivo de configuración obligaría a editar y recompilar cada vez que alguien
entra, sale o cambia de área, y ataría los permisos a nombres o nóminas escritos
a mano. En el padrón, `ADMIN` los cambia solo.

`departamentosTurnos` **no** viaja en `construirDocumento`: si lo hiciera, una
importación de Excel sin esa columna borraría todos los permisos en cada carga.
Solo lo escribe `asignarDepartamentosTurnos`, desde la pantalla de permisos.

### Deuda
Igual que el resto de la aplicación, el candado vive en la interfaz. Las reglas
del proyecto de RRHH usan sesión anónima y no distinguen usuarios (SPEC-008),
así que no pueden sostenerlo.

---

# SPEC-014 — Asistencia confirmada por EPP

**Estado:** implementado
**Aplicaciones:** EPP escribe, RRHH lee

### Por qué
Una revisión de EPP no se le puede hacer a alguien que no vino. La inspección
es, por sí misma, prueba de que la persona estuvo presente. Y como la revisión
es obligatoria para todo el personal, su ausencia significa que esa persona no
se presentó.

### Cómo viaja el dato
EPP guarda sus inspecciones en Realtime Database de su propio proyecto, que
desde RRHH no se ve. El puente es la colección `asistencia` del proyecto
**`impredimex-suite`**, el único terreno que las dos aplicaciones ya comparten.

Al guardar una revisión, EPP escribe un documento con id `AAAA-MM-DD_nómina`:
`fecha`, `noNomina`, `nombreCompleto`, `departamento`, `origen: 'EPP'` y `ts`.
RRHH consulta esa colección por rango de fechas y marca su cuadrícula.

### Cómo se ve
Dentro de la celda del turno, a la derecha: una palomita verde si asistió, una
cruz roja si no. Sin texto, para que un rol mensual de 31 columnas siga siendo
legible. El detalle aparece al mantener el cursor encima.

### Reglas de negocio
- **El documento va sin foto, sin firma y sin el detalle del EPP.** Leer los
  registros completos desde RRHH acabaría con la cuota del plan gratuito: esos
  registros llevan imágenes en base64.
- **Un documento por persona y día.** Una segunda revisión el mismo día
  sobrescribe, no duplica.
- **Solo se evalúan celdas con turno asignado.** Un descanso no es una falta.
- **La falta solo se afirma cuando el turno ya terminó.** Antes de la hora de
  salida, que no haya revisión no significa nada: alguien de T2 entra a las
  14:00, y darlo por ausente en la mañana sería inventar una falta. El
  «Asistió», en cambio, aparece en cuanto se hace la revisión: solo se hace
  esperar al dato que puede equivocarse.
- **Se contemplan los turnos que cruzan la medianoche.** Un `T3` o un `N12` del
  día 14 terminan a las 06:00 del 15, y hasta esa hora no se juzgan. En `LIB`
  se usan las horas capturadas a mano; si una salida es anterior o igual a la
  entrada, se entiende que cruza la noche. Un `LIB` sin horas nunca se da por
  terminado, que es el lado que no inventa faltas.
- **La cuadrícula se refresca sola cada minuto**, para que una celda cambie de
  estado al terminar el turno aunque la pantalla lleve rato abierta.
- **RRHH solo lee.** La asistencia nunca se marca a mano desde el rol de
  turnos: si se pudiera, dejaría de ser lo que la revisión constató.
- **La consulta va por rango**, no trayendo la colección entera. `asistencia`
  crece con cada revisión de cada persona, todos los días.

### Modos de fallo, y por qué se avisan
Si la escritura falla en EPP, la inspección **sí** se guarda —es lo prioritario—
pero se muestra una advertencia. Si la lectura falla en RRHH, se registra el
error y la exportación se cancela con aviso.

La razón es la misma en los dos casos: en silencio, el sistema reportaría como
ausente a gente que sí vino. Un fallo visible es molesto; uno callado genera
faltas falsas en un tema que toca nómina y disciplina.

### Requisito de configuración
La colección `asistencia` del proyecto de la suite necesita su regla: **EPP
escribe, RRHH lee**. Sin ella, la advertencia de arriba aparecerá en cada
revisión y RRHH no marcará a nadie.

### Deuda
La asistencia se infiere de que exista una revisión. Si un supervisor no alcanza
a hacerla, esa persona aparece como ausente aunque haya venido. Es el precio
aceptado a cambio de no capturar la asistencia dos veces, y descansa sobre la
regla de que la revisión de EPP es obligatoria para todos.

---

# SPEC-015 — Reporte de faltas

**Estado:** implementado
**Actor:** cualquiera puede pedirlo; solo algunos, de todas las áreas a la vez

### Qué es
Ventana emergente desde la pestaña de Sucesos y Turnos. Se pide un periodo y un
departamento, y devuelve la lista de faltas, con descarga a Excel y PDF.

### Cómo se calcula una falta
Una falta existe donde se cumplen las tres cosas: **había turno asignado**, ese
**turno ya terminó**, y **no hubo revisión de EPP**. Es la misma regla que pinta
la cruz roja en la cuadrícula (SPEC-014), aplicada sobre un rango.

El recorrido va por los roles, no por el padrón: son los roles los que dicen
quién debía trabajar cada día. Quien no tiene turno asignado no puede faltar.

### Reglas de negocio
- **La opción «Todos los departamentos» está restringida.** La ven los `ADMIN` y
  quien tenga `reporteFaltasTodas` en su documento del padrón. El resto elige un
  departamento a la vez.
- **El botón lo ve todo el mundo.** Consultar y exportar roles ya estaba abierto
  a todos (SPEC-012); restringir el reporte por departamento sería incoherente
  con eso.
- **Dos roles del mismo departamento pueden solaparse en fechas.** Las faltas se
  deduplican por persona y día, o la misma se contaría dos veces.
- **Si la lectura de asistencias falla, no se entrega reporte.** Sin ellas, todo
  turno terminado parecería falta y el reporte acusaría a quien sí vino.
- **Un periodo que incluye días futuros no los reporta**, porque sus turnos no
  han terminado.

### Por qué `reporteFaltasTodas` y no `ADMIN`
Quien necesita el reporte completo es Recursos Humanos, por función. Hacerlo
`ADMIN` para conseguirlo le daría además permiso para programar los roles de
toda la planta, que es justo lo que la SPEC-013 quiso evitar. Son dos cosas
distintas y se marcan por separado, desde la misma pantalla de Permisos.

`reporteFaltasTodas` **no** viaja en `construirDocumento`, por la misma razón que
`departamentosTurnos`: un Excel sin esa columna borraría la marca en cada carga.

---

# SPEC-016 — Promociones internas

**Estado:** implementado
**Actor:** `ADMIN` y quien tenga `capturaPromociones`; el resto solo consulta

### Qué es
Sección dentro de la pestaña de Capacitación, debajo de la matriz. Registra la
evaluación de un colaborador para **contrato de planta**, **nueva categoría
dentro de su mismo puesto** o **cambio de puesto**.

### Flujo
1. Se elige colaborador, tipo, fecha de inicio del periodo y, salvo en contrato
   de planta, la categoría o el puesto de destino.
2. La evaluación nace **en proceso**, con un periodo de tres meses.
3. Cada mes se captura una calificación de 0 a 100. La aplicación calcula las
   fechas en que toca cada una y muestra el promedio de las capturadas.
4. Al cerrar el periodo se marca **aprobada** o **rechazada**.

### Reglas de negocio
- **Los datos del colaborador se copian al abrir la evaluación**, incluido el
  puesto actual, para que el histórico no cambie si después se corrige el
  padrón. Es la misma regla de la SPEC-007.
- **El destino no aplica en un contrato de planta**, y en ese caso el campo no
  se escribe: Firestore rechaza el documento entero si encuentra un campo en
  `undefined`.
- **Las calificaciones se guardan solo del mes ya evaluado**, con clave `'1'`,
  `'2'` y `'3'`, en vez de tres campos que nacerían vacíos, por la misma razón.
- **Las fechas de evaluación son meses de calendario, no bloques de 30 días.**
  Si el día no existe en el mes destino —un periodo que empieza el 31 de enero,
  cuyo primer corte caería el 31 de febrero— se recorta al último día del mes.
- **El promedio se calcula solo sobre las calificaciones capturadas**, así que
  un periodo a la mitad no se castiga por los meses que faltan.
- **Consultar está abierto a todos; capturar y calificar, no.**
- **Un alta nueva en el directorio estrena su evaluación de contrato de planta
  automáticamente**, con el periodo arrancando en su fecha de ingreso. Aplica
  solo al registro individual, no a la importación desde Excel, y solo a altas:
  editar a alguien que ya existe no abre nada.
- **El documento de esa evaluación automática lleva un identificador
  determinista**, `planta_<nómina>`, no uno al azar: si el alta se reintenta o
  se vuelve a guardar al mismo colaborador, se sobrescribe la misma evaluación
  en lugar de acumular duplicados.
- **Sin fecha de ingreso no se abre**, porque no habría de dónde calcular los
  tres cortes mensuales. Se avisa al guardar, para que se capture la fecha y se
  abra a mano.
- **No se puede abrir a mano un segundo contrato de planta** para quien ya
  tiene uno. Las promociones de categoría y de puesto sí pueden repetirse:
  alguien puede subir de categoría más de una vez a lo largo de su carrera.
- **Si falla la apertura automática, el colaborador queda registrado igual** y
  se avisa en el mismo mensaje. El alta es lo prioritario; en silencio, nadie
  se enteraría de que esa evaluación nunca se creó.

### Por qué `capturaPromociones` y no `ADMIN`
Quien lleva estas evaluaciones es Recursos Humanos. Volverlos `ADMIN` les daría
además permiso sobre el padrón y sobre los roles de turnos de toda la planta.
Se marca por separado, desde la pantalla de Permisos, y así las dos plazas de
RH que hoy están vacantes se habilitan el día que se ocupen sin tocar código.

---

---

# SPEC-017 — Cumpleaños del mes

- **La pestaña de Antigüedad y Vacantes muestra los cumpleaños del mes en
  curso**, en su propia tarjeta, separada de los aniversarios de ingreso. Son
  dos cosas distintas: una se felicita, la otra se reconoce por antigüedad, y
  mezclarlas obligaba a columnas que no aplican a la mitad de los renglones.
- **Solo se comparan día y mes.** El año se guarda porque sirve para la edad,
  pero se omite si no es creíble (menos de 14 o más de 90 años): hay bases
  donde el año viene como 1900 porque solo se capturó día y mes.
- **La lista va ordenada por día**, no por nómina, para que se lea como
  calendario. El cumpleaños de hoy se resalta y los que ya pasaron se atenúan.
- **Se excluye a las bajas.**
- **La plantilla registrada del Directorio lleva una columna `Cumpleaños`** a la
  derecha de `Ingreso`, en día y mes. El año no se muestra ahí: la tabla es para
  consultar la plantilla, no para calcular edades.
- **Las fechas se siembran solas** desde `src/data/cumpleanos.ts` al abrir la
  pestaña, sin que nadie suba ningún archivo. Escribe `guardarFechasNacimiento`,
  que toca únicamente `fechaNacimiento`.
- **La siembra solo rellena huecos y nunca pisa una fecha existente.** Si
  alguien corrige en el Directorio una fecha equivocada, la lista del código no
  debe devolverla en la siguiente visita.
- **Solo siembra quien puede capturar**, porque las reglas de Firestore no
  dejarían escribir a los demás. Un fallo se anota en consola, deja la pantalla
  funcionando y se reintenta en la próxima visita.
- **La siembra no da de alta a nadie:** solo escribe sobre nóminas que ya están
  en el padrón. Una fecha de cumpleaños no basta para crear una persona.
- **La lista del código no es la fuente de verdad.** Una vez sembrada, la fecha
  vive en el padrón y se edita desde el Directorio como cualquier otro dato.
- **`fechaNacimiento` se escribe de forma condicional en `construirDocumento`**,
  igual que `estatus`. Si viajara sin condición, un Excel del directorio sin la
  columna borraría todos los cumpleaños en cada importación.
- **Las fechas `AAAA-MM-DD` se parten a mano** (`utils/fechas.ts`), nunca con
  `new Date(cadena)`. Ese constructor interpreta la cadena como UTC, y en
  México todo se corre un día hacia atrás: quien nació o entró un día 1 caía en
  el mes anterior y nunca aparecía en su lista.

---

# SPEC-018 — Gráficas

- **Se dibujan a mano en SVG** (`src/components/Graficas.tsx`), sin librería de
  gráficas. El proyecto se compila desde el navegador de un teléfono, sin forma
  de correr `npm` para regenerar `package-lock.json`, y el flujo de publicación
  instala con ese archivo: una dependencia nueva rompería la compilación sin
  dejar claro por qué.
- **Cinco gráficas, cada una debajo de la sección que le corresponde:**
  antigüedad bajo Aniversarios, rotación bajo Cumpleaños, plazas bajo Abrir
  nueva vacante, incidencias bajo el Historial, y faltas bajo la Bitácora.
- **Barras verticales para lo que se lee en orden** (meses, días, tramos de
  años); **horizontales para categorías con nombres largos** (departamentos,
  tipos de incidencia), porque en vertical esas etiquetas se encimarían o
  habría que girarlas, ilegibles en un teléfono.
- **La rotación necesita `fechaBaja`**, que escribe `cambiarEstatus` y nadie
  más. `actualizadoEn` no sirve: cambia con cualquier edición, así que una baja
  vieja parecería reciente en cuanto alguien corrija el puesto de esa persona.
  Las bajas anteriores a este campo no lo traen y quedan fuera, y la gráfica lo
  dice en lugar de fingir que no hubo ninguna.
- **Las altas de la rotación salen de `fechaIngreso`, no de `creadoEn`.** El
  padrón entró de una sola importación, así que `creadoEn` amontonaría a todos
  en el mismo mes.
- **La antigüedad se cuenta sobre el padrón activo completo**, no sobre la
  tabla de aniversarios de arriba: esa solo trae a quienes cumplen este mes.
- **Las incidencias se agrupan por tipo y por departamento, no por mes**: no
  guardan fecha propia, solo el momento de captura, y las registradas antes de
  esa versión ni siquiera lo traen.
- **La gráfica de faltas va bajo demanda, con un botón.** Calcularla exige leer
  las asistencias de EPP del periodo, que son un documento por persona y por
  día; hacerlo al abrir la pestaña gastaría cuota sin que nadie lo pida.
- **Respeta los permisos del reporte de faltas**: quien no puede ver todas las
  áreas solo cuenta las de sus departamentos asignados, y se avisa en la nota.
- **Si fallan las asistencias no se grafica nada.** Sin ellas, todo turno
  terminado parecería falta, y la gráfica acusaría a gente que sí vino.

---

# SPEC-019 — Quién ve las gráficas

- **Las gráficas se reservan a quien tenga la marca `verGraficas` en el padrón**,
  más los administradores, que las ven siempre sin necesidad de aparecer
  marcados. Concentran información de toda la plantilla —rotación, faltas por
  área, incidencias por departamento— que no le toca a cualquiera que entre a
  consultar su propio turno.
- **El permiso se administra como dato, no como código**: vive en
  `colaboradores` y se enciende desde la casilla «Puede ver las gráficas» de la
  pantalla de Permisos, dentro de Sucesos y Turnos. Así, cuando se contrate a
  alguien más de Recursos Humanos, basta con marcarlo; no hay que tocar código
  ni recompilar.
- **`verGraficas` no viaja en `construirDocumento`.** Si lo hiciera, un Excel
  del directorio sin esa columna borraría el permiso en cada importación.
- **La regla está escrita una sola vez**, en `services/permisosPadron.ts`. Las
  gráficas aparecen en tres pestañas distintas; con la condición repetida tres
  veces, tarde o temprano una se quedaría atrás y alguien vería en una pestaña
  lo que no puede ver en otra.
- **Ante la duda, no se concede.** Sin nómina, fuera del padrón o sin la marca,
  las gráficas no se muestran.
- **Es un candado de interfaz**, como el resto de los de esta aplicación: quien
  tenga conocimientos puede leer los datos de todos modos. Se sostiene en que
  las reglas de Firestore no distinguen usuarios (SPEC-008).

---

# SPEC-020 — Captura acotada y fecha de incidencia

- **La incidencia lleva fecha capturada**, no la del guardado: se registra a
  veces días después de ocurrida. Viene con la de hoy puesta, que es el caso
  normal, y se puede mover. Las incidencias anteriores a este campo no la traen
  y se muestran con un guion, sin inventarles una.
- **El departamento va antes que el puesto en el Directorio**, porque de él
  dependen los puestos elegibles.
- **Los puestos se eligen de una lista acotada al departamento**, tanto en el
  Directorio como al abrir una vacante. La lista sale del propio padrón
  (`puestosPorDepartamento`), no de un catálogo escrito a mano: se mantiene sola
  conforme cambia la plantilla y nadie tiene que recompilar para dar de alta un
  puesto nuevo.
- **Se agrupa por departamento normalizado**, para que un acento o una mayúscula
  de más no parta el mismo departamento en dos listas.
- **Las bajas siguen aportando sus puestos a la lista**: quien salió deja su
  puesto vacante, y es justo el que se va a querer volver a capturar.
- **Hay una salida «Otro puesto» con captura libre.** Sin ella no se podría
  abrir una plaza que nunca ha existido, que es cuando más falta hace.
- **El puesto ya capturado se agrega a la lista aunque no figure entre los del
  departamento.** Pasa al editar a alguien con un puesto único; sin esto, abrir
  su ficha se lo borraría en silencio.
- **Limpiar el puesto al cambiar de departamento lo hace el formulario, no el
  selector.** Dentro del selector no se distingue un cambio hecho a mano de
  cargar la ficha de alguien para editarla, y abrir a un colaborador le vaciaba
  el puesto sin que nadie lo tocara.
- **Se retiró la carga masiva del padrón desde Excel**, junto con su vista
  previa y su motor de lectura. Lo que SPEC-006 describe sobre ese resumen ya no
  aplica. El alta y la corrección son uno por uno; la exportación a Excel y PDF
  del directorio sigue igual.

---

# SPEC-021 — Promociones internas: captura y seguimiento

- **El colaborador se busca escribiendo**, no eligiendo de un desplegable. El
  padrón pasa de cien personas y en un teléfono esa lista obliga a girar una
  rueda enorme. Se filtra por nombre o por nómina y se elige de los resultados.
- **La nómina elegida se guarda aparte del texto escrito.** Un nombre tecleado a
  medias nunca cuenta como selección: el campo obligatorio se satisface con la
  nómina, así que no se puede abrir una evaluación para alguien que no existe.
- **El aviso de «nadie coincide» va en el flujo normal, no flotando.** Flotando
  tapaba el botón de abrir evaluación, que queda justo debajo, y lo volvía
  intocable.
- **Las bajas no aparecen** entre las sugerencias.
- **El destino depende del tipo:** con «cambio de puesto», la lista trae todos
  los puestos del padrón, sin acotar al departamento, porque un cambio de puesto
  suele ser precisamente a otra área. Con «nueva categoría», la lista es la
  escala fija A, B, C y D, que no se deduce del padrón porque las categorías no
  se capturan como dato. Con «contrato de planta» no hay destino.
- **Semáforo de las fechas de evaluación:** en rojo si el corte ya pasó sin
  calificación, en ámbar si faltan tres días o menos. Solo alarma mientras la
  evaluación sigue en proceso y ese mes no tiene calificación; en una ya
  aprobada o rechazada sería ruido sobre algo cerrado.
- **Una calificación de cero cuenta como calificada.** Se comprueba contra
  `undefined` y no por valor verdadero, porque un cero es una nota real y
  tratarlo como vacío pintaría de rojo un mes ya evaluado.
- **Rechazar pregunta antes de escribir nada:** o el caso termina en rechazo, o
  se abren tres meses más para volver a evaluar. Son decisiones distintas y una
  de ellas vacía las calificaciones de la ronda en curso.
- **La segunda oportunidad arranca hoy**, no al día siguiente del último corte:
  ese corte suele estar en el pasado, y encadenarlo dejaría el mes 1 vencido y
  en rojo desde el primer momento, sin que nadie hubiera podido calificarlo.
- **La ronda que termina se archiva en `rondasPrevias`** antes de limpiar las
  calificaciones. Perderlas en silencio borraría la única evidencia de por qué
  se le dio otra oportunidad a alguien. La tarjeta muestra «2º periodo».

---

# SPEC-022 — Roles de turnos: autoría y faltas a la vista

- **Un rol guardado solo lo modifica quien lo creó.** Verlo lo puede cualquiera
  que entre a la pestaña; guardarlo, únicamente su autor. **Esto reemplaza la
  regla por departamento de SPEC-013** para la edición.
- **Los departamentos asignados siguen mandando sobre quién puede *crear*
  roles.** Son dos cosas distintas: crear está acotado al área, editar a la
  autoría.
- **Un administrador también puede modificar cualquier rol**, y no por
  privilegio: si el autor sale de la empresa, su rol quedaría congelado para
  siempre y no habría forma de corregir un turno mal puesto.
- **Las dos nóminas tienen que existir para que coincidan.** Comparar dos
  cadenas vacías da verdadero, y un rol antiguo sin autor registrado habría
  quedado abierto a cualquier sesión que tampoco trajera nómina.
- **Consecuencia conocida:** tres supervisores comparten impresión
  (flexografía y rotograbado). Con esta regla, si el autor del rol falta, sus
  compañeros de área ya no pueden ajustarlo; hay que pedírselo a un
  administrador. Fue la razón por la que SPEC-013 había pasado el permiso a
  departamento, y se revierte a petición expresa.
- **Cada rol muestra su número de faltas** a la izquierda del icono de Excel.
  En cero se muestra igual, en gris: no mostrar número se confundiría con «no
  se ha calculado».
- **Se cuentan con una sola lectura de asistencias** que cubre el tramo ya
  vivido de todos los roles juntos. Consultar rol por rol multiplicaría las
  lecturas de Firestore en cada visita a la pestaña.
- **Solo se consultan los días ya transcurridos**: un rol que empieza el mes que
  viene no pide nada. La falta sigue la misma regla que el reporte: hubo turno,
  el turno ya terminó y no hay revisión de EPP.
- **Si la lectura falla no se muestra número.** Sin asistencias, todo turno
  terminado parecería falta, y el contador acusaría a gente que sí vino.

---

# SPEC-023 — La fecha de la baja se captura

### Por qué

La gráfica de rotación cuenta las bajas por `fechaBaja`, un campo que se empezó
a registrar en la versión 2.11.0. Antes de eso no existía, así que **las bajas
anteriores están en el padrón sin día y quedan fuera de la gráfica**. La propia
pestaña de Antigüedad y Vacantes lo dice al pie de la rotación.

Ese dato **no se puede deducir del sistema**. `actualizadoEn` no sirve: cambia
con cualquier edición del registro, así que una baja de hace un año parecería de
ayer en cuanto alguien le corrija el puesto. Solo lo tiene quien lleve el
archivo de nómina.

Había además un defecto menor en el camino normal: `cambiarEstatus` ponía
siempre la fecha del día, y las bajas se capturan con retraso. Quien sale un
viernes y se registra el lunes quedaba fechado en lunes.

### Flujo principal — dar de baja

1. En el Directorio, `ADMIN` pulsa el icono de baja de una persona activa.
2. Se abre el diálogo con el **último día que trabajó**, propuesto como hoy.
3. Al guardar, se escriben `estatus: 'BAJA'` y esa fecha.

### Flujo principal — completar una baja vieja

1. En el Directorio, las personas de baja muestran su fecha debajo de la
   etiqueta de estatus; **las que no la traen dicen «sin fecha» en rojo**.
2. `ADMIN` pulsa el icono de calendario de esa fila.
3. Captura el día y guarda. **El estatus no se toca.**

### Reglas de negocio

- **La fecha no puede ser posterior a hoy.** Una baja futura contaría en la
  rotación a alguien que todavía está trabajando.
- **La fecha no puede ser anterior al ingreso** de esa persona.
- **Las tres comprobaciones comparan texto, no `Date`** (regla R3). El formato
  `AAAA-MM-DD` ya ordena bien, y así no se repite el error de zona horaria.
- **Corregir la fecha no pasa por reactivar y volver a dar de baja.** Ese rodeo
  falsearía el dato: al reactivar, `fechaBaja` se borra, y la nueva baja
  quedaría fechada el día de la corrección.
- **`fecharBaja` solo escribe `fechaBaja`.** No toca `estatus`; la comprobación
  de que la persona esté dada de baja se hace en la pantalla, que es la única
  que ofrece el botón.
- **`fechaBaja` no viaja en `construirDocumento`** (regla R2). Si lo hiciera,
  una importación de Excel sin esa columna borraría de un golpe todas las
  fechas capturadas a mano.
- **Al reactivar, la fecha se borra**, para no arrastrar una baja que ya no
  existe. Sigue siendo el comportamiento de `cambiarEstatus`.
- **La exportación a Excel del Directorio incluye la columna «FECHA DE BAJA»**,
  con `SIN FECHA` en las que faltan, para poder cotejar contra nómina fuera de
  la aplicación. Es solo de lectura: **la importación no escribe este campo**.

### Deuda

Las bajas viejas siguen sin fecha hasta que alguien las capture una por una. No
hay carga masiva: el dato no está en ningún archivo digital de la empresa, así
que una pantalla de carga no tendría de dónde leer.

---

# SPEC-024 — Promociones internas en su propia pestaña

### Por qué

Promociones vivía como una sección al final de Capacitación. Son dos cosas
distintas: una programa cursos para grupos, la otra sigue el avance de una
persona hacia otro puesto durante tres meses. Compartir pestaña obligaba a bajar
por toda la lista de cursos para llegar a lo que se venía a ver.

### Reglas de negocio

- **La pestaña va a la derecha de Capacitación**, de donde salió.
- **El permiso no cambia.** Sigue siendo `capturaPromociones` en el padrón, más
  los administradores (SPEC-016, regla R1). La pestaña la ve cualquiera; lo que
  el permiso decide es quién captura.
- **El módulo se suscribe por su cuenta** a promociones y al padrón. Antes
  Capacitación traía ambas cosas aunque el usuario nunca bajara a la sección; al
  separarse, cada pestaña lee solo lo suyo.
- El comportamiento descrito en la SPEC-021 —semáforo, calificaciones mensuales,
  flujo de rechazo con segunda oportunidad— **no cambia**.

### Defecto corregido al separar

La fecha de inicio propuesta se calculaba con `new Date().toISOString()`, que
convierte a UTC: después de las 18:00 en México proponía el día siguiente. Ahora
usa `hoyISO()` (regla R3).

---

# SPEC-025 — El nombre del rol de turnos se arma solo

### Por qué

Cada quien titulaba sus roles a su manera: «Flexo semana del 21 de septiembre al
3 de octubre» junto a «Tintas 21-03 oct» y «Mantenimiento Semana 39». Con la
lista creciendo, encontrar un rol dependía de recordar cómo lo había llamado su
autor, y dos roles del mismo periodo no se podían comparar de un vistazo.

### Cómo se arma

`DEPARTAMENTO · Periodo · dd/mm/aa al dd/mm/aa`

Por ejemplo: `TINTAS · Quincenal · 05/10/26 al 18/10/26`.

El rango sale de `diasDelPeriodo`, o sea del primer y el último día que el rol
realmente cubre. En un rol mensual eso es el mes natural de la fecha de inicio,
no treinta días contados desde ella.

### Reglas de negocio

- **El campo no se escribe.** Se muestra de solo lectura, para que quien
  programa vea con qué nombre va a quedar antes de guardar.
- **Se rehace con cada cambio de cabecera** y también al guardar. Así no puede
  quedar describiendo un rango o un área que ya se cambió.
- **Un rol nuevo nace con el nombre puesto**; no hay un momento en que esté
  vacío, y por eso desapareció la validación de «el rol necesita un nombre».
- **Los roles ya guardados conservan su nombre viejo** hasta que alguien los
  abra y los guarde. No se renombran solos: reescribir documentos que nadie
  pidió tocar es más riesgoso que convivir un tiempo con dos estilos.
- **Dos roles pueden llamarse igual** si comparten área, periodo y fechas. Se
  distinguen por su identificador, no por el nombre, así que no estorba; y si
  aparecen dos idénticos, probablemente sobre uno.

---

# SPEC-026 — El nombre del colaborador ocupa dos renglones fijos

### Por qué

En la cuadrícula del rol, un nombre largo se salía de su columna y se montaba
sobre las casillas de turno del lunes y el martes, tapando lo que se estaba
capturando.

### Reglas de negocio

- **La columna mide 200 px fijos**, encabezado y celdas.
- **El nombre ocupa siempre dos renglones**, aunque quepa en uno. La altura se
  reserva para que todas las filas midan igual; con altura variable, la
  cuadrícula se desalinea del encabezado de días conforme se baja.
- **Lo que no cabe en dos renglones se recorta**, y el nombre completo queda en
  el `title` de la celda.
- El número de nómina va debajo, fuera de esos dos renglones.

---

# SPEC-027 — `G8` se llama `ADM`

### Alcance

La clave de turno `G8` (08:00 – 18:00) pasa a llamarse `ADM`. El horario y todo
lo demás del catálogo queda igual.

### Reglas de negocio

- **`G8` sigue existiendo en el catálogo, pero ya no se ofrece.** Los roles
  guardados tienen celdas con `G8` escrito dentro: quitarlo las dejaría sin
  horario y sin hora de fin, y una jornada sin hora de fin **nunca contaría como
  falta** (SPEC-014). El dato viejo se lee; lo que se escribe de aquí en
  adelante es `ADM`.
- **Se muestra siempre como `ADM`**, a través de `etiquetaTurno`. Quien capture
  no llega a ver la clave vieja ni en la cuadrícula, ni en el portapapeles, ni
  en las exportaciones.
- **Una celda guardada con `G8` se ofrece aparte en su desplegable**, o el campo
  saldría vacío sobre un turno que sí está puesto.
- **Las celdas viejas se convierten al guardar**, no antes: al tocar esa celda y
  elegir `ADM`, queda escrita la clave nueva. No hay conversión masiva, por lo
  mismo que en la SPEC-025.

---

# SPEC-028 — Quién ya cursó, y quién falta

### Por qué

Un curso que se imparte a toda la planta se parte en varias sesiones, y hasta
ahora llevar la cuenta era trabajo manual: quién lo tomó, a quién le falta, qué
calificación sacó cada quien. La pestaña de Cursos mostraba el estatus del
**curso** (programado, no asistencia), no el de **cada persona**.

### Flujo principal

1. Se filtra por un curso. Sin curso elegido no hay a quién dar por cursado, así
   que las columnas de captura no aparecen.
2. La tabla de arriba lista a **quienes faltan** de tomarlo.
3. Se palomea la casilla **Cursado** de quienes asistieron, y opcionalmente su
   **Calif.**
4. Se pulsa **Actualizar**: esas personas pasan a la sección **Completados** y
   desaparecen de la tabla de arriba.

### Reglas de negocio

- **Marcar y guardar son dos momentos distintos.** Las casillas viven en
  pantalla y solo se escriben al pulsar Actualizar. Una sesión de treinta
  personas cuesta **una** escritura, no treinta, y quien se equivoca de casilla
  la desmarca sin que haya pasado nada.
- **La calificación es opcional**, porque no todos los cursos llevan examen. Se
  habilita solo al marcar Cursado: capturar una nota para alguien que no asistió
  no significa nada.
- **Una calificación fuera de 0 a 100 detiene el guardado.** Guardarla como
  vacía sin avisar perdería la captura en silencio.
- **En Completados la calificación se puede corregir**, porque el examen se
  suele calificar días después de la sesión. Ahí sí se guarda al salir del
  campo: es un dato suelto y esperar a un botón confundiría.
- **Se puede regresar a alguien a pendientes.** Marcar es un clic y equivocarse
  también; sin esa salida, una casilla mal picada dejaría a esa persona como
  capacitada para siempre.
- **Se guarda quién registró y en qué día**, y se muestra en Completados. La
  trazabilidad no la dan las reglas de Firestore (SPEC-008, regla R6) sino los
  datos que la app graba.
- **La captura la hace quien tenga permiso de captura.** Los demás ven las dos
  tablas completas, pero sin casillas, sin botón y sin poder corregir.

### Cómo se guarda

**Un documento por curso**, en la colección `cursosCompletados`, con un mapa
`nómina → registro` adentro. Con 122 personas pesa unos 7 KB, y saber quién
falta es restarle el padrón que la app ya tiene en memoria.

Un documento por persona y por curso daría 122 documentos por curso, y armar la
lista de pendientes obligaría a leerlos todos cada vez que alguien abre la
pestaña. Es el mismo error que hoy le cuesta a EPP más de un giga al mes.

**Solo se lee el curso filtrado**, y solo mientras lo está: un documento, no la
colección.

Cada nómina se escribe bajo su propia clave con `merge`, así que dos personas
capturando el mismo curso al mismo tiempo no se pisan.

### Cambios de presentación

- **Se retiraron las columnas Departamento y Estatus**, también del selector de
  columnas y de las exportaciones. Departamento sigue estando como filtro.
- **La columna de fecha ya no repite el título del curso** en pantalla: la
  columna de al lado ya lo lleva, y el título la ensanchaba de más. En las
  exportaciones sí se conserva, porque ahí pueden ir varios cursos a la vez y
  dos columnas llamadas «Fecha» se confundirían entre sí.
- **Excel y PDF exportan a los pendientes**, que es lo que la tabla muestra.

### Pendiente de configuración

La colección `cursosCompletados` es nueva. Si las reglas de Firestore del
proyecto `rrhh-pwa` nombran las colecciones una por una, hay que darle de alta
antes de que esto funcione; si usan una regla general para toda sesión
autenticada, ya queda cubierta. El síntoma de que falta es que Actualizar falle
con permiso denegado.

---

# SPEC-029 — Botones redondos y reporte de las dos tablas

### Por qué

Con el texto dentro, los botones Excel, PDF y Actualizar no cabían en la fila de
filtros y Actualizar se bajaba solo a un segundo renglón, encimado bajo los
demás.

Y el reporte servía a medias: exportaba únicamente a los pendientes, así que
para saber cómo iba un curso había que sacar el archivo y compararlo a mano
contra la pantalla.

### Reglas de negocio

- **Los tres botones son redondos, de 30 px, solo con icono**, del mismo alto
  que el resto de la fila. Verde para Excel, rojo para PDF, azul marino para
  Actualizar.
- **Actualizar conserva su número** en una marca roja sobre la esquina. Al
  quitarle el texto, sin ese número no habría forma de saber cuántos van
  marcados sin contar casillas a mano.
- **El icono gira mientras guarda.** Es la única señal que queda de que está
  trabajando, porque ya no hay texto que diga «Guardando…».
- **Con un curso filtrado, Excel y PDF llevan las dos tablas**: pendientes y
  completados. De nada sirve la lista de quién falta sin saber quién ya lo tomó.
- **Sin curso filtrado no hay completados**, y el reporte sale como antes, de
  una sola tabla.
- **En Excel son dos hojas**, «Pendientes» y «Completados». En el PDF, dos
  tablas una tras otra, cada una con su subtítulo y su total.
- **Una tabla vacía se omite** en lugar de salir con el encabezado solo. Si las
  dos están vacías, no se descarga nada y se avisa.

### Implementación

Se agregaron `exportToExcelSheets` y `exportToPDFSections` a `utils/exportUtils`
**sin tocar** `exportToExcel` ni `exportToPDF`, que siguen usando las demás
pestañas.

### Defecto corregido de paso

El nombre de los archivos exportados se fechaba con `toISOString()`, que
convierte a UTC: después de las 18:00 en México el archivo salía con la fecha
del día siguiente. Afectaba a todas las pestañas que exportan, y ya usa la fecha
local (regla R3).

---

# SPEC-030 — Los botones de exportar son redondos en toda la aplicación

### Alcance

Lo que la SPEC-029 hizo en Cursos se extiende a las seis pestañas que exportan.
Quedaron redondos, de 30 px y solo con icono, en:

| Pestaña | Botones |
|---|---|
| Directorio | Excel, PDF |
| Antigüedad y Vacantes | Excel (cumpleaños del mes) |
| Incidencias | Excel, PDF |
| Capacitación | Excel, PDF |
| Promociones | Excel |
| Cursos | Excel, PDF, Actualizar |
| Sucesos y Turnos | Excel y PDF de la bitácora; Excel y PDF del reporte de faltas |

### Reglas de negocio

- **El estilo se escribe una sola vez**, en `index.css`, como las clases
  `.btn-circular`, `.btn-circular-excel`, `.btn-circular-pdf` y
  `.btn-circular-navy`. Repetido en cada pestaña, tarde o temprano una se
  quedaría distinta de las demás. Es la misma razón por la que
  `puedeVerGraficas` vive en un solo archivo (regla R1).
- **Cursos también usa esas clases.** La copia local que tenía se retiró, o
  habría dos definiciones del mismo botón.
- **Todos llevan `title`.** Sin texto, es lo único que dice qué hacen.
- **El estado deshabilitado lo da el CSS**, con `:disabled`, y no cada pantalla
  por su cuenta con opacidad y cursor inline.
- **Los botones de exportar del reporte de faltas medían 28 px** y ahora miden
  30, como todos.

### Lo que no cambió

El icono verde de Excel que aparece **dentro de cada renglón** de la lista de
roles de turnos se queda como está: es una acción de fila, sin fondo ni forma
de botón, y redondearlo lo haría competir visualmente con los de la cabecera.

---

# SPEC-031 — Un rol de turnos solo lo modifica quien lo creó

### Qué cambia

Hasta la versión 2.19, un administrador también podía guardar el rol de otra
persona. Ya no: **la edición queda reservada a su autor, sin excepciones.** Ni
administradores ni RRHH.

### Por qué se retiró la excepción

Quien programa un turno responde por él. Que otro pudiera cambiarlo sin que se
notara rompía esa responsabilidad: el rol seguía diciendo «creado por» una
persona mientras su contenido podía ser de otra.

### Qué hace un administrador en su lugar

**Puede borrar el rol, no editarlo.**

Esa salida tiene que existir. La razón por la que un administrador podía editar
era que, si el autor dejaba la empresa, su rol quedaba congelado para siempre.
Ese problema no desaparece al retirar el permiso; empeora, porque el rol
tampoco se podría retirar de la lista. Y no es un estorbo cosmético: **la
asistencia se calcula sobre los turnos asignados** (SPEC-014), así que un rol
equivocado que nadie puede tocar seguiría generando faltas falsas contra gente
que sí vino a trabajar, indefinidamente.

Borrar no es modificar. Un administrador no puede cambiarle un turno a nadie;
lo que puede es retirar un rol que quedó mal y que su autor ya no puede
corregir. El rol se rehace desde cero, a nombre de quien lo rehizo, y la
autoría sigue siendo honesta.

### Reglas de negocio

- **Guardar un rol: solo su autor**, comparando la nómina de la sesión contra
  `creadoPorNomina`.
- **Borrar un rol: su autor o un administrador.**
- **Verlo lo puede cualquiera.** Un rol ajeno se abre en modo lectura, con el
  aviso de quién lo creó y a quién hay que pedirle el cambio.
- **Un rol sin autor registrado no lo edita nadie**, porque comparar dos
  nóminas vacías daría verdadero y lo dejaría abierto a cualquiera. Un
  administrador sí puede borrarlo, que es justo para lo que sirve esa salida.
- **Quién puede crear roles no cambia**: sigue siendo el permiso
  `departamentosTurnos` del padrón, que administra un ADMIN (SPEC-013, regla
  R1). Un administrador no se queda sin control; lo ejerce antes, decidiendo
  quién programa, y no después corrigiendo lo programado.

### Consecuencia aceptada

Si el autor de un rol está de vacaciones, incapacitado o ya no trabaja aquí,
**su rol no se puede corregir**: hay que borrarlo y rehacerlo. Con roles
semanales o quincenales el costo es bajo; con uno mensual a media captura,
significa volver a capturarlo completo.

Esta regla también deja fuera a los tres supervisores que comparten impresión,
que fue el motivo por el que el permiso se había puesto por departamento y no
por persona. Cada uno seguirá pudiendo crear roles de su área, pero no tocar el
del compañero.

---

# SPEC-032 — Revertir una falta que no lo fue

### Por qué

La asistencia se infiere: una falta es un turno asignado que ya terminó sin que
exista revisión de EPP de esa persona ese día (SPEC-014). El riesgo estaba
documentado y aceptado, y ocurrió: una semana en que no se hicieron las
revisiones dejó marcadas como ausentes a personas que sí vinieron a trabajar.

Sin una salida, el único remedio sería borrar el rol, que además falsearía todo
lo demás.

### Quién puede

**Solo quien tenga marcado `revertirFaltas` en el padrón.**

Este permiso **rompe a propósito el patrón de todos los demás: ser ADMIN no
basta.** Se pidió expresamente que lo tuviera una sola persona, y si el papel lo
concediera, cualquier administrador podría borrar faltas sin que nadie lo
hubiera decidido.

Eso no lo convierte en un candado. Un administrador administra la pantalla de
permisos y podría marcarse a sí mismo; la regla R6 ya dice que los candados de
esta app son de interfaz. **Lo que sostiene el permiso no es el bloqueo, es la
firma:** cada corrección guarda quién la hizo, cuándo y por qué, y se muestra en
una lista junto al reporte.

### Flujo principal

1. Se genera el reporte de faltas del periodo.
2. Quien tiene el permiso ve en cada renglón un botón **Sí vino**.
3. Al pulsarlo se pide el motivo, propuesto como «No se hizo la revisión de EPP,
   pero sí asistió». Sin motivo no se guarda.
4. La falta desaparece del reporte y pasa a la lista de revertidas.

### Reglas de negocio

- **Una corrección vale lo mismo que una revisión de EPP.** Se unen en un solo
  conjunto dentro de `asistenciaService`, no en cada pantalla, porque las faltas
  se cuentan en **tres** lugares: el reporte, el número junto a cada rol y la
  gráfica. Separadas, tarde o temprano uno de los tres se quedaría sin mirar las
  correcciones y seguiría acusando a quien ya se dio por presente.
- **El motivo se guarda fijo**, junto con quién corrigió y en qué día. No se
  muestra en ningún lado desde la 2.23.0, pero se sigue escribiendo: cuesta
  nada y deja el rastro en la base.
- **No se puede deshacer, ni hay lista de revertidas.** Se retiraron en la
  versión 2.23.0 a petición expresa; el razonamiento y sus consecuencias están
  en la SPEC-034.
- **No se corrige en bloque.** Van de una en una, con su motivo. Una semana
  entera sin revisiones son muchas pulsaciones, y así debe sentirse: el arreglo
  de fondo es que se hagan las revisiones, no que sea cómodo revertirlas.
- **Solo aparece sobre faltas que ya existen.** No se puede dar por presente a
  alguien que no tenía turno asignado.

### Cómo se guarda

**Un documento por mes**, en la colección `asistenciaManual`, con un mapa
`nómina_fecha → corrección` adentro. Un rango semanal o quincenal toca uno o dos
documentos; uno mensual, uno solo. Un documento por corrección obligaría a
consultar la colección entera cada vez que se cuentan faltas, que es tres veces
por visita a la pestaña.

Se esperan pocas: existen para la excepción, no para el uso diario.

### Pendiente de configuración

`asistenciaManual` es una colección nueva. Si las reglas de Firestore nombran
las colecciones una por una, hay que darla de alta, igual que
`cursosCompletados` (SPEC-028). El síntoma de que falta es que el botón **Sí
vino** falle con permiso denegado.

### Lo que esto no arregla

Sigue siendo un parche sobre el riesgo de fondo: la asistencia se infiere de una
revisión que puede no hacerse. Mientras las revisiones de EPP no sean
efectivamente obligatorias para todos, seguirán apareciendo faltas falsas y
alguien tendrá que revertirlas a mano, una por una.

---

# SPEC-033 — Calendario de cumplimiento de cursos

### Por qué

La Matriz de Capacitaciones decía qué cursos hay y a quién van dirigidos, pero
no si se están tomando. Para saber si un curso se está quedando atrás había que
entrar a Cursos, filtrar por ese curso y contar a mano los pendientes.

### Flujo principal

1. En la Matriz de Capacitaciones se pulsa el botón redondo azul marino, a la
   izquierda de Excel.
2. Se abre el calendario del mes en curso. Cada curso aparece en el día de su
   **fecha compromiso**, con su color.
3. Debajo va el detalle de los cursos de ese mes: título, instructor, cuántos
   participantes le tocan, cuántos ya lo tomaron y cuántos faltan.
4. Se navega mes a mes con las flechas.

### Reglas de negocio

### En la cuadrícula solo se pinta el día

El nombre del curso estaba dentro de la casilla del día, en una sola línea. Un
título largo —los de las NOM lo son— estiraba su columna y **desacomodaba toda
la cuadrícula**: los días dejaban de alinearse con los encabezados.

- **La casilla no lleva texto del curso.** Los días con curso se pintan de azul
  marino, con el número en blanco; el título aparece al pasar el cursor encima,
  y el detalle completo está debajo del calendario.
- **Si hay más de un curso ese día**, la casilla lo dice con «N cursos».
- **Las columnas son `minmax(0, 1fr)`, no `1fr`.** Con `1fr`, cualquier
  contenido ancho vuelve a estirar su columna. Así ya no puede pasar, aunque
  algún día se agregue algo más a la casilla.
- **El semáforo vive en el detalle de abajo**, no en la cuadrícula.

- **La fecha compromiso es `fechaFin`.** Es la que marca si un curso ya debió
  estar cubierto.
- **El color solo aparece cuando la fecha ya pasó.** Antes no hay nada que
  juzgar: todavía hay tiempo de tomarlo. Un curso que no vence sale en gris
  aunque no lo haya tomado nadie.

  | Estado | Cuándo | Color |
  |---|---|---|
  | En tiempo | La fecha compromiso no ha pasado | Gris |
  | Completo | Venció y lo tomó el grupo entero | Verde |
  | Incompleto | Venció y va del 50 % para arriba | Amarillo |
  | Atrasado | Venció y va por debajo del 50 % | Rojo |
  | Sin participantes | Venció y no le toca a nadie del padrón activo | Gris claro |

- **El 50 % exacto cuenta como incompleto, no como atrasado.** Se pidieron los
  cortes «menos del 50», «arriba del 50.1» y «100», que dejaban fuera el 50
  justo. La mitad del grupo capacitada no es lo mismo que nadie.
- **Los participantes son los del padrón activo** a quienes aplica el curso por
  departamento y puesto. Una baja deja de contar, así que un curso puede subir
  de porcentaje sin que nadie lo tome.
- **Quien tomó el curso nunca supera al total.** Si alguien cambió de área
  después de tomarlo, el conteo guardado podría pasarse del padrón de hoy, y un
  «21 de 20» se leería como un error de la aplicación.
- **Un curso sin documento de completados cuenta como cero.** Que falte no es un
  error: significa que nadie lo ha tomado todavía.

### Cómo se lee

Los completados se piden **al abrir el calendario**, no al cargar la pestaña:
mientras nadie lo consulte, no se descarga nada. Es una lectura por curso, de
unos kilobytes cada una.

### Regla compartida

`cursoAplicaA` se movió a `utils/cursos`, porque ahora la usan dos pestañas:
**Cursos** para armar la matriz de pendientes y **Capacitación** para contar
participantes. Escrita dos veces, una acabaría contando distinto de la otra y
los dos números nunca cuadrarían. Es la misma razón de la regla R1.

---

# SPEC-034 — La corrección de faltas no se audita ni se deshace

### Qué cambia

Se retiran dos cosas de la SPEC-032: la **lista de faltas revertidas** que
aparecía bajo el reporte, y el botón de **deshacer**.

El razonamiento de quien lo pidió: como el permiso lo tiene una sola persona, no
hay a quién auditar.

### Lo que se conserva, y por qué no se puede quitar

**La corrección se sigue guardando.** No es un historial aparte que se pueda
dejar de escribir: **es el dato que sostiene la reversión**. Si no se guardara,
la falta reaparecería en cuanto alguien volviera a generar el reporte. Lo que se
retiró es mostrarla, no almacenarla.

Se siguen escribiendo el motivo, la nómina y el nombre de quien corrigió, y el
día. Cuesta nada y deja el rastro en la base por si alguna vez hay que revisar
qué pasó.

### Consecuencias aceptadas

- **Un renglón mal pulsado es definitivo desde la app.** Antes bastaba la equis
  roja. Ahora hay que entrar a la consola de Firebase, colección
  `asistenciaManual`, documento del mes `AAAA-MM`, y borrar la clave
  `nómina_fecha` del mapa `registros`.
- **No hay forma de saber qué ya se corrigió.** Una persona corregida
  simplemente deja de salir en el reporte, igual que alguien que nunca faltó.
  Las dos situaciones se vuelven indistinguibles desde la aplicación.
- **La trazabilidad deja de ser visible.** La SPEC-032 sostenía este permiso en
  que cada uso quedara a la vista, porque las reglas de Firestore no distinguen
  usuarios (regla R6). Con la lista retirada, el rastro sigue existiendo en la
  base pero solo lo alcanza quien entre a la consola.

### Lo que queda como resguardo

**Una confirmación con el nombre y la fecha a la vista** antes de escribir. Es
el único freno que queda entre un clic y borrar una falta real, y por eso se
mantiene aunque el motivo ya no se pregunte.

---

# SPEC-035 — Encabezado estándar de la suite

### Alcance

El encabezado es el mismo en las cinco aplicaciones. Esta spec lo define para
RRHH, que va primero; las demás lo copian cambiando una sola línea, el nombre de
la aplicación.

### Por qué se rehizo

El anterior se centraba con `flex: 1` sobre el espacio que **sobraba** después
de los botones, no sobre la pantalla. En escritorio casi no se notaba; en un
iPhone el bloque salía corrido y «Sistema de Gestión de Recursos Humanos» se
partía en dos renglones contra el círculo de la nómina. Ocupaba 175 px antes del
primer dato: casi una quinta parte de la pantalla del teléfono.

### Estructura

Una sola fila:

`[ IMPREDIMEX / NOMBRE DE LA APP ] ······ [ nombre y puesto ] [ portal ] [ nómina ]`

- **Alineado a la izquierda, no centrado.** Centrarlo es lo que causaba el
  descuadre; alineado no hay nada con qué pelear.
- **El nombre y el puesto solo aparecen desde 760 px de ancho.** En el teléfono
  no caben sin cortarse: el caso más largo del padrón son 74 caracteres y en un
  iPhone caben unos 40.
- **En el teléfono viven en el panel** que abre la nómina, donde tienen el ancho
  completo y pueden ocupar dos renglones. Ninguno se corta, mida lo que mida.
- **La barra mide igual para todos.** Con 122 personas de nombres muy distintos,
  si el nombre viviera en la barra la altura dependería de quién entró. Es lo
  que se necesita de algo que va a vivir en cinco aplicaciones.

Resultado: **56 px de alto en el teléfono**, contra 175.

### El panel de la nómina

Se abre al tocar el círculo y contiene el nombre, el puesto, la nómina, el papel
y el estado de conexión, más **Ir al portal** y **Cerrar sesión**.

- **El apagado se mudó aquí**, así la barra se queda con dos botones en vez de
  tres. Cerrar sesión pasa a ser dos toques, y es algo que se hace una vez al
  día.
- Se cierra tocando fuera.

### Reglas de presentación

- **El logotipo va en Jost, peso 600, espaciado `.20em`.** Antes era peso 800
  sin espaciado: a ese peso las letras se tocan y se lee apretado. El aire es lo
  que da calma.
- **El nombre de la aplicación va en mayúsculas finas y grises**, peso 400,
  espaciado `.26em`. Antes competía con la marca; ahora la acompaña. Y se acortó
  a «Recursos Humanos»: con la marca encima, lo demás sobraba, y era justo lo
  que se partía en dos renglones.
- **Si Jost no carga**, el respaldo del sistema conserva el mismo peso y
  espaciado: cambia la letra, nunca el acomodo.
- **El estado de conexión es un punto sobre el círculo de la nómina**, no un
  renglón propio. Ahorra un renglón entero de alto.
- **Los botones se ven de 32 px pero responden en 44.** Con guantes, 32 px se
  falla; es la medida mínima para atinarle.
- **Botón de portal**, los cuatro cuadros. Antes no había forma de volver a la
  suite salvo apagar y entrar de nuevo.

### Fijo, opaco, y de borde a borde

- **Queda fijo arriba** (`position: sticky`) y siempre visible al desplazarse.
  Va en la capa 45: por encima de los menús desplegables del contenido (30) y
  por debajo de todas las ventanas emergentes (50 en adelante), que tienen que
  poder taparlo.
- **El nombre y el puesto van centrados de verdad.** Las dos orillas del
  encabezado —la marca y los botones— crecen igual (`flex: 1 1 0`), así lo de en
  medio queda centrado en la pantalla. Antes el bloque crecía para llenar el
  hueco y el texto se alineaba a la derecha: el nombre, más largo, parecía
  centrado, y el puesto se cargaba hacia la orilla.

- **El encabezado no lleva transparencia ni desenfoque de fondo.** Tenía 12 % de
  transparencia y `backdrop-filter`, pero **no está fijo**: se desplaza con la
  página, así que no había nada detrás que desenfocar. Lo único que lograba era
  dejar pasar el fondo y, en iOS, lavar el logotipo.
- **No usa la columna centrada del contenido.** El resto de la página se acota a
  1050 px, pero el encabezado va de borde a borde: así la marca queda en la
  esquina izquierda y los botones en la derecha, en lugar de flotar hacia el
  centro en pantallas anchas.
- **El renglón del puesto no repite el estado de conexión.** El punto sobre el
  círculo de la nómina ya lo dice, y su título lo deletrea.

### Dónde vive el estilo

En `src/index.css`, como `.hdr-marca`, `.hdr-app`, `.hdr-identidad` y
`.hdr-boton`, **no dentro del componente**. Las otras cuatro aplicaciones son
HTML de un solo archivo: copian esas reglas tal cual y quedan iguales sin
traducir nada.

El corte de 760 px se resuelve con `@media` en el CSS y no midiendo la ventana
desde JavaScript, para que las apps de HTML plano puedan usar exactamente el
mismo código.

### Pendiente

Falta aplicarlo a EPP, Mantenimiento, Calidad y Procesos. Y la barra de pestañas
sigue cortándose en el teléfono; es un problema aparte de éste.

---

# SPEC-036 — Abrir sin mostrar la contraseña de paso

### Por qué

Al pasar del portal a una app, o de una app al portal, se veía un instante la
pantalla de contraseña aunque ya hubiera sesión. Cada página arrancaba con la
contraseña a la vista y solo la escondía cuando Firebase confirmaba la sesión y
terminaba de leer la ficha del padrón: entre medio segundo y un segundo y medio.

### Cómo funciona

- **Las seis páginas de la suite comparten una nota** en el almacenamiento del
  navegador (`impredimex:sesion`), porque viven en el mismo dominio. Se escribe
  al abrir sesión y se borra al cerrarla, o cuando Firebase dice que no la hay.
- **Un bloque en la cabecera de `index.html` la lee antes de dibujar nada.** Si
  hay sesión, cubre la pantalla con la marca IMPREDIMEX mientras la app termina
  de abrir. Si no la hay, la contraseña aparece al instante.
- **Si la nota miente** —la sesión expiró—, la marca dura un momento y aparece
  la contraseña, que es lo correcto.
- **Red de seguridad:** si en 8 segundos la app no terminó de abrir, la marca se
  quita sola. Nadie se queda viendo la marca sin salida.
- **Al mostrar un error de acceso la marca se quita siempre**, o taparía el
  mensaje con el motivo.
- La marca se dibuja con `html::after`, sin tocar el contenido de la página.

### Particular de esta app

La pantalla intermedia «Verificando tu sesión…», en azul claro, se cambió por la
misma marca blanca, para que las seis apps se vean idénticas mientras abren. La
función `arranqueListo` vive en `index.html` porque debe correr antes de que
React cargue; `App.tsx` solo le avisa, con `avisarArranque`.

---

# SPEC-037 — Acceso a las aplicaciones desde el Directorio

### Por qué

Quién entra a cada app, y con qué papel, vive en el padrón de la suite: la
lista `apps` y el mapa `roles` de cada colaborador. Hasta ahora solo se
cambiaba **a mano en la consola de Firebase**, documento por documento. Eso
contradecía la regla R1 y tenía un riesgo concreto: cada app escribe sus papeles
distinto, y Mantenimiento en minúsculas. Un `ADMIN` en mayúsculas en la clave
`manto` hacía que esa persona entrara sin que la app reconociera su pantalla.

### Flujo principal

1. En el Directorio, un administrador de RRHH pulsa el icono de llave de una
   persona.
2. Se abre una ventana con las cinco apps y, en cada una, un selector: «Sin
   acceso» o uno de sus papeles.
3. Las que cambian se marcan como «cambiará». Guardar solo se habilita si hay
   algún cambio.

### Reglas de negocio

- **El catálogo de apps y papeles vive en un solo lugar**, `utils/accesosSuite`.
  Los valores se eligen de una lista, así que no hay forma de escribirlos mal.
- **Tener la app en `apps` es lo que da acceso**; `roles` solo dice con qué papel.
  Quitar el acceso borra también el papel, para que si se le devuelve la app
  entre con el que se elija entonces y no con uno viejo olvidado.
- **Con acceso pero sin papel escrito**, se muestra el que la app aplica por
  omisión, que es el que la persona tiene de verdad.
- **Un papel mal escrito se señala, no se disimula.** Cada app lo trata distinto,
  así que no hay un papel efectivo honesto que mostrar: se pide elegir uno.
- **Las apps que la pantalla no conoce se conservan.** Guardar aquí no le borra
  a nadie el acceso a una app futura que el catálogo todavía no incluya.
- **Solo se escriben `apps`, las claves de `roles` que cambian y la firma** de
  quién y cuándo. No viajan en `construirDocumento` (reglas R2 y R5).
- **Nadie puede quitarse a sí mismo el administrador de RRHH:** perdería esta
  pantalla y no habría forma de deshacerlo sin la consola.
- **El cambio se aplica al siguiente ingreso.** Quien tenga una app abierta
  debe cerrar sesión y volver a entrar.

### Quién puede

Los administradores de RRHH: el icono vive en la columna de acciones del
Directorio, que solo ellos ven. Es un poder de toda la suite —un administrador
de RRHH puede darse administrador en cualquier app—, igual que lo era tener
acceso a la consola. Como todos los candados de esta app, es de interfaz
(regla R6).

### Pendiente de comprobar

Las reglas de Firestore del proyecto de la suite no están en ningún
repositorio. Si impiden escribir `apps` o `roles` desde las apps, Guardar
mostrará que Firebase no lo permitió.

---

# SPEC-038 — Un curso puede darse en varios días salteados

### Por qué

El formulario pedía fecha de inicio y fecha de fin, como si un curso fuera un
tramo continuo. Muchos se imparten en varias sesiones y en fechas salteadas
—por ejemplo lunes, jueves y el lunes siguiente—, y eso no se podía capturar.

### Flujo principal

1. Se indica cuántas **sesiones** tiene el curso.
2. Aparece un bloque por día, con su **fecha** y su horario.
3. Los días se pueden capturar en cualquier orden: se guardan ordenados.

No hay fecha de fin: con días salteados no significa nada. Con un solo día, el
bloque se titula «Fecha del curso».

### Reglas de negocio

- **Los días se guardan en `sesiones`**, cada uno con su fecha y su horario.
- **`fechaInicio`, `fechaFin`, `horaInicio` y `horaFin` se siguen guardando**,
  derivados: el primer día, el último, y el horario del primero. No se capturan.
  El calendario de cumplimiento usa `fechaFin` como fecha compromiso (SPEC-033)
  y la matriz de Cursos usa `fechaInicio`; guardarlos evita tocar todo eso.
- **Los días nuevos heredan el horario del primero**, que es lo habitual, y se
  pueden cambiar uno por uno.
- **No se admiten dos días con la misma fecha**, ni días sin fecha.
- **Entre 1 y 20 días.** Bajar el número recorta los últimos; subirlo conserva
  lo ya capturado.
- **Los cursos anteriores siguen valiendo.** No traen `sesiones` y se muestran
  como el tramo que eran. Al editarlos se abren como uno o dos días —el de
  inicio y el de fin—, porque lo que hubiera en medio nunca se registró.

### Dónde se ve

- En la lista de Capacitación, un renglón por día con su horario, y el total de
  días cuando es más de uno.
- En la matriz de Cursos, la columna de fecha muestra el primer día y avisa
  «+N días», para que no parezca de una sola fecha.
- En el Excel se agregaron las columnas «DÍAS» y «FECHAS», con todas las fechas
  del curso. Se conservan «FECHA INICIO» y «FECHA FIN».

---

# SPEC-039 — Quitar a alguien de un curso

### Por qué

Los cursos se dirigen por departamento y puesto. A veces el mismo puesto lo
ocupan varias personas y no a todas les toca el curso, y no había forma de
decirlo: aparecían como pendientes para siempre y hundían el porcentaje de
cumplimiento sin remedio.

### Flujo principal

1. Se filtra por un curso en la pestaña de Cursos.
2. En cada renglón de la tabla de pendientes aparece una **equis pequeña y
   gris** al final, que se pone roja al pasar encima.
3. Al pulsarla se pide confirmación con el nombre y el curso.
4. Esa persona deja de aparecer como pendiente.

### Reglas de negocio

- **Solo los administradores de RRHH.** Tener permiso de captura no basta: no
  es capturar un dato, es decidir a quién le toca capacitarse. Hoy son Víctor
  Moreno y Maritza Galván (ver «Asignación de acceso»).
- **Se puede deshacer.** Bajo la tabla aparece un renglón plegado, «N sin
  asignar a este curso», con quiénes son, quién los quitó y cuándo, y un botón
  para devolverlos a pendientes. A diferencia de las faltas revertidas
  (SPEC-034), aquí sí se conserva: quitar a alguien de un curso obligatorio
  tiene consecuencias, y debe poder revisarse.
- **No cuentan en el porcentaje del calendario** (SPEC-033): se descuentan de
  los participantes. Si no, cada persona quitada bajaría el cumplimiento sin
  que nadie pudiera arreglarlo.
- **Quitar no es lo mismo que no haberlo tomado.** Quien ya lo tomó sigue en
  Completados; quitar solo aplica a pendientes.
- **El botón no lleva encabezado de columna**, para que no compita con las
  columnas de captura.

### Cómo se guarda

En el **mismo documento del curso** donde vive quién lo tomó
(`cursosCompletados/{curso}`), bajo `excluidos`, con la nómina como clave y la
firma de quién lo hizo. No cuesta ni una lectura más: la pestaña ya traía ese
documento, y el calendario ya lo leía para contar cuántos lo tomaron.

---

# SPEC-040 — Nunca una pantalla en blanco

### Por qué

La app se quedaba en blanco al abrirla con mala red, sin aviso y sin salida, y
a veces al siguiente intento funcionaba. «Blanco» no era una causa: era lo que
se veía cuando **cualquier** paso fallaba antes de alcanzar a dibujar algo.

### Los pasos que pueden fallar

1. **Descargar la aplicación.** Si el archivo no llega, nada del código corre.
2. **Verificar la sesión** con Firebase.
3. **Leer el registro de personal** en el padrón de la suite.

### Reglas de negocio

- **Ningún paso se espera para siempre.** Verificar la sesión tiene un límite
  de 12 segundos; descargar la aplicación, otro tanto. Pasado eso se muestra un
  aviso, no una pantalla quieta.
- **El aviso dice en qué paso se detuvo** y si el dispositivo reporta conexión.
  Una foto de esa pantalla basta para saber dónde buscar, en lugar de adivinar.
- **Siempre hay un botón de Reintentar.**
- **El respaldo del primer paso vive en `index.html`, no en la aplicación.**
  Tiene que funcionar justamente cuando la aplicación no funciona. React lo
  reemplaza al arrancar, así que solo se ve si nunca arrancó.
- **La marca del arranque se retira al mostrar un aviso**, o lo taparía
  (SPEC-036).

### Defecto corregido: un tropiezo de red cerraba la sesión

Si fallaba la lectura del registro de personal, se lanzaba un error de acceso y
la app **cerraba la sesión**. Un bache de dos segundos se veía igual que no
tener permiso, y obligaba a escribir la clave otra vez.

Ahora son dos errores distintos: `ErrorDeAcceso` —la cuenta no puede entrar,
y se cierra la sesión— y `ErrorDeConexion` —no se pudo preguntar, la sesión se
queda abierta y se ofrece reintentar—.

### Lo que esto no arregla

No mejora la red. Lo que cambia es que una red mala se vea como lentitud y un
aviso claro, en lugar de una aplicación rota. Que abra sin depender de la red
—guardar la aplicación en el teléfono— y que los datos sobrevivan a un corte
son trabajos aparte.

---

# SPEC-041 — La matriz de cursos no se deforma, y su fecha se puede elegir

### Por qué

Dos problemas en la misma tabla:

1. **Los títulos largos deformaban la tabla.** Los nombres de las NOM ocupan
   renglones enteros, y el ancho de cada columna lo decidía su contenido más
   largo: una sola columna se llevaba media pantalla.
2. **La columna de fecha solo mostraba el primer día.** Con cursos de varios
   días salteados (SPEC-038), ese dato se leía como si fuera la única fecha.

### Ancho y alto fijos

- **La tabla usa ancho fijo por columna.** Es lo único que impide que el
  contenido mande: sin eso, cualquier título largo vuelve a estirarla.
- **El título del curso usa dos renglones** y lo que no cabe no se ve; el
  título completo queda al pasar el cursor. Los demás encabezados son de una
  línea: el alto del renglón lo marca el título largo.
- **Todos los encabezados van centrados**, a lo alto y a lo ancho. Con
  alineación arriba o abajo, unos quedaban pegados al borde superior y otros al
  inferior según su largo, y la fila se veía despareja.
- **Hay que poner `white-space: normal` en el contenedor de adentro.**
  `index.css` fuerza `white-space: nowrap !important` en toda celda de tabla y
  eso se hereda: sin corregirlo, el texto nunca se parte en dos renglones, solo
  se corta.
- **El nombre y el puesto también se recortan a dos renglones**, o con ancho
  fijo crecerían hacia abajo y las filas quedarían de alturas distintas.

### El día de cada persona

Un curso de varias sesiones se reparte entre la gente: no todos van el mismo
día. Por eso el día **se elige en el renglón de cada participante**, no en el
encabezado, y **se guarda**.

- **Con un solo día no aparece la lista**: no hay nada que elegir.
- **Con varios, cada renglón trae la lista** con todos los días —«Día 1 ·
  2026-10-01»—, y debajo el horario de ese día.
- **Se guarda el número de día, no la fecha.** Si una sesión se mueve en el
  calendario, nadie queda apuntado a un día que ya no existe.
- **Quien no tiene día asignado se muestra en el primero.** No se escribe nada
  hasta que alguien lo cambia.
- **Solo lo cambia quien tiene permiso de captura**; los demás ven el día
  asignado sin poder moverlo.
- **Las exportaciones llevan el día de cada persona**, no el primero del curso.
- Se elige con una lista desplegable nativa y no con un menú propio: dentro de
  una tabla que se desplaza de lado, un menú flotante se corta.
- **Vive en el documento del curso**, junto a quién lo tomó, así que no cuesta
  ninguna lectura más.

---

# SPEC-042 — Agregar a alguien a un curso, y barra de filtros más corta

### Barra de filtros

Se retiran **los filtros de departamento y puesto** y **el botón de Columnas**.
Quedan el curso, la búsqueda por nombre o nómina, y los botones. Con el curso
elegido, filtrar además por área o puesto era acotar dos veces lo mismo, y las
columnas siempre son las mismas tres más las del curso.

### Agregar a alguien al curso

Los cursos se dirigen por área y puesto (`cursoAplicaA`), pero a veces asiste
alguien que no cae en ninguno de los dos. No había forma de incluirlo.

- **Un campo con autocompletado** busca por nombre o nómina y agrega a esa
  persona al curso filtrado.
- **Solo aparece con un curso elegido**: sin curso no hay a qué agregar.
- **Solo busca personal activo.**
- **Requiere permiso de captura**, como marcar quién ya lo tomó.
- **El campo se vacía al instante.** Es un botón de agregar, no un campo que
  conserve a quién se eligió.

### Reglas de negocio

- **A quien ya está en el curso no se le agrega dos veces**, y se dice por qué.
- **A quien está en «sin asignar» (SPEC-039) no se le agrega por aquí**: sería
  contradictorio. Se le devuelve desde esa lista.
- **Quitar a alguien agregado deshace el alta**, no lo anota como excluido: no
  estaba en el curso de origen, así que marcarlo como «sin asignar» diría algo
  que nunca fue cierto.
- **Se guarda en el documento del curso**, bajo `incluidos`, junto a quién lo
  tomó y a quién se le quitó. Ninguna lectura más.

---

# SPEC-043 — El padrón se lee una sola vez por sesión

### Por qué

El proyecto de la suite llegó a **52 000 lecturas en 24 horas**, contra un
límite gratuito de 50 000 al día. Al agotarse, Firestore deja de responder: las
tablas salen vacías, las listas no cargan y la app parece rota **sin ningún
error visible**. Es la explicación más probable de las fallas intermitentes que
veníamos persiguiendo, y por eso desaparecían al día siguiente: la cuota se
reinicia a medianoche.

### La causa

- **Siete pestañas se suscriben al padrón**, cada una por su cuenta.
- **Cambiar de pestaña desmonta un módulo y monta otro**, así que cada cambio
  abría una suscripción nueva y volvía a leer los 122 documentos.
- Veinte cambios de pestaña eran **2 440 lecturas de una sola persona**. Con
  quince personas y varias sesiones al día, cincuenta mil se alcanzan sin
  esfuerzo.

### La regla

- **Una sola escucha para toda la aplicación.** Quien se suscribe después
  recibe de inmediato lo último leído, sin tocar la red.
- **La escucha no se cierra al salir de la pestaña.** Cerrarla obligaría a leer
  todo otra vez al volver, que es exactamente lo que se quiere evitar. Una
  escucha abierta solo cobra los documentos que cambian, y muere al recargar la
  página.
- **Lo mismo aplica a los cursos**, que Capacitación y Cursos comparten.
- **Cualquier colección que lean dos pestañas va así.** Suscribirse por módulo
  parece inocuo y se paga en lecturas cada vez que alguien navega.

Medido con el mecanismo real: veinte cambios de pestaña pasan de 2 562 lecturas
a 122.

### Lo que esto no resuelve

Sigue habiendo una lectura completa del padrón por cada carga de página, en cada
app. Guardar los datos en el dispositivo —para que al recargar solo se pidan los
documentos que cambiaron— es el siguiente paso y está pendiente.

---

# Deuda técnica conocida

| # | Asunto | Estado |
|---|---|---|
| 1 | Sin ningún control de acceso | **Se resuelve** con la SPEC-001 |
| 2 | El padrón vive en el proyecto equivocado | **Resuelto** |
| 3 | Eliminar borra sin confirmación y se lleva los permisos | **Resuelto** |
| 4 | La importación revive bajas en silencio | **Resuelto** |
| 5 | `nombreNormalizado` no se recalcula | **Resuelto** |
| 6 | Los departamentos se escriben libres, sin catálogo | **Resuelto** |
| 7 | Iconos alojados en un servicio ajeno | **Se resuelve** con la SPEC-010 |
| 8 | Sin `CHANGELOG.md` | **Se resuelve** en esta versión |
| 9 | `favicon` apunta a `/vite.svg`, que no existe en `public/` | Pendiente |
| 9b | `tsc` no corría limpio: faltaban los tipos de Vite y `main.tsx` importaba con extensión | **Resuelto** |
| 10 | Los permisos sobreviven solo gracias al `merge` | **Resuelto**: la escritura usa una lista blanca de campos explícita |
| 11 | Repositorio público | Pendiente hasta migrar el hosting |
| 12 | Los módulos de incidencias, cursos y vacantes siguen sin especificar | Incidencias documentado en la SPEC-011; cursos y vacantes, pendiente |

---

# Asignación de acceso

Las quince cuentas existentes reciben `rrhh` en su campo `apps`.

| Papel | Quiénes |
|---|---|
| `ADMIN` | Víctor Moreno García y Maritza Galván Rivas |
| `CONSULTA` | Las trece cuentas restantes |
| `CAPTURA` | Nadie por ahora |

El puesto de Gerente de Recursos Humanos está vacante. **No se crea una cuenta
genérica para entregarla después:** el modelo de la suite descansa en que una
cuenta es una persona, y los registros de las otras apps graban nómina y nombre
de quien los hizo. Cuando se contrate, se da de alta como cualquier otra persona
y se le asigna `ADMIN`.

Desde la versión 2.26.0 estos cambios se hacen en el Directorio, con el icono
de llave de cada persona (SPEC-037). Ya no hace falta entrar a la consola de
Firebase.
