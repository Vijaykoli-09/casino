import React, { useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, StatusBar, Alert, KeyboardAvoidingView,
  Platform, ScrollView,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { COLORS, FONTS } from '../constants/theme';
import { login } from '../services/api';
import { WheelIcon } from './SplashScreen';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const [username,       setUsername]       = useState('');
  const [password,       setPassword]       = useState('');
  const [loading,        setLoading]        = useState(false);
  const [adminUnlocked,  setAdminUnlocked]  = useState(false);
  const [superAdminMode, setSuperAdminMode] = useState(false);

  // ── Logo hold 5s → Admin unlock ──────────────────────────────────────────
  const logoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onLogoIn = () => {
    logoTimer.current = setTimeout(() => {
      setAdminUnlocked(true);
    }, 5000);
  };

  const onLogoOut = () => {
    if (logoTimer.current) {
      clearTimeout(logoTimer.current);
      logoTimer.current = null;
    }
  };

  // ── Enter Casino hold 5s → Super Admin mode ───────────────────────────────
  const superTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onEnterCasinoIn = () => {
    superTimer.current = setTimeout(() => {
      setSuperAdminMode(true);
      setUsername('');
      setPassword('');
    }, 5000);
  };

  const onEnterCasinoOut = () => {
    if (superTimer.current) {
      clearTimeout(superTimer.current);
      superTimer.current = null;
    }
  };

  // ── Login handler ─────────────────────────────────────────────────────────
  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Error', 'Enter username and password');
      return;
    }

    setLoading(true);
    try {
      const res = await login(username.trim(), password.trim());

      // SUPER ADMIN — needs passcode verification
      if (res.requiresPasscode) {
        navigation.replace('Passcode', { tempToken: res.token });
        return;
      }

      // ADMIN
      if (res.role === 'ADMIN') {
        navigation.replace('Admin');
        return;
      }

      // PLAYER
      if (res.role === 'PLAYER') {
        navigation.replace('Game');
        return;
      }

      // Fallback — unknown role
      Alert.alert('Error', 'Unknown role: ' + res.role);

    } catch (err: any) {
      Alert.alert('Login Failed', err.message ?? 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor={COLORS.black} />

      {/* Top section */}
      <View style={s.topSection}>
        <TouchableOpacity
          activeOpacity={1}
          onPressIn={onLogoIn}
          onPressOut={onLogoOut}
          style={s.logoWrap}
        >
          <WheelIcon size={56} />
          <Text style={[s.logoHint, adminUnlocked && s.logoHintLit]}>
            {adminUnlocked ? '✓ admin unlocked' : 'hold for admin access'}
          </Text>
        </TouchableOpacity>
        <Text style={s.title}>ROYALE</Text>
      </View>

      <ScrollView
        contentContainerStyle={s.form}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Super Admin banner */}
        {superAdminMode && (
          <View style={s.superAdminBanner}>
            <Text style={s.superAdminBannerIcon}>♛</Text>
            <Text style={s.superAdminBannerText}>
              Super Admin Mode — Enter your credentials
            </Text>
            {/* Cancel super admin mode */}
            <TouchableOpacity
              onPress={() => {
                setSuperAdminMode(false);
                setUsername('');
                setPassword('');
              }}
            >
              <Text style={s.bannerCancel}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Admin unlocked badge */}
        {adminUnlocked && !superAdminMode && (
          <View style={s.adminBadge}>
            <Text style={s.adminBadgeText}>
              Admin access unlocked — use admin credentials
            </Text>
          </View>
        )}

        {/* Username */}
        <View style={s.fieldGroup}>
          <Text style={s.label}>USERNAME</Text>
          <TextInput
            style={s.input}
            placeholder={
              superAdminMode ? 'Super admin username' : 'Enter username'
            }
            placeholderTextColor="rgba(255,255,255,0.2)"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Password */}
        <View style={s.fieldGroup}>
          <Text style={s.label}>PASSWORD</Text>
          <TextInput
            style={s.input}
            placeholder="Enter password"
            placeholderTextColor="rgba(255,255,255,0.2)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        {/* Enter Casino / Super Admin button */}
        <TouchableOpacity
          style={[
            s.loginBtn,
            superAdminMode && s.loginBtnSuper,
            loading && { opacity: 0.65 },
          ]}
          onPress={handleLogin}
          onPressIn={onEnterCasinoIn}
          onPressOut={onEnterCasinoOut}
          onLongPress={() => {}}
          disabled={loading}
          activeOpacity={0.85}
          delayLongPress={5000}
        >
          <Text style={[
            s.loginBtnText,
            superAdminMode && s.loginBtnTextSuper,
          ]}>
            {loading
              ? 'Entering...'
              : superAdminMode
              ? '♛ Enter Super Admin'
              : 'Enter Casino'}
          </Text>
        </TouchableOpacity>

        {/* Role hint */}
        <Text style={s.roleHint}>
          {superAdminMode
            ? 'Super Admin credentials required'
            : adminUnlocked
            ? 'Admin or Player credentials'
            : 'Player credentials'}
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.black,
  },
  topSection: {
    height: 210,
    backgroundColor: 'rgba(26,58,42,0.35)',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 22,
  },
  logoWrap:    { alignItems: 'center', marginBottom: 10 },
  logoHint: {
    fontSize: 9, color: 'rgba(201,168,76,0.35)',
    letterSpacing: 1.5, marginTop: 6, fontFamily: FONTS.body,
  },
  logoHintLit: { color: COLORS.gold },
  title: {
    fontFamily: FONTS.display, fontSize: 28,
    color: COLORS.gold, letterSpacing: 4,
  },
  form:        { padding: 28, gap: 16 },
  fieldGroup:  { gap: 6 },
  label: {
    fontSize: 10, color: COLORS.textMuted,
    letterSpacing: 1.5, fontFamily: FONTS.bodyMed,
  },
  input: {
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 0.5, borderColor: 'rgba(201,168,76,0.25)',
    borderRadius: 10, color: COLORS.text,
    fontSize: 14, fontFamily: FONTS.body,
  },
  loginBtn: {
    backgroundColor: COLORS.gold,
    padding: 15, borderRadius: 10,
    alignItems: 'center', marginTop: 6,
  },
  loginBtnSuper: {
    backgroundColor: 'rgba(201,168,76,0.15)',
    borderWidth: 1, borderColor: COLORS.gold,
  },
  loginBtnText: {
    fontFamily: FONTS.bodySemi, fontSize: 14,
    color: COLORS.black, letterSpacing: 0.5,
  },
  loginBtnTextSuper: { color: COLORS.gold },
  adminBadge: {
    backgroundColor: 'rgba(201,168,76,0.08)',
    borderWidth: 0.5, borderColor: 'rgba(201,168,76,0.3)',
    borderRadius: 8, padding: 12, alignItems: 'center',
  },
  adminBadgeText: {
    fontSize: 11, color: COLORS.gold,
    textAlign: 'center', fontFamily: FONTS.body, lineHeight: 17,
  },
  superAdminBanner: {
    backgroundColor: 'rgba(201,168,76,0.1)',
    borderWidth: 1, borderColor: 'rgba(201,168,76,0.5)',
    borderRadius: 10, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  superAdminBannerIcon: { fontSize: 20, color: COLORS.gold },
  superAdminBannerText: {
    fontSize: 12, color: COLORS.gold,
    fontFamily: FONTS.bodyMed, flex: 1,
  },
  bannerCancel: {
    fontSize: 14, color: COLORS.textMuted, padding: 4,
  },
  roleHint: {
    fontSize: 10, color: 'rgba(255,255,255,0.15)',
    textAlign: 'center', fontFamily: FONTS.body,
    letterSpacing: 0.5,
  },
});