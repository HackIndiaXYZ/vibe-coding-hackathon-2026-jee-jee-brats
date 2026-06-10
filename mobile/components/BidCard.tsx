/**
 * LoadKaro BidCard Component
 * Animated card displaying a driver's bid in the customer auction view
 * Uses Animated API for slide-in entrance
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Image } from 'react-native';
import { CUSTOMER_COLORS, FONT_SIZE, FONT_WEIGHT, RADIUS, SPACING, SHADOW } from '../lib/constants';
import Button from './ui/Button';
import type { Bid } from '../lib/types';

interface BidCardProps {
  bid: Bid;
  index: number;
  onAccept: (bid: Bid) => void;
  isAccepted?: boolean;
}

export const BidCard: React.FC<BidCardProps> = ({
  bid,
  index,
  onAccept,
  isAccepted = false,
}) => {
  const slideAnim = useRef(new Animated.Value(50)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay: index * 100,
        useNativeDriver: false,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 100,
        useNativeDriver: false,
      }),
    ]).start();

    // Pulse glow for newest bid
    if (index === 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1200,
            useNativeDriver: false,
          }),
        ])
      ).start();
    }
  }, []);

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Text
          key={i}
          style={[
            styles.star,
            { color: i <= rating ? '#FBBF24' : '#D1D5DB' },
          ]}
        >
          ★
        </Text>
      );
    }
    return stars;
  };

  const borderColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [CUSTOMER_COLORS.border, CUSTOMER_COLORS.primary],
  });

  return (
    <Animated.View
      style={[
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.card,
          isAccepted && styles.cardAccepted,
          index === 0 && { borderColor },
        ]}
      >
        <View style={styles.row}>
          {/* Driver avatar */}
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {bid.driver_name.charAt(0).toUpperCase()}
            </Text>
          </View>

          {/* Driver info */}
          <View style={styles.driverInfo}>
            <Text style={styles.driverName}>{bid.driver_name}</Text>
            <View style={styles.ratingRow}>
              {renderStars(bid.driver_rating)}
              <Text style={styles.ratingText}>
                {bid.driver_rating.toFixed(1)}
              </Text>
            </View>
            <Text style={styles.vehicleType}>🚛 {bid.vehicle_type}</Text>
          </View>

          {/* Bid amount */}
          <View style={styles.bidAmountContainer}>
            <Text style={styles.bidLabel}>Bid</Text>
            <Text style={styles.bidAmount}>
              ₹{bid.amount.toLocaleString('en-IN')}
            </Text>
          </View>
        </View>

        {!isAccepted && (
          <Button
            title="Accept Bid"
            onPress={() => onAccept(bid)}
            variant="primary"
            size="md"
            fullWidth
            style={{ marginTop: SPACING.md }}
            accessibilityLabel={`Accept bid of ${bid.amount} rupees from ${bid.driver_name}`}
          />
        )}

        {isAccepted && (
          <View style={styles.acceptedBanner}>
            <Text style={styles.acceptedText}>✓ Bid Accepted</Text>
          </View>
        )}
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: CUSTOMER_COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.base,
    marginBottom: SPACING.md,
    borderWidth: 1.5,
    borderColor: CUSTOMER_COLORS.border,
    ...SHADOW.sm,
  },
  cardAccepted: {
    borderColor: CUSTOMER_COLORS.success,
    backgroundColor: '#F0FDF4',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: CUSTOMER_COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
  },
  driverInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  driverName: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
    color: CUSTOMER_COLORS.text,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  star: {
    fontSize: 12,
    marginRight: 1,
  },
  ratingText: {
    fontSize: FONT_SIZE.xs,
    color: CUSTOMER_COLORS.textSecondary,
    marginLeft: 4,
  },
  vehicleType: {
    fontSize: FONT_SIZE.sm,
    color: CUSTOMER_COLORS.textMuted,
    marginTop: 2,
  },
  bidAmountContainer: {
    alignItems: 'flex-end',
  },
  bidLabel: {
    fontSize: FONT_SIZE.xs,
    color: CUSTOMER_COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  bidAmount: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.extrabold,
    color: CUSTOMER_COLORS.primary,
  },
  acceptedBanner: {
    marginTop: SPACING.md,
    backgroundColor: '#D1FAE5',
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
  },
  acceptedText: {
    color: '#065F46',
    fontWeight: FONT_WEIGHT.semibold,
    fontSize: FONT_SIZE.base,
  },
});

export default BidCard;
