/**
 * LoadKaro Customer Auction Screen
 * Animated list of incoming bids from drivers
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Animated, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useBidStore } from '../../stores/bidStore';
import { useLoadStore } from '../../stores/loadStore';
import BidCard from '../../components/BidCard';
import Button from '../../components/ui/Button';
import { api } from '../../lib/api';
import {
  CUSTOMER_COLORS,
  FONT_SIZE,
  FONT_WEIGHT,
  SPACING,
  RADIUS,
  AUCTION_DURATION_SECONDS,
} from '../../lib/constants';
import type { Bid } from '../../lib/types';

export default function AuctionScreen() {
  const router = useRouter();
  const { loadId } = useLocalSearchParams<{ loadId: string }>();
  const { pickup, dropoff, rideMode, estimatedPrice } = useLoadStore();
  const { incomingBids, acceptedBid, setAcceptedBid, addIncomingBid } = useBidStore();

  const [timeLeft, setTimeLeft] = useState(AUCTION_DURATION_SECONDS);
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  // Fetch real auction state
  useEffect(() => {
    if (loadId) {
      api.getAuctionState(loadId)
        .then((state: any) => {
          if (state.time_remaining_seconds) {
            setTimeLeft(state.time_remaining_seconds);
          }
        })
        .catch((e) => console.log('Auction fetch failed (using fallback/mocks):', e));
    }
  }, [loadId]);

  // Mock incoming bids for hackathon demo
  useEffect(() => {
    let timeoutIds: ReturnType<typeof setTimeout>[] = [];

    if (!acceptedBid && incomingBids.length === 0) {
      const price = estimatedPrice || 500;
      // Mock driver 1
      timeoutIds.push(
        setTimeout(() => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          addIncomingBid({
            id: 'bid-1',
            load_request_id: 'load-1',
            driver_id: 'd1',
            driver_name: 'Raj Kumar',
            driver_rating: 4.8,
            vehicle_type: 'Tata Ace',
            amount: Math.round(price * 0.95),
            created_at: new Date().toISOString(),
          });
        }, 3000)
      );

      // Mock driver 2 (undercutting)
      timeoutIds.push(
        setTimeout(() => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          addIncomingBid({
            id: 'bid-2',
            load_request_id: 'load-1',
            driver_id: 'd2',
            driver_name: 'Suresh Singh',
            driver_rating: 4.5,
            vehicle_type: 'Mahindra Bolero',
            amount: Math.round(price * 0.85),
            created_at: new Date().toISOString(),
          });
        }, 7000)
      );
    }

    return () => timeoutIds.forEach(clearTimeout);
  }, [estimatedPrice]);

  // Timer countdown
  useEffect(() => {
    if (acceptedBid || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, acceptedBid]);

  // Pulse animation for finding drivers
  useEffect(() => {
    if (!acceptedBid && incomingBids.length === 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
    }
  }, [incomingBids.length, acceptedBid]);

  const handleAcceptBid = (bid: Bid) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setAcceptedBid(bid);
    
    // In real app, call API to accept bid
    
    setTimeout(() => {
      router.push('/(customer)/active-loads');
    }, 2000);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Live Auction</Text>
        {!acceptedBid && (
          <View style={styles.timerBadge}>
            <Text style={styles.timerText}>⏱ {formatTime(timeLeft)}</Text>
          </View>
        )}
      </View>

      {/* Summary Card */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Mode</Text>
          <Text style={styles.summaryValue}>
            {rideMode === 'sahiyatri' ? '🤝 SahiYatri Pool' : '🚚 Solo Ride'}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Est. Price</Text>
          <Text style={styles.summaryValue}>₹{estimatedPrice || 500}</Text>
        </View>
        <View style={styles.summaryRow}>
          <TouchableOpacity
            style={styles.helperBtn}
            onPress={() => {
              if (loadId) {
                api.bookHelpers(loadId, 1)
                  .then(() => alert('1 Helper booked successfully for ₹150!'))
                  .catch(() => alert('Failed to book helper.'));
              }
            }}
          >
            <Text style={styles.helperBtnText}>+ Helper</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bids List */}
      <View style={styles.listContainer}>
        {incomingBids.length === 0 ? (
          <View style={styles.emptyState}>
            <Animated.View style={[styles.pulseCircle, { transform: [{ scale: pulseAnim }] }]}>
              <Text style={styles.pulseIcon}>📡</Text>
            </Animated.View>
            <Text style={styles.emptyTitle}>Finding Drivers...</Text>
            <Text style={styles.emptyDesc}>
              Broadcasting your request to nearby drivers. Bids will appear here.
            </Text>
          </View>
        ) : (
          <FlatList
            data={incomingBids}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <BidCard
                bid={item}
                index={index}
                onAccept={handleAcceptBid}
                isAccepted={acceptedBid?.id === item.id}
              />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Cancel Button */}
      {!acceptedBid && (
        <View style={styles.footer}>
          <Button
            title="Cancel Request"
            onPress={() => router.back()}
            variant="ghost"
            size="md"
            fullWidth
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CUSTOMER_COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZE['2xl'],
    fontWeight: FONT_WEIGHT.extrabold,
    color: CUSTOMER_COLORS.text,
  },
  timerBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
  },
  timerText: {
    color: '#D97706',
    fontWeight: FONT_WEIGHT.bold,
    fontSize: FONT_SIZE.sm,
  },
  summaryCard: {
    backgroundColor: CUSTOMER_COLORS.surface,
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.lg,
    padding: SPACING.base,
    borderRadius: RADIUS.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: CUSTOMER_COLORS.border,
  },
  summaryRow: {
    alignItems: 'flex-start',
  },
  summaryLabel: {
    fontSize: FONT_SIZE.xs,
    color: CUSTOMER_COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
    color: CUSTOMER_COLORS.text,
  },
  helperBtn: {
    backgroundColor: CUSTOMER_COLORS.primaryLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
  },
  helperBtnText: {
    color: '#FFF',
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING['3xl'],
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING['2xl'],
  },
  pulseCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 107, 44, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xl,
    borderWidth: 2,
    borderColor: 'rgba(255, 107, 44, 0.3)',
  },
  pulseIcon: {
    fontSize: 40,
  },
  emptyTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: CUSTOMER_COLORS.text,
    marginBottom: SPACING.sm,
  },
  emptyDesc: {
    fontSize: FONT_SIZE.sm,
    color: CUSTOMER_COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  footer: {
    padding: SPACING.xl,
    backgroundColor: CUSTOMER_COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: CUSTOMER_COLORS.border,
  },
});
