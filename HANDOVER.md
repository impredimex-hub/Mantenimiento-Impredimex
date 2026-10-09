# HANDOVER.md — Guía técnica de mantenimiento

Lo que necesita saber quien reciba esta aplicación para operarla, corregirla y
extenderla sin depender de quien la construyó.

**Versión de la aplicación:** 2.12.0
**Última actualización de este documento:** 9 de octubre de 2026
**Desarrollo original:** Victor Moreno

---

## Antes de modificar nada

1. Lee este documento completo
2. Lee [`README.md`](./README.md)
3. Lee en [`SPECS.md`](./SPECS.md) al menos SPEC-001, SPEC-042 a SPEC-044,
   SPEC-058 y SPEC-059, y los anexos A y B
4. Revisa las últimas entradas de [`CHANGELOG.md`](./CHANGELOG.md)

La aplicación es parte de una suite. **Cualquier cambio que toque inicio de
sesión, permisos, personal o reglas de Firebase afecta también a RRHH, EPP,
Ingeniería de Procesos y Control de Procesos.**

---

## Servicios externos y quién los administra

Ninguna credencial vive en este repositorio. Las cuentas se entregan por
separado.

| Servicio | Qué contiene | Cuenta propietaria hoy |
|---|---|---|
| GitHub `impredimex-hub` | Código y hospedaje (GitHub Pages) de las cinco apps y el portal | Cuenta de usuario `impredimex-hub` |
| Firebase `impredimex-suite` | Inicio de sesión y padrón de personal de toda la suite | Cuenta de Google de la suite |
| Firebase `impredimex-mantoapp` | Base de datos de esta aplicación | Cuenta de Google personal del desarrollador |
| OneSignal, app «IYS App» | Suscripciones y entrega de notificaciones | Cuenta personal del desarrollador |
| Cloudflare, worker `mantoapp-push` | Envío seguro del push (guarda la API key de OneSignal) | Cuenta personal del desarrollador |

El traspaso de estas cuentas a la empresa se hace con el plan de traspaso que
acompaña esta entrega. Hasta que se complete, la aplicación depende de cuentas
personales.

---

## Identificadores y direcciones

**GitHub**
- Repositorio: https://github.com/impredimex-hub/Mantenimiento-Impredimex
- Aplicación: https://impredimex-hub.github.io/Mantenimiento-Impredimex/
- Portal de la suite: https://impredimex-hub.github.io/
- Rama publicada: `main`, carpeta raíz

**Firebase — datos de esta app**
- Proyecto: `impredimex-mantoapp`
- Realtime Database: `https://impredimex-mantoapp-default-rtdb.firebaseio.com`,
  nodo raíz `manto_db`
- Plan: Spark (gratuito)

**Firebase — suite**
- Proyecto: `impredimex-suite`
- Firestore, colección `colaboradores` (una ficha por nómina)
- Authentication: cuentas `<nómina>@impredimex.local`

**OneSignal**
- App ID: `1bb0b5c6-1a08-4a5e-a300-715a65a1dcc1`
- La REST API key vive **solo** en el worker de Cloudflare

**Cloudflare**
- Worker: `mantoapp-push`
- Dirección: `https://mantoapp-push.victormorenogarcia05.workers.dev/`
- Orígenes permitidos (CORS): `https://impredimex-hub.github.io`

---

## Cómo se publica un cambio

No hay compilación. El `index.html` se sirve tal cual desde GitHub Pages.

**Desde GitHub web:** abrir el archivo, editar con el lápiz, confirmar el
commit en `main`. GitHub Pages publica en uno o dos minutos.

**Desde una copia local:**

```
git clone https://github.com/impredimex-hub/Mantenimiento-Impredimex.git
# editar index.html
git commit -am "Descripción del cambio"
git push
```

Después de publicar, recargar sin caché (Ctrl+Shift+R). En un teléfono con la
app instalada puede hacer falta cerrarla y abrirla dos veces.

