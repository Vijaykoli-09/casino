import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, StatusBar, ActivityIndicator, Alert,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { COLORS, FONTS } from '../constants/theme';
import { getUsers, createUser, logout } from '../services/api';

type Props = NativeStackScreenProps<RootStackParamList, 'Admin'>;

interface User {
  id: number;
  username: string;
  balance: number;
  isAdmin: boolean;
  createdAt: string;
}

type Tab = 'players' | 'create';

export default function AdminScreen({ navigation }: Props) {
  const [tab,         setTab]         = useState<Tab>('players');
  const [users,       setUsers]       = useState<User[]>([]);
  const [filtered,    setFiltered]    = useState<User[]>([]);
  const [search,      setSearch]      = useState('');
  const [loading,     setLoading]     = useState(true);

  // Create form state
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newBalance,  setNewBalance]  = useState('');
  const [creating,    setCreating]    = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const data = await getUsers();
      const players = data.filter(u => !u.isAdmin);
      setUsers(players);
      setFiltered(players);
    } catch {
      Alert.alert('Error', 'Could not load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // Live search filter
  useEffect(() => {
    const q = search.toLowerCase().trim();
    setFiltered(q ? users.filter(u => u.username.toLowerCase().includes(q)) : users);
  }, [search, users]);

  const handleCreate = async () => {
    if (!newUsername.trim() || !newPassword.trim()) {
      Alert.alert('Error', 'Username and password are required');
      return;
    }
    setCreating(true);
    try {
      await createUser({
        username: newUsername.trim(),
        password: newPassword.trim(),
        balance:  parseFloat(newBalance) || 0,
      });
      Alert.alert('Success', `Player "${newUsername}" created`);
      setNewUsername('');
      setNewPassword('');
      setNewBalance('');
      setTab('players');
      fetchUsers();
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to create player');
    } finally {
      setCreating(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigation.replace('Login');
  };

  const initials = (name: string) => name.slice(0, 2).toUpperCase();

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0F0A" />

      {/* Header */}
      <View style={s.header}>
        <View style={s.adminIcon}>
          <Text style={s.adminIconText}>♛</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Admin Panel</Text>
          <Text style={s.headerSub}>ROYALE CASINO</Text>
        </View>
        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
          <Text style={s.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={s.tabs}>
        {(['players', 'create'] as Tab[]).map(t => (
          <TouchableOpacity
            key={t}
            style={[s.tab, tab === t && s.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[s.tabText, tab === t && s.tabTextActive]}>
              {t === 'players' ? `Players (${users.length})` : 'Create Player'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── PLAYERS TAB ── */}
      {tab === 'players' && (
        <>
          <View style={s.searchWrap}>
            <TextInput
              style={s.searchInput}
              placeholder="Search by username..."
              placeholderTextColor="rgba(255,255,255,0.2)"
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
          </View>

          {loading ? (
            <View style={s.loader}>
              <ActivityIndicator color={COLORS.gold} size="large" />
            </View>
          ) : filtered.length === 0 ? (
            <View style={s.empty}>
              <Text style={s.emptyText}>
                {search ? 'No users match your search' : 'No players yet'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={u => u.id.toString()}
              contentContainerStyle={s.list}
              renderItem={({ item: u }) => (
                <TouchableOpacity
                  style={s.userCard}
                  activeOpacity={0.75}
                  onPress={() => navigation.navigate('AdminUserDetail', {
                    userId:   u.id,
                    username: u.username,
                    balance:  u.balance,
                  })}
                >
                  <View style={s.avatar}>
                    <Text style={s.avatarText}>{initials(u.username)}</Text>
                  </View>
                  <View style={s.userInfo}>
                    <Text style={s.userName}>{u.username}</Text>
                    <Text style={s.userBalance}>
                      ₹ {u.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </Text>
                  </View>
                  <Text style={s.chevron}>›</Text>
                </TouchableOpacity>
              )}
              onRefresh={fetchUsers}
              refreshing={loading}
            />
          )}
        </>
      )}

      {/* ── CREATE TAB ── */}
      {tab === 'create' && (
        <View style={s.createForm}>
          <Text style={s.createTitle}>New Player Account</Text>

          <Text style={s.inputLabel}>USERNAME</Text>
          <TextInput
            style={s.input}
            placeholder="player_username"
            placeholderTextColor="rgba(255,255,255,0.2)"
            value={newUsername}
            onChangeText={setNewUsername}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={s.inputLabel}>PASSWORD</Text>
          <TextInput
            style={s.input}
            placeholder="••••••••"
            placeholderTextColor="rgba(255,255,255,0.2)"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
          />

          <Text style={s.inputLabel}>STARTING BALANCE (₹)</Text>
          <TextInput
            style={s.input}
            placeholder="0"
            placeholderTextColor="rgba(255,255,255,0.2)"
            value={newBalance}
            onChangeText={setNewBalance}
            keyboardType="numeric"
          />

          <TouchableOpacity
            style={[s.createBtn, creating && { opacity: 0.6 }]}
            onPress={handleCreate}
            disabled={creating}
            activeOpacity={0.85}
          >
            <Text style={s.createBtnText}>
              {creating ? 'Creating...' : 'Create Player'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#0A0F0A' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, paddingTop: 50,
    backgroundColor: 'rgba(201,168,76,0.06)',
    borderBottomWidth: 0.5, borderBottomColor: 'rgba(201,168,76,0.2)',
  },
  adminIcon: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: 'rgba(201,168,76,0.15)',
    borderWidth: 0.5, borderColor: 'rgba(201,168,76,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  adminIconText: { fontSize: 16, color: COLORS.gold },
  headerTitle:  { fontFamily: FONTS.displayBold, fontSize: 18, color: COLORS.gold },
  headerSub:    { fontSize: 9, color: COLORS.textMuted, letterSpacing: 1, fontFamily: FONTS.body },
  logoutBtn:    { paddingHorizontal: 12, paddingVertical: 7, borderWidth: 0.5, borderColor: COLORS.border, borderRadius: 7 },
  logoutText:   { fontSize: 11, color: COLORS.textMuted, fontFamily: FONTS.bodyMed },
  tabs:         { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: 'rgba(201,168,76,0.15)' },
  tab:          { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive:    { borderBottomColor: COLORS.gold },
  tabText:      { fontSize: 12, color: COLORS.textMuted, fontFamily: FONTS.bodyMed },
  tabTextActive:{ color: COLORS.gold },
  searchWrap:   { padding: 12, paddingBottom: 8 },
  searchInput:  {
    padding: 11, paddingHorizontal: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 0.5, borderColor: 'rgba(201,168,76,0.2)',
    borderRadius: 9, color: COLORS.text,
    fontSize: 13, fontFamily: FONTS.body,
  },
  loader:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty:        { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText:    { color: COLORS.textMuted, fontSize: 13, fontFamily: FONTS.body },
  list:         { padding: 12, gap: 8 },
  userCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 0.5, borderColor: 'rgba(201,168,76,0.12)',
    borderRadius: 10, padding: 14,
  },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(201,168,76,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText:   { fontWeight: '700', color: COLORS.gold, fontSize: 14, fontFamily: FONTS.bodySemi },
  userInfo:     { flex: 1 },
  userName:     { fontSize: 14, color: COLORS.text, fontFamily: FONTS.bodyMed },
  userBalance:  { fontSize: 12, color: COLORS.gold, marginTop: 2, fontFamily: FONTS.body },
  chevron:      { fontSize: 22, color: COLORS.textMuted, marginRight: 4 },
  createForm:   { padding: 20, gap: 8 },
  createTitle:  { fontSize: 14, color: COLORS.gold, fontFamily: FONTS.bodySemi, marginBottom: 8, letterSpacing: 0.5 },
  inputLabel:   { fontSize: 10, color: COLORS.textMuted, letterSpacing: 1.5, fontFamily: FONTS.bodyMed },
  input: {
    padding: 12, paddingHorizontal: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 0.5, borderColor: 'rgba(201,168,76,0.2)',
    borderRadius: 9, color: COLORS.text,
    fontSize: 13, fontFamily: FONTS.body, marginBottom: 6,
  },
  createBtn: {
    backgroundColor: 'rgba(201,168,76,0.15)',
    borderWidth: 0.5, borderColor: 'rgba(201,168,76,0.4)',
    borderRadius: 9, padding: 14,
    alignItems: 'center', marginTop: 6,
  },
  createBtnText:{ fontSize: 13, fontWeight: '600', color: COLORS.gold, fontFamily: FONTS.bodySemi },
});