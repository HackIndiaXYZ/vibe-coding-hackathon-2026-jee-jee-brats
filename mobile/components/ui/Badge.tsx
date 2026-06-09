/**
 * LoadKaro Badge Component
 * Status badges for load states (pending, accepted, in_transit, completed, cancelled)
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { FONT_SIZE, FONT_WEIGHT, RADIUS, SPACING } from '../../lib/constants';
import type { LoadRequestStatus } from '../../lib/types';

interface BadgeProps {
  status: LoadRequestStatus;
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

const STATUS_CONFIG: Record<
  LoadRequestStatus,
  { label: string; bg: string; text: string; dot: string }
> = {
  pending: {
    label: 'Pending',
    bg: '#FEF3C7',
    text: '#92400E',
    dot: '#F59E0B',
  },
  accepted: {
    label: 'Accepted',
    bg: '#DBEAFE',
    text: '#1E40AF',
    dot: '#3B82F6',
  },
  in_transit: {
    label: 'In Transit',
    bg: '#D1FAE5',
    text: '#065F46',
    dot: '#10B981',
  },
  completed: {
    label: 'Completed',
    bg: '#E0E7FF',
    text: '#3730A3',
    dot: '#6366F1',
  },
  cancelled: {
    label: 'Cancelled',
    bg: '#FEE2E2',
    text: '#991B1B',
    dot: '#EF4444',
  },
};

export const Badge: React.FC<BadgeProps> = ({ status, size = 'md', style }) => {
  const config = STATUS_CONFIG[status];

  return (
    <View
      style={[
        styles.badge,
        size === 'sm' ? styles.badgeSm : styles.badgeMd,
        { backgroundColor: config.bg },
        style,
      ]}
      accessibilityRole="text"
      accessibilityLabel={`Status: ${config.label}`}
    >
      <View style={[styles.dot, { backgroundColor: config.dot }]} />
      <Text
        style={[
          styles.label,
          size === 'sm' ? styles.labelSm : styles.labelMd,
          { color: config.text },
        ]}
      >
        {config.label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: RADIUS.full,
  },
  badgeSm: {
    paddingVertical: 2,
    paddingHorizontal: SPACING.sm,
  },
  badgeMd: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: SPACING.xs,
  },
  label: {
    fontWeight: FONT_WEIGHT.semibold,
  },
  labelSm: {
    fontSize: FONT_SIZE.xs,
  },
  labelMd: {
    fontSize: FONT_SIZE.sm,
  },
});

export default Badge;
