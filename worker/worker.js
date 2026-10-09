/**
 * Worker mantoapp-push — Cloudflare Workers (SPEC-061)
 *
 * Dos trabajos:
 *
 *   1. VENTANILLA DE CREDENCIALES. Las reglas de la base de Mantenimiento no
 *      pueden validar la sesión de la suite, porque es de otro proyecto. Este
 *      worker la valida con las llaves públicas de Google, consulta la ficha de
 *      la persona en la suite y le entrega una credencial firmada para
 *      impredimex-mantoapp con su nómina y su papel. Las reglas de la base leen
 *      esa credencial.
 *
 *        POST /credencial            {idToken, app: 'manto' | 'procesos'}
 *        POST /credencial-respaldo   cabecera X-Respaldo con el secreto del
 *                                    script de Drive
 *
 *   2. AVISOS PUSH. Reenvía a OneSignal con la llave guardada aquí, para que no
 *      viva en el código público. Exige la sesión de la suite.
 *
 *        POST /   (o /push)          cabecera Authorization: Bearer <idToken>
 *                                    {nominas, title, message, url}
 *
 * Secretos — Settings → Variables and Secrets, tipo «Secret». Nunca en el código:
 *   SA_MANTOAPP        JSON completo de la cuenta de servicio de impredimex-mantoapp
 *   ONESIGNAL_API_KEY  REST API key de OneSignal
 *   RESPALDO_SECRETO   cadena larga y aleatoria; la misma va en el script de Drive
 *
 * Variable — tipo «Text»:
 *   EXIGIR_SESION      "si" exige sesión de la suite para mandar push. "no" acepta
 *                      también los avisos sin sesión de las versiones anteriores
 *                      de las apps; solo durante la transición.
 */

const ONESIGNAL_APP_ID = '1bb0b5c6-1a08-4a5e-a300-715a65a1dcc1';
const SUITE_PROJECT = 'impredimex-suite';
const DOMINIO = '@impredimex.local';
const ORIGENES = ['https://impredimex-hub.github.io'];
const URL_APP = 'https://impredimex-hub.github.io/Mantenimiento-Impredimex/';
const PAPELES_MANTO = ['solicitante', 'tecnico', 'supervisor', 'admin'];

const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const AUD_CUSTOM = 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit';

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const cors = {
      'Access-Control-Allow-Origin': ORIGENES.includes(origin) ? origin : ORIGENES[0],
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin'
    };
    const responder = (status, cuerpo) => new Response(JSON.stringify(cuerpo), {
      status, headers: { ...cors, 'Content-Type': 'application/json' }
    });

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'POST') return responder(405, { error: 'Método no permitido' });

    const ruta = new URL(request.url).pathname.replace(/\/+$/, '') || '/';
    try {
      if (ruta === '/credencial') return await credencial(request, env, responder);
      if (ruta === '/credencial-respaldo') return await credencialRespaldo(request, env, responder);
      if (ruta === '/' || ruta === '/push') return await push(request, env, responder);
      return responder(404, { error: 'Ruta desconocida' });
    } catch (e) {
      if (e instanceof Rechazo) return responder(e.status, { error: e.message });
      console.error(e);
      return responder(500, { error: 'Error interno' });
    }
  }
};

class Rechazo extends Error {
  constructor(status, mensaje) { super(mensaje); this.status = status; }
}

// ─── Ventanilla ──────────────────────────────────────────────────────────

async function credencial(request, env, responder) {
  const { idToken, app } = await leerJson(request);
  if (app !== 'manto' && app !== 'procesos') throw new Rechazo(400, 'app debe ser manto o procesos');

  const sesion = await verificarSesionSuite(idToken);
  const ficha = await leerFicha(sesion.nomina, idToken);
  if (ficha.estatus !== 'ACTIVO') throw new Rechazo(403, 'La cuenta está dada de baja');
  if (!ficha.apps.includes(app)) throw new Rechazo(403, 'Sin acceso a esta aplicación');

  // Los nombres de los campos no pueden ser los reservados de Firebase
  // (uid, sub, aud, iss…). Las reglas los leen como auth.token.app, etc.
  const claims = { app, nomina: sesion.nomina };
  if (app === 'manto') {
    // Sin papel, o con uno que esta app no conoce, entra con el más bajo:
    // nunca se concede privilegio por omisión.
    const papel = ficha.roles.manto;
    claims.rol = PAPELES_MANTO.includes(papel) ? papel : 'solicitante';
  }
  const token = await crearCredencial(env, 'n' + sesion.nomina, claims);
  return responder(200, { token, nomina: sesion.nomina, rol: claims.rol || null });
}

