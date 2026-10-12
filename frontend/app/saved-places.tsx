import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/auth';
import { deleteSavedPlace, getApiMessage, getSavedPlaces, SavedPlace } from '@/lib/account';

export default function SavedPlacesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const token = useAuthStore((state) => state.accessToken);
  const [places, setPlaces] = React.useState<SavedPlace[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const load = React.useCallback(async () => {
    if (!token) { setLoading(false); setError('Sign in to view saved places.'); return; }
    setLoading(true); setError(null);
    try { setPlaces(await getSavedPlaces(token)); }
    catch (e) { setError(getApiMessage(e, 'Could not load saved places.')); }
    finally { setLoading(false); }
  }, [token]);
  React.useEffect(() => { void load(); }, [load]);
  const remove = (place: SavedPlace) => Alert.alert('Remove saved place', `Remove ${place.name} from your saved places?`, [
    { text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: async () => {
      if (!token) return;
      try { await deleteSavedPlace(token, place.id); await load(); }
      catch (e) { Alert.alert('Could not remove place', getApiMessage(e, 'Please try again.')); }
    } },
  ]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saved Places</Text>
      </View>

        <Animated.ScrollView entering={FadeIn.delay(100)} contentContainerStyle={styles.content}>
        
        <Text style={styles.sectionLabel}>FAVORITES</Text>
        <View style={styles.favoritesCard}>
          
          {loading ? <ActivityIndicator color={Colors.accent} style={{ padding: 24 }} /> : places.length === 0 ? <Text style={styles.emptyText}>{error || 'No saved places yet'}</Text> : places.map((place, index) => <React.Fragment key={place.id}>
            {index > 0 && <View style={styles.divider} />}
            <TouchableOpacity style={styles.listItem} onLongPress={() => remove(place)}>
              <View style={styles.iconCircle}><Ionicons name={place.name.toLowerCase() === 'home' ? 'home' : 'location'} size={20} color={Colors.textSecondary} /></View>
              <View style={styles.listTextContent}><Text style={styles.listTitle}>{place.name}</Text><Text style={styles.listSubtitle}>{place.address}</Text></View>
              <TouchableOpacity accessibilityLabel={`Remove ${place.name}`} onPress={() => remove(place)}><Ionicons name="ellipsis-horizontal" size={20} color={Colors.textTertiary} /></TouchableOpacity>
            </TouchableOpacity>
          </React.Fragment>)}

        </View>

        {error && places.length > 0 && <Text style={styles.emptyText}>{error}</Text>}

      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surfacePrimary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  backBtn: {
    padding: 4,
    marginRight: 16,
    marginLeft: -4,
  },
  headerTitle: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 20,
    color: Colors.textPrimary,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  sectionLabel: {
    fontFamily: 'JetBrainsMono_500Medium',
    color: Colors.textTertiary,
    fontSize: 10,
    letterSpacing: 1,
    marginBottom: 12,
    marginLeft: 8,
  },
  favoritesCard: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    overflow: 'hidden',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceTertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  listTextContent: {
    flex: 1,
  },
  listTitle: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 16,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  listSubtitle: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 12,
    color: Colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderSubtle,
    marginLeft: 72,
  },
  addGhostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    marginLeft: 8,
  },
  emptyText: { color: Colors.textSecondary, fontFamily: 'JetBrainsMono_500Medium', fontSize: 13, padding: 18 },
  addGhostText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 14,
    color: Colors.accent,
  }
});
