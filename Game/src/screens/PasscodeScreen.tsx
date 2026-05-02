import React, { useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, Alert, Animated,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { COLORS, FONTS } from '../constants/theme';
import { verifyPasscode } from '../services/api';
import { Storage } from '../services/storage';

type Props = NativeStackScreenProps<RootStackParamList, 'Passcode'>;

export default function PasscodeScreen({ route, navigation }: Props) {
  const { tempToken } = route.params;
  const [code,    setCode]    = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(false);

  const shakeAnim = useRef(new Animated.Value(0)).current;

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,   duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handlePress = async (digit: string) => {
    if (code.length >= 4) return;
    const newCode = code + digit;
    setCode(newCode);
    setError(false);

    if (newCode.length === 4) {
      setLoading(true);
      try {
        const res = await verifyPasscode(newCode, tempToken);
        // Save new full token
        await Storage.saveAuth(res.token, -1, true);
        navigation.replace('SuperAdmin');
      } catch {
        setError(true);
        shake();
        setTimeout(() => setCode(''), 600);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDelete = () => {
    setCode(prev => prev.slice(0, -1));
    setError(false);
  };

  const KEYS = [
    ['1','2','3'],
    ['4','5','6'],
    ['7','8','9'],
    ['','0','⌫'],
  ];

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.black} />

      {/* Header */}
      <View style={s.header}>
        <Text style={s.icon}>♛</Text>
        <Text style={s.title}>Super Admin</Text>
        <Text style={s.subtitle}>Enter 4-digit passcode</Text>
      </View>

      {/* Dots */}
      <Animated.View
        style={[s.dotsRow, { transform: [{ translateX: shakeAnim }] }]}
      >
        {[0,1,2,3].map(i => (
          <View
            key={i}
            style={[
              s.dot,
              i < code.length && s.dotFilled,
              error && s.dotError,
            ]}
          />
        ))}
      </Animated.View>

      {error && (
        <Text style={s.errorText}>Incorrect passcode</Text>
      )}

      {/* Keypad */}
      <View style={s.keypad}>
        {KEYS.map((row, ri) => (
          <View key={ri} style={s.keyRow}>
            {row.map((key, ki) => (
              key === '' ? (
                <View key={ki} style={s.keyEmpty} />
              ) : (
                <TouchableOpacity
                  key={ki}
                  style={[s.key, loading && { opacity: 0.5 }]}
                  onPress={() =>
                    key === '⌫' ? handleDelete() : handlePress(key)
                  }
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  <Text style={s.keyText}>{key}</Text>
                </TouchableOpacity>
              )
            ))}
          </View>
        ))}
      </View>

      {/* Back */}
      <TouchableOpacity
        style={s.backBtn}
        onPress={() => navigation.replace('Login')}
      >
        <Text style={s.backBtnText}>← Back to Login</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: COLORS.black,
    alignItems: 'center', justifyContent: 'center', gap: 32,
  },
  header:   { alignItems: 'center', gap: 8 },
  icon:     { fontSize: 40, color: COLORS.gold },
  title: {
    fontFamily: FONTS.display, fontSize: 26,
    color: COLORS.gold, letterSpacing: 3,
  },
  subtitle: {
    fontSize: 12, color: COLORS.textMuted,
    letterSpacing: 1, fontFamily: FONTS.body,
  },
  dotsRow:  { flexDirection: 'row', gap: 20 },
  dot: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 2, borderColor: 'rgba(201,168,76,0.4)',
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: COLORS.gold,
    borderColor: COLORS.gold,
  },
  dotError: {
    borderColor: COLORS.red,
    backgroundColor: COLORS.red,
  },
  errorText: {
    fontSize: 12, color: COLORS.red,
    fontFamily: FONTS.body, letterSpacing: 0.5,
  },
  keypad:   { gap: 16 },
  keyRow:   { flexDirection: 'row', gap: 24 },
  key: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 0.5, borderColor: 'rgba(201,168,76,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  keyEmpty: { width: 72, height: 72 },
  keyText: {
    fontSize: 22, color: COLORS.text,
    fontFamily: FONTS.bodySemi,
  },
  backBtn:  { marginTop: 8 },
  backBtnText: {
    fontSize: 12, color: COLORS.textMuted,
    fontFamily: FONTS.body,
  },
});