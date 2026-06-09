/**
 * LoadKaro Active Loads (Customer)
 * Simple placeholder list of customer's requested/active loads
 */

import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import {
  CUSTOMER_COLORS,
  FONT_SIZE,
  FONT_WEIGHT,
  SPACING,
} from '../../lib/constants';

const MOCK_LOADS = [
  {
    id: 'load-1',
    status: 'accepted' as const,
    pickup_address: 'Koramangala, Bengaluru',
    dropoff_address: 'HSR Layout',
    price: 450,
    driver_name: 'Raj Kumar',
  },
  {
    id: 'load-2',
    status: 'completed' as const,
    pickup_address: 'Indiranagar',
    dropoff_address: 'Whitefield',
    price: 850,
    driver_name: 'Suresh Singh',
  },
];

export default function ActiveLoadsScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.title}>My Loads</Text>
      </View>

      <FlatList
        data={MOCK_LOADS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => (
          <Card theme="customer" elevated style={styles.card}>
            <View style={styles.cardHeader}>
              <Badge status={item.status} size="sm" />
              <Text style={styles.price}>₹{item.price}</Text>
            </View>

            <View style={styles.routeContainer}>
              <View style={styles.routeRow}>
                <View style={[styles.dot, { backgroundColor: CUSTOMER_COLORS.success }]} />
                <Text style={styles.address}>{item.pickup_address}</Text>
              </View>
              <View style={styles.line} />
              <View style={styles.routeRow}>
                <View style={[styles.dot, { backgroundColor: CUSTOMER_COLORS.error }]} />
                <Text style={styles.address}>{item.dropoff_address}</Text>
              </View>
            </View>

            <View style={styles.footer}>
              <Text style={styles.driverInfo}>🚛 {item.driver_name}</Text>
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
    backgroundColor: CUSTOMER_COLORS.background,
  },
  header: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: CUSTOMER_COLORS.border,
  },
  title: {
    fontSize: FONT_SIZE['2xl'],
    fontWeight: FONT_WEIGHT.extrabold,
    color: CUSTOMER_COLORS.text,
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
    color: CUSTOMER_COLORS.text,
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
    backgroundColor: CUSTOMER_COLORS.border,
    marginLeft: 4,
    marginVertical: 2,
  },
  address: {
    fontSize: FONT_SIZE.base,
    color: CUSTOMER_COLORS.text,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: CUSTOMER_COLORS.border,
    paddingTop: SPACING.md,
  },
  driverInfo: {
    fontSize: FONT_SIZE.sm,
    color: CUSTOMER_COLORS.textSecondary,
  },
});
