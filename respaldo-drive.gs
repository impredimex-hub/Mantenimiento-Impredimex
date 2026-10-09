/**
 * Respaldo diario de MantoApp a Google Drive — SPEC-060
 *
 * Corre cada noche desde Google Apps Script, sin servidor y sin costo:
 *   1. Abre una sesión anónima en el proyecto impredimex-mantoapp, la misma
 *      puerta que usa la app.
 *   2. Descarga la base completa y verifica que sea un respaldo válido.
 *   3. La guarda en la carpeta CARPETA de Drive.
 *   4. Manda a la papelera los respaldos de esa carpeta con más de
 *      DIAS_CONSERVAR días.
 *   5. Anota el respaldo en `respaldos/drive`, que es lo que lee la app para
 *      mostrar el último respaldo y avisar si pasan más de 7 días sin uno.
 *   6. Borra la cuenta anónima que usó.
 *
 * Instalación: ver HANDOVER.md, sección «Respaldo». En resumen: pegar este
 * archivo en un proyecto nuevo de script.google.com con la cuenta que guardará
 * los respaldos, ajustar la zona horaria del proyecto y ejecutar `instalar`.
 *
 * No contiene contraseñas. La configuración de Firebase es pública por diseño;
 * lo que protege la base son sus reglas.
 */

var CONFIG = {
  API_KEY:        'AIzaSyB6ZjPeh9bwY5d2M-ZpxIbEW3ZsLzhAz0M',
  DB_URL:         'https://impredimex-mantoapp-default-rtdb.firebaseio.com',
  CARPETA:        'Respaldos MantoApp',
  DIAS_CONSERVAR: 90,
  HORA:           2,                       // hora del día en que corre (0–23)
  ZONA:           'America/Mexico_City'
};

var PREFIJO = 'Respaldo_Mantenimiento_';

/** Hace un respaldo. Es lo que ejecuta el disparador cada noche. */
function respaldar() {
  var sesion = abrirSesionAnonima_();
  try {
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

    // La limpieza va después de guardar el nuevo, nunca antes.
    var enPapelera = limpiar_(carpeta);

    escribir_(sesion.idToken, 'respaldos/drive', {
      fecha: ahora.getTime(),
      bytes: bytes,
      archivo: nombre
    });

    console.log('Respaldo guardado: ' + nombre + ' (' + Math.round(bytes / 1024) + ' KB, ' +
                Object.keys(datos.manto_db.ots).length + ' OT vivas). A la papelera: ' + enPapelera + '.');
  } finally {
    // Sin esto se acumularía una cuenta anónima por noche en Authentication.
    borrarSesion_(sesion.idToken);
  }
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

/** Quita el disparador diario. Los respaldos ya guardados se quedan. */
function desinstalar() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'respaldar') ScriptApp.deleteTrigger(t);
  });
}

// ─── Internos ───────────────────────────────────────────────────────────

function abrirSesionAnonima_() {
  var resp = UrlFetchApp.fetch(
    'https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=' + CONFIG.API_KEY, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ returnSecureToken: true }),
      muteHttpExceptions: true
    });
  var cuerpo = JSON.parse(resp.getContentText());
  if (resp.getResponseCode() !== 200 || !cuerpo.idToken) {
    var msg = (cuerpo.error && cuerpo.error.message) || resp.getContentText().slice(0, 300);
    throw new Error('No se pudo abrir la sesión anónima: ' + msg +
      '. Revisa que el proveedor Anónimo siga habilitado en Authentication de impredimex-mantoapp ' +
      'y que la API key no esté restringida a navegadores.');
  }
  return cuerpo;
}

function borrarSesion_(idToken) {
  try {
    UrlFetchApp.fetch('https://identitytoolkit.googleapis.com/v1/accounts:delete?key=' + CONFIG.API_KEY, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ idToken: idToken }),
      muteHttpExceptions: true
    });
  } catch (e) {
    console.warn('No se pudo borrar la sesión anónima: ' + e);
  }
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
