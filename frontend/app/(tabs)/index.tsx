import { useRef, useMemo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions } from 'react-native';
import MapView, { PROVIDER_GOOGLE, MapStyleElement } from 'react-native-maps';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { Colors, Typography } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import Header from '@/components/header';


const darkMapStyle: MapStyleElement[] = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
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

export default function HomeScreen() {

  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => [180, '65%'], []);

  return (
    <View style={styles.container}>

      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        customMapStyle={darkMapStyle}
        initialRegion={{
          latitude: 28.6139,
          longitude: 77.2090,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      />

      {/* header */}

      <Header />



      <BottomSheet
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.handleIndicator}
      >
        <BottomSheetView style={styles.sheetContent}>
          {/* Search Trigger */}
          <TouchableOpacity style={styles.searchBar} activeOpacity={0.8}>
            <View style={styles.searchIndicator} />
            <Text style={styles.searchText}>Where to?</Text>
          </TouchableOpacity>

          {/* Quick Actions */}
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

          {/* Recent Destinations Scroll - Mock */}
          <View style={styles.recentSection}>
            <TouchableOpacity style={styles.recentItem}>
              <View style={styles.recentIcon}>
                <Ionicons name="time-outline" size={16} color={Colors.textSecondary} />
              </View>
              <View>
                <Text style={styles.recentTitle}>Airport Terminal 3</Text>
                <Text style={styles.recentSubtitle}>Indira Gandhi Intl</Text>
              </View>
            </TouchableOpacity>
            {/* Divider */}
            <View style={styles.divider} />
            <TouchableOpacity style={styles.recentItem}>
              <View style={styles.recentIcon}>
                <Ionicons name="time-outline" size={16} color={Colors.textSecondary} />
              </View>
              <View>
                <Text style={styles.recentTitle}>Cyber Hub</Text>
                <Text style={styles.recentSubtitle}>Gurugram</Text>
              </View>
            </TouchableOpacity>
          </View>
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    height: "100%",
    backgroundColor: Colors.surfacePrimary,
  },
  map: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  topBar: {
    position: 'absolute',
    left: 24,
    right: 24,
    zIndex: 10,
  },
  topBarContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandName: {
    ...Typography.headingM,
    color: Colors.textPrimary,
  },
  avatarButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.borderActive,
    backgroundColor: Colors.surfaceTertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetBackground: {
    backgroundColor: Colors.surfaceSecondary,
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
    color: Colors.textPrimary,
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
  },
  recentSubtitle: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderSubtle,
    marginLeft: 48,
  }
});
