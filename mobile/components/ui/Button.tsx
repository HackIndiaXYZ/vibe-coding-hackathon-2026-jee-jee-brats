/**
 * LoadKaro Button Component
 * Variants: primary (orange), secondary (outline), danger, driver-primary (electric blue)
 * Includes press animation
 */

import React, { useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  AccessibilityRole,
} from 'react-native';
import { CUSTOMER_COLORS, DRIVER_COLORS, FONT_SIZE, FONT_WEIGHT, RADIUS, SPACING, SHADOW } from '../../lib/constants';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'driver' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  icon,
  style,
  textStyle,
  accessibilityLabel,
  accessibilityHint,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const variantStyles = getVariantStyles(variant);
  const sizeStyles = getSizeStyles(size);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={disabled || loading}
        activeOpacity={0.8}
        accessibilityRole={'button' as AccessibilityRole}
        accessibilityLabel={accessibilityLabel || title}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: disabled || loading }}
        style={[
          styles.base,
          variantStyles.container,
          sizeStyles.container,
          fullWidth && styles.fullWidth,
          (disabled || loading) && styles.disabled,
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator
            color={variantStyles.loaderColor}
            size="small"
          />
        ) : (
          <>
            {icon && <>{icon}</>}
            <Text
              style={[
                styles.text,
                variantStyles.text,
                sizeStyles.text,
                icon ? { marginLeft: SPACING.sm } : undefined,
                textStyle,
              ]}
            >
              {title}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

function getVariantStyles(variant: ButtonVariant) {
  switch (variant) {
    case 'primary':
      return {
        container: {
          backgroundColor: CUSTOMER_COLORS.primary,
          ...SHADOW.md,
        } as ViewStyle,
        text: { color: '#FFFFFF' } as TextStyle,
        loaderColor: '#FFFFFF',
      };
    case 'secondary':
      return {
        container: {
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          borderColor: CUSTOMER_COLORS.primary,
        } as ViewStyle,
        text: { color: CUSTOMER_COLORS.primary } as TextStyle,
        loaderColor: CUSTOMER_COLORS.primary,
      };
    case 'danger':
      return {
        container: {
          backgroundColor: CUSTOMER_COLORS.error,
          ...SHADOW.md,
        } as ViewStyle,
        text: { color: '#FFFFFF' } as TextStyle,
        loaderColor: '#FFFFFF',
      };
    case 'driver':
      return {
        container: {
          backgroundColor: DRIVER_COLORS.primary,
          ...SHADOW.glow(DRIVER_COLORS.primary),
        } as ViewStyle,
        text: { color: DRIVER_COLORS.background } as TextStyle,
        loaderColor: DRIVER_COLORS.background,
      };
    case 'ghost':
      return {
        container: {
          backgroundColor: 'transparent',
        } as ViewStyle,
        text: { color: CUSTOMER_COLORS.textSecondary } as TextStyle,
        loaderColor: CUSTOMER_COLORS.textSecondary,
      };
  }
}

function getSizeStyles(size: ButtonSize) {
  switch (size) {
    case 'sm':
      return {
        container: {
          paddingVertical: SPACING.sm,
          paddingHorizontal: SPACING.base,
          borderRadius: RADIUS.md,
        } as ViewStyle,
        text: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold } as TextStyle,
      };
    case 'md':
      return {
        container: {
          paddingVertical: SPACING.md,
          paddingHorizontal: SPACING.xl,
          borderRadius: RADIUS.lg,
        } as ViewStyle,
        text: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold } as TextStyle,
      };
    case 'lg':
      return {
        container: {
          paddingVertical: SPACING.base,
          paddingHorizontal: SPACING['2xl'],
          borderRadius: RADIUS.xl,
        } as ViewStyle,
        text: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold } as TextStyle,
      };
    case 'xl':
      return {
        container: {
          paddingVertical: SPACING.lg,
          paddingHorizontal: SPACING['3xl'],
          borderRadius: RADIUS.xl,
        } as ViewStyle,
        text: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold } as TextStyle,
      };
  }
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    textAlign: 'center',
  },
});

export default Button;
