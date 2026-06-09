/**
 * LoadKaro SahiYatriSheet Component
 * Bottom sheet with toggle between Solo Ride and SahiYatri Pool
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  CUSTOMER_COLORS,
  SHARED_COLORS,
  FONT_SIZE,
  FONT_WEIGHT,
  RADIUS,
  SPACING,
  SHADOW,
  SAHIYATRI_DISCOUNT_PERCENT,
  SAHIYATRI_MATCH_TIMEOUT_MINUTES,
} from '../lib/constants';
import type { RideMode } from '../lib/types';
import Button from './ui/Button';

interface SahiYatriSheetProps {
  rideMode: RideMode;
  onModeChange: (mode: RideMode) => void;
  estimatedPrice: number | null;
  onRequestPickup: () => void;
  isLoading?: boolean;
}

export const SahiYatriSheet: React.FC<SahiYatriSheetProps> = ({
  rideMode,
  onModeChange,
  estimatedPrice,
  onRequestPickup,
  isLoading = false,
}) => {
  const poolPrice = estimatedPrice
    ? Math.round(estimatedPrice * (1 - SAHIYATRI_DISCOUNT_PERCENT / 100))
    : null;

  return (
    <View style={styles.container}>
      {/* Handle bar */}
      <View style={styles.handleBar} />

      <Text style={styles.title}>Choose your ride</Text>

      {/* Mode Cards */}
      <View style={styles.cardsRow}>
        {/* Solo Card */}
        <TouchableOpacity
          onPress={() => onModeChange('solo')}
          activeOpacity={0.85}
          style={[
            styles.modeCard,
            rideMode === 'solo' && styles.modeCardActive,
            rideMode === 'solo' && {
              borderColor: SHARED_COLORS.soloBlue,
              backgroundColor: SHARED_COLORS.soloBlueLight,
            },
          ]}
          accessibilityRole="radio"
          accessibilityState={{ selected: rideMode === 'solo' }}
          accessibilityLabel="Solo ride option"
        >
          <Text style={styles.modeIcon}>🚚</Text>
          <Text
            style={[
              styles.modeName,
              rideMode === 'solo' && { color: SHARED_COLORS.soloBlue },
            ]}
          >
            Solo Ride
          </Text>
          {estimatedPrice && (
            <Text style={styles.modePrice}>
              ₹{estimatedPrice.toLocaleString('en-IN')}
            </Text>
          )}
          <Text style={styles.modeDescription}>
            Dedicated vehicle for your cargo
          </Text>
        </TouchableOpacity>

        {/* SahiYatri Pool Card */}
        <TouchableOpacity
          onPress={() => onModeChange('sahiyatri')}
          activeOpacity={0.85}
          style={[
            styles.modeCard,
            rideMode === 'sahiyatri' && styles.modeCardActive,
            rideMode === 'sahiyatri' && {
              borderColor: SHARED_COLORS.poolGreen,
              backgroundColor: SHARED_COLORS.poolGreenLight,
            },
          ]}
          accessibilityRole="radio"
          accessibilityState={{ selected: rideMode === 'sahiyatri' }}
          accessibilityLabel="SahiYatri pooling option, 40 percent discount"
        >
          {/* Discount badge */}
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>
              -{SAHIYATRI_DISCOUNT_PERCENT}%
            </Text>
          </View>

          <Text style={styles.modeIcon}>🤝</Text>
          <Text
            style={[
              styles.modeName,
              rideMode === 'sahiyatri' && { color: SHARED_COLORS.poolGreen },
            ]}
          >
            SahiYatri Pool
          </Text>
          {poolPrice && (
            <View style={styles.priceRow}>
              <Text style={[styles.modePrice, styles.modePriceStrike]}>
                ₹{estimatedPrice?.toLocaleString('en-IN')}
              </Text>
              <Text
                style={[styles.modePrice, { color: SHARED_COLORS.poolGreen }]}
              >
                ₹{poolPrice.toLocaleString('en-IN')}
              </Text>
            </View>
          )}
          <Text style={styles.modeDescription}>
            Matched within {SAHIYATRI_MATCH_TIMEOUT_MINUTES} min
          </Text>
        </TouchableOpacity>
      </View>

      {/* Request button */}
      <Button
        title={
          rideMode === 'sahiyatri'
            ? '🤝 Find SahiYatri Match'
            : '🚚 Request Pickup'
        }
        onPress={onRequestPickup}
        variant="primary"
        size="lg"
        fullWidth
        loading={isLoading}
        style={{ marginTop: SPACING.lg }}
        accessibilityLabel={`Request ${rideMode === 'sahiyatri' ? 'SahiYatri pool' : 'solo'} pickup`}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: SPACING.xl,
    paddingTop: SPACING.md,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: CUSTOMER_COLORS.border,
    alignSelf: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: CUSTOMER_COLORS.text,
    marginBottom: SPACING.base,
  },
  cardsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  modeCard: {
    flex: 1,
    backgroundColor: CUSTOMER_COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 2,
    borderColor: CUSTOMER_COLORS.border,
    padding: SPACING.base,
    alignItems: 'center',
    ...SHADOW.sm,
  },
  modeCardActive: {
    ...SHADOW.md,
  },
  modeIcon: {
    fontSize: 32,
    marginBottom: SPACING.sm,
  },
  modeName: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
    color: CUSTOMER_COLORS.text,
    marginBottom: SPACING.xs,
  },
  modePrice: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.extrabold,
    color: CUSTOMER_COLORS.text,
  },
  modePriceStrike: {
    fontSize: FONT_SIZE.sm,
    textDecorationLine: 'line-through',
    color: CUSTOMER_COLORS.textMuted,
    marginRight: SPACING.xs,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  modeDescription: {
    fontSize: FONT_SIZE.xs,
    color: CUSTOMER_COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  discountBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: SHARED_COLORS.poolGreen,
    borderRadius: RADIUS.full,
    paddingVertical: 2,
    paddingHorizontal: SPACING.sm,
    ...SHADOW.sm,
  },
  discountText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
  },
});

export default SahiYatriSheet;
