# CHANGELOG

Todos los cambios notables del proyecto MantoApp se documentan en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el versionado sigue [Semantic Versioning](https://semver.org/lang/es/).

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

*Última actualización: 27 de junio de 2026*
