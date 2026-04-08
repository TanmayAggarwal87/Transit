import React, { useRef, useMemo, useState, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { PROVIDER_GOOGLE, MapStyleElement } from 'react-native-maps';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { Colors } from '@/constants/theme';
import Header from '@/components/header';

// Booking Components
import { IdleState } from '@/components/booking/IdleState';
import { SearchState } from '@/components/booking/SearchState';
import { OptionsState } from '@/components/booking/OptionsState';
import { MatchingState } from '@/components/booking/MatchingState';
import { AssignedState } from '@/components/booking/AssignedState';
import { InProgressState } from '@/components/booking/InProgressState';
import { CompletedState } from '@/components/booking/CompletedState';

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
          {rideState === 'idle' && <IdleState setRideState={setRideState} bottomSheetRef={bottomSheetRef} />}
          {rideState === 'search' && <SearchState setRideState={setRideState} bottomSheetRef={bottomSheetRef} />}
          {rideState === 'options' && <OptionsState setRideState={setRideState} />}
          {rideState === 'matching' && <MatchingState setRideState={setRideState} bottomSheetRef={bottomSheetRef} />}
          {rideState === 'assigned' && <AssignedState setRideState={setRideState} bottomSheetRef={bottomSheetRef} />}
          {rideState === 'in_progress' && <InProgressState setRideState={setRideState} bottomSheetRef={bottomSheetRef} />}
          {rideState === 'completed' && <CompletedState setRideState={setRideState} bottomSheetRef={bottomSheetRef} />}
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
  }
});
