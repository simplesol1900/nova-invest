import { Hono, type Context } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";
import * as kv from "./kv_store.tsx";

const app = new Hono();
const PREFIX = "/make-server-cee2ad72";
const ROOT_ADMIN_ID = "admin-root";
const ROOT_ADMIN_EMAIL = "solution2026@gmail.com";
const FOUNDING_REFERRAL_CODE = "NI-A8M2K9";
const ADMIN_SESSION_TTL = 12 * 60 * 60 * 1000;
const USER_STATUSES = ["pending", "active", "suspended", "revoked"] as const;
const KYC_STATUSES = ["pending", "approved", "rejected"] as const;
const ADMIN_PERMISSIONS = [
  "users",
  "funding",
  "kyc",
  "balances",
  "investments",
  "profit_codes",
  "admins",
  "audit",
] as const;

type AccountStatus = typeof USER_STATUSES[number] | "deleted";
type KycStatus = "not_submitted" | typeof KYC_STATUSES[number];
type Permission = typeof ADMIN_PERMISSIONS[number];
type Profile = {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  referralCode: string;
  referredBy: string;
  createdAt: string;
  kycStatus: KycStatus;
  accountStatus: AccountStatus;
  role: "user" | "admin";
  permissions?: Array<Permission | "*">;
  passwordHash?: string;
};
type Account = {
  available: number;
  invested: number;
  currency: "TUSDT";
  updatedAt: string;
};
type FundingRequest = {
  id: string;
  userId: string;
  userName: string;
  type: "deposit" | "withdrawal";
  amount: number;
  detail: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
};
type AdminSession = {
  token: string;
  adminId: string;
  createdAt: string;
  expiresAt: string;
};

const supabase = () => createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

app.use("*", logger(console.log));
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "apikey", "x-client-info"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

function now() {
  return new Date().toISOString();
}

function id() {
  return crypto.randomUUID();
}

function round(value: number) {
  return Math.round((value + Number.EPSILON) * 100000000) / 100000000;
}

function finitePositive(value: unknown, label = "Amount") {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw new Error(`${label} must be greater than zero.`);
  }
  return round(number);
}

function cleanText(value: unknown, max = 500) {
  return String(value ?? "").trim().slice(0, max);
}

function publicProfile(profile: Profile, account?: Account) {
  const { passwordHash: _, ...safe } = profile;
  return account ? { ...safe, account } : safe;
}

function error(c: Context, reason: unknown, status = 400) {
  const message = reason instanceof Error ? reason.message : "The request could not be completed.";
  return c.json({ error: message }, status as 400);
}

async function body(c: Context) {
  try {
    return await c.req.json<Record<string, unknown>>();
  } catch {
    throw new Error("A valid JSON request body is required.");
  }
}

function bearer(c: Context) {
  const header = c.req.header("Authorization") ?? "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

function normalizeProfile(value: Partial<Profile> & { id: string }): Profile {
  const root = value.id === ROOT_ADMIN_ID || value.email?.toLowerCase() === ROOT_ADMIN_EMAIL;
  return {
    id: value.id,
    fullName: value.fullName || (root ? "NOVA INVEST Administrator" : "NOVA Member"),
    phone: value.phone || "",
    email: value.email,
    referralCode: value.referralCode || "",
    referredBy: value.referredBy || "",
    createdAt: value.createdAt || now(),
    kycStatus: value.kycStatus || (root ? "approved" : "not_submitted"),
    accountStatus: value.accountStatus || "active",
    role: value.role || (root ? "admin" : "user"),
    permissions: root ? ["*"] : value.permissions,
    passwordHash: value.passwordHash,
  };
}

async function getProfile(id: string) {
  const profile = await kv.get(`profile:${id}`) as (Partial<Profile> & { id: string }) | undefined;
  return profile ? normalizeProfile(profile) : undefined;
}

async function getAccount(userId: string) {
  return (await kv.get(`account:${userId}`) as Account | undefined) ?? {
    available: 0,
    invested: 0,
    currency: "TUSDT",
    updatedAt: now(),
  };
}

async function allProfiles() {
  const profiles = await kv.getByPrefix("profile:") as Array<Partial<Profile> & { id: string }>;
  return profiles.filter((profile) => profile?.id).map(normalizeProfile);
}

async function profileByReferral(code: string) {
  const directId = await kv.get(`referral:${code}`);
  if (directId) return await getProfile(String(directId));
  return (await allProfiles()).find((profile) => profile.referralCode === code);
}

async function resolveReferrer(code: string) {
  if (code === FOUNDING_REFERRAL_CODE) return await bootstrapRootAdmin();
  return await profileByReferral(code);
}

function canUseReferral(profile: Profile | undefined) {
  return Boolean(profile && !["suspended", "revoked", "deleted"].includes(profile.accountStatus));
}

function normalizePhone(value: unknown) {
  const compact = cleanText(value, 30).replace(/[^\d+]/g, "");
  const phone = compact.startsWith("+") ? `+${compact.slice(1).replace(/\D/g, "")}` : compact;
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
    throw new Error("Enter a valid mobile number with the correct country code.");
  }
  return phone;
}

