import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { styles } from './styles';
import { TouchableOpacity } from 'react-native-gesture-handler';

export const CompletedState = ({ setRideState, bottomSheetRef }: any) => {
  const [rating, setRating] = useState(0);

  return (
    <Animated.View entering={FadeIn} exiting={FadeOut} style={{ flex: 1 }}>
      <BottomSheetScrollView bounces={false} contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 120, alignItems: 'center' }}>

        <View style={styles.successCircleLarge}>
          <Ionicons name="checkmark" size={32} color={Colors.success} />
        </View>
        <Text style={{ fontFamily: 'JetBrainsMono_500Medium', color: Colors.textPrimary, fontSize: 24, marginTop: 16 }}>You've arrived</Text>
        <Text style={{ fontFamily: 'JetBrainsMono_500Medium', color: Colors.textSecondary, fontSize: 14 }}>Select Citywalk · 12:34 PM</Text>

        <View style={styles.fareBreakdownCard}>
          <Text style={{ fontFamily: 'JetBrainsMono_500Medium', color: Colors.textPrimary, fontSize: 40, textAlign: 'center', marginBottom: 16 }}>₹ 192</Text>
          <View style={styles.fareRow}>
            <Text style={{ fontFamily: 'JetBrainsMono_500Medium', color: Colors.textSecondary, fontSize: 14 }}>Base fare</Text>
            <Text style={{ fontFamily: 'JetBrainsMono_500Medium', color: Colors.textSecondary, fontSize: 14 }}>₹150</Text>
          </View>
          <View style={styles.fareRow}>
            <Text style={{ fontFamily: 'JetBrainsMono_500Medium', color: Colors.textSecondary, fontSize: 14 }}>Distance</Text>
            <Text style={{ fontFamily: 'JetBrainsMono_500Medium', color: Colors.textSecondary, fontSize: 14 }}>₹32</Text>
          </View>
          <View style={[styles.fareRow, { borderBottomWidth: 0 }]}>
            <Text style={{ fontFamily: 'JetBrainsMono_500Medium', color: Colors.textSecondary, fontSize: 14 }}>Taxes</Text>
            <Text style={{ fontFamily: 'JetBrainsMono_500Medium', color: Colors.textSecondary, fontSize: 14 }}>₹10</Text>
          </View>
        </View>

        <Text style={[styles.sectionLabel, { marginTop: 24, marginBottom: 12 }]}>HOW WAS YOUR RIDE?</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24 }}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity key={star} onPress={() => setRating(star)}>
              <Ionicons name={star <= rating ? "star" : "star-outline"} size={40} color={star <= rating ? Colors.accent : Colors.textTertiary} />
            </TouchableOpacity>
          ))}
        </View>

        <Pressable style={styles.primaryCtaDone} onPress={() => { setRideState('idle'); bottomSheetRef.current?.snapToIndex(0); setRating(0); }}>
          <Text style={styles.primaryCtaDoneText}>Done</Text>
        </Pressable >

      </BottomSheetScrollView>
    </Animated.View>
  );
};
