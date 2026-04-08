import React from 'react';
import { View, Text } from 'react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { styles } from './styles';
import { TouchableOpacity } from 'react-native-gesture-handler';

export const AssignedState = ({ setRideState, bottomSheetRef }: any) => (
  <Animated.View entering={FadeIn} exiting={FadeOut} style={{ flex: 1 }}>
    <BottomSheetScrollView bounces={false} contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16 }}>

      {/* Partial View Content */}
      <View style={styles.assignedTopRow}>
        <View style={styles.driverProfileGroup}>
          <View style={styles.driverAvatarFallback}>
            <Ionicons name="person" size={24} color={Colors.textSecondary} />
          </View>
          <View>
            <Text style={styles.driverName}>Rahul K.</Text>
            <Text style={styles.driverRating}>4.91 ★</Text>
          </View>
        </View>

        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.etaLarge}>3 min</Text>
          <Text style={styles.vehicleDetailsText}>MH 01 AB 1234 · White i20</Text>
        </View>
      </View>

      <View style={styles.actionCircleRow}>
        <TouchableOpacity style={styles.actionCircle}>
          <Ionicons name="call" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionCircle}>
          <Ionicons name="chatbubble" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionCircle}>
          <Ionicons name="share" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.evBadgePill}>
        <Text style={styles.evBadgeText}><Ionicons name="flash-outline" size={18} color={"yellow"} /> 84% charge · Range: 38 km</Text>
      </View>

      <View style={styles.divider} />

      {/* Expanded View Content (visible if dragged up) */}
      <Text style={styles.sectionLabel}>TRIP SAFETY</Text>
      <TouchableOpacity style={styles.secondaryBtn}>
        <Ionicons name="share-social-outline" size={20} color={Colors.textPrimary} style={{ marginRight: 8 }} />
        <Text style={styles.secondaryBtnText}>Share trip status</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.secondaryBtn, { backgroundColor: Colors.surfaceSecondary }]} onPress={() => { setRideState('in_progress'); bottomSheetRef.current?.snapToIndex(0); }}>
        <Ionicons name="play-outline" size={20} color={Colors.textPrimary} style={{ marginRight: 8 }} />
        <Text style={styles.secondaryBtnText}>Mock: Start Trip</Text>
      </TouchableOpacity>

    </BottomSheetScrollView>
  </Animated.View>
);
