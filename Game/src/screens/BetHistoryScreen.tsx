import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, StatusBar, ActivityIndicator,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { COLORS, FONTS } from '../constants/theme';
import { getBetHistory } from '../services/api';

type Props = NativeStackScreenProps<RootStackParamList, 'BetHistory'>;

interface BetItem {
  id: number;
  roundId: number;
  betType: string;
  betValue: string | null;
  amount: number;
  winAmount: number;
  isSettled: boolean;
  createdAt: string;
}

export default function BetHistoryScreen({ navigation }: Props) {
  const [bets,    setBets]    = useState<BetItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getBetHistory()
      .then(setBets)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const betLabel = (b: BetItem) => {
    if (b.betType === 'NUMBER') return `#${b.betValue}`;
    return b.betType;
  };

  const isWin = (b: BetItem) => b.isSettled && b.winAmount > 0;
  const isLoss = (b: BetItem) => b.isSettled && b.winAmount === 0;

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.black} />

      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.title}>Bet History</Text>
        <View style={{ width: 60 }} />
      </View>

      {loading ? (
        <View style={s.loader}>
          <ActivityIndicator color={COLORS.gold} size="large" />
        </View>
      ) : bets.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyText}>No bets placed yet</Text>
        </View>
      ) : (
        <FlatList
          data={bets}
          keyExtractor={b => b.id.toString()}
          contentContainerStyle={s.list}
          renderItem={({ item: b }) => (
            <View style={[
              s.betCard,
              isWin(b)  && s.betCardWin,
              isLoss(b) && s.betCardLoss,
            ]}>
              <View style={s.betLeft}>
                <Text style={s.betType}>{betLabel(b)}</Text>
                <Text style={s.betRound}>Round #{b.roundId}</Text>
                <Text style={s.betDate}>
                  {new Date(b.createdAt).toLocaleString('en-IN', {
                    day: '2-digit', month: 'short',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </Text>
              </View>
              <View style={s.betRight}>
                <Text style={s.betAmount}>-₹{b.amount}</Text>
                {b.isSettled ? (
                  <Text style={[s.betResult, isWin(b) ? s.winText : s.lossText]}>
                    {isWin(b) ? `+₹${b.winAmount}` : 'Lost'}
                  </Text>
                ) : (
                  <Text style={s.pendingText}>Pending</Text>
                )}
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: COLORS.black },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 50, paddingBottom: 16,
    backgroundColor: 'rgba(26,58,42,0.3)',
    borderBottomWidth: 0.5, borderBottomColor: COLORS.border,
  },
  backBtn:     { width: 60 },
  backBtnText: { color: COLORS.gold, fontSize: 13, fontFamily: FONTS.bodyMed },
  title:       { fontFamily: FONTS.displayBold, fontSize: 18, color: COLORS.gold },
  loader:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText:   { color: COLORS.textMuted, fontSize: 14, fontFamily: FONTS.body },
  list:        { padding: 16, gap: 10 },
  betCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10, padding: 14,
  },
  betCardWin:  { borderColor: 'rgba(46,204,113,0.35)', backgroundColor: 'rgba(46,204,113,0.06)' },
  betCardLoss: { borderColor: 'rgba(192,57,43,0.3)',   backgroundColor: 'rgba(192,57,43,0.05)' },
  betLeft:     { gap: 3 },
  betType:     { color: COLORS.text, fontSize: 15, fontWeight: '600', fontFamily: FONTS.bodyMed },
  betRound:    { color: COLORS.textMuted, fontSize: 11, fontFamily: FONTS.body },
  betDate:     { color: COLORS.textMuted, fontSize: 10, fontFamily: FONTS.body },
  betRight:    { alignItems: 'flex-end', gap: 4 },
  betAmount:   { color: COLORS.textMuted, fontSize: 13, fontFamily: FONTS.bodyMed },
  betResult:   { fontSize: 16, fontWeight: '700', fontFamily: FONTS.bodyMed },
  winText:     { color: '#2ECC71' },
  lossText:    { color: COLORS.red },
  pendingText: { color: COLORS.gold, fontSize: 12, fontFamily: FONTS.body },
});