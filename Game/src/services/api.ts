import { Storage } from './storage';

const BASE_URL = 'http://192.168.31.42:8080/api';

// ── Header builder ────────────────────────────────────────────────────────────
const getHeaders = async (): Promise<Record<string, string>> => {
    const token = await Storage.getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

// ── Response handler ──────────────────────────────────────────────────────────
const handle = async <T>(res: Response): Promise<T> => {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error || (err as any).message || `HTTP ${res.status}`);
  }
  return res.json();
};

// ─────────────────────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────────────────────

export const login = async (
  username: string,
  password: string
): Promise<{
  token:            string;
  userId:           number;
  username:         string;
  role:             string;
  requiresPasscode: boolean;
}> => {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ username, password }),
  });
  const data = await handle<{
    token:            string;
    userId:           number;
    username:         string;
    role:             string;
    requiresPasscode: boolean;
  }>(res);

  // Save auth only if NOT super admin temp token
  if (!data.requiresPasscode) {
    await Storage.saveAuth(data.token, data.userId, data.role === 'SUPER_ADMIN');
  }

  return data;
};

export const verifyPasscode = async (
  passcode:  string,
  tempToken: string
): Promise<{
  token:            string;
  userId:           number;
  username:         string;
  role:             string;
  requiresPasscode: boolean;
}> => {
  const res = await fetch(`${BASE_URL}/auth/verify-passcode`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${tempToken}`,
    },
    body: JSON.stringify({ passcode }),
  });
  const data = await handle<{
    token:            string;
    userId:           number;
    username:         string;
    role:             string;
    requiresPasscode: boolean;
  }>(res);

  // Save full super admin token
  await Storage.saveAuth(data.token, data.userId, true);
  return data;
};

export const logout = async (): Promise<void> => {
  await Storage.clear();
};

// ─────────────────────────────────────────────────────────────────────────────
// GAME — PLAYER
// ─────────────────────────────────────────────────────────────────────────────

export const getCurrentRound = async (): Promise<{
  id:           number;
  status:       'BETTING_OPEN' | 'SPINNING' | 'RESULT_DISPLAY';
  secondsLeft:  number;
  resultNumber: number | null;
  lastResults:  number[];
  balance:      number;
}> => {
  const res = await fetch(`${BASE_URL}/game/round/current`, {
    headers: await getHeaders(),
  });
  return handle(res);
};

export const placeBet = async (body: {
  roundId:  number;
  betType:  string;
  betValue?: string;
  amount:   number;
}): Promise<{
  success:    boolean;
  bet:        BetItem;
  newBalance: number;
}> => {
  const res = await fetch(`${BASE_URL}/game/bet`, {
    method:  'POST',
    headers: await getHeaders(),
    body:    JSON.stringify(body),
  });
  return handle(res);
};

export const placeBetsBatch = async (
  bets: Array<{
    roundId:   number;
    betType:   string;
    betValue?: string;
    amount:    number;
  }>
): Promise<{
  success:       boolean;
  totalDeducted: number;
  newBalance:    number;
  bets:          BetItem[];
}> => {
  const res = await fetch(`${BASE_URL}/game/bets/batch`, {
    method:  'POST',
    headers: await getHeaders(),
    body:    JSON.stringify(bets),
  });
  return handle(res);
};

export const getBalance = async (): Promise<{ balance: number }> => {
  const res = await fetch(`${BASE_URL}/game/balance`, {
    headers: await getHeaders(),
  });
  return handle(res);
};

export const getBetHistory = async (): Promise<BetItem[]> => {
  const res = await fetch(`${BASE_URL}/game/bets/history`, {
    headers: await getHeaders(),
  });
  return handle(res);
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN
// ─────────────────────────────────────────────────────────────────────────────

export const getMyPlayers = async (): Promise<UserItem[]> => {
  const res = await fetch(`${BASE_URL}/admin/players`, {
    headers: await getHeaders(),
  });
  return handle(res);
};

export const searchMyPlayers = async (q: string): Promise<UserItem[]> => {
  const res = await fetch(
    `${BASE_URL}/admin/players/search?q=${encodeURIComponent(q)}`,
    { headers: await getHeaders() }
  );
  return handle(res);
};

export const getPlayer = async (id: number): Promise<UserItem> => {
  const res = await fetch(`${BASE_URL}/admin/players/${id}`, {
    headers: await getHeaders(),
  });
  return handle(res);
};

export const createPlayer = async (body: {
  username: string;
  password: string;
  balance:  number;
}): Promise<UserItem> => {
  const res = await fetch(`${BASE_URL}/admin/players`, {
    method:  'POST',
    headers: await getHeaders(),
    body:    JSON.stringify(body),
  });
  return handle(res);
};

export const updateBalance = async (
  playerId: number,
  amount:   number
): Promise<{ id: number; username: string; balance: number }> => {
  const res = await fetch(`${BASE_URL}/admin/players/${playerId}/balance`, {
    method:  'PUT',
    headers: await getHeaders(),
    body:    JSON.stringify({ amount }),
  });
  return handle(res);
};

// ─────────────────────────────────────────────────────────────────────────────
// SUPER ADMIN
// ─────────────────────────────────────────────────────────────────────────────

export const getAllAdmins = async (): Promise<UserItem[]> => {
  const res = await fetch(`${BASE_URL}/super-admin/admins`, {
    headers: await getHeaders(),
  });
  return handle(res);
};

export const searchAdmins = async (q: string): Promise<UserItem[]> => {
  const res = await fetch(
    `${BASE_URL}/super-admin/admins/search?q=${encodeURIComponent(q)}`,
    { headers: await getHeaders() }
  );
  return handle(res);
};

export const createAdmin = async (body: {
  username: string;
  password: string;
}): Promise<UserItem> => {
  const res = await fetch(`${BASE_URL}/super-admin/admins`, {
    method:  'POST',
    headers: await getHeaders(),
    body:    JSON.stringify(body),
  });
  return handle(res);
};

export const getAdminDetail = async (
  adminId: number
): Promise<AdminDetailItem> => {
  const res = await fetch(`${BASE_URL}/super-admin/admins/${adminId}`, {
    headers: await getHeaders(),
  });
  return handle(res);
};

export const getAdminProfit = async (
  adminId:  number,
  from:     string,
  to:       string
): Promise<AdminProfitItem> => {
  const res = await fetch(
    `${BASE_URL}/super-admin/admins/${adminId}/profit?from=${from}&to=${to}`,
    { headers: await getHeaders() }
  );
  return handle(res);
};

export const deleteAdmin = async (adminId: number): Promise<void> => {
  const res = await fetch(`${BASE_URL}/super-admin/admins/${adminId}`, {
    method:  'DELETE',
    headers: await getHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error || `HTTP ${res.status}`);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface BetItem {
  id:         number;
  roundId:    number;
  betType:    string;
  betValue:   string | null;
  amount:     number;
  winAmount:  number;
  isSettled:  boolean;
  createdAt:  string;
}

export interface UserItem {
  id:                 number;
  username:           string;
  balance:            number;
  role:               string;
  createdById:        number | null;
  createdByUsername:  string | null;
  createdAt:          string;
}

export interface AdminDetailItem {
  id:           number;
  username:     string;
  role:         string;
  totalProfit:  number;
  totalPlayers: number;
  players:      UserItem[];
  createdAt:    string;
}

export interface AdminProfitItem {
  adminId:         number;
  adminUsername:   string;
  totalPlayers:    number;
  totalBets:       number;
  totalPayouts:    number;
  adminProfit:     number;
  superAdminShare: number;
  fromDate:        string;
  toDate:          string;
  players: Array<{
    id:       number;
    username: string;
    balance:  number;
  }>;
}