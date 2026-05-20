import 'text-encoding';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import { Storage } from './storage';

const WS_URL             = 'ws://192.168.31.42:8080/ws-native';
const WS_CONNECT_TIMEOUT = 10000; // ms
const TOKEN_RETRY_ATTEMPTS = 5;
const TOKEN_RETRY_DELAY    = 200; // ms

let client:    Client | null            = null;
let roundSub:  StompSubscription | null = null;
let balanceSub: StompSubscription | null = null;
let isConnected = false;

export interface RoundPayload {
  id:           number;
  status:       'BETTING_OPEN' | 'SPINNING' | 'RESULT_DISPLAY';
  secondsLeft:  number;
  resultNumber: number | null;
  lastResults:  number[];
  balance:      number | null;
}

export interface BalancePayload {
  username: string;
  balance:  number;
}

export const connectWebSocket = async (
  onRoundUpdate:   (data: RoundPayload)   => void,
  onBalanceUpdate: (data: BalancePayload) => void,
  onConnected?:    () => void,
): Promise<boolean> => {

  // ── Wait for token (in-memory cache makes this near-instant post-login) ───
  let token = await Storage.getToken();
  let retries = 0;
  while (!token && retries < TOKEN_RETRY_ATTEMPTS) {
    console.warn(`[WS] Token not ready, retry ${retries + 1}/${TOKEN_RETRY_ATTEMPTS}`);
    await new Promise<void>(r => setTimeout(r, TOKEN_RETRY_DELAY));
    token = await Storage.getToken();
    retries++;
  }

  if (!token) {
    console.error('[WS] ❌ No token after retries — aborting');
    return false;
  }

  // ── Tear down any existing client cleanly ─────────────────────────────────
  if (client) {
    try { client.deactivate(); } catch {}
    client      = null;
    isConnected = false;
  }

  console.log('[WS] Creating STOMP client...');

  return new Promise<boolean>((resolve) => {
    const timeout = setTimeout(() => {
      console.error('[WS] ❌ Connection timeout');
      try { client?.deactivate(); } catch {}
      client      = null;
      isConnected = false;
      resolve(false);
    }, WS_CONNECT_TIMEOUT);

    /**
     * THE FIX: pass onConnect directly in the constructor config object.
     *
     * The original code did:
     *   client = new Client({ onConnect: () => {} });   ← empty stub baked in
     *   client.onConnect = (frame) => { ... real logic ... };  ← reassignment
     *
     * @stomp/stompjs stores the callback reference at construction time for
     * some internal wiring. Reassigning the property after construction is NOT
     * guaranteed to replace the handler that fires on connect — in practice the
     * empty stub fires, resolve(true) never runs, the timeout fires resolve(false),
     * and GameScreen shows "Connection Error" even though the server is reachable.
     *
     * Passing onConnect in the constructor config ensures the real handler is
     * registered from the start.
     */
    client = new Client({
      brokerURL: WS_URL,

      connectHeaders: {
        login:    'user',
        passcode: token,
      },

      reconnectDelay:    5000,
      heartbeatIncoming: 30000,
      heartbeatOutgoing: 30000,

      // ── Registered at construction time — this is what actually fires ─────
      onConnect: (_frame) => {
        clearTimeout(timeout);
        console.log('[WS] ✅ Connected, subscribing...');

        isConnected = true;

        roundSub = client!.subscribe(
          '/topic/round',
          (msg: IMessage) => {
            try { onRoundUpdate(JSON.parse(msg.body)); }
            catch (e) { console.warn('[WS] Bad round msg', e); }
          },
          { ack: 'auto' },
        );

        balanceSub = client!.subscribe(
          '/user/queue/balance',
          (msg: IMessage) => {
            try { onBalanceUpdate(JSON.parse(msg.body)); }
            catch (e) { console.warn('[WS] Bad balance msg', e); }
          },
          { ack: 'auto' },
        );

        console.log('[WS] ✅ Subscriptions ready');
        onConnected?.();
        resolve(true);
      },

      onDisconnect: (_frame) => {
        isConnected = false;
        console.log('[WS] Disconnected');
      },

      onStompError: (frame) => {
        isConnected = false;
        clearTimeout(timeout);
        console.error('[WS] ❌ STOMP error:', frame.body);
        resolve(false);
      },

      onWebSocketError: (evt) => {
        isConnected = false;
        clearTimeout(timeout);
        console.error('[WS] ❌ WS error:', (evt as any)?.message ?? evt);
        resolve(false);
      },

      onWebSocketClose: (evt) => {
        isConnected = false;
        clearTimeout(timeout);
        const code = (evt as any)?.code;
        const reason = (evt as any)?.reason;
        console.warn('[WS] ❌ WS closed — code:', code, 'reason:', reason);
        if (code !== 1000 || !isConnected) resolve(false);
      },

      debug: (str) => console.log('[STOMP]', str),
    });

    client.activate();
    console.log('[WS] activate() called');
  });
};

export const disconnectWebSocket = (): void => {
  try { roundSub?.unsubscribe();  } catch {}
  try { balanceSub?.unsubscribe(); } catch {}
  try { client?.deactivate();      } catch {}
  client      = null;
  roundSub    = null;
  balanceSub  = null;
  isConnected = false;
  console.log('[WS] Disconnected cleanly');
};

export const isWebSocketConnected = (): boolean => isConnected;