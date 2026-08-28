# NOTIFICACIONES.md — Guía de notificaciones push

## MantoApp Impredimex

Este documento describe **cuándo** se envían notificaciones push, **a quién** llegan y las **particularidades** del enrutamiento a lo largo del flujo de una Orden de Trabajo (OT).

**Última actualización:** 30 de julio de 2026
**Referencia:** SPEC-009 (sistema de notificaciones) y SPEC-011 (enrutamiento por tipo de servicio)

---

## Conceptos previos

La app maneja **dos clases de aviso** que no deben confundirse:

| Tipo | Dónde se ve | Sale del dispositivo |
|---|---|---|
| **Notificación push** | En el celular/escritorio, aunque la app esté cerrada | Sí (vía OneSignal) |
| **Notificación interna** | Dentro de la app, en la campana del rol | No |

Este documento se centra en las **push**. Las internas se mencionan solo cuando acompañan a una push.

### Cómo se decide el destinatario

- Las notificaciones dirigidas al **solicitante** usan el campo `ot.nomina` guardado al crear la OT (no se busca por nombre, para evitar errores por acentos o mayúsculas).
- Las notificaciones al **equipo de mantenimiento** se resuelven con la función `getNominasByTipoServicio(ot.tipo)`, que actualmente retorna a todo el personal activo del departamento sin importar el tipo de servicio.

---

## Destinatarios por tipo de servicio

Los tres tipos de servicio tienen **los mismos destinatarios**:

| Tipo de servicio | Destinatarios de la push |
|---|---|
| **MTTO-MAQ-PROD** | Todo el personal activo del departamento de Mantenimiento |
| **MTTO-INFRAESTRUCTURA** | Todo el personal activo del departamento de Mantenimiento |
| **MTTO-SEGURIDAD** | Todo el personal activo del departamento de Mantenimiento |

> Solo se notifica a quienes estén con estatus `activo` y en depto `MANTENIMIENTO`.
>
> **Nota histórica:** entre las versiones 1.1.0 y 1.2.0, Infraestructura y Seguridad notificaban únicamente al Jefe, Auxiliar y Analista de Mantenimiento. Ese filtrado se desactivó en la versión 1.3.0 por decisión operativa.

---

## Eventos que envían push

Existen **5 eventos** en todo el flujo que disparan una notificación push.

### 1. Nueva OT creada

- **Quién la dispara:** el solicitante, al crear la orden.
- **A quién llega:** a todo el personal activo del departamento de Mantenimiento.
- **Título del push:** `Nueva OT #folio`, o `URGENTE #folio` si la prioridad es "urgente" o "máquina parada".
- **Cuerpo:** descripción + equipo + nave.

### 2. Técnico toma la OT

- **Quién la dispara:** el técnico, al tomar la orden.
- **A quién llega:** únicamente al **solicitante** que creó la OT.
- **Título del push:** `Tecnico asignado`.
- **Cuerpo:** nombre del técnico que la tomó + folio.

### 3. OT suspendida / en espera

- **Quién la dispara:** el técnico, al poner la OT en espera con un motivo.
- **A quién llega:** únicamente al **solicitante**.
- **Título del push:** `OT suspendida`.
- **Cuerpo:** folio + motivo de la espera.
- **Interna adicional:** se genera aviso interno al supervisor.

### 4. OT concluida

- **Quién la dispara:** el técnico, al terminar el trabajo.
- **A quién llega:** únicamente al **solicitante**.
- **Título del push:** `OT concluida`.
- **Cuerpo:** folio + "lista para validar".
- **Interna adicional:** se genera aviso interno al supervisor (incluye si hubo error operativo).

### 5. Cierre rechazado

- **Quién la dispara:** el solicitante, al rechazar el cierre. La OT vuelve a estado "en proceso".
- **A quién llega:** a todo el personal activo del departamento de Mantenimiento.
- **Título del push:** `Cierre rechazado #folio`.
- **Cuerpo:** equipo + motivo del rechazo.
- **Interna adicional:** avisos internos al técnico y al supervisor.

---

## Pasos del flujo que NO envían push

Estos pasos son parte del ciclo de la OT pero **no** disparan notificación push:

- **Confirmar "técnico en máquina"** — confirmación dentro de la app.
- **Registrar tipo de problema, actividades y refacciones** — registro dentro de la app.
- **Validar cierre (aceptar)** — cierra la OT sin push (el flujo termina).

---

## Resumen rápido

| # | Evento | Lo dispara | Destinatario push |
|---|---|---|---|
| 1 | Nueva OT creada | Solicitante | Todo el depto Mantenimiento |
| 2 | Técnico toma OT | Técnico | Solicitante |
| 3 | OT en espera | Técnico | Solicitante |
| 4 | OT concluida | Técnico | Solicitante |
| 5 | Cierre rechazado | Solicitante | Todo el depto Mantenimiento |

---

## Particularidades y notas

- **Todos los tipos de servicio notifican a los mismos destinatarios.** No hay diferenciación entre MAQ-PROD, Infraestructura y Seguridad.
- **La rotación de personal no requiere tocar código.** Quien entre al departamento de Mantenimiento con estatus activo empezará a recibir las notificaciones automáticamente.
- **Si se requiere reactivar el filtrado por puesto**, el único punto a modificar es la función `getNominasByTipoServicio()`.
- **Si el permiso de notificaciones está denegado** en el dispositivo, el usuario no recibe push, pero sí ve los cambios al abrir la app.
- **Si el Worker de Cloudflare falla**, el frontend ignora el error y la app sigue funcionando; simplemente no se entrega esa push.

---

*Documento de referencia de notificaciones — versión 1.1 — 30 de julio de 2026*
