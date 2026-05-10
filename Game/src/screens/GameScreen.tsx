import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet,
  TouchableOpacity, Alert, StatusBar,
  Animated, Easing,
} from 'react-native';
import Svg, { G, Path, Text as SvgText, Circle } from 'react-native-svg';
import Orientation from 'react-native-orientation-locker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { COLORS, FONTS } from '../constants/theme';
import { RED_NUMBERS, NUMBER_ROWS } from '../constants/roulette';
import { placeBetsBatch, getBalance, getBetHistory, logout } from '../services/api';
import type { BetItem } from '../services/api';
import {
  connectWebSocket, disconnectWebSocket,
  type RoundPayload, type BalancePayload,
} from '../services/websocket';

type Props = NativeStackScreenProps<RootStackParamList, 'Game'>;
type RoundStatus = 'BETTING_OPEN' | 'SPINNING' | 'RESULT_DISPLAY';
type ChipValue = 5 | 10 | 50 | 100 | 500 | 1000 | 5000;

const CHIP_VALUES: ChipValue[] = [5, 10, 50, 100, 500, 1000, 5000];

interface PlacedBet {
  id:        string;
  betType:   string;
  betValue?: string;
  amount:    number;
}

const PHASE_LABEL: Record<RoundStatus, string> = {
  BETTING_OPEN:   'BETTING OPEN',
  SPINNING:       'SPINNING...',
  RESULT_DISPLAY: 'RESULT',
};

const CHIP_COLORS = [
  { backgroundColor: 'rgba(128,0,128,0.45)',   borderColor: '#9932CC' },
  { backgroundColor: 'rgba(52,152,219,0.45)',  borderColor: '#3498DB' },
  { backgroundColor: 'rgba(46,204,113,0.45)',  borderColor: '#2ECC71' },
  { backgroundColor: 'rgba(192,57,43,0.45)',   borderColor: '#DC143C' },
  { backgroundColor: 'rgba(200,200,200,0.45)', borderColor: '#A9A9A9' },
  { backgroundColor: 'rgba(106,27,154,0.45)',  borderColor: '#7B1FA2' },
  { backgroundColor: 'rgba(183,28,28,0.45)',   borderColor: '#B71C1C' },
];

// Roulette wheel order
const WHEEL_NUMS = [
  0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,
  24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26,
];
const TOTAL_SEGMENTS = WHEEL_NUMS.length;
const WHEEL_SIZE = 130;
const WHEEL_RADIUS = WHEEL_SIZE / 2;
const CENTER = WHEEL_RADIUS;

