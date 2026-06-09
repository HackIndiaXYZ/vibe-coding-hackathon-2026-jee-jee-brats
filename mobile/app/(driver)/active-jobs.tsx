/**
 * LoadKaro Active Jobs (Driver)
 * Simple placeholder list of driver's accepted/in-transit jobs
 */

import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import {
  DRIVER_COLORS,
  FONT_SIZE,
  FONT_WEIGHT,
  SPACING,
  RADIUS,
} from '../../lib/constants';

const MOCK_JOBS = [
  {
    id: 'job-1',
    status: 'in_transit' as const,
    pickup_address: 'Connaught Place, New Delhi',
    dropoff_address: 'DLF Cyber City, Gurugram',
    price: 850,
    customer_name: 'Priya Sharma',
  },
  {
    id: 'job-2',
    status: 'accepted' as const,
    pickup_address: 'Okhla Phase 1, New Delhi',
    dropoff_address: 'Noida Sector 62',
    price: 1100,
    customer_name: 'Rajiv Gupta',
  },
];

export default function ActiveJobsScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.title}>My Jobs</Text>
      </View>

      <FlatList
        data={MOCK_JOBS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => (
          <Card theme="driver" elevated style={styles.card}>
            <View style={styles.cardHeader}>
              <Badge status={item.status} size="sm" />
              <Text style={styles.price}>₹{item.price}</Text>
            </View>

            <View style={styles.routeContainer}>
              <View style={styles.routeRow}>
                <View style={[styles.dot, { backgroundColor: DRIVER_COLORS.success }]} />
                <Text style={styles.address}>{item.pickup_address}</Text>
              </View>
              <View style={styles.line} />
              <View style={styles.routeRow}>
                <View style={[styles.dot, { backgroundColor: DRIVER_COLORS.error }]} />
                <Text style={styles.address}>{item.dropoff_address}</Text>
              </View>
            </View>

            <View style={styles.footer}>
              <Text style={styles.customerInfo}>👤 {item.customer_name}</Text>
            </View>
          </Card>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DRIVER_COLORS.background,
  },
  header: {
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
  listContainer: {
    padding: SPACING.xl,
  },
  card: {
    marginBottom: SPACING.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  price: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: DRIVER_COLORS.text,
  },
  routeContainer: {
    marginLeft: SPACING.xs,
    marginBottom: SPACING.md,
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
  footer: {
    borderTopWidth: 1,
    borderTopColor: DRIVER_COLORS.border,
    paddingTop: SPACING.md,
  },
  customerInfo: {
    fontSize: FONT_SIZE.sm,
    color: DRIVER_COLORS.textSecondary,
  },
});
