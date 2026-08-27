import React, { memo, useState } from 'react';
import { View, Text } from 'react-native';
import { BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { styles } from './styles';
import { TouchableOpacity } from 'react-native-gesture-handler';

interface SearchStateProps {
  setRideState: (state: any) => void;
  bottomSheetRef: any;
  pickupAddress: string;
  onSelectDestination?: (dest: { address: string; lat: number; lng: number }) => void;
}

const RECENT_DESTINATIONS = [
  {
    id: '1',
    title: 'Sector 62, Noida',
    subtitle: 'Noida, Uttar Pradesh',
    lat: 28.5355,
    lng: 77.3910,
    distance: '22.4 km',
  },
  {
    id: '2',
    title: 'Select Citywalk',
    subtitle: 'Saket, New Delhi',
    lat: 28.5285,
    lng: 77.2193,
    distance: '4.2 km',
  },
  {
    id: '3',
    title: 'Airport Terminal 3',
    subtitle: 'Indira Gandhi Intl, New Delhi',
    lat: 28.5562,
    lng: 77.1000,
    distance: '15.8 km',
  },
];

export const SearchState = memo(({
  setRideState,
  bottomSheetRef,
  pickupAddress,
  onSelectDestination,
}: SearchStateProps) => {
  const [query, setQuery] = useState('');

  const handleSelect = (dest: { address: string; lat: number; lng: number }) => {
    if (onSelectDestination) {
      onSelectDestination(dest);
    }
    setRideState('options');
  };

  const handleCustomSubmit = () => {
    if (!query.trim()) return;
    handleSelect({
      address: query.trim(),
      lat: 28.5355,
      lng: 77.3910,
    });
  };

  return (
    <Animated.View entering={FadeIn} exiting={FadeOut} style={{ flex: 1 }}>
      <View style={styles.sheetHeader}>
        <TouchableOpacity
          onPress={() => {
            setRideState('idle');
            bottomSheetRef.current?.snapToIndex(0);
          }}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchInputsContainer}>
        {/* Origin */}
        <View style={styles.inputRow}>
          <View style={[styles.searchIndicator, { backgroundColor: Colors.textSecondary }]} />
          <BottomSheetTextInput
            style={styles.locationInput}
            value={pickupAddress || 'Connaught Place, New Delhi'}
            editable={false}
          />
        </View>
        {/* Connecting Line */}
        <View style={styles.searchConnectionLine} />
        {/* Destination */}
        <View style={[styles.inputRow, { marginTop: 16 }]}>
          <View style={[styles.searchIndicator, { borderRadius: 2 }]} />
          <BottomSheetTextInput
            style={[styles.locationInput, styles.locationInputActive]}
            placeholder="Where to?"
            placeholderTextColor={Colors.textTertiary}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleCustomSubmit}
            returnKeyType="search"
            autoFocus={true}
          />
        </View>
      </View>

      <BottomSheetScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16 }}>
        <Text style={styles.sectionLabel}>RECENT SEARCHES</Text>
        {RECENT_DESTINATIONS.map((item, index) => (
          <React.Fragment key={item.id}>
            <TouchableOpacity
              style={styles.recentItem}
              onPress={() =>
                handleSelect({
                  address: `${item.title}, ${item.subtitle}`,
                  lat: item.lat,
                  lng: item.lng,
                })
              }
            >
              <View style={styles.recentIcon}>
                <Ionicons name="time-outline" size={16} color={Colors.textSecondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.recentTitle}>{item.title}</Text>
                <Text style={styles.recentSubtitle}>{item.subtitle}</Text>
              </View>
              <Text style={styles.distanceText}>{item.distance}</Text>
            </TouchableOpacity>
            {index < RECENT_DESTINATIONS.length - 1 && <View style={styles.divider} />}
          </React.Fragment>
        ))}
      </BottomSheetScrollView>
    </Animated.View>
  );
});
