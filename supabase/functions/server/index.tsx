import { createClient } from "jsr:@supabase/supabase-js@2.49.8";
import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";

const app = new Hono();
const ROOT = "/make-server-cee2ad72";
const ADMIN_EMAIL = "solution2026@gmail.com";
const KYC_BUCKET = "nova-invest-kyc";
const PERMISSIONS = ["users", "funding", "kyc", "balances", "investments", "profit_codes", "admins", "audit"];
const MARKETS = ["NYSE / NASDAQ", "Tokyo Stock Exchange", "London Stock Exchange", "London Metal Exchange"];
const now = () => new Date().toISOString();
const uid = () => crypto.randomUUID();
const db = () => createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

const fail = (c: any, status: number, error: string) => c.json({ error }, status);
const bearer = (c: any) => {
  const value = c.req.header("Authorization") ?? "";
  return value.startsWith("Bearer ") ? value.slice(7) : "";
};
const amount = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : NaN;
};
const hash = async (value: string) => {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
};
const passwordRecord = async (password: string) => {
  const salt = uid();
  return { salt, hash: await hash(`${salt}:${password}`) };
};
const passwordMatches = async (password: string, record: any) =>
  Boolean(record?.salt && record?.hash && (await hash(`${record.salt}:${password}`)) === record.hash);

async function profile(id: string) {
  const value = await kv.get(`profile:${id}`);
  if (!value) return null;
  value.accountStatus ??= "active";
  value.kycStatus ??= "not_submitted";
  if (value.id === "admin-root") value.permissions = ["*"];
  return value;
}
async function account(userId: string) {
  return (await kv.get(`account:${userId}`)) ?? { available: 0, invested: 0, currency: "TUSDT", updatedAt: now() };
}
async function saveAccount(userId: string, value: any) {
  value.available = Math.round(value.available * 100) / 100;
  value.invested = Math.round(value.invested * 100) / 100;
  value.updatedAt = now();
  await kv.set(`account:${userId}`, value);
}
async function ledger(userId: string, type: string, delta: number, value: any, note: string) {
  const entry = { id: uid(), userId, type, amount: delta, availableAfter: value.available, investedAfter: value.invested, note, createdAt: now() };
  await kv.set(`ledger:${userId}:${entry.id}`, entry);
  return entry;
}
const can = (admin: any, permission: string) =>
  admin.permissions?.includes("*") || admin.permissions?.includes(permission);
async function audit(admin: any, action: string, targetId: string, detail: string) {
  const item = { id: uid(), adminId: admin.id, adminName: admin.fullName, action, targetId, detail, createdAt: now() };
  await kv.set(`audit:${item.createdAt}:${item.id}`, item);
}
async function userAuth(c: any) {
  const token = bearer(c);
  if (!token) return { error: fail(c, 401, "Authentication required.") };
  const { data, error } = await db().auth.getUser(token);
  if (error || !data.user) return { error: fail(c, 401, "Your session is invalid or expired.") };
  const user = await profile(data.user.id);
  if (!user || user.accountStatus === "deleted") return { error: fail(c, 404, "Account profile not found.") };
  if (["suspended", "revoked"].includes(user.accountStatus)) return { error: fail(c, 403, `This account is ${user.accountStatus}.`) };
  return { user };
}
async function adminAuth(c: any, permission?: string) {
  const token = bearer(c);
  if (!token) return { error: fail(c, 401, "Administrator authentication required.") };
  const tokenHash = await hash(token);
  const session = await kv.get(`admin-session:${tokenHash}`);
  if (!session || session.tokenHash !== tokenHash || Date.parse(session.expiresAt) <= Date.now()) {
    if (session) await kv.del(`admin-session:${tokenHash}`);
    return { error: fail(c, 401, "Administrator session expired.") };
  }
  const admin = await profile(session.adminId);
  if (!admin || admin.role !== "admin" || admin.accountStatus !== "active") return { error: fail(c, 403, "Administrator access revoked.") };
  if (permission && !can(admin, permission)) return { error: fail(c, 403, "You do not have permission for this action.") };
  return { admin, tokenHash };
}
async function referralCode() {
  for (let i = 0; i < 20; i += 1) {
    const code = `NI-${uid().replaceAll("-", "").slice(0, 6).toUpperCase()}`;
    if (!(await kv.get(`referral:${code}`))) return code;
  }
  throw new Error("Could not generate a referral code.");
}
async function bootstrap() {
  const secret = Deno.env.get("NOVA_ADMIN_PASSWORD");
  if (!secret) throw new Error("NOVA_ADMIN_PASSWORD is not configured.");
  let admin = await profile("admin-root");
  admin ??= {
    id: "admin-root", fullName: "NOVA Administrator", phone: "", email: ADMIN_EMAIL,
    referralCode: await referralCode(), referredBy: "", createdAt: now(), kycStatus: "approved",
    accountStatus: "active", role: "admin", permissions: ["*"],
  };
  await kv.mset(
    [`profile:${admin.id}`, `referral:${admin.referralCode}`, `admin-email:${ADMIN_EMAIL}`, `admin-password:${admin.id}`],
    [admin, admin.id, admin.id, await passwordRecord(secret)],
  );
  return admin;
}
async function referralRewards(user: any, deposit: number) {
  const rates = [0.05, 0.03, 0.01];
  let code = user.referredBy;
  for (let level = 0; level < rates.length && code; level += 1) {
    const referrerId = await kv.get(`referral:${code}`);
    const referrer = referrerId ? await profile(referrerId) : null;
    if (!referrer || referrer.accountStatus !== "active") break;
    const reward = Math.round(deposit * rates[level] * 100) / 100;
    const balance = await account(referrer.id);
    balance.available += reward;
    await saveAccount(referrer.id, balance);
    await ledger(referrer.id, `referral_level_${level + 1}`, reward, balance, `Level ${level + 1} commission from ${user.fullName}`);
    code = referrer.referredBy;
  }
}

