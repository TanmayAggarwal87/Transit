import React from 'react';
import { View, Text } from 'react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { styles } from './styles';
import { TouchableOpacity } from 'react-native-gesture-handler';

export const InProgressState = ({ setRideState, bottomSheetRef }: any) => (
  <Animated.View entering={FadeIn} exiting={FadeOut} style={{ flex: 1 }}>
    <BottomSheetScrollView bounces={false} contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16 }}>
      <View style={styles.assignedTopRow}>
        <View>
          <Text style={{ fontFamily: 'JetBrainsMono_500Medium', color: Colors.textPrimary, fontSize: 16 }}>Select Citywalk</Text>
          <Text style={{ fontFamily: 'JetBrainsMono_500Medium', color: Colors.textSecondary, fontSize: 12 }}>Saket, New Delhi</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.etaLarge}>8 min</Text>
        </View>
      </View>

      <View style={styles.inProgressTrackContainer}>
        <View style={styles.inProgressTrackFill} />
      </View>

      <Text style={[styles.sectionLabel, { marginTop: 24 }]}>ESTIMATED FARE</Text>
      <Text style={{ fontFamily: 'JetBrainsMono_500Medium', color: Colors.textPrimary, fontSize: 32 }}>₹ 164</Text>

      <View style={[styles.evBadgePill, { marginTop: 16 }]}>
        <Text style={styles.evBadgeText}>⚡ Driver battery: 79% · No charging needed</Text>
      </View>

      <TouchableOpacity style={[styles.secondaryBtn, { marginTop: 16 }]} onPress={() => { setRideState('completed'); bottomSheetRef.current?.snapToIndex(1); }}>
        <Ionicons name="checkmark-done" size={20} color={Colors.textPrimary} style={{ marginRight: 8 }} />
        <Text style={styles.secondaryBtnText}>End Demo Trip</Text>
      </TouchableOpacity>
    </BottomSheetScrollView>
  </Animated.View>
);
