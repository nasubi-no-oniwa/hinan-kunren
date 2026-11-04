// ft-green に管理者として話しかける道具（GitHub の上でだけ使う。鍵は FT_GREEN_SERVICE_ACCOUNT）
import { createRequire } from 'module';
const require = createRequire(process.env.RUNNER_TEMP + '/x/');
const { GoogleAuth } = require('google-auth-library');
export const DBURL = 'https://ft-green-default-rtdb.asia-southeast1.firebasedatabase.app';
export async function token() {
  const auth = new GoogleAuth({ keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS, scopes: ['https://www.googleapis.com/auth/firebase.database', 'https://www.googleapis.com/auth/userinfo.email'] });
  const c = await auth.getClient(); const t = await c.getAccessToken(); return t.token || t;
}
export async function api(method, path, body, tk) {
  const r = await fetch(DBURL + path + (path.includes('?') ? '&' : '?') + 'access_token=' + encodeURIComponent(tk), { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : (typeof body === 'string' ? body : JSON.stringify(body)) });
  const text = await r.text();
  if (!r.ok) throw new Error(method + ' ' + path.split('?')[0] + ' ' + r.status + ' ' + text.slice(0, 300));
  return text;
}
