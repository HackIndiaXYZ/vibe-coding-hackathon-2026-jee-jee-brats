/**
 * Driver Route Group Layout
 */

import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { DRIVER_COLORS, FONT_WEIGHT } from '../../lib/constants';

export default function DriverLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: DRIVER_COLORS.primary,
        tabBarInactiveTintColor: DRIVER_COLORS.textMuted,
        tabBarStyle: {
          backgroundColor: DRIVER_COLORS.surfaceElevated,
          borderTopColor: DRIVER_COLORS.border,
          paddingBottom: 5,
          paddingTop: 5,
        },
        tabBarLabelStyle: {
          fontWeight: FONT_WEIGHT.medium,
          fontSize: 12,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <TabBarIcon name="🏠" color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="bidding-radar"
        options={{
          title: 'Radar',
          tabBarIcon: ({ color }) => <TabBarIcon name="📡" color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="active-jobs"
        options={{
          title: 'My Jobs',
          tabBarIcon: ({ color }) => <TabBarIcon name="📋" color={color as string} />,
        }}
      />
    </Tabs>
  );
}

function TabBarIcon({ name, color }: { name: string; color: string }) {
  return (
    <Text style={{ fontSize: 24, color }}>
      {name}
    </Text>
  );
}
