/**
 * LoadKaro Splash / Redirect Screen
 * Checks auth state and routes to appropriate flow
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../stores/authStore';
import { CUSTOMER_COLORS, SHARED_COLORS, FONT_SIZE, FONT_WEIGHT, SPACING } from '../lib/constants';

const { width, height } = Dimensions.get('window');

export default function SplashScreen() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate splash
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          useNativeDriver: true,
          speed: 8,
          bounciness: 12,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // Navigate after splash
    const timeout = setTimeout(() => {
      if (isAuthenticated && user) {
        if (user.role === 'driver') {
          router.replace('/(driver)/dashboard');
        } else {
          router.replace('/(customer)/map');
        }
      } else {
        router.replace('/(auth)/login');
      }
    }, 2000);

    return () => clearTimeout(timeout);
  }, [isAuthenticated, user]);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Gradient background circles */}
        <View style={styles.bgCircle1} />
        <View style={styles.bgCircle2} />
        <View style={styles.bgCircle3} />

        <Animated.View
          style={[
            styles.logoContainer,
            {
              transform: [{ scale: logoScale }],
              opacity: logoOpacity,
            },
          ]}
        >
          <Text style={styles.logoIcon}>📦</Text>
          <Text style={styles.logoText}>Load</Text>
          <Text style={styles.logoTextAccent}>Karo</Text>
        </Animated.View>

        <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
          Hyper-local cargo, delivered smarter
        </Animated.Text>

        <View style={styles.footer}>
          <View style={styles.loadingDots}>
            {[0, 1, 2].map((i) => (
              <LoadingDot key={i} delay={i * 200} />
            ))}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

function LoadingDot({ delay }: { delay: number }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 500,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return <Animated.View style={[styles.dot, { opacity }]} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF7F0',
  },
  safeArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bgCircle1: {
    position: 'absolute',
    width: width * 1.5,
    height: width * 1.5,
    borderRadius: width * 0.75,
    backgroundColor: 'rgba(255, 107, 44, 0.06)',
    top: -width * 0.4,
    right: -width * 0.3,
  },
  bgCircle2: {
    position: 'absolute',
    width: width,
    height: width,
    borderRadius: width * 0.5,
    backgroundColor: 'rgba(255, 184, 0, 0.05)',
    bottom: -width * 0.3,
    left: -width * 0.2,
  },
  bgCircle3: {
    position: 'absolute',
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: width * 0.3,
    backgroundColor: 'rgba(255, 107, 44, 0.04)',
    top: height * 0.35,
    left: width * 0.5,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  logoIcon: {
    fontSize: 52,
    marginRight: SPACING.md,
  },
  logoText: {
    fontSize: FONT_SIZE['4xl'],
    fontWeight: FONT_WEIGHT.extrabold,
    color: CUSTOMER_COLORS.text,
    letterSpacing: -1,
  },
  logoTextAccent: {
    fontSize: FONT_SIZE['4xl'],
    fontWeight: FONT_WEIGHT.extrabold,
    color: CUSTOMER_COLORS.primary,
    letterSpacing: -1,
  },
  tagline: {
    fontSize: FONT_SIZE.base,
    color: CUSTOMER_COLORS.textSecondary,
    fontWeight: FONT_WEIGHT.medium,
    letterSpacing: 0.5,
  },
  footer: {
    position: 'absolute',
    bottom: 60,
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: CUSTOMER_COLORS.primary,
  },
});
