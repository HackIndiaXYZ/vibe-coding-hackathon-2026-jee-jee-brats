/**
 * LoadKaro LoadRadarItem Component
 * Card for driver radar — shows available load with route, distance, and max payout
 * Features glowing border animation for new loads
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import {
  DRIVER_COLORS,
  FONT_SIZE,
  FONT_WEIGHT,
  RADIUS,
  SPACING,
  SHADOW,
} from '../lib/constants';
import type { WSNewLoadPayload } from '../lib/types';

interface LoadRadarItemProps {
  load: WSNewLoadPayload;
  isSelected: boolean;
  onSelect: (loadId: string) => void;
  isNew?: boolean;
}

export const LoadRadarItem: React.FC<LoadRadarItemProps> = ({
  load,
  isSelected,
  onSelect,
  isNew = false,
}) => {
  const slideAnim = useRef(new Animated.Value(-30)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: false,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: false,
      }),
    ]).start();

    if (isNew) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 800,
            useNativeDriver: false,
          }),
        ]),
        { iterations: 3 }
      ).start();
    }
  }, []);

  const borderColor = isNew
    ? glowAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [DRIVER_COLORS.border, DRIVER_COLORS.primary],
      })
    : isSelected
    ? DRIVER_COLORS.primary
    : DRIVER_COLORS.border;

  const timeLeft = () => {
    const ends = new Date(load.auction_ends_at).getTime();
    const now = Date.now();
    const seconds = Math.max(0, Math.floor((ends - now) / 1000));
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Animated.View
      style={{
        transform: [{ translateX: slideAnim }],
        opacity: opacityAnim,
      }}
    >
      <TouchableOpacity
        onPress={() => onSelect(load.load_id)}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={`Load from ${load.pickup_address} to ${load.dropoff_address}, max payout ${load.max_payout} rupees`}
      >
        <Animated.View
          style={[
            styles.card,
            isSelected && styles.cardSelected,
            { borderColor },
          ]}
        >
          {/* Max payout badge */}
          <View style={styles.payoutBadge}>
            <Text style={styles.payoutLabel}>MAX PAYOUT</Text>
            <Text style={styles.payoutAmount}>
              ₹{load.max_payout.toLocaleString('en-IN')}
            </Text>
          </View>

          {/* Route */}
          <View style={styles.routeContainer}>
            <View style={styles.routeRow}>
              <View style={[styles.routeDot, styles.pickupDot]} />
              <View style={styles.routeTextContainer}>
                <Text style={styles.routeLabel}>PICKUP</Text>
                <Text style={styles.routeAddress} numberOfLines={1}>
                  {load.pickup_address}
                </Text>
              </View>
            </View>

            <View style={styles.routeLine} />

            <View style={styles.routeRow}>
              <View style={[styles.routeDot, styles.dropoffDot]} />
              <View style={styles.routeTextContainer}>
                <Text style={styles.routeLabel}>DROP-OFF</Text>
                <Text style={styles.routeAddress} numberOfLines={1}>
                  {load.dropoff_address}
                </Text>
              </View>
            </View>
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Distance</Text>
              <Text style={styles.statValue}>
                {load.distance_km.toFixed(1)} km
              </Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Volume</Text>
              <Text style={styles.statValue}>
                {load.required_volume} m³
              </Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Auction</Text>
              <Text style={[styles.statValue, styles.timerText]}>
                ⏱ {timeLeft()}
              </Text>
            </View>
          </View>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: DRIVER_COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1.5,
    borderColor: DRIVER_COLORS.border,
    padding: SPACING.base,
    marginBottom: SPACING.md,
  },
  cardSelected: {
    backgroundColor: DRIVER_COLORS.surfaceElevated,
    ...SHADOW.glow(DRIVER_COLORS.primary),
  },
  payoutBadge: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(46, 205, 245, 0.1)',
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  payoutLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: DRIVER_COLORS.primary,
    letterSpacing: 1.5,
  },
  payoutAmount: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.extrabold,
    color: DRIVER_COLORS.primary,
  },
  routeContainer: {
    marginBottom: SPACING.md,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: SPACING.md,
  },
  pickupDot: {
    backgroundColor: DRIVER_COLORS.success,
  },
  dropoffDot: {
    backgroundColor: DRIVER_COLORS.error,
  },
  routeLine: {
    width: 2,
    height: 20,
    backgroundColor: DRIVER_COLORS.border,
    marginLeft: 5,
    marginVertical: 2,
  },
  routeTextContainer: {
    flex: 1,
  },
  routeLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: DRIVER_COLORS.textMuted,
    letterSpacing: 1,
  },
  routeAddress: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.medium,
    color: DRIVER_COLORS.text,
    marginTop: 1,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: DRIVER_COLORS.border,
    paddingTop: SPACING.md,
  },
  stat: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: FONT_SIZE.xs,
    color: DRIVER_COLORS.textMuted,
    marginBottom: 2,
  },
  statValue: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
    color: DRIVER_COLORS.text,
  },
  timerText: {
    color: DRIVER_COLORS.warning,
  },
});

export default LoadRadarItem;
