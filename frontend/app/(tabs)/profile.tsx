import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Switch, Image } from 'react-native';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const [preferEV, setPreferEV] = React.useState(true);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Animated.ScrollView 
        entering={FadeIn.delay(100)} 
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }}
      >
        {/* Header Section */}
        <View style={styles.headerArea}>
          <View style={styles.avatarContainer}>
            <Ionicons name="person" size={40} color={Colors.textTertiary} />
          </View>
          <Text style={styles.userName}>Rahul K.</Text>
          <Text style={styles.userPhone}>+91 98765 43210</Text>
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingBadgeText}>⭐ 4.94 · 52 trips</Text>
          </View>
        </View>

        {/* Transit Intelligence Analytics Profile Banner */}
        <View style={styles.insightCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Ionicons name="sparkles" size={16} color={Colors.accent} style={{ marginRight: 8 }} />
            <Text style={styles.insightHeader}>TRANSIT INTELLIGENCE</Text>
          </View>
          
          <Text style={styles.insightHeadline}>You've saved ₹340 by riding in low-demand windows this month.</Text>
          
          <View style={styles.evToggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.evToggleLabel}>Prefer EV when available</Text>
            </View>
            <Switch
              trackColor={{ false: Colors.surfaceTertiary, true: 'rgba(0, 194, 255, 0.3)' }}
              thumbColor={preferEV ? Colors.accent : Colors.textTertiary}
              onValueChange={setPreferEV}
              value={preferEV}
            />
          </View>
        </View>

        {/* Account Defaults */}
        <Text style={styles.sectionLabel}>ACCOUNT</Text>
        <View style={styles.menuGroup}>
          <MenuItem icon="pencil-outline" title="Edit profile" />
          <MenuItem icon="location-outline" title="Saved places" />
          <MenuItem icon="shield-outline" title="Emergency contact" />
          <MenuItem icon="notifications-outline" title="Notification preferences" />
        </View>

        {/* Payments defaults */}
        <Text style={styles.sectionLabel}>PAYMENTS</Text>
        <View style={styles.menuGroup}>
          <MenuItem icon="card-outline" title="Payment methods" value="Visa •••• 4242" />
          <MenuItem icon="wallet-outline" title="Transit credits" value="₹200" valueColor={Colors.success} />
        </View>

        {/* Support */}
        <Text style={styles.sectionLabel}>SUPPORT</Text>
        <View style={styles.menuGroup}>
          <MenuItem icon="help-buoy-outline" title="Help center" />
          <MenuItem icon="warning-outline" title="Report an issue" />
          <MenuItem icon="information-circle-outline" title="About Transit" value="v1.0.0" />
        </View>

        <TouchableOpacity style={styles.signOutBtn}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>

      </Animated.ScrollView>
    </View>
  );
}

const MenuItem = ({ icon, title, value, valueColor = Colors.textSecondary }: any) => (
  <TouchableOpacity style={styles.menuItem}>
    <Ionicons name={icon} size={22} color={Colors.textSecondary} style={{ marginRight: 16, width: 24 }} />
    <Text style={styles.menuItemTitle}>{title}</Text>
    {value && <Text style={[styles.menuItemValue, { color: valueColor }]}>{value}</Text>}
    <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surfacePrimary,
  },
  headerArea: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 32,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: Colors.borderActive,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  userName: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 24,
    color: Colors.textPrimary,
  },
  userPhone: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  ratingBadge: {
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 12,
  },
  ratingBadgeText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 12,
    color: Colors.textPrimary,
  },
  insightCard: {
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: 'rgba(0, 194, 255, 0.2)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
  },
  insightHeader: {
    fontFamily: 'JetBrainsMono_500Medium',
    color: Colors.accent,
    fontSize: 10,
    letterSpacing: 1,
  },
  insightHeadline: {
    fontFamily: 'JetBrainsMono_500Medium',
    color: Colors.textPrimary,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
  },
  evToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
    paddingTop: 16,
  },
  evToggleLabel: {
    fontFamily: 'JetBrainsMono_500Medium',
    color: Colors.textPrimary,
    fontSize: 14,
  },
  sectionLabel: {
    fontFamily: 'JetBrainsMono_500Medium',
    color: Colors.textTertiary,
    fontSize: 10,
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 8,
  },
  menuGroup: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 16,
    marginBottom: 32,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  menuItemTitle: {
    fontFamily: 'JetBrainsMono_500Medium',
    color: Colors.textPrimary,
    fontSize: 14,
    flex: 1,
  },
  menuItemValue: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 12,
    marginRight: 8,
  },
  signOutBtn: {
    alignItems: 'center',
    paddingVertical: 16,
    marginBottom: 24,
  },
  signOutText: {
    fontFamily: 'JetBrainsMono_500Medium',
    color: Colors.destructive,
    fontSize: 14,
  }
});
