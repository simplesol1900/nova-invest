import { projectId, publicAnonKey } from "../../utils/supabase/info";
import { supabase } from "./supabase";

const baseUrl = `https://${projectId}.supabase.co/functions/v1/make-server-cee2ad72`;
const adminSessionKey = "nova-invest-admin-session";

export type UserProfile = {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  referralCode: string;
  referredBy: string;
  createdAt: string;
  kycStatus: "not_submitted" | "pending" | "approved" | "rejected";
  accountStatus: "pending" | "active" | "suspended" | "revoked" | "deleted";
  role: "user" | "admin";
  permissions?: Array<AdminPermission | "*">;
  account?: SandboxAccount;
};

export type AdminPermission =
  | "users"
  | "funding"
  | "kyc"
  | "balances"
  | "investments"
  | "profit_codes"
  | "admins"
  | "audit";

export type SandboxAccount = {
  available: number;
  invested: number;
  currency: "TUSDT";
  updatedAt: string;
};

export type SandboxRequest = {
  id: string;
  userId: string;
  userName: string;
  type: "deposit" | "withdrawal";
  amount: number;
  detail: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
};

export type LedgerEntry = {
  id: string;
  userId: string;
  type: string;
  amount: number;
  availableAfter: number;
  investedAfter: number;
  note: string;
  createdAt: string;
};

export type SandboxInvestment = {
  id: string;
  userId: string;
  market: string;
  principal: number;
  status: "open" | "settled";
  createdAt: string;
  profit?: number;
};

export type ProfitCode = {
  code: string;
  kind: "fixed" | "percentage";
  value: number;
  active: boolean;
  expiresAt?: string | null;
  createdAt: string;
};

export type AdminAudit = {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  targetId?: string;
  detail: string;
  createdAt: string;
};

export type AdminNote = {
  id: string;
  userId: string;
  text: string;
  adminId: string;
  adminName: string;
  createdAt: string;
};

export type KycSubmission = {
  id: string;
  userId: string;
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
  reviewedAt?: string | null;
  reviewNote?: string;
  details: Record<string, string>;
  documents: Array<{
    label: string;
    name: string;
    type: string;
    url?: string;
  }>;
};

async function request<T>(
  path: string,
  init: RequestInit = {},
  authenticated: false | "user" | "admin" = false,
): Promise<T> {
  const session = authenticated === "user"
    ? (await supabase.auth.getSession()).data.session
    : null;
  const adminToken = authenticated === "admin"
    ? window.localStorage.getItem(adminSessionKey)
    : null;
  let response: Response;
  try {
    const headers: Record<string, string> = {
      apikey: publicAnonKey,
      Authorization: `Bearer ${session?.access_token ?? publicAnonKey}`,
      ...(init.headers as Record<string, string> | undefined),
    };
    if (adminToken) headers["X-Admin-Token"] = adminToken;
    if (init.body) headers["Content-Type"] = "application/json";
    response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers,
    });
  } catch {
    throw new Error("The server could not be reached. Check your connection and try again.");
  }
  const responseText = await response.text();
  let data: Record<string, unknown> = {};
  try {
    data = responseText ? JSON.parse(responseText) : {};
  } catch {
    data = {};
  }
  if (!response.ok) {
    const serverMessage = typeof data.error === "string" ? data.error : responseText.trim();
    if (
      response.status === 401 &&
      authenticated === "admin" &&
      path !== "/admin/login"
    ) {
      window.localStorage.removeItem(adminSessionKey);
      window.location.reload();
    }
    throw new Error(serverMessage || `The request could not be completed (HTTP ${response.status}).`);
  }
  return data as T;
}

export async function validateReferral(code: string) {
  const data = await request<{ valid: boolean }>(
    `/referrals/${encodeURIComponent(code)}`,
  );
  return data.valid;
}

