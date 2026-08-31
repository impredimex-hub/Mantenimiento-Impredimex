# CHANGELOG

Todos los cambios notables del proyecto MantoApp se documentan en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el versionado sigue [Semantic Versioning](https://semver.org/lang/es/).

---

## [1.12.2] — 2026-08-17

### Corregido
- **SPEC-026:** La persistencia de sesión (SPEC-024) usaba `localStorage`, compartido entre **todas** las ventanas del mismo navegador. Si dos personas usaban dos ventanas del mismo Chrome (por ejemplo, un solicitante y un técnico probando desde la misma PC), la sesión de quien iniciaba sesión después sobrescribía la del otro: al refrescar, la primera ventana mostraba al usuario equivocado.
- La sesión ahora se guarda en **`sessionStorage`**, exclusivo de cada pestaña o ventana, y sigue sobreviviendo al F5 dentro de esa misma ventana. El cache de datos (`mantoDB`) permanece en `localStorage`, ya que no es específico de un usuario.

---

## [1.12.1] — 2026-08-16

### Corregido
- **SPEC-025:** La prioridad **"Máquina parada"** no se distinguía visualmente en ninguna pantalla; solo "Urgente" mostraba la línea y el badge en rojo. Ahora ambas se marcan igual (texto "Urgente", fondo rojo), en las tarjetas de OT del solicitante, técnico y supervisor, y en el detalle del técnico y del supervisor.
- Se centralizó la comparación en un único helper (`esPrioridadUrgente`), para no volver a olvidar marcar alguna prioridad "alta" en una de las pantallas.
- El reporte de Excel sigue distinguiendo el texto exacto exportado ("Urgente" vs. "Urgente — Máquina parada").

---

## [1.12.0] — 2026-08-15

### Agregado
- **SPEC-024: la sesión sobrevive a F5 / recargar la página.** Antes, `currentUser` solo vivía en memoria y cualquier recarga regresaba a la pantalla de login. Ahora la sesión se guarda en `localStorage` al iniciar sesión y se restaura automáticamente al cargar la app, con el cache local de la base para renderizar de inmediato mientras Firebase reconecta.
- Botón circular pequeño y discreto (ícono de apagar) a la izquierda del indicador de conexión, visible solo con sesión activa, para cerrar sesión manualmente ahora que la recarga ya no lo hace por accidente.

### Cambiado
- Se retiró el ícono de campana del encabezado de **solicitante** y **técnico**. El acceso a notificaciones sigue disponible desde las pestañas **Avisos** / **Historial**.

### Corregido
- Las pestañas **Avisos** e **Historial** cambiaban de pantalla pero nunca llamaban a la función que llena la lista; ese renderizado dependía de pasar antes por la campana (ahora eliminada). Se corrigió para que las pestañas rendericen la lista directamente al pulsarse.

---

## [1.11.1] — 2026-08-14

### Corregido
- **SPEC-023:** En el listado de "Disponibles para tomar", una OT ya tomada por otro técnico mostraba el mismo badge **"Sin tomar"** que una realmente libre. Ahora muestra **"En proceso"** con el nombre del técnico junto al badge, y una fila "Técnico:" en el cuerpo de la tarjeta.
- El mensaje al abrir el detalle de una OT en proceso decía siempre *"relevaste al turno anterior"*, aunque el técnico que la tomó estuviera en el **mismo turno**. Ahora distingue: *"relevo de turno"* cuando el turno guardado difiere del actual, y *"mismo turno"* cuando coincide.

---

## [1.11.0] — 2026-08-13

### Agregado
- **SPEC-022: la orden pausada no se abandona.**
  - El técnico que pausó una orden **no puede tomar otras** mientras nadie la atienda. Debe retomarla, o esperar a que otro técnico la tome, lo que lo libera automáticamente.
  - En su listado aparece un **recordatorio** con el folio de la orden pausada.
  - Las órdenes pausadas sin atender se muestran a **los demás técnicos** en una sección de **prioridad**, antes de las disponibles, para que no queden olvidadas.
  - Al retomar su propia orden se registra una **nueva entrada** con la hora de reingreso y se cierra el periodo de espera, de modo que el historial conserva los dos tramos.

### Cambiado
- El botón flotante de pausar pasa de ámbar a **azul**, igual que el de crear orden.
- La validación que impide registrarse dos veces en el mismo turno ya **no aplica al reingreso** a una orden que el propio técnico había dejado.

---

## [1.10.0] — 2026-08-12

### Agregado
- **SPEC-021: pausar una orden para atender otra.** Cuando por urgencia el técnico debe dejar la orden en curso, ahora puede hacerlo sin perder la trazabilidad.
  - **Botón flotante** con el signo `=` en la lista del técnico, visible desde que toma una orden y oculto cuando no tiene ninguna en curso.
  - Al pulsarlo se pide confirmar la pausa y se listan las **órdenes disponibles**, con las urgentes y de máquina parada primero.
  - **La pausa exige tomar otra orden**: no se puede pausar sin destino.
  - Al pausar se registra la salida del técnico (su tiempo deja de contar), la orden pasa a espera con el motivo, se abre un periodo de espera para descontar ese tiempo, y se guarda el registro de la pausa con destino, autor y fecha.
  - Se agrega comentario en la orden, aviso interno al supervisor y notificación push al solicitante.
- Nuevo arreglo `ot.pausas` en el modelo de datos.

### Notas
- Si otro técnico toma la orden destino mientras la ventana está abierta, se avisa y se actualiza la lista.
- Si no hay órdenes disponibles no se permite pausar, y así se indica.
- La orden pausada conserva a su técnico y puede reanudarse registrando una actividad.

---

## [1.9.2] — 2026-08-11

### Corregido
- **SPEC-020:** La ventana de técnicos ocupados nunca aparecía. Causa: el catálogo guarda los nombres en **mayúsculas**, pero al iniciar sesión la app los convierte a **formato título**, y así quedan registrados en la orden. La comparación era exacta (`===`), por lo que jamás coincidía y ningún técnico se detectaba como ocupado.
- **SPEC-019:** El mismo error afectaba al **ranking de técnicos**, que habría mostrado cero órdenes para todos.
- Se agregó `_mismoNombre()`, que normaliza mayúsculas, acentos y espacios, y se aplicó en ambos lugares.

### Cambiado
- `avisarSiNoHayTecnicoLibre()` acepta una fecha opcional, para poder verificar el comportamiento a una hora concreta. En uso normal se omite y toma la hora del sistema.

---

## [1.9.1] — 2026-08-10

### Corregido
- **SPEC-020:** Cuando existían varios roles de turnos cubriendo las mismas fechas, el sistema tomaba el **primero de la lista** en lugar del más reciente, por lo que identificaba mal a los técnicos en turno. Detectado en pruebas: con cinco roles guardados, a las 19:22 devolvía a un técnico del turno 06–14 y omitía a uno del turno 14–21:30.
- Ahora, ante roles traslapados, gana el **guardado más recientemente** (por fecha de modificación y, en empate, por fecha de inicio).

### Agregado
- Aviso en la pantalla de Turnos cuando hay **roles que cubren las mismas fechas**, indicando cuántos son y que el sistema usa el más reciente.

---

## [1.9.0] — 2026-08-09

### Agregado
- **SPEC-020: aviso de técnicos ocupados al levantar una OT.** Cuando el solicitante crea una orden y **todos los técnicos en turno están atendiendo otra**, se muestra una ventana emergente con el nombre y puesto de cada técnico, la OT que atiende, la nave y equipo donde se encuentra, y la etapa de la intervención.
  - Si **al menos un técnico del turno está libre**, no se muestra el aviso.
  - Los técnicos en turno se determinan a partir del **rol de turnos** (SPEC-016), cruzando la asignación del día con la hora del sistema.
  - Se contemplan los **turnos que cruzan la medianoche** (T3 y N12): a las 02:00 se reconoce al técnico que entró a las 21:30 del día anterior.
  - El turno libre usa las horas capturadas manualmente.
- El catálogo `CAT_TURNOS` ahora incluye `ini` y `fin` en minutos desde medianoche.

### Notas
- Un técnico cuenta como ocupado si tiene una OT en `proceso` o `espera` de la que no ha registrado salida.
- Si no hay rol de turnos que cubra la fecha, no se puede saber quién está en turno y el aviso no se muestra. La función depende de mantener el rol actualizado.
- El aviso es informativo: la OT ya quedó registrada y el propio mensaje lo confirma.

---

## [1.8.1] — 2026-08-08

### Cambiado
- **SPEC-019:** En el módulo de OT del supervisor, las **cuatro tarjetas de estado ahora van primero**, seguidas de los filtros y después el listado. El bloque de filtros pasó al área desplazable.

### Corregido
- El listado del supervisor mostraba todas las órdenes al entrar al módulo. La causa: `initSupervisor()` llamaba a `renderSupOTs('todas')`, y pasar un filtro marcaba los filtros como aplicados. Ahora al entrar no se muestra ninguna orden hasta pulsar **Aplicar filtros**.
- El re-render disparado por datos nuevos respeta el estado de los filtros: refresca la lista solo si ya se habían aplicado.

---

## [1.8.0] — 2026-08-07

### Eliminado
- **Módulo de Alertas** del perfil de supervisor. No aportaba información distinta a la que ya muestran las tarjetas de estado y el listado de OT.
- **Módulo de Panel** como pestaña independiente. Sus cuatro tarjetas se integraron al encabezado del módulo de OT.
- Sección **"OT activas por persona"** del módulo de Técnicos.

### Agregado
- **Ranking de técnicos** en el módulo de Técnicos: compara OT tomadas, OT cerradas, tiempo promedio de respuesta y tiempo promedio de intervención. El criterio de ordenamiento es seleccionable y los tres primeros llevan medalla.
- **Filtro por mes** y **filtro por técnico** en el listado de OT del supervisor.
- Botones **Aplicar filtros** y **Limpiar**.

### Cambiado
- El listado de OT del supervisor **no muestra ninguna orden hasta aplicar los filtros**. Con los filtros vacíos, el botón muestra todas las órdenes.
- El módulo de OT es ahora la pantalla inicial del supervisor; la barra queda con cinco pestañas: OT, Técnicos, Turnos, Preventivo y Perfil.
- El histórico de **roles de turnos se limita al último mes**: los roles terminados hace más de 30 días se eliminan al abrir el módulo.
- El filtro por técnico considera a **todos los que participaron** en la OT, no solo al primero.

### Corregido
- `diffSecs2()` estaba definida dentro de `exportarExcelOTs()` y no era accesible fuera de ella. Se elevó a ámbito global, ya que el ranking la necesita para calcular tiempos.

---

## [1.7.0] — 2026-08-06

### Cambiado
- **SPEC-018: sincronización granular con Firebase.** Cambio de arquitectura para evitar agotar el ancho de banda del plan gratuito.
  - **Escritura:** `saveDB()` ahora compara contra la última versión sincronizada y escribe **solo las rutas que cambiaron**, con OTs y notificaciones guardadas elemento por elemento. Si nada cambió, no escribe.
  - **Lectura:** se sustituyó el listener único sobre `manto_db` por **un listener por colección**, y por **eventos por elemento** (`child_added`, `child_changed`, `child_removed`) en OTs y notificaciones. Modificar una OT ya no vuelve a descargar personal, máquinas, infraestructura, turnos ni preventivos.
  - **Formato:** OTs y notificaciones pasan de guardarse como arreglo a estar indexadas por `id`. La migración es automática y ocurre una sola vez.
  - El re-render se agrupa con 120 ms de retardo para no repintar en cada evento.

### Agregado
- **Archivar OT cerradas antiguas**, desde Perfil del supervisor. Mueve las OT cerradas con más de N meses (3 por omisión) a `manto_db_archivo`, donde se conservan pero dejan de cargarse en la app.

### Corregido
- Los ids de notificación se generaban con `Date.now()` y podían colisionar cuando se creaban dos en el mismo milisegundo. Ahora se garantiza su unicidad antes de escribir.

### Resultados medidos
- Cambiar una OT: de **158 KB a 436 bytes**.
- Nueva notificación: de **158 KB a 85 bytes**.
- Proyección con 15 OT diarias y 15 usuarios: de **126 GB a 1.4 GB al mes**, y con el archivado el consumo deja de crecer a partir del tercer mes.

---

## [1.6.2] — 2026-08-05

### Agregado
- **SPEC-017:** Botón **Exportar a PDF** en el programa preventivo, en sustitución del de Excel.
  - Genera el documento ya formateado, con las máquinas en **texto** en lugar de listas desplegables.
  - Hoja configurada en **carta horizontal** (`letter landscape`) con márgenes de 8 mm, para que el calendario completo entre en una sola página.
  - Incluye el recuadro de control y las cuatro firmas.
  - Si el navegador bloquea la ventana emergente, se avisa al usuario.

### Cambiado
- Los botones de acción se redujeron un **20 %** y quedaron **centrados**.
- El calendario se **expande y alinea** al mismo ancho que los botones: ambos comparten un contenedor centrado del 80 % del ancho.
- Los anchos de columna pasaron de píxeles fijos a **porcentajes**, conservando la proporción original y manteniendo idénticas las columnas de los siete días.

### Eliminado
- Exportación a Excel del programa preventivo, reemplazada por la de PDF. La exportación a Excel del módulo de Turnos no cambia.

---

## [1.6.1] — 2026-08-04

### Cambiado
- **SPEC-017:** Ajustes de formato del programa preventivo para acercarlo al documento impreso.
  - Se eliminaron los **colores de fondo** (verde del mes, amarillo del año, naranja de los días y gris de las celdas fuera del mes) y el **texto en rojo** del recuadro de control. El documento queda en blanco y negro.
  - Los renglones **Código**, **Creado** y **Actualizado** ahora tienen la **misma altura**, mediante una tabla anidada en el recuadro de control.
  - Las columnas de los **siete días miden exactamente lo mismo**, con `table-layout:fixed` y anchos declarados en un `colgroup`. Antes el domingo se veía más ancho.
  - Las **firmas del pie se alinean con el calendario**, repartidas en cuatro columnas iguales dentro del mismo contenedor de la tabla.
  - El campo *Actualizado* del encabezado ahora muestra la fecha fija del formato, **03/09/2026**, en lugar de la fecha del último guardado.

### Notas
- En la lista de programas, la fecha del último guardado se etiqueta ahora como **"Guardado"**, para no confundirla con el *Actualizado* del formato.

---

## [1.6.0] — 2026-08-03

### Agregado
- **SPEC-017: Módulo Preventivo.** Nueva pestaña **"Preventivo"** en la barra del supervisor, entre Turnos y Alertas.
  - Reproduce el formato controlado **F20-PR-MA-01 Rev. C**, "Programa mensual de mantenimiento preventivo".
  - **Lista desplegable de mes** y **lista desplegable de año** en el encabezado.
  - Cuadrícula de siete días (lunes a domingo) con tres turnos por semana y una **lista desplegable de máquinas** por cada día y turno.
  - **Numeración automática de los días** según el mes y año seleccionados; las semanas arrancan en lunes y el número de semanas se ajusta al mes (4, 5 o 6).
  - Pie con las cuatro firmas del formato: Planeación, Jefe de producción, Gerente de operaciones y Jefe de Mantenimiento.
  - Exportación a Excel, edición y eliminación del programa.
- Nueva colección `DB.preventivos` en el modelo de datos, sincronizada con Firebase.

### Notas
- Las asignaciones se guardan por fecha y turno, así que cambiar de mes o año no arrastra datos de otro periodo.
- Solo se ofrecen máquinas activas del catálogo.
- El campo *Actualizado* del encabezado muestra la fecha del último guardado; código, revisión y fecha de creación son fijos.

---

## [1.5.1] — 2026-08-02

### Agregado
- **SPEC-016:** Copiar y pegar turnos en el rol de turnos, para agilizar la captura cuando una persona repite el mismo horario.
  - Botón **Copiar** en cada celda con turno asignado.
  - Botón **Pegar** en cualquier celda mientras haya algo copiado.
  - Botón **Pegar fila**, que aplica el turno copiado a **todos los días del periodo** de esa persona (con confirmación).
  - Botón **Limpiar fila**, que borra los turnos de esa persona en el periodo.
  - Barra indicadora que muestra el turno copiado, con opción de cancelar.

### Notas
- El portapapeles copia también las horas del **turno libre**.
- Se guarda una copia independiente, así que editar la celda origen no altera las celdas pegadas.
- El portapapeles no se persiste: vive solo durante la edición.

---

## [1.5.0] — 2026-08-01

### Agregado
- **SPEC-016: Módulo de Turnos.** Nueva pestaña **"Turnos"** en la barra del supervisor, entre Técnicos y Alertas.
  - Permite crear **roles de turnos** por periodo: semanal (7 días), quincenal (14 días) o mensual (mes completo).
  - Cuadrícula con una fila por persona activa de Mantenimiento y una columna por día, con desplazamiento horizontal y columna de personal fija.
  - **Catálogo de 7 turnos:** 06:00–14:00, 14:00–21:30, 21:30–06:00, 06:00–18:00, 18:00–06:00, 08:00–18:00 y horario libre con captura manual de entrada y salida.
  - Celda vacía = descanso.
  - Exportación del rol a Excel, edición y eliminación.
- Nueva colección `DB.turnos` en el modelo de datos, sincronizada con Firebase.

### Notas
- El módulo es de **planeación**: no altera el campo `turno` del catálogo de personal ni la función `turnoActual()`, que sigue calculando el turno por la hora del sistema al tomar una OT.
- Las horas del turno libre se validan en formato HH:MM de 24 horas.

---

## [1.4.0] — 2026-07-31

### Agregado
- **SPEC-015:** Los tipos de problema ahora dependen del **tipo de servicio** de la OT. Nueva función `getTipoFallas(tipoServicio)`.
  - **MTTO-MAQ-PROD** (sin cambios, 7 opciones): Mecánico, Eléctrico, Neumático, Electrónico, Hidráulico, Parámetros, Infraestructura.
  - **MTTO-INFRAESTRUCTURA** (8 opciones): Eléctrico, Hidráulico, Mobiliario, Pintura, Edificios, Fontanería, Alarmas, Otros.
  - **MTTO-SEGURIDAD** (9 opciones): Mecánico, Eléctrico, Neumático, Electrónico, Hidráulico, Guardas, Infraestructura, Riesgo de incendio, Riesgo de caídas.

### Corregido
- Las OT de Infraestructura y Seguridad mostraban las mismas opciones de tipo de problema que las de maquinaria de producción, que no correspondían a su naturaleza.

### Notas
- Las OT ya registradas conservan y muestran su tipo de problema original, aunque ese valor no exista en el nuevo catálogo de su tipo.
- El tipo de problema sigue siendo inmutable una vez guardado.

---

## [1.3.0] — 2026-07-30

### Cambiado
- **SPEC-011:** Las OT de **MTTO-INFRAESTRUCTURA** y **MTTO-SEGURIDAD** vuelven a notificar a **todo el personal activo del departamento de Mantenimiento**, igual que MTTO-MAQ-PROD.
- Se desactivó el enrutamiento diferenciado por puesto (Jefe, Auxiliar y Analista) introducido en 1.1.0. Decisión operativa.
- La función `getNominasByTipoServicio()` se conserva como punto único de cambio: ahora retorna todo el departamento para cualquier tipo. Si se requiere reactivar el filtrado, solo se modifica esa función.
- SPEC-009 actualizada: "Nueva OT" y "OT rechazada" ahora indican todo el departamento como destinatario.

### Notas
- Aplica a los dos eventos enrutados: creación de OT y rechazo de cierre.
- Las notificaciones dirigidas al solicitante (técnico asignado, OT concluida, OT en espera) no cambian.

---

## [1.2.0] — 2026-07-29

### Agregado
- **SPEC-012:** Botón **"Fin de mi turno"** para que el técnico cierre su participación en una OT durante el paro de fin de semana. Disponible únicamente de **sábado 21:20 a lunes 06:00**; fuera de esa ventana no se muestra. Registra `fechaSalida` en la entrada del técnico y deja la OT abierta para el siguiente turno.
- **SPEC-013:** Registro del tiempo en espera. Al suspender una OT se guarda el periodo en `ot.esperas` con hora de inicio y fin, y ese tiempo se **descuenta** del tiempo de intervención del técnico. Nueva columna "Tiempo en espera" en el reporte.
- **SPEC-014:** Nueva columna "Tiempo validación solicitante", que mide desde que Mantenimiento concluyó hasta que el solicitante validó el cierre.

### Cambiado
- El tiempo de intervención del **último técnico** ahora corta en `fechaCierreMantenimiento` en lugar de `fechaCierre`. Antes absorbía la espera de validación del solicitante, que no dependía de él.
- El corte del tiempo de intervención sigue esta prioridad: salida propia registrada (SPEC-012) → entrada del siguiente técnico (relevo continuo) → cierre de mantenimiento si es el último.
- El reporte de Excel pasa de 30 a 32 columnas.

### Notas
- La regla operativa de **relevo continuo** (el técnico no se va hasta que el del siguiente turno toma la OT) hace que el tiempo de intervención entre semana refleje la realidad sin necesidad de registrar salida.
- El tiempo total de la orden sigue midiéndose de la creación a la validación del solicitante.

---

## [1.1.0] — 2026-07-27

### Agregado
- **SPEC-011:** Enrutamiento de notificaciones push de nueva OT según el tipo de servicio.
  - Nueva función `getNominasByTipoServicio(tipo)` que determina los destinatarios del push según `ot.tipo`.
  - **MTTO-MAQ-PROD:** notifica a todo el departamento de Mantenimiento activo (comportamiento previo, sin cambios).
  - **MTTO-INFRAESTRUCTURA** y **MTTO-SEGURIDAD:** notifican únicamente a quienes tengan puesto de Jefe, Auxiliar o Analista de Mantenimiento.
  - El filtro identifica a los destinatarios **por puesto, no por número de nómina**, para que sobreviva a la rotación de personal: el reemplazo recibe las notificaciones automáticamente con solo tener el puesto correcto en el catálogo.
  - La comparación de puesto ignora mayúsculas, acentos y espacios extra.

### Cambiado
- La creación de OT ahora llama a `getNominasByTipoServicio(ot.tipo)` en lugar de `getNominasTecnicos()` directamente para decidir a quién notificar.
- SPEC-009 actualizada: la regla "Nueva OT" ahora remite a SPEC-011, y se documentó que "OT rechazada" envía notificación interna al técnico y supervisor más push enrutado por tipo de servicio (SPEC-011).

### Notas
- El filtro afecta solo la **entrega del push**, no la visibilidad de la OT: cualquier técnico sigue viendo y pudiendo tomar todas las OTs abiertas en la app.
- Solo se notifica a personal con estatus `activo` en el depto MANTENIMIENTO.

---

## [1.0.3] — 2026-06-29

### Agregado
- **Soporte completo de PWA (Progressive Web App):**
  - Archivo `manifest.json` con metadatos de la aplicación
  - Íconos personalizados de IMPREDIMEX (192x192 y 512x512)
  - Meta tags en `<head>` para soporte Android e iOS
- En Android Chrome ahora aparece la opción "Instalar app" (en lugar de solo "Agregar acceso directo")
- Una vez instalada como PWA, la app se ve sin barra de URL de Chrome (pantalla completa)
- Las notificaciones push ahora llegan correctamente en Android aunque Chrome esté cerrado

### Corregido
- Notificaciones push en Android no llegaban cuando Chrome estaba cerrado porque la app estaba instalada como acceso directo de Chrome (no como PWA real). Solución: agregar `manifest.json` y meta tags para convertir la aplicación en PWA instalable.

---

## [1.0.2] — 2026-06-28

### Corregido
- **SPEC-009:** Suscriptores marcados como "unsubscribed" en OneSignal Dashboard no se re-activaban automáticamente al volver a entrar a la app. Solución: agregar llamada explícita a `OneSignal.User.PushSubscription.optIn()` en cada login, tanto en la primera inicialización como en logins subsecuentes.

---

## [1.0.1] — 2026-06-28

### Corregido
- **SPEC-001:** Race condition en autenticación de Firebase. La app intentaba leer la base de datos antes de que `signInAnonymously()` terminara, causando `permission_denied` en dispositivos nuevos o con conexión lenta. Ahora se usa `onAuthStateChanged` para garantizar que la auth esté lista antes de iniciar los listeners.
- **SPEC-009:** Notificaciones push al solicitante no llegaban (solo funcionaba la primera notificación a técnicos). Causa: `getNominaByName(ot.solicitante)` retornaba `null` por comparaciones frágiles de nombres (espacios, acentos, mayúsculas). Solución: usar el campo `ot.nomina` directamente que ya está guardado en cada OT al crearse.

### Cambiado
- Función `notifyPush()` en eventos "tomar OT", "concluir OT" y "OT en espera" ahora usa `ot.nomina` directamente en lugar de buscar por nombre

---

## [1.0.0] — 2026-06-27

### 🎉 Primera versión estable en producción

#### Agregado
- **Sistema completo de notificaciones push** con OneSignal + Cloudflare Workers
- **Autenticación anónima de Firebase** para reforzar seguridad
- **Reglas de seguridad reforzadas** en Firebase Realtime Database
- **Documento de especificaciones formales** (`SPECS.md`) bajo metodología SDD
- **Documento de transición** (`HANDOVER.md`) para futuros desarrolladores
- **README.md** profesional del proyecto
- **Cloudflare Worker proxy** (`mantoapp-push`) para mantener la REST API Key segura
- **Reinicio automático del contador de folio** (SPEC-002): si todas las OTs son eliminadas, el siguiente folio será `#000001`

#### Cambiado
- `notifyPush()` ahora llama al Worker de Cloudflare en lugar de OneSignal directamente
- `saveFCMToken()` ahora se invoca después del login (antes se llamaba antes y `currentUser` era null)
- `saveFCMToken()` ahora limpia los tags previos de OneSignal antes de aplicar los nuevos
- `logout()` ahora limpia los tags de OneSignal al cerrar sesión
- Service Worker path en OneSignal: ahora usa ruta absoluta `/Mantenimiento-Impredimex/OneSignalSDKWorker.js`

#### Eliminado
- Archivo `firebase-messaging-sw.js` (ya no se usaba, interfería con el Service Worker de OneSignal)
- REST API key de OneSignal eliminada del frontend (ahora vive solo en Cloudflare Worker)

#### Seguridad
- 🔒 La REST API key de OneSignal ya no está expuesta en el HTML público
- 🔒 Reglas de Firebase ahora requieren autenticación (`auth != null`)
- 🔒 Agregado índice en Firebase para campos `status` y `folio` (mejora rendimiento)

---

## [0.9.0] — 2026-06-26

### Versión pre-release con notificaciones funcionando

#### Agregado
- Integración inicial de OneSignal Web SDK v16
- Web Configuration de OneSignal completada
- Tags por nómina y rol al hacer login

#### Conocidos en esta versión
- ⚠️ Notificaciones bloqueadas por CORS (resuelto en 1.0.0 con Cloudflare Worker)
- ⚠️ API key expuesta en frontend (resuelto en 1.0.0)

---

## [0.8.0] — 2026-06-25

### Refinamiento de UI y panel supervisor

#### Agregado
- Panel de supervisor con 4 KPIs (abiertas, proceso, espera, por validar)
- Detalle por técnico con historial de OTs
- Tiempos promedio de respuesta calculados
- Exportación a Excel desde panel supervisor

#### Cambiado
- Diseño visual unificado con azul marino `#1B3A6B`
- Topbar blanco con sombra
- Tabbar estilo WhatsApp con píldora activa
- Iconos de logout en todas las pestañas

---

## [0.7.0] — 2026-06-24

### Catálogos administrativos

#### Agregado
- Hub de administrador con módulos: Personal, Tipo de servicio, Naves, Máquinas, Infraestructura
- Catálogo de tipos de servicio (3 tipos)
- Catálogo de naves (4 naves: A1, A2, B16, B17)
- Catálogo de máquinas (48 equipos)
- Catálogo de infraestructura (53 áreas)
- CRUD completo para todos los catálogos

---

## [0.6.0] — 2026-06-23

### Flujo multi-técnico

#### Agregado
- Soporte para múltiples técnicos asignados a la misma OT
- Cada técnico requiere confirmación independiente del solicitante
- Botón "Técnico en máquina" por cada técnico asignado

#### Cambiado
- Tipo de problema ahora es inmutable una vez guardado
- 7 opciones fijas de tipo de problema

---

## [0.5.0] — 2026-06-22

### Flujo de conclusión y validación

#### Agregado
- Modal de "error operativo" al concluir OT
- Validación de cierre por solicitante
- Alerta visual cuando hay error operativo reportado
- Botón de rechazar cierre (regresa la OT al pool disponible)
- Notificaciones internas al solicitante al concluir

---

## [0.4.0] — 2026-06-20

### Tipos de servicio especiales

#### Agregado
- MTTO-SEGURIDAD con 4 casillas de tipo de riesgo (en lugar de equipo)
- Validación específica para tipo de servicio de seguridad

---

## [0.3.0] — 2026-06-18

### Sincronización en tiempo real

#### Agregado
- Listeners de Firebase para sincronización en tiempo real
- Indicador visual de estado de conexión
- Cambios instantáneos visibles para todos los usuarios

---

## [0.2.0] — 2026-06-15

### Estructura básica de 4 roles

#### Agregado
- Sistema de login con nómina y contraseña
- 4 roles diferenciados (solicitante, técnico, supervisor, admin)
- Pantallas iniciales por rol
- Catálogo inicial de personal

---

## [0.1.0] — 2026-06-10

### Versión inicial del proyecto

#### Agregado
- Estructura inicial del HTML
- Configuración de Firebase Realtime Database (modo prueba)
- Repositorio en GitHub
- GitHub Pages habilitado
- Pantalla de login básica

---

## Convenciones para futuros cambios

A partir de la versión 1.0.0, este proyecto sigue **metodología SDD (Spec-Driven Development)**. Cada cambio nuevo debe:

1. ✅ Tener una entrada en `SPECS.md` antes de implementar
2. ✅ Tener una entrada en este CHANGELOG.md
3. ✅ Tener comentario en código referenciando la spec: `// SPEC-XXX: descripción`

### Tipos de cambios

- `Agregado` para funcionalidades nuevas
- `Cambiado` para cambios en funcionalidades existentes
- `Obsoleto` para funcionalidades que serán removidas pronto
- `Eliminado` para funcionalidades removidas
- `Corregido` para corrección de bugs
- `Seguridad` para cambios relacionados con seguridad

### Versionado

- **MAJOR** (X.0.0) — Cambios incompatibles con versiones previas
- **MINOR** (0.X.0) — Nuevas funcionalidades compatibles
- **PATCH** (0.0.X) — Correcciones de bugs compatibles

---

*Última actualización: 13 de agosto de 2026*