app.use("*", logger(console.log));
app.use(`${ROOT}/*`, cors({
  origin: "*",
  allowHeaders: ["Content-Type", "Authorization", "apikey"],
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  maxAge: 600,
}));

app.get(`${ROOT}/health`, (c) => c.json({ status: "ok" }));
app.get(`${ROOT}/referrals/:code`, async (c) => {
  const code = c.req.param("code").toUpperCase();
  const id = /^NI-[A-Z0-9]{6}$/.test(code) ? await kv.get(`referral:${code}`) : null;
  const owner = id ? await profile(id) : null;
  return c.json({ valid: Boolean(owner?.accountStatus === "active") });
});
app.post(`${ROOT}/signup`, async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const fullName = String(body.fullName ?? "").trim();
  const phone = String(body.phone ?? "").replace(/[^\d+]/g, "");
  const password = String(body.password ?? "");
  const referredBy = String(body.referralCode ?? "").toUpperCase();
  const referrerId = await kv.get(`referral:${referredBy}`);
  const referrer = referrerId ? await profile(referrerId) : null;
  if (fullName.length < 2 || !/^\+\d{8,15}$/.test(phone) || password.length < 8) return fail(c, 400, "Valid name, mobile number, and password are required.");
  if (!referrer || referrer.accountStatus !== "active") return fail(c, 400, "A valid active referral code is required.");
  const { data, error } = await db().auth.admin.createUser({ phone, password, phone_confirm: true, user_metadata: { full_name: fullName } });
  if (error || !data.user) return fail(c, 400, error?.message ?? "Account creation failed.");
  const user = {
    id: data.user.id, fullName, phone, referralCode: await referralCode(), referredBy, createdAt: now(),
    kycStatus: "not_submitted", accountStatus: "pending", role: "user",
  };
  await kv.mset(
    [`profile:${user.id}`, `referral:${user.referralCode}`, `account:${user.id}`],
    [user, user.id, { available: 0, invested: 0, currency: "TUSDT", updatedAt: now() }],
  );
  return c.json({ profile: user }, 201);
});
app.get(`${ROOT}/me`, async (c) => {
  const token = bearer(c);
  if (token) {
    const session = await kv.get(`admin-session:${await hash(token)}`);
    const admin = session && Date.parse(session.expiresAt) > Date.now() ? await profile(session.adminId) : null;
    if (admin?.role === "admin" && admin.accountStatus === "active") return c.json({ profile: admin });
  }
  const auth = await userAuth(c);
  return auth.error ?? c.json({ profile: auth.user });
});
app.get(`${ROOT}/account`, async (c) => {
  const auth = await userAuth(c);
  if (auth.error) return auth.error;
  const [balance, entries, requests] = await Promise.all([account(auth.user.id), kv.getByPrefix(`ledger:${auth.user.id}:`), kv.getByPrefix("request:")]);
  return c.json({ account: balance, ledger: entries, requests: requests.filter((item: any) => item.userId === auth.user.id) });
});
app.post(`${ROOT}/requests`, async (c) => {
  const auth = await userAuth(c);
  if (auth.error) return auth.error;
  if (auth.user.accountStatus !== "active") return fail(c, 403, "Your account must be activated first.");
  const body = await c.req.json().catch(() => ({}));
  const type = String(body.type);
  const value = amount(body.amount);
  const detail = String(body.detail ?? "").trim().slice(0, 500);
  if (!["deposit", "withdrawal"].includes(type) || !(value > 0)) return fail(c, 400, "Invalid funding request.");
  if (type === "withdrawal") {
    if (auth.user.kycStatus !== "approved") return fail(c, 403, "Approved KYC is required.");
    if (!/binance/i.test(detail)) return fail(c, 400, "A Binance reference is required.");
    if ((await account(auth.user.id)).available < value) return fail(c, 400, "Insufficient available balance.");
  }
  const request = { id: uid(), userId: auth.user.id, userName: auth.user.fullName, type, amount: value, detail, status: "pending", createdAt: now() };
  await kv.set(`request:${request.id}`, request);
  return c.json({ request }, 201);
});
app.post(`${ROOT}/kyc`, async (c) => {
  const auth = await userAuth(c);
  if (auth.error) return auth.error;
  const body = await c.req.json().catch(() => ({}));
  const documents = Array.isArray(body.documents) ? body.documents.slice(0, 3) : [];
  if (!body.fullName || !body.documentType || !documents.length || !body.selfie?.dataUrl) return fail(c, 400, "Personal details, document, and selfie are required.");
  const client = db();
  await client.storage.createBucket(KYC_BUCKET, { public: false }).catch(() => undefined);
  const saved = [];
  for (const file of [...documents, { ...body.selfie, label: "Selfie" }]) {
    const match = String(file.dataUrl ?? "").match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return fail(c, 400, "Invalid KYC upload.");
    const bytes = Uint8Array.from(atob(match[2]), (character) => character.charCodeAt(0));
    if (bytes.byteLength > 5 * 1024 * 1024) return fail(c, 400, "Each file must be 5 MB or smaller.");
    const extension = String(file.name ?? "file.bin").split(".").pop()?.replace(/[^\w]/g, "") || "bin";
    const path = `${auth.user.id}/${uid()}.${extension}`;
    const { error } = await client.storage.from(KYC_BUCKET).upload(path, bytes, { contentType: match[1] });
    if (error) return fail(c, 500, "A KYC file could not be stored.");
    saved.push({ label: file.label, name: file.name, type: match[1], path });
  }
  const submission = {
    id: uid(), userId: auth.user.id, status: "pending", submittedAt: now(), reviewedAt: null, reviewNote: "",
    details: {
      fullName: String(body.fullName).slice(0, 120), dateOfBirth: String(body.dateOfBirth ?? "").slice(0, 20),
      nationality: String(body.nationality ?? "").slice(0, 80), phone: String(body.phone ?? "").slice(0, 30),
      gender: String(body.gender ?? "").slice(0, 30), address: String(body.address ?? "").slice(0, 300),
      documentType: String(body.documentType).slice(0, 80), documentNumber: String(body.documentNumber ?? "").slice(0, 100),
      issueDate: String(body.issueDate ?? "").slice(0, 20), expiryDate: String(body.expiryDate ?? "").slice(0, 20),
      issuingCountry: String(body.issuingCountry ?? "").slice(0, 80),
    },
    documents: saved,
  };
  auth.user.kycStatus = "pending";
  await kv.mset([`kyc:${auth.user.id}`, `profile:${auth.user.id}`], [submission, auth.user]);
  return c.json({ submission }, 201);
});
app.post(`${ROOT}/profit-codes/claim`, async (c) => {
  const auth = await userAuth(c);
  if (auth.error) return auth.error;
  if (auth.user.accountStatus !== "active") return fail(c, 403, "Your account is not active.");
  const body = await c.req.json().catch(() => ({}));
  const code = String(body.code ?? "").trim().toUpperCase();
  const item = await kv.get(`profit-code:${code}`);
  if (!item?.active || (item.expiresAt && Date.parse(item.expiresAt) <= Date.now())) return fail(c, 400, "Invalid or expired Profit Code.");
  if (await kv.get(`profit-claim:${code}:${auth.user.id}`)) return fail(c, 409, "This code has already been claimed.");
  const balance = await account(auth.user.id);
  const reward = item.kind === "percentage"
    ? Math.round((balance.available + balance.invested) * Number(item.value) * 100) / 10000
    : amount(item.value);
  if (!(reward > 0)) return fail(c, 400, "This code has no positive distribution.");
  balance.available += reward;
  await saveAccount(auth.user.id, balance);
  const claim = { code, userId: auth.user.id, amount: reward, value: item.value, kind: item.kind, claimedAt: now() };
  await kv.set(`profit-claim:${code}:${auth.user.id}`, claim);
  await ledger(auth.user.id, "profit_code", reward, balance, `Profit Code ${code}`);
  return c.json({ claim, account: balance });
});
app.get(`${ROOT}/profit-codes/history`, async (c) => {
  const auth = await userAuth(c);
  if (auth.error) return auth.error;
  const claims = (await kv.getByPrefix("profit-claim:")).filter((item: any) => item.userId === auth.user.id);
  return c.json({ claims });
});