### Probar sin afectar producción

Producción y cualquier copia de prueba **escriben en la misma base**. Una OT de
prueba es una OT real que los técnicos van a ver: hay que borrarla después
desde Administración → Gestión de OT.

Para probar localmente hace falta servir el archivo por HTTP (por ejemplo, Live
Server de VS Code). Las notificaciones push no funcionan fuera del dominio
publicado.

---

## Cómo entra una persona

1. Escribe su nómina y su clave. La app arma `<nómina>@impredimex.local` y
   valida contra Authentication de `impredimex-suite`
2. Lee su ficha en `colaboradores/<nómina>`: debe estar `ACTIVO` y tener `manto`
   en `apps`
3. Toma su papel de `roles.manto`. Sin papel, entra como `solicitante`
4. Abre una sesión anónima en `impredimex-mantoapp`, que es lo que exigen las
   reglas de su base
5. Etiqueta el dispositivo en OneSignal con su nómina y su papel

Si la persona ya inició sesión en el portal o en otra app de la suite, entra
directo: la sesión se comparte porque todas viven en `impredimex-hub.github.io`.

### Dar acceso a una persona o a un área nueva

1. **Que exista en el padrón.** RRHH la da de alta en su Directorio
2. **Que tenga cuenta.** Firebase Console → `impredimex-suite` → Authentication →
   Agregar usuario. Correo `<nómina>@impredimex.local`, clave inicial de 6
   dígitos que se le entrega a la persona
3. **Que tenga permiso.** En la app de RRHH, Directorio → icono de llave de la
   persona → Mantenimiento → elegir el papel. Los papeles de esta app van en
   minúsculas y el selector ya los escribe bien
4. **Si es técnico:** por omisión atiende los tres tipos de orden. Para
   restringirlo, en esta app, Administración → Catálogo de personal, desmarcar
   los que no le tocan. Con todos desmarcados deja de considerarse disponible
5. Si el área trabaja en una nave o con equipos que no están en el catálogo,
   darlos de alta en Administración → Catálogos

Los cambios de papel surten efecto en el siguiente inicio de sesión.

### Restablecer una clave

No hay función en ninguna app para hacerlo, y el botón «Restablecer contraseña»
de la consola no sirve: manda un correo a `@impredimex.local`, que no existe.

1. Firebase Console → `impredimex-suite` → Authentication → buscar
   `<nómina>@impredimex.local` → Borrar cuenta
2. Agregar usuario con el mismo identificador y una clave nueva de 6 dígitos

Ninguna app guarda el identificador interno de la cuenta, así que borrarla y
crearla otra vez no afecta sus permisos ni su historial: esos viven en su ficha
de `colaboradores` y en los registros de cada app.

---

## Notificaciones push

```
Evento en la app
   ↓
notifyPush(nóminas, título, texto)
   ↓
POST → Worker mantoapp-push (Cloudflare)
   ↓
El worker agrega la REST API key y reenvía → OneSignal
   ↓
OneSignal entrega a los dispositivos etiquetados con esas nóminas
```

El worker existe por dos razones: la API de OneSignal no acepta llamadas
directas desde el navegador, y así la API key nunca llega al código público.
Ingeniería de Procesos también usa este worker para avisar de las OT que levanta.

Qué evento avisa a quién: [`NOTIFICACIONES.md`](./NOTIFICACIONES.md).

**Si se cambia el dominio de la app**, hay que agregar el nuevo origen a
`ALLOWED_ORIGINS` en el código del worker. Si no, el navegador bloquea la
llamada y el push deja de llegar sin que la app muestre ningún error.

**Si se cambia la dirección del worker**, hay que actualizarla en `notifyPush`
de esta app y en la de Ingeniería de Procesos.

---

## Seguridad

Reglas de la Realtime Database (copia en `database.rules.json`):

```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null"
  }
}
```

