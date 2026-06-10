/**
 * LoadKaro Signup Screen
 * Role picker cards + registration form
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
  DRIVER_COLORS,
  FONT_SIZE,
  FONT_WEIGHT,
  RADIUS,
  SPACING,
  SHADOW,
} from '../../lib/constants';
import type { UserRole } from '../../lib/types';

export default function SignupScreen() {
  const router = useRouter();
  const { signup, isLoading, error, clearError } = useAuthStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('customer');

  const flipAnim = useRef(new Animated.Value(0)).current;

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    Animated.spring(flipAnim, {
      toValue: newRole === 'driver' ? 1 : 0,
      useNativeDriver: false,
      speed: 12,
      bounciness: 8,
    }).start();
  };

  const handleSignup = async () => {
    if (!name || !email || !password) return;
    await signup(name, email, password, role);
    const user = useAuthStore.getState().user;
    if (user) {
      router.replace(user.role === 'driver' ? '/(driver)/dashboard' : '/(customer)/map');
    }
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
            {/* Header */}
            <View style={styles.header}>
              <Link href="/(auth)/login" asChild>
                <TouchableOpacity style={styles.backButton}>
                  <Text style={styles.backText}>← Back</Text>
                </TouchableOpacity>
              </Link>
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>
                Join LoadKaro and start moving cargo
              </Text>
            </View>

            {/* Role Picker */}
            <Text style={styles.sectionLabel}>I am a...</Text>
            <View style={styles.roleRow}>
              <TouchableOpacity
                onPress={() => handleRoleChange('customer')}
                activeOpacity={0.85}
                style={[
                  styles.roleCard,
                  role === 'customer' && styles.roleCardActiveCustomer,
                ]}
                accessibilityRole="radio"
                accessibilityState={{ selected: role === 'customer' }}
              >
                <Text style={styles.roleIcon}>👤</Text>
                <Text
                  style={[
                    styles.roleName,
                    role === 'customer' && { color: CUSTOMER_COLORS.primary },
                  ]}
                >
                  Customer
                </Text>
                <Text style={styles.roleDesc}>I need cargo moved</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleRoleChange('driver')}
                activeOpacity={0.85}
                style={[
                  styles.roleCard,
                  role === 'driver' && styles.roleCardActiveDriver,
                ]}
                accessibilityRole="radio"
                accessibilityState={{ selected: role === 'driver' }}
              >
                <Text style={styles.roleIcon}>🚛</Text>
                <Text
                  style={[
                    styles.roleName,
                    role === 'driver' && { color: DRIVER_COLORS.primary },
                  ]}
                >
                  Driver
                </Text>
                <Text style={styles.roleDesc}>I drive cargo</Text>
              </TouchableOpacity>
            </View>

            {/* Form */}
            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠️ {error}</Text>
                <TouchableOpacity onPress={clearError}>
                  <Text style={styles.errorDismiss}>✕</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Enter your full name"
                placeholderTextColor={CUSTOMER_COLORS.textMuted}
                accessibilityLabel="Full name input"
              />
            </View>

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
                placeholder="Create a strong password"
                placeholderTextColor={CUSTOMER_COLORS.textMuted}
                secureTextEntry
                accessibilityLabel="Password input"
              />
            </View>

            <Button
              title={`Sign Up as ${role === 'customer' ? 'Customer' : 'Driver'}`}
              onPress={handleSignup}
              variant={role === 'driver' ? 'driver' : 'primary'}
              size="lg"
              fullWidth
              loading={isLoading}
              style={{ marginTop: SPACING.lg }}
            />

            <Link href="/(auth)/login" asChild>
              <TouchableOpacity style={styles.loginLink}>
                <Text style={styles.loginText}>
                  Already have an account?{' '}
                  <Text style={styles.loginTextBold}>Log In</Text>
                </Text>
              </TouchableOpacity>
            </Link>

            <View style={{ height: SPACING['3xl'] }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CUSTOMER_COLORS.surface,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: SPACING.xl,
  },
  header: {
    marginBottom: SPACING.xl,
  },
  backButton: {
    marginBottom: SPACING.base,
  },
  backText: {
    fontSize: FONT_SIZE.base,
    color: CUSTOMER_COLORS.primary,
    fontWeight: FONT_WEIGHT.semibold,
  },
  title: {
    fontSize: FONT_SIZE['2xl'],
    fontWeight: FONT_WEIGHT.extrabold,
    color: CUSTOMER_COLORS.text,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: FONT_SIZE.base,
    color: CUSTOMER_COLORS.textSecondary,
  },
  sectionLabel: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: CUSTOMER_COLORS.text,
    marginBottom: SPACING.md,
  },
  roleRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  roleCard: {
    flex: 1,
    backgroundColor: CUSTOMER_COLORS.background,
    borderRadius: RADIUS.xl,
    borderWidth: 2,
    borderColor: CUSTOMER_COLORS.border,
    padding: SPACING.lg,
    alignItems: 'center',
  },
  roleCardActiveCustomer: {
    borderColor: CUSTOMER_COLORS.primary,
    backgroundColor: '#FFF5EE',
    ...SHADOW.md,
  },
  roleCardActiveDriver: {
    borderColor: DRIVER_COLORS.primary,
    backgroundColor: '#F0FDFF',
    ...SHADOW.md,
  },
  roleIcon: {
    fontSize: 36,
    marginBottom: SPACING.sm,
  },
  roleName: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    color: CUSTOMER_COLORS.text,
    marginBottom: SPACING.xs,
  },
  roleDesc: {
    fontSize: FONT_SIZE.sm,
    color: CUSTOMER_COLORS.textSecondary,
    textAlign: 'center',
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
  loginLink: {
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  loginText: {
    fontSize: FONT_SIZE.sm,
    color: CUSTOMER_COLORS.textSecondary,
  },
  loginTextBold: {
    color: CUSTOMER_COLORS.primary,
    fontWeight: FONT_WEIGHT.bold,
  },
});
