import React, { useState } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Image } from 'react-native';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

const FILTERS = ['All', 'This month', 'Last 3 months', 'EV Rides', 'Shared'];

const MOCK_HISTORY = [
  { id: '1', route: 'Cyber Hub → Saket', price: '₹192', date: '24 May · 12:34 PM', type: 'Transit EV', ev: true, saved: 'Saved ₹28 · Low demand' },
  { id: '2', route: 'Airport T3 → Vasant Kunj', price: '₹340', date: '21 May · 08:15 AM', type: 'Transit Go', ev: false },
  { id: '3', route: 'Connaught Place → Cyber Hub', price: '₹410', date: '18 May · 06:45 PM', type: 'Transit Comfort', ev: false },
  { id: '4', route: 'GK II → Select Citywalk', price: '₹95', date: '12 May · 02:20 PM', type: 'Transit EV', ev: true, saved: 'Saved ₹14 · Low demand' },
  { id: '5', route: 'Saket → Hauz Khas', price: '₹120', date: '04 May · 09:10 PM', type: 'Transit Share', ev: false },
];

export default function ActivityScreen() {
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState('All');

  const renderRideCard = ({ item }: any) => (
    <Animated.View entering={FadeIn} style={styles.card}>
      <TouchableOpacity activeOpacity={0.8} style={styles.cardInner}>
        <View style={styles.cardTop}>
          <Text style={styles.routeText} numberOfLines={1}>{item.route}</Text>
          <Text style={styles.priceText}>{item.price}</Text>
        </View>
        <View style={styles.cardMiddle}>
          <Text style={styles.dateText}>{item.date}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {item.ev && <Text style={styles.evPrefix}>⚡ </Text>}
            <Text style={styles.typeText}>{item.type}</Text>
          </View>
        </View>
        {item.saved && (
          <View style={styles.savingsRow}>
            <View style={styles.savingsTrack} />
            <Text style={styles.savingsText}>{item.saved}</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Ride History</Text>
      </View>

      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={FILTERS}
          keyExtractor={(i) => i}
          contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 16 }}
          renderItem={({ item }) => {
            const isActive = activeFilter === item;
            return (
              <TouchableOpacity 
                style={[styles.filterPill, isActive && styles.filterPillActive]} 
                onPress={() => setActiveFilter(item)}
              >
                <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>{item}</Text>
              </TouchableOpacity>
            )
          }}
        />
      </View>

      <FlatList
        data={MOCK_HISTORY}
        keyExtractor={(item) => item.id}
        renderItem={renderRideCard}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }}
        ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
      />
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
  },
  headerTitle: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 20,
    color: Colors.textPrimary,
  },
  filterContainer: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
    marginBottom: 16,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: Colors.surfaceSecondary,
  },
  filterPillActive: {
    backgroundColor: Colors.surfaceTertiary,
    borderColor: Colors.borderActive,
  },
  filterPillText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 14,
    color: Colors.textSecondary,
  },
  filterPillTextActive: {
    color: Colors.textPrimary,
  },
  card: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  cardInner: {
    padding: 16,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  routeText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 16,
    color: Colors.textPrimary,
    flex: 1,
    marginRight: 16,
  },
  priceText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 18,
    color: Colors.textPrimary,
  },
  cardMiddle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 12,
    color: Colors.textSecondary,
  },
  typeText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 12,
    color: Colors.textSecondary,
  },
  evPrefix: {
    fontSize: 12,
  },
  savingsRow: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
  },
  savingsTrack: {
    position: 'absolute',
    top: 16,
    left: 0,
    height: 2,
    width: '40%',
    backgroundColor: Colors.success,
    borderRadius: 1,
  },
  savingsText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 12,
    color: Colors.success,
    marginTop: 8,
  }
});