export async function createAccount(input: {
  fullName: string;
  phone: string;
  password: string;
  referralCode: string;
}) {
  return request<{ profile: UserProfile }>("/signup", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function bootstrapAdmin() {
  return request<{ ready: boolean }>("/admin/bootstrap");
}

export async function getProfile() {
  const data = await request<{ profile: UserProfile }>("/me", {}, "user");
  return data.profile;
}

export async function loginAdmin(email: string, password: string) {
  const data = await request<{ profile: UserProfile; token: string }>("/admin/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  window.localStorage.setItem(adminSessionKey, data.token);
  return data.profile;
}

export async function getAdminProfile() {
  const data = await request<{ profile: UserProfile }>("/me", {}, "admin");
  return data.profile;
}

export function hasAdminSession() {
  return Boolean(window.localStorage.getItem(adminSessionKey));
}

export async function logoutAdmin() {
  try {
    await request("/admin/logout", { method: "POST" }, "admin");
  } finally {
    window.localStorage.removeItem(adminSessionKey);
  }
}

export async function getSandboxAccount() {
  return request<{ account: SandboxAccount; ledger: LedgerEntry[]; requests: SandboxRequest[] }>("/account", {}, "user");
}

export async function createSandboxRequest(input: {
  type: "deposit" | "withdrawal";
  amount: number;
  detail: string;
}) {
  return request<{ request: SandboxRequest }>("/requests", {
    method: "POST",
    body: JSON.stringify(input),
  }, "user");
}

export async function submitKyc(input: {
  fullName: string;
  dateOfBirth: string;
  nationality: string;
  phone: string;
  gender: string;
  address: string;
  documentType: string;
  documentNumber: string;
  issueDate: string;
  expiryDate: string;
  issuingCountry: string;
  documents: Array<{ label: string; name: string; dataUrl: string }>;
  selfie: { name: string; dataUrl: string };
}) {
  return request<{ submission: KycSubmission }>("/kyc", {
    method: "POST",
    body: JSON.stringify(input),
  }, "user");
}

export async function claimProfitCode(code: string) {
  return request<{
    claim: { code: string; amount: number; value: number; kind: "fixed" | "percentage"; claimedAt: string };
    account: SandboxAccount;
  }>("/profit-codes/claim", {
    method: "POST",
    body: JSON.stringify({ code }),
  }, "user");
}

export async function getProfitCodeHistory() {
  return request<{
    claims: Array<{
      code: string;
      userId: string;
      amount: number;
      value: number;
      kind: "fixed" | "percentage";
      claimedAt: string;
    }>;
  }>("/profit-codes/history", {}, "user");
}

export async function getAdminOverview() {
  const data = await request<Partial<{
    profiles: UserProfile[];
    requests: SandboxRequest[];
    investments: SandboxInvestment[];
    profitCodes: ProfitCode[];
    audits: AdminAudit[];
    notes: AdminNote[];
    kycs: KycSubmission[];
  }>>("/admin/overview", {}, "admin");
  return {
    profiles: Array.isArray(data.profiles) ? data.profiles : [],
    requests: Array.isArray(data.requests) ? data.requests : [],
    investments: Array.isArray(data.investments) ? data.investments : [],
    profitCodes: Array.isArray(data.profitCodes) ? data.profitCodes : [],
    audits: Array.isArray(data.audits) ? data.audits : [],
    notes: Array.isArray(data.notes) ? data.notes : [],
    kycs: Array.isArray(data.kycs) ? data.kycs : [],
  };
}

export async function reviewSandboxRequest(id: string, decision: "approved" | "rejected") {
  return request<{ request: SandboxRequest }>(`/admin/requests/${id}`, {
    method: "POST",
    body: JSON.stringify({ decision }),
  }, "admin");
}

export async function updateSandboxKyc(id: string, status: "approved" | "rejected" | "pending") {
  return request<{ profile: UserProfile }>(`/admin/users/${id}/kyc`, {
    method: "POST",
    body: JSON.stringify({ status }),
  }, "admin");
}

export async function updateUserStatus(
  id: string,
  status: "pending" | "active" | "suspended" | "revoked",
) {
  return request<{ profile: UserProfile }>(`/admin/users/${id}/status`, {
    method: "POST",
    body: JSON.stringify({ status }),
  }, "admin");
}

export async function deleteUser(id: string) {
  return request<{ profile: UserProfile }>(`/admin/users/${id}`, {
    method: "DELETE",
  }, "admin");
}

export async function resetUserPassword(id: string, password: string) {
  return request<{ success: true }>(`/admin/users/${id}/password`, {
    method: "POST",
    body: JSON.stringify({ password }),
  }, "admin");
}

export async function adjustUserBalance(
  id: string,
  operation: "credit" | "debit" | "set",
  amount: number,
  note: string,
) {
  return request<{ account: SandboxAccount }>(`/admin/users/${id}/balance`, {
    method: "POST",
    body: JSON.stringify({ operation, amount, note }),
  }, "admin");
}

export async function addAdminNote(id: string, text: string) {
  return request<{ note: AdminNote }>(`/admin/users/${id}/notes`, {
    method: "POST",
    body: JSON.stringify({ text }),
  }, "admin");
}

export async function createProfitCode(input: {
  code: string;
  kind: "fixed" | "percentage";
  value: number;
  expiresAt?: string;
}) {
  return request<{ profitCode: ProfitCode }>("/admin/profit-codes", {
    method: "POST",
    body: JSON.stringify(input),
  }, "admin");
}

export async function setProfitCodeStatus(code: string, active: boolean) {
  return request<{ profitCode: ProfitCode }>(
    `/admin/profit-codes/${encodeURIComponent(code)}/status`,
    {
      method: "POST",
      body: JSON.stringify({ active }),
    },
    "admin",
  );
}

export async function createAdministrator(input: {
  fullName: string;
  email: string;
  password: string;
  permissions: AdminPermission[];
}) {
  return request<{ profile: UserProfile }>("/admin/admins", {
    method: "POST",
    body: JSON.stringify(input),
  }, "admin");
}

export async function updateAdministrator(
  id: string,
  input: {
    status?: "active" | "revoked";
    password?: string;
    permissions?: AdminPermission[];
  },
) {
  return request<{ profile: UserProfile }>(`/admin/admins/${id}`, {
    method: "POST",
    body: JSON.stringify(input),
  }, "admin");
}

export async function allocateSandboxInvestment(userId: string, amount: number, market: string) {
  return request<{ investment: SandboxInvestment }>("/admin/investments", {
    method: "POST",
    body: JSON.stringify({ userId, amount, market }),
  }, "admin");
}

export async function settleSandboxInvestment(id: string, profit: number) {
  return request<{ investment: SandboxInvestment }>(`/admin/investments/${id}/settle`, {
    method: "POST",
    body: JSON.stringify({ profit }),
  }, "admin");
}
