// verify-passport-mongo: isolated local verification for nodejs-passportMongo.
// Spawns an in-memory MongoDB (mongodb-memory-server) and the real app,
// drives the register/login/session/logout surface with a real cookie jar,
// records evidence, cleans up only its own children.
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const net = require('net');
const { MongoMemoryServer } = require('mongodb-memory-server');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const PORT = 3000; // app hardcodes this port
const EVIDENCE_DIR = process.env.VERIFY_EVIDENCE_DIR || fs.mkdtempSync('/tmp/verify-passport-mongo-');
const evidence = { repo: 'nodejs-passportMongo', started_at: new Date().toISOString(),
  actions: [], findings: [], boundaries: ['local processes only', 'in-memory MongoDB, disposable', 'no external services'],
  cleaned: false };
let failures = 0;

function record(action, ok, detail) {
  evidence.actions.push({ at: new Date().toISOString(), action, ok, detail });
  if (!ok) failures++;
  console.log((ok ? 'PASS ' : 'FAIL ') + action + (detail ? ' :: ' + detail : ''));
}
function finding(note) { evidence.findings.push(note); console.log('FINDING ' + note); }

const jar = new Map();
function cookieHeader() { return [...jar.entries()].map(([k, v]) => k + '=' + v).join('; '); }
function storeCookies(res) {
  const set = res.headers['set-cookie'];
  if (set) for (const c of set) { const [pair] = c.split(';'); const i = pair.indexOf('='); jar.set(pair.slice(0, i).trim(), pair.slice(i + 1).trim()); }
}
function req(method, p, { form } = {}) {
  return new Promise((resolve, reject) => {
    const data = form ? new URLSearchParams(form).toString() : null;
    const r = http.request({ host: '127.0.0.1', port: PORT, path: p, method,
      headers: Object.assign({ Cookie: cookieHeader() }, data ? { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(data) } : {}) },
      (res) => { let buf = ''; res.on('data', (c) => buf += c); res.on('end', () => { storeCookies(res); resolve({ status: res.statusCode, headers: res.headers, body: buf }); }); });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}
function portFree(port) {
  return new Promise((resolve) => { const s = net.createServer(); s.once('error', () => resolve(false)); s.once('listening', () => s.close(() => resolve(true))); s.listen(port, '127.0.0.1'); });
}
async function waitReady(child, tries = 90) {
  for (let i = 0; i < tries; i++) {
    if (child.exitCode !== null) return false;
    try { const r = await req('GET', '/login'); if (r.status === 200) return true; } catch (e) {}
    await new Promise((r2) => setTimeout(r2, 500));
  }
  return false;
}

let mongod = null, child = null;
function finish() {
  if (child && child.exitCode === null) { child.kill('SIGTERM'); setTimeout(() => { if (child.exitCode === null) child.kill('SIGKILL'); }, 1500); }
  setTimeout(async () => {
    if (mongod) await mongod.stop();
    evidence.cleaned = !child || child.exitCode !== null;
    evidence.finished_at = new Date().toISOString();
    evidence.failures = failures;
    fs.writeFileSync(path.join(EVIDENCE_DIR, 'evidence.json'), JSON.stringify(evidence, null, 1));
    console.log('EVIDENCE_DIR=' + EVIDENCE_DIR);
    console.log('FAILURES=' + failures);
    process.exit(failures ? 1 : 0);
  }, 2200);
}

(async () => {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  if (!(await portFree(PORT))) { record('precheck: app port ' + PORT + ' free', false, 'refusing to attach to an unknown listener'); finish(); return; }
  record('precheck: app port ' + PORT + ' free', true);

  try { mongod = await MongoMemoryServer.create(); record('launch: in-memory MongoDB', true, mongod.getUri()); }
  catch (e) { record('launch: in-memory MongoDB', false, String(e && e.message || e)); finish(); return; }

  const logStream = fs.createWriteStream(path.join(EVIDENCE_DIR, 'server.log'));
  child = spawn('node', ['index.js'], { cwd: ROOT,
    env: Object.assign({}, process.env, { MONGO_URL: mongod.getUri(), SECRET: 'verify-secret-' + Date.now() }),
    stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.pipe(logStream); child.stderr.pipe(logStream);

  try {
    const ready = await waitReady(child);
    record('launch: own child serving /login', ready);
    if (!ready) { finish(); return; }

    let r = await req('GET', '/');
    record('GET / unauthenticated redirects to /login', r.status === 302 && (r.headers.location || '').includes('/login'), 'status ' + r.status);
    for (const p of ['/about', '/gallery', '/contact']) {
      r = await req('GET', p);
      record('GET ' + p + ' unauthenticated redirects to /login', r.status === 302 && (r.headers.location || '').includes('/login'), 'status ' + r.status);
    }
    r = await req('GET', '/login');
    record('GET /login renders', r.status === 200, 'status ' + r.status + (r.status !== 200 ? ' body ' + r.body.slice(0, 120) : ''));
    if (r.status !== 200) finding('GET /login does not render (status ' + r.status + ') - see server.log; check flash locals in views/login.ejs.');
    r = await req('GET', '/register');
    record('GET /register renders', r.status === 200, 'status ' + r.status);

    const user = 'verifyuser' + Date.now();
    r = await req('POST', '/register', { form: { username: user, password: 'pass-one', confirmPassword: 'pass-two' } });
    record('POST /register mismatched passwords redirects back', r.status === 302 && (r.headers.location || '').includes('/register'), 'status ' + r.status);
    r = await req('GET', '/register');
    record('mismatch flash shown', r.body.includes('Passwords do not match'), r.body.includes('Passwords do not match') ? '' : 'flash text not visible in /register');

    r = await req('POST', '/register', { form: { username: user, password: 'verify-pass-1', confirmPassword: 'verify-pass-1' } });
    record('POST /register new user redirects to /login', r.status === 302 && (r.headers.location || '').includes('/login'), 'status ' + r.status);

    r = await req('POST', '/login', { form: { username: user, password: 'wrong-pass' } });
    record('POST /login wrong password redirects to /login', r.status === 302 && (r.headers.location || '').includes('/login'), 'status ' + r.status);
    r = await req('GET', '/login');
    record('wrong-password flash shown', r.body.includes('Incorrect password'), '');

    r = await req('POST', '/login', { form: { username: user, password: 'verify-pass-1' } });
    record('POST /login correct redirects to /', r.status === 302 && (r.headers.location || '/') === '/', 'status ' + r.status + ' -> ' + (r.headers.location || ''));
    r = await req('GET', '/');
    record('GET / authenticated shows username', r.status === 200 && r.body.includes(user), 'status ' + r.status);
    for (const p of ['/about', '/gallery', '/contact']) {
      r = await req('GET', p);
      record('GET ' + p + ' authenticated renders', r.status === 200, 'status ' + r.status);
    }

    // second isolated user attempt at the same username (fresh jar)
    const savedJar = new Map(jar); jar.clear();
    r = await req('POST', '/register', { form: { username: user, password: 'x', confirmPassword: 'x' } });
    record('POST /register duplicate redirects back', r.status === 302 && (r.headers.location || '').includes('/register'), 'status ' + r.status);
    r = await req('GET', '/register');
    record('duplicate flash shown', r.body.includes('Username already taken'), '');
    for (const [k, v] of savedJar) jar.set(k, v);

    r = await req('GET', '/logout');
    record('GET /logout redirects', r.status === 302, 'status ' + r.status);
    r = await req('GET', '/');
    record('session ended: GET / redirects to /login after logout', r.status === 302 && (r.headers.location || '').includes('/login'), 'status ' + r.status);
  } catch (e) {
    record('unhandled verification error', false, String(e && e.message || e));
  } finally {
    finish();
  }
})();
