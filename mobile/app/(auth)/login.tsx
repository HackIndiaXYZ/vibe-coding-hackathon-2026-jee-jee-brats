/**
 * LoadKaro Login Screen
 * Gradient hero, email/password login, demo mode buttons
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../stores/authStore';
import Button from '../../components/ui/Button';
import {
  CUSTOMER_COLORS,
  SHARED_COLORS,
  FONT_SIZE,
  FONT_WEIGHT,
  RADIUS,
  SPACING,
  SHADOW,
} from '../../lib/constants';

export default function LoginScreen() {
  const router = useRouter();
  const { login, loginAsDemo, isLoading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: false,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: false,
      }),
    ]).start();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) return;
    await login(email, password);
    const user = useAuthStore.getState().user;
    if (user) {
      router.replace(user.role === 'driver' ? '/(driver)/dashboard' : '/(customer)/map');
    }
  };

  const handleDemoLogin = (role: 'customer' | 'driver') => {
    loginAsDemo(role);
    router.replace(role === 'driver' ? '/(driver)/dashboard' : '/(customer)/map');
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Hero Section */}
            <View style={styles.hero}>
              <View style={styles.heroCircle} />
              <Text style={styles.logoIcon}>📦</Text>
              <View style={styles.logoRow}>
                <Text style={styles.logoText}>Load</Text>
                <Text style={styles.logoTextAccent}>Karo</Text>
              </View>
              <Text style={styles.heroSubtitle}>
                Your cargo, your way
              </Text>
            </View>

            {/* Form */}
            <Animated.View
              style={[
                styles.formContainer,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <Text style={styles.formTitle}>Welcome back</Text>

              {error && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>⚠️ {error}</Text>
                  <TouchableOpacity onPress={clearError}>
                    <Text style={styles.errorDismiss}>✕</Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={CUSTOMER_COLORS.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  accessibilityLabel="Email input"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password</Text>
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor={CUSTOMER_COLORS.textMuted}
                  secureTextEntry
                  accessibilityLabel="Password input"
                />
              </View>

              <Button
                title="Log In"
                onPress={handleLogin}
                variant="primary"
                size="lg"
                fullWidth
                loading={isLoading}
                style={{ marginTop: SPACING.lg }}
              />

              <Link href="/(auth)/signup" asChild>
                <TouchableOpacity style={styles.signupLink}>
                  <Text style={styles.signupText}>
                    Don't have an account?{' '}
                    <Text style={styles.signupTextBold}>Sign Up</Text>
                  </Text>
                </TouchableOpacity>
              </Link>

              {/* Demo Mode */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or try demo</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.demoRow}>
                <Button
                  title="👤 Customer Demo"
                  onPress={() => handleDemoLogin('customer')}
                  variant="secondary"
                  size="md"
                  style={{ flex: 1 }}
                />
                <View style={{ width: SPACING.md }} />
                <Button
                  title="🚛 Driver Demo"
                  onPress={() => handleDemoLogin('driver')}
                  variant="driver"
                  size="md"
                  style={{ flex: 1 }}
                />
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF7F0',
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  hero: {
    alignItems: 'center',
    paddingTop: SPACING['3xl'],
    paddingBottom: SPACING['2xl'],
    position: 'relative',
    overflow: 'hidden',
  },
  heroCircle: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255, 107, 44, 0.08)',
    top: -80,
    right: -60,
  },
  logoIcon: {
    fontSize: 56,
    marginBottom: SPACING.md,
  },
  logoRow: {
    flexDirection: 'row',
  },
  logoText: {
    fontSize: FONT_SIZE['3xl'],
    fontWeight: FONT_WEIGHT.extrabold,
    color: CUSTOMER_COLORS.text,
    letterSpacing: -1,
  },
  logoTextAccent: {
    fontSize: FONT_SIZE['3xl'],
    fontWeight: FONT_WEIGHT.extrabold,
    color: CUSTOMER_COLORS.primary,
    letterSpacing: -1,
  },
  heroSubtitle: {
    fontSize: FONT_SIZE.base,
    color: CUSTOMER_COLORS.textSecondary,
    marginTop: SPACING.sm,
    fontWeight: FONT_WEIGHT.medium,
  },
  formContainer: {
    flex: 1,
    backgroundColor: CUSTOMER_COLORS.surface,
    borderTopLeftRadius: RADIUS['2xl'],
    borderTopRightRadius: RADIUS['2xl'],
    padding: SPACING.xl,
    paddingTop: SPACING['2xl'],
    ...SHADOW.lg,
  },
  formTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: CUSTOMER_COLORS.text,
    marginBottom: SPACING.xl,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.base,
  },
  errorText: {
    flex: 1,
    color: '#991B1B',
    fontSize: FONT_SIZE.sm,
  },
  errorDismiss: {
    color: '#991B1B',
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    paddingLeft: SPACING.sm,
  },
  inputGroup: {
    marginBottom: SPACING.base,
  },
  inputLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: CUSTOMER_COLORS.text,
    marginBottom: SPACING.xs,
  },
  input: {
    backgroundColor: CUSTOMER_COLORS.background,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: CUSTOMER_COLORS.border,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.base,
    fontSize: FONT_SIZE.base,
    color: CUSTOMER_COLORS.text,
  },
  signupLink: {
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  signupText: {
    fontSize: FONT_SIZE.sm,
    color: CUSTOMER_COLORS.textSecondary,
  },
  signupTextBold: {
    color: CUSTOMER_COLORS.primary,
    fontWeight: FONT_WEIGHT.bold,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: CUSTOMER_COLORS.border,
  },
  dividerText: {
    marginHorizontal: SPACING.md,
    fontSize: FONT_SIZE.sm,
    color: CUSTOMER_COLORS.textMuted,
  },
  demoRow: {
    flexDirection: 'row',
  },
});
