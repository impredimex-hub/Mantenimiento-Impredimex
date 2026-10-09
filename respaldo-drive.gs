/**
 * Respaldo diario de MantoApp a Google Drive — SPEC-060
 *
 * Corre cada noche desde Google Apps Script, sin servidor y sin costo:
 *   1. Pide al servicio mantoapp-push (Cloudflare) la credencial del respaldo,
 *      que solo permite leer la base y anotar `respaldos/drive` (SPEC-061).
 *   2. Descarga la base completa y verifica que sea un respaldo válido.
 *   3. La guarda en la carpeta CARPETA de Drive, como JSON (para restaurar) y
 *      como Excel (para consultar).
 *   4. Manda a la papelera los respaldos de esa carpeta con más de
 *      DIAS_CONSERVAR días.
 *   5. Anota el respaldo en `respaldos/drive`, que es lo que lee la app para
 *      mostrar el último respaldo y avisar si pasan más de 7 días sin uno.
 *
 * Instalación: ver HANDOVER.md, sección «Respaldo». En resumen: pegar este
 * archivo en un proyecto nuevo de script.google.com con la cuenta que guardará
 * los respaldos, ajustar la zona horaria del proyecto, guardar el secreto del
 * respaldo en Propiedades del script y ejecutar `instalar`.
 *
 * Este archivo no contiene secretos. El secreto que abre la credencial vive en
 * Configuración del proyecto → Propiedades del script, con el nombre
 * RESPALDO_SECRETO, y es el mismo valor guardado en el worker de Cloudflare.
 * La configuración de Firebase es pública por diseño.
 */

var CONFIG = {
  API_KEY:        'AIzaSyB6ZjPeh9bwY5d2M-ZpxIbEW3ZsLzhAz0M',
  DB_URL:         'https://impredimex-mantoapp-default-rtdb.firebaseio.com',
  SERVICIO:       'https://mantoapp-push.victormorenogarcia05.workers.dev/',
  CARPETA:        'Respaldos MantoApp',
  DIAS_CONSERVAR: 90,
  HORA:           2,                       // hora del día en que corre (0–23)
  ZONA:           'America/Mexico_City'
};

var PREFIJO = 'Respaldo_Mantenimiento_';

/** Hace un respaldo. Es lo que ejecuta el disparador cada noche. */
function respaldar() {
  var sesion = abrirSesion_();
  var resp = UrlFetchApp.fetch(CONFIG.DB_URL + '/.json?auth=' + encodeURIComponent(sesion.idToken),
                               { muteHttpExceptions: true });
  if (resp.getResponseCode() !== 200) {
    throw new Error('La base respondió ' + resp.getResponseCode() + ': ' + resp.getContentText().slice(0, 300));
  }
  var texto = resp.getContentText('UTF-8');

  // Si algo salió mal no se guarda ni se borra nada: un archivo vacío con
  // fecha de hoy daría la impresión de un respaldo que no existe.
  var datos;
  try { datos = JSON.parse(texto); }
  catch (e) { throw new Error('La respuesta no es JSON válido.'); }
  if (!datos || !datos.manto_db || !datos.manto_db.ots) {
    throw new Error('La respuesta no trae manto_db/ots; no parece la base de Mantenimiento.');
  }

  var ahora = new Date();
  var nombre = PREFIJO + Utilities.formatDate(ahora, CONFIG.ZONA, 'yyyy-MM-dd_HHmm') + '.json';
  var carpeta = carpeta_();
  var archivo = carpeta.createFile(Utilities.newBlob(texto, 'application/json', nombre));
  var bytes = archivo.getSize();

  // El Excel es un extra para consultar. Si falla, el JSON —que es el que
  // restaura— ya quedó guardado y el respaldo sigue siendo válido.
  var excel = '';
  try {
    excel = guardarExcel_(datos, carpeta, nombre.replace(/\.json$/, '')).getName();
  } catch (e) {
    console.warn('El JSON se guardó, pero el Excel no: ' + e);
  }

  // La limpieza va después de guardar el nuevo, nunca antes.
  var enPapelera = limpiar_(carpeta);

  escribir_(sesion.idToken, 'respaldos/drive', {
    fecha: ahora.getTime(),
    bytes: bytes,
    archivo: nombre,
    excel: excel
  });

  console.log('Respaldo guardado: ' + nombre + ' (' + Math.round(bytes / 1024) + ' KB, ' +
              Object.keys(datos.manto_db.ots).length + ' OT vivas)' +
              (excel ? ' y ' + excel : '; sin Excel') + '. A la papelera: ' + enPapelera + '.');
}

