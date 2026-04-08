import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';

export default function WalletScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Payments</Text>
      </View>

      <Animated.ScrollView entering={FadeIn.delay(100)} contentContainerStyle={styles.content}>
        
        {/* Transit Cash Banner */}
        <View style={styles.transitCashCard}>
          <View style={styles.cashTopRow}>
            <View>
              <Text style={styles.cashLabel}>Transit Credits</Text>
              <Text style={styles.cashAmount}>₹ 200.00</Text>
            </View>
            <View style={styles.walletIconBox}>
              <Ionicons name="wallet" size={24} color={Colors.surfacePrimary} />
            </View>
          </View>
          <TouchableOpacity style={styles.cashBtn}>
            <Text style={styles.cashBtnText}>Add funds</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>PAYMENT METHODS</Text>
        <View style={styles.methodsCard}>
          
          <TouchableOpacity style={styles.listItem}>
            <View style={styles.iconCircle}>
              <Ionicons name="card" size={20} color={Colors.textSecondary} />
            </View>
            <View style={styles.listTextContent}>
              <Text style={styles.listTitle}>Visa</Text>
              <Text style={styles.listSubtitle}>•••• 4242</Text>
            </View>
            <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.listItem}>
            <View style={styles.iconCircle}>
              <Ionicons name="layers" size={20} color={Colors.textSecondary} />
            </View>
            <View style={styles.listTextContent}>
              <Text style={styles.listTitle}>UPI</Text>
              <Text style={styles.listSubtitle}>example@upi</Text>
            </View>
          </TouchableOpacity>

        </View>

        <TouchableOpacity style={styles.addGhostBtn}>
          <Ionicons name="add" size={20} color={Colors.accent} style={{ marginRight: 8 }} />
          <Text style={styles.addGhostText}>Add payment method</Text>
        </TouchableOpacity>

        <Text style={[styles.sectionLabel, { marginTop: 32 }]}>BUSINESS ACCOUNTS</Text>
        <TouchableOpacity style={styles.businessCard}>
          <Ionicons name="briefcase-outline" size={24} color={Colors.textSecondary} style={{ marginRight: 16 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.listTitle}>Set up a business profile</Text>
            <Text style={styles.listSubtitle}>Separate work and personal rides</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
        </TouchableOpacity>

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
