# HANDOVER.md — Guía de Transición

## Documento de transición para nuevo desarrollador

Este documento contiene **todo lo que necesitas saber** para tomar el control del proyecto MantoApp si el desarrollador original deja la empresa o el proyecto se transfiere a otro equipo.

**Última actualización:** 27 de junio de 2026
**Desarrollador original:** Victor Moreno

---

## ⚠️ Lectura obligatoria antes de modificar nada

1. Lee este documento completo
2. Lee [`README.md`](./README.md)
3. Lee [`SPECS.md`](./SPECS.md) — especificaciones del sistema
4. Lee [`CHANGELOG.md`](./CHANGELOG.md) — historial de cambios

---

## 🔑 Accesos y credenciales

### Cuentas de servicios externos

> ⚠️ **IMPORTANTE:** Las credenciales de acceso a las cuentas NO están en este documento por seguridad. Solicítalas al responsable del proyecto o al equipo de IT de IMPREDIMEX.

| Servicio | URL | Owner actual |
|---|---|---|
| GitHub | github.com/victormorenogarcia05-ux | victormorenogarcia05@gmail.com |
| Firebase | console.firebase.google.com | victormorenogarcia05@gmail.com |
| OneSignal | dashboard.onesignal.com | victormorenogarcia05@gmail.com |
| Cloudflare | dash.cloudflare.com | victormorenogarcia05@gmail.com |

### Recomendación al recibir el proyecto

1. **Transferir la propiedad** de las cuentas o crear cuentas corporativas de IMPREDIMEX
2. **Cambiar emails** asociados a cuentas corporativas
3. **Documentar nuevas credenciales** (sin ponerlas en el repo)
4. **Habilitar 2FA** en todas las cuentas

---

## 🆔 IDs y URLs clave del proyecto

### GitHub
- **Repo:** https://github.com/victormorenogarcia05-ux/Mantenimiento-Impredimex
- **URL pública:** https://victormorenogarcia05-ux.github.io/Mantenimiento-Impredimex/
- **Rama principal:** `main`

### Firebase
- **Proyecto:** `impredimex-mantoapp`
- **Realtime Database URL:** `https://impredimex-mantoapp-default-rtdb.firebaseio.com`
- **Plan:** Spark (gratuito)

### OneSignal
- **App ID:** `1bb0b5c6-1a08-4a5e-a300-715a65a1dcc1`
- **App Name:** IYS App
- **REST API Key:** *(guardada en Cloudflare Worker — no exponer en frontend)*

### Cloudflare
- **Account ID:** `a722ef314786d4ae10a8aacececbf61c`
- **Worker URL:** `https://mantoapp-push.victormorenogarcia05.workers.dev/`
- **Worker name:** `mantoapp-push`

---

## 🏗️ Cómo se construye el proyecto

### NO hay build process

Este proyecto **NO usa Webpack, Vite, npm, ni ningún build tool**. El `index.html` se sirve tal como está desde GitHub Pages.

**Ventajas:**
- Cero configuración
- Cero dependencias locales
- Cualquiera puede editar con un editor de texto

**Desventajas:**
- No hay minificación
- No hay tree-shaking
- No hay code splitting

Si en el futuro necesitas modularizar, considera usar **Vite** como bundler — es el más simple para proyectos vanilla JS.

### Cómo hacer cambios

**Opción A — Desde GitHub web:**
1. Abrir el repo en github.com
2. Clic en `index.html`
3. Clic en el ícono de lápiz (editar)
4. Modificar el código
5. Commit
6. Esperar 30-90 segundos a que GitHub Pages actualice

**Opción B — Localmente:**
1. Clonar el repo: `git clone https://github.com/victormorenogarcia05-ux/Mantenimiento-Impredimex.git`
2. Editar `index.html` con tu editor favorito
3. Hacer commit y push
4. Esperar la actualización de GitHub Pages

### Probar cambios localmente

Como el HTML necesita HTTPS para que funcionen las notificaciones push, lo más fácil es:
- Usar **Live Server** de VS Code
- O subir un branch a GitHub y crear un GitHub Pages alternativo para staging

---

## 🔔 Flujo de notificaciones push (CRÍTICO entender esto)

Este es el flujo más complejo del proyecto. **Léelo dos veces.**

```
Usuario hace acción que requiere notificar
         ↓
Frontend llama a notifyPush(nominas, title, body)
         ↓
fetch POST → mantoapp-push.victormorenogarcia05.workers.dev
         ↓
Cloudflare Worker recibe la petición
         ↓
Worker hace fetch POST → onesignal.com/api/v1/notifications
         ↓
Worker pasa el header Authorization: Basic [REST_API_KEY]
         ↓
OneSignal procesa y entrega push a los dispositivos
con tags que coinciden con las nominas
```

### Por qué el Worker es necesario

La REST API de OneSignal **NO permite llamadas directas desde el navegador (CORS)**. Por eso se necesita un proxy. El Worker de Cloudflare cumple esa función Y mantiene la API key segura (oculta en el servidor).

### Cuándo modificar el Worker

Si necesitas cambiar la lógica de envío de notificaciones:

1. Ir a Cloudflare Dashboard
2. Workers & Pages → `mantoapp-push`
3. Editar código
4. Deploy

**⚠️ NO pongas la API key en el `index.html`** — solo en el Worker.

---

## 🔐 Seguridad

### Reglas actuales de Firebase Realtime Database

