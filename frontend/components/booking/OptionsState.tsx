import React, { memo } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { styles } from './styles';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { FareEstimateItem, FareEstimateResponse, RideCategory } from '@/lib/rides';

interface OptionsStateProps {
  setRideState: (state: any) => void;
  pickupAddress: string;
  destAddress: string;
  fareData: FareEstimateResponse | null;
  isEstimating: boolean;
  estimateError: string | null;
  onRetryEstimate: () => void;
  selectedCategory: RideCategory;
  onSelectCategory: (category: RideCategory) => void;
  onConfirmBooking: () => void;
  isBooking: boolean;
}

const getCategoryIcon = (category: RideCategory): keyof typeof Ionicons.glyphMap => {
  switch (category) {
    case 'ev':
      return 'flash-outline';
    case 'suv':
      return 'car-sport-outline';
    case 'sedan':
      return 'car-outline';
    case 'hatchback':
    default:
      return 'car-outline';
  }
};

const getCategoryDescription = (category: RideCategory): string => {
  switch (category) {
    case 'ev':
      return '⚡ 0 emissions';
    case 'suv':
      return 'Extra seats & space';
    case 'sedan':
      return 'Comfortable sedans';
    case 'hatchback':
    default:
      return 'Everyday rides';
  }
};

export const OptionsState = memo(({
  setRideState,
  pickupAddress,
  destAddress,
  fareData,
  isEstimating,
  estimateError,
  onRetryEstimate,
  selectedCategory,
  onSelectCategory,
  onConfirmBooking,
  isBooking,
}: OptionsStateProps) => {
  const estimates = fareData?.estimates || [];
  const selectedEstimate = estimates.find((item) => item.category === selectedCategory) || estimates[0];

  return (
    <Animated.View entering={FadeIn} exiting={FadeOut} style={{ flex: 1 }}>
      <View style={[styles.sheetHeader, { paddingHorizontal: 24, paddingVertical: 12, justifyContent: 'space-between' }]}>
        <TouchableOpacity onPress={() => setRideState('search')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.routeSummaryText} numberOfLines={1}>
          {pickupAddress} → {destAddress}
        </Text>
        {fareData?.durationMin ? (
          <Text style={styles.etaBadge}>{fareData.durationMin} min</Text>
        ) : null}
      </View>

      <BottomSheetScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}>
        {isEstimating ? (
          <View style={localStyles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.accent} />
            <Text style={localStyles.loadingText}>Estimating fares...</Text>
          </View>
        ) : estimateError ? (
          <View style={localStyles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={36} color="#FF6B6B" />
            <Text style={localStyles.errorText}>{estimateError}</Text>
            <TouchableOpacity style={localStyles.retryBtn} onPress={onRetryEstimate}>
              <Text style={localStyles.retryBtnText}>Retry Estimation</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {estimates.map((item: FareEstimateItem) => {
              const isSelected = item.category === selectedCategory;
              const iconName = getCategoryIcon(item.category);
              const desc = getCategoryDescription(item.category);

              return (
                <TouchableOpacity
                  key={item.category}
                  style={[styles.rideCard, isSelected && styles.rideCardSelected]}
                  onPress={() => onSelectCategory(item.category)}
                  activeOpacity={0.8}
                >
                  <View style={styles.rideCardLeft}>
                    <Ionicons
                      name={iconName}
                      size={32}
                      color={isSelected ? Colors.accent : Colors.textSecondary}
                    />
                    <View style={{ marginLeft: 16 }}>
                      <Text style={styles.rideName}>{item.displayName}</Text>
                      <Text style={styles.rideDesc}>
                        {desc} · {item.etaMin} min away
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.ridePrice, isSelected && { color: Colors.accent }]}>
                    ₹{item.totalFare}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {/* AI / Demand Banner */}
            <View style={styles.aiBanner}>
              <Text style={styles.aiBannerText}>
                {fareData?.distanceKm ? `${fareData.distanceKm} km · ` : ''}Demand is low right now · Prices baseline rate
              </Text>
            </View>

            {/* CTA Button */}
            <TouchableOpacity
              style={[styles.primaryCta, isBooking && localStyles.ctaDisabled]}
              onPress={onConfirmBooking}
              disabled={isBooking || estimates.length === 0}
              activeOpacity={0.8}
            >
              {isBooking ? (
                <ActivityIndicator size="small" color={Colors.surfacePrimary} />
              ) : (
                <Text style={styles.primaryCtaText}>
                  {selectedEstimate
                    ? `Book ${selectedEstimate.displayName}`
                    : 'Confirm Booking'}
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </BottomSheetScrollView>
    </Animated.View>
  );
});

const localStyles = StyleSheet.create({
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: Colors.textSecondary,
    marginTop: 12,
    fontSize: 14,
  },
  errorContainer: {
    paddingVertical: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: Colors.textSecondary,
    marginTop: 8,
    marginBottom: 16,
    textAlign: 'center',
    fontSize: 14,
  },
  retryBtn: {
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  retryBtnText: {
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  ctaDisabled: {
    opacity: 0.6,
  },
});