async function findAuthUserByPhone(phone: string) {
  for (let page = 1; page <= 10; page++) {
    const { data, error: listError } = await supabase().auth.admin.listUsers({ page, perPage: 100 });
    if (listError) throw listError;
    const match = data.users.find((user) => user.phone === phone);
    if (match) return match;
    if (data.users.length < 100) break;
  }
  return undefined;
}

async function createReferralCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let attempt = 0; attempt < 30; attempt++) {
    let suffix = "";
    const bytes = crypto.getRandomValues(new Uint8Array(6));
    for (const byte of bytes) suffix += alphabet[byte % alphabet.length];
    const code = `NI-${suffix}`;
    if (!await profileByReferral(code)) return code;
  }
  throw new Error("A referral code could not be generated. Please try again.");
}

async function requireUser(c: Context) {
  const token = bearer(c);
  if (!token) throw new Error("Authentication is required.");
  const { data, error: authError } = await supabase().auth.getUser(token);
  if (authError || !data.user) throw new Error("Your session is invalid or has expired.");
  const profile = await getProfile(data.user.id);
  if (!profile || profile.role !== "user") throw new Error("Your account profile was not found.");
  if (profile.accountStatus !== "active") {
    const labels: Record<AccountStatus, string> = {
      active: "active",
      pending: "pending activation",
      suspended: "suspended",
      revoked: "revoked",
      deleted: "deleted",
    };
    throw new Error(`Your account access is ${labels[profile.accountStatus]}. Contact support.`);
  }
  return profile;
}

async function requireAdmin(c: Context, permission?: Permission) {
  const token = bearer(c);
  if (!token) throw new Error("Administrator authentication is required.");
  const session = await kv.get(`admin-session:${token}`) as AdminSession | undefined;
  if (!session || new Date(session.expiresAt).getTime() <= Date.now()) {
    if (session) await kv.del(`admin-session:${token}`);
    throw new Error("Your administrator session is invalid or has expired.");
  }
  const profile = await getProfile(session.adminId);
  if (!profile || profile.role !== "admin" || profile.accountStatus !== "active") {
    await kv.del(`admin-session:${token}`);
    throw new Error("Administrator access has been revoked.");
  }
  if (permission && !profile.permissions?.includes("*") && !profile.permissions?.includes(permission)) {
    throw new Error("You do not have permission to perform this action.");
  }
  return profile;
}

async function audit(admin: Profile, action: string, targetId: string | undefined, detail: string) {
  const createdAt = now();
  const entry = {
    id: id(),
    adminId: admin.id,
    adminName: admin.fullName,
    action,
    targetId,
    detail,
    createdAt,
  };
  await kv.set(`audit:${createdAt}:${entry.id}`, entry);
}

async function postLedger(
  userId: string,
  type: string,
  amount: number,
  account: Account,
  note: string,
) {
  const createdAt = now();
  const entry = {
    id: id(),
    userId,
    type,
    amount: round(amount),
    availableAfter: account.available,
    investedAfter: account.invested,
    note,
    createdAt,
  };
  await kv.set(`ledger:${userId}:${createdAt}:${entry.id}`, entry);
  return entry;
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function hashPassword(password: string, saltValue?: string) {
  if (password.length < 8) throw new Error("Password must contain at least 8 characters.");
  const encoder = new TextEncoder();
  const salt = saltValue ? base64ToBytes(saltValue) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: 120000 },
    key,
    256,
  );
  return `pbkdf2$120000$${bytesToBase64(salt)}$${bytesToBase64(new Uint8Array(bits))}`;
}

async function verifyPassword(password: string, encoded = "") {
  const [algorithm, iterations, salt, expected] = encoded.split("$");
  if (algorithm !== "pbkdf2" || iterations !== "120000" || !salt || !expected) return false;
  const actual = await hashPassword(password, salt);
  const actualBytes = new TextEncoder().encode(actual);
  const expectedBytes = new TextEncoder().encode(encoded);
  if (actualBytes.length !== expectedBytes.length) return false;
  let difference = 0;
  for (let index = 0; index < actualBytes.length; index++) {
    difference |= actualBytes[index] ^ expectedBytes[index];
  }
  return difference === 0;
}