Exigen sesión, pero la sesión es anónima, así que no distinguen entre usuarios.
Es un riesgo aceptado a conciencia (SPEC-044). Lo que lo cerraría:

1. **App Check** con reCAPTCHA Enterprise. El código ya está listo: basta con
   crear la clave y pegarla en la constante `APPCHECK_SITE_KEY`
2. **Hacer privado el repositorio.** Requiere mover el hospedaje fuera de
   GitHub Pages gratuito, por ejemplo a Firebase Hosting

La configuración de Firebase que aparece en `index.html` es pública por diseño;
no es un secreto. Lo que protege los datos son las reglas.

---

## Datos

Modelo completo en el Anexo A de [`SPECS.md`](./SPECS.md). Lo esencial:

- `manto_db/ots` — órdenes de trabajo
- `manto_db/operativo/<nómina>` — tipos de orden que atiende cada técnico
- `manto_db/maquinas`, `zonas`, `naves`, `infraestructura`, `tiposServicio` —
  catálogos. Máquinas y zonas los leen también Ingeniería de Procesos
- `manto_db/abiertasPorMaquina`, `notificarA`, `urlApp` — índices que lee
  Ingeniería de Procesos

**Las OT guardan la máquina por nombre.** Renombrar una máquina deja huérfanas
sus órdenes anteriores. Para retirarla, se marca inactiva; no se borra.

### Respaldo (SPEC-060)

El plan Spark no respalda la base automáticamente. Hay dos mecanismos:

- **Respaldo diario a Google Drive.** El script `respaldo-drive.gs` de este
  repositorio corre cada noche desde Google Apps Script y guarda la base
  completa en la carpeta *Respaldos MantoApp* de la cuenta que lo instaló: un
  `.json` para restaurar y un `.xlsx` para consultar. Conserva 90 días; lo
  anterior va a la papelera de Drive. Instalado el 9 de octubre de 2026 en la
  cuenta de la suite.
- **Botón en la app.** Administración → Respaldo de datos → Preparar respaldo →
  Guardar respaldo JSON o Descargar en Excel.

El panel del administrador avisa cuando el respaldo más reciente tiene más de 7
días. Si aparece ese aviso, lo más probable es que el script de Drive haya
dejado de correr.

El archivo es la base tal cual, desde la raíz. Para restaurar: Firebase Console
→ `impredimex-mantoapp` → Realtime Database → raíz → menú de tres puntos →
Importar JSON. **Reemplaza toda la base**: descargar antes un respaldo del
estado actual.

El padrón de personal no está en este respaldo: vive en `impredimex-suite`. Se
exporta a Excel desde el Directorio de RRHH.

#### Instalar el respaldo diario

Se hace una sola vez, con la cuenta de Google que guardará los respaldos.

1. Entrar a https://script.google.com con esa cuenta → Nuevo proyecto. Ponerle
   de nombre «Respaldo MantoApp»
2. Borrar el contenido de `Código.gs` y pegar el de `respaldo-drive.gs`. Guardar
3. Engrane (Configuración del proyecto) → Zona horaria: «(GMT-06:00) Hora de
   México — Ciudad de México»
4. En el editor, elegir la función `instalar` y pulsar Ejecutar
5. Google pide autorizar el acceso a Drive y a servicios externos. Como el
   script es propio y no está publicado, muestra «Google no verificó esta app»:
   Configuración avanzada → Ir a Respaldo MantoApp → Permitir
6. Revisar el registro de ejecución: debe decir «Respaldo guardado» y
   «Instalado». En Drive aparece la carpeta *Respaldos MantoApp* con el primer
   archivo, y en la app el módulo Respaldo de datos muestra la fecha de Drive

**Al actualizar el script** con una versión nueva de `respaldo-drive.gs`:
pegarla completa sobre la anterior, guardar y volver a ejecutar `instalar`. Si
la versión nueva usa un servicio de Google que la anterior no usaba, Google pide
autorizarlo otra vez, y eso solo se puede hacer a mano: la corrida automática de
la noche fallaría.