```json
{
  "rules": {
    "manto_db": {
      ".read": "auth != null",
      ".write": "auth != null",
      ".indexOn": ["status", "folio"]
    }
  }
}
```

**Significa:** Solo usuarios autenticados (incluso anónimamente) pueden leer/escribir. Cualquier usuario que abra la app obtiene auth anónima automáticamente.

### Limitaciones de seguridad actuales

- Las contraseñas de la app son **fijas y públicas** (cualquiera con la URL puede probar contraseñas)
- La autenticación es anónima — Firebase no sabe quién es cada usuario realmente
- No hay rate limiting en el Worker

### Si necesitas reforzar la seguridad

Considera:
1. Implementar **Firebase Auth con email/password** o **custom claims**
2. Reglas más granulares (ej: solo el creador puede editar su OT)
3. Agregar **Cloudflare Turnstile** al Worker para evitar abuse

---

## 📊 Modelo de datos

Ver Anexo A de [`SPECS.md`](./SPECS.md) para el modelo completo.

### Backup de datos

Firebase Realtime Database NO tiene backup automático en el plan Spark. **Recomendación:**

1. En Firebase Console → Realtime Database → 3 puntos → "Exportar JSON"
2. Hacerlo manualmente cada semana o automatizarlo con un script
3. Guardar los backups en Google Drive o similar

---

## 🚨 Troubleshooting común

### "No me llegan las notificaciones"

1. Verificar que el usuario está suscrito en OneSignal Dashboard → Audience → Subscriptions
2. Verificar que los tags `nomina` y `role` están bien aplicados
3. Verificar logs en Cloudflare Workers → mantoapp-push → Logs
4. Verificar que el Worker tiene la REST API Key correcta (no la App ID)

### "La app no carga"

1. Verificar que GitHub Pages está activo: Settings → Pages
2. Verificar la consola del navegador (F12 → Console) por errores
3. Verificar reglas de Firebase (no deben requerir auth distinta a anónima)

### "Permission denied en Firebase"

Significa que las reglas de Firebase están bloqueando. Verificar que el código hace `signInAnonymously()` antes de leer/escribir.

### "El folio no se reinicia"

Verificar que el código del fix está presente (líneas con `// SPEC-002:`). Ver [`SPECS.md`](./SPECS.md) → SPEC-002.

---

## 💰 Costos y límites

### Plan gratuito actual

| Servicio | Límite gratuito | Uso actual estimado |
|---|---|---|
| GitHub Pages | Ilimitado | < 1% |
| Firebase Spark | 1GB DB, 10GB transferencia/mes | < 5% |
| OneSignal | 10,000 suscriptores web | < 1% |
| Cloudflare Workers | 100,000 requests/día | < 1% |

### Cuándo considerar upgrade

- Firebase: si la base de datos crece más de 800MB → considerar plan Blaze
- OneSignal: si superas 10,000 suscriptores → planes de pago
- Cloudflare: si superas 100,000 notificaciones/día → plan Workers Paid ($5/mes)

---

## 🔄 Integración con ERP (futuro)

Si la empresa decide integrar MantoApp con un ERP comercial:

### Opciones de integración

**Opción 1 — Webhooks de Firebase**
Configurar Cloud Functions que disparen webhooks al ERP cuando cambien datos. Requiere migrar a plan Blaze.

**Opción 2 — API REST intermedia**
Crear una capa de API REST (Cloudflare Workers o Node.js) que el ERP pueda consumir. Es la opción más limpia.

**Opción 3 — Sync periódico**
El ERP consulta directamente Firebase REST API cada X minutos. Más simple pero menos eficiente.

### Lo que el equipo del ERP necesitará

- Acceso de lectura a Firebase (crear cuenta de servicio con permisos limitados)
- Documentación del modelo de datos (Anexo A de SPECS.md)
- Endpoints documentados (a crear)
- Mapeo de campos MantoApp ↔ ERP

---

## 📚 Recursos de aprendizaje

Si el nuevo desarrollador no conoce el stack:

| Tecnología | Recurso recomendado |
|---|---|
| Firebase Realtime Database | https://firebase.google.com/docs/database/web/start |
| OneSignal Web Push | https://documentation.onesignal.com/docs/web-push-quickstart |
| Cloudflare Workers | https://developers.cloudflare.com/workers/ |
| JavaScript vanilla | https://javascript.info/ |
| Git/GitHub | https://docs.github.com/en/get-started |

---

## ✅ Checklist de transición

Cuando alguien tome el proyecto, debe completar esta lista:

- [ ] Recibir credenciales de las 4 cuentas (GitHub, Firebase, OneSignal, Cloudflare)
- [ ] Hacer login y verificar acceso a cada servicio
- [ ] Clonar el repo y probar editarlo
- [ ] Hacer un cambio menor de prueba y deployarlo
- [ ] Verificar que la app pública sigue funcionando
- [ ] Hacer un backup inicial de la base de datos
- [ ] Cambiar las credenciales si es necesario
- [ ] Habilitar 2FA en todas las cuentas
- [ ] Documentar al menos un cambio en CHANGELOG.md
- [ ] Probar el flujo completo de OT con notificaciones

---

## 📞 Contacto del desarrollador original

**Victor Moreno**
Email: victormorenogarcia05@gmail.com

> Si necesitas ayuda en la transición, contacta al desarrollador original durante los primeros 30 días post-handover.

---

*Documento de handover versión 1.0 — 27 de junio de 2026*