async function credencialRespaldo(request, env, responder) {
  const secreto = request.headers.get('X-Respaldo') || '';
  if (!env.RESPALDO_SECRETO || !(await iguales(secreto, env.RESPALDO_SECRETO))) {
    throw new Rechazo(401, 'Secreto de respaldo incorrecto');
  }
  const token = await crearCredencial(env, 'respaldo-drive', { app: 'respaldo' });
  return responder(200, { token });
}

// ─── Push ────────────────────────────────────────────────────────────────

async function push(request, env, responder) {
  const auth = request.headers.get('Authorization') || '';
  const idToken = auth.startsWith('Bearer ') ? auth.slice(7) : '';

  if (idToken) {
    // Con sesión, siempre se verifica, aunque la transición siga abierta.
    const sesion = await verificarSesionSuite(idToken);
    const ficha = await leerFicha(sesion.nomina, idToken);
    if (ficha.estatus !== 'ACTIVO') throw new Rechazo(403, 'La cuenta está dada de baja');
    if (!ficha.apps.includes('manto') && !ficha.apps.includes('procesos')) {
      throw new Rechazo(403, 'Sin acceso para enviar avisos');
    }
  } else if (env.EXIGIR_SESION !== 'no') {
    throw new Rechazo(401, 'Falta la sesión de la suite');
  }

  const { nominas, title, message, url } = await leerJson(request);
  if (!Array.isArray(nominas) || !nominas.length) throw new Rechazo(400, 'nominas requerido');
  // OneSignal admite hasta 200 filtros; cada nómina usa uno más el OR.
  if (nominas.length > 100) throw new Rechazo(400, 'Demasiados destinatarios');
  if (!nominas.every((n) => /^\d{1,8}$/.test(String(n)))) throw new Rechazo(400, 'Nómina inválida');
  const titulo = String(title || '').slice(0, 120);
  const texto = String(message || '').slice(0, 300);
  if (!titulo || !texto) throw new Rechazo(400, 'title y message requeridos');
  // El aviso solo puede abrir páginas de la suite: así nadie lo usa para
  // mandar a la gente a un sitio ajeno.
  const destino = typeof url === 'string' && url.startsWith(ORIGENES[0] + '/') ? url : URL_APP;

  const filtros = [];
  nominas.forEach((n, i) => {
    if (i > 0) filtros.push({ operator: 'OR' });
    filtros.push({ field: 'tag', key: 'nomina', relation: '=', value: String(n) });
  });

  const r = await fetch('https://onesignal.com/api/v1/notifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Basic ' + env.ONESIGNAL_API_KEY },
    body: JSON.stringify({
      app_id: ONESIGNAL_APP_ID,
      filters: filtros,
      headings: { en: titulo, es: titulo },
      contents: { en: texto, es: texto },
      web_url: destino,
      chrome_web_icon: URL_APP + 'icon-192.png',
      ttl: 86400
    })
  });
  const resultado = await r.json().catch(() => ({}));
  return responder(r.status, resultado);
}

// ─── Sesión de la suite ──────────────────────────────────────────────────

let _llaves = null, _llavesHasta = 0;

async function llavesGoogle() {
  if (_llaves && Date.now() < _llavesHasta) return _llaves;
  const r = await fetch(JWKS_URL);
  if (!r.ok) throw new Error('No se pudieron leer las llaves de Google: ' + r.status);
  const { keys } = await r.json();
  const max = /max-age=(\d+)/.exec(r.headers.get('Cache-Control') || '');
  _llaves = keys;
  _llavesHasta = Date.now() + (max ? Number(max[1]) : 3600) * 1000;
  return keys;
}

/** Verifica un ID token de Firebase Auth del proyecto de la suite. */
async function verificarSesionSuite(idToken) {
  if (typeof idToken !== 'string' || idToken.split('.').length !== 3) throw new Rechazo(401, 'Sesión inválida');
  const [h, p, s] = idToken.split('.');
  let cab, datos;
  try { cab = JSON.parse(texto64(h)); datos = JSON.parse(texto64(p)); }
  catch (e) { throw new Rechazo(401, 'Sesión inválida'); }
  if (cab.alg !== 'RS256') throw new Rechazo(401, 'Sesión inválida');

  const jwk = (await llavesGoogle()).find((k) => k.kid === cab.kid);
  if (!jwk) throw new Rechazo(401, 'Sesión con llave desconocida');
  const llave = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', llave, bytes64(s), new TextEncoder().encode(h + '.' + p));
  if (!ok) throw new Rechazo(401, 'Firma inválida');

  const ahora = Math.floor(Date.now() / 1000);
  const tolerancia = 60;   // relojes desfasados
  if (datos.aud !== SUITE_PROJECT) throw new Rechazo(401, 'Sesión de otro proyecto');
  if (datos.iss !== 'https://securetoken.google.com/' + SUITE_PROJECT) throw new Rechazo(401, 'Emisor inválido');
  if (!(datos.exp > ahora)) throw new Rechazo(401, 'Sesión vencida');
  if (!(datos.iat <= ahora + tolerancia)) throw new Rechazo(401, 'Sesión con fecha futura');
  if (!(datos.auth_time <= ahora + tolerancia)) throw new Rechazo(401, 'Sesión con fecha futura');
  if (typeof datos.sub !== 'string' || !datos.sub) throw new Rechazo(401, 'Sesión sin usuario');

  const correo = String(datos.email || '').toLowerCase();
  if (!correo.endsWith(DOMINIO)) throw new Rechazo(403, 'Cuenta ajena a la suite');
  const nomina = correo.slice(0, -DOMINIO.length);
  if (!/^\d{1,8}$/.test(nomina)) throw new Rechazo(403, 'Cuenta ajena a la suite');
  return { nomina, uid: datos.sub };
}