/**
 * Crea el disparador diario y hace el primer respaldo. Ejecutarlo una vez al
 * instalar. Si se vuelve a ejecutar, reemplaza el disparador en lugar de
 * duplicarlo.
 */
function instalar() {
  desinstalar();
  ScriptApp.newTrigger('respaldar').timeBased().everyDays(1).atHour(CONFIG.HORA).create();
  respaldar();
  console.log('Instalado: corre todos los días alrededor de las ' + CONFIG.HORA + ':00 (' +
              Session.getScriptTimeZone() + ').');
}

/**
 * Crea el secreto del respaldo y lo guarda en las Propiedades del script. Se
 * ejecuta una vez; el registro muestra el valor para copiarlo al worker de
 * Cloudflare como RESPALDO_SECRETO. Si ya existe, no lo cambia: para cambiarlo,
 * borrar antes la propiedad.
 */
function generarSecreto() {
  var props = PropertiesService.getScriptProperties();
  var actual = props.getProperty('RESPALDO_SECRETO');
  if (actual) {
    console.log('Ya hay un secreto guardado. Valor para el worker: ' + actual);
    return;
  }
  var secreto = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
  props.setProperty('RESPALDO_SECRETO', secreto);
  console.log('Secreto creado. Cópialo al worker como RESPALDO_SECRETO: ' + secreto);
}

/** Quita el disparador diario. Los respaldos ya guardados se quedan. */
function desinstalar() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'respaldar') ScriptApp.deleteTrigger(t);
  });
}

// ─── Internos ───────────────────────────────────────────────────────────

// La credencial se pide con el secreto compartido con el worker. La cuenta que
// usa (uid `respaldo-drive`) es siempre la misma, así que no se acumulan
// cuentas en Authentication y no hay nada que borrar al terminar.
function abrirSesion_() {
  var secreto = PropertiesService.getScriptProperties().getProperty('RESPALDO_SECRETO');
  if (!secreto) {
    throw new Error('Falta RESPALDO_SECRETO en Configuración del proyecto → Propiedades del script.');
  }
  var r1 = UrlFetchApp.fetch(CONFIG.SERVICIO + 'credencial-respaldo', {
    method: 'post',
    headers: { 'X-Respaldo': secreto },
    muteHttpExceptions: true
  });
  var c1 = {};
  try { c1 = JSON.parse(r1.getContentText()); } catch (e) {}
  if (r1.getResponseCode() !== 200 || !c1.token) {
    throw new Error('El servicio no entregó la credencial del respaldo (' + r1.getResponseCode() + '): ' +
      (c1.error || r1.getContentText().slice(0, 200)) +
      '. Revisa que RESPALDO_SECRETO sea igual aquí y en el worker.');
  }
  // La credencial se cambia por una sesión de Firebase, igual que en la app.
  var r2 = UrlFetchApp.fetch(
    'https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=' + CONFIG.API_KEY, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ token: c1.token, returnSecureToken: true }),
      muteHttpExceptions: true
    });
  var c2 = JSON.parse(r2.getContentText());
  if (r2.getResponseCode() !== 200 || !c2.idToken) {
    var msg = (c2.error && c2.error.message) || r2.getContentText().slice(0, 300);
    throw new Error('No se pudo abrir la sesión del respaldo: ' + msg);
  }
  return c2;
}

function escribir_(idToken, ruta, valor) {
  var resp = UrlFetchApp.fetch(CONFIG.DB_URL + '/' + ruta + '.json?auth=' + encodeURIComponent(idToken), {
    method: 'put',
    contentType: 'application/json',
    payload: JSON.stringify(valor),
    muteHttpExceptions: true
  });
  if (resp.getResponseCode() !== 200) {
    // El archivo ya quedó guardado en Drive; solo falló el aviso a la app.
    console.warn('El respaldo se guardó, pero no se pudo anotar en ' + ruta + ': ' + resp.getContentText().slice(0, 200));
  }
}

function carpeta_() {
  var it = DriveApp.getFoldersByName(CONFIG.CARPETA);
  return it.hasNext() ? it.next() : DriveApp.createFolder(CONFIG.CARPETA);
}

