import React, { memo } from 'react';
import { View, Text } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { styles } from './styles';

interface IdleStateProps {
  setRideState: (state: any) => void;
  bottomSheetRef: any;
  onSelectDestination?: (dest: { address: string; lat: number; lng: number }) => void;
}

export const IdleState = memo(({ setRideState, bottomSheetRef, onSelectDestination }: IdleStateProps) => {
  const handleSelect = (dest: { address: string; lat: number; lng: number }) => {
    if (onSelectDestination) {
      onSelectDestination(dest);
    }
    setRideState('options');
  };

  return (
    <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.sheetContent}>
      <TouchableOpacity
        style={styles.searchBar}
        activeOpacity={0.8}
        onPress={() => {
          setRideState('search');
          bottomSheetRef.current?.snapToIndex(1);
        }}
      >
        <View style={styles.searchIndicator} />
        <Text style={styles.searchText}>Where to?</Text>
      </TouchableOpacity>

      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.quickPill}
          onPress={() =>
            handleSelect({ address: 'Home (Connaught Place)', lat: 28.6139, lng: 77.2090 })
          }
        >
          <Ionicons name="home" size={18} color={Colors.textSecondary} />
          <Text style={styles.quickPillText}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickPill}
          onPress={() =>
            handleSelect({ address: 'Cyber Hub, Gurugram', lat: 28.4950, lng: 77.0895 })
          }
        >
          <Ionicons name="briefcase" size={18} color={Colors.textSecondary} />
          <Text style={styles.quickPillText}>Work</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.recentSection}>
        <TouchableOpacity
          style={styles.recentItem}
          onPress={() =>
            handleSelect({ address: 'Airport Terminal 3, New Delhi', lat: 28.5562, lng: 77.1000 })
          }
        >
          <View style={styles.recentIcon}>
            <Ionicons name="location-outline" size={16} color={Colors.textSecondary} />
          </View>
          <View>
            <Text style={styles.recentTitle}>Airport Terminal 3</Text>
            <Text style={styles.recentSubtitle}>Indira Gandhi Intl</Text>
          </View>
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity
          style={styles.recentItem}
          onPress={() =>
            handleSelect({ address: 'Cyber Hub, Gurugram', lat: 28.4950, lng: 77.0895 })
          }
        >
          <View style={styles.recentIcon}>
            <Ionicons name="location-outline" size={16} color={Colors.textSecondary} />
          </View>
          <View>
            <Text style={styles.recentTitle}>Cyber Hub</Text>
            <Text style={styles.recentSubtitle}>Gurugram</Text>
          </View>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
});
