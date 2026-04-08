import React from 'react';
import { View, Text, TouchableOpacity as RNTouchableOpacity } from 'react-native';
import { BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { styles } from './styles';
import { TouchableOpacity } from 'react-native-gesture-handler';

export const SearchState = ({ setRideState, bottomSheetRef }: any) => (
  <Animated.View entering={FadeIn} exiting={FadeOut} style={{ flex: 1 }}>
    <View style={styles.sheetHeader}>
      <TouchableOpacity onPress={() => { setRideState('idle'); bottomSheetRef.current?.snapToIndex(0); }} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color={Colors.textSecondary} />
      </TouchableOpacity>
    </View>

    <View style={styles.searchInputsContainer}>
      {/* Origin */}
      <View style={styles.inputRow}>
        <View style={[styles.searchIndicator, { backgroundColor: Colors.textSecondary }]} />
        <BottomSheetTextInput
          style={styles.locationInput}
          value="Your location"
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
          autoFocus={true}
        />
      </View>
    </View>

    <BottomSheetScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16 }}>
      <Text style={styles.sectionLabel}>RECENT SEARCHES</Text>
      <TouchableOpacity style={styles.recentItem} onPress={() => setRideState('options')}>
        <View style={styles.recentIcon}>
          <Ionicons name="time-outline" size={16} color={Colors.textSecondary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.recentTitle}>Select Citywalk</Text>
          <Text style={styles.recentSubtitle}>Saket, New Delhi</Text>
        </View>
        <Text style={styles.distanceText}>4.2 km</Text>
      </TouchableOpacity>
      <View style={styles.divider} />
    </BottomSheetScrollView>
  </Animated.View>
);