async function bootstrapRootAdmin() {
  const configuredPassword = Deno.env.get("NOVA_ADMIN_PASSWORD");
  if (!configuredPassword || configuredPassword.length < 8) {
    throw new Error("The root administrator password has not been configured.");
  }
  const existing = await getProfile(ROOT_ADMIN_ID) ??
    (await allProfiles()).find((profile) => profile.email?.toLowerCase() === ROOT_ADMIN_EMAIL);
  if (existing) {
    existing.fullName = existing.fullName || "NOVA INVEST Administrator";
    existing.email = ROOT_ADMIN_EMAIL;
    existing.phone = existing.phone || "";
    existing.referralCode = existing.referralCode || await createReferralCode();
    existing.referredBy = existing.referredBy || "";
    existing.createdAt = existing.createdAt || now();
    existing.kycStatus = "approved";
    existing.accountStatus = "active";
    existing.role = "admin";
    existing.permissions = ["*"];
    if (!existing.passwordHash) {
      existing.passwordHash = await hashPassword(configuredPassword);
    }
    await kv.mset(
      [
        `profile:${existing.id}`,
        `referral:${existing.referralCode}`,
        `referral:${FOUNDING_REFERRAL_CODE}`,
      ],
      [existing, existing.id, existing.id],
    );
    return existing;
  }
  const profile: Profile = {
    id: ROOT_ADMIN_ID,
    fullName: "NOVA INVEST Administrator",
    email: ROOT_ADMIN_EMAIL,
    phone: "",
    referralCode: FOUNDING_REFERRAL_CODE,
    referredBy: "",
    createdAt: now(),
    kycStatus: "approved",
    accountStatus: "active",
    role: "admin",
    permissions: ["*"],
    passwordHash: await hashPassword(configuredPassword),
  };
  await kv.mset(
    [
      `profile:${profile.id}`,
      `referral:${profile.referralCode}`,
      `referral:${FOUNDING_REFERRAL_CODE}`,
    ],
    [profile, profile.id, profile.id],
  );
  return profile;
}

app.get(`${PREFIX}/health`, (c) => c.json({ status: "ok", version: "2026-10-23.1" }));

app.get(`${PREFIX}/referrals/:code`, async (c) => {
  try {
    const code = cleanText(c.req.param("code"), 20).toUpperCase();
    if (!/^NI-[A-Z0-9]{6}$/.test(code)) return c.json({ valid: false });
    const profile = await resolveReferrer(code);
    return c.json({ valid: canUseReferral(profile) });
  } catch (reason) {
    return error(c, reason);
  }
});

app.post(`${PREFIX}/signup`, async (c) => {
  let createdAuthUserId = "";
  try {
    const input = await body(c);
    const fullName = cleanText(input.fullName, 120);
    const phone = normalizePhone(input.phone);
    const password = String(input.password ?? "");
    const referralCode = cleanText(input.referralCode, 20).toUpperCase();
    if (fullName.length < 2) throw new Error("Enter your full name.");
    if (phone.length < 8) throw new Error("Enter a valid mobile number.");
    if (password.length < 8) throw new Error("Password must contain at least 8 characters.");
    const referrer = await resolveReferrer(referralCode);
    if (!canUseReferral(referrer)) throw new Error("The referral code is invalid or inactive.");

    const { data, error: authError } = await supabase().auth.admin.createUser({
      phone,
      password,
      phone_confirm: true,
      user_metadata: { full_name: fullName },
    });
    let authUser = data.user;
    if (authError || !authUser) {
      if (!/(already|registered|exists)/i.test(authError?.message || "")) {
        throw authError ?? new Error("The account could not be created.");
      }
      authUser = await findAuthUserByPhone(phone);
      if (!authUser || await getProfile(authUser.id)) {
        throw new Error("An account already exists for this mobile number.");
      }
      const { data: recovered, error: recoveryError } = await supabase().auth.admin.updateUserById(
        authUser.id,
        { password, phone_confirm: true, user_metadata: { full_name: fullName } },
      );
      if (recoveryError || !recovered.user) throw recoveryError ?? new Error("The account could not be recovered.");
      authUser = recovered.user;
    } else {
      createdAuthUserId = authUser.id;
    }
    const profile: Profile = {
      id: authUser.id,
      fullName,
      phone,
      referralCode: await createReferralCode(),
      referredBy: referralCode,
      createdAt: now(),
      kycStatus: "not_submitted",
      accountStatus: "active",
      role: "user",
    };
    const account: Account = { available: 0, invested: 0, currency: "TUSDT", updatedAt: now() };
    await kv.mset(
      [`profile:${profile.id}`, `account:${profile.id}`, `referral:${profile.referralCode}`],
      [profile, account, profile.id],
    );
    return c.json({ profile: publicProfile(profile, account) }, 201);
  } catch (reason) {
    if (createdAuthUserId) await supabase().auth.admin.deleteUser(createdAuthUserId).catch(() => undefined);
    return error(c, reason);
  }
});

