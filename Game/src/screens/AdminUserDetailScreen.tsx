import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput,
  TouchableOpacity, StatusBar, Alert,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { COLORS, FONTS } from '../constants/theme';
import { updateBalance } from '../services/api';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminUserDetail'>;

export default function AdminUserDetailScreen({ route, navigation }: Props) {
  const { userId, username } = route.params;

  const [balance,  setBalance]  = useState(route.params.balance);
  const [amount,   setAmount]   = useState('');
  const [loading,  setLoading]  = useState(false);
  const [lastAdded, setLastAdded] = useState<number | null>(null);

  const initials = username.slice(0, 2).toUpperCase();

  const handleAdd = async () => {
    const amt = parseFloat(amount);
    if (!amount || isNaN(amt) || amt <= 0) {
      Alert.alert('Invalid Amount', 'Enter a positive number');
      return;
    }
    setLoading(true);
    try {
      const res = await updateBalance(userId, amt);
      setBalance(res.newBalance);
      setLastAdded(amt);
      setAmount('');
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to update balance');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    const amt = parseFloat(amount);
    if (!amount || isNaN(amt) || amt <= 0) {
      Alert.alert('Invalid Amount', 'Enter a positive number');
      return;
    }
    if (amt > balance) {
      Alert.alert('Insufficient Balance', `Player only has ₹${balance}`);
      return;
    }
    Alert.alert(
      'Confirm Remove',
      `Remove ₹${amt} from ${username}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove', style: 'destructive', onPress: async () => {
            setLoading(true);
            try {
              const res = await updateBalance(userId, -amt);
              setBalance(res.newBalance);
              setLastAdded(-amt);
              setAmount('');
            } catch (err: any) {
              Alert.alert('Error', err.message ?? 'Failed to update balance');
            } finally {
              setLoading(false);
            }
          }
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0A0F0A" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Player Detail</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">

        {/* Avatar + name */}
        <View style={s.profileCard}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initials}</Text>
          </View>
          <Text style={s.username}>{username}</Text>
          <Text style={s.userIdLabel}>ID #{userId}</Text>
        </View>

        {/* Balance display */}
        <View style={s.balanceCard}>
          <Text style={s.balanceLabel}>CURRENT BALANCE</Text>
          <Text style={s.balanceAmount}>
            ₹ {balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </Text>

          {lastAdded !== null && (
            <View style={[s.lastAddedBadge, lastAdded > 0 ? s.badgeGreen : s.badgeRed]}>
              <Text style={[s.lastAddedText, lastAdded > 0 ? s.textGreen : s.textRed]}>
                {lastAdded > 0 ? '+' : ''}₹{Math.abs(lastAdded).toLocaleString('en-IN')} applied
              </Text>
            </View>
          )}
        </View>

        {/* Amount input */}
        <View style={s.inputSection}>
          <Text style={s.inputLabel}>AMOUNT (₹)</Text>
          <TextInput
            style={s.input}
            placeholder="Enter amount"
            placeholderTextColor="rgba(255,255,255,0.2)"
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            returnKeyType="done"
          />
        </View>

        {/* Add / Remove buttons */}
        <View style={s.actionRow}>
          <TouchableOpacity
            style={[s.addBtn, loading && { opacity: 0.6 }]}
            onPress={handleAdd}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={s.addBtnText}>
              {loading ? '...' : '+ Add Balance'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.removeBtn, loading && { opacity: 0.6 }]}
            onPress={handleRemove}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={s.removeBtnText}>
              {loading ? '...' : '− Remove'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Quick amount chips */}
        <Text style={s.quickLabel}>QUICK AMOUNTS</Text>
        <View style={s.quickRow}>
          {[100, 500, 1000, 5000].map(v => (
            <TouchableOpacity
              key={v}
              style={s.quickChip}
              onPress={() => setAmount(String(v))}
            >
              <Text style={s.quickChipText}>₹{v.toLocaleString()}</Text>
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0F0A' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 50, paddingBottom: 16,
    backgroundColor: 'rgba(201,168,76,0.06)',
    borderBottomWidth: 0.5, borderBottomColor: 'rgba(201,168,76,0.2)',
  },
  backBtn:      { width: 60 },
  backBtnText:  { color: COLORS.gold, fontSize: 13, fontFamily: FONTS.bodyMed },
  headerTitle:  { fontFamily: FONTS.displayBold, fontSize: 18, color: COLORS.gold },
  body:         { padding: 20, gap: 16 },

  // Profile
  profileCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 0.5, borderColor: 'rgba(201,168,76,0.15)',
    borderRadius: 14, padding: 24,
  },
  avatar: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(201,168,76,0.2)',
    borderWidth: 1, borderColor: 'rgba(201,168,76,0.4)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText:  { fontSize: 22, fontWeight: '700', color: COLORS.gold, fontFamily: FONTS.bodySemi },
  username:    { fontSize: 18, color: COLORS.text, fontFamily: FONTS.displayBold },
  userIdLabel: { fontSize: 11, color: COLORS.textMuted, marginTop: 4, fontFamily: FONTS.body },

  // Balance card
  balanceCard: {
    backgroundColor: 'rgba(201,168,76,0.06)',
    borderWidth: 0.5, borderColor: 'rgba(201,168,76,0.25)',
    borderRadius: 14, padding: 20, alignItems: 'center', gap: 6,
  },
  balanceLabel:  { fontSize: 10, color: COLORS.textMuted, letterSpacing: 2, fontFamily: FONTS.bodyMed },
  balanceAmount: { fontFamily: FONTS.display, fontSize: 34, color: COLORS.gold },
  lastAddedBadge:{ paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20, borderWidth: 0.5, marginTop: 4 },
  badgeGreen:    { backgroundColor: 'rgba(46,204,113,0.1)', borderColor: 'rgba(46,204,113,0.35)' },
  badgeRed:      { backgroundColor: 'rgba(192,57,43,0.1)',  borderColor: 'rgba(192,57,43,0.35)' },
  lastAddedText: { fontSize: 12, fontFamily: FONTS.bodyMed },
  textGreen:     { color: '#2ECC71' },
  textRed:       { color: COLORS.red },

  // Input
  inputSection:  { gap: 6 },
  inputLabel:    { fontSize: 10, color: COLORS.textMuted, letterSpacing: 1.5, fontFamily: FONTS.bodyMed },
  input: {
    padding: 14, paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 0.5, borderColor: 'rgba(201,168,76,0.25)',
    borderRadius: 10, color: COLORS.text,
    fontSize: 18, fontFamily: FONTS.body, textAlign: 'center',
  },

  // Actions
  actionRow:    { flexDirection: 'row', gap: 10 },
  addBtn: {
    flex: 2, padding: 14, borderRadius: 10, alignItems: 'center',
    backgroundColor: 'rgba(46,204,113,0.15)',
    borderWidth: 0.5, borderColor: 'rgba(46,204,113,0.4)',
  },
  addBtnText:   { fontSize: 14, fontWeight: '600', color: '#2ECC71', fontFamily: FONTS.bodySemi },
  removeBtn: {
    flex: 1, padding: 14, borderRadius: 10, alignItems: 'center',
    backgroundColor: 'rgba(192,57,43,0.12)',
    borderWidth: 0.5, borderColor: 'rgba(192,57,43,0.35)',
  },
  removeBtnText:{ fontSize: 14, fontWeight: '600', color: COLORS.red, fontFamily: FONTS.bodySemi },

  // Quick amounts
  quickLabel:   { fontSize: 10, color: COLORS.textMuted, letterSpacing: 1.5, fontFamily: FONTS.bodyMed },
  quickRow:     { flexDirection: 'row', gap: 8 },
  quickChip: {
    flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 0.5, borderColor: 'rgba(201,168,76,0.2)',
  },
  quickChipText:{ fontSize: 12, color: COLORS.gold, fontFamily: FONTS.bodyMed },
});