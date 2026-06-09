/**
 * LoadKaro Driver Dashboard
 * Earnings, active jobs summary, online status toggle
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { useAuthStore } from '../../stores/authStore';
import Card from '../../components/ui/Card';
import {
  DRIVER_COLORS,
  FONT_SIZE,
  FONT_WEIGHT,
  SPACING,
  RADIUS,
} from '../../lib/constants';

export default function DashboardScreen() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(false);

  const handleLogout = () => {
    logout();
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hey, {user?.name?.split(' ')[0]}</Text>
            <Text style={styles.subtitle}>Driver Dashboard</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Status Toggle */}
        <Card theme="driver" elevated glow={isOnline} style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View>
              <Text style={styles.statusTitle}>
                {isOnline ? 'You are Online' : 'You are Offline'}
              </Text>
              <Text style={styles.statusDesc}>
                {isOnline
                  ? 'Receiving load requests in your area'
                  : 'Go online to start receiving loads'}
              </Text>
            </View>
            <Switch
              value={isOnline}
              onValueChange={setIsOnline}
              trackColor={{ false: DRIVER_COLORS.border, true: DRIVER_COLORS.primaryDark }}
              thumbColor={isOnline ? DRIVER_COLORS.primary : DRIVER_COLORS.textMuted}
            />
          </View>
        </Card>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <Card theme="driver" style={styles.statCard}>
            <Text style={styles.statLabel}>Today's Earnings</Text>
            <Text style={styles.statValue}>₹2,450</Text>
          </Card>
          <Card theme="driver" style={styles.statCard}>
            <Text style={styles.statLabel}>Completed Trips</Text>
            <Text style={styles.statValue}>4</Text>
          </Card>
        </View>

        {/* Active Jobs Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Active Jobs</Text>
          <TouchableOpacity onPress={() => router.push('/(driver)/active-jobs')}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>

        {/* Mock Active Job */}
        <Card theme="driver" elevated style={styles.jobCard}>
          <View style={styles.jobHeader}>
            <View style={styles.jobBadge}>
              <Text style={styles.jobBadgeText}>IN TRANSIT</Text>
            </View>
            <Text style={styles.jobPrice}>₹850</Text>
          </View>
          
          <View style={styles.routeContainer}>
            <View style={styles.routeRow}>
              <View style={[styles.dot, { backgroundColor: DRIVER_COLORS.success }]} />
              <Text style={styles.address}>Connaught Place, Delhi</Text>
            </View>
            <View style={styles.line} />
            <View style={styles.routeRow}>
              <View style={[styles.dot, { backgroundColor: DRIVER_COLORS.error }]} />
              <Text style={styles.address}>DLF Cyber City, Gurugram</Text>
            </View>
          </View>
        </Card>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DRIVER_COLORS.background,
  },
  scrollContent: {
    padding: SPACING.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING['2xl'],
  },
  greeting: {
    fontSize: FONT_SIZE['2xl'],
    fontWeight: FONT_WEIGHT.extrabold,
    color: DRIVER_COLORS.text,
  },
  subtitle: {
    fontSize: FONT_SIZE.md,
    color: DRIVER_COLORS.textSecondary,
    marginTop: 2,
  },
  logoutBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: DRIVER_COLORS.surfaceElevated,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: DRIVER_COLORS.border,
  },
  logoutText: {
    color: DRIVER_COLORS.text,
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
  },
  statusCard: {
    marginBottom: SPACING.xl,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: DRIVER_COLORS.text,
    marginBottom: 4,
  },
  statusDesc: {
    fontSize: FONT_SIZE.sm,
    color: DRIVER_COLORS.textSecondary,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING['2xl'],
  },
  statCard: {
    flex: 1,
  },
  statLabel: {
    fontSize: FONT_SIZE.sm,
    color: DRIVER_COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  statValue: {
    fontSize: FONT_SIZE['2xl'],
    fontWeight: FONT_WEIGHT.bold,
    color: DRIVER_COLORS.text,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: DRIVER_COLORS.text,
  },
  seeAllText: {
    color: DRIVER_COLORS.primary,
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
  },
  jobCard: {
    marginBottom: SPACING.md,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  jobBadge: {
    backgroundColor: 'rgba(46, 205, 245, 0.1)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  jobBadgeText: {
    color: DRIVER_COLORS.primary,
    fontSize: 10,
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: 1,
  },
  jobPrice: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: DRIVER_COLORS.text,
  },
  routeContainer: {
    marginLeft: SPACING.xs,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: SPACING.md,
  },
  line: {
    width: 2,
    height: 16,
    backgroundColor: DRIVER_COLORS.border,
    marginLeft: 4,
    marginVertical: 2,
  },
  address: {
    fontSize: FONT_SIZE.base,
    color: DRIVER_COLORS.text,
  },
});