app.get(`${PREFIX}/me`, async (c) => {
  try {
    const token = bearer(c);
    const adminSession = token ? await kv.get(`admin-session:${token}`) as AdminSession | undefined : undefined;
    if (adminSession) {
      const admin = await requireAdmin(c);
      return c.json({ profile: publicProfile(admin) });
    }
    const profile = await requireUser(c);
    return c.json({ profile: publicProfile(profile, await getAccount(profile.id)) });
  } catch (reason) {
    return error(c, reason, 401);
  }
});

app.get(`${PREFIX}/account`, async (c) => {
  try {
    const profile = await requireUser(c);
    const [account, ledger, requests] = await Promise.all([
      getAccount(profile.id),
      kv.getByPrefix(`ledger:${profile.id}:`),
      kv.getByPrefix(`request-user:${profile.id}:`),
    ]);
    return c.json({ account, ledger, requests });
  } catch (reason) {
    return error(c, reason, 401);
  }
});

app.post(`${PREFIX}/requests`, async (c) => {
  try {
    const profile = await requireUser(c);
    const input = await body(c);
    const type = input.type;
    if (type !== "deposit" && type !== "withdrawal") throw new Error("Choose a valid request type.");
    const amount = finitePositive(input.amount);
    const detail = cleanText(input.detail, 300);
    if (type === "withdrawal") {
      if (profile.kycStatus !== "approved") {
        throw new Error("KYC approval is required before requesting a withdrawal.");
      }
      if (!detail || !/binance/i.test(detail)) {
        throw new Error("Enter the approved Binance wallet or Binance account reference.");
      }
      const [account, requests] = await Promise.all([
        getAccount(profile.id),
        kv.getByPrefix(`request-user:${profile.id}:`) as Promise<FundingRequest[]>,
      ]);
      const reserved = requests
        .filter((request) => request.type === "withdrawal" && request.status === "pending")
        .reduce((total, request) => total + request.amount, 0);
      if (amount > round(account.available - reserved)) {
        throw new Error("The withdrawal exceeds your available balance after pending requests.");
      }
    }
    const createdAt = now();
    const request: FundingRequest = {
      id: id(),
      userId: profile.id,
      userName: profile.fullName,
      type,
      amount,
      detail,
      status: "pending",
      createdAt,
    };
    await kv.mset(
      [`request:${request.id}`, `request-user:${profile.id}:${createdAt}:${request.id}`],
      [request, request],
    );
    return c.json({ request }, 201);
  } catch (reason) {
    return error(c, reason);
  }
});

app.post(`${PREFIX}/kyc`, async (c) => {
  try {
    const profile = await requireUser(c);
    const input = await body(c);
    const required = ["fullName", "gender", "documentType", "documentNumber"];
    for (const field of required) {
      if (!cleanText(input[field], 200)) throw new Error("Complete all required KYC fields.");
    }
    const documents = Array.isArray(input.documents) ? input.documents : [];
    const selfie = input.selfie as Record<string, unknown> | undefined;
    if (!documents.length || !selfie?.dataUrl) throw new Error("An ID photo and selfie are required.");
    const submittedAt = now();
    const submission = {
      id: id(),
      userId: profile.id,
      status: "pending",
      submittedAt,
      reviewedAt: null,
      details: Object.fromEntries(
        Object.entries(input)
          .filter(([key]) => !["documents", "selfie"].includes(key))
          .map(([key, value]) => [key, cleanText(value, 500)]),
      ),
      documents: [
        ...documents.map((document: Record<string, unknown>) => ({
          label: cleanText(document.label, 80),
          name: cleanText(document.name, 150),
          type: "identity",
          url: cleanText(document.dataUrl, 5_000_000),
        })),
        {
          label: "Selfie",
          name: cleanText(selfie.name, 150),
          type: "selfie",
          url: cleanText(selfie.dataUrl, 5_000_000),
        },
      ],
    };
    profile.kycStatus = "pending";
    await kv.mset([`kyc:${profile.id}`, `profile:${profile.id}`], [submission, profile]);
    return c.json({ submission }, 201);
  } catch (reason) {
    return error(c, reason);
  }
});

