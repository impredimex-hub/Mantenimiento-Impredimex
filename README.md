# MantoApp Impredimex

> Sistema de gestión de Órdenes de Trabajo (OT) de mantenimiento industrial

[![GitHub Pages](https://img.shields.io/badge/deployed-GitHub%20Pages-success)](https://victormorenogarcia05-ux.github.io/Mantenimiento-Impredimex/)
[![Status](https://img.shields.io/badge/status-en%20producción-brightgreen)]()
[![License](https://img.shields.io/badge/license-Privado-blue)]()

---

## 📋 Descripción

**MantoApp** es una aplicación web para gestionar el ciclo completo de órdenes de trabajo de mantenimiento en planta industrial. Permite a operadores reportar fallas, asignar técnicos, dar seguimiento al avance en tiempo real, y mantener un historial completo con análisis estadísticos para supervisión.

### Características principales

- 🔄 **Sincronización en tiempo real** entre todos los usuarios
- 🔔 **Notificaciones push** a dispositivos móviles y escritorio
- 👥 **4 roles diferenciados** (Solicitante, Técnico, Supervisor, Admin)
- 📱 **Diseño mobile-first** para uso en piso de planta
- 🌐 **Multi-dispositivo** (Android, iOS, Windows, Linux)
- 💾 **Sin instalación** — funciona desde el navegador
- 🆓 **Cero costo de operación** (todos los servicios en plan gratuito)

---

## 🚀 Acceso a la aplicación

**URL pública:** https://victormorenogarcia05-ux.github.io/Mantenimiento-Impredimex/

### Credenciales por rol

| Rol | Contraseña |
|---|---|
| Solicitante | `solicitud` |
| Técnico | `mantenimiento` |
| Supervisor / Jefe | `administrador` |
| Administrador | `IMPREDIMEX` |

> **Nota:** La nómina debe estar previamente registrada en el catálogo de personal por un administrador.

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────┐
│   Frontend (index.html en GitHub Pages) │
│   HTML + CSS + JS vanilla, single file  │
└──────────────┬──────────────────────────┘
               │
        ┌──────┴──────┬──────────────┐
        ▼             ▼              ▼
   Firebase RTDB   Cloudflare      OneSignal
   (datos)         Worker          (push)
                   (proxy push)
```

### Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | HTML5 + CSS3 + JavaScript vanilla (sin frameworks) |
| Base de datos | Firebase Realtime Database |
| Autenticación | Firebase Authentication (anónima) |
| Notificaciones | OneSignal Web SDK v16 |
| Proxy seguro | Cloudflare Workers |
| Hosting | GitHub Pages (HTTPS automático) |
| Librerías | xlsx (export Excel) |

---

## 📁 Estructura del repositorio

```
Mantenimiento-Impredimex/
├── index.html              # Aplicación completa (single-file)
├── OneSignalSDKWorker.js   # Service Worker de notificaciones
├── README.md               # Este archivo
├── SPECS.md                # Especificaciones funcionales (SDD)
├── HANDOVER.md             # Guía de transición/onboarding
└── CHANGELOG.md            # Historial de cambios
```

---

## 🔧 Desarrollo

### Metodología

El proyecto sigue **SDD (Spec-Driven Development)** desde junio 2026. Cualquier cambio debe:

1. Iniciar con la actualización del archivo `SPECS.md`
2. Implementar el código fiel a la spec
3. Comentar el código referenciando la spec: `// SPEC-XXX: ...`
4. Registrar el cambio en `CHANGELOG.md`

### Cómo modificar la app

1. Clonar el repo o editar directamente en GitHub
2. Modificar `index.html` (toda la app vive ahí)
3. Hacer commit → GitHub Pages se actualiza automáticamente en 30-90 segundos
4. Probar en el navegador (limpiar caché con Ctrl+Shift+R)

### Servicios externos requeridos

Si vas a tomar este proyecto, asegúrate de tener acceso a:

| Servicio | URL | Propósito |
|---|---|---|
| GitHub | github.com/victormorenogarcia05-ux/Mantenimiento-Impredimex | Repositorio |
| Firebase Console | console.firebase.google.com → impredimex-mantoapp | Base de datos |
| OneSignal Dashboard | dashboard.onesignal.com | Notificaciones |
| Cloudflare Dashboard | dash.cloudflare.com | Worker proxy |

Ver [HANDOVER.md](./HANDOVER.md) para credenciales y accesos.

---

## 📖 Documentación

| Documento | Propósito |
|---|---|
| [`SPECS.md`](./SPECS.md) | Especificaciones funcionales formales (SDD) |
| [`HANDOVER.md`](./HANDOVER.md) | Guía de transición y onboarding para nuevos desarrolladores |
| [`CHANGELOG.md`](./CHANGELOG.md) | Historial de cambios y versiones |

---

## 🧪 Cómo probar la app

1. Acceder a la URL pública
2. Iniciar sesión con cualquier rol
3. Probar el flujo completo:
   - Crear OT como solicitante
   - Tomar OT como técnico
   - Confirmar técnico en máquina
   - Registrar actividades
   - Concluir OT
   - Validar cierre como solicitante

Para más detalle ver [`SPECS.md`](./SPECS.md).

---

## 🐛 Limitaciones conocidas

- Contraseñas fijas por rol (no hay recuperación)
- Sin historial de modificaciones por OT
- iOS requiere subdirectorio específico para push
- Plan Spark de Firebase tiene límite de 1GB y 10GB transferencia/mes

---

## 📞 Contacto

**Desarrollador original:** Victor Moreno
**Empresa:** Impresión y Diseño de México S.A. de C.V. (IMPREDIMEX)
**Año:** 2026

---

## 📄 Licencia

Software privado de uso interno de IMPREDIMEX.