// Arma el Excel en una hoja de cálculo de Google temporal, la exporta como
// .xlsx a la carpeta de respaldos y manda la temporal a la papelera.
function guardarExcel_(datos, carpeta, nombreBase) {
  var hojas = armarHojasRespaldo(datos, function (iso) {
    var d = new Date(iso);
    return isNaN(d.getTime()) ? String(iso) : Utilities.formatDate(d, CONFIG.ZONA, 'yyyy-MM-dd HH:mm');
  });
  var ss = SpreadsheetApp.create(nombreBase);
  try {
    var primera = ss.getSheets()[0];
    hojas.forEach(function (h, i) {
      var sh = i === 0 ? primera.setName(h.nombre) : ss.insertSheet(h.nombre);
      var filas = [h.encabezados].concat(h.filas).map(function (r) {
        return r.map(function (v) {
          // Un texto que empieza con = + - @ se tomaría como fórmula: el
          // apóstrofo inicial lo deja como texto y no aparece en la celda.
          return (typeof v === 'string' && /^[=+\-@]/.test(v)) ? "'" + v : v;
        });
      });
      sh.getRange(1, 1, filas.length, h.encabezados.length).setValues(filas);
      sh.getRange(1, 1, 1, h.encabezados.length).setFontWeight('bold');
      sh.setFrozenRows(1);
    });
    SpreadsheetApp.flush();
    var resp = UrlFetchApp.fetch('https://docs.google.com/spreadsheets/d/' + ss.getId() + '/export?format=xlsx', {
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
      muteHttpExceptions: true
    });
    if (resp.getResponseCode() !== 200) throw new Error('Exportar a Excel respondió ' + resp.getResponseCode());
    return carpeta.createFile(resp.getBlob().setName(nombreBase + '.xlsx'));
  } finally {
    DriveApp.getFileById(ss.getId()).setTrashed(true);
  }
}