app.get(`${ROOT}/admin/bootstrap`, async (c) => {
  try { await bootstrap(); return c.json({ ready: true }); }
  catch (error) { return fail(c, 503, error instanceof Error ? error.message : "Admin access is not configured."); }
});
app.post(`${ROOT}/admin/login`, async (c) => {
  await bootstrap();
  const body = await c.req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const adminId = await kv.get(`admin-email:${email}`);
  const admin = adminId ? await profile(adminId) : null;
  const record = adminId ? await kv.get(`admin-password:${adminId}`) : null;
  if (!admin || admin.role !== "admin" || admin.accountStatus !== "active" || !(await passwordMatches(String(body.password ?? ""), record))) {
    return fail(c, 401, "Invalid administrator credentials.");
  }
  const token = `${uid()}${uid()}`.replaceAll("-", "");
  const tokenHash = await hash(token);
  const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
  await kv.set(`admin-session:${tokenHash}`, { tokenHash, adminId: admin.id, expiresAt });
  await audit(admin, "admin.login", admin.id, "Administrator signed in.");
  return c.json({ profile: admin, token, expiresAt });
});
app.post(`${ROOT}/admin/logout`, async (c) => {
  const auth = await adminAuth(c);
  if (auth.error) return auth.error;
  await kv.del(`admin-session:${auth.tokenHash}`);
  return c.json({ success: true });
});
app.get(`${ROOT}/admin/overview`, async (c) => {
  const auth = await adminAuth(c);
  if (auth.error) return auth.error;
  const [profiles, requests, investments, profitCodes, audits, notes, submissions] = await Promise.all([
    kv.getByPrefix("profile:"), kv.getByPrefix("request:"), kv.getByPrefix("investment:"),
    kv.getByPrefix("profit-code:"), kv.getByPrefix("audit:"), kv.getByPrefix("admin-note:"), kv.getByPrefix("kyc:"),
  ]);
  const client = db();
  const kycs = await Promise.all(submissions.map(async (submission: any) => ({
    ...submission,
    documents: await Promise.all((submission.documents ?? []).map(async (file: any) => {
      const { data } = await client.storage.from(KYC_BUCKET).createSignedUrl(file.path, 900);
      return { ...file, url: data?.signedUrl ?? "" };
    })),
  })));
  const enriched = await Promise.all(profiles.map(async (item: any) => ({ ...item, account: await account(item.id) })));
  const seeProfiles = ["users", "funding", "kyc", "balances", "investments", "admins"].some((permission) => can(auth.admin, permission));
  return c.json({
    profiles: seeProfiles ? enriched : [],
    requests: can(auth.admin, "funding") ? requests : [],
    investments: can(auth.admin, "investments") ? investments : [],
    profitCodes: can(auth.admin, "profit_codes") ? profitCodes : [],
    audits: can(auth.admin, "audit") ? audits.sort((a: any, b: any) => b.createdAt.localeCompare(a.createdAt)).slice(0, 300) : [],
    notes: can(auth.admin, "users") ? notes : [],
    kycs: can(auth.admin, "kyc") ? kycs : [],
  });
});
app.post(`${ROOT}/admin/requests/:id`, async (c) => {
  const auth = await adminAuth(c, "funding");
  if (auth.error) return auth.error;
  const request = await kv.get(`request:${c.req.param("id")}`);
  if (!request || request.status !== "pending") return fail(c, 409, "Pending request not found.");
  const body = await c.req.json().catch(() => ({}));
  if (!["approved", "rejected"].includes(body.decision)) return fail(c, 400, "Invalid decision.");
  const user = await profile(request.userId);
  if (!user || user.accountStatus !== "active") return fail(c, 409, "Customer account is not active.");
  if (body.decision === "approved") {
    const balance = await account(user.id);
    if (request.type === "deposit") {
      balance.available += request.amount;
      await saveAccount(user.id, balance);
      await ledger(user.id, "deposit", request.amount, balance, `Approved by ${auth.admin.fullName}`);
      await referralRewards(user, request.amount);
    } else {
      if (user.kycStatus !== "approved" || balance.available < request.amount) return fail(c, 409, "KYC or balance requirement is no longer satisfied.");
      balance.available -= request.amount;
      await saveAccount(user.id, balance);
      await ledger(user.id, "withdrawal", -request.amount, balance, `Approved by ${auth.admin.fullName}`);
    }
  }
  request.status = body.decision;
  request.reviewedAt = now();
  request.reviewedBy = auth.admin.id;
  await kv.set(`request:${request.id}`, request);
  await audit(auth.admin, `funding.${body.decision}`, request.id, `${request.type} ${request.amount} TUSDT for ${request.userName}.`);
  return c.json({ request });
});
app.post(`${ROOT}/admin/users/:id/status`, async (c) => {
  const auth = await adminAuth(c, "users");
  if (auth.error) return auth.error;
  const user = await profile(c.req.param("id"));
  const body = await c.req.json().catch(() => ({}));
  if (!user || user.role === "admin" || !["pending", "active", "suspended", "revoked"].includes(body.status)) return fail(c, 400, "Invalid customer status.");
  user.accountStatus = body.status;
  await kv.set(`profile:${user.id}`, user);
  await db().auth.admin.updateUserById(user.id, { ban_duration: ["active", "pending"].includes(body.status) ? "none" : body.status === "revoked" ? "876000h" : "8760h" });
  await audit(auth.admin, `user.${body.status}`, user.id, `Account changed to ${body.status}.`);
  return c.json({ profile: user });
});
app.delete(`${ROOT}/admin/users/:id`, async (c) => {
  const auth = await adminAuth(c, "users");
  if (auth.error) return auth.error;
  const user = await profile(c.req.param("id"));
  if (!user || user.role === "admin") return fail(c, 404, "Customer not found.");
  user.accountStatus = "deleted";
  user.deletedAt = now();
  await kv.set(`profile:${user.id}`, user);
  await kv.del(`referral:${user.referralCode}`);
  await db().auth.admin.deleteUser(user.id, true);
  await audit(auth.admin, "user.deleted", user.id, "Access deleted; financial history retained.");
  return c.json({ profile: user });
});
app.post(`${ROOT}/admin/users/:id/password`, async (c) => {
  const auth = await adminAuth(c, "users");
  if (auth.error) return auth.error;
  const user = await profile(c.req.param("id"));
  const body = await c.req.json().catch(() => ({}));
  if (!user || user.role === "admin" || String(body.password ?? "").length < 8) return fail(c, 400, "Customer and 8-character password are required.");
  const { error } = await db().auth.admin.updateUserById(user.id, { password: body.password });
  if (error) return fail(c, 400, error.message);
  await audit(auth.admin, "user.password_reset", user.id, "Customer password reset.");
  return c.json({ success: true });
});
app.post(`${ROOT}/admin/users/:id/balance`, async (c) => {
  const auth = await adminAuth(c, "balances");
  if (auth.error) return auth.error;
  const user = await profile(c.req.param("id"));
  const body = await c.req.json().catch(() => ({}));
  const value = amount(body.amount);
  const note = String(body.note ?? "").trim().slice(0, 300);
  if (!user || user.role === "admin" || !(value >= 0) || !["credit", "debit", "set"].includes(body.operation) || !note) return fail(c, 400, "Valid adjustment and reason are required.");
  const balance = await account(user.id);
  const before = balance.available;
  if (body.operation === "credit") balance.available += value;
  if (body.operation === "debit") balance.available -= value;
  if (body.operation === "set") balance.available = value;
  if (balance.available < 0) return fail(c, 409, "Adjustment would create a negative balance.");
  await saveAccount(user.id, balance);
  await ledger(user.id, "admin_adjustment", balance.available - before, balance, note);
  await audit(auth.admin, "balance.adjusted", user.id, `${body.operation} ${value}: ${note}`);
  return c.json({ account: balance });
});
app.post(`${ROOT}/admin/users/:id/kyc`, async (c) => {
  const auth = await adminAuth(c, "kyc");
  if (auth.error) return auth.error;
  const user = await profile(c.req.param("id"));
  const body = await c.req.json().catch(() => ({}));
  const submission = user ? await kv.get(`kyc:${user.id}`) : null;
  if (!user || user.role === "admin" || !["approved", "rejected", "pending"].includes(body.status)) return fail(c, 400, "Invalid KYC review.");
  if (!submission && body.status === "approved") return fail(c, 409, "No KYC documents have been submitted.");
  user.kycStatus = body.status;
  await kv.set(`profile:${user.id}`, user);
  if (submission) {
    submission.status = body.status; submission.reviewedAt = now(); submission.reviewedBy = auth.admin.id; submission.reviewNote = String(body.note ?? "").slice(0, 500);
    await kv.set(`kyc:${user.id}`, submission);
  }
  await audit(auth.admin, `kyc.${body.status}`, user.id, submission?.reviewNote || `KYC changed to ${body.status}.`);
  return c.json({ profile: user });
});
app.post(`${ROOT}/admin/users/:id/notes`, async (c) => {
  const auth = await adminAuth(c, "users");
  if (auth.error) return auth.error;
  const user = await profile(c.req.param("id"));
  const body = await c.req.json().catch(() => ({}));
  const text = String(body.text ?? "").trim().slice(0, 1000);
  if (!user || user.role === "admin" || !text) return fail(c, 400, "Customer and note are required.");
  const note = { id: uid(), userId: user.id, text, adminId: auth.admin.id, adminName: auth.admin.fullName, createdAt: now() };
  await kv.set(`admin-note:${user.id}:${note.id}`, note);
  await audit(auth.admin, "user.note_added", user.id, text);
  return c.json({ note }, 201);
});
app.post(`${ROOT}/admin/investments`, async (c) => {
  const auth = await adminAuth(c, "investments");
  if (auth.error) return auth.error;
  const body = await c.req.json().catch(() => ({}));
  const user = await profile(String(body.userId ?? ""));
  const value = amount(body.amount);
  if (!user || user.role === "admin" || user.accountStatus !== "active" || !(value > 0) || !MARKETS.includes(body.market)) return fail(c, 400, "Valid customer, amount, and market are required.");
  const balance = await account(user.id);
  if (balance.available < value) return fail(c, 409, "Insufficient available balance.");
  balance.available -= value; balance.invested += value;
  await saveAccount(user.id, balance);
  const investment = { id: uid(), userId: user.id, market: body.market, principal: value, status: "open", createdAt: now() };
  await kv.set(`investment:${investment.id}`, investment);
  await ledger(user.id, "investment_allocated", -value, balance, `${body.market} allocation`);
  await audit(auth.admin, "investment.allocated", investment.id, `${value} TUSDT to ${body.market}.`);
  return c.json({ investment }, 201);
});
app.post(`${ROOT}/admin/investments/:id/settle`, async (c) => {
  const auth = await adminAuth(c, "investments");
  if (auth.error) return auth.error;
  const investment = await kv.get(`investment:${c.req.param("id")}`);
  const body = await c.req.json().catch(() => ({}));
  const profit = amount(body.profit);
  if (!investment || investment.status !== "open" || !Number.isFinite(profit) || investment.principal + profit < 0) return fail(c, 400, "Invalid settlement.");
  const balance = await account(investment.userId);
  balance.invested -= investment.principal; balance.available += investment.principal + profit;
  await saveAccount(investment.userId, balance);
  investment.status = "settled"; investment.profit = profit; investment.settledAt = now();
  await kv.set(`investment:${investment.id}`, investment);
  await ledger(investment.userId, "investment_settled", investment.principal + profit, balance, `${investment.market} settled; P/L ${profit}`);
  await audit(auth.admin, "investment.settled", investment.id, `P/L ${profit} TUSDT.`);
  return c.json({ investment });
});
app.post(`${ROOT}/admin/profit-codes`, async (c) => {
  const auth = await adminAuth(c, "profit_codes");
  if (auth.error) return auth.error;
  const body = await c.req.json().catch(() => ({}));
  const code = String(body.code ?? "").trim().toUpperCase();
  const value = amount(body.value);
  if (!/^NI-[A-Z0-9-]{4,30}$/.test(code) || !["fixed", "percentage"].includes(body.kind) || !(value > 0) || (body.kind === "percentage" && value > 100)) return fail(c, 400, "Invalid Profit Code.");
  if (await kv.get(`profit-code:${code}`)) return fail(c, 409, "Profit Code already exists.");
  const profitCode = { code, kind: body.kind, value, active: true, expiresAt: body.expiresAt || null, createdAt: now(), createdBy: auth.admin.id };
  await kv.set(`profit-code:${code}`, profitCode);
  await audit(auth.admin, "profit_code.created", code, `${body.kind} distribution of ${value}.`);
  return c.json({ profitCode }, 201);
});
app.post(`${ROOT}/admin/profit-codes/:code/status`, async (c) => {
  const auth = await adminAuth(c, "profit_codes");
  if (auth.error) return auth.error;
  const code = c.req.param("code").toUpperCase();
  const item = await kv.get(`profit-code:${code}`);
  const body = await c.req.json().catch(() => ({}));
  if (!item) return fail(c, 404, "Profit Code not found.");
  item.active = Boolean(body.active);
  await kv.set(`profit-code:${code}`, item);
  await audit(auth.admin, `profit_code.${item.active ? "activated" : "deactivated"}`, code, code);
  return c.json({ profitCode: item });
});
app.post(`${ROOT}/admin/admins`, async (c) => {
  const auth = await adminAuth(c, "admins");
  if (auth.error) return auth.error;
  const body = await c.req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const fullName = String(body.fullName ?? "").trim();
  const permissions = Array.isArray(body.permissions) ? body.permissions.filter((item: string) => PERMISSIONS.includes(item)) : [];
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || fullName.length < 2 || password.length < 8) return fail(c, 400, "Valid name, email, and password are required.");
  if (await kv.get(`admin-email:${email}`)) return fail(c, 409, "Administrator email already exists.");
  const admin = {
    id: `admin-${uid()}`, fullName, phone: "", email, referralCode: await referralCode(), referredBy: auth.admin.referralCode,
    createdAt: now(), kycStatus: "approved", accountStatus: "active", role: "admin", permissions,
  };
  await kv.mset([`profile:${admin.id}`, `admin-email:${email}`, `admin-password:${admin.id}`], [admin, admin.id, await passwordRecord(password)]);
  await audit(auth.admin, "admin.created", admin.id, `${email}: ${permissions.join(", ")}`);
  return c.json({ profile: admin }, 201);
});
app.post(`${ROOT}/admin/admins/:id`, async (c) => {
  const auth = await adminAuth(c, "admins");
  if (auth.error) return auth.error;
  if (c.req.param("id") === auth.admin.id) return fail(c, 400, "You cannot revoke your own session.");
  const admin = await profile(c.req.param("id"));
  const body = await c.req.json().catch(() => ({}));
  if (!admin || admin.role !== "admin" || admin.id === "admin-root") return fail(c, 404, "Managed administrator not found.");
  if (Array.isArray(body.permissions)) admin.permissions = body.permissions.filter((item: string) => PERMISSIONS.includes(item));
  if (["active", "revoked"].includes(body.status)) admin.accountStatus = body.status;
  if (body.password !== undefined) {
    if (String(body.password).length < 8) return fail(c, 400, "Password must contain at least 8 characters.");
    await kv.set(`admin-password:${admin.id}`, await passwordRecord(String(body.password)));
  }
  await kv.set(`profile:${admin.id}`, admin);
  await audit(auth.admin, "admin.updated", admin.id, `Status ${admin.accountStatus}; permissions ${(admin.permissions ?? []).join(", ")}.`);
  return c.json({ profile: admin });
});

app.notFound((c) => fail(c, 404, "Endpoint not found."));
app.onError((error, c) => {
  console.error(error);
  return fail(c, 500, "The server could not complete this request.");
});

Deno.serve(app.fetch);
