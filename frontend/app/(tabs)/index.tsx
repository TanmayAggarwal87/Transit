import React, { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Alert } from 'react-native';
import MapView, { PROVIDER_GOOGLE, MapStyleElement } from 'react-native-maps';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { Colors } from '@/constants/theme';
import Header from '@/components/header';
import { useAuthStore } from '@/store/auth';

// Booking Components
import { IdleState } from '@/components/booking/IdleState';
import { SearchState } from '@/components/booking/SearchState';
import { OptionsState } from '@/components/booking/OptionsState';
import { MatchingState } from '@/components/booking/MatchingState';
import { AssignedState } from '@/components/booking/AssignedState';
import { InProgressState } from '@/components/booking/InProgressState';
import { CompletedState } from '@/components/booking/CompletedState';

// API Services & Types
import {
  estimateFare,
  createRide,
  FareEstimateResponse,
  RideCategory,
  CreateRideResponse,
  RideError,
} from '@/lib/rides';

const darkMapStyle: MapStyleElement[] = [
  { elementType: 'geometry', stylers: [{ color: '#10141a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#263c3f' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#6b9a76' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#38414e' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212a37' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca5b3' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#746855' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1f2835' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#f3d19c' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2f3948' }] },
  { featureType: 'transit.station', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#515c6d' }] },
  { featureType: 'water', elementType: 'labels.text.stroke', stylers: [{ color: '#17263c' }] },
];

const INITIAL_REGION = {
  latitude: 28.6139,
  longitude: 77.2090,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

const DEFAULT_PICKUP = {
  lat: 28.6139,
  lng: 77.2090,
  address: 'Connaught Place, New Delhi',
};

const DEFAULT_DESTINATION = {
  lat: 28.5355,
  lng: 77.3910,
  address: 'Sector 62, Noida',
};

type RideState = 'idle' | 'search' | 'options' | 'matching' | 'assigned' | 'in_progress' | 'completed';

export default function HomeScreen() {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [rideState, setRideState] = useState<RideState>('idle');

  // Location State
  const [pickupLocation, setPickupLocation] = useState(DEFAULT_PICKUP);
  const [destLocation, setDestLocation] = useState(DEFAULT_DESTINATION);

  // Fare Estimates State
  const [fareData, setFareData] = useState<FareEstimateResponse | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);
  const [estimateError, setEstimateError] = useState<string | null>(null);

  // Ride Booking State
  const [selectedCategory, setSelectedCategory] = useState<RideCategory>('sedan');
  const [isBooking, setIsBooking] = useState(false);
  const [createdRide, setCreatedRide] = useState<CreateRideResponse | null>(null);

  const snapPoints = useMemo(() => [220, '80%'], []);

  // Takes explicit pickup/dest args so callers can pass the *just-selected*
  // location before React state has flushed, avoiding stale-closure reads.
  const fetchEstimates = useCallback(
    async (
      pickup: { lat: number; lng: number; address: string } = pickupLocation,
      dest: { lat: number; lng: number; address: string } = destLocation
    ) => {
      setIsEstimating(true);
      setEstimateError(null);
      try {
        const res = await estimateFare({
          pickup_lat: pickup.lat,
          pickup_lng: pickup.lng,
          dest_lat: dest.lat,
          dest_lng: dest.lng,
        });
        setFareData(res);
        if (res.estimates && res.estimates.length > 0) {
          const hasCurrentCategory = res.estimates.some((e) => e.category === selectedCategory);
          if (!hasCurrentCategory) {
            setSelectedCategory(res.estimates[0].category);
          }
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Could not fetch fare estimates';
        setEstimateError(msg);
      } finally {
        setIsEstimating(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedCategory]
  );

  const handleSelectDestination = useCallback(
    (dest: { address: string; lat: number; lng: number }) => {
      setDestLocation(dest);
      // Pass dest directly — state update is async, closure would read old value.
      setRideState('options');
      fetchEstimates(pickupLocation, dest);
    },
    [fetchEstimates, pickupLocation]
  );

  const handleConfirmBooking = useCallback(async () => {
    const token = useAuthStore.getState().accessToken;
    setIsBooking(true);

    try {
      const ride = await createRide(
        {
          pickup_lat: pickupLocation.lat,
          pickup_lng: pickupLocation.lng,
          pickup_address: pickupLocation.address,
          dest_lat: destLocation.lat,
          dest_lng: destLocation.lng,
          dest_address: destLocation.address,
          category: selectedCategory,
        },
        token
      );
      setCreatedRide(ride);
      setRideState('matching');
    } catch (error) {
      if (error instanceof RideError && error.isConflict) {
        Alert.alert(
          'Ride Request Pending',
          'You already have a ride request in progress.',
          [
            {
              text: 'View Tracking',
              onPress: () => setRideState('matching'),
            },
          ]
        );
        setRideState('matching');
      } else {
        Alert.alert('Booking Failed', error instanceof Error ? error.message : 'Could not create ride request.');
      }
    } finally {
      setIsBooking(false);
    }
  }, [pickupLocation, destLocation, selectedCategory]);

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
        initialRegion={INITIAL_REGION}
      />

      {/* Bottom Sheet State Machine */}
      <BottomSheet
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.handleIndicator}
        keyboardBehavior="extend"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
      >
        <BottomSheetView style={{ flex: 1 }}>
          {rideState === 'idle' && (
            <IdleState
              setRideState={setRideState}
              bottomSheetRef={bottomSheetRef}
              onSelectDestination={handleSelectDestination}
            />
          )}
          {rideState === 'search' && (
            <SearchState
              setRideState={setRideState}
              bottomSheetRef={bottomSheetRef}
              pickupAddress={pickupLocation.address}
              onSelectDestination={handleSelectDestination}
            />
          )}
          {rideState === 'options' && (
            <OptionsState
              setRideState={setRideState}
              pickupAddress={pickupLocation.address}
              destAddress={destLocation.address}
              fareData={fareData}
              isEstimating={isEstimating}
              estimateError={estimateError}
              onRetryEstimate={() => fetchEstimates(pickupLocation, destLocation)}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              onConfirmBooking={handleConfirmBooking}
              isBooking={isBooking}
            />
          )}
          {rideState === 'matching' && (
            <MatchingState setRideState={setRideState} bottomSheetRef={bottomSheetRef} />
          )}
          {rideState === 'assigned' && (
            <AssignedState setRideState={setRideState} bottomSheetRef={bottomSheetRef} />
          )}
          {rideState === 'in_progress' && (
            <InProgressState setRideState={setRideState} bottomSheetRef={bottomSheetRef} />
          )}
          {rideState === 'completed' && (
            <CompletedState setRideState={setRideState} bottomSheetRef={bottomSheetRef} />
          )}
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
});