/**
 * Lee colaboradores/<nómina> con la propia sesión de la persona, así que las
 * reglas de la suite se siguen aplicando: el worker no tiene llave de la suite.
 */
async function leerFicha(nomina, idToken) {
  const r = await fetch(
    `https://firestore.googleapis.com/v1/projects/${SUITE_PROJECT}/databases/(default)/documents/colaboradores/${nomina}`,
    { headers: { Authorization: 'Bearer ' + idToken } });
  if (r.status === 404) throw new Rechazo(403, 'Sin registro de personal');
  if (!r.ok) throw new Error('Firestore respondió ' + r.status);
  const f = (await r.json()).fields || {};
  const apps = ((f.apps && f.apps.arrayValue && f.apps.arrayValue.values) || [])
    .map((v) => v.stringValue).filter(Boolean);
  const roles = {};
  const rf = (f.roles && f.roles.mapValue && f.roles.mapValue.fields) || {};
  Object.keys(rf).forEach((k) => { if (rf[k].stringValue) roles[k] = rf[k].stringValue; });
  return { estatus: f.estatus && f.estatus.stringValue, apps, roles };
}

// ─── Credencial para impredimex-mantoapp ─────────────────────────────────

let _firmante = null;

async function firmante(env) {
  if (_firmante) return _firmante;
  if (!env.SA_MANTOAPP) throw new Error('Falta el secreto SA_MANTOAPP');
  const sa = JSON.parse(env.SA_MANTOAPP);
  const der = bytes64(sa.private_key.replace(/-----[^-]+-----/g, '').replace(/\s+/g, ''), false);
  const llave = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  _firmante = { correo: sa.client_email, llave };
  return _firmante;
}

/** Custom token de Firebase firmado con la cuenta de servicio. Vale una hora. */
async function crearCredencial(env, uid, claims) {
  const { correo, llave } = await firmante(env);
  const ahora = Math.floor(Date.now() / 1000);
  const cab = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const cuerpo = base64url(JSON.stringify({
    iss: correo, sub: correo, aud: AUD_CUSTOM,
    iat: ahora, exp: ahora + 3600,
    // `emitida` sobrevive a las renovaciones automáticas del token de sesión
    // de Firebase; las reglas la usan para que la credencial caduque a los
    // 7 días aunque el teléfono la siga renovando. Así una baja en RRHH deja
    // sin acceso a más tardar una semana después, aun sin cerrar sesión.
    uid, claims: { ...claims, emitida: ahora }
  }));
  const firma = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', llave, new TextEncoder().encode(cab + '.' + cuerpo));
  return cab + '.' + cuerpo + '.' + base64url(new Uint8Array(firma));
}

// ─── Utilidades ──────────────────────────────────────────────────────────

async function leerJson(request) {
  try { return await request.json(); }
  catch (e) { throw new Rechazo(400, 'Cuerpo JSON inválido'); }
}

function base64url(entrada) {
  const b = typeof entrada === 'string' ? new TextEncoder().encode(entrada) : entrada;
  let s = '';
  b.forEach((x) => { s += String.fromCharCode(x); });
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function bytes64(s, url = true) {
  let t = url ? s.replace(/-/g, '+').replace(/_/g, '/') : s;
  while (t.length % 4) t += '=';
  const bin = atob(t);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function texto64(s) { return new TextDecoder().decode(bytes64(s)); }

// Comparación en tiempo constante: evita adivinar el secreto midiendo cuánto
// tarda la respuesta.
async function iguales(a, b) {
  const [x, y] = await Promise.all([a, b].map((v) => crypto.subtle.digest('SHA-256', new TextEncoder().encode(v))));
  const u = new Uint8Array(x), v = new Uint8Array(y);
  let d = 0;
  for (let i = 0; i < u.length; i++) d |= u[i] ^ v[i];
  return d === 0;
}
