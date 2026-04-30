import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet,
  TouchableOpacity, Alert, StatusBar,
  Animated, Easing, Modal, Pressable,
} from 'react-native';
import Svg, { G, Path, Text as SvgText, Circle, Line } from 'react-native-svg';
import Orientation from 'react-native-orientation-locker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { COLORS, FONTS } from '../constants/theme';
import {
  RED_NUMBERS, NUMBER_ROWS,
  type ChipValue, type SelectedBet, type RoundStatus,
} from '../constants/roulette';
import { getCurrentRound, placeBet, logout } from '../services/api';

type Props = NativeStackScreenProps<RootStackParamList, 'Game'>;

const CHIP_VALUES: ChipValue[] = [5, 10, 50, 100, 500];

interface PlacedBet {
  id: string;
  type: SelectedBet['type'];
  value?: number;
  amount: ChipValue;
  timestamp: number;
}

const PHASE_LABEL: Record<RoundStatus, string> = {
  BETTING_OPEN:   'BETTING OPEN',
  BETTING_CLOSED: 'BETS CLOSED',
  SPINNING:       'SPINNING...',
  RESULT_DISPLAY: 'RESULT',
};

const getBetLabel = (bet: SelectedBet | PlacedBet): string => {
  const type  = (bet as any).type;
  const value = (bet as any).value;
  switch (type) {
    case 'NUMBER':   return `#${value}`;
    case 'RED':      return 'Red';
    case 'BLACK':    return 'Black';
    case 'ODD':      return 'Odd';
    case 'EVEN':     return 'Even';
    case '1ST12':    return '1st 12';
    case '2ND12':    return '2nd 12';
    case '3RD12':    return '3rd 12';
    case '1TO18':    return '1 to 18';
    case '19TO36':   return '19 to 36';
    case 'FOUR_BLOCK': return `4-Block`;
    default:         return 'Bet';
  }
};

const CHIP_COLORS = [
  { backgroundColor: 'rgba(128,0,128,0.45)',  borderColor: '#9932CC' },
  { backgroundColor: 'rgba(52,152,219,0.45)', borderColor: '#3498DB' },
  { backgroundColor: 'rgba(46,204,113,0.45)', borderColor: '#2ECC71' },
  { backgroundColor: 'rgba(192,57,43,0.45)',  borderColor: '#DC143C' },
  { backgroundColor: 'rgba(200,200,200,0.45)',borderColor: '#A9A9A9' },
];

// Real European roulette wheel order
const WHEEL_NUMS = [
  0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,
  24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26,
];
const TOTAL_SEGMENTS = WHEEL_NUMS.length; // 37
const WHEEL_SIZE = 130;
const WHEEL_RADIUS = WHEEL_SIZE / 2;
const CENTER = WHEEL_RADIUS;

