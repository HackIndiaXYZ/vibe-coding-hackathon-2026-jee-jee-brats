/**
 * LoadKaro Map Screen (Customer)
 * Drop pins, choose Solo vs SahiYatri, Request Pickup
 */

import React, { useRef, useMemo, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';

import { useLoadStore } from '../../stores/loadStore';
import { useAuthStore } from '../../stores/authStore';
import MapPinSelector from '../../components/MapPinSelector';
import SahiYatriSheet from '../../components/SahiYatriSheet';
import { CUSTOMER_COLORS, SPACING, RADIUS, SHADOW, FONT_WEIGHT, FONT_SIZE } from '../../lib/constants';

export default function MapScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const {
    pickup,
    dropoff,
    rideMode,
    estimatedPrice,
    setPickup,
    setDropoff,
    setRideMode,
    setEstimatedPrice,
  } = useLoadStore();

  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['15%', '45%'], []);

  // Calculate estimated price when both pins are set
  React.useEffect(() => {
    if (pickup && dropoff && !estimatedPrice) {
      // Mock calculation based on distance
      const distance = Math.sqrt(
        Math.pow(pickup.latitude - dropoff.latitude, 2) +
          Math.pow(pickup.longitude - dropoff.longitude, 2)
      ) * 111; // Approx km per degree

      const basePrice = 200;
      const perKmRate = 40;
      const calculatedPrice = Math.round(basePrice + distance * perKmRate);

      setEstimatedPrice(calculatedPrice);
      bottomSheetRef.current?.expand();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [pickup, dropoff]);

  const handleRequestPickup = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // In a real app, we'd make an API call here to create the LoadRequest
    // For now, move to the auction screen
    router.push('/(customer)/auction');
  };

  const handleLogout = () => {
    logout();
    router.replace('/(auth)/login');
  };

  return (
    <View style={styles.container}>
      <MapPinSelector
        pickup={pickup}
        dropoff={dropoff}
        onPickupChange={(point) => {
          setPickup(point, 'Selected Pickup Location');
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
        onDropoffChange={(point) => {
          setDropoff(point, 'Selected Dropoff Location');
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
        style={styles.map}
      />

      {/* Header Overlay */}
      <SafeAreaView style={styles.headerContainer} edges={['top']}>
        <View style={styles.header}>
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0).toUpperCase() || 'C'}
              </Text>
            </View>
            <View>
              <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0]}</Text>
              <Text style={styles.subGreeting}>Ready to move cargo?</Text>
            </View>
          </View>

          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Bottom Sheet */}
      <BottomSheet
        ref={bottomSheetRef}
        index={pickup && dropoff ? 1 : 0}
        snapPoints={snapPoints}
        enablePanDownToClose={false}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={{ display: 'none' }} // Custom handle in SahiYatriSheet
      >
        <BottomSheetView style={styles.sheetContent}>
          {pickup && dropoff ? (
            <SahiYatriSheet
              rideMode={rideMode}
              onModeChange={(mode) => {
                setRideMode(mode);
                Haptics.selectionAsync();
              }}
              estimatedPrice={estimatedPrice}
              onRequestPickup={handleRequestPickup}
            />
          ) : (
            <View style={styles.emptySheet}>
              <Text style={styles.emptySheetTitle}>Where to?</Text>
              <Text style={styles.emptySheetDesc}>
                Set your pickup and drop-off locations on the map to see pricing and ride options.
              </Text>
            </View>
          )}
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CUSTOMER_COLORS.background,
  },
  map: {
    ...StyleSheet.absoluteFill as any,
  },
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: SPACING.base,
    marginTop: SPACING.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: RADIUS.xl,
    padding: SPACING.sm,
    ...SHADOW.sm,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: CUSTOMER_COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  avatarText: {
    color: '#FFF',
    fontWeight: FONT_WEIGHT.bold,
    fontSize: FONT_SIZE.md,
  },
  greeting: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
    color: CUSTOMER_COLORS.text,
  },
  subGreeting: {
    fontSize: FONT_SIZE.xs,
    color: CUSTOMER_COLORS.textSecondary,
  },
  logoutBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    backgroundColor: CUSTOMER_COLORS.background,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: CUSTOMER_COLORS.border,
  },
  logoutText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: CUSTOMER_COLORS.text,
  },
  sheetBackground: {
    backgroundColor: CUSTOMER_COLORS.surface,
    borderTopLeftRadius: RADIUS['2xl'],
    borderTopRightRadius: RADIUS['2xl'],
    ...SHADOW.lg,
  },
  sheetContent: {
    flex: 1,
  },
  emptySheet: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  emptySheetTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: CUSTOMER_COLORS.text,
    marginBottom: SPACING.sm,
  },
  emptySheetDesc: {
    fontSize: FONT_SIZE.sm,
    color: CUSTOMER_COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: SPACING.lg,
  },
});
