import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useRouter } from 'expo-router';

export default function SavedPlacesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

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
          
          <TouchableOpacity style={styles.listItem}>
            <View style={styles.iconCircle}>
              <Ionicons name="home" size={20} color={Colors.textSecondary} />
            </View>
            <View style={styles.listTextContent}>
              <Text style={styles.listTitle}>Home</Text>
              <Text style={styles.listSubtitle}>A-41, Defence Colony, New Delhi</Text>
            </View>
            <Ionicons name="ellipsis-horizontal" size={20} color={Colors.textTertiary} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.listItem}>
            <View style={styles.iconCircle}>
              <Ionicons name="briefcase" size={20} color={Colors.textSecondary} />
            </View>
            <View style={styles.listTextContent}>
              <Text style={styles.listTitle}>Work</Text>
              <Text style={styles.listSubtitle}>DLF Cyber City, Gurugram</Text>
            </View>
            <Ionicons name="ellipsis-horizontal" size={20} color={Colors.textTertiary} />
          </TouchableOpacity>

        </View>

        <TouchableOpacity style={styles.addGhostBtn}>
          <Ionicons name="add" size={20} color={Colors.accent} style={{ marginRight: 8 }} />
          <Text style={styles.addGhostText}>Add saved place</Text>
        </TouchableOpacity>

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
  addGhostText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 14,
    color: Colors.accent,
  }
});
