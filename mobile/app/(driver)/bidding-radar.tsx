/**
 * LoadKaro Bidding Radar Screen (Driver)
 * Primary deliverable: Real-time load radar + bid UI via WebSocket
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';

import { loadsWS } from '../../lib/ws';
import { useBidStore } from '../../stores/bidStore';
import { useAuthStore } from '../../stores/authStore';
import LoadRadarItem from '../../components/LoadRadarItem';
import StepperControl from '../../components/ui/StepperControl';
import Button from '../../components/ui/Button';
import {
  DRIVER_COLORS,
  FONT_SIZE,
  FONT_WEIGHT,
  SPACING,
  RADIUS,
  SHADOW,
} from '../../lib/constants';

export default function BiddingRadarScreen() {
  const router = useRouter();
  const { token } = useAuthStore();
  const {
    availableLoads,
    selectedLoadId,
    currentBidAmount,
    isConnected,
    addAvailableLoad,
    removeLoad,
    setSelectedLoad,
    setBidAmount,
    incrementBid,
    decrementBid,
    setConnected,
    isBidding,
    setIsBidding,
  } = useBidStore();

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Animations
  const pulse1Anim = useRef(new Animated.Value(0)).current;
  const pulse2Anim = useRef(new Animated.Value(0)).current;
  const pulse3Anim = useRef(new Animated.Value(0)).current;
  const toastAnim = useRef(new Animated.Value(-100)).current;

  // ─── WebSocket Setup ───────────────────────────────────────────

  useEffect(() => {
    // Set up connection listeners
    loadsWS.onConnectionChange = (status) => setConnected(status);

    // Register message handlers
    const unsubNewLoad = loadsWS.on('new_load', (msg) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      addAvailableLoad(msg.payload as any);
    });

    const unsubCancelled = loadsWS.on('load_cancelled', (msg) => {
      removeLoad((msg.payload as any).load_id);
    });

    // Connect
    loadsWS.connect(token || undefined);

    // Mock incoming loads for hackathon if no real WS
    const mockTimeout = setTimeout(() => {
      if (availableLoads.length === 0) {
        addAvailableLoad({
          load_id: 'mock-load-1',
          pickup: { latitude: 28.6139, longitude: 77.2090 },
          dropoff: { latitude: 28.4595, longitude: 77.0266 },
          pickup_address: 'Connaught Place, New Delhi',
          dropoff_address: 'DLF Cyber City, Gurugram',
          distance_km: 24.5,
          max_payout: 1200,
          required_volume: 2.5,
          auction_ends_at: new Date(Date.now() + 120000).toISOString(),
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }, 4000);

    return () => {
      unsubNewLoad();
      unsubCancelled();
      loadsWS.disconnect();
      clearTimeout(mockTimeout);
    };
  }, []);

  // ─── Radar Animation ───────────────────────────────────────────

  useEffect(() => {
    if (availableLoads.length === 0) {
      const createPulse = (anim: Animated.Value, delay: number) => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: 1,
              duration: 3000,
              delay,
              useNativeDriver: false,
            }),
            Animated.timing(anim, {
              toValue: 0,
              duration: 0,
              useNativeDriver: false,
            }),
          ])
        ).start();
      };

      createPulse(pulse1Anim, 0);
      createPulse(pulse2Anim, 1000);
      createPulse(pulse3Anim, 2000);
    } else {
      pulse1Anim.stopAnimation();
      pulse2Anim.stopAnimation();
      pulse3Anim.stopAnimation();
    }
  }, [availableLoads.length]);

  // ─── Toast Handling ────────────────────────────────────────────

  useEffect(() => {
    if (!isConnected) {
      showToast('Reconnecting to radar...', DRIVER_COLORS.warning);
    } else if (isConnected && toastMessage) {
      showToast('Connected to radar', DRIVER_COLORS.success);
      setTimeout(() => hideToast(), 2000);
    }
  }, [isConnected]);

  const showToast = (msg: string, _color: string) => {
    setToastMessage(msg);
    Animated.spring(toastAnim, {
      toValue: 50,
      useNativeDriver: false,
      bounciness: 8,
    }).start();
  };

  const hideToast = () => {
    Animated.timing(toastAnim, {
      toValue: -100,
      duration: 300,
      useNativeDriver: false,
    }).start(() => setToastMessage(null));
  };

  // ─── Bid Handling ──────────────────────────────────────────────

  const handlePlaceBid = () => {
    if (!selectedLoadId) return;

    setIsBidding(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    // Send bid via WebSocket
    loadsWS.sendBid(selectedLoadId, currentBidAmount);

    // Mock response
    setTimeout(() => {
      setIsBidding(false);
      removeLoad(selectedLoadId);
      router.push('/(driver)/active-jobs');
    }, 1500);
  };

  // ─── Render Helpers ────────────────────────────────────────────

  const renderPulseCircle = (anim: Animated.Value) => {
    const scale = anim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 4],
    });
    const opacity = anim.interpolate({
      inputRange: [0, 0.8, 1],
      outputRange: [0.6, 0.1, 0],
    });

    return (
      <Animated.View
        style={[
          styles.radarPulse,
          {
            transform: [{ scale }],
            opacity,
          },
        ]}
      />
    );
  };

  const selectedLoadInfo = availableLoads.find((l) => l.load_id === selectedLoadId);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Bidding Radar</Text>
          <View style={styles.statusBadge}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isConnected ? DRIVER_COLORS.success : DRIVER_COLORS.warning },
              ]}
            />
            <Text style={styles.statusText}>
              {isConnected ? 'LIVE' : 'CONNECTING'}
            </Text>
          </View>
        </View>

        {/* Toast Notification */}
        <Animated.View style={[styles.toast, { transform: [{ translateY: toastAnim }] }]}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>

        {/* Main Content Area */}
        <View style={styles.content}>
          {availableLoads.length === 0 ? (
            // Empty State / Radar Animation
            <View style={styles.radarContainer}>
              {renderPulseCircle(pulse1Anim)}
              {renderPulseCircle(pulse2Anim)}
              {renderPulseCircle(pulse3Anim)}
              <View style={styles.radarCenter}>
                <Text style={styles.radarIcon}>📡</Text>
              </View>
              <Text style={styles.radarText}>Scanning for loads...</Text>
            </View>
          ) : (
            // Load List
            <ScrollView
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.listHeader}>
                {availableLoads.length} Load{availableLoads.length > 1 ? 's' : ''} Found
              </Text>
              {availableLoads.map((load, index) => (
                <LoadRadarItem
                  key={load.load_id}
                  load={load}
                  isSelected={selectedLoadId === load.load_id}
                  onSelect={setSelectedLoad}
                  isNew={index === 0}
                />
              ))}
              <View style={{ height: 250 }} /> {/* Padding for bottom sheet */}
            </ScrollView>
          )}
        </View>

        {/* Bidding Bottom Sheet Panel */}
        {selectedLoadId && selectedLoadInfo && (
          <View style={styles.bidPanel}>
            <View style={styles.bidPanelHeader}>
              <Text style={styles.bidPanelTitle}>Your Bid</Text>
              <Text style={styles.maxPayoutInfo}>
                Max allowed: ₹{selectedLoadInfo.max_payout}
              </Text>
            </View>

            <View style={styles.stepperContainer}>
              <StepperControl
                value={currentBidAmount}
                step={50}
                min={100}
                max={selectedLoadInfo.max_payout}
                onIncrement={() => incrementBid(50)}
                onDecrement={() => decrementBid(50, 100)}
              />
            </View>

            <Button
              title={isBidding ? 'Placing Bid...' : `Bid ₹${currentBidAmount}`}
              onPress={handlePlaceBid}
              variant="driver"
              size="lg"
              fullWidth
              loading={isBidding}
            />
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DRIVER_COLORS.background,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: DRIVER_COLORS.border,
  },
  title: {
    fontSize: FONT_SIZE['2xl'],
    fontWeight: FONT_WEIGHT.extrabold,
    color: DRIVER_COLORS.text,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DRIVER_COLORS.surfaceElevated,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: DRIVER_COLORS.border,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    color: DRIVER_COLORS.text,
    fontSize: 10,
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: 1,
  },
  toast: {
    position: 'absolute',
    left: SPACING.xl,
    right: SPACING.xl,
    backgroundColor: DRIVER_COLORS.surfaceElevated,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: DRIVER_COLORS.border,
    alignItems: 'center',
    zIndex: 100,
    ...SHADOW.md,
  },
  toastText: {
    color: DRIVER_COLORS.text,
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
  },
  content: {
    flex: 1,
  },
  radarContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radarCenter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: DRIVER_COLORS.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: DRIVER_COLORS.primary,
    zIndex: 10,
    ...SHADOW.glow(DRIVER_COLORS.primary),
  },
  radarIcon: {
    fontSize: 32,
  },
  radarPulse: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: DRIVER_COLORS.primary,
  },
  radarText: {
    marginTop: SPACING['3xl'],
    fontSize: FONT_SIZE.lg,
    color: DRIVER_COLORS.primary,
    fontWeight: FONT_WEIGHT.semibold,
    letterSpacing: 1,
  },
  listContainer: {
    padding: SPACING.xl,
  },
  listHeader: {
    fontSize: FONT_SIZE.md,
    color: DRIVER_COLORS.textSecondary,
    fontWeight: FONT_WEIGHT.semibold,
    marginBottom: SPACING.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  bidPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: DRIVER_COLORS.surfaceElevated,
    borderTopLeftRadius: RADIUS['2xl'],
    borderTopRightRadius: RADIUS['2xl'],
    padding: SPACING.xl,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: DRIVER_COLORS.border,
    ...SHADOW.glow(DRIVER_COLORS.primary),
  },
  bidPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: SPACING.lg,
  },
  bidPanelTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: DRIVER_COLORS.text,
  },
  maxPayoutInfo: {
    fontSize: FONT_SIZE.sm,
    color: DRIVER_COLORS.warning,
    fontWeight: FONT_WEIGHT.medium,
  },
  stepperContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
});
