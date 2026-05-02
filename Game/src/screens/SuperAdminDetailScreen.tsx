import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, StatusBar, ActivityIndicator,
  Alert, ScrollView, Platform,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { COLORS, FONTS } from '../constants/theme';
import { getAdminProfit } from '../services/api';

type Props = NativeStackScreenProps<RootStackParamList, 'SuperAdminDetail'>;

interface ProfitData {
  adminId:        number;
  adminUsername:  string;
  totalPlayers:   number;
  totalBets:      number;
  totalPayouts:   number;
  adminProfit:    number;
  superAdminShare: number;
  fromDate:       string;
  toDate:         string;
  players: Array<{
    id:       number;
    username: string;
    balance:  number;
  }>;
}

export default function SuperAdminDetailScreen({ route, navigation }: Props) {
  const { adminId, username } = route.params;

  // Default date range — last 30 days
  const today    = new Date();
  const lastMonth = new Date(today);
  lastMonth.setDate(today.getDate() - 30);

  const fmt = (d: Date) => d.toISOString().split('T')[0]; // YYYY-MM-DD

  const [fromDate, setFromDate] = useState(fmt(lastMonth));
  const [toDate,   setToDate]   = useState(fmt(today));
  const [data,     setData]     = useState<ProfitData | null>(null);
  const [loading,  setLoading]  = useState(true);

  const fetchProfit = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminProfit(adminId, fromDate, toDate);
      setData(res);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [adminId, fromDate, toDate]);

  useEffect(() => { fetchProfit(); }, [fetchProfit]);

  const initials = (name: string) => name.slice(0, 2).toUpperCase();

  const fmt2 = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });

  // Quick date range presets
  const setPreset = (days: number) => {
    const t  = new Date();
    const f  = new Date();
    f.setDate(t.getDate() - days);
    setFromDate(fmt(f));
    setToDate(fmt(t));
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0F0A" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={s.backBtn}
        >
          <Text style={s.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>{username}</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Admin profile */}
        <View style={s.profileCard}>
          <View style={s.profileAvatar}>
            <Text style={s.profileAvatarText}>{initials(username)}</Text>
          </View>
          <Text style={s.profileName}>{username}</Text>
          <Text style={s.profileRole}>Admin • {data?.totalPlayers ?? 0} Players</Text>
        </View>

        {/* Date range presets */}
        <View style={s.presetsWrap}>
          <Text style={s.presetsLabel}>DATE RANGE</Text>
          <View style={s.presets}>
            {[
              { label: 'Today',   days: 0  },
              { label: '7 Days',  days: 7  },
              { label: '30 Days', days: 30 },
              { label: '90 Days', days: 90 },
            ].map(p => (
              <TouchableOpacity
                key={p.label}
                style={s.presetBtn}
                onPress={() => setPreset(p.days)}
              >
                <Text style={s.presetBtnText}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={s.dateRow}>
            <View style={s.dateBox}>
              <Text style={s.dateLbl}>FROM</Text>
              <Text style={s.dateVal}>{fmt2(fromDate)}</Text>
            </View>
            <Text style={s.dateArrow}>→</Text>
            <View style={s.dateBox}>
              <Text style={s.dateLbl}>TO</Text>
              <Text style={s.dateVal}>{fmt2(toDate)}</Text>
            </View>
          </View>
        </View>

        {loading ? (
          <View style={s.loader}>
            <ActivityIndicator color={COLORS.gold} size="large" />
          </View>
        ) : data ? (
          <>
            {/* Profit summary */}
            <View style={s.profitCard}>
              <Text style={s.profitCardTitle}>PROFIT SUMMARY</Text>

              <View style={s.profitRow}>
                <Text style={s.profitLabel}>Total Bets</Text>
                <Text style={s.profitValue}>
                  ₹ {Number(data.totalBets).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Text>
              </View>

              <View style={s.profitRow}>
                <Text style={s.profitLabel}>Total Payouts</Text>
                <Text style={[s.profitValue, { color: COLORS.red }]}>
                  - ₹ {Number(data.totalPayouts).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Text>
              </View>

              <View style={s.profitDivider} />

              <View style={s.profitRow}>
                <Text style={s.profitLabelMain}>Admin Profit</Text>
                <Text style={s.profitValueMain}>
                  ₹ {Number(data.adminProfit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Text>
              </View>

              <View style={s.shareRow}>
                <View style={s.shareBadge}>
                  <Text style={s.shareBadgeText}>30% Super Admin Share</Text>
                </View>
                <Text style={s.shareValue}>
                  ₹ {Number(data.superAdminShare).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Text>
              </View>
            </View>

            {/* Players list */}
            <View style={s.playersSection}>
              <Text style={s.playersSectionTitle}>
                PLAYERS ({data.players.length})
              </Text>
              {data.players.map(p => (
                <View key={p.id} style={s.playerRow}>
                  <View style={s.playerAvatar}>
                    <Text style={s.playerAvatarText}>
                      {initials(p.username)}
                    </Text>
                  </View>
                  <View style={s.playerInfo}>
                    <Text style={s.playerName}>{p.username}</Text>
                    <Text style={s.playerBal}>
                      Balance: ₹{Number(p.balance).toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                      })}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        ) : null}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#0A0F0A' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 50, paddingBottom: 16,
    backgroundColor: 'rgba(201,168,76,0.06)',
    borderBottomWidth: 0.5, borderBottomColor: 'rgba(201,168,76,0.2)',
  },
  backBtn:        { width: 60 },
  backBtnText:    { color: COLORS.gold, fontSize: 13, fontFamily: FONTS.bodyMed },
  headerTitle: {
    fontFamily: FONTS.displayBold, fontSize: 18, color: COLORS.gold,
  },
  profileCard: {
    alignItems: 'center', padding: 24, gap: 8,
    borderBottomWidth: 0.5, borderBottomColor: 'rgba(201,168,76,0.1)',
  },
  profileAvatar: {
    width: 70, height: 70, borderRadius: 35,
    backgroundColor: 'rgba(201,168,76,0.15)',
    borderWidth: 1.5, borderColor: 'rgba(201,168,76,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
  profileAvatarText: {
    fontSize: 24, fontWeight: '700',
    color: COLORS.gold, fontFamily: FONTS.bodySemi,
  },
  profileName: {
    fontFamily: FONTS.displayBold, fontSize: 20, color: COLORS.text,
  },
  profileRole:    { fontSize: 12, color: COLORS.textMuted, fontFamily: FONTS.body },
  presetsWrap: {
    padding: 16,
    borderBottomWidth: 0.5, borderBottomColor: 'rgba(201,168,76,0.1)',
  },
  presetsLabel: {
    fontSize: 10, color: COLORS.textMuted,
    letterSpacing: 1.5, fontFamily: FONTS.bodyMed, marginBottom: 10,
  },
  presets:        { flexDirection: 'row', gap: 8, marginBottom: 14 },
  presetBtn: {
    paddingHorizontal: 14, paddingVertical: 7,
    backgroundColor: 'rgba(201,168,76,0.08)',
    borderWidth: 0.5, borderColor: 'rgba(201,168,76,0.3)',
    borderRadius: 20,
  },
  presetBtnText:  { fontSize: 11, color: COLORS.gold, fontFamily: FONTS.bodyMed },
  dateRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 12,
  },
  dateBox: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 0.5, borderColor: 'rgba(201,168,76,0.2)',
    borderRadius: 8, padding: 10, alignItems: 'center',
  },
  dateLbl:        { fontSize: 9, color: COLORS.textMuted, letterSpacing: 1 },
  dateVal:        { fontSize: 13, color: COLORS.text, fontFamily: FONTS.bodyMed, marginTop: 2 },
  dateArrow:      { fontSize: 16, color: COLORS.textMuted },
  loader: {
    padding: 40, alignItems: 'center',
  },
  profitCard: {
    margin: 16, padding: 18,
    backgroundColor: 'rgba(201,168,76,0.06)',
    borderWidth: 0.5, borderColor: 'rgba(201,168,76,0.25)',
    borderRadius: 14, gap: 10,
  },
  profitCardTitle: {
    fontSize: 10, color: COLORS.textMuted,
    letterSpacing: 2, fontFamily: FONTS.bodyMed, marginBottom: 4,
  },
  profitRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  profitLabel:    { fontSize: 13, color: COLORS.textMuted, fontFamily: FONTS.body },
  profitValue:    { fontSize: 14, color: COLORS.text, fontFamily: FONTS.bodyMed },
  profitDivider: {
    height: 0.5, backgroundColor: 'rgba(201,168,76,0.25)',
    marginVertical: 4,
  },
  profitLabelMain:{ fontSize: 15, color: COLORS.text, fontFamily: FONTS.bodySemi },
  profitValueMain:{
    fontFamily: FONTS.displayBold, fontSize: 22, color: '#2ECC71',
  },
  shareRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(201,168,76,0.08)',
    borderRadius: 8, padding: 10, marginTop: 4,
  },
  shareBadge: {
    backgroundColor: 'rgba(201,168,76,0.2)',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 12,
  },
  shareBadgeText: { fontSize: 11, color: COLORS.gold, fontFamily: FONTS.bodyMed },
  shareValue: {
    fontFamily: FONTS.displayBold, fontSize: 18, color: COLORS.gold,
  },
  playersSection: { padding: 16, gap: 8 },
  playersSectionTitle: {
    fontSize: 10, color: COLORS.textMuted,
    letterSpacing: 1.5, fontFamily: FONTS.bodyMed, marginBottom: 4,
  },
  playerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10, padding: 12,
  },
  playerAvatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(201,168,76,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  playerAvatarText: {
    fontSize: 12, fontWeight: '700',
    color: COLORS.gold, fontFamily: FONTS.bodySemi,
  },
  playerInfo:     { flex: 1 },
  playerName:     { fontSize: 13, color: COLORS.text, fontFamily: FONTS.bodyMed },
  playerBal:      { fontSize: 11, color: COLORS.textMuted, fontFamily: FONTS.body, marginTop: 2 },
});