function polarToXY(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function segmentPath(
  cx: number, cy: number,
  outerR: number, innerR: number,
  startAngle: number, endAngle: number
) {
  const s1 = polarToXY(cx, cy, outerR, startAngle);
  const e1 = polarToXY(cx, cy, outerR, endAngle);
  const s2 = polarToXY(cx, cy, innerR, endAngle);
  const e2 = polarToXY(cx, cy, innerR, startAngle);
  const large = endAngle - startAngle > 180 ? 1 : 0;
  return [
    `M ${s1.x} ${s1.y}`,
    `A ${outerR} ${outerR} 0 ${large} 1 ${e1.x} ${e1.y}`,
    `L ${s2.x} ${s2.y}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${e2.x} ${e2.y}`,
    'Z',
  ].join(' ');
}

const RouletteWheelSVG = React.memo(() => {
  const segAngle = 360 / TOTAL_SEGMENTS;
  const outerR   = WHEEL_RADIUS - 2;
  const innerR   = WHEEL_RADIUS * 0.32;
  const textR    = WHEEL_RADIUS * 0.72;

  return (
    <Svg
      width={WHEEL_SIZE}
      height={WHEEL_SIZE}
      viewBox={`0 0 ${WHEEL_SIZE} ${WHEEL_SIZE}`}
    >
      <Circle
        cx={CENTER} cy={CENTER} r={WHEEL_RADIUS - 1}
        fill="#1a0a00" stroke="#c9a84c" strokeWidth={2}
      />
      {WHEEL_NUMS.map((n, i) => {
        const startAngle = i * segAngle;
        const endAngle   = (i + 1) * segAngle;
        const midAngle   = startAngle + segAngle / 2;
        const isRed      = RED_NUMBERS.includes(n);
        const isZero     = n === 0;
        const segFill    = isZero ? '#1A6B3A' : isRed ? '#8B1A10' : '#1a1a1a';
        const path       = segmentPath(CENTER, CENTER, outerR, innerR, startAngle, endAngle);
        const tp         = polarToXY(CENTER, CENTER, textR, midAngle);

        return (
          <G key={n}>
            <Path d={path} fill={segFill} stroke="#c9a84c" strokeWidth={0.5} />
            <SvgText
              x={tp.x} y={tp.y}
              fill={isZero ? '#7fff7f' : '#ffffff'}
              fontSize={segAngle > 9 ? 6 : 5.5}
              fontWeight="bold"
              textAnchor="middle"
              alignmentBaseline="middle"
              rotation={midAngle - 90}
              originX={tp.x} originY={tp.y}
            >
              {n}
            </SvgText>
          </G>
        );
      })}
      <Circle cx={CENTER} cy={CENTER} r={innerR + 2} fill="none" stroke="#c9a84c" strokeWidth={1.5} />
      <Circle cx={CENTER} cy={CENTER} r={innerR - 1} fill="#2d1a00" stroke="#8B6010" strokeWidth={1} />
      <Circle cx={CENTER} cy={CENTER} r={10} fill="#c9a84c" stroke="#8B6010" strokeWidth={1} />
      <Circle cx={CENTER} cy={CENTER} r={5}  fill="#8B6010" />
    </Svg>
  );
});

export default function GameScreen({ navigation }: Props) {

  // ── Round state (from WebSocket) ──────────────────────────────────────────
  const [roundId,      setRoundId]      = useState(0);
  const [status,       setStatus]       = useState<RoundStatus>('BETTING_OPEN');
  const [secondsLeft,  setSecondsLeft]  = useState(45);
  const [balance,      setBalance]      = useState(0);
  const [lastResults,  setLastResults]  = useState<number[]>([]);
  const [resultNumber, setResultNumber] = useState<number | null>(null);
  const [connected,    setConnected]    = useState(false);

  // ── Bet state ──────────────────────────────────────────────────────────────
  const [selectedChip, setSelectedChip] = useState<ChipValue>(10);
  const [placedBets,   setPlacedBets]   = useState<PlacedBet[]>([]);
  const [submitting,   setSubmitting]   = useState(false);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [showResultPopup, setShowResultPopup] = useState(false);
  const [popupNumber,     setPopupNumber]     = useState<number | null>(null);
  const [showWinBanner,   setShowWinBanner]   = useState(false);
  const [winAmount,       setWinAmount]       = useState(0);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const prevStatus       = useRef<RoundStatus>('BETTING_OPEN');
  const betsRef          = useRef<PlacedBet[]>([]);
  const autoSubmitDone   = useRef(false);

  // ── Animations ─────────────────────────────────────────────────────────────
  const chipScaleAnims = useRef(CHIP_VALUES.map(() => new Animated.Value(1))).current;
  const wheelAngleRef  = useRef(0);
  const wheelAnim      = useRef(new Animated.Value(0)).current;
  const isSpinningRef  = useRef(false);
  const winBannerAnim  = useRef(new Animated.Value(0)).current;
  const popupScale     = useRef(new Animated.Value(0)).current;
  const popupOpacity   = useRef(new Animated.Value(0)).current;

  // Keep betsRef in sync with placedBets state
  useEffect(() => { betsRef.current = placedBets; }, [placedBets]);

  // ── Orientation ────────────────────────────────────────────────────────────
  useEffect(() => {
    Orientation.lockToLandscape();
    return () => Orientation.lockToPortrait();
  }, []);

  // ── WebSocket connect ──────────────────────────────────────────────────────
  useEffect(() => {
    const onRound = (data: RoundPayload) => {
      setRoundId(data.id);
      setStatus(data.status as RoundStatus);
      setSecondsLeft(data.secondsLeft);
      if (data.lastResults) setLastResults(data.lastResults);
      if (data.resultNumber !== null && data.resultNumber !== undefined) {
        setResultNumber(data.resultNumber);
      }
      if (data.balance !== null && data.balance !== undefined) {
        setBalance(data.balance);
      }
      setConnected(true);
    };

    const onBalance = (data: BalancePayload) => {
      setBalance(data.balance);
    };

connectWebSocket(onRound, onBalance, () => {
  setConnected(true);
});

    return () => { disconnectWebSocket(); };
  }, []);

  const loadBalance = async () => {
    try {
      const res = await getBalance();
      setBalance(res.balance);
    } catch {}
  };

  // ── Phase change detection ─────────────────────────────────────────────────
  useEffect(() => {
    if (status === prevStatus.current) return;

    // BETTING_OPEN → new round started
    if (status === 'BETTING_OPEN') {
      setPlacedBets([]);
      setResultNumber(null);
      autoSubmitDone.current = false;
      startIdleSpin();
    }

    // SPINNING → auto-submit all pending bets
    if (status === 'SPINNING') {
      startFastSpin();
      autoSubmitBets();
    }

    // RESULT_DISPLAY → show overlay
    if (status === 'RESULT_DISPLAY' && resultNumber !== null) {
      showResultForSeconds(resultNumber);
      showWinBannerIfWon(resultNumber);
    }

    prevStatus.current = status;
  }, [status, resultNumber]);

  // ── Auto-submit bets when spinning starts ──────────────────────────────────
  const autoSubmitBets = useCallback(async () => {
    if (autoSubmitDone.current) return;
    autoSubmitDone.current = true;

    const currentBets = betsRef.current;
    if (currentBets.length === 0) return;

    setSubmitting(true);
    try {
      const payload = currentBets.map(b => ({
        roundId:  roundId,
        betType:  b.betType,
        betValue: b.betValue,
        amount:   b.amount,
      }));

      const res = await placeBetsBatch(payload);
      setBalance(res.newBalance);

    } catch (err: any) {
      // If batch fails — refund locally
      const totalRefund = betsRef.current.reduce((s, b) => s + b.amount, 0);
      setBalance(prev => prev + totalRefund);
      setPlacedBets([]);
      Alert.alert('Bets Failed', err.message ?? 'Could not place bets');
    } finally {
      setSubmitting(false);
    }
  }, [roundId]);

  // ── Win banner ─────────────────────────────────────────────────────────────
  const showWinBannerIfWon = useCallback((result: number) => {
    const isRed   = RED_NUMBERS.includes(result);
    const isBlack = result !== 0 && !isRed;
    const isEven  = result !== 0 && result % 2 === 0;
    const isOdd   = result !== 0 && result % 2 !== 0;

    let totalWin = 0;
    betsRef.current.forEach(bet => {
      let multiplier = 0;
      switch (bet.betType) {
        case 'NUMBER':     if (Number(bet.betValue) === result) multiplier = 36; break;
        case 'RED':        if (isRed)   multiplier = 2; break;
        case 'BLACK':      if (isBlack) multiplier = 2; break;
        case 'EVEN':       if (isEven)  multiplier = 2; break;
        case 'ODD':        if (isOdd)   multiplier = 2; break;
        case 'RANGE_LOW':  if (result >= 1  && result <= 18) multiplier = 2; break;
        case 'RANGE_HIGH': if (result >= 19 && result <= 36) multiplier = 2; break;
        case 'DOZEN_1':    if (result >= 1  && result <= 12) multiplier = 3; break;
        case 'DOZEN_2':    if (result >= 13 && result <= 24) multiplier = 3; break;
        case 'DOZEN_3':    if (result >= 25 && result <= 36) multiplier = 3; break;
      }
      totalWin += bet.amount * multiplier;
    });

    if (totalWin > 0) {
      setWinAmount(totalWin);
      setShowWinBanner(true);
      winBannerAnim.setValue(0);
      Animated.sequence([
        Animated.spring(winBannerAnim, { toValue: 1, tension: 120, friction: 7, useNativeDriver: true }),
        Animated.delay(2200),
        Animated.timing(winBannerAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start(() => setShowWinBanner(false));
    }
  }, [winBannerAnim]);

  // ── Result popup ───────────────────────────────────────────────────────────
  const showResultForSeconds = useCallback((num: number) => {
    setPopupNumber(num);
    setShowResultPopup(true);
    popupScale.setValue(0);
    popupOpacity.setValue(0);

    Animated.parallel([
      Animated.spring(popupScale,   { toValue: 1, tension: 120, friction: 7, useNativeDriver: true }),
      Animated.timing(popupOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(popupScale,   { toValue: 0.8, duration: 300, useNativeDriver: true }),
        Animated.timing(popupOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => setShowResultPopup(false));
    }, 5000);
  }, [popupScale, popupOpacity]);

  // ── Wheel animations ───────────────────────────────────────────────────────
  const startIdleSpin = useCallback(() => {
    if (isSpinningRef.current) return;
    wheelAnim.stopAnimation();
    Animated.loop(
      Animated.timing(wheelAnim, {
        toValue: wheelAngleRef.current + 360,
        duration: 8000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start(({ finished }) => {
      if (finished) wheelAngleRef.current = (wheelAngleRef.current + 360) % 36000;
    });
  }, [wheelAnim]);

  const startFastSpin = useCallback(() => {
    isSpinningRef.current = true;
    wheelAnim.stopAnimation();
    const currentDeg = (wheelAngleRef.current % 360 + 360) % 360;
    Animated.timing(wheelAnim, {
      toValue: currentDeg + 360 * 15,
      duration: 10000,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        wheelAngleRef.current = (currentDeg + 360 * 15) % 36000;
        isSpinningRef.current = false;
        startIdleSpin();
      }
    });
  }, [wheelAnim, startIdleSpin]);

  // ── Bet placement ──────────────────────────────────────────────────────────
  const addBet = useCallback((betType: string, betValue?: string) => {
    if (status !== 'BETTING_OPEN') return;
    if (selectedChip > balance) {
      Alert.alert('Insufficient Balance');
      return;
    }

    // Deduct optimistically
    setBalance(prev => prev - selectedChip);
    setPlacedBets(prev => [...prev, {
      id:       `${betType}_${betValue ?? ''}_${Date.now()}`,
      betType,
      betValue,
      amount:   selectedChip,
    }]);
  }, [status, selectedChip, balance]);

  const removeBet = useCallback((id: string) => {
    setPlacedBets(prev => {
      const bet = prev.find(b => b.id === id);
      if (bet) setBalance(b => b + bet.amount);
      return prev.filter(b => b.id !== id);
    });
  }, []);

  // Long-press refs per cell
  const longPressTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const startLongPress = (betType: string, betValue?: string) => {
    const key = `${betType}_${betValue ?? ''}`;
    longPressTimers.current[key] = setTimeout(() => {
      // Remove LAST bet of this type
      setPlacedBets(prev => {
        const idx = [...prev].reverse().findIndex(
          b => b.betType === betType && b.betValue === betValue
        );
        if (idx === -1) return prev;
        const realIdx = prev.length - 1 - idx;
        const bet = prev[realIdx];
        setBalance(b => b + bet.amount);
        return prev.filter((_, i) => i !== realIdx);
      });
    }, 3000);
  };

  const cancelLongPress = (betType: string, betValue?: string) => {
    const key = `${betType}_${betValue ?? ''}`;
    if (longPressTimers.current[key]) {
      clearTimeout(longPressTimers.current[key]);
      delete longPressTimers.current[key];
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const isBettingOpen = status === 'BETTING_OPEN';
  const hasBetOnType  = (betType: string, betValue?: string) =>
    placedBets.some(b => b.betType === betType && b.betValue === betValue);
  const betCountOnCell = (betType: string, betValue?: string) =>
    placedBets.filter(b => b.betType === betType && b.betValue === betValue).length;

  const timerColor = secondsLeft <= 10 ? COLORS.red : '#00FF41';
  const timerPct   = `${Math.max(0, (secondsLeft / 45) * 100)}%` as const;

  const wheelInterpolated = wheelAnim.interpolate({
    inputRange:  [0, 360],
    outputRange: ['0deg', '360deg'],
    extrapolate: 'extend',
  });

  const popupColor = popupNumber === null ? '#1A6B3A'
    : popupNumber === 0 ? '#1A6B3A'
    : RED_NUMBERS.includes(popupNumber) ? '#8B1A10'
    : '#111';

  const handleExit = async () => {
    disconnectWebSocket();
    await logout();
    navigation.replace('Login');
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={s.container}>
      <StatusBar hidden />

      <View style={s.mainLayout}>

        {/* ── LEFT: Wheel + Timer ───────────────────────────────────────── */}
        <View style={s.leftSection}>

          <View style={s.wheelOuter}>
            <Animated.View style={[s.wheelBody, { transform: [{ rotate: wheelInterpolated }] }]}>
              <RouletteWheelSVG />
            </Animated.View>
            <View style={s.wheelMarker} />
            <View style={s.wheelRim} pointerEvents="none" />
          </View>

          {/* Connection dot */}
          <View style={s.connRow}>
            <View style={[s.connDot, connected ? s.connGreen : s.connRed]} />
            <Text style={s.connText}>{connected ? 'LIVE' : 'CONNECTING...'}</Text>
          </View>

          <View style={s.timerSection}>
            <Text style={s.phaseText}>{PHASE_LABEL[status]}</Text>
            <Text style={[s.timerNum, { color: timerColor }]}>
              {status === 'RESULT_DISPLAY' && resultNumber !== null
                ? String(resultNumber)
                : `${String(Math.max(0, secondsLeft)).padStart(2, '0')}s`}
            </Text>
            <View style={s.timerTrack}>
              <View style={[s.timerFill, { width: timerPct }]} />
            </View>
            <Text style={s.timerLabel}>ROUND #{roundId}</Text>

            {/* Submitting indicator */}
            {submitting && (
              <Text style={s.submittingText}>Submitting bets...</Text>
            )}
          </View>

          {/* Exit button */}
          <TouchableOpacity style={s.exitBtn} onPress={handleExit}>
            <Text style={s.exitBtnText}>EXIT</Text>
          </TouchableOpacity>
        </View>

        {/* ── CENTER: Table ─────────────────────────────────────────────── */}
        <View style={s.centerSection}>

          {/* Last results */}
          <View style={s.lastResultsBox}>
            <Text style={s.lastResultsLabel}>LAST 10 RESULTS</Text>
            <View style={s.resultsRow}>
              {lastResults.slice(-10).map((n, i) => (
                <ResultBall key={i} number={n} />
              ))}
              {lastResults.length === 0 && (
                <Text style={s.noResultsText}>No results yet</Text>
              )}
            </View>
          </View>

          {/* Number grid */}
          <View style={s.numberGrid}>
            {/* Zero */}
            <TouchableOpacity
              style={[s.zeroBig, hasBetOnType('NUMBER','0') && s.numCellSel]}
              onPress={() => addBet('NUMBER', '0')}
              onPressIn={() => startLongPress('NUMBER', '0')}
              onPressOut={() => cancelLongPress('NUMBER', '0')}
              disabled={!isBettingOpen}
              activeOpacity={0.6}
            >
              <Text style={s.zeroBigText}>0</Text>
              {betCountOnCell('NUMBER','0') > 0 && (
                <View style={s.betDot} />
              )}
            </TouchableOpacity>

            {/* 1–36 */}
            <View style={s.numbersArea}>
              {NUMBER_ROWS.map((row, ri) => (
                <View key={ri} style={s.numRow}>
                  {row.map(n => {
                    const isRed  = RED_NUMBERS.includes(n);
                    const hasBet = hasBetOnType('NUMBER', String(n));
                    const rowBetType = ri === 0 ? 'ROW1' : ri === 1 ? 'ROW2' : 'ROW3';
                    return (
                      <TouchableOpacity
                        key={n}
                        style={[s.numCell, isRed ? s.numRed : s.numBlack, hasBet && s.numCellSel]}
                        onPress={() => addBet('NUMBER', String(n))}
                        onPressIn={() => startLongPress('NUMBER', String(n))}
                        onPressOut={() => cancelLongPress('NUMBER', String(n))}
                        disabled={!isBettingOpen}
                        activeOpacity={0.55}
                      >
                        <Text style={s.numText}>{n}</Text>
                        {hasBet && <View style={s.betDot} />}
                      </TouchableOpacity>
                    );
                  })}
                  {/* 2:1 */}
                  <TouchableOpacity
                    style={[
                      s.dozenCell,
                      hasBetOnType(ri === 0 ? 'ROW1' : ri === 1 ? 'ROW2' : 'ROW3') && s.numCellSel,
                    ]}
                    onPress={() => addBet(ri === 0 ? 'ROW1' : ri === 1 ? 'ROW2' : 'ROW3')}
                    onPressIn={() => startLongPress(ri === 0 ? 'ROW1' : ri === 1 ? 'ROW2' : 'ROW3')}
                    onPressOut={() => cancelLongPress(ri === 0 ? 'ROW1' : ri === 1 ? 'ROW2' : 'ROW3')}
                    disabled={!isBettingOpen}
                    activeOpacity={0.6}
                  >
                    <Text style={s.dozenText}>2:1</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>

          {/* Dozen row */}
          <View style={s.dozenLabels}>
            {(['DOZEN_1','DOZEN_2','DOZEN_3'] as const).map((t, i) => (
              <TouchableOpacity
                key={t}
                style={[s.dozenLabelBtn, hasBetOnType(t) && s.numCellSel]}
                onPress={() => addBet(t)}
                onPressIn={() => startLongPress(t)}
                onPressOut={() => cancelLongPress(t)}
                disabled={!isBettingOpen}
                activeOpacity={0.6}
              >
                <Text style={s.dozenLabelText}>
                  {i === 0 ? '1ST 12' : i === 1 ? '2ND 12' : '3RD 12'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Outside bets */}
          <View style={s.bettingOptions}>
            {[
              { t:'RANGE_LOW',  l:'1 TO 18' },
              { t:'EVEN',       l:'EVEN' },
              { t:'RED',        l:'◆', extra:'red' },
              { t:'BLACK',      l:'◆', extra:'blk' },
              { t:'ODD',        l:'ODD' },
              { t:'RANGE_HIGH', l:'19 TO 36' },
            ].map(({t,l,extra}) => (
              <TouchableOpacity
                key={t}
                style={[
                  extra === 'red' ? s.redDiamond : extra === 'blk' ? s.blackDiamond : s.optionBtn,
                  hasBetOnType(t) && s.numCellSel,
                ]}
                onPress={() => addBet(t)}
                onPressIn={() => startLongPress(t)}
                onPressOut={() => cancelLongPress(t)}
                disabled={!isBettingOpen}
                activeOpacity={0.6}
              >
                <Text style={[
                  s.optionBtnText,
                  extra === 'red' && { color:'#ff4444', fontSize: 16 },
                  extra === 'blk' && { color:'#888', fontSize: 16 },
                ]}>{l}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── RIGHT: Balance + Chips + History ──────────────────────────── */}
        <View style={s.rightSection}>

          <View style={s.balanceBox}>
            <Text style={s.balanceLabel}>BALANCE</Text>
            <Text style={s.balanceAmount}>
              ₹ {Number(balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </Text>
          </View>

          {/* Active bets summary */}
          {placedBets.length > 0 && (
            <View style={s.activeBetsSummary}>
              <Text style={s.activeBetsLabel}>
                {placedBets.length} BET{placedBets.length > 1 ? 'S' : ''} PLACED
              </Text>
              <Text style={s.activeBetsTotal}>
                ₹{placedBets.reduce((s, b) => s + b.amount, 0).toLocaleString()}
              </Text>
              <Text style={s.activeBetsHint}>
                Long-hold any cell to remove
              </Text>
            </View>
          )}

          <View style={s.chipSection}>
            <Text style={s.chipSectionTitle}>CHOOSE CHIP</Text>
            <View style={s.chipGrid}>
              {CHIP_VALUES.map((v, i) => (
                <Animated.View
                  key={v}
                  style={{ transform: [{ scale: chipScaleAnims[i] }] }}
                >
                  <TouchableOpacity
                    style={[
                      s.chipBtn,
                      CHIP_COLORS[i] ?? CHIP_COLORS[0],
                      selectedChip === v && s.chipBtnActive,
                      !isBettingOpen && { opacity: 0.4 },
                    ]}
                    onPress={() => {
                      setSelectedChip(v);
                      const anim = chipScaleAnims[i];
                      anim.setValue(1.25);
                      Animated.spring(anim, {
                        toValue: 1, tension: 200,
                        friction: 6, useNativeDriver: true,
                      }).start();
                    }}
                    disabled={!isBettingOpen}
                    activeOpacity={0.7}
                  >
                    <Text style={s.chipValue}>
                      {v >= 1000 ? `${v/1000}K` : `₹${v}`}
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={s.betHistoryBtn}
            onPress={() => navigation.navigate('BetHistory')}
            activeOpacity={0.7}
          >
            <Text style={s.betHistoryBtnLabel}>LAST 10 BETS</Text>
            <Text style={s.betHistoryBtnText}>📊 HISTORY</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── WIN BANNER ────────────────────────────────────────────────────── */}
      {showWinBanner && (
        <Animated.View
          style={[s.winBanner, {
            opacity: winBannerAnim,
            transform: [{
              scale: winBannerAnim.interpolate({
                inputRange: [0,1], outputRange: [0.7,1],
              }),
            }],
          }]}
          pointerEvents="none"
        >
          <Text style={s.winBannerLabel}>🎉 YOU WIN!</Text>
          <Text style={s.winBannerAmount}>+₹{winAmount.toLocaleString('en-IN')}</Text>
        </Animated.View>
      )}

      {/* ── RESULT POPUP ──────────────────────────────────────────────────── */}
      {showResultPopup && popupNumber !== null && (
        <Animated.View
          style={[s.resultOverlay, { opacity: popupOpacity }]}
          pointerEvents="none"
        >
          <Animated.View
            style={[
              s.resultPopup,
              { backgroundColor: popupColor, transform: [{ scale: popupScale }] },
            ]}
          >
            <View style={s.popupRing}>
              <Text style={s.popupLabel}>WINNING NUMBER</Text>
              <Text style={s.popupNumber}>{popupNumber}</Text>
              <Text style={s.popupColorLabel}>
                {popupNumber === 0 ? '● GREEN'
                  : RED_NUMBERS.includes(popupNumber) ? '● RED'
                  : '● BLACK'}
              </Text>
            </View>
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
}

function ResultBall({ number }: { number: number }) {
  const bg = number === 0 ? COLORS.green
    : RED_NUMBERS.includes(number) ? COLORS.red : '#222';
  return (
    <View style={[rb.ball, { backgroundColor: bg }]}>
      <Text style={rb.text}>{number}</Text>
    </View>
  );
}

const rb = StyleSheet.create({
  ball: {
    width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.gold,
  },
  text: { color: '#fff', fontSize: 8, fontWeight: '700' },
});

const s = StyleSheet.create({
  container:        { flex: 1, backgroundColor: COLORS.feltDark, flexDirection: 'column' },
  mainLayout:       { flex: 1, flexDirection: 'row', gap: 8, padding: 8, backgroundColor: 'rgba(0,0,0,0.3)' },

  // LEFT
  leftSection:      { width: 160, borderWidth: 1, borderColor: COLORS.gold, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.3)', padding: 10, alignItems: 'center', justifyContent: 'space-between' },
  wheelOuter:       { width: 130, height: 130, borderRadius: 65, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  wheelBody:        { width: 130, height: 130, borderRadius: 65, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: '#111' },
  wheelRim:         { position: 'absolute', width: 130, height: 130, borderRadius: 65, borderWidth: 3, borderColor: COLORS.gold },
  wheelMarker:      { position: 'absolute', top: -2, width: 8, height: 14, backgroundColor: '#fff', borderRadius: 4, zIndex: 20 },
  connRow:          { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  connDot:          { width: 6, height: 6, borderRadius: 3 },
  connGreen:        { backgroundColor: '#4CAF50' },
  connRed:          { backgroundColor: '#f44336' },
  connText:         { fontSize: 8, color: COLORS.textMuted, letterSpacing: 1 },
  timerSection:     { width: '100%', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.5)', padding: 8, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  phaseText:        { fontSize: 9, color: '#00FF41', letterSpacing: 1.5, fontFamily: FONTS.bodyMed },
  timerNum:         { fontFamily: FONTS.display, fontSize: 32, lineHeight: 36, color: '#00FF41' },
  timerTrack:       { width: 90, height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' },
  timerFill:        { height: '100%', backgroundColor: '#00FF41', borderRadius: 2 },
  timerLabel:       { fontSize: 8, color: COLORS.textMuted, letterSpacing: 0.5 },
  submittingText:   { fontSize: 8, color: COLORS.gold, letterSpacing: 0.5, marginTop: 2 },
  exitBtn:          { paddingHorizontal: 16, paddingVertical: 6, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.2)', borderRadius: 6 },
  exitBtnText:      { fontSize: 10, color: COLORS.textMuted, letterSpacing: 1 },

  // CENTER
  centerSection:    { flex: 1, borderWidth: 1, borderColor: COLORS.gold, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.2)', padding: 8, gap: 5 },
  lastResultsBox:   { borderWidth: 1, borderColor: COLORS.gold, borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.4)', padding: 6 },
  lastResultsLabel: { fontSize: 9, color: COLORS.gold, letterSpacing: 1.5, fontFamily: FONTS.bodyMed, marginBottom: 4 },
  resultsRow:       { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  noResultsText:    { fontSize: 9, color: COLORS.textMuted, fontStyle: 'italic' },
  numberGrid:       { flexDirection: 'row', gap: 4, flex: 1 },
  zeroBig:          { width: 54, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.gold, borderRadius: 8, backgroundColor: 'rgba(26,107,58,0.4)', position: 'relative' },
  zeroBigText:      { color: '#00FF41', fontWeight: '900', fontSize: 22 },
  numbersArea:      { flex: 1, gap: 3 },
  numRow:           { flexDirection: 'row', gap: 3, flex: 1 },
  numCell:          { flex: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 3, borderColor: 'rgba(255,255,255,0.2)', position: 'relative' },
  numRed:           { backgroundColor: 'rgba(192,57,43,0.6)' },
  numBlack:         { backgroundColor: 'rgba(0,0,0,0.4)' },
  numCellSel:       { borderWidth: 2.5, borderColor: COLORS.gold },
  numText:          { color: '#fff', fontSize: 9, fontWeight: '700' },
  betDot:           { position: 'absolute', top: 1, right: 1, width: 5, height: 5, borderRadius: 2.5, backgroundColor: COLORS.gold },
  dozenCell:        { width: 42, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(26,107,58,0.4)', borderRadius: 3 },
  dozenText:        { color: '#00FF41', fontSize: 8, fontWeight: '700' },
  dozenLabels:      { flexDirection: 'row', gap: 4, height: 26 },
  dozenLabelBtn:    { flex: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(26,107,58,0.3)', borderRadius: 4 },
  dozenLabelText:   { color: '#00FF41', fontSize: 9, fontWeight: '700' },
  bettingOptions:   { flexDirection: 'row', gap: 3, height: 38 },
  optionBtn:        { flex: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 4 },
  optionBtnText:    { color: '#fff', fontSize: 8, fontWeight: '700', letterSpacing: 0.5 },
  redDiamond:       { flex: 0.8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.red, backgroundColor: 'rgba(192,57,43,0.5)', borderRadius: 4 },
  blackDiamond:     { flex: 0.8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#333', backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 4 },

  // RIGHT
  rightSection:     { width: 160, borderWidth: 1, borderColor: COLORS.gold, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.3)', padding: 8, gap: 8 },
  balanceBox:       { borderWidth: 1, borderColor: COLORS.gold, borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.5)', padding: 8, alignItems: 'center' },
  balanceLabel:     { fontSize: 8, color: COLORS.gold, letterSpacing: 1, marginBottom: 3 },
  balanceAmount:    { fontSize: 16, color: COLORS.gold, fontFamily: FONTS.displayBold },
  activeBetsSummary:{ backgroundColor: 'rgba(201,168,76,0.08)', borderWidth: 0.5, borderColor: 'rgba(201,168,76,0.3)', borderRadius: 6, padding: 6, alignItems: 'center', gap: 2 },
  activeBetsLabel:  { fontSize: 9, color: COLORS.gold, fontFamily: FONTS.bodyMed, letterSpacing: 1 },
  activeBetsTotal:  { fontSize: 14, color: '#fff', fontFamily: FONTS.displayBold },
  activeBetsHint:   { fontSize: 8, color: COLORS.textMuted, textAlign: 'center' },
  chipSection:      { borderWidth: 1, borderColor: COLORS.gold, borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.4)', padding: 6 },
  chipSectionTitle: { fontSize: 8, color: COLORS.gold, letterSpacing: 1, marginBottom: 5, textAlign: 'center' },
  chipGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  chipBtn:          { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  chipBtnActive:    { borderColor: COLORS.gold, borderWidth: 3 },
  chipValue:        { fontSize: 8, fontWeight: '700', color: '#fff' },
  betHistoryBtn:    { borderWidth: 2, borderColor: COLORS.gold, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.6)', padding: 10, alignItems: 'center', gap: 4, marginTop: 'auto' },
  betHistoryBtnLabel:{ fontSize: 8, color: COLORS.gold, letterSpacing: 1, fontWeight: '700' },
  betHistoryBtnText: { fontSize: 12, color: '#00FF41', fontWeight: '700' },

  // RESULT POPUP
  resultOverlay:    { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  resultPopup:      { width: 180, height: 180, borderRadius: 90, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: COLORS.gold, elevation: 20 },
  popupRing:        { width: 160, height: 160, borderRadius: 80, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', gap: 4 },
  popupLabel:       { fontSize: 9, color: 'rgba(255,255,255,0.8)', letterSpacing: 1.5, fontWeight: '700' },
  popupNumber:      { fontSize: 72, color: '#fff', fontWeight: '900', lineHeight: 80 },
  popupColorLabel:  { fontSize: 11, color: 'rgba(255,255,255,0.9)', fontWeight: '700', letterSpacing: 1 },

  // WIN BANNER
  winBanner:        { position: 'absolute', top: '30%', alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.85)', borderWidth: 2, borderColor: '#FFD700', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 32, alignItems: 'center', elevation: 30, zIndex: 999 },
  winBannerLabel:   { fontSize: 14, color: '#FFD700', fontWeight: '900', letterSpacing: 2 },
  winBannerAmount:  { fontSize: 28, color: '#00FF41', fontWeight: '900', letterSpacing: 1, marginTop: 2 },
});