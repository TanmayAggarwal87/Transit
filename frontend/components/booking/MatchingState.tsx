import React from 'react';
import { View, Text } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Colors } from '@/constants/theme';
import { styles } from './styles';
import { TouchableOpacity } from 'react-native-gesture-handler';

export const MatchingState = ({ setRideState, bottomSheetRef }: any) => (
  <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.sheetContent}>
    <Text style={styles.matchingHeading}>Finding your driver...</Text>
    <View style={styles.dotContainer}>
      <View style={styles.pulseDot} />
      <View style={[styles.pulseDot, { opacity: 0.6 }]} />
      <View style={[styles.pulseDot, { opacity: 0.3 }]} />
    </View>
    <Text style={styles.matchingSubtext}>Usually under 2 minutes</Text>

    <TouchableOpacity style={styles.cancelGhostBtn} onPress={() => { setRideState('idle'); bottomSheetRef.current?.snapToIndex(0); }}>
      <Text style={styles.cancelGhostText}>Cancel ride</Text>
    </TouchableOpacity>
  </Animated.View>
);
