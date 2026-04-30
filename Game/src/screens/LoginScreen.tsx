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

// Demo credentials
const DEMO_CREDENTIALS = {
  player: {
    username: 'vijay',
    password: '1234',
  },
  admin: {
    username: 'admin',
    password: '1234',
  },
};

export default function LoginScreen({ navigation }: Props) {
  const [username,      setUsername]      = useState('');
  const [password,      setPassword]      = useState('');
  const [loading,       setLoading]       = useState(false);
  const [adminUnlocked, setAdminUnlocked] = useState(false);

  // Silent long-press — no progress bar, just a timer
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onLogoIn = () => {
    pressTimer.current = setTimeout(() => {
      setAdminUnlocked(true);
    }, 5000);
  };

  const onLogoOut = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const handleLogin = async (demoUsername?: string, demoPassword?: string) => {
    const user = demoUsername || username.trim();
    const pass = demoPassword || password.trim();

    if (!user || !pass) {
      Alert.alert('Error', 'Enter username and password');
      return;
    }
    setLoading(true);
    try {
      const res = await login(user, pass);
      if (res.isAdmin) {
        navigation.replace('Admin');
      } else {
        navigation.replace('Game');
      }
    } catch (err: any) {
      Alert.alert('Login Failed', err.message ?? 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const loginAsDemo = (type: 'player' | 'admin') => {
    const creds = DEMO_CREDENTIALS[type];
    setUsername(creds.username);
    setPassword(creds.password);
    handleLogin(creds.username, creds.password);
  };

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor={COLORS.black} />

      {/* Top glow section */}
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
        {/* Demo Access Buttons */}
        <View style={s.demoSection}>
          <Text style={s.demoTitle}>Quick Demo Access</Text>
          <View style={s.demoButtons}>
            <TouchableOpacity
              style={s.demoBtn}
              onPress={() => loginAsDemo('player')}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={s.demoBtnIcon}>👤</Text>
              <Text style={s.demoBtnText}>Demo Player</Text>
              <Text style={s.demoBtnSub}>Try as Player</Text>
            </TouchableOpacity>

            {adminUnlocked && (
              <TouchableOpacity
                style={[s.demoBtn, s.demoBtnAdmin]}
                onPress={() => loginAsDemo('admin')}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Text style={s.demoBtnIcon}>♛</Text>
                <Text style={[s.demoBtnText, s.demoBtnTextAdmin]}>Demo Admin</Text>
                <Text style={[s.demoBtnSub, s.demoBtnSubAdmin]}>Try as Admin</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={s.divider}>
          <View style={s.dividerLine} />
          <Text style={s.dividerText}>OR LOGIN MANUALLY</Text>
          <View style={s.dividerLine} />
        </View>

        {/* Username */}
        <View style={s.fieldGroup}>
          <Text style={s.label}>USERNAME</Text>
          <TextInput
            style={s.input}
            placeholder="Enter username"
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

        <TouchableOpacity
          style={[s.loginBtn, loading && { opacity: 0.65 }]}
          onPress={() => handleLogin()}
          disabled={loading}
          activeOpacity={0.85}
        >
          <Text style={s.loginBtnText}>
            {loading ? 'Entering...' : 'Enter Casino'}
          </Text>
        </TouchableOpacity>

        {adminUnlocked && !DEMO_CREDENTIALS.admin && (
          <View style={s.adminBadge}>
            <Text style={s.adminBadgeText}>
              Admin access unlocked — use your admin credentials above
            </Text>
          </View>
        )}
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
  logoWrap: {
    alignItems: 'center',
    marginBottom: 10,
  },
  logoHint: {
    fontSize: 9,
    color: 'rgba(201,168,76,0.35)',
    letterSpacing: 1.5,
    marginTop: 6,
    fontFamily: FONTS.body,
  },
  logoHintLit: {
    color: COLORS.gold,
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: 28,
    color: COLORS.gold,
    letterSpacing: 4,
  },
  form: {
    padding: 28,
    gap: 16,
  },
  
  // Demo Section
  demoSection: {
    gap: 12,
  },
  demoTitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    letterSpacing: 1.2,
    fontFamily: FONTS.bodyMed,
    textAlign: 'center',
  },
  demoButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  demoBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.25)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 4,
  },
  demoBtnAdmin: {
    backgroundColor: 'rgba(201,168,76,0.08)',
    borderColor: 'rgba(201,168,76,0.4)',
  },
  demoBtnIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  demoBtnText: {
    fontSize: 13,
    color: COLORS.text,
    fontFamily: FONTS.bodySemi,
    letterSpacing: 0.3,
  },
  demoBtnTextAdmin: {
    color: COLORS.gold,
  },
  demoBtnSub: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontFamily: FONTS.body,
  },
  demoBtnSubAdmin: {
    color: 'rgba(201,168,76,0.7)',
  },
  
  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 0.5,
    backgroundColor: 'rgba(201,168,76,0.15)',
  },
  dividerText: {
    fontSize: 9,
    color: COLORS.textMuted,
    letterSpacing: 1,
    fontFamily: FONTS.body,
  },
  
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 10,
    color: COLORS.textMuted,
    letterSpacing: 1.5,
    fontFamily: FONTS.bodyMed,
  },
  input: {
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 0.5,
    borderColor: 'rgba(201,168,76,0.25)',
    borderRadius: 10,
    color: COLORS.text,
    fontSize: 14,
    fontFamily: FONTS.body,
  },
  loginBtn: {
    backgroundColor: COLORS.gold,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 6,
  },
  loginBtnText: {
    fontFamily: FONTS.bodySemi,
    fontSize: 14,
    color: COLORS.black,
    letterSpacing: 0.5,
  },
  adminBadge: {
    backgroundColor: 'rgba(201,168,76,0.08)',
    borderWidth: 0.5,
    borderColor: 'rgba(201,168,76,0.3)',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  adminBadgeText: {
    fontSize: 11,
    color: COLORS.gold,
    textAlign: 'center',
    fontFamily: FONTS.body,
    lineHeight: 17,
  },
});