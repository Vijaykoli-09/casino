import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated,
  Easing, StatusBar, Dimensions,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { COLORS, FONTS } from '../constants/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>;

export default function SplashScreen({ navigation }: Props) {
  const rotation  = useRef(new Animated.Value(0)).current;
  const ring1Op   = useRef(new Animated.Value(0.3)).current;
  const ring2Op   = useRef(new Animated.Value(0.3)).current;
  const ring3Op   = useRef(new Animated.Value(0.3)).current;
  const dot1Scale = useRef(new Animated.Value(0.8)).current;
  const dot2Scale = useRef(new Animated.Value(0.8)).current;
  const dot3Scale = useRef(new Animated.Value(0.8)).current;

  const pulseRing = (anim: Animated.Value, delay: number) =>
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 0.85, duration: 1500, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.2,  duration: 1500, useNativeDriver: true }),
      ])
    ).start();

  const pulseDot = (anim: Animated.Value, delay: number) =>
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1.3, duration: 400, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.8, duration: 400, useNativeDriver: true }),
      ])
    ).start();

  useEffect(() => {
    // Wheel spin
    Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 8000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Ring pulses
    pulseRing(ring1Op, 0);
    pulseRing(ring2Op, 500);
    pulseRing(ring3Op, 1000);

    // Dot bounces
    pulseDot(dot1Scale, 0);
    pulseDot(dot2Scale, 200);
    pulseDot(dot3Scale, 400);

    // Navigate after 3s
    const t = setTimeout(() => navigation.replace('Login'), 3000);
    return () => clearTimeout(t);
  }, []);

  const spin = rotation.interpolate({
    inputRange:  [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.black} />

      <Animated.View style={[s.ring, s.ring1, { opacity: ring1Op }]} />
      <Animated.View style={[s.ring, s.ring2, { opacity: ring2Op }]} />
      <Animated.View style={[s.ring, s.ring3, { opacity: ring3Op }]} />

      <Animated.View style={{ transform: [{ rotate: spin }], marginBottom: 24 }}>
        <WheelIcon size={90} />
      </Animated.View>

      <Text style={s.title}>ROYALE</Text>
      <View style={s.divider} />
      <Text style={s.subtitle}>PRIVATE CASINO</Text>

      <View style={s.dotsRow}>
        {[dot1Scale, dot2Scale, dot3Scale].map((sc, i) => (
          <Animated.View key={i} style={[s.dot, { transform: [{ scale: sc }] }]} />
        ))}
      </View>
    </View>
  );
}

// ── Shared wheel icon (reused in Login too) ─────────────────────────────────
export function WheelIcon({ size = 80 }: { size?: number }) {
  const r = size / 2;
  const spoke = size * 0.18;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Outer ring */}
      <View style={{
        position: 'absolute',
        width: size, height: size,
        borderRadius: r,
        borderWidth: 1.5, borderColor: COLORS.gold, opacity: 0.6,
      }} />
      {/* Inner ring */}
      <View style={{
        position: 'absolute',
        width: size * 0.72, height: size * 0.72,
        borderRadius: r * 0.72,
        borderWidth: 1, borderColor: COLORS.gold, opacity: 0.35,
      }} />
      {/* Spokes */}
      {[0, 45, 90, 135].map(angle => (
        <View key={angle} style={{
          position: 'absolute',
          width: 2, height: size * 0.78,
          backgroundColor: COLORS.gold,
          opacity: 0.5,
          borderRadius: 1,
          transform: [{ rotate: `${angle}deg` }],
        }} />
      ))}
      {/* Center dot */}
      <View style={{
        width: size * 0.18, height: size * 0.18,
        borderRadius: size * 0.09,
        backgroundColor: COLORS.gold, opacity: 0.9,
      }} />
      {/* Colored spoke tips */}
      {[
        { top: 1, left: r - 4, bg: COLORS.red },
        { bottom: 1, left: r - 4, bg: '#333' },
        { top: r - 4, left: 1, bg: COLORS.red },
        { top: r - 4, right: 1, bg: '#333' },
      ].map((pos, i) => (
        <View key={i} style={{
          position: 'absolute', width: 8, height: 8,
          borderRadius: 4, backgroundColor: pos.bg, ...pos,
        }} />
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.gold,
  },
  ring1: { width: 280, height: 280 },
  ring2: { width: 200, height: 200 },
  ring3: { width: 130, height: 130 },
  title: {
    fontFamily: FONTS.display,
    fontSize: 38,
    color: COLORS.gold,
    letterSpacing: 5,
  },
  divider: {
    width: 55, height: 1,
    backgroundColor: COLORS.gold,
    opacity: 0.5,
    marginVertical: 14,
  },
  subtitle: {
    fontFamily: FONTS.bodyMed,
    fontSize: 11,
    color: COLORS.textMuted,
    letterSpacing: 6,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 36,
  },
  dot: {
    width: 7, height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.gold,
  },
});