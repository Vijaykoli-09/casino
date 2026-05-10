import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import { Storage } from './storage';

const WS_URL = 'ws://192.168.31.42:8080/ws-native';

let client:           Client | null            = null;
let roundSub:         StompSubscription | null = null;
let balanceSub:       StompSubscription | null = null;
let isConnected       = false;
let reconnectAttempts = 0;
const MAX_RECONNECTS  = 10;

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
): Promise<void> => {

  const token = await Storage.getToken();
  if (!token) {
    console.warn('[WS] No token — cannot connect');
    return;
  }

  // Clean up stale client
  if (client) {
    try { client.deactivate(); } catch {}
    client = null;
    isConnected = false;
  }

  console.log('[WS] Creating STOMP client...');

  client = new Client({
    brokerURL: WS_URL,

    connectHeaders: {
      Authorization: `Bearer ${token}`,
      login:    '',
      passcode: '',
    },

    reconnectDelay:    5000,
    heartbeatIncoming: 0,
    heartbeatOutgoing: 0,

    onConnect: (frame) => {
      isConnected       = true;
      reconnectAttempts = 0;
      console.log('[WS] ✅ STOMP Connected! Frame:', frame);
      onConnected?.();

      roundSub = client!.subscribe(
        '/topic/round',
        (message: IMessage) => {
          try {
            onRoundUpdate(JSON.parse(message.body));
          } catch (e) {
            console.warn('[WS] round parse error', e);
          }
        }
      );

      balanceSub = client!.subscribe(
        '/user/queue/balance',
        (message: IMessage) => {
          try {
            onBalanceUpdate(JSON.parse(message.body));
          } catch (e) {
            console.warn('[WS] balance parse error', e);
          }
        }
      );
    },

    onDisconnect: (frame) => {
      isConnected = false;
      console.log('[WS] Disconnected', frame);
    },

    onStompError: (frame) => {
      isConnected = false;
      console.error('[WS] STOMP error body:', frame.body);
      console.error('[WS] STOMP error headers:', JSON.stringify(frame.headers));
      reconnectAttempts++;
    },

    onWebSocketError: (evt) => {
      isConnected = false;
      console.error('[WS] WebSocket error:', JSON.stringify(evt));
    },

    onWebSocketClose: (evt) => {
      isConnected = false;
      console.warn('[WS] WebSocket closed. Code:', evt?.code, 'Reason:', evt?.reason, 'Clean:', evt?.wasClean);
    },

    debug: (str) => {
      console.log('[STOMP DEBUG]', str);
    },
  });

  client.activate();
  console.log('[WS] client.activate() called');
};

export const disconnectWebSocket = (): void => {
  try {
    roundSub?.unsubscribe();
    balanceSub?.unsubscribe();
    client?.deactivate();
  } catch {}
  client            = null;
  roundSub          = null;
  balanceSub        = null;
  isConnected       = false;
  reconnectAttempts = 0;
  console.log('[WS] Disconnected cleanly');
};

export const isWebSocketConnected = (): boolean => isConnected;