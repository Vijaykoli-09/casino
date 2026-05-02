import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, StatusBar, ActivityIndicator,
  Alert,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { COLORS, FONTS } from '../constants/theme';
import { getAllAdmins, searchAdmins, createAdmin, logout } from '../services/api';
import { Storage } from '../services/storage';

type Props = NativeStackScreenProps<RootStackParamList, 'SuperAdmin'>;

interface Admin {
  id: number;
  username: string;
  balance: number;
  role: string;
  createdAt: string;
}

type Tab = 'admins' | 'create';

export default function SuperAdminScreen({ navigation }: Props) {
  const [tab,         setTab]         = useState<Tab>('admins');
  const [admins,      setAdmins]      = useState<Admin[]>([]);
  const [filtered,    setFiltered]    = useState<Admin[]>([]);
  const [search,      setSearch]      = useState('');
  const [loading,     setLoading]     = useState(true);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [creating,    setCreating]    = useState(false);

  const fetchAdmins = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAllAdmins();
      setAdmins(data);
      setFiltered(data);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Could not load admins');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAdmins(); }, [fetchAdmins]);

  // Live search
  useEffect(() => {
    const q = search.toLowerCase().trim();
    setFiltered(
      q ? admins.filter(a => a.username.toLowerCase().includes(q)) : admins
    );
  }, [search, admins]);

  const handleCreate = async () => {
    if (!newUsername.trim() || !newPassword.trim()) {
      Alert.alert('Error', 'Username and password required');
      return;
    }
    setCreating(true);
    try {
      await createAdmin({
        username: newUsername.trim(),
        password: newPassword.trim(),
      });
      Alert.alert('Success', `Admin "${newUsername}" created`);
      setNewUsername('');
      setNewPassword('');
      setTab('admins');
      fetchAdmins();
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to create admin');
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
        <View style={s.headerLeft}>
          <View style={s.headerIcon}>
            <Text style={s.headerIconText}>♛</Text>
          </View>
          <View>
            <Text style={s.headerTitle}>Super Admin</Text>
            <Text style={s.headerSub}>ROYALE CASINO</Text>
          </View>
        </View>
        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
          <Text style={s.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Stats bar */}
      <View style={s.statsBar}>
        <View style={s.statItem}>
          <Text style={s.statValue}>{admins.length}</Text>
          <Text style={s.statLabel}>Total Admins</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.statItem}>
          <Text style={s.statValue}>
            {admins.reduce((sum) => sum, 0)}
          </Text>
          <Text style={s.statLabel}>Total Players</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={s.tabs}>
        {(['admins', 'create'] as Tab[]).map(t => (
          <TouchableOpacity
            key={t}
            style={[s.tab, tab === t && s.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[s.tabText, tab === t && s.tabTextActive]}>
              {t === 'admins'
                ? `All Admins (${admins.length})`
                : '+ Create Admin'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ADMINS TAB */}
      {tab === 'admins' && (
        <>
          <View style={s.searchWrap}>
            <Text style={s.searchIcon}>🔍</Text>
            <TextInput
              style={s.searchInput}
              placeholder="Search admin by username..."
              placeholderTextColor="rgba(255,255,255,0.2)"
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Text style={s.searchClear}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {loading ? (
            <View style={s.loader}>
              <ActivityIndicator color={COLORS.gold} size="large" />
            </View>
          ) : filtered.length === 0 ? (
            <View style={s.empty}>
              <Text style={s.emptyIcon}>👤</Text>
              <Text style={s.emptyText}>
                {search ? 'No admins match your search' : 'No admins yet'}
              </Text>
              <TouchableOpacity
                style={s.emptyBtn}
                onPress={() => setTab('create')}
              >
                <Text style={s.emptyBtnText}>Create First Admin</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={a => a.id.toString()}
              contentContainerStyle={s.list}
              renderItem={({ item: a }) => (
                <TouchableOpacity
                  style={s.adminCard}
                  activeOpacity={0.75}
                  onPress={() => navigation.navigate('SuperAdminDetail', {
                    adminId:  a.id,
                    username: a.username,
                  })}
                >
                  <View style={s.adminAvatar}>
                    <Text style={s.adminAvatarText}>{initials(a.username)}</Text>
                  </View>
                  <View style={s.adminInfo}>
                    <Text style={s.adminName}>{a.username}</Text>
                    <Text style={s.adminMeta}>
                      Admin • Since{' '}
                      {new Date(a.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </Text>
                  </View>
                  <View style={s.adminRight}>
                    <Text style={s.chevron}>›</Text>
                  </View>
                </TouchableOpacity>
              )}
              onRefresh={fetchAdmins}
              refreshing={loading}
            />
          )}
        </>
      )}

      {/* CREATE TAB */}
      {tab === 'create' && (
        <View style={s.createForm}>
          <View style={s.createHeader}>
            <Text style={s.createTitle}>New Admin Account</Text>
            <Text style={s.createSub}>
              Admin can create and manage players
            </Text>
          </View>

          <Text style={s.inputLabel}>USERNAME</Text>
          <TextInput
            style={s.input}
            placeholder="admin_username"
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

          <TouchableOpacity
            style={[s.createBtn, creating && { opacity: 0.6 }]}
            onPress={handleCreate}
            disabled={creating}
            activeOpacity={0.85}
          >
            <Text style={s.createBtnText}>
              {creating ? 'Creating...' : '+ Create Admin'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#0A0F0A' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16, paddingTop: 50,
    backgroundColor: 'rgba(201,168,76,0.06)',
    borderBottomWidth: 0.5, borderBottomColor: 'rgba(201,168,76,0.2)',
  },
  headerLeft:     { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIcon: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: 'rgba(201,168,76,0.15)',
    borderWidth: 0.5, borderColor: 'rgba(201,168,76,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerIconText: { fontSize: 18, color: COLORS.gold },
  headerTitle: {
    fontFamily: FONTS.displayBold, fontSize: 18, color: COLORS.gold,
  },
  headerSub: {
    fontSize: 9, color: COLORS.textMuted,
    letterSpacing: 1, fontFamily: FONTS.body,
  },
  logoutBtn: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 0.5, borderColor: COLORS.border, borderRadius: 7,
  },
  logoutText:     { fontSize: 11, color: COLORS.textMuted, fontFamily: FONTS.bodyMed },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(201,168,76,0.04)',
    borderBottomWidth: 0.5, borderBottomColor: 'rgba(201,168,76,0.1)',
    paddingVertical: 12,
  },
  statItem:       { flex: 1, alignItems: 'center', gap: 2 },
  statValue: {
    fontFamily: FONTS.displayBold, fontSize: 22, color: COLORS.gold,
  },
  statLabel:      { fontSize: 10, color: COLORS.textMuted, letterSpacing: 0.5 },
  statDivider: {
    width: 0.5, backgroundColor: 'rgba(201,168,76,0.2)',
    marginVertical: 4,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 0.5, borderBottomColor: 'rgba(201,168,76,0.15)',
  },
  tab: {
    flex: 1, paddingVertical: 12, alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive:      { borderBottomColor: COLORS.gold },
  tabText:        { fontSize: 12, color: COLORS.textMuted, fontFamily: FONTS.bodyMed },
  tabTextActive:  { color: COLORS.gold },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    margin: 12, paddingHorizontal: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 0.5, borderColor: 'rgba(201,168,76,0.2)',
    borderRadius: 10, gap: 8,
  },
  searchIcon:     { fontSize: 14, color: COLORS.textMuted },
  searchInput: {
    flex: 1, paddingVertical: 11,
    color: COLORS.text, fontSize: 13, fontFamily: FONTS.body,
  },
  searchClear:    { fontSize: 12, color: COLORS.textMuted, padding: 4 },
  loader:         { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  emptyIcon:      { fontSize: 40 },
  emptyText:      { fontSize: 14, color: COLORS.textMuted, fontFamily: FONTS.body },
  emptyBtn: {
    paddingHorizontal: 20, paddingVertical: 10,
    backgroundColor: 'rgba(201,168,76,0.15)',
    borderWidth: 0.5, borderColor: 'rgba(201,168,76,0.4)',
    borderRadius: 8,
  },
  emptyBtnText:   { color: COLORS.gold, fontSize: 13, fontFamily: FONTS.bodyMed },
  list:           { padding: 12, gap: 8 },
  adminCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 0.5, borderColor: 'rgba(201,168,76,0.12)',
    borderRadius: 12, padding: 14,
  },
  adminAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(201,168,76,0.15)',
    borderWidth: 1, borderColor: 'rgba(201,168,76,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  adminAvatarText: {
    fontWeight: '700', color: COLORS.gold,
    fontSize: 15, fontFamily: FONTS.bodySemi,
  },
  adminInfo:      { flex: 1 },
  adminName: {
    fontSize: 14, color: COLORS.text,
    fontFamily: FONTS.bodyMed, marginBottom: 3,
  },
  adminMeta:      { fontSize: 11, color: COLORS.textMuted, fontFamily: FONTS.body },
  adminRight:     { alignItems: 'flex-end', gap: 4 },
  chevron:        { fontSize: 24, color: COLORS.textMuted },
  createForm:     { padding: 20, gap: 10 },
  createHeader:   { gap: 4, marginBottom: 8 },
  createTitle: {
    fontSize: 16, color: COLORS.gold,
    fontFamily: FONTS.bodySemi, letterSpacing: 0.5,
  },
  createSub:      { fontSize: 11, color: COLORS.textMuted, fontFamily: FONTS.body },
  inputLabel: {
    fontSize: 10, color: COLORS.textMuted,
    letterSpacing: 1.5, fontFamily: FONTS.bodyMed,
  },
  input: {
    padding: 13, paddingHorizontal: 14,
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
  createBtnText: {
    fontSize: 14, fontWeight: '600',
    color: COLORS.gold, fontFamily: FONTS.bodySemi,
  },
});