// ── SPEC-060: la base convertida en hojas de cálculo ─────────────────────
// Esta función existe IDÉNTICA en index.html y en respaldo-drive.gs, para que
// el Excel que descarga el administrador y el que guarda Drive cada noche
// tengan las mismas hojas y las mismas columnas. Si se cambia una, se cambia
// la otra.
//
// Recibe la base completa, tal como la devuelve la raíz, y una función que
// convierte una fecha ISO en texto con la hora de la planta. Devuelve una lista
// de hojas: {nombre, encabezados, filas}. Todas las filas tienen tantas celdas
// como encabezados.
//
// El Excel es para consultar, no para restaurar: lo que va anidado en cada OT
// (técnicos, actividades, refacciones…) se reparte en hojas ligadas por el
// folio. Para restaurar se usa el JSON del mismo día.
function armarHojasRespaldo(datos, fmtFecha) {
  var md = (datos && datos.manto_db) || {};
  var arch = (datos && datos.manto_db_archivo) || {};

  function lista(v) {
    if (!v) return [];
    var a = Array.isArray(v) ? v : Object.keys(v).map(function (k) { return v[k]; });
    return a.filter(function (x) { return x && typeof x === 'object'; });
  }
  function txt(v) {
    if (v === null || v === undefined) return '';
    if (typeof v === 'number' || typeof v === 'boolean') return v;
    var s = typeof v === 'object' ? JSON.stringify(v) : String(v);
    // Una celda de Excel admite 32 767 caracteres.
    return s.length > 30000 ? s.slice(0, 30000) + '…' : s;
  }
  function f(iso) { return iso ? fmtFecha(iso) : ''; }
  function num(v) { var n = Number(v); return isFinite(n) ? n : 0; }
  function horas(ini, fin) {
    if (!ini || !fin) return '';
    var ms = Date.parse(fin) - Date.parse(ini);
    return isFinite(ms) && ms >= 0 ? Math.round(ms / 36e5 * 100) / 100 : '';
  }
  function folioNum(o) { return parseInt(String(o.folio || o.id || '').replace(/\D/g, ''), 10) || 0; }

  var ESTATUS = { abierto: 'Abierta', proceso: 'En proceso', espera: 'En espera', validar: 'Pendiente de validación', cerrado: 'Cerrada' };
  var PRIORIDAD = { normal: 'Normal', urgente: 'Urgente', 'maquina-parada': 'Máquina parada' };

  var ots = lista(md.ots).map(function (o) { return { o: o, archivada: 'No' }; })
    .concat(lista(arch.ots).map(function (o) { return { o: o, archivada: 'Sí' }; }));
  ots.sort(function (a, b) { return folioNum(a.o) - folioNum(b.o); });

  var hOT = [], hTec = [], hAct = [], hRef = [], hEsp = [], hPau = [], hCom = [];
  ots.forEach(function (x) {
    var o = x.o, folio = txt(o.folio || ('#' + (o.id || '')));
    var tecs = lista(o.tecnicos), acts = lista(o.actividades), refs = lista(o.refacciones);
    var costo = refs.reduce(function (s, r) { return s + num(r.qty || 1) * num(r.costo); }, 0);
    var rech = o.rechazo || {}, esp = o.espera || {};
    hOT.push([
      folio, x.archivada, txt(ESTATUS[o.status] || o.status), txt(PRIORIDAD[o.prioridad] || o.prioridad),
      txt(o.tipo), txt(o.nave), txt(o.equipo), txt(o.area), txt(o.desc),
      txt(o.solicitante), txt(o.nomina), txt(o.origen || 'SOLICITUD'),
      f(o.fechaAlta), tecs.map(function (t) { return t.nombre || ''; }).join(', ') || txt(o.tecnico),
      f(o.fechaTomada), f(o.fechaPrimerContacto), txt(o.tipoProblema), num(o.avance),
      txt(o.errorOperativo), f(o.fechaCierreMantenimiento), f(o.fechaCierre),
      txt(rech.motivo), txt(rech.detalle), f(rech.fecha),
      o.status === 'espera' ? txt(esp.motivo) : '', o.status === 'espera' ? txt(esp.fechaEst) : '',
      txt(o.auditoriaTipo), f(o.auditoriaFecha), txt(o.auditor), txt(o.hallazgoTexto),
      o.folioLocal ? 'Sí' : '', acts.length, refs.length, Math.round(costo * 100) / 100
    ]);
    var contactos = o.contactosPorTecnico || {};
    tecs.forEach(function (t, i) {
      hTec.push([folio, i + 1, txt(t.nombre), txt(t.nomina), txt(t.turno), f(t.fecha),
                 f(contactos[t.nomina] || (i === 0 ? o.fechaPrimerContacto : '')), f(t.fechaSalida)]);
    });
    acts.forEach(function (a) {
      hAct.push([folio, txt(a.fecha), txt(a.inicio), txt(a.fin), txt(a.tecnico), txt(a.nomina),
                 txt(a.accion), txt(a.obs), num(a.avance), txt(a.errorOperativo)]);
    });
    refs.forEach(function (r) {
      var q = num(r.qty || 1), c = num(r.costo);
      hRef.push([folio, txt(r.tipo), txt(r.desc), q, c, Math.round(q * c * 100) / 100]);
    });
    lista(o.esperas).forEach(function (e) {
      hEsp.push([folio, f(e.inicio), f(e.fin), horas(e.inicio, e.fin), txt(e.motivo), txt(e.tecnico), txt(e.nomina)]);
    });
    lista(o.pausas).forEach(function (p) {
      hPau.push([folio, f(p.fecha), txt(p.tecnico), txt(p.nomina), txt(p.folioDestino)]);
    });
    lista(o.comentarios).forEach(function (c) {
      hCom.push([folio, f(c.fecha), txt(c.autor), txt(c.texto)]);
    });
  });

  // Catálogos: las columnas salen de los propios registros, para que un campo
  // nuevo aparezca sin tocar esta función. Una colección guardada por clave
  // conserva esa clave en la primera columna.
  function catalogo(nombre, v, claveTitulo) {
    if (!v) return null;
    // Firebase devuelve un arreglo con huecos como objeto de claves 0, 1, 2…;
    // eso sigue siendo una lista, no un catálogo por clave.
    var porClave = !Array.isArray(v) && !Object.keys(v).every(function (k) { return /^\d+$/.test(k); });
    var regs = porClave
      ? Object.keys(v).filter(function (k) { return v[k] && typeof v[k] === 'object'; })
          .map(function (k) { return { k: k, r: v[k] }; })
      : lista(v).map(function (r) { return { k: '', r: r }; });
    if (!regs.length) return null;
    var cols = [];
    regs.forEach(function (x) {
      Object.keys(x.r).forEach(function (c) { if (cols.indexOf(c) < 0) cols.push(c); });
    });
    var enc = (porClave ? [claveTitulo || 'clave'] : []).concat(cols);
    var filas = regs.map(function (x) {
      var fila = cols.map(function (c) {
        var val = x.r[c];
        if (Array.isArray(val)) return val.map(function (e) { return typeof e === 'object' ? JSON.stringify(e) : e; }).join(', ');
        if (typeof val === 'boolean') return val ? 'Sí' : 'No';
        return txt(val);
      });
      return porClave ? [x.k].concat(fila) : fila;
    });
    return { nombre: nombre, encabezados: enc, filas: filas };
  }

  var vivas = lista(md.ots).length, archivadas = lista(arch.ots).length;
  var hojas = [
    { nombre: 'Resumen', encabezados: ['Concepto', 'Valor'], filas: [
      ['Generado', fmtFecha(new Date().toISOString())],
      ['OT vivas', vivas],
      ['OT archivadas', archivadas],
      ['Técnicos registrados en OT', hTec.length],
      ['Actividades', hAct.length],
      ['Refacciones', hRef.length],
      ['Periodos de espera', hEsp.length],
      ['Para qué sirve', 'Consulta. Para restaurar la base se usa el archivo JSON del mismo respaldo.']
    ] },
    { nombre: 'OT', encabezados: ['Folio', 'Archivada', 'Estatus', 'Prioridad', 'Tipo de servicio', 'Nave', 'Equipo', 'Área',
      'Descripción', 'Solicitante', 'Nómina solicitante', 'Origen', 'Fecha de alta', 'Técnicos', 'Fecha en que se tomó',
      'Primer contacto', 'Tipo de problema', 'Avance %', 'Error operativo', 'Concluida por Mantenimiento',
      'Cierre validado', 'Motivo de rechazo', 'Detalle de rechazo', 'Fecha de rechazo', 'Motivo de espera actual',
      'Fecha estimada de reanudación', 'Tipo de auditoría', 'Fecha de auditoría', 'Auditor', 'Hallazgo', 'Folio local',
      'Actividades', 'Refacciones', 'Costo de refacciones'], filas: hOT },
    { nombre: 'Técnicos por OT', encabezados: ['Folio', 'Orden', 'Técnico', 'Nómina', 'Turno', 'Tomó la OT', 'Primer contacto', 'Se retiró'], filas: hTec },
    { nombre: 'Actividades', encabezados: ['Folio', 'Fecha', 'Inicio', 'Fin', 'Técnico', 'Nómina', 'Acción', 'Observaciones', 'Avance %', 'Error operativo'], filas: hAct },
    { nombre: 'Refacciones', encabezados: ['Folio', 'Tipo', 'Descripción', 'Cantidad', 'Costo unitario', 'Importe'], filas: hRef },
    { nombre: 'Esperas', encabezados: ['Folio', 'Inicio', 'Fin', 'Horas', 'Motivo', 'Técnico', 'Nómina'], filas: hEsp },
    { nombre: 'Pausas', encabezados: ['Folio', 'Fecha', 'Técnico', 'Nómina', 'Pasó a la OT'], filas: hPau },
    { nombre: 'Comentarios', encabezados: ['Folio', 'Fecha', 'Autor', 'Texto'], filas: hCom }
  ];
  [catalogo('Máquinas', md.maquinas), catalogo('Zonas de planta', md.zonas), catalogo('Naves', md.naves),
   catalogo('Infraestructura', md.infraestructura), catalogo('Tipos de servicio', md.tiposServicio),
   catalogo('Técnicos — tipos de OT', md.operativo)]
    .forEach(function (h) { if (h) hojas.push(h); });

  // Garantiza filas del mismo ancho que sus encabezados: Sheets lo exige.
  hojas.forEach(function (h) {
    var n = h.encabezados.length;
    h.filas = h.filas.map(function (r) {
      r = r.slice(0, n);
      while (r.length < n) r.push('');
      return r;
    });
  });
  return hojas;
}

// A la papelera de Drive, no borrado definitivo: se recuperan durante 30 días.
// Solo toca archivos de esta carpeta que empiecen con el prefijo de respaldo.
function limpiar_(carpeta) {
  var limite = Date.now() - CONFIG.DIAS_CONSERVAR * 864e5;
  var n = 0, it = carpeta.getFiles();
  while (it.hasNext()) {
    var f = it.next();
    if (f.getName().indexOf(PREFIJO) === 0 && f.getDateCreated().getTime() < limite) {
      f.setTrashed(true);
      n++;
    }
  }
  return n;
}