app.post(`${PREFIX}/profit-codes/claim`, async (c) => {
  try {
    const profile = await requireUser(c);
    const input = await body(c);
    const code = cleanText(input.code, 80).toUpperCase();
    const profitCode = await kv.get(`profit-code:${code}`);
    if (!profitCode || !profitCode.active) throw new Error("This Profit Code is invalid or inactive.");
    if (profitCode.expiresAt && new Date(profitCode.expiresAt).getTime() < Date.now()) {
      throw new Error("This Profit Code has expired.");
    }
    if (await kv.get(`profit-claim:${profile.id}:${code}`)) throw new Error("You have already claimed this Profit Code.");
    const account = await getAccount(profile.id);
    const amount = profitCode.kind === "percentage"
      ? round((account.available + account.invested) * (Number(profitCode.value) / 100))
      : round(Number(profitCode.value));
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("This Profit Code has no claimable value.");
    account.available = round(account.available + amount);
    account.updatedAt = now();
    const claim = {
      code,
      userId: profile.id,
      amount,
      value: profitCode.value,
      kind: profitCode.kind,
      claimedAt: now(),
    };
    await kv.mset(
      [`account:${profile.id}`, `profit-claim:${profile.id}:${code}`],
      [account, claim],
    );
    await postLedger(profile.id, "profit_code", amount, account, `Profit Code ${code}`);
    return c.json({ claim, account });
  } catch (reason) {
    return error(c, reason);
  }
});

app.get(`${PREFIX}/profit-codes/history`, async (c) => {
  try {
    const profile = await requireUser(c);
    const claims = await kv.getByPrefix(`profit-claim:${profile.id}:`);
    return c.json({ claims });
  } catch (reason) {
    return error(c, reason, 401);
  }
});

app.get(`${PREFIX}/admin/bootstrap`, async (c) => {
  try {
    await bootstrapRootAdmin();
    return c.json({ ready: true });
  } catch (reason) {
    return error(c, reason, 503);
  }
});

app.post(`${PREFIX}/admin/login`, async (c) => {
  try {
    await bootstrapRootAdmin();
    const input = await body(c);
    const email = cleanText(input.email, 200).toLowerCase();
    const password = String(input.password ?? "");
    const profile = (await allProfiles()).find((item) =>
      item.role === "admin" && item.email?.toLowerCase() === email
    );
    if (!profile || !await verifyPassword(password, profile.passwordHash)) {
      throw new Error("The administrator email or password is incorrect.");
    }
    if (profile.accountStatus !== "active") throw new Error("Administrator access has been revoked.");
    const token = `${crypto.randomUUID()}${crypto.randomUUID().replaceAll("-", "")}`;
    const session: AdminSession = {
      token,
      adminId: profile.id,
      createdAt: now(),
      expiresAt: new Date(Date.now() + ADMIN_SESSION_TTL).toISOString(),
    };
    await kv.set(`admin-session:${token}`, session);
    await audit(profile, "admin.login", profile.id, "Administrator signed in.");
    return c.json({ profile: publicProfile(profile), token });
  } catch (reason) {
    return error(c, reason, 401);
  }
});

app.post(`${PREFIX}/admin/logout`, async (c) => {
  const token = bearer(c);
  if (token) await kv.del(`admin-session:${token}`);
  return c.json({ success: true });
});

app.get(`${PREFIX}/admin/overview`, async (c) => {
  let admin: Profile;
  try {
    admin = await requireAdmin(c);
  } catch (reason) {
    return error(c, reason, 401);
  }
  try {
    const [profiles, requests, investments, profitCodes, audits, notes, kycs] = await Promise.all([
      allProfiles(),
      kv.getByPrefix("request:"),
      kv.getByPrefix("investment:"),
      kv.getByPrefix("profit-code:"),
      kv.getByPrefix("audit:"),
      kv.getByPrefix("admin-note:"),
      kv.getByPrefix("kyc:"),
    ]);
    const visibleProfiles = await Promise.all((profiles as Profile[]).map(async (profile) =>
      publicProfile(profile, profile.role === "user" ? await getAccount(profile.id) : undefined)
    ));
    return c.json({
      profiles: visibleProfiles,
      requests,
      investments,
      profitCodes,
      audits: admin.permissions?.includes("*") || admin.permissions?.includes("audit") ? audits : [],
      notes,
      kycs,
    });
  } catch (reason) {
    return error(c, reason, 500);
  }
});

