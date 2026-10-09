# MantoApp Impredimex

Sistema de gestión de Órdenes de Trabajo (OT) de mantenimiento industrial.

**Dirección:** https://impredimex-hub.github.io/Mantenimiento-Impredimex/
**Versión vigente:** 2.11.0 (ver [`CHANGELOG.md`](./CHANGELOG.md))
**Estado:** en producción

---

## Descripción

MantoApp gestiona el ciclo completo de una orden de trabajo de mantenimiento en
planta: el área solicitante reporta la falla, el técnico la toma y registra lo
que hizo, el solicitante valida el cierre y la supervisión consulta indicadores.

Forma parte de la **suite Impredimex**: el inicio de sesión y la lista de
personal son compartidos con RRHH, EPP, Ingeniería de Procesos y Control de
Procesos, y se entra desde el portal https://impredimex-hub.github.io/.

### Funciones principales

- Sincronización en tiempo real entre todos los dispositivos
- Notificaciones push a teléfono y escritorio, aunque la app esté cerrada
- Cuatro papeles: solicitante, técnico, supervisor y administrador
- Rol de turnos, programa de mantenimiento preventivo e indicadores (MTTR,
  MTBF, disponibilidad)
- Respaldo diario de la base a Google Drive y descarga de respaldo bajo demanda
- Catálogo de máquinas y zonas de planta, compartido con Ingeniería de Procesos
- Diseño para teléfono, pensado para uso en piso de planta
- Se instala como aplicación desde el navegador; no requiere tienda

---

## Acceso

Cada persona entra con **su número de nómina y su clave personal** de la suite.
No existen contraseñas compartidas ni por papel.

Para que alguien pueda entrar se necesitan tres cosas en el proyecto
`impredimex-suite`:

1. Estar en la colección `colaboradores` con `estatus: "ACTIVO"`
2. Tener `manto` en su lista `apps`, y su papel en `roles.manto`
   (`solicitante`, `tecnico`, `supervisor` o `admin`, en minúsculas)
3. Tener cuenta en Firebase Authentication con el identificador
   `<nómina>@impredimex.local`

Los permisos se asignan desde la app de RRHH. Ver [`HANDOVER.md`](./HANDOVER.md).

---

## Arquitectura

```
                 index.html (GitHub Pages)
                 HTML + CSS + JavaScript, un solo archivo
                              │
     ┌────────────────┬───────┴────────┬─────────────────────┐
     ▼                ▼                ▼                     ▼
 impredimex-suite  impredimex-mantoapp  Cloudflare Worker   OneSignal
 Auth + personal   Realtime Database   mantoapp-push        entrega del push
 (Firestore)       (datos de la app)   (guarda la API key)
                                            └──────────────►
```

| Capa | Tecnología |
|---|---|
| Interfaz | HTML5, CSS3 y JavaScript sin frameworks ni compilación |
| Datos | Firebase Realtime Database, proyecto `impredimex-mantoapp` |
| Identidad | Firebase Authentication del proyecto `impredimex-suite`, más una sesión anónima en el proyecto propio para cumplir sus reglas |
| Notificaciones | OneSignal Web SDK v16 |
| Envío seguro del push | Cloudflare Worker `mantoapp-push` |
| Hospedaje | GitHub Pages |
| Exportación | SheetJS (xlsx) |

---

## Estructura del repositorio

```
Mantenimiento-Impredimex/
├── index.html              Aplicación completa
├── manifest.json           Datos para instalarla como aplicación
├── OneSignalSDKWorker.js   Service worker de las notificaciones
├── icon-192.png, icon-512.png, apple-touch-icon.png
├── database.rules.json     Reglas de la Realtime Database (copia de referencia)
├── respaldo-drive.gs       Respaldo diario a Google Drive (Google Apps Script)
├── README.md               Este archivo
├── HANDOVER.md             Guía técnica para quien mantenga la aplicación
├── SPECS.md                Especificaciones funcionales
├── NOTIFICACIONES.md       Cuándo se envía cada push y a quién
└── CHANGELOG.md            Historial de versiones
```

---

## Cómo se trabaja

No hay proceso de compilación: el `index.html` se publica tal cual.

1. Actualizar primero la especificación en `SPECS.md`
2. Hacer el cambio en `index.html`, referenciando la spec en un comentario
   (`// SPEC-XXX: …`)
3. Registrar el cambio en `CHANGELOG.md` (formato Keep a Changelog, versionado
   semántico)
4. Subir a la rama `main`. GitHub Pages publica en uno o dos minutos
5. Recargar sin caché (Ctrl+Shift+R) y probar el flujo afectado

Detalle completo, servicios externos y solución de problemas en
[`HANDOVER.md`](./HANDOVER.md).

---

## Limitaciones conocidas

- La base de datos exige sesión, pero esa sesión es anónima: no distingue entre
  usuarios. Riesgo aceptado; ver SPEC-044. App Check está preparado en el
  código y pendiente de configurar en la consola
- El repositorio es público, y con él la configuración de Firebase
- No hay recuperación de clave por autoservicio: la restablece un administrador
- Plan gratuito de Firebase (Spark): sin respaldo automático de Firebase. Lo
  cubren el script de respaldo diario a Drive y el botón de respaldo del
  administrador (SPEC-060)

---

## Responsables

**Desarrollo original:** Victor Moreno
**Empresa:** Impresión y Diseño de México S.A. de C.V. (IMPREDIMEX)

## Licencia

Software privado de uso interno de IMPREDIMEX.