// ── Build SVG arc path for each segment ──────────────────────────────────────
function polarToXY(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function segmentPath(cx: number, cy: number, outerR: number, innerR: number, startAngle: number, endAngle: number) {
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

// ── Static roulette wheel SVG component ──────────────────────────────────────
const RouletteWheelSVG = React.memo(() => {
  const segAngle = 360 / TOTAL_SEGMENTS;
  const outerR = WHEEL_RADIUS - 2;
  const innerR = WHEEL_RADIUS * 0.32;
  const textR  = WHEEL_RADIUS * 0.72;

  return (
    <Svg width={WHEEL_SIZE} height={WHEEL_SIZE} viewBox={`0 0 ${WHEEL_SIZE} ${WHEEL_SIZE}`}>
      {/* Outer dark rim */}
      <Circle cx={CENTER} cy={CENTER} r={WHEEL_RADIUS - 1} fill="#1a0a00" stroke="#c9a84c" strokeWidth={2} />

      {WHEEL_NUMS.map((n, i) => {
        const startAngle = i * segAngle;
        const endAngle   = (i + 1) * segAngle;
        const midAngle   = startAngle + segAngle / 2;
        const isRed  = RED_NUMBERS.includes(n);
        const isZero = n === 0;
        const segFill = isZero ? '#1A6B3A' : isRed ? '#8B1A10' : '#1a1a1a';

        const path = segmentPath(CENTER, CENTER, outerR, innerR, startAngle, endAngle);
        const tp   = polarToXY(CENTER, CENTER, textR, midAngle);

        // Text rotation: perpendicular to radius, pointing outward
        const textRotation = midAngle - 90;

        return (
          <G key={n}>
            <Path
              d={path}
              fill={segFill}
              stroke="#c9a84c"
              strokeWidth={0.5}
            />
            <SvgText
              x={tp.x}
              y={tp.y}
              fill={isZero ? '#7fff7f' : '#ffffff'}
              fontSize={segAngle > 9 ? 6 : 5.5}
              fontWeight="bold"
              textAnchor="middle"
              alignmentBaseline="middle"
              rotation={textRotation}
              originX={tp.x}
              originY={tp.y}
            >
              {n}
            </SvgText>
          </G>
        );
      })}

      {/* Inner decorative ring */}
      <Circle cx={CENTER} cy={CENTER} r={innerR + 2} fill="none" stroke="#c9a84c" strokeWidth={1.5} />
      <Circle cx={CENTER} cy={CENTER} r={innerR - 1} fill="#2d1a00" stroke="#8B6010" strokeWidth={1} />

      {/* Hub */}
      <Circle cx={CENTER} cy={CENTER} r={10} fill="#c9a84c" stroke="#8B6010" strokeWidth={1} />
      <Circle cx={CENTER} cy={CENTER} r={5}  fill="#8B6010" />
    </Svg>
  );
});

export default function GameScreen({ navigation }: Props) {
  const [roundId,       setRoundId]       = useState<number>(0);
  const [status,        setStatus]        = useState<RoundStatus>('BETTING_OPEN');
  const [secondsLeft,   setSecondsLeft]   = useState<number>(45);
  const [balance,       setBalance]       = useState<number>(0);
  const [lastResults,   setLastResults]   = useState<number[]>([]);
  const [resultNumber,  setResultNumber]  = useState<number | null>(null);

  const [selectedChip,  setSelectedChip]  = useState<ChipValue>(10);
  const [placedBets,    setPlacedBets]    = useState<PlacedBet[]>([]);

  // ── Result popup state ───────────────────────────────────────────────────
  const [showResultPopup,  setShowResultPopup]  = useState(false);
  const [popupNumber,      setPopupNumber]      = useState<number | null>(null);
  const [showWinBanner,    setShowWinBanner]    = useState(false);
  const [winAmount,        setWinAmount]        = useState(0);
  const winBannerAnim = useRef(new Animated.Value(0)).current;
  const popupScale  = useRef(new Animated.Value(0)).current;
  const popupOpacity = useRef(new Animated.Value(0)).current;

  // ── Chip animation refs (one per chip for instant scale bounce) ──────────
  const chipScaleAnims = useRef(CHIP_VALUES.map(() => new Animated.Value(1))).current;

  // ── Wheel animation ──────────────────────────────────────────────────────
  const wheelAngleRef    = useRef<number>(0);
  const wheelCanvasAngle = useRef(new Animated.Value(0)).current;
  const isSpinningRef    = useRef<boolean>(false);

  // ── Round timer refs ─────────────────────────────────────────────────────
  const timerIntervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const roundStatusRef    = useRef<RoundStatus>('BETTING_OPEN');
  const roundSecondsRef   = useRef<number>(45);

  // Lock to landscape
  useEffect(() => {
    Orientation.lockToLandscape();
    return () => Orientation.lockToPortrait();
  }, []);

  // ── Show result popup for 3 seconds ─────────────────────────────────────
  const showResultForSeconds = useCallback((num: number) => {
    setPopupNumber(num);
    setShowResultPopup(true);
    popupScale.setValue(0);
    popupOpacity.setValue(0);

    Animated.parallel([
      Animated.spring(popupScale, {
        toValue: 1,
        tension: 120,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(popupOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(popupScale, {
          toValue: 0.8,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(popupOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowResultPopup(false);
      });
    }, 3000);
  }, [popupScale, popupOpacity]);

  // ── Slow idle spin while betting ─────────────────────────────────────────
  const startIdleSpin = useCallback(() => {
    if (isSpinningRef.current) return;
    wheelCanvasAngle.stopAnimation();
    Animated.loop(
      Animated.timing(wheelCanvasAngle, {
        toValue: wheelAngleRef.current + 360,
        duration: 8000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start(({ finished }) => {
      if (finished) {
        wheelAngleRef.current = (wheelAngleRef.current + 360) % 36000;
      }
    });
  }, [wheelCanvasAngle]);

  const hasBetsOnType = (type: string) =>
    placedBets.some(b => b.type === type);

  // ── Calculate & pay winnings on result ──────────────────────────────────
  const calculateAndPayWinnings = useCallback((result: number) => {
    const isRed   = RED_NUMBERS.includes(result);
    const isBlack = result !== 0 && !isRed;
    const isEven  = result !== 0 && result % 2 === 0;
    const isOdd   = result !== 0 && result % 2 !== 0;
    let totalWin = 0;
    placedBets.forEach(bet => {
      let multiplier = 0;
      switch (bet.type) {
        case 'NUMBER':  if (bet.value === result) multiplier = 36; break;
        case 'RED':     if (isRed)   multiplier = 2; break;
        case 'BLACK':   if (isBlack) multiplier = 2; break;
        case 'EVEN':    if (isEven)  multiplier = 2; break;
        case 'ODD':     if (isOdd)   multiplier = 2; break;
        case '1TO18':   if (result >= 1  && result <= 18) multiplier = 2; break;
        case '19TO36':  if (result >= 19 && result <= 36) multiplier = 2; break;
        case '1ST12':   if (result >= 1  && result <= 12) multiplier = 3; break;
        case '2ND12':   if (result >= 13 && result <= 24) multiplier = 3; break;
        case '3RD12':   if (result >= 25 && result <= 36) multiplier = 3; break;
      }
      totalWin += bet.amount * multiplier;
    });
    if (totalWin > 0) {
      setBalance(prev => prev + totalWin);
      setWinAmount(totalWin);
      setShowWinBanner(true);
      winBannerAnim.setValue(0);
      Animated.sequence([
        Animated.spring(winBannerAnim, { toValue: 1, tension: 120, friction: 7, useNativeDriver: true }),
        Animated.delay(2200),
        Animated.timing(winBannerAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start(() => setShowWinBanner(false));
    }
  }, [placedBets, winBannerAnim]);

  // ── Fast spin for 15s then snap to result ────────────────────────────────
  const startResultSpin = useCallback((result: number) => {
    isSpinningRef.current = true;
    wheelCanvasAngle.stopAnimation();

    const currentDeg = (wheelAngleRef.current % 360 + 360) % 360;
    const segIdx = WHEEL_NUMS.indexOf(result);
    const segAngle = (segIdx / TOTAL_SEGMENTS) * 360;
    const spinsToAdd = 360 * 14;
    const landingOffset = (360 - segAngle + 360) % 360;
    const totalSpin = spinsToAdd + landingOffset;

    // Phase 1: fast spin 12s
    const phase1 = Animated.timing(wheelCanvasAngle, {
      toValue: currentDeg + totalSpin,
      duration: 12000,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });

    // Phase 2: decelerate to exact landing 3s
    const phase2 = Animated.timing(wheelCanvasAngle, {
      toValue: currentDeg + totalSpin + 30,
      duration: 3000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });

    Animated.sequence([phase1, phase2]).start(({ finished }) => {
      if (finished) {
        wheelAngleRef.current = (currentDeg + totalSpin + 30) % 360;
        isSpinningRef.current = false;
        // Show result popup for 3 seconds
        showResultForSeconds(result);
        calculateAndPayWinnings(result);
        setTimeout(() => startIdleSpin(), 3200);
      }
    });
  }, [wheelCanvasAngle, startIdleSpin, showResultForSeconds, calculateAndPayWinnings]);

  // ── Fetch initial round data ─────────────────────────────────────────────
  const initializeRound = useCallback(async () => {
    try {
      const data = await getCurrentRound();
      setRoundId(data.id);
      setStatus(data.status);
      setSecondsLeft(data.secondsLeft);
      setBalance(data.balance);
      setLastResults(data.lastResults ?? []);
      setResultNumber(data.resultNumber);
      roundStatusRef.current = data.status;
      roundSecondsRef.current = data.secondsLeft;
    } catch (err) {
      console.error('Failed to initialize round:', err);
    }
  }, []);

  useEffect(() => {
    initializeRound();
    startIdleSpin();
  }, [initializeRound, startIdleSpin]);

  // ── Main round timer ─────────────────────────────────────────────────────
  useEffect(() => {
    timerIntervalRef.current = setInterval(() => {
      roundSecondsRef.current -= 1;
      setSecondsLeft(roundSecondsRef.current);

      if (roundSecondsRef.current > 15) {
        if (roundStatusRef.current !== 'BETTING_OPEN') {
          roundStatusRef.current = 'BETTING_OPEN';
          setStatus('BETTING_OPEN');
          setPlacedBets([]);
          setResultNumber(null);
          startIdleSpin();
        }
      } else if (roundSecondsRef.current > 0) {
        if (roundStatusRef.current !== 'SPINNING') {
          roundStatusRef.current = 'SPINNING';
          setStatus('SPINNING');
          const newResult = Math.floor(Math.random() * 37);
          setResultNumber(newResult);
          setLastResults(prev => {
            const updated = [...prev, newResult];
            return updated.slice(-10);
          });
          startResultSpin(newResult);
        }
      } else if (roundSecondsRef.current === 0) {
        if (roundStatusRef.current !== 'RESULT_DISPLAY') {
          roundStatusRef.current = 'RESULT_DISPLAY';
          setStatus('RESULT_DISPLAY');
        }
      }

      if (roundSecondsRef.current < -2) {
        roundSecondsRef.current = 45;
        roundStatusRef.current = 'BETTING_OPEN';
        setStatus('BETTING_OPEN');
        setSecondsLeft(45);
        setResultNumber(null);
        setPlacedBets([]);
      }
    }, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [startIdleSpin, startResultSpin]);

  // ── Instant chip select with bounce animation ────────────────────────────
  const handleChipSelect = useCallback((chip: ChipValue, index: number) => {
    setSelectedChip(chip);
    const anim = chipScaleAnims[index];
    anim.setValue(1.25);
    Animated.spring(anim, {
      toValue: 1,
      tension: 200,
      friction: 6,
      useNativeDriver: true,
    }).start();
  }, [chipScaleAnims]);

  // ── Bet validation ───────────────────────────────────────────────────────
  const validateBet = (_chip: ChipValue, _bet: SelectedBet): { valid: boolean; message?: string } => {
    // All chip values are allowed on all bet types — no restrictions
    return { valid: true };
  };

  // ── Place number bet — optimistic UI for instant feedback ────────────────
  const handleNumberClick = useCallback(async (number: number) => {
    if (status !== 'BETTING_OPEN') return;
    if (selectedChip > balance) { Alert.alert('Insufficient Balance'); return; }

    const bet: SelectedBet = { type: 'NUMBER', value: number };
    const v = validateBet(selectedChip, bet);
    if (!v.valid) { Alert.alert('Invalid Bet', v.message); return; }

    // ── Optimistic: add bet & deduct balance immediately ─────────────────
    const tempId = `tmp_${Math.random()}`;
    setPlacedBets(prev => [...prev, {
      id: tempId,
      type: 'NUMBER',
      value: number,
      amount: selectedChip,
      timestamp: Date.now(),
    }]);
    setBalance(prev => prev - selectedChip);

    try {
      const res = await placeBet({
        roundId,
        betType:  bet.type as any,
        betValue: number.toString(),
        amount:   selectedChip,
      });
      // Reconcile balance with server
      setBalance(res.newBalance);
      // Replace temp bet with confirmed one
      setPlacedBets(prev => prev.map(b =>
        b.id === tempId ? { ...b, id: Math.random().toString() } : b
      ));
    } catch (err: any) {
      // Rollback on failure
      setPlacedBets(prev => prev.filter(b => b.id !== tempId));
      setBalance(prev => prev + selectedChip);
      Alert.alert('Error', err.message ?? 'Failed to place bet');
    }
  }, [status, selectedChip, balance, roundId]);

  // ── Place outside / option bet — optimistic UI ───────────────────────────
  const handleOptionBet = useCallback(async (betType: Exclude<SelectedBet['type'], 'NUMBER'>) => {
    if (status !== 'BETTING_OPEN') return;
    if (selectedChip > balance) { Alert.alert('Insufficient Balance'); return; }

    const bet: SelectedBet = { type: betType };
    const v = validateBet(selectedChip, bet);
    if (!v.valid) { Alert.alert('Invalid Bet', v.message); return; }

    const tempId = `tmp_${Math.random()}`;
    setPlacedBets(prev => [...prev, {
      id: tempId,
      type: betType,
      amount: selectedChip,
      timestamp: Date.now(),
    }]);
    setBalance(prev => prev - selectedChip);

    try {
      const res = await placeBet({
        roundId,
        betType:  bet.type as any,
        betValue: undefined,
        amount:   selectedChip,
      });
      setBalance(res.newBalance);
      setPlacedBets(prev => prev.map(b =>
        b.id === tempId ? { ...b, id: Math.random().toString() } : b
      ));
    } catch (err: any) {
      setPlacedBets(prev => prev.filter(b => b.id !== tempId));
      setBalance(prev => prev + selectedChip);
      Alert.alert('Error', err.message ?? 'Failed to place bet');
    }
  }, [status, selectedChip, balance, roundId]);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const isBettingOpen = status === 'BETTING_OPEN';
  const timerColor    = secondsLeft <= 10 ? COLORS.red : '#00FF41';
  const timerPct      = `${Math.max(0, (secondsLeft / 45) * 100)}%` as const;

  const getBetsOnNumber = (num: number) =>
    placedBets.filter(b => b.type === 'NUMBER' && b.value === num);

  const wheelInterpolated = wheelCanvasAngle.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
    extrapolate: 'extend',
  });

  // ── Result popup color ───────────────────────────────────────────────────
  const popupColor = popupNumber === null
    ? '#1A6B3A'
    : popupNumber === 0
    ? '#1A6B3A'
    : RED_NUMBERS.includes(popupNumber)
    ? '#8B1A10'
    : '#111';

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <View style={s.container}>
      <StatusBar hidden />

      <View style={s.mainLayout}>

        {/* ── LEFT: Wheel + Timer ──────────────────────────────────────── */}
        <View style={s.leftSection}>

          {/* Animated Wheel using SVG */}
          <View style={s.wheelOuter}>
            <Animated.View style={[s.wheelBody, { transform: [{ rotate: wheelInterpolated }] }]}>
              <RouletteWheelSVG />
            </Animated.View>
            {/* Ball marker at top */}
            <View style={s.wheelMarker} />
            {/* Gold rim overlay */}
            <View style={s.wheelRim} pointerEvents="none" />
          </View>

          {/* Timer / Status box */}
          <View style={s.timerSection}>
            <Text style={s.phaseText}>{PHASE_LABEL[status]}</Text>
            <Text style={s.helpText}>
              {status === 'BETTING_OPEN'
                ? 'Place your bets!'
                : status === 'SPINNING'
                ? 'Wheel spinning...'
                : 'Round result'}
            </Text>
            <Text style={[s.timerNum, { color: timerColor }]}>
              {status === 'RESULT_DISPLAY' && resultNumber !== null
                ? String(resultNumber)
                : `${String(Math.max(0, secondsLeft)).padStart(2, '0')}s`}
            </Text>
            <View style={s.timerTrack}>
              <View style={[s.timerFill, { width: timerPct }]} />
            </View>
            <Text style={s.timerLabel}>ROUND #{roundId}</Text>
          </View>
        </View>

        {/* ── CENTER: Table ────────────────────────────────────────────── */}
        <View style={s.centerSection}>

          {/* Last 10 Results */}
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

          {/* Number Grid */}
          <View style={s.numberGrid}>
            {/* Zero */}
            <TouchableOpacity
              style={[
                s.zeroBig,
                getBetsOnNumber(0).length > 0 && s.numCellSel,
              ]}
              onPress={() => handleNumberClick(0)}
              disabled={!isBettingOpen}
              activeOpacity={0.6}
            >
              <Text style={s.zeroBigText}>0</Text>
            </TouchableOpacity>

            {/* 1–36 */}
            <View style={s.numbersArea}>
              {NUMBER_ROWS.map((row, ri) => (
                <View key={ri} style={s.numRow}>
                  {row.map(n => {
                    const isRed  = RED_NUMBERS.includes(n);
                    const hasBet = getBetsOnNumber(n).length > 0;
                    return (
                      <TouchableOpacity
                        key={n}
                        style={[
                          s.numCell,
                          isRed ? s.numRed : s.numBlack,
                          hasBet && s.numCellSel,
                        ]}
                        onPress={() => handleNumberClick(n)}
                        disabled={!isBettingOpen}
                        activeOpacity={0.55}
                      >
                        <Text style={s.numText}>{n}</Text>
                        {hasBet && (
                          <View style={s.betDot} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                  {/* 2:1 row button */}
                  <TouchableOpacity
                    style={[s.dozenCell, hasBetsOnType(ri === 0 ? '1ST12' : ri === 1 ? '2ND12' : '3RD12') && s.numCellSel]}
                    onPress={() => handleOptionBet(
                      ri === 0 ? '1ST12' : ri === 1 ? '2ND12' : '3RD12'
                    )}
                    disabled={!isBettingOpen}
                    activeOpacity={0.6}
                  >
                    <Text style={s.dozenText}>2:1</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>

          {/* Dozen labels */}
          <View style={s.dozenLabels}>
            {(['1ST12', '2ND12', '3RD12'] as const).map((t, i) => (
              <TouchableOpacity
                key={t}
                style={[s.dozenLabelBtn, hasBetsOnType(t) && s.numCellSel]}
                onPress={() => handleOptionBet(t)}
                disabled={!isBettingOpen}
                activeOpacity={0.6}
              >
                <Text style={s.dozenLabelText}>
                  {i === 0 ? '1ST 12' : i === 1 ? '2ND 12' : '3RD 12'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Outside bets row */}
          <View style={s.bettingOptions}>
            <TouchableOpacity style={[s.optionBtn, hasBetsOnType('1TO18') && s.numCellSel]} onPress={() => handleOptionBet('1TO18')} disabled={!isBettingOpen} activeOpacity={0.6}>
              <Text style={s.optionBtnText}>1 TO 18</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.optionBtn, hasBetsOnType('EVEN') && s.numCellSel]} onPress={() => handleOptionBet('EVEN')} disabled={!isBettingOpen} activeOpacity={0.6}>
              <Text style={s.optionBtnText}>EVEN</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.redDiamond, hasBetsOnType('RED') && s.numCellSel]} onPress={() => handleOptionBet('RED')} disabled={!isBettingOpen} activeOpacity={0.6}>
              <Text style={s.diamondText}>◆</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.blackDiamond, hasBetsOnType('BLACK') && s.numCellSel]} onPress={() => handleOptionBet('BLACK')} disabled={!isBettingOpen} activeOpacity={0.6}>
              <Text style={s.diamondText}>◆</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.optionBtn, hasBetsOnType('ODD') && s.numCellSel]} onPress={() => handleOptionBet('ODD')} disabled={!isBettingOpen} activeOpacity={0.6}>
              <Text style={s.optionBtnText}>ODD</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.optionBtn, hasBetsOnType('19TO36') && s.numCellSel]} onPress={() => handleOptionBet('19TO36')} disabled={!isBettingOpen} activeOpacity={0.6}>
              <Text style={s.optionBtnText}>19 TO 36</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── RIGHT: Balance + Chips + History ────────────────────────── */}
        <View style={s.rightSection}>
          {/* Balance */}
          <View style={s.balanceBox}>
            <Text style={s.balanceLabel}>BALANCE</Text>
            <Text style={s.balanceAmount}>₹ {balance.toLocaleString('en-IN')}</Text>
          </View>

          {/* Chip selector */}
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
                      CHIP_COLORS[i],
                      selectedChip === v && s.chipBtnActive,
                    ]}
                    onPress={() => handleChipSelect(v, i)}
                    activeOpacity={0.7}
                  >
                    <Text style={s.chipValue}>₹{v}</Text>
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </View>
          </View>

          {/* Bet History button */}
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


      {/* ── WIN BANNER ──────────────────────────────────────────────────── */}
      {showWinBanner && (
        <Animated.View
          style={[
            s.winBanner,
            {
              opacity: winBannerAnim,
              transform: [{ scale: winBannerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }],
            },
          ]}
          pointerEvents="none"
        >
          <Text style={s.winBannerLabel}>🎉 YOU WIN!</Text>
          <Text style={s.winBannerAmount}>+₹{winAmount.toLocaleString('en-IN')}</Text>
        </Animated.View>
      )}

      {/* ── RESULT POPUP OVERLAY ─────────────────────────────────────────── */}
      {showResultPopup && popupNumber !== null && (
        <Animated.View
          style={[
            s.resultOverlay,
            { opacity: popupOpacity },
          ]}
          pointerEvents="none"
        >
          <Animated.View
            style={[
              s.resultPopup,
              { backgroundColor: popupColor, transform: [{ scale: popupScale }] },
            ]}
          >
            {/* Decorative ring */}
            <View style={s.popupRing}>
              <Text style={s.popupLabel}>WINNING NUMBER</Text>
              <Text style={s.popupNumber}>{popupNumber}</Text>
              <Text style={s.popupColorLabel}>
                {popupNumber === 0
                  ? '● GREEN'
                  : RED_NUMBERS.includes(popupNumber)
                  ? '● RED'
                  : '● BLACK'}
              </Text>
            </View>
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
}

// ── Result ball ──────────────────────────────────────────────────────────────
function ResultBall({ number }: { number: number }) {
  const bg = number === 0
    ? COLORS.green
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

// ── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.feltDark,
    flexDirection: 'column',
  },

  mainLayout: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },

  // ── LEFT SECTION ────────────────────────────────────────────────────────
  leftSection: {
    width: 160,
    borderWidth: 1,
    borderColor: COLORS.gold,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  // Wheel
  wheelOuter: {
    width: 130,
    height: 130,
    borderRadius: 65,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  wheelBody: {
    width: 130,
    height: 130,
    borderRadius: 65,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    backgroundColor: '#111',
  },
  wheelRim: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 3,
    borderColor: COLORS.gold,
  },
  wheelMarker: {
    position: 'absolute',
    top: -2,
    width: 8,
    height: 14,
    backgroundColor: '#fff',
    borderRadius: 4,
    zIndex: 20,
  },

  // Timer
  timerSection: {
    width: '100%',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  phaseText: {
    fontSize: 9,
    color: '#00FF41',
    letterSpacing: 1.5,
    fontFamily: FONTS.bodyMed,
  },
  helpText: {
    fontSize: 9,
    color: COLORS.textMuted,
  },
  timerNum: {
    fontFamily: FONTS.display,
    fontSize: 36,
    lineHeight: 40,
    color: '#00FF41',
  },
  timerTrack: {
    width: 90,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  timerFill: {
    height: '100%',
    backgroundColor: '#00FF41',
    borderRadius: 2,
  },
  timerLabel: {
    fontSize: 8,
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },

  // ── CENTER SECTION ───────────────────────────────────────────────────────
  centerSection: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.gold,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: 8,
    gap: 6,
  },

  lastResultsBox: {
    borderWidth: 1,
    borderColor: COLORS.gold,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 8,
  },
  lastResultsLabel: {
    fontSize: 9,
    color: COLORS.gold,
    letterSpacing: 1.5,
    fontFamily: FONTS.bodyMed,
    marginBottom: 4,
  },
  resultsRow: {
    flexDirection: 'row',
    gap: 4,
    flexWrap: 'wrap',
  },
  noResultsText: {
    fontSize: 9,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },

  numberGrid: {
    flexDirection: 'row',
    gap: 4,
    flex: 1,
  },
  zeroBig: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.gold,
    borderRadius: 8,
    backgroundColor: 'rgba(26,107,58,0.4)',
  },
  zeroBigText: {
    color: '#00FF41',
    fontWeight: '900',
    fontSize: 24,
  },
  numbersArea: {
    flex: 1,
    gap: 4,
  },
  numRow: {
    flexDirection: 'row',
    gap: 3,
    flex: 1,
  },
  numCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 3,
    borderColor: 'rgba(255,255,255,0.2)',
    position: 'relative',
  },
  numRed: {
    backgroundColor: 'rgba(192,57,43,0.6)',
  },
  numBlack: {
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  numCellSel: {
    borderWidth: 2.5,
    borderColor: COLORS.gold,
  },
  numText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  // Small gold dot indicator on cells with bets
  betDot: {
    position: 'absolute',
    top: 1,
    right: 1,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.gold,
  },

  dozenCell: {
    width: 45,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(26,107,58,0.4)',
    borderRadius: 3,
  },
  dozenText: {
    color: '#00FF41',
    fontSize: 8,
    fontWeight: '700',
  },

  dozenLabels: {
    flexDirection: 'row',
    gap: 4,
    height: 28,
  },
  dozenLabelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(26,107,58,0.3)',
    borderRadius: 4,
  },
  dozenLabelText: {
    color: '#00FF41',
    fontSize: 9,
    fontWeight: '700',
  },

  bettingOptions: {
    flexDirection: 'row',
    gap: 4,
    height: 40,
  },
  optionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 4,
  },
  optionBtnText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  redDiamond: {
    flex: 0.8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.red,
    backgroundColor: 'rgba(192,57,43,0.5)',
    borderRadius: 4,
  },
  blackDiamond: {
    flex: 0.8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#333',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 4,
  },
  diamondText: {
    color: '#fff',
    fontSize: 16,
  },

  // ── RIGHT SECTION ────────────────────────────────────────────────────────
  rightSection: {
    width: 160,
    borderWidth: 1,
    borderColor: COLORS.gold,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 8,
    gap: 8,
    justifyContent: 'flex-start',
  },

  balanceBox: {
    borderWidth: 1,
    borderColor: COLORS.gold,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 8,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 8,
    color: COLORS.gold,
    letterSpacing: 1,
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 18,
    color: COLORS.gold,
    fontFamily: FONTS.displayBold,
  },

  chipSection: {
    borderWidth: 1,
    borderColor: COLORS.gold,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 6,
  },
  chipSectionTitle: {
    fontSize: 8,
    color: COLORS.gold,
    letterSpacing: 1,
    marginBottom: 6,
    textAlign: 'center',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 4,
  },
  chipBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderStyle: 'solid',
  },
  chipBtnActive: {
    borderColor: COLORS.gold,
    borderWidth: 3,
  },
  chipValue: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
  },

  betHistoryBtn: {
    borderWidth: 2,
    borderColor: COLORS.gold,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 12,
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
    marginTop: 'auto',
  },
  betHistoryBtnLabel: {
    fontSize: 8,
    color: COLORS.gold,
    letterSpacing: 1,
    fontWeight: '700',
  },
  betHistoryBtnText: {
    fontSize: 12,
    color: '#00FF41',
    fontWeight: '700',
  },

  // ── RESULT POPUP ─────────────────────────────────────────────────────────
  resultOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  resultPopup: {
    width: 180,
    height: 180,
    borderRadius: 90,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: COLORS.gold,
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 24,
    elevation: 20,
  },
  popupRing: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    gap: 4,
  },
  popupLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 1.5,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  popupNumber: {
    fontSize: 72,
    color: '#fff',
    fontWeight: '900',
    lineHeight: 80,
  },
  popupColorLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '700',
    letterSpacing: 1,
  },

  // ── WIN BANNER ───────────────────────────────────────────────────────────
  winBanner: {
    position: 'absolute',
    top: '30%',
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.85)',
    borderWidth: 2,
    borderColor: '#FFD700',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 30,
    zIndex: 999,
  },
  winBannerLabel: {
    fontSize: 14,
    color: '#FFD700',
    fontWeight: '900',
    letterSpacing: 2,
  },
  winBannerAmount: {
    fontSize: 28,
    color: '#00FF41',
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 2,
  },
});