# Changelog

Todos los cambios relevantes de la aplicación de Recursos Humanos (`rrhh-pwa`).

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).
Versionado según [Versionado Semántico](https://semver.org/lang/es/).

---

## [2.32.0] — 2026-09-24

### Corregido

- **Cambiar de pestaña volvía a leer el padrón completo** (SPEC-043). Siete
  pestañas se suscribían por su cuenta y cada cambio releía los 122
  documentos: veinte cambios eran 2 440 lecturas de una sola persona. El
  proyecto de la suite llegó a 52 000 lecturas en un día, contra un límite de
  50 000. Ahora todas comparten una sola escucha y la lista ya leída se
  entrega al instante.
- Lo mismo con los cursos, que Capacitación y Cursos compartían.

### Notas

Al agotarse la cuota, Firestore deja de responder y las tablas salen vacías sin
error visible. Es la explicación más probable de las fallas intermitentes, y de
que desaparecieran al día siguiente.

---

## [2.31.0] — 2026-09-24

### Agregado

- **Se puede agregar a una persona a un curso** aunque no le toque por área ni
  por puesto (SPEC-042), con un campo de autocompletado que busca por nombre o
  nómina. Solo aparece con un curso filtrado y con permiso de captura.

### Quitado

- **Los filtros de departamento y puesto** y **el botón de Columnas** de la
  pestaña de Cursos. Con un curso elegido, filtrar por área o puesto era
  acotar dos veces lo mismo.

### Notas

Quitar a alguien que fue agregado a mano deshace el alta, en lugar de anotarlo
como «sin asignar»: nunca estuvo en el curso de origen.

---

## [2.30.0] — 2026-09-24

### Corregido

- **La matriz de cursos se deformaba con títulos largos** (SPEC-041). Ahora las
  columnas tienen ancho fijo y el título del curso usa dos renglones; lo que no
  cabe no se ve y el título completo queda al pasar el cursor. El nombre y el
  puesto también se limitan a dos renglones, y todos los encabezados van
  centrados a lo alto y a lo ancho.

### Agregado

- **Cada participante tiene su día de curso.** Con cursos de varios días
  salteados, el renglón de cada persona trae una lista con todos —«Día 1 ·
  2026-10-01»— y lo que se elija se guarda. Quien no tenga día asignado se
  muestra en el primero, y las exportaciones llevan el día de cada quien.

---

## [2.29.1] — 2026-09-23

### Cambiado

- **«¿Cuántos días dura el curso?» pasa a «Sesiones del curso»**, y la etiqueta
  se separó del campo: el asterisco quedaba pegado al recuadro.
- **Las pestañas quedan en el orden Promociones, Capacitación y Cursos.**
  Capacitación programa los cursos y Cursos les da seguimiento, así que van
  juntas.

---

## [2.29.0] — 2026-09-23

### Agregado

- **Nunca una pantalla en blanco** (SPEC-040). Si algo se traba al abrir, sale
  un aviso con el paso exacto donde se detuvo, si el dispositivo reporta
  conexión, y un botón de Reintentar. Cubre los tres pasos: descargar la
  aplicación, verificar la sesión y leer el registro de personal.
- Ningún paso espera para siempre: 12 segundos y se avisa.

### Corregido

- **Un tropiezo de red cerraba la sesión.** Si fallaba la lectura del registro
  de personal, se trataba como falta de acceso y sacaba a la persona, que tenía
  que escribir la clave de nuevo. Ahora se distingue no poder preguntar de no
  tener permiso: lo primero deja la sesión abierta.

### Notas

Esto no mejora la red. Hace que una red mala se vea como lentitud y un aviso
claro, en vez de una aplicación rota. Que la app abra sin depender de la red y
que los datos sobrevivan a un corte son los siguientes pasos.

---

## [2.28.1] — 2026-09-23

### Corregido

- **El calendario de cumplimiento se desacomodaba** cuando un curso tenía
  título largo: el nombre iba dentro de la casilla del día en una sola línea y
  estiraba su columna (SPEC-033). Ahora la casilla solo se pinta de azul marino
  cuando ese día hay curso, con el número del día en blanco; el nombre está en
  el detalle de abajo y al pasar el cursor encima. Las columnas quedaron con
  ancho fijo para que no vuelva a ocurrir.

---

## [2.28.0] — 2026-09-23

### Agregado

- **Se puede quitar a alguien de un curso** (SPEC-039), para cuando el mismo
  puesto lo ocupan varias personas y no a todas les toca. Una equis pequeña y
  gris al final de cada renglón de pendientes, solo para administradores de
  RRHH.
- **Se puede deshacer:** bajo la tabla aparece «N sin asignar a este curso»,
  plegado, con quién los quitó y cuándo.

### Cambiado

- **El calendario de cumplimiento descuenta a los quitados** de los
  participantes. Si no, hundirían el porcentaje sin que nadie pudiera
  arreglarlo.

### Notas

Se guardan en el mismo documento del curso donde vive quién lo tomó, así que no
cuesta ninguna lectura más.

---

## [2.27.0] — 2026-09-23

### Cambiado

- **Un curso puede darse en varios días, y salteados** (SPEC-038). El
  formulario pregunta primero cuántos días dura y muestra un bloque por día,
  con su fecha y su horario. Desapareció la fecha de fin: con días salteados no
  significa nada.
- La lista de Capacitación muestra un renglón por día; la matriz de Cursos
  avisa «+N días»; el Excel lleva las columnas «DÍAS» y «FECHAS».

### Notas

- `fechaInicio`, `fechaFin` y el horario se siguen guardando, derivados del
  primer y el último día. El calendario de cumplimiento y la matriz de Cursos
  no cambiaron.
- Los cursos ya registrados siguen valiendo; al editarlos se abren como uno o
  dos días, el de inicio y el de fin.

---

## [2.26.1] — 2026-09-22

### Cambiado

- **Las pestañas ya no llevan icono**, solo el nombre.

---

## [2.26.0] — 2026-09-22

### Agregado

- **Acceso a las aplicaciones desde el Directorio** (SPEC-037). Un icono de
  llave en cada persona abre una ventana con las cinco apps de la suite, y en
  cada una se elige «Sin acceso» o su papel. Antes solo se podía cambiar a mano
  en la consola de Firebase.
- Los papeles se eligen de una lista con el valor exacto que espera cada app,
  incluidas las minúsculas de Mantenimiento.
- Un papel mal escrito que ya exista se señala para corregirlo.

### Notas

- Las apps que la pantalla no conoce se conservan: guardar no le borra a nadie
  el acceso a una app futura.
- Nadie puede quitarse a sí mismo el administrador de RRHH.
- El cambio se ve al siguiente ingreso de la persona.

---

## [2.25.0] — 2026-09-21

### Corregido

- **Al llegar desde el portal ya no se ve la pantalla de contraseña de paso**
  (SPEC-036). Si hay sesión, aparece la marca IMPREDIMEX mientras la app
  termina de abrir; si no la hay, la contraseña aparece al instante.

### Cambiado

- La pantalla «Verificando tu sesión…» pasa a ser la misma marca blanca que
  muestran las demás apps al abrir.

---

## [2.24.2] — 2026-09-20

### Cambiado

- **El encabezado queda fijo arriba y siempre visible** al desplazarse. Va en
  la capa 45, por encima de los menús desplegables y por debajo de las
  ventanas emergentes.

### Corregido

- **El nombre y el puesto no quedaban centrados.** El bloque crecía para llenar
  el hueco entre la marca y los botones, y el texto se alineaba a la derecha:
  el nombre, más largo, parecía centrado, y el puesto se cargaba hacia la
  orilla. Ahora las dos orillas del encabezado miden lo mismo y el nombre y el
  puesto comparten eje en el centro de la pantalla.

---

## [2.24.1] — 2026-09-20

### Corregido

- **El encabezado se veía lavado en la parte superior**, sobre todo en iPhone.
  Tenía 12 % de transparencia y desenfoque de fondo, pero no está fijo: se
  desplaza con la página, así que el efecto de cristal no tenía nada detrás que
  desenfocar. Solo dejaba pasar el fondo y suavizaba el logotipo. Ahora es
  blanco opaco.

### Cambiado

- **El encabezado va de borde a borde**, sin la columna centrada de 1050 px que
  usa el resto de la página. La marca queda en la esquina izquierda y los
  botones en la derecha, como en EPP.
- **Se retiró el «En línea» del renglón del puesto.** El punto verde sobre la
  nómina ya lo dice, y su título lo deletrea.

### Notas

Las pestañas y las tarjetas conservan el mismo efecto de cristal. No se tocaron
porque ahí sí se ven bien, pero si algún día se notan lavadas, el arreglo es el
mismo.

---

## [2.24.0] — 2026-09-20

### Cambiado

- **Encabezado rehecho, y queda como estándar de la suite** (SPEC-035). Pasa de
  175 px a 56 px de alto en el teléfono.
- **Alineado a la izquierda.** El anterior se centraba sobre el espacio que
  sobraba después de los botones, no sobre la pantalla, y por eso en el iPhone
  salía corrido y el nombre de la app se partía en dos renglones.
- **El logotipo va en Jost**, peso 600 con espaciado amplio; el nombre de la
  app, en mayúsculas finas y grises. Si la fuente no carga, el respaldo del
  sistema conserva el mismo peso y acomodo.
- **El estado de conexión es ahora un punto sobre el círculo de la nómina**, en
  lugar de un renglón propio.
- **Los botones redondos se ven de 32 px pero responden en 44**, que es la
  medida mínima para atinarles con guantes.

### Agregado

- **Panel al tocar la nómina**, con el nombre, el puesto, la nómina, el papel y
  el estado. Ahí el nombre tiene ancho completo y no se corta nunca: el caso más
  largo del padrón son 74 caracteres y en un iPhone caben unos 40. En pantalla
  ancha el nombre y el puesto siguen a la vista en la barra.
- **Botón de portal.** Antes no había forma de volver a la suite salvo apagar y
  entrar de nuevo.
- Cerrar sesión se mudó al panel, así la barra se queda con dos botones.

### Notas

El estilo vive en `src/index.css` como clases `.hdr-*`, no dentro del
componente, y el corte de pantalla ancha se resuelve con `@media`. Las otras
cuatro apps son HTML de un solo archivo: copian esas reglas tal cual.

Falta aplicarlo a EPP, Mantenimiento, Calidad y Procesos.

---

## [2.23.0] — 2026-09-19

### Quitado

- **La lista de faltas revertidas** que aparecía bajo el reporte (SPEC-034).
- **El botón de deshacer** una corrección. Para devolver una falta ahora hay que
  entrar a la consola de Firebase: colección `asistenciaManual`, documento del
  mes, borrar la clave `nómina_fecha`.
- Del servicio se retiraron `obtenerManualesDetalle` y `quitarAsistenciaManual`,
  que ya no usaba nadie.

### Cambiado

- **Ya no se pregunta el motivo**, porque no quedaba dónde leerlo. En su lugar
  hay una **confirmación con el nombre y la fecha a la vista**: sin deshacer,
  es el único freno entre un clic y borrar una falta real.
- El motivo se sigue guardando, fijo, junto con quién corrigió y el día. No se
  muestra, pero cuesta nada y deja el rastro en la base.

### Notas

La corrección **se sigue almacenando y no puede dejar de hacerlo**: no es un
historial aparte, es el dato que sostiene la reversión. Si no se guardara, la
falta reaparecería al regenerar el reporte. Lo que se retiró es mostrarla.

---

## [2.22.1] — 2026-09-19

### Agregado

- **`firestore.rules` del proyecto de RRHH, versionado en el repositorio**
  (SPEC-008). Hasta ahora las reglas solo existían en la consola de Firebase,
  sin historial y sin forma de saber qué decían.
- **`firebase.json` registra las reglas**, para publicarlas con
  `firebase deploy --only firestore:rules`. La configuración de hosting que ya
  tenía el archivo no se tocó.

### Cambiado

- **Todo lo que no sea una de las ocho colecciones de la aplicación queda
  cerrado.** Antes cualquiera podía crear colecciones nuevas en ese proyecto y
  usar la base como almacenamiento gratuito, gastando la cuota del plan.
- Quedan explícitamente permitidas `cursosCompletados` (SPEC-028) y
  `asistenciaManual` (SPEC-032), que eran las dos pendientes.

### Notas

**Estas reglas son solo del proyecto `rrhh-pwa`.** El proyecto
`impredimex-suite`, que aloja `colaboradores` y `asistencia`, tiene las suyas y
no se tocan: de él dependen las cinco aplicaciones de la suite.

**Las reglas todavía no exigen sesión, y no pueden.** Se comprobó en el código
que la app no abre ninguna sesión contra su propio proyecto: la sesión vive en
la suite y las de Firebase Auth no cruzan entre proyectos. La sesión anónima que
describe la SPEC-008 nunca se implementó. El camino para cerrarlo queda escrito
al final de `firestore.rules`, con el orden en que hay que hacerlo.

---

## [2.22.0] — 2026-09-19

### Agregado

- **Calendario de cumplimiento en la Matriz de Capacitaciones** (SPEC-033).
  Botón redondo azul marino a la izquierda de Excel. Muestra cada curso en su
  fecha compromiso, con el detalle del mes: instructor, cuántos participantes
  le tocan, cuántos lo tomaron y cuántos faltan.
- **Semáforo por curso**, solo cuando la fecha compromiso ya pasó: verde al
  100 %, amarillo del 50 % para arriba, rojo por debajo del 50 %. Los que aún
  no vencen salen en gris.

### Cambiado

- `cursoAplicaA` se movió a `utils/cursos` y ahora la comparten Cursos y
  Capacitación. Escrita dos veces, una acabaría contando distinto de la otra.

### Corregido

- En `types/rrhh.ts`, el comentario de `RegistroCursoCompletado` había quedado
  separado de su interfaz al agregar `AsistenciaManual` en la versión 2.21.

---

## [2.21.0] — 2026-09-18

### Agregado

- **Se puede revertir una falta y darla por asistencia** (SPEC-032), para
  cuando no se hizo la revisión de EPP pero la persona sí vino a trabajar. En
  el reporte de faltas aparece un botón **Sí vino** en cada renglón; pide el
  motivo, y la corrección queda firmada con nombre y fecha.
- **Lista de faltas revertidas** junto al reporte, con el motivo y quién la
  hizo. La ve cualquiera que abra el reporte, tenga o no el permiso.
- **Permiso `revertirFaltas` en el padrón**, con su casilla en la pantalla de
  permisos. **Es el único permiso que no concede el papel de administrador:**
  se pidió que lo tuviera una sola persona, así que sin la marca no se tiene,
  aunque se sea ADMIN.

### Cambiado

- Las correcciones se suman a las revisiones de EPP **dentro de
  `asistenciaService`**, no en cada pantalla. Las faltas se cuentan en tres
  lugares —el reporte, el número junto a cada rol y la gráfica— y así los tres
  las respetan sin poder quedarse atrás.

### Notas

**Antes de usarlo hay que revisar las reglas de Firestore:** `asistenciaManual`
es una colección nueva, igual que `cursosCompletados`. El síntoma de que falta
es que el botón falle con permiso denegado.

Esto es un parche, no la solución. Mientras las revisiones de EPP no sean
efectivamente obligatorias para todos, seguirán apareciendo faltas falsas y
habrá que revertirlas a mano, una por una.

---

## [2.20.0] — 2026-09-18

### Cambiado

- **Un rol de turnos solo lo modifica quien lo creó** (SPEC-031). Se retiró la
  excepción que permitía a un administrador guardar el rol de otra persona.
  Tampoco RRHH. El aviso que se muestra al abrir un rol ajeno lo dice y señala
  a quién pedirle el cambio.
- **Un administrador puede borrar un rol, no editarlo.** La excepción anterior
  existía porque el rol de alguien que deja la empresa quedaba congelado; sin
  ninguna salida, además quedaría imborrable y seguiría generando faltas falsas,
  porque la asistencia se calcula sobre los turnos asignados. Borrar no es
  modificar: el rol se rehace desde cero a nombre de quien lo rehizo.

### Notas

Quién puede **crear** roles no cambió: sigue siendo el permiso
`departamentosTurnos` del padrón. Un administrador ejerce el control antes,
decidiendo quién programa, y no después corrigiendo lo programado.

**Consecuencia aceptada:** si el autor está de vacaciones, incapacitado o ya no
trabaja aquí, su rol no se corrige, se rehace. En uno mensual a media captura
eso significa capturarlo completo otra vez.

---

## [2.19.0] — 2026-09-18

### Cambiado

- **Los botones de Excel y PDF son redondos en toda la aplicación** (SPEC-030):
  Directorio, Antigüedad y Vacantes, Incidencias, Capacitación, Promociones y
  Sucesos y Turnos, además de Cursos, que ya los tenía. Son quince botones en
  siete pantallas.
- **El estilo se escribió una sola vez** en `index.css`, como clases
  `.btn-circular`. Cursos dejó de usar su copia local, para que no haya dos
  definiciones del mismo botón.
- Los botones de exportar del reporte de faltas medían 28 px y ahora miden 30,
  como todos los demás.

### Notas

El icono verde de Excel que va dentro de cada renglón de la lista de roles de
turnos **no cambió**: es una acción de fila, no un botón de cabecera.

---

## [2.18.0] — 2026-09-18

### Cambiado

- **Excel, PDF y Actualizar son ahora botones redondos** de solo icono
  (SPEC-029), del mismo alto que el resto de la fila: verde, rojo y azul
  marino. Con el texto dentro no cabían y Actualizar se bajaba a un segundo
  renglón. Actualizar conserva el número de marcados en una marca roja sobre la
  esquina, y su icono gira mientras guarda.
- **Con un curso filtrado, Excel y PDF llevan las dos tablas**: pendientes y
  completados. En Excel son dos hojas; en el PDF, dos tablas una tras otra con
  su subtítulo y su total. Sin curso filtrado el reporte sale como antes.

### Corregido

- **El nombre de los archivos exportados se fechaba en UTC**, así que después
  de las 18:00 salían con la fecha del día siguiente. Afectaba a todas las
  pestañas que exportan.

---

## [2.17.0] — 2026-09-18

### Agregado

- **Control de quién ya cursó cada curso** (SPEC-028). Al filtrar por un curso
  aparecen las columnas **Cursado** y **Calif.**, y un botón **Actualizar** a la
  derecha de PDF que pasa a los palomeados a una sección nueva,
  **Completados**. La tabla de arriba queda mostrando solo a quienes faltan.
- La calificación es opcional y se puede corregir después desde Completados.
- Se puede regresar a alguien a pendientes, por si se palomeó de más.

### Cambiado

- **Se retiraron las columnas Departamento y Estatus** de la pestaña de Cursos,
  del selector de columnas y de las exportaciones. Departamento sigue estando
  como filtro.
- **La columna de fecha ya no repite el título del curso** en pantalla, que era
  lo que la ensanchaba. En las exportaciones se conserva, porque ahí pueden ir
  varios cursos y dos columnas «Fecha» se confundirían.
- Excel y PDF exportan a los pendientes, que es lo que la tabla muestra.

### Notas

**Antes de usarlo hay que revisar las reglas de Firestore** del proyecto
`rrhh-pwa`: `cursosCompletados` es una colección nueva. Si las reglas nombran
las colecciones una por una, hay que darla de alta; si son generales para
cualquier sesión autenticada, ya queda cubierta. El síntoma de que falta es que
Actualizar falle con permiso denegado.

---

## [2.16.0] — 2026-09-18

### Agregado

- **Promociones internas tiene su propia pestaña** (SPEC-024), a la derecha de
  Capacitación. Antes era una sección al final de esa pestaña y había que bajar
  por toda la lista de cursos para llegar.

### Cambiado

- **El nombre del rol de turnos se arma solo** (SPEC-025):
  `DEPARTAMENTO · Periodo · dd/mm/aa al dd/mm/aa`. El campo pasa a ser de solo
  lectura y se rehace con cada cambio de departamento, periodo o fecha. Cada
  quien titulaba sus roles a su manera y encontrar uno dependía de recordar
  cómo lo había llamado su autor.
- **`G8` ahora se llama `ADM`** (SPEC-027). La clave vieja sigue reconociéndose
  y se muestra como `ADM`, para no dejar sin horario las celdas ya guardadas.
- **El nombre del colaborador ocupa dos renglones fijos** en la cuadrícula del
  rol (SPEC-026), y su columna mide 200 px. Los nombres largos se montaban
  sobre las casillas de turno de los primeros días.

### Corregido

- **La fecha propuesta al abrir una promoción se calculaba en UTC**
  (`toISOString`), así que después de las 18:00 proponía el día siguiente. Se
  detectó al separar el módulo. Mismo defecto en la fecha de inicio de un rol
  de turnos nuevo; ambos usan ya `hoyISO()` (regla R3).

### Notas

Los roles y las celdas ya guardados **no se convierten solos**: un rol viejo
conserva su nombre hasta que alguien lo abra y lo guarde, y una celda con `G8`
queda así hasta que se toque. Reescribir en masa documentos que nadie pidió
tocar es más riesgoso que convivir un tiempo con dos estilos.

---

## [2.15.0] — 2026-09-18

### Agregado

- **La fecha de la baja se captura** (SPEC-023). Al dar de baja se pregunta el
  último día que trabajó la persona, propuesto como hoy; antes se ponía siempre
  la del día, y las bajas se registran con retraso.
- **Las bajas viejas se pueden fechar.** En el Directorio, quien está de baja
  muestra su fecha bajo la etiqueta de estatus, y las que no la traen dicen
  «sin fecha» en rojo. Un icono de calendario permite capturarla sin tocar el
  estatus. Son las bajas anteriores a la 2.11.0, que no aparecían en la gráfica
  de rotación.
- **Columna «FECHA DE BAJA» en la exportación a Excel** del Directorio, para
  cotejar contra nómina cuáles siguen pendientes.

### Cambiado

- **`SPECS.md` reordenado.** Las SPEC-017 a SPEC-022 estaban escritas con un
  nivel de título distinto y colocadas después de las secciones de cierre, así
  que se leían como apéndice y no aparecían en el índice del documento. Ahora
  siguen en secuencia con el resto.
- El encabezado de `SPECS.md` decía «versión objetivo 2.0» desde el 5 de
  septiembre.

### Notas

Se agregó a `SPECS.md` una sección de **reglas transversales** (R1 a R6) con las
decisiones que valen para toda la aplicación y no pertenecen a ninguna spec: los
permisos como dato, los campos que no pueden viajar en `construirDocumento`, el
manejo de fechas, las gráficas sin librerías, los campos del padrón que esta
app no toca y el alcance real de los candados. Estaban dispersas en comentarios
del código y en specs sueltas; quien llegue nuevo al repositorio no tenía cómo
deducirlas.

Se documenta ahí también que el campo **`rol`** del padrón está muerto: ninguna
de las cinco aplicaciones lo lee, todas derivan el papel de `roles[<app>]`. Se
deja donde está y no debe revivirse.

---

## [2.14.0] — 2026-09-17

### Cambiado

- **Un rol de turnos ya guardado solo lo puede modificar quien lo creó**
  (SPEC-022). Cualquiera puede abrirlo y verlo; guardarlo, únicamente su autor.
  Un administrador también puede, para que el rol no quede congelado si el
  autor sale de la empresa.
- Los departamentos asignados siguen decidiendo quién puede **crear** roles.
  Eso no cambió.

### Agregado

- **El número de faltas de cada rol**, a la izquierda del icono de Excel. En
  cero se muestra igual, en gris.

### Notas

Tres supervisores comparten impresión. Con esta regla, si el autor del rol
falta, sus compañeros de área ya no pueden ajustarlo y hay que pedírselo a un
administrador. Era la razón por la que SPEC-013 había puesto el permiso por
departamento; se revierte a petición expresa.

Las faltas de todos los roles se cuentan con una sola lectura de asistencias,
limitada a los días ya transcurridos. Si esa lectura falla no se muestra
número, porque sin asistencias todo turno terminado parecería falta.

---

## [2.13.0] — 2026-09-17

### Agregado

- **Promociones internas** (SPEC-021):
  - El colaborador se busca **escribiendo nombre o nómina**, con sugerencias, en
    vez de elegirlo de una lista de más de cien personas.
  - El **puesto destino** es ahora una lista: con «cambio de puesto» trae todos
    los puestos del padrón; con «nueva categoría», la escala A, B, C y D.
  - **Semáforo en las fechas de evaluación**: rojo si el corte ya pasó sin
    calificar, ámbar si faltan tres días o menos.
  - Al marcar una evaluación como **rechazada**, se pregunta si el caso termina
    ahí o si se le dan **tres meses más**. La ronda anterior se archiva y la
    tarjeta muestra que va en su segundo periodo.

### Notas

No se puede abrir una evaluación para un nombre tecleado que no exista: el
campo obligatorio se satisface con la nómina elegida, no con lo escrito.

El semáforo solo alarma mientras la evaluación sigue en proceso. Una
calificación de cero cuenta como calificada, porque es una nota real.

Dar tres meses más no borra nada: las calificaciones de la ronda que termina se
guardan como periodo anterior.

---

## [2.12.0] — 2026-09-16

### Agregado

- **Fecha en el registro de incidencias** (SPEC-020). Viene con la de hoy
  puesta y se puede mover, porque una incidencia se registra a veces días
  después de ocurrida. Sale también en el historial y en las exportaciones.
- **Los puestos se eligen de una lista acotada al departamento**, en el
  Directorio y al abrir una vacante. La lista sale del propio padrón, así que
  se mantiene sola conforme cambia la plantilla. Hay una opción «Otro puesto»
  para plazas que nunca han existido.
- **El departamento de una vacante se elige de la lista cerrada**, ya no se
  escribe libre.

### Cambiado

- En el registro individual del Directorio, **departamento y puesto
  intercambiaron lugar**: el departamento va primero porque de él dependen los
  puestos elegibles.

### Quitado

- **La carga masiva del padrón desde archivo Excel**, junto con su vista previa
  y su motor de lectura.

### Notas

El alta y la corrección de colaboradores queda de uno en uno. La exportación
del directorio a Excel y PDF no se tocó.

Las incidencias registradas antes de esta versión no traen fecha y aparecen con
un guion, en lugar de mostrar una inventada.

---

## [2.11.1] — 2026-09-16

### Cambiado

- **Las gráficas ahora solo las ve quien tenga permiso** (SPEC-019). Los
  administradores las ven siempre; para los demás hay una casilla nueva,
  **«Puede ver las gráficas»**, en la pantalla de Permisos dentro de Sucesos y
  Turnos.

### Notas

El permiso vive en el padrón, no en el código, igual que los de turnos, reporte
de faltas y promociones. Cuando se contrate a alguien más de Recursos Humanos,
basta con marcarle la casilla: no hay que tocar código ni volver a compilar.

La condición está escrita una sola vez, en `services/permisosPadron.ts`. Las
gráficas salen en tres pestañas y, repitiendo la regla tres veces, tarde o
temprano una se habría quedado atrás.

Sigue siendo un candado de interfaz, como los demás de esta aplicación: quien
tenga conocimientos puede leer los datos de todos modos, porque las reglas de
Firestore no distinguen usuarios (SPEC-008).

---

## [2.11.0] — 2026-09-16

### Agregado

- **Gráficas** (SPEC-018), cada una debajo de su sección:
  - **Antigüedad de la plantilla**, bajo Aniversarios: cuánta gente hay en cada
    tramo de años, sobre el padrón activo completo.
  - **Rotación de los últimos 12 meses**, bajo Cumpleaños: altas contra bajas,
    mes a mes.
  - **Plazas por departamento**, bajo Abrir nueva vacante: requeridas contra
    cubiertas, con el total pendiente.
  - **Incidencias por tipo y por departamento**, bajo el Historial.
  - **Faltas por día y por departamento**, bajo la Bitácora de sucesos, con
    selector de periodo y botón para calcular.
- **Fecha de baja** en el padrón, que escribe el cambio de estatus del
  Directorio. Es lo que permite medir la rotación.

### Notas

Las gráficas se dibujan a mano en SVG, sin librería. Agregar una dependencia
obligaría a regenerar `package-lock.json`, que no se puede hacer desde el
teléfono, y la compilación fallaría.

La barra de bajas empieza vacía. Las bajas se empezaron a fechar con esta
versión; las anteriores no traen fecha y quedan fuera, y la gráfica lo dice en
lugar de aparentar que no hubo ninguna. Las altas sí tienen historia completa,
porque salen de la fecha de ingreso.

La gráfica de faltas no se calcula sola al abrir la pestaña: hay que leer las
revisiones de EPP de cada persona y cada día del periodo, y hacerlo en cada
visita gastaría cuota de Firestore sin que nadie lo pida.

---

## [2.10.0] — 2026-09-16

### Agregado

- **Cumpleaños del mes** en la pestaña de Antigüedad y Vacantes (SPEC-017), en
  su propia tarjeta debajo de los aniversarios. Ordenados por día, con el de
  hoy resaltado, los ya pasados atenuados, la edad que cumple cada quien y
  salida a Excel.
- **Las fechas de nacimiento vienen cargadas y se siembran solas.** La base de
  Recursos Humanos quedó en `src/data/cumpleanos.ts`; al abrir la pestaña, la
  app escribe en el padrón las fechas de quien todavía no tiene ninguna. No hay
  que subir ningún archivo. Solo rellena huecos: nunca pisa una fecha ya
  capturada, para que una corrección hecha a mano no se deshaga sola.
- **Columna `Cumpleaños`** en la plantilla registrada del Directorio, a la
  derecha de `Ingreso`, y también en sus exportaciones a Excel y PDF.
- Campo de **fecha de nacimiento** en el registro individual del directorio —
  el mismo formulario sirve para el alta y para la edición—, y columna
  `NACIMIENTO` opcional en la importación y en la exportación.
- El aviso de fechas faltantes **lista los nombres**, no solo el total: con un
  número suelto no se sabía a quién había que editar.

### Corregido

- **Los aniversarios se calculaban con un día de desfase.** `new Date('2020-09-01')`
  devuelve la medianoche UTC, que en México cae el 31 de agosto, así que quien
  entró el día 1 de un mes nunca aparecía en su mes de aniversario y quien
  entró el día 1 del mes siguiente aparecía de más. Ahora las fechas se parten
  a mano y ya no dependen de la zona horaria.

### Notas

La carga de cumpleaños escribe **solo** la fecha de nacimiento y va por su
propio camino, no por la importación del directorio. Esa base trae nómina y
fecha, sin departamento: en la importación normal todas las filas se
rechazarían, y las que sí trajeran departamento habrían vaciado el puesto y la
fecha de ingreso de esa gente.

Tampoco da de alta a nadie. Una nómina que no esté en el directorio se reporta
y se omite.

---

## [2.9.2] — 2026-09-14

### Cambiado

- **La pestaña de Cursos ya no abre con el padrón completo desplegado.** Al
  entrar se ven solo los filtros y los botones; la tabla aparece al pulsar el
  botón nuevo **Filtrar**. Sin ningún filtro puesto, Filtrar muestra a todo el
  personal, que es la salida deliberada para ver el listado completo.
- Se agrega un botón **Limpiar**, que borra los filtros y vuelve a ocultar la
  tabla.
- Excel y PDF quedan deshabilitados mientras no se haya filtrado: antes
  habrían generado un archivo vacío.

### Notas

Los filtros que se van capturando ya no afectan la tabla al momento: se aplican
solo al pulsar Filtrar. Es lo que permite revisar varias combinaciones sin que
la tabla se recalcule con cada tecla.

---

## [2.9.1] — 2026-09-14

### Agregado

- **Un alta nueva en el directorio abre sola su evaluación de contrato de
  planta**, con el periodo arrancando en la fecha de ingreso. Aplica al registro
  individual, no a la importación desde Excel, y solo a altas: editar a alguien
  que ya existe no abre nada.

### Notas

Si el colaborador se captura sin fecha de ingreso, la evaluación no se abre
—sin esa fecha no hay de dónde calcular los tres cortes mensuales— y el mensaje
de guardado lo dice para que se capture y se abra a mano.

Si la apertura falla por cualquier otro motivo, el colaborador queda registrado
igual y el aviso aparece en el mismo mensaje: el alta es lo prioritario, pero
un fallo callado dejaría a alguien sin su evaluación sin que nadie lo supiera.

Tampoco se puede abrir a mano un segundo contrato de planta para quien ya tiene
uno. Las promociones de categoría y de puesto sí pueden repetirse.

---

## [2.9.0] — 2026-09-14

### Agregado

- **Promociones internas (SPEC-016)**, nueva sección en la pestaña de
  Capacitación, debajo de la matriz. Registra evaluaciones para contrato de
  planta, nueva categoría en el mismo puesto o cambio de puesto: periodo de tres
  meses, una calificación mensual de 0 a 100, promedio automático y estatus en
  proceso / aprobada / rechazada. Se exporta a Excel.
- **Casilla «Puede capturar promociones internas»** en la pantalla de Permisos.
  Es para Recursos Humanos, que necesita llevar estas evaluaciones sin por eso
  ser administrador del padrón ni de los roles de turnos.

### Cambiado

- **Control de Antigüedad ahora muestra solo a quienes cumplen aniversario en el
  mes en curso**, no al padrón completo. La tabla es para actuar sobre ellos, y
  entre cientos de renglones la docena que importaba se perdía.
- **Se quitan las tarjetas «Total de Incidencias» y «Días de Suspensión
  Acumulados»** de la pestaña de Incidencias.

---

## [2.8.1] — 2026-09-14

### Cambiado

- **Los tres botones de la cabecera del rol de turnos son ahora circulares y
  solo con icono**: permisos, nuevo y faltas, los tres del mismo tamaño. El
  «Nuevo» queda relleno en azul y los otros dos con contorno, para que siga
  leyéndose cuál es la acción principal.
- Al quedarse sin texto, cada uno lleva `title` y `aria-label`: son lo único que
  dice qué hacen, tanto al pasar el cursor como para un lector de pantalla.

---

## [2.8.0] — 2026-09-14

### Agregado

- **Reporte de faltas (SPEC-015).** Botón «Faltas» junto a «Nuevo», en el rol de
  turnos. Abre una ventana donde se elige periodo y departamento y devuelve la
  lista de faltas, con descarga a Excel y PDF. Una falta es donde hubo turno
  asignado, el turno ya terminó y no hubo revisión de EPP.
- **Opción «Todos los departamentos»**, para sacar el reporte de toda la planta
  de una sola vez. La ven los administradores y quien tenga marcada la casilla
  nueva en la pantalla de Permisos: es para Recursos Humanos, que necesita el
  reporte completo sin por eso poder programar roles.

### Cambiado

- **La columna de nombres del rol de turnos ya no corta los nombres largos.**
  Se ensanchó y ahora parte en dos renglones cuando hace falta.

---

## [2.7.1] — 2026-09-14

### Corregido

- **La falta ya no se afirma antes de que termine el turno.** La versión 2.7.0
  miraba solo la fecha, así que alguien de `T2` —que entra a las 14:00—
  aparecía como «No asistió» desde la madrugada, antes de que empezara su
  jornada. Ahora la celda no dice nada hasta que pasó la hora de salida.
- **Se contemplan los turnos que cruzan la medianoche.** Un `T3` o un `N12` del
  día 14 terminan a las 06:00 del 15 y hasta entonces no se juzgan. En `LIB` se
  usan las horas capturadas a mano.
- El «Asistió» sigue apareciendo en cuanto se hace la revisión, sin esperar:
  solo se hace esperar al dato que puede equivocarse.

### Cambiado

- **El indicador ahora es solo un icono dentro de la celda del turno**, pegado a
  la derecha: palomita verde si asistió, cruz roja si no. Antes era texto debajo
  del turno, que en un rol mensual no cabía.
- La cuadrícula se refresca sola cada minuto, para que una celda cambie de
  estado al terminar el turno aunque la pantalla lleve rato abierta.
- La exportación a Excel sigue la misma regla: un turno en curso sale sin marca.

---

## [2.7.0] — 2026-09-14

### Agregado

- **La asistencia llega desde EPP (SPEC-014).** Cada celda del rol de turnos
  con turno asignado muestra **Asistió** o **No asistió** según haya habido o no
  una revisión de EPP de esa persona ese día. La exportación a Excel incluye lo
  mismo.
- El dato viaja por la colección `asistencia` del proyecto de la suite, que EPP
  escribe al guardar cada inspección. RRHH solo lee.

### Notas

Solo se evalúan celdas **con turno asignado** y fechas **que ya ocurrieron**: un
descanso no es una falta y un rol de la próxima semana no puede tener a nadie
ausente. La asistencia no se puede marcar a mano; si se pudiera, dejaría de ser
lo que la revisión constató.

Requiere la regla de la colección `asistencia` en el proyecto de la suite. Sin
ella, EPP avisará en cada revisión y RRHH no marcará a nadie.

---

## [2.6.0] — 2026-09-14

### Agregado

- **Candados en el rol de turnos (SPEC-013).** Crear y editar roles deja de
  estar abierto a todos: cada persona puede tener asignados los departamentos
  que le toca programar, y quien no tenga ninguno solo consulta y exporta. El
  administrador puede programar todos sin aparecer en ninguna lista.
- **Pantalla «Permisos»**, dentro de Sucesos y Turnos y visible solo para
  `ADMIN`: lista al personal activo, con los departamentos como botones que se
  marcan y desmarcan. Se guarda al instante, sin botón de confirmar. Aparecen
  primero quienes ya tienen algún permiso, y hay buscador.

### Cambiado

- **El permiso ahora es por departamento, no por autoría.** Antes solo quien
  creaba un rol —o un administrador— podía editarlo. Ahora puede hacerlo
  cualquiera con ese departamento asignado, lo haya creado o no: es lo que hace
  falta cuando varios supervisores cubren la misma línea o alguien falta.
- El selector de departamento al crear un rol solo ofrece los permitidos.

### Notas

El campo `departamentosTurnos` vive en el padrón, y a propósito **no** forma
parte de los campos que escribe la importación de Excel: si lo fuera, un archivo
sin esa columna borraría todos los permisos en cada carga. Sobrevive también a
la edición normal de un colaborador y a un cambio de número de nómina.

---

## [2.5.0] — 2026-09-13

### Cambiado

- **Encabezado alineado con el resto de la suite**, tomando como referencia el
  de Control de Proceso: marca y nombre de la aplicación centrados, debajo el
  nombre y el puesto de quien entró, y a la derecha el número de nómina en un
  círculo azul junto al botón circular de cerrar sesión. El punto verde y el
  «En línea» se conservan, ahora debajo de ese botón.
- **La sesión ahora incluye el puesto**, que antes no traía. Se lee del mismo
  documento del padrón que ya se consultaba al entrar, así que no agrega
  ninguna lectura extra. Si el padrón no tiene puesto para esa persona, se
  muestra su papel en la aplicación en lugar de dejar el renglón vacío.

---

## [2.4.0] — 2026-09-13

### Agregado

- **Pestaña «Sucesos y Turnos», abierta a todos.** Es la excepción deliberada
  al bloqueo de la v2.3: aquí capturan igual administradores y no
  administradores, porque quien levanta un reporte de piso o arma un rol es
  quien está en el turno (SPEC-012).
- **Bitácora de sucesos.** Se reporta fecha, colaborador y tipo —no se presentó
  a laborar, abandonó el turno, llegada tarde, cambio de turno, accidente,
  otro— con descripción opcional. Cada registro guarda quién lo reportó. Se
  filtra y se exporta a Excel y PDF. Borrar un suceso queda reservado a
  `ADMIN`.
- **Rol de turnos**, réplica del módulo de la aplicación de Mantenimiento:
  cuadrícula de personas contra días, mismo catálogo (`T1`, `T2`, `T3`, `D12`,
  `N12`, `G8`, `LIB`), periodos semanal, quincenal y mensual, copiar y pegar
  turnos —por celda o fila completa—, limpiar fila, domingos resaltados y
  exportación a Excel. El departamento se elige al crear el rol y determina qué
  personas salen en la cuadrícula.

### Notas

Un suceso **no** es una incidencia: no afecta nómina, suspensiones ni el
historial de incidencias. Son bitácoras distintas a propósito.

Cualquiera crea un rol de turnos, pero editarlo o borrarlo solo puede hacerlo
quien lo creó o un administrador; los demás lo abren en modo lectura. Esa
restricción vive en la interfaz, no en las reglas de Firestore, por la misma
razón explicada en la v2.3.

---

## [2.3.0] — 2026-09-13

### Cambiado

- **Solo los administradores pueden capturar.** En incidencias, capacitación
  y vacantes desaparecen los formularios de alta, los botones de eliminar y
  la edición en línea para todo el que no sea `ADMIN`. En su lugar aparece un
  aviso de que está viendo la información en modo consulta.
- **Consultar, filtrar y exportar siguen abiertos para todos.** Las tablas,
  los buscadores, la paginación y las descargas a Excel y PDF no cambian: son
  lectura y no modifican nada.
- **El papel `CAPTURA` queda sin efecto dentro de esta aplicación.** Hasta la
  v2.2 podía alimentar incidencias, cursos y vacantes; ahora se comporta igual
  que `CONSULTA`. El papel sigue existiendo en el padrón y en las otras
  aplicaciones de la suite, que no se tocan.

### Notas

Este cambio es de interfaz. Lo que impide de verdad una escritura son las
reglas de Firestore, que viven en la consola de Firebase y no en este
repositorio: hay que actualizarlas también, o alguien con el papel
`CAPTURA` seguirá pudiendo escribir por fuera de la aplicación.

---

## [2.2.2] — 2026-09-13

### Cambiado

- **Se quita el pie de página de la aplicación.** Con él se va también la
  línea separadora que lo encabezaba, que solo existía para ese texto. El pie
  era único y compartido por todas las pestañas, así que desaparece en todas.

---

## [2.2.1] — 2026-09-13

### Corregido

- **Una incidencia sin suspensión no se guardaba.** El formulario se limpiaba
  como si hubiera funcionado, pero el registro nunca llegaba al historial. La
  causa: la versión 2.2.0 mandaba `diasSuspension` con valor `undefined`
  cuando la casilla de suspensión no estaba marcada, y Firestore rechaza el
  documento completo si encuentra un campo así. Ahora ese campo solo se
  incluye cuando hay suspensión.
- **Un fallo al guardar ya no pasa desapercibido.** Antes el formulario se
  limpiaba sin esperar la respuesta de Firestore, así que cualquier error
  quedaba invisible. Ahora se espera el guardado, el formulario solo se
  limpia si el registro quedó guardado de verdad, y si algo falla se avisa en
  pantalla. El botón muestra «Guardando…» y queda deshabilitado mientras
  tanto, lo que de paso evita registros duplicados por doble toque.

---

## [2.2.0] — 2026-09-12

### Cambiado

- **Registro de incidencias: fuera fecha inicio/fecha fin, entran
  observaciones y una suspensión explícita.** El formulario ya no pide un
  rango de fechas genérico. En su lugar hay un campo de observaciones libres
  y una casilla **Suspensión**: al marcarla, primero pregunta el número de
  días y después abre un calendario para elegir esos días exactos, uno por
  uno (SPEC-011).
- **El historial de incidencias cambia de columnas.** Sale Periodo, Días y
  Estatus; entra Suspensión (las fechas elegidas, si las hay) y Observaciones.
  Excel y PDF exportan las mismas columnas nuevas.
- **El estatus de aprobación se retira.** Solo tomaba el valor `APROBADO` y
  ningún flujo lo cambiaba; no era información real.
- El indicador «Días Totales Ausentados» del resumen pasa a llamarse **Días
  de Suspensión Acumulados** y solo cuenta días de suspensiones reales, no
  todas las incidencias por igual.

### Notas

Los registros anteriores a esta versión no tienen `observaciones` ni
`suspension`: se siguen mostrando, con esas columnas en blanco. La consulta ya
no ordena por `fechaInicio` en Firestore —ese campo desaparece— sino que trae
todo y ordena por `createdAt` en el cliente, precisamente para no dejar fuera
en silencio ningún registro viejo que no tuviera ese campo.

---

## [2.1.0] — 2026-09-05

### Cambiado

- **El directorio de personal pasa a leer y escribir en `impredimex-suite`.**
  Con esto RRHH queda como la única aplicación que escribe el padrón del que
  dependen los inicios de sesión de las cinco apps, y las reglas publicadas
  anoche —que exigen `ADMIN` en `roles.rrhh`— empiezan a proteger algo que la
  aplicación sí usa.
- Los módulos de incidencias, capacitación, cursos y vacantes **no se movieron**:
  siguen en el proyecto `rrhh-pwa`, que es donde están sus datos reales.

### Notas

La migración que anticipaba la SPEC-009 no hizo falta. El proyecto propio de
RRHH tenía tres colaboradores de prueba, no un padrón paralelo; los 121 de la
suite se habían cargado directo desde Excel. Verificado que esas tres nóminas ya
existían en la suite con sus datos correctos, el cambio se redujo al origen de
la base de datos.

Quedan tres documentos huérfanos en `rrhh-pwa/colaboradores`. Conviene
eliminarlos a mano para no dejar dos listas con el mismo nombre.

---

## [2.0.0] — 2026-09-05

Primera etapa de la integración con la suite Impredimex: control de acceso.

Hasta esta versión la aplicación no tenía ninguno. Cualquiera con la dirección
entraba y editaba el padrón de personal, que es la lista de la que dependen los
inicios de sesión de las cinco aplicaciones de la suite, y el repositorio es
público.

### Agregado

- Pantalla de acceso con nómina y clave contra Firebase Auth del proyecto
  `impredimex-suite` (SPEC-001). La sesión sobrevive al recargar y al cerrar el
  navegador, y se cierra con el botón Salir del encabezado.
- Tres papeles leídos de `roles.rrhh`: `ADMIN`, `CAPTURA` y `CONSULTA`
  (SPEC-002). La ausencia de papel equivale a `CONSULTA`, el más bajo.
- Contexto de sesión (`SesionContext`) para que cada módulo consulte el papel
  sin recibirlo por props.
- Catálogo cerrado de los 13 departamentos y función de normalización de
  nombres, en `utils/catalogos.ts`.
- Cálculo de antigüedad al vuelo desde `fechaIngreso`, para no guardarla.
- `SPECS.md` y este `CHANGELOG.md`, que la regla 7 de la suite exige y que la
  aplicación no tenía.
- Vista previa antes de importar desde Excel (SPEC-006): cuántas altas, cuántas
  actualizaciones, qué filas se rechazan y por qué, y la lista nominal de quién
  está dado de baja en el archivo, con una casilla para decidir si se reactiva.
- Botón de dar de baja y reactivar en la tabla. Hasta ahora el único modo de
  cambiar el estatus era importando un Excel.
- Confirmación al eliminar (SPEC-005), que nombra a la persona y advierte que
  pierde el acceso a todas las aplicaciones de la suite.
- `nombreNormalizado` se recalcula en cada guardado, con el mismo criterio que
  usa la colección de la suite: palabras del nombre en orden alfabético.
- Cada escritura del padrón deja `actualizadoEn` y `actualizadoPor` con la
  nómina de quien la hizo, usando los nombres de campo que la colección de la
  suite ya tenía.

### Cambiado

- **Los botones de alta, edición, importación, baja y borrado solo existen para
  `ADMIN`.** Los demás papeles ven el directorio en modo consulta, con un aviso
  que lo explica.
- **El departamento se elige de una lista de 13 valores**, ya no se escribe. En
  la importación, las filas con un departamento fuera del catálogo se rechazan
  y se listan con su motivo, en vez de guardarse mal. Un «FLEXOGRAFIA» sin
  acento deja a esa gente sin equipo asignado en EPP y falla en silencio.
- **La escritura del padrón usa una lista blanca de campos.** Antes se guardaba
  con `...colaborador` y los permisos sobrevivían solo porque la escritura usaba
  `merge`; el día que alguien quitara esa opción se llevaba `apps` y `roles` de
  las 121 personas.
- La importación ya no fuerza `ACTIVO`: si no se pide reactivar, el documento
  conserva el estatus que tenía.

### Corregido

- `tsc` ahora corre sin errores. Faltaba `vite-env.d.ts` con los tipos de Vite,
  y `main.tsx` importaba `./App.tsx` con extensión, que ese `tsconfig` no
  permite. Como el script de compilación no ejecuta `tsc`, nadie se enteraba.

### Notas

- **El padrón sigue escribiéndose en el proyecto propio de RRHH.** El cambio al
  proyecto de la suite espera a la migración de datos de la SPEC-009. Apuntar a
  la suite antes de migrar haría que la aplicación editara una copia vieja
  mientras los datos reales se quedan atrás.
- **`CAPTURA` queda definido pero sin asignar.** Se usará cuando se agregue la
  sección donde los quince perfiles de consulta capturen información.
- **`CONSULTA` ve las incidencias de toda la planta y puede exportarlas.**
  Decidido a conciencia; queda documentado en la SPEC-002.

### Pendiente antes de publicar

Ninguna de las quince cuentas tiene todavía `rrhh` en su campo `apps`, así que
al publicar esta versión nadie podrá entrar. Hay que agregarlo documento por
documento en la consola de Firebase, sobre `colaboradores` del proyecto suite,
junto con `roles.rrhh` en `ADMIN` para Víctor Moreno García y Maritza Galván
Rivas, y `CONSULTA` para las trece restantes.

---

## [1.x] — anterior a este archivo

Versión sin control de acceso, con el padrón en el proyecto propio y sin
documentación de especificaciones.
