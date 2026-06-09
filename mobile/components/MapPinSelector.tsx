/**
 * LoadKaro MapPinSelector Component
 * Map with two draggable pins (pickup = green, dropoff = red)
 */

import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import MapView, { Marker, Region, PROVIDER_GOOGLE } from 'react-native-maps';
import { CUSTOMER_COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS } from '../lib/constants';
import type { GeoPoint } from '../lib/types';

const { width } = Dimensions.get('window');

// Default to Delhi, India
const DEFAULT_REGION: Region = {
  latitude: 28.6139,
  longitude: 77.209,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

interface MapPinSelectorProps {
  pickup: GeoPoint | null;
  dropoff: GeoPoint | null;
  onPickupChange: (point: GeoPoint) => void;
  onDropoffChange: (point: GeoPoint) => void;
  style?: any;
}

export const MapPinSelector: React.FC<MapPinSelectorProps> = ({
  pickup,
  dropoff,
  onPickupChange,
  onDropoffChange,
  style,
}) => {
  const mapRef = useRef<MapView>(null);
  const [activePin, setActivePin] = useState<'pickup' | 'dropoff' | null>(null);

  const handleMapPress = (e: any) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    const point: GeoPoint = { latitude, longitude };

    if (!pickup) {
      onPickupChange(point);
      setActivePin('pickup');
    } else if (!dropoff) {
      onDropoffChange(point);
      setActivePin('dropoff');
    }
  };

  return (
    <View style={[styles.container, style]}>
      {/* Instructions overlay */}
      {(!pickup || !dropoff) && (
        <View style={styles.instructionOverlay}>
          <View style={styles.instructionCard}>
            <Text style={styles.instructionText}>
              {!pickup
                ? '📍 Tap to set pickup location'
                : '🏁 Tap to set drop-off location'}
            </Text>
          </View>
        </View>
      )}

      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={DEFAULT_REGION}
        onPress={handleMapPress}
        showsUserLocation
        showsMyLocationButton
        showsCompass
        accessibilityLabel="Map for selecting pickup and dropoff locations"
      >
        {pickup && (
          <Marker
            coordinate={pickup}
            draggable
            onDragEnd={(e) => onPickupChange(e.nativeEvent.coordinate)}
            title="Pickup"
            description="Drag to adjust pickup location"
            pinColor="#10B981"
          />
        )}

        {dropoff && (
          <Marker
            coordinate={dropoff}
            draggable
            onDragEnd={(e) => onDropoffChange(e.nativeEvent.coordinate)}
            title="Drop-off"
            description="Drag to adjust drop-off location"
            pinColor="#EF4444"
          />
        )}
      </MapView>

      {/* Pin legend */}
      {(pickup || dropoff) && (
        <View style={styles.legend}>
          {pickup && (
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
              <Text style={styles.legendText}>Pickup</Text>
            </View>
          )}
          {dropoff && (
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
              <Text style={styles.legendText}>Drop-off</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
    width: '100%',
  },
  instructionOverlay: {
    position: 'absolute',
    top: SPACING.xl,
    left: SPACING.base,
    right: SPACING.base,
    zIndex: 10,
    alignItems: 'center',
  },
  instructionCard: {
    backgroundColor: CUSTOMER_COLORS.surface,
    borderRadius: RADIUS.xl,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  instructionText: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
    color: CUSTOMER_COLORS.text,
  },
  legend: {
    position: 'absolute',
    bottom: SPACING.xl,
    left: SPACING.base,
    flexDirection: 'row',
    gap: SPACING.base,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: SPACING.xs,
  },
  legendText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: CUSTOMER_COLORS.text,
  },
});

export default MapPinSelector;
