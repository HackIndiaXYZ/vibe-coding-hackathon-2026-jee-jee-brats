/**
 * Customer Route Group Layout
 */

import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { CUSTOMER_COLORS, FONT_WEIGHT } from '../../lib/constants';

export default function CustomerLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: CUSTOMER_COLORS.primary,
        tabBarInactiveTintColor: CUSTOMER_COLORS.textMuted,
        tabBarStyle: {
          backgroundColor: CUSTOMER_COLORS.surface,
          borderTopColor: CUSTOMER_COLORS.border,
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
        name="map"
        options={{
          title: 'Book',
          tabBarIcon: ({ color }) => <TabBarIcon name="📍" color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="auction"
        options={{
          title: 'Auction',
          tabBarIcon: ({ color }) => <TabBarIcon name="⏱️" color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="active-loads"
        options={{
          title: 'My Loads',
          tabBarIcon: ({ color }) => <TabBarIcon name="📦" color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="ar-scanner"
        options={{
          title: 'AR Scan',
          tabBarIcon: ({ color }) => <TabBarIcon name="📷" color={color as string} />,
        }}
      />
    </Tabs>
  );
}

function TabBarIcon({ name, color }: { name: string; color: string }) {
  return (
    <Text style={{ fontSize: 24, opacity: 0.8 }}>
      {name}
    </Text>
  );
}
