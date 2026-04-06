import React, { useRef, useMemo, useState, useEffect } from 'react';
import { StyleSheet, Text, View, Dimensions, TextInput, ScrollView, Image, Pressable } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import MapView, { PROVIDER_GOOGLE, MapStyleElement } from 'react-native-maps';
import BottomSheet, { BottomSheetScrollView, BottomSheetView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { Colors, Typography } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import Header from '@/components/header';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

const darkMapStyle: MapStyleElement[] = [
  { elementType: "geometry", stylers: [{ color: "#10141a" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#263c3f" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#6b9a76" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#746855" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1f2835" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#f3d19c" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#2f3948" }] },
  { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#515c6d" }] },
  { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#17263c" }] }
];

type RideState = 'idle' | 'search' | 'options' | 'matching' | 'assigned' | 'in_progress' | 'completed';

export default function HomeScreen() {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [rideState, setRideState] = useState<RideState>('idle');


  const snapPoints = useMemo(() => [220, '80%'], []);

  // Simulate Driver Matching
  useEffect(() => {
    if (rideState === 'matching') {
      const timer = setTimeout(() => {
        setRideState('assigned');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [rideState]);

  const renderIdleState = () => (
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

  const renderSearchState = () => (
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
            autoFocus
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

  const renderOptionsState = () => (
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

  const renderMatchingState = () => (
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

  const renderAssignedState = () => (
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

  const [rating, setRating] = useState(0);

  const renderInProgressState = () => (
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

  const renderCompletedState = () => (
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

  return (
    <View style={styles.container}>
      <Header />

      {/* Map Layer */}
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        customMapStyle={darkMapStyle}
        zoomEnabled={rideState === 'idle' || rideState === 'assigned'} // Lock bounds conceptually
        initialRegion={{
          latitude: 28.6139,
          longitude: 77.2090,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      />

      {/* Bottom Sheet State Machine */}
      <BottomSheet
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.handleIndicator}
        keyboardBehavior="interactive"
      >
        <BottomSheetView style={{ flex: 1 }}>
          {rideState === 'idle' && renderIdleState()}
          {rideState === 'search' && renderSearchState()}
          {rideState === 'options' && renderOptionsState()}
          {rideState === 'matching' && renderMatchingState()}
          {rideState === 'assigned' && renderAssignedState()}
          {rideState === 'in_progress' && renderInProgressState()}
          {rideState === 'completed' && renderCompletedState()}
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surfacePrimary,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetBackground: {
    backgroundColor: Colors.surfacePrimary,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
  },
  handleIndicator: {
    width: 32,
    height: 3,
    backgroundColor: Colors.textTertiary,
  },
  sheetContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    flex: 1,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
  },
  backButton: {
    padding: 4,
    marginLeft: -4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceTertiary,
    height: 52,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  searchIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accent,
    marginRight: 16,
  },
  searchText: {
    ...Typography.body,
    fontWeight: '500',
    color: Colors.textSecondary,
    fontFamily: 'JetBrainsMono_500Medium',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  quickPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceTertiary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  quickPillText: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'JetBrainsMono_500Medium',
  },
  recentSection: {
    marginTop: 8,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  recentIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceTertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  recentTitle: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
    fontFamily: 'JetBrainsMono_500Medium',
  },
  recentSubtitle: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontFamily: 'JetBrainsMono_500Medium',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderSubtle,
    marginVertical: 8,
  },
  searchInputsContainer: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchConnectionLine: {
    position: 'absolute',
    left: 27,
    top: 24,
    width: 1,
    height: 20,
    backgroundColor: Colors.borderSubtle,
    zIndex: -1,
  },
  locationInput: {
    flex: 1,
    height: 40,
    color: Colors.textPrimary,
    fontSize: 16,
  },
  locationInputActive: {
    backgroundColor: Colors.surfaceTertiary,
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.borderActive,
  },
  sectionLabel: {
    ...Typography.caption,
    color: Colors.textTertiary,
    marginBottom: 16,
    marginTop: 8,
  },
  distanceText: {
    fontFamily: 'JetBrainsMono_500Medium',
    color: Colors.textTertiary,
    fontSize: 12,
  },
  routeSummaryText: {
    color: Colors.textSecondary,
    fontSize: 14,
    flex: 1,
    textAlign: 'center',
    fontFamily: 'JetBrainsMono_500Medium',
  },
  etaBadge: {
    fontFamily: 'JetBrainsMono_500Medium',
    color: Colors.textPrimary,
    fontSize: 14,
    backgroundColor: Colors.surfaceTertiary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  rideCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  rideCardSelected: {
    backgroundColor: Colors.surfaceTertiary,
    borderColor: Colors.borderActive,
  },
  rideCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rideName: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
    fontFamily: 'JetBrainsMono_500Medium',
  },
  rideDesc: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontFamily: 'JetBrainsMono_500Medium',
  },
  ridePrice: {
    fontFamily: 'JetBrainsMono_500Medium',
    color: Colors.textPrimary,
    fontSize: 16,
  },
  aiBanner: {
    backgroundColor: Colors.surfaceTertiary,
    borderLeftWidth: 2,
    borderLeftColor: Colors.accent,
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  aiBannerText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontFamily: 'JetBrainsMono_500Medium',
  },
  primaryCta: {
    backgroundColor: Colors.accent,
    borderRadius: 14,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryCtaText: {
    color: Colors.surfacePrimary,
    fontWeight: '600',
    fontSize: 16,
    letterSpacing: 0.3,
    fontFamily: 'JetBrainsMono_500Medium',
  },
  matchingHeading: {
    ...Typography.headingL,
    color: Colors.textPrimary,
    marginTop: 16,
    fontFamily: 'JetBrainsMono_500Medium',
  },
  matchingSubtext: {
    color: Colors.textTertiary,
    fontSize: 14,
    marginTop: 16,
    fontFamily: 'JetBrainsMono_500Medium',
  },
  dotContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accent,
  },
  cancelGhostBtn: {
    marginTop: 24,
    alignSelf: 'flex-start',
  },
  cancelGhostText: {
    color: Colors.destructive,
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'JetBrainsMono_500Medium',
  },
  assignedTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  driverProfileGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  driverAvatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surfaceTertiary,
    borderWidth: 1,
    borderColor: Colors.borderActive,
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverName: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'JetBrainsMono_500Medium',
  },
  driverRating: {
    fontFamily: 'JetBrainsMono_500Medium',
    color: Colors.textSecondary,
    fontSize: 12,
  },
  etaLarge: {
    fontFamily: 'JetBrainsMono_500Medium',
    color: Colors.accent,
    fontSize: 28,
  },
  vehicleDetailsText: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
    fontFamily: 'JetBrainsMono_500Medium',
  },
  actionCircleRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  actionCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceTertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  evBadgePill: {
    backgroundColor: "transaprent",
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 120,
    marginBottom: 16,
    borderColor: Colors.accent,
    borderWidth: 1,
  },
  evBadgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'JetBrainsMono_500Medium',
  },
  secondaryBtn: {
    width: '100%',
    height: 56,
    backgroundColor: Colors.surfaceTertiary,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  secondaryBtnText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'JetBrainsMono_500Medium',
  },

  inProgressTrackContainer: {
    height: 4,
    backgroundColor: Colors.surfaceTertiary,
    borderRadius: 2,
    width: '100%',
    marginTop: 8,
    overflow: 'hidden',
  },
  inProgressTrackFill: {
    height: '100%',
    width: '65%', // Mock progress
    backgroundColor: Colors.accent,
    borderRadius: 2,
  },
  successCircleLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: Colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 214, 143, 0.1)',
  },
  fareBreakdownCard: {
    backgroundColor: Colors.surfaceSecondary,
    width: '100%',
    padding: 24,
    borderRadius: 16,
    marginTop: 24,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  primaryCtaDone: {
    width: '100%',
    height: 56,
    backgroundColor: Colors.accent,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryCtaDoneText: {
    fontFamily: 'JetBrainsMono_500Medium',
    color: Colors.surfacePrimary,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  }
});
