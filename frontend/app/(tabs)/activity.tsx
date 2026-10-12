import React, { useState, useCallback, memo } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity } from 'react-native';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';

const FILTERS = ['All'];

const ItemSeparator = memo(() => <View style={{ height: 16 }} />);

type RideCardItem = { id: string; route: string; price: string; date: string; type: string; ev: boolean };
const RideCard = memo(({ item }: { item: RideCardItem }) => (
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
    </TouchableOpacity>
  </Animated.View>
));

const FilterItem = memo(({ item, isActive, onPress }: { item: string; isActive: boolean; onPress: (item: string) => void }) => (
  <TouchableOpacity 
    style={[styles.filterPill, isActive && styles.filterPillActive]} 
    onPress={() => onPress(item)}
  >
    <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>{item}</Text>
  </TouchableOpacity>
));

export default function ActivityScreen() {
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState('All');

  const handleFilterPress = useCallback((item: string) => {
    setActiveFilter(item);
  }, []);

  const renderRideCard = useCallback(({ item }: any) => (
    <RideCard item={item} />
  ), []);

  const renderFilterItem = useCallback(({ item }: { item: string }) => (
    <FilterItem item={item} isActive={activeFilter === item} onPress={handleFilterPress} />
  ), [activeFilter, handleFilterPress]);

  const filterKeyExtractor = useCallback((i: string) => i, []);
  const historyKeyExtractor = useCallback((item: RideCardItem) => item.id, []);

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
          keyExtractor={filterKeyExtractor}
          contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 16 }}
          renderItem={renderFilterItem}
        />
      </View>

      <FlatList
        data={[] as RideCardItem[]}
        keyExtractor={historyKeyExtractor}
        renderItem={renderRideCard}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }}
        ItemSeparatorComponent={ItemSeparator}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={5}
        removeClippedSubviews={true}
        ListEmptyComponent={<View style={styles.emptyState}><Ionicons name="time-outline" size={30} color={Colors.textTertiary} /><Text style={styles.emptyTitle}>No ride history available</Text><Text style={styles.emptyMessage}>Ride history will appear here when it is available.</Text></View>}
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
  emptyState: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 64 },
  emptyTitle: { fontFamily: 'JetBrainsMono_500Medium', fontSize: 15, color: Colors.textPrimary, marginTop: 14 },
  emptyMessage: { fontFamily: 'JetBrainsMono_500Medium', fontSize: 12, lineHeight: 18, color: Colors.textSecondary, textAlign: 'center', marginTop: 8 },
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
