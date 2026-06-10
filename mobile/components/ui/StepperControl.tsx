/**
 * LoadKaro StepperControl Component
 * +/- stepper for bid amounts with min/max bounds
 * Used in driver bidding radar to adjust bid price
 */

import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  AccessibilityRole,
} from 'react-native';
import {
  DRIVER_COLORS,
  FONT_SIZE,
  FONT_WEIGHT,
  RADIUS,
  SPACING,
  SHADOW,
} from '../../lib/constants';

interface StepperControlProps {
  value: number;
  step?: number;
  min?: number;
  max?: number;
  onIncrement: () => void;
  onDecrement: () => void;
  prefix?: string;
  accessibilityLabel?: string;
}

export const StepperControl: React.FC<StepperControlProps> = ({
  value,
  step = 50,
  min = 100,
  max = 50000,
  onIncrement,
  onDecrement,
  prefix = '₹',
  accessibilityLabel = 'Bid amount stepper',
}) => {
  const decrementScale = useRef(new Animated.Value(1)).current;
  const incrementScale = useRef(new Animated.Value(1)).current;

  const animatePress = (anim: Animated.Value) => {
    Animated.sequence([
      Animated.timing(anim, {
        toValue: 0.85,
        duration: 80,
        useNativeDriver: false,
      }),
      Animated.spring(anim, {
        toValue: 1,
        speed: 50,
        bounciness: 8,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const canDecrement = value - step >= min;
  const canIncrement = value + step <= max;

  return (
    <View
      style={styles.container}
      accessibilityRole={'adjustable' as AccessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{
        min,
        max,
        now: value,
        text: `${prefix}${value}`,
      }}
    >
      <Animated.View style={{ transform: [{ scale: decrementScale }] }}>
        <TouchableOpacity
          onPress={() => {
            if (canDecrement) {
              animatePress(decrementScale);
              onDecrement();
            }
          }}
          disabled={!canDecrement}
          style={[
            styles.stepButton,
            !canDecrement && styles.stepButtonDisabled,
          ]}
          accessibilityLabel={`Decrease by ${prefix}${step}`}
          accessibilityRole={'button' as AccessibilityRole}
        >
          <Text
            style={[
              styles.stepButtonText,
              !canDecrement && styles.stepButtonTextDisabled,
            ]}
          >
            −
          </Text>
        </TouchableOpacity>
      </Animated.View>

      <View style={styles.valueContainer}>
        <Text style={styles.prefix}>{prefix}</Text>
        <Text style={styles.value}>{value.toLocaleString('en-IN')}</Text>
      </View>

      <Animated.View style={{ transform: [{ scale: incrementScale }] }}>
        <TouchableOpacity
          onPress={() => {
            if (canIncrement) {
              animatePress(incrementScale);
              onIncrement();
            }
          }}
          disabled={!canIncrement}
          style={[
            styles.stepButton,
            styles.stepButtonIncrement,
            !canIncrement && styles.stepButtonDisabled,
          ]}
          accessibilityLabel={`Increase by ${prefix}${step}`}
          accessibilityRole={'button' as AccessibilityRole}
        >
          <Text
            style={[
              styles.stepButtonText,
              styles.stepButtonIncrementText,
              !canIncrement && styles.stepButtonTextDisabled,
            ]}
          >
            +
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.base,
  },
  stepButton: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.lg,
    backgroundColor: DRIVER_COLORS.surfaceElevated,
    borderWidth: 1.5,
    borderColor: DRIVER_COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepButtonIncrement: {
    backgroundColor: DRIVER_COLORS.primary,
    borderColor: DRIVER_COLORS.primary,
    ...SHADOW.glow(DRIVER_COLORS.primary),
  },
  stepButtonDisabled: {
    opacity: 0.35,
  },
  stepButtonText: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: DRIVER_COLORS.text,
    lineHeight: 28,
  },
  stepButtonIncrementText: {
    color: DRIVER_COLORS.background,
  },
  stepButtonTextDisabled: {
    color: DRIVER_COLORS.textMuted,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    minWidth: 120,
    justifyContent: 'center',
  },
  prefix: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.medium,
    color: DRIVER_COLORS.textSecondary,
    marginRight: 2,
  },
  value: {
    fontSize: FONT_SIZE['3xl'],
    fontWeight: FONT_WEIGHT.extrabold,
    color: DRIVER_COLORS.text,
    letterSpacing: -1,
  },
});

export default StepperControl;
