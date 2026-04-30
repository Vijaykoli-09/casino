import { Storage } from './storage';

// ==========================================
// MOCK DATABASE (In-Memory)
// ==========================================
const MOCK_USERS = [
  {
    id: 1,
    username: 'vijay',
    password: '1234',
    balance: 10000,
    isAdmin: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    username: 'admin',
    password: '1234',
    balance: 50000,
    isAdmin: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 3,
    username: 'player1',
    password: 'pass123',
    balance: 5000,
    isAdmin: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 4,
    username: 'player2',
    password: 'pass123',
    balance: 15000,
    isAdmin: false,
    createdAt: new Date().toISOString(),
  },
];

let currentUserId: number | null = null;

// Mock current round state
let mockRound = {
  id: 1,
  status: 'BETTING_OPEN' as 'BETTING_OPEN' | 'BETTING_CLOSED' | 'SPINNING' | 'RESULT_DISPLAY',
  secondsLeft: 30,
  resultNumber: null as number | null,
  lastResults: [12, 5, 23, 8, 17, 3, 29, 11],
};

// Mock bet history
let mockBets: Array<{
  id: number;
  roundId: number;
  userId: number;
  betType: string;
  betValue: string | null;
  amount: number;
  winAmount: number;
  isSettled: boolean;
  createdAt: string;
}> = [];

// ==========================================
// HELPER: Simulate API delay
// ==========================================
const delay = (ms: number = 500) => new Promise<void>(resolve => setTimeout(() => resolve(), ms));

// ==========================================
// AUTH API
// ==========================================
export const login = async (username: string, password: string) => {
  await delay(800); // Simulate network delay

  const user = MOCK_USERS.find(
    u => u.username === username && u.password === password
  );

  if (!user) {
    throw new Error('Invalid username or password');
  }

  currentUserId = user.id;
  const token = `mock_token_${user.id}_${Date.now()}`;

  await Storage.saveAuth(token, user.id, user.isAdmin);

  return {
    token,
    userId: user.id,
    isAdmin: user.isAdmin,
  };
};

export const logout = () => {
  currentUserId = null;
  return Storage.clear();
};

// ==========================================
// PLAYER API
// ==========================================
export const getCurrentRound = async () => {
  await delay(300);

  const userId = await Storage.getUserId();
  if (!userId) throw new Error('Not authenticated');

  const user = MOCK_USERS.find(u => u.id === userId);
  if (!user) throw new Error('User not found');

  return {
    ...mockRound,
    balance: user.balance,
  };
};

export const placeBet = async (body: {
  roundId: number;
  betType: 'RED' | 'BLACK' | 'NUMBER';
  betValue?: string;
  amount: number;
}) => {
  await delay(400);

  const userId = await Storage.getUserId();
  if (!userId) throw new Error('Not authenticated');

  const user = MOCK_USERS.find(u => u.id === userId);
  if (!user) throw new Error('User not found');

  if (user.balance < body.amount) {
    throw new Error('Insufficient balance');
  }

  // Deduct bet amount
  user.balance -= body.amount;

  // Save bet to history
  mockBets.push({
    id: mockBets.length + 1,
    roundId: body.roundId,
    userId,
    betType: body.betType,
    betValue: body.betValue || null,
    amount: body.amount,
    winAmount: 0,
    isSettled: false,
    createdAt: new Date().toISOString(),
  });

  return {
    success: true,
    newBalance: user.balance,
  };
};

export const getBalance = async () => {
  await delay(200);

  const userId = await Storage.getUserId();
  if (!userId) throw new Error('Not authenticated');

  const user = MOCK_USERS.find(u => u.id === userId);
  if (!user) throw new Error('User not found');

  return { balance: user.balance };
};

export const getBetHistory = async () => {
  await delay(400);

  const userId = await Storage.getUserId();
  if (!userId) throw new Error('Not authenticated');

  return mockBets.filter(bet => bet.userId === userId);
};

// ==========================================
// ADMIN API
// ==========================================
export const getUsers = async () => {
  await delay(500);

  const userId = await Storage.getUserId();
  const isAdmin = await Storage.getIsAdmin();

  if (!userId || !isAdmin) {
    throw new Error('Unauthorized - Admin access required');
  }

  return MOCK_USERS.map(u => ({
    id: u.id,
    username: u.username,
    balance: u.balance,
    isAdmin: u.isAdmin,
    createdAt: u.createdAt,
  }));
};

export const createUser = async (body: {
  username: string;
  password: string;
  balance: number;
}) => {
  await delay(600);

  const userId = await Storage.getUserId();
  const isAdmin = await Storage.getIsAdmin();

  if (!userId || !isAdmin) {
    throw new Error('Unauthorized - Admin access required');
  }

  // Check if username exists
  if (MOCK_USERS.find(u => u.username === body.username)) {
    throw new Error('Username already exists');
  }

  const newUser = {
    id: MOCK_USERS.length + 1,
    username: body.username,
    password: body.password,
    balance: body.balance,
    isAdmin: false,
    createdAt: new Date().toISOString(),
  };

  MOCK_USERS.push(newUser);

  return {
    id: newUser.id,
    username: newUser.username,
    balance: newUser.balance,
  };
};

export const updateBalance = async (targetUserId: number, amount: number) => {
  await delay(400);

  const userId = await Storage.getUserId();
  const isAdmin = await Storage.getIsAdmin();

  if (!userId || !isAdmin) {
    throw new Error('Unauthorized - Admin access required');
  }

  const user = MOCK_USERS.find(u => u.id === targetUserId);
  if (!user) {
    throw new Error('User not found');
  }

  user.balance = amount;

  return { newBalance: user.balance };
};