import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useAuthStore } from '@/store/auth';
import { deletePaymentMethod, getApiMessage, getPaymentHistory, getPaymentMethods, PaymentHistoryItem, PaymentMethod, setDefaultPaymentMethod } from '@/lib/account';
import { useFocusEffect } from 'expo-router';

export default function WalletScreen() {
  const insets = useSafeAreaInsets();
  const token = useAuthStore((state) => state.accessToken);
  const [methods, setMethods] = React.useState<PaymentMethod[]>([]);
  const [history, setHistory] = React.useState<PaymentHistoryItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);
  const load = React.useCallback(async (refresh = false) => {
    if (!token) { setLoading(false); setError('Sign in to view your payment information.'); return; }
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [nextMethods, nextHistory] = await Promise.all([getPaymentMethods(token), getPaymentHistory(token)]);
      setMethods(nextMethods); setHistory(nextHistory.items ?? []);
    } catch (e) { setError(getApiMessage(e, 'Could not load payment information.')); }
    finally { setLoading(false); setRefreshing(false); }
  }, [token]);
  useFocusEffect(React.useCallback(() => { void load(); }, [load]));
  const chooseDefault = (method: PaymentMethod) => Alert.alert('Default payment method', 'Use this method for future rides?', [
    { text: 'Cancel', style: 'cancel' }, { text: 'Set default', onPress: async () => {
      if (!token) return;
      try { await setDefaultPaymentMethod(token, method.id); await load(true); }
      catch (e) { Alert.alert('Could not update method', getApiMessage(e, 'Please try again.')); }
    } },
  ]);
  const removeMethod = (method: PaymentMethod) => Alert.alert('Remove payment method', 'This saved method will be removed from your account.', [
    { text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: async () => {
      if (!token) return;
      try { await deletePaymentMethod(token, method.id); await load(true); }
      catch (e) { Alert.alert('Could not remove method', getApiMessage(e, 'Please try again.')); }
    } },
  ]);
  const methodName = (method: PaymentMethod) => method.type === 'card' ? `${method.brand || 'Card'}${method.last4 ? ` •••• ${method.last4}` : ''}` : method.type.toUpperCase();
  const amount = (paise: string | number) => `₹${(Number(paise) / 100).toFixed(2)}`;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Payments</Text>
      </View>

      <Animated.ScrollView entering={FadeIn.delay(100)} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={Colors.accent} />}>
        
        {/* Transit Cash Banner */}
        <Text style={styles.sectionLabel}>PAYMENT METHODS</Text>
        <View style={styles.methodsCard}>
          {loading ? <ActivityIndicator color={Colors.accent} style={{ padding: 20 }} /> : methods.length === 0 ? <Text style={styles.emptyText}>No saved payment methods</Text> : methods.map((method, index) => <React.Fragment key={method.id}>
          {index > 0 && <View style={styles.divider} />}
          <TouchableOpacity style={styles.listItem} onPress={() => chooseDefault(method)} onLongPress={() => removeMethod(method)}>
            <View style={styles.iconCircle}>
              <Ionicons name={method.type === 'upi' ? 'qr-code' : 'card'} size={20} color={Colors.textSecondary} />
            </View>
            <View style={styles.listTextContent}>
              <Text style={styles.listTitle}>{methodName(method)}</Text>
              <Text style={styles.listSubtitle}>{method.isDefault ? 'Default · Long press to remove' : 'Tap to set as default · Long press to remove'}</Text>
            </View>
            {method.isDefault && <Ionicons name="checkmark-circle" size={20} color={Colors.success} />}
          </TouchableOpacity>
          </React.Fragment>)}
        </View>
        {error && <Text style={styles.errorText}>{error}</Text>}
        <Text style={[styles.sectionLabel, { marginTop: 32 }]}>PAYMENT HISTORY</Text>
        <View style={styles.methodsCard}>
          {loading ? <ActivityIndicator color={Colors.accent} style={{ padding: 20 }} /> : history.length === 0 ? <Text style={styles.emptyText}>No payments yet</Text> : history.map((item, index) => <React.Fragment key={item.id}>{index > 0 && <View style={styles.divider} />}<View style={styles.listItem}>
            <View style={styles.iconCircle}><Ionicons name="receipt-outline" size={20} color={Colors.textSecondary} /></View>
            <View style={styles.listTextContent}><Text style={styles.listTitle}>{amount(item.amountPaise)}</Text><Text style={styles.listSubtitle}>{new Date(item.createdAt).toLocaleDateString()} · {item.status}</Text></View>
            <Text style={styles.listSubtitle}>Ride</Text>
          </View></React.Fragment>)}
        </View>

      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surfacePrimary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  headerTitle: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 20,
    color: Colors.textPrimary,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 100, // Account for tabs
  },
  transitCashCard: {
    backgroundColor: Colors.accent,
    borderRadius: 16,
    padding: 24,
    marginBottom: 32,
  },
  cashTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  cashLabel: {
    fontFamily: 'JetBrainsMono_500Medium',
    color: 'rgba(10, 10, 15, 0.7)',
    fontSize: 14,
    marginBottom: 4,
  },
  cashAmount: {
    fontFamily: 'JetBrainsMono_500Medium',
    color: Colors.surfacePrimary,
    fontSize: 32,
  },
  walletIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(10, 10, 15, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cashBtn: {
    backgroundColor: Colors.surfacePrimary,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cashBtnText: {
    fontFamily: 'JetBrainsMono_500Medium',
    color: Colors.textPrimary,
    fontSize: 14,
  },
  sectionLabel: {
    fontFamily: 'JetBrainsMono_500Medium',
    color: Colors.textTertiary,
    fontSize: 10,
    letterSpacing: 1,
    marginBottom: 12,
    marginLeft: 8,
  },
  methodsCard: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    overflow: 'hidden',
  },
  emptyText: { color: Colors.textSecondary, fontFamily: 'JetBrainsMono_500Medium', fontSize: 13, padding: 18 },
  errorText: { color: Colors.destructive, fontFamily: 'JetBrainsMono_500Medium', fontSize: 12, marginTop: 12 },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceTertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  listTextContent: {
    flex: 1,
  },
  listTitle: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 16,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  listSubtitle: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 12,
    color: Colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderSubtle,
    marginLeft: 72,
  },
  addGhostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    marginLeft: 8,
  },
  addGhostText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 14,
    color: Colors.accent,
  },
  businessCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: 16,
  }
});
