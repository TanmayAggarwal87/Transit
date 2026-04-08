import React from 'react';
import { View, Text } from 'react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { styles } from './styles';
import { TouchableOpacity } from 'react-native-gesture-handler';

export const OptionsState = ({ setRideState }: any) => (
  <Animated.View entering={FadeIn} exiting={FadeOut} style={{ flex: 1 }}>
    <View style={[styles.sheetHeader, { paddingHorizontal: 24, paddingVertical: 12, justifyContent: 'space-between' }]}>
      <TouchableOpacity onPress={() => setRideState('search')} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color={Colors.textSecondary} />
      </TouchableOpacity>
      <Text style={styles.routeSummaryText}>Current Location → Select Citywalk</Text>
      <Text style={styles.etaBadge}>12 min</Text>
    </View>

    <BottomSheetScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}>

      {/* Options */}
      <TouchableOpacity style={styles.rideCard}>
        <View style={styles.rideCardLeft}>
          <Ionicons name="car-outline" size={32} color={Colors.textSecondary} />
          <View style={{ marginLeft: 16 }}>
            <Text style={styles.rideName}>Transit Go</Text>
            <Text style={styles.rideDesc}>Everyday rides</Text>
          </View>
        </View>
        <Text style={styles.ridePrice}>₹180</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.rideCard, styles.rideCardSelected]}>
        <View style={styles.rideCardLeft}>
          <Ionicons name="flash-outline" size={32} color={Colors.accent} />
          <View style={{ marginLeft: 16 }}>
            <Text style={styles.rideName}>Transit EV</Text>
            <Text style={styles.rideDesc}>⚡ 0 emissions</Text>
          </View>
        </View>
        <Text style={[styles.ridePrice, { color: Colors.accent }]}>₹210</Text>
      </TouchableOpacity>

      {/* AI Banner */}
      <View style={styles.aiBanner}>
        <Text style={styles.aiBannerText}>Demand is low right now · Prices 18% below average</Text>
      </View>

      {/* CTA */}
      <TouchableOpacity style={styles.primaryCta} onPress={() => setRideState('matching')}>
        <Text style={styles.primaryCtaText}>Book Transit EV · ₹210</Text>
      </TouchableOpacity>
    </BottomSheetScrollView>
  </Animated.View>
);
