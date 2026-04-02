import { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Colors, Typography } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function OTPScreen() {
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const inputs = useRef<Array<TextInput | null>>([]);
  const [countdown, setCountdown] = useState(30);
  const [showSuccess, setShowSuccess] = useState(false);

  // Success animation states
  const checkmarkScale = useSharedValue(0);
  const checkmarkStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: checkmarkScale.value }],
      opacity: withTiming(checkmarkScale.value === 1 ? 1 : 0, { duration: 200 })
    };
  });

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const navigateToSetup = () => {
    router.push('/setup' as any);
  };

  const verifyOTP = () => {
    setShowSuccess(true);
    checkmarkScale.value = withSpring(1, { damping: 10, stiffness: 100 });
    setTimeout(() => {
      navigateToSetup();
    }, 1500);
  };

  const handleTextChange = (text: string, index: number) => {
    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);

    if (text && index < 5) {
      setTimeout(() => {
        inputs.current[index + 1]?.focus();
      }, 10);
    }

    // Check if fully entered
    if (newCode.every(digit => digit !== '')) {
      verifyOTP();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      setTimeout(() => {
        inputs.current[index - 1]?.focus();
      }, 10);
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
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={Colors.textSecondary} />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <Text style={styles.label}>VERIFY</Text>
            <Text style={styles.heading}>Check your messages</Text>
            <Text style={styles.subtext}>We sent a code to •••• ••• 4291</Text>

            <View style={styles.otpContainer}>
              {code.map((digit, index) => (
                <View
                  key={index}
                  style={[
                    styles.otpBox,
                    focusedIndex === index && styles.otpBoxFocused,
                    digit !== '' && styles.otpBoxFilled
                  ]}
                >
                  <TextInput
                    ref={(ref) => { inputs.current[index] = ref; }}
                    style={styles.otpInput}
                    keyboardType="number-pad"
                    maxLength={1}
                    value={digit}
                    onChangeText={(text) => handleTextChange(text, index)}
                    onKeyPress={(e) => handleKeyPress(e, index)}

                    autoFocus={index === 0}
                    caretHidden={true}
                  />
                </View>
              ))}
            </View>

            {showSuccess ? (
              <Animated.View style={[styles.successContainer, checkmarkStyle]}>
                <View style={styles.successCircle}>
                  <Ionicons name="checkmark" size={32} color={Colors.surfacePrimary} />
                </View>
              </Animated.View>
            ) : (
              <TouchableOpacity
                style={styles.resendContainer}
                disabled={countdown > 0}
              >
                <Text style={[styles.resendText, countdown === 0 && styles.resendActive]}>
                  {countdown > 0 ? `Resend code in ` : 'Resend code'}
                  {countdown > 0 && <Text style={styles.countdown}>00:{countdown.toString().padStart(2, '0')}</Text>}
                </Text>
              </TouchableOpacity>
            )}

          </View>
        </ScrollView>
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
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  otpBox: {
    width: 50,
    height: 56,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpBoxFocused: {
    borderColor: Colors.accent,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  otpBoxFilled: {
    borderColor: Colors.borderActive,
  },
  otpInput: {
    width: '100%',
    height: '100%',
    textAlign: 'center',
    color: Colors.textPrimary,
    fontSize: 24,
    fontFamily: 'JetBrainsMono_500Medium',
  },
  resendContainer: {
    alignSelf: 'flex-start',
  },
  resendText: {
    color: Colors.textSecondary,
    ...Typography.body,
  },
  resendActive: {
    color: Colors.accent,
    fontWeight: '500',
  },
  countdown: {
    fontFamily: 'JetBrainsMono_500Medium',
  },
  successContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  successCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 8,
  }
});
