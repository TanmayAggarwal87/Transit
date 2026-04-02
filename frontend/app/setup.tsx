import { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import { router } from 'expo-router';
import { Colors, Typography } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ProfileSetupScreen() {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [isFocused, setIsFocused] = useState<string | null>(null);

  const handleFinish = () => {
    // Navigate to the tabs/home layout
    router.replace('/(tabs)' as any);
  };

  return (
    <View style={[styles.safeArea, { paddingTop: Math.max(insets.top, 20), paddingBottom: Math.max(insets.bottom, 20) }]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" bounces={false}>
          {/* Progress Track */}
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>Step 2 of 2</Text>
            <View style={styles.progressTrackWrapper}>
              <View style={styles.progressTrackFill} />
            </View>
          </View>

          <Text style={styles.heading}>Set up your profile</Text>

          {/* Avatar */}
          <View style={styles.avatarContainer}>
            <TouchableOpacity style={styles.avatarPicker} activeOpacity={0.7}>
              <Ionicons name="camera-outline" size={32} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Name Field */}
          <View style={styles.inputWrapper}>
            <View style={[styles.inputContainer, isFocused === 'name' && styles.inputFocused]}>
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                placeholderTextColor={Colors.textTertiary}
                value={name}
                onChangeText={setName}



              />
            </View>
          </View>

          {/* Email Field*/}
          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>EMAIL (OPTIONAL)</Text>
            <View style={[styles.inputContainer, isFocused === 'email' && styles.inputFocused]}>
              <TextInput
                style={styles.input}
                placeholder="name@example.com"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}



              />
            </View>
          </View>

          {/* Emergency Contact */}
          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>FOR SAFETY — OPTIONAL</Text>
            <View style={[styles.inputContainer, isFocused === 'emergency' && styles.inputFocused]}>
              <Ionicons name="shield-checkmark-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Emergency Contact"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="phone-pad"
                value={emergencyPhone}
                onChangeText={setEmergencyPhone}

              />
            </View>
          </View>

          {/* Payment Method Action */}
          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>PREFERRED PAYMENT</Text>
            <TouchableOpacity style={styles.paymentCard} activeOpacity={0.7}>
              <View style={styles.paymentCardLeft}>
                <Ionicons name="card-outline" size={24} color={Colors.textSecondary} />
                <Text style={styles.paymentCardText}>Select a payment method</Text>
              </View>
              <Text style={styles.paymentAction}>+ Add</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.ctaButton, name.length < 2 && styles.ctaDisabled]}
            activeOpacity={0.8}
            onPress={handleFinish}
            disabled={name.length < 2}
          >
            <Text style={styles.ctaText}>Let's go</Text>
            <Ionicons name="arrow-forward" size={20} color={name.length < 2 ? Colors.textSecondary : Colors.surfacePrimary} style={styles.ctaIcon} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.surfacePrimary,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  progressContainer: {
    marginBottom: 32,
  },
  progressText: {
    color: Colors.textSecondary,
    ...Typography.caption,
    letterSpacing: 1,
    marginBottom: 8,
  },
  progressTrackWrapper: {
    height: 2,
    backgroundColor: Colors.borderSubtle,
    width: '100%',
    borderRadius: 1,
  },
  progressTrackFill: {
    height: 2,
    backgroundColor: Colors.accent,
    width: '100%',
    borderRadius: 1,
  },
  heading: {
    color: Colors.textPrimary,
    ...Typography.headingXL,
    marginBottom: 32,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarPicker: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surfaceTertiary,
    borderWidth: 1,
    borderColor: Colors.borderActive,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputWrapper: {
    marginBottom: 24,
  },
  inputLabel: {
    color: Colors.textTertiary,
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 16,
  },
  inputFocused: {
    borderColor: Colors.accent,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 4,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 16,
  },
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  paymentCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  paymentCardText: {
    color: Colors.textSecondary,
    ...Typography.body,
  },
  paymentAction: {
    color: Colors.accent,
    fontWeight: '600',
    fontSize: 14,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 16,
    backgroundColor: Colors.surfacePrimary,
  },
  ctaButton: {
    backgroundColor: Colors.textPrimary, // Design specified primary text contrast or accent? "Let's go" typically accent.
    height: 56,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDisabled: {
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  ctaText: {
    color: Colors.surfacePrimary,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  ctaIcon: {
    marginLeft: 8,
  },
});
