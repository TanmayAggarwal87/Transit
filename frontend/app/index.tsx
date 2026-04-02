import { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Colors, Typography } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function PhoneAuthScreen() {
  const insets = useSafeAreaInsets();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleNext = () => {
    if (phoneNumber.length >= 10) {
      router.push('/otp' as any);
    }
  };

  return (
    <View style={[styles.safeArea, { paddingTop: Math.max(insets.top, 20), paddingBottom: Math.max(insets.bottom, 20) }]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" bounces={false}>
          <View style={styles.headerContainer}>
            <TouchableOpacity onPress={() => { }} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={Colors.textSecondary} />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <Text style={styles.label}>SIGN IN</Text>
            <Text style={styles.heading}>Enter your number</Text>
            <Text style={styles.subtext}>We'll send a one-time code to verify your account.</Text>

            <View style={[styles.inputContainer, isFocused && styles.inputFocused]}>
              <View style={styles.countryCode}>
                <Text style={styles.countryText}>🇮🇳 +91</Text>
              </View>
              <View style={styles.divider} />
              <TextInput
                style={styles.input}
                placeholder="000 000 0000"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="phone-pad"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                onFocus={() => setIsFocused(true)}
                maxLength={10}
              />
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.ctaButton, phoneNumber.length < 10 && styles.ctaDisabled]}
            activeOpacity={0.8}
            onPress={handleNext}
            disabled={phoneNumber.length < 10}
          >
            <Text style={styles.ctaText}>Send code</Text>
            <Ionicons name="arrow-forward" size={20} color={phoneNumber.length < 10 ? Colors.textSecondary : Colors.surfacePrimary} style={styles.ctaIcon} />
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
  },
  headerContainer: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backText: {
    color: Colors.textSecondary,
    ...Typography.body,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    paddingBottom: 80,
  },
  label: {
    color: Colors.textSecondary,
    ...Typography.caption,
    letterSpacing: 2,
    marginBottom: 12,
  },
  heading: {
    color: Colors.textPrimary,
    ...Typography.headingXL,
    marginBottom: 8,
  },
  subtext: {
    color: Colors.textSecondary,
    ...Typography.body,
    marginBottom: 32,
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
  countryCode: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countryText: {
    color: Colors.textPrimary,
    fontSize: 16,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.borderSubtle,
    marginHorizontal: 12,
  },
  input: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 18,
    fontFamily: 'JetBrainsMono_500Medium',
    letterSpacing: 1,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 16,
  },
  ctaButton: {
    backgroundColor: Colors.accent,
    height: 56,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDisabled: {
    backgroundColor: Colors.surfaceTertiary,
    opacity: 0.5,
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
