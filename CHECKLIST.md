# Comprobaciones antes de reemplazar `index.html`

Prueba `nuevo.html` con tu cuenta. La app que usan los técnicos sigue intacta
mientras tanto.

> **Las dos versiones escriben en la misma base.** Si levantas una orden de
> prueba, es una orden real que los técnicos van a ver. Bórrala después.

## Acceso (SPEC-001)

- [ ] Entrar con 2058 y tu clave de la suite. Debe abrir el panel de administrador
- [ ] Las contraseñas viejas ya no funcionan: prueba `IMPREDIMEX` y debe rechazarla
- [ ] Escribir una nómina y ver que aparece el nombre debajo, como antes
- [ ] Entrar con un técnico (por ejemplo 638) y su clave nueva de 6 dígitos
- [ ] Entrar con un solicitante (por ejemplo 2129) y verificar que ve su pantalla
- [ ] Intentar entrar con alguien sin acceso a Mantenimiento (por ejemplo 2283,
      que solo tiene RRHH): debe decir que no tiene acceso, no dejar la pantalla vacía
- [ ] Cerrar sesión y comprobar que vuelve a pedir la clave
- [ ] Recargar con F5 estando dentro: debe seguir la sesión y verse el personal

## Personal (SPEC-042, SPEC-043)

- [ ] El listado de personal muestra a las 24 personas con acceso, con su nombre,
      puesto y departamento
- [ ] El botón de alta avisa que las altas se hacen en RRHH
- [ ] Abrir la ficha de un técnico: nombre, puesto y departamento aparecen
      atenuados y no se pueden editar
- [ ] Cambiar el turno de un técnico, guardar, y verificar que se conserva al
      volver a entrar
- [ ] Marcar y desmarcar tipos de orden, guardar, y verificar que se conserva
- [ ] El botón de baja avisa que se hace en RRHH

## Enrutamiento y turnos (SPEC-016, SPEC-030)

- [ ] El rol de turnos muestra a los técnicos con el turno que les configuraste
- [ ] Dejar a 1237 (Jefe) y 2432 (Analista) sin ningún tipo marcado: no deben
      contar como disponibles para tomar órdenes
- [ ] Dejar a 2047 (Auxiliar) solo con Infraestructura y Seguridad: no debe
      contar como disponible para una orden de máquinas de producción
- [ ] Crear una orden de máquinas y comprobar que el aviso de técnicos ocupados
      considera a quien corresponde

## Lo que no debe haber cambiado

Estas partes no se tocaron. Si algo falla aquí, avísame porque sería un efecto
lateral no previsto:

- [ ] Crear una orden de trabajo desde el perfil de solicitante
- [ ] Tomar, pausar y cerrar una orden desde el perfil de técnico
- [ ] La pausa afecta solo a quien se retira, no a los demás asignados
- [ ] El tiempo de comedor cuenta como ocupado
- [ ] Las notificaciones llegan al departamento de Mantenimiento
- [ ] Los indicadores y las estadísticas muestran los mismos números que hoy
- [ ] El preventivo y su programación
- [ ] Los catálogos de naves, máquinas, infraestructura y tipos de servicio

## Después de reemplazar `index.html`

- [ ] Borrar `nuevo.html` del repositorio
- [ ] Repartir las nueve claves nuevas
- [ ] Eliminar el nodo `manto_db/personal` de la base de Mantenimiento
- [ ] Configurar App Check y publicar las reglas (SPEC-044), en ese orden
