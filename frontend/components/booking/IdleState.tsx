import React from 'react';
import { View, Text } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { styles } from './styles';

export const IdleState = ({ setRideState, bottomSheetRef }: any) => (
  <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.sheetContent}>
    <TouchableOpacity style={styles.searchBar} activeOpacity={0.8} onPress={() => { setRideState('search'); bottomSheetRef.current?.snapToIndex(1); }}>
      <View style={styles.searchIndicator} />
      <Text style={styles.searchText}>Where to?</Text>
    </TouchableOpacity>

    <View style={styles.quickActions}>
      <TouchableOpacity style={styles.quickPill}>
        <Ionicons name="home" size={18} color={Colors.textSecondary} />
        <Text style={styles.quickPillText}>Home</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.quickPill}>
        <Ionicons name="briefcase" size={18} color={Colors.textSecondary} />
        <Text style={styles.quickPillText}>Work</Text>
      </TouchableOpacity>
    </View>

    <View style={styles.recentSection}>
      <TouchableOpacity style={styles.recentItem} onPress={() => setRideState('options')}>
        <View style={styles.recentIcon}>
          <Ionicons name="location-outline" size={16} color={Colors.textSecondary} />
        </View>
        <View>
          <Text style={styles.recentTitle}>Airport Terminal 3</Text>
          <Text style={styles.recentSubtitle}>Indira Gandhi Intl</Text>
        </View>
      </TouchableOpacity>
      <View style={styles.divider} />
      <TouchableOpacity style={styles.recentItem} onPress={() => setRideState('options')}>
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