app.post(`${PREFIX}/admin/requests/:id`, async (c) => {
  try {
    const admin = await requireAdmin(c, "funding");
    const input = await body(c);
    const decision = input.decision;
    if (decision !== "approved" && decision !== "rejected") throw new Error("Choose approve or reject.");
    const requestId = c.req.param("id");
    const request = await kv.get(`request:${requestId}`) as FundingRequest | undefined;
    if (!request) throw new Error("The funding request was not found.");
    if (request.status !== "pending") throw new Error("This request has already been reviewed.");
    request.status = decision;
    request.reviewedAt = now();
    request.reviewedBy = admin.id;
    if (decision === "approved") {
      const account = await getAccount(request.userId);
      if (request.type === "withdrawal" && request.amount > account.available) {
        throw new Error("The customer no longer has enough available balance for this withdrawal.");
      }
      const delta = request.type === "deposit" ? request.amount : -request.amount;
      account.available = round(account.available + delta);
      account.updatedAt = now();
      await kv.set(`account:${request.userId}`, account);
      await postLedger(
        request.userId,
        request.type,
        delta,
        account,
        `${request.type === "deposit" ? "Deposit" : "Withdrawal"} approved by ${admin.fullName}`,
      );
    }
    await kv.mset(
      [`request:${request.id}`, `request-user:${request.userId}:${request.createdAt}:${request.id}`],
      [request, request],
    );
    await audit(admin, `funding.${decision}`, request.id, `${request.type} ${request.amount} TUSDT for ${request.userName}.`);
    return c.json({ request });
  } catch (reason) {
    return error(c, reason);
  }
});

app.post(`${PREFIX}/admin/users/:id/kyc`, async (c) => {
  try {
    const admin = await requireAdmin(c, "kyc");
    const input = await body(c);
    const status = input.status as typeof KYC_STATUSES[number];
    if (!KYC_STATUSES.includes(status)) throw new Error("Choose a valid KYC status.");
    const userId = c.req.param("id");
    const profile = await getProfile(userId);
    const submission = await kv.get(`kyc:${userId}`);
    if (!profile || profile.role !== "user") throw new Error("The customer was not found.");
    if (!submission) throw new Error("No KYC submission exists for this customer.");
    profile.kycStatus = status;
    submission.status = status;
    submission.reviewedAt = now();
    await kv.mset([`profile:${userId}`, `kyc:${userId}`], [profile, submission]);
    await audit(admin, `kyc.${status}`, userId, `KYC changed to ${status} for ${profile.fullName}.`);
    return c.json({ profile: publicProfile(profile, await getAccount(userId)) });
  } catch (reason) {
    return error(c, reason);
  }
});

app.post(`${PREFIX}/admin/users/:id/status`, async (c) => {
  try {
    const admin = await requireAdmin(c, "users");
    const input = await body(c);
    const status = input.status as typeof USER_STATUSES[number];
    if (!USER_STATUSES.includes(status)) throw new Error("Choose a valid account status.");
    const userId = c.req.param("id");
    const profile = await getProfile(userId);
    if (!profile || profile.role !== "user") throw new Error("The customer was not found.");
    profile.accountStatus = status;
    await kv.set(`profile:${userId}`, profile);
    if (status !== "active") await supabase().auth.admin.signOut(userId, "global").catch(() => undefined);
    await audit(admin, `user.${status}`, userId, `Account changed to ${status} for ${profile.fullName}.`);
    return c.json({ profile: publicProfile(profile, await getAccount(userId)) });
  } catch (reason) {
    return error(c, reason);
  }
});

app.delete(`${PREFIX}/admin/users/:id`, async (c) => {
  try {
    const admin = await requireAdmin(c, "users");
    const userId = c.req.param("id");
    const profile = await getProfile(userId);
    if (!profile || profile.role !== "user") throw new Error("The customer was not found.");
    profile.accountStatus = "deleted";
    await kv.set(`profile:${userId}`, profile);
    await supabase().auth.admin.deleteUser(userId).catch(() => undefined);
    await audit(admin, "user.deleted", userId, `Access deleted for ${profile.fullName}; financial history retained.`);
    return c.json({ profile: publicProfile(profile, await getAccount(userId)) });
  } catch (reason) {
    return error(c, reason);
  }
});

app.post(`${PREFIX}/admin/users/:id/password`, async (c) => {
  try {
    const admin = await requireAdmin(c, "users");
    const input = await body(c);
    const password = String(input.password ?? "");
    if (password.length < 8) throw new Error("Password must contain at least 8 characters.");
    const userId = c.req.param("id");
    const profile = await getProfile(userId);
    if (!profile || profile.role !== "user") throw new Error("The customer was not found.");
    const { error: authError } = await supabase().auth.admin.updateUserById(userId, { password });
    if (authError) throw authError;
    await supabase().auth.admin.signOut(userId, "global").catch(() => undefined);
    await audit(admin, "user.password_reset", userId, `Password reset for ${profile.fullName}.`);
    return c.json({ success: true });
  } catch (reason) {
    return error(c, reason);
  }
});

