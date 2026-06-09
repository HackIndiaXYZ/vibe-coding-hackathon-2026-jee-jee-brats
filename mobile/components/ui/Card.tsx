/**
 * LoadKaro Card Component
 * Glass-morphism style card with optional glow effect
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { CUSTOMER_COLORS, DRIVER_COLORS, RADIUS, SPACING, SHADOW } from '../../lib/constants';

type CardTheme = 'customer' | 'driver';

interface CardProps {
  children: React.ReactNode;
  theme?: CardTheme;
  elevated?: boolean;
  glow?: boolean;
  glowColor?: string;
  style?: ViewStyle;
  noPadding?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  theme = 'customer',
  elevated = false,
  glow = false,
  glowColor,
  style,
  noPadding = false,
}) => {
  const colors = theme === 'customer' ? CUSTOMER_COLORS : DRIVER_COLORS;
  const bg = elevated ? colors.surfaceElevated : colors.surface;
  const border = colors.border;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: bg,
          borderColor: border,
        },
        !noPadding && styles.padding,
        elevated && SHADOW.md,
        glow && SHADOW.glow(glowColor || (theme === 'driver' ? DRIVER_COLORS.primary : CUSTOMER_COLORS.primary)),
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  padding: {
    padding: SPACING.base,
  },
});

export default Card;
