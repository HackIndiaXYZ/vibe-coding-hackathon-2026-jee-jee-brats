/**
 * Driver Route Group Layout
 */

import { Tabs } from 'expo-router';
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
    <span style={{ fontSize: 24, filter: `grayscale(1) opacity(0.8) drop-shadow(0 0 0 ${color})` }}>
      {name}
    </span>
  );
}