app.post(`${PREFIX}/admin/users/:id/balance`, async (c) => {
  try {
    const admin = await requireAdmin(c, "balances");
    const input = await body(c);
    const operation = input.operation;
    if (!["credit", "debit", "set"].includes(String(operation))) throw new Error("Choose a valid balance operation.");
    const amount = finitePositive(input.amount);
    const note = cleanText(input.note, 300);
    if (!note) throw new Error("A reason is required for every balance adjustment.");
    const userId = c.req.param("id");
    const profile = await getProfile(userId);
    if (!profile || profile.role !== "user") throw new Error("The customer was not found.");
    const account = await getAccount(userId);
    const previous = account.available;
    const next = operation === "credit" ? previous + amount : operation === "debit" ? previous - amount : amount;
    if (next < 0) throw new Error("The adjustment would create a negative available balance.");
    account.available = round(next);
    account.updatedAt = now();
    await kv.set(`account:${userId}`, account);
    await postLedger(userId, `admin_${operation}`, round(account.available - previous), account, note);
    await audit(admin, `balance.${operation}`, userId, `${note} (${amount} TUSDT)`);
    return c.json({ account });
  } catch (reason) {
    return error(c, reason);
  }
});

app.post(`${PREFIX}/admin/users/:id/notes`, async (c) => {
  try {
    const admin = await requireAdmin(c, "users");
    const input = await body(c);
    const text = cleanText(input.text, 2000);
    if (!text) throw new Error("Enter a note.");
    const userId = c.req.param("id");
    if (!await getProfile(userId)) throw new Error("The customer was not found.");
    const createdAt = now();
    const note = { id: id(), userId, text, adminId: admin.id, adminName: admin.fullName, createdAt };
    await kv.set(`admin-note:${userId}:${createdAt}:${note.id}`, note);
    await audit(admin, "user.note_added", userId, "Internal administrative note added.");
    return c.json({ note }, 201);
  } catch (reason) {
    return error(c, reason);
  }
});

app.post(`${PREFIX}/admin/profit-codes`, async (c) => {
  try {
    const admin = await requireAdmin(c, "profit_codes");
    const input = await body(c);
    const code = cleanText(input.code, 80).toUpperCase();
    const kind = input.kind;
    if (!/^[A-Z0-9-]{4,80}$/.test(code)) throw new Error("Enter a valid Profit Code.");
    if (kind !== "fixed" && kind !== "percentage") throw new Error("Choose a valid distribution type.");
    const value = finitePositive(input.value, "Value");
    if (kind === "percentage" && value > 100) throw new Error("Percentage cannot exceed 100.");
    if (await kv.get(`profit-code:${code}`)) throw new Error("This Profit Code already exists.");
    const expiresAt = cleanText(input.expiresAt, 50) || null;
    if (expiresAt && Number.isNaN(new Date(expiresAt).getTime())) throw new Error("Enter a valid expiry date.");
    const profitCode = { code, kind, value, active: true, expiresAt, createdAt: now() };
    await kv.set(`profit-code:${code}`, profitCode);
    await audit(admin, "profit_code.created", code, `${kind} distribution of ${value}.`);
    return c.json({ profitCode }, 201);
  } catch (reason) {
    return error(c, reason);
  }
});

app.post(`${PREFIX}/admin/profit-codes/:code/status`, async (c) => {
  try {
    const admin = await requireAdmin(c, "profit_codes");
    const input = await body(c);
    if (typeof input.active !== "boolean") throw new Error("Choose an active status.");
    const code = cleanText(c.req.param("code"), 80).toUpperCase();
    const profitCode = await kv.get(`profit-code:${code}`);
    if (!profitCode) throw new Error("The Profit Code was not found.");
    profitCode.active = input.active;
    await kv.set(`profit-code:${code}`, profitCode);
    await audit(admin, `profit_code.${input.active ? "activated" : "revoked"}`, code, `Profit Code ${code} status changed.`);
    return c.json({ profitCode });
  } catch (reason) {
    return error(c, reason);
  }
});

app.post(`${PREFIX}/admin/admins`, async (c) => {
  try {
    const admin = await requireAdmin(c, "admins");
    const input = await body(c);
    const fullName = cleanText(input.fullName, 120);
    const email = cleanText(input.email, 200).toLowerCase();
    const password = String(input.password ?? "");
    const permissions = Array.isArray(input.permissions)
      ? input.permissions.filter((permission): permission is Permission =>
        ADMIN_PERMISSIONS.includes(permission as Permission)
      )
      : [];
    if (fullName.length < 2) throw new Error("Enter the administrator's full name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid administrator email.");
    if ((await allProfiles()).some((profile) => profile.role === "admin" && profile.email?.toLowerCase() === email)) {
      throw new Error("An administrator already exists with this email.");
    }
    const profile: Profile = {
      id: `admin-${id()}`,
      fullName,
      email,
      phone: "",
      referralCode: await createReferralCode(),
      referredBy: admin.referralCode,
      createdAt: now(),
      kycStatus: "approved",
      accountStatus: "active",
      role: "admin",
      permissions,
      passwordHash: await hashPassword(password),
    };
    await kv.mset(
      [`profile:${profile.id}`, `referral:${profile.referralCode}`],
      [profile, profile.id],
    );
    await audit(admin, "admin.created", profile.id, `Administrator ${profile.email} created.`);
    return c.json({ profile: publicProfile(profile) }, 201);
  } catch (reason) {
    return error(c, reason);
  }
});

