# NOTIFICACIONES.md — Guía de notificaciones push

## MantoApp Impredimex

Cuándo se envía cada notificación push, a quién llega y qué particularidades
tiene el enrutamiento a lo largo del flujo de una Orden de Trabajo (OT).

**Versión de la aplicación:** 2.12.0
**Última actualización:** 9 de octubre de 2026
**Referencias:** SPEC-009, SPEC-011, SPEC-047, SPEC-057, SPEC-059 y SPEC-061

---

## Un solo canal de aviso

Desde la versión que incluye la SPEC-057, **el push es el único aviso** que
genera la aplicación. Los avisos internos —la campana dentro de la app— se
retiraron porque eran la mayor parte del consumo de datos y no decían nada que
la lista de OT no muestre.

Consecuencia aceptada: el push no deja registro. Quien no lo vea no tiene dónde
recuperarlo, pero el estado de la orden sigue visible en su lista.

### Cómo se decide el destinatario

- Al **solicitante** se le avisa con la nómina guardada en la propia OT al
  crearla. No se busca por nombre, para evitar fallas por acentos o mayúsculas.
- Al **equipo de Mantenimiento** se le avisa con `getNominasByTipoServicio()`,
  que devuelve a todo el personal activo del departamento MANTENIMIENTO, sin
  importar el tipo de servicio. El supervisor y el jefe del área están en ese
  departamento, así que reciben los mismos avisos que los técnicos.

---

## Eventos que envían push

| # | Evento | Lo dispara | Llega a | Título |
|---|---|---|---|---|
| 1 | Nueva OT | Solicitante | Todo Mantenimiento | `Nueva OT #folio`, o `URGENTE #folio` si es urgente o máquina parada |
| 2 | Técnico toma la OT | Técnico | Solicitante | `Tecnico asignado` |
| 3 | OT en espera | Técnico | Solicitante | `OT suspendida`, con el motivo |
| 4 | OT en pausa porque el técnico pasó a otra | Técnico | Solicitante | `OT en pausa` |
| 5 | OT concluida | Técnico | Solicitante | `OT concluida` |
| 6 | Cierre rechazado | Solicitante | Todo Mantenimiento | `Cierre rechazado #folio`, con el motivo |

**Sobre el evento 4.** Solo se avisa si la orden quedó sin nadie atendiéndola.
Si otro técnico sigue en ella, el solicitante no recibe nada porque para él no
cambió nada.

**OT levantadas desde Ingeniería de Procesos.** Al cerrar un check de
condiciones, Procesos puede levantar una OT. Esa app avisa al equipo con la
lista `manto_db/notificarA`, que esta aplicación publica con las nóminas activas
de Mantenimiento, y el aviso abre esta app con la dirección de `manto_db/urlApp`
(SPEC-059).

---

## Pasos que no envían push

- Confirmar «técnico en máquina»
- Registrar tipo de problema, actividades y refacciones
- Validar el cierre: la orden se cierra y el flujo termina

---

## Particularidades

- **Los tres tipos de servicio avisan a las mismas personas.** El enrutamiento
  por puesto existió entre las versiones 1.1.0 y 1.2.0 y se desactivó por
  decisión operativa. Si se quisiera volver a separar, el único punto a
  modificar es `getNominasByTipoServicio()`.
- **La rotación de personal no requiere tocar código.** Quien entre al
  departamento de Mantenimiento con estatus activo empieza a recibir los avisos
  en su siguiente inicio de sesión.
- **El dispositivo se etiqueta al entrar** con `nomina`, `role` y `nombre`. Si
  dos personas usan el mismo teléfono, recibe los avisos quien inició sesión al
  último.
- **Sin permiso de notificaciones** en el dispositivo no hay push, pero los
  cambios se ven al abrir la app.
- **Si el worker de Cloudflare falla**, la app sigue funcionando y ese push no
  se entrega. El error solo aparece en la consola del navegador.
- **El worker solo acepta llamadas desde `https://impredimex-hub.github.io`.**
  Si la app cambia de dominio, hay que agregar el nuevo en `ORIGENES` del
  worker antes de publicar.
- **El worker exige la sesión de quien avisa** (SPEC-061). La app manda su
  sesión de la suite en la cabecera `Authorization`, y el worker solo reenvía
  avisos de alguien activo con acceso a Mantenimiento o Procesos. Limita además
  el tamaño del texto, a 100 destinatarios por aviso y el enlace a
  `impredimex-hub.github.io`.

---

*Versión 2.1 del documento — 9 de octubre de 2026*