Si una corrida falla, Google manda un correo con el error a la cuenta dueña
del script. Para quitar el respaldo diario, ejecutar `desinstalar`; los
archivos ya guardados se quedan.

**Si se activa App Check con aplicación obligatoria (SPEC-044)**, el script deja
de poder leer la base. Hay que resolverlo antes de exigirlo.

**Al traspasar las cuentas a TI**, instalar el script en la cuenta de TI y
ejecutar `desinstalar` en la cuenta anterior, para que no corran dos.

---

## Problemas comunes

**No llegan las notificaciones**
1. Confirmar que el permiso de notificaciones está concedido en el dispositivo
2. OneSignal → Audience → Subscriptions: buscar la nómina en las etiquetas
3. Cloudflare → `mantoapp-push` → Logs: ver si llegó la petición y qué respondió
4. Si en la consola del navegador (F12) aparece un error de CORS, el dominio de
   la app no está en `ALLOWED_ORIGINS` del worker

**Una persona no puede entrar**
1. ¿Está `ACTIVO` en el padrón?
2. ¿Tiene `manto` en `apps`? Revisarlo con el icono de llave en RRHH
3. ¿Existe su cuenta en Authentication de `impredimex-suite`?
4. ¿Su papel está en minúsculas? `ADMIN` en mayúsculas no se reconoce

**La app no carga o se queda en blanco**
1. GitHub → repositorio → Settings → Pages: debe estar activo en `main`
2. Consola del navegador (F12): buscar el primer error
3. Recargar sin caché

**«Permission denied» en la consola**
La sesión anónima en `impredimex-mantoapp` no se abrió. Revisar que el
proveedor «Anónimo» siga habilitado en Authentication de ese proyecto.

**Aparece el aviso de respaldo vencido**
1. script.google.com → proyecto «Respaldo MantoApp» → Ejecuciones: ver el error
   de la última corrida
2. «No se pudo abrir la sesión anónima»: revisar que el proveedor Anónimo siga
   habilitado en Authentication de `impredimex-mantoapp`
3. «La base respondió 401»: las reglas o App Check están rechazando al script
4. Corregido, ejecutar `respaldar` a mano para confirmar

**Una OT aparece en un teléfono pero no en los demás**
La escritura a Firebase falló. La app reintenta sola en el siguiente guardado;
si persiste, revisar la consola del navegador de ese teléfono.

---

## Costos y límites

Todo opera en planes gratuitos.

| Servicio | Límite gratuito | Cuándo revisar |
|---|---|---|
| GitHub Pages | Sitios públicos sin costo | Si se quiere repositorio privado |
| Firebase Spark | 1 GB de base, 10 GB de descarga al mes por proyecto | Revisar el uso mensual en la consola |
| OneSignal | Notificaciones web sin costo en el plan gratuito | Si se requieren funciones de pago |
| Cloudflare Workers | 100 000 peticiones al día | Uso actual: decenas al día |

---

## Al recibir el proyecto

- [ ] Recibir acceso de propietario a los cinco servicios de la tabla de arriba
- [ ] Activar verificación en dos pasos en cada cuenta
- [ ] Clonar el repositorio y publicar un cambio menor de prueba
- [ ] Hacer un respaldo inicial de la base
- [ ] Probar el flujo completo de una OT con notificaciones, y borrar la OT de
      prueba
- [ ] Registrar el primer cambio propio en `CHANGELOG.md`

---

## Recursos

| Tema | Referencia |
|---|---|
| Firebase Realtime Database | https://firebase.google.com/docs/database/web/start |
| Firebase Authentication | https://firebase.google.com/docs/auth/web/start |
| OneSignal Web Push | https://documentation.onesignal.com/docs/web-push-quickstart |
| Cloudflare Workers | https://developers.cloudflare.com/workers/ |
| GitHub Pages | https://docs.github.com/pages |