app.post(`${PREFIX}/admin/admins/:id`, async (c) => {
  try {
    const admin = await requireAdmin(c, "admins");
    const adminId = c.req.param("id");
    const target = await getProfile(adminId);
    if (!target || target.role !== "admin") throw new Error("The administrator was not found.");
    if (adminId === ROOT_ADMIN_ID || target.email?.toLowerCase() === ROOT_ADMIN_EMAIL) {
      throw new Error("Root administrator access cannot be changed here.");
    }
    const input = await body(c);
    if (input.status !== undefined) {
      if (input.status !== "active" && input.status !== "revoked") throw new Error("Choose active or revoked.");
      target.accountStatus = input.status;
    }
    if (input.permissions !== undefined) {
      if (!Array.isArray(input.permissions)) throw new Error("Permissions must be a list.");
      target.permissions = input.permissions.filter((permission): permission is Permission =>
        ADMIN_PERMISSIONS.includes(permission as Permission)
      );
    }
    if (input.password !== undefined) target.passwordHash = await hashPassword(String(input.password));
    await kv.set(`profile:${target.id}`, target);
    if (target.accountStatus !== "active" || input.password !== undefined) {
      const sessions = await kv.getByPrefix("admin-session:") as AdminSession[];
      await Promise.all(
        sessions.filter((session) => session.adminId === target.id)
          .map((session) => kv.del(`admin-session:${session.token}`)),
      );
    }
    await audit(admin, "admin.updated", target.id, `Administrator ${target.email} updated; status ${target.accountStatus}.`);
    return c.json({ profile: publicProfile(target) });
  } catch (reason) {
    return error(c, reason);
  }
});

app.post(`${PREFIX}/admin/investments`, async (c) => {
  try {
    const admin = await requireAdmin(c, "investments");
    const input = await body(c);
    const userId = cleanText(input.userId, 100);
    const amount = finitePositive(input.amount);
    const market = cleanText(input.market, 150);
    const profile = await getProfile(userId);
    if (!profile || profile.role !== "user" || profile.accountStatus === "deleted") {
      throw new Error("The customer was not found.");
    }
    const account = await getAccount(userId);
    if (amount > account.available) throw new Error("The customer does not have enough available balance.");
    account.available = round(account.available - amount);
    account.invested = round(account.invested + amount);
    account.updatedAt = now();
    const investment = {
      id: id(),
      userId,
      market,
      principal: amount,
      status: "open",
      createdAt: now(),
    };
    await kv.mset([`account:${userId}`, `investment:${investment.id}`], [account, investment]);
    await postLedger(userId, "investment_allocated", -amount, account, `Allocated to ${market}`);
    await audit(admin, "investment.allocated", investment.id, `${amount} TUSDT allocated for ${profile.fullName}.`);
    return c.json({ investment }, 201);
  } catch (reason) {
    return error(c, reason);
  }
});

app.post(`${PREFIX}/admin/investments/:id/settle`, async (c) => {
  try {
    const admin = await requireAdmin(c, "investments");
    const input = await body(c);
    const profit = Number(input.profit);
    if (!Number.isFinite(profit)) throw new Error("Enter a valid profit or loss.");
    const investmentId = c.req.param("id");
    const investment = await kv.get(`investment:${investmentId}`);
    if (!investment) throw new Error("The investment was not found.");
    if (investment.status !== "open") throw new Error("This investment has already been settled.");
    if (profit < -investment.principal) throw new Error("A loss cannot exceed the investment principal.");
    const account = await getAccount(investment.userId);
    if (account.invested < investment.principal) throw new Error("The invested balance is inconsistent.");
    account.invested = round(account.invested - investment.principal);
    account.available = round(account.available + investment.principal + profit);
    account.updatedAt = now();
    investment.status = "settled";
    investment.profit = round(profit);
    investment.settledAt = now();
    await kv.mset(
      [`account:${investment.userId}`, `investment:${investment.id}`],
      [account, investment],
    );
    await postLedger(
      investment.userId,
      "investment_settled",
      round(investment.principal + profit),
      account,
      `${investment.market} settled; return ${round(profit)} TUSDT`,
    );
    await audit(admin, "investment.settled", investment.id, `Return ${round(profit)} TUSDT posted.`);
    return c.json({ investment });
  } catch (reason) {
    return error(c, reason);
  }
});

app.notFound((c) => c.json({ error: "Endpoint not found." }, 404));

Deno.serve(app.fetch);
