/**
 * LoadKaro Map Screen (Customer)
 * Responsive Uber-like layout: Left form pane on desktop, BottomSheet on mobile
 */

import React, { useRef, useMemo, useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, useWindowDimensions, TextInput, ScrollView, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';

import { useLoadStore } from '../../stores/loadStore';
import { useAuthStore } from '../../stores/authStore';
import MapPinSelector from '../../components/MapPinSelector';
import { CUSTOMER_COLORS, SPACING, RADIUS, SHADOW, FONT_WEIGHT, FONT_SIZE } from '../../lib/constants';
import { api } from '../../lib/api';

export default function MapScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

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
    estimatedVolume,
    pickupAddress,
    dropoffAddress,
  } = useLoadStore();

  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['30%', '65%'], []);
  const [showHeader, setShowHeader] = useState(true);

  // New State
  const [places, setPlaces] = useState<any[]>([]);
  const [isDateModalVisible, setDateModalVisible] = useState(false);
  const [isTimeModalVisible, setTimeModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState('Today');
  const [selectedTime, setSelectedTime] = useState('Now');
  const [isEstimating, setIsEstimating] = useState(false);
  const [activeInput, setActiveInput] = useState<'pickup' | 'dropoff'>('pickup');
  const [pickupQuery, setPickupQuery] = useState('');
  const [dropoffQuery, setDropoffQuery] = useState('');
  const [routeCoords, setRouteCoords] = useState<any[]>([]);
  const isTypingRef = useRef<boolean>(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowHeader(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  // Request location on mount
  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        
        let location = await Location.getCurrentPositionAsync({});
        const point = { latitude: location.coords.latitude, longitude: location.coords.longitude };
        api.getReverseGeocode(point.latitude, point.longitude)
          .then(res => setPickup(point, res.title || 'Current Location'))
          .catch(() => setPickup(point, 'Current Location'));
      } catch (err) {
        console.error('Location error:', err);
      }
    })();
  }, []);

  // Sync store addresses to query inputs only when user is NOT typing
  useEffect(() => {
    if (!isTypingRef.current && pickupAddress) {
      setPickupQuery(pickupAddress);
    }
  }, [pickupAddress]);
  useEffect(() => {
    if (!isTypingRef.current && dropoffAddress) {
      setDropoffQuery(dropoffAddress);
    }
  }, [dropoffAddress]);

  // Fetch route when both points are set
  useEffect(() => {
    if (pickup && dropoff) {
      api.getRoute(pickup.latitude, pickup.longitude, dropoff.latitude, dropoff.longitude)
        .then(coords => setRouteCoords(coords))
        .catch(console.error);
    } else {
      setRouteCoords([]);
    }
  }, [pickup, dropoff]);

  // Debounced search — watches the active input's query independently
  useEffect(() => {
    const query = activeInput === 'pickup' ? pickupQuery : dropoffQuery;
    if (!isTypingRef.current) return; // only search when user is actively typing
    if (query && query.length > 2) {
      const timer = setTimeout(() => {
        api.getPlacesSuggestions(query)
          .then(res => setPlaces(res.suggestions || []))
          .catch(() => setPlaces([]));
      }, 400);
      return () => clearTimeout(timer);
    } else {
      setPlaces([]);
    }
  }, [pickupQuery, dropoffQuery]);

  // When pickup/dropoff changes, reset price so they have to estimate again
  useEffect(() => {
    if (pickup || dropoff) setEstimatedPrice(0);
  }, [pickup, dropoff]);

  const handleSeePrices = async () => {
    if (!pickup || !dropoff) return;
    setIsEstimating(true);
    try {
      const res = await api.getEstimatedPrice(
        pickup.latitude, pickup.longitude,
        dropoff.latitude, dropoff.longitude,
        rideMode,
        `${selectedDate} ${selectedTime}`
      );
      setEstimatedPrice(res.estimated_price);
      if (!isDesktop && bottomSheetRef.current) bottomSheetRef.current.expand();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.error('Price estimate error:', err);
      // Fallback price so the button doesn't get stuck
      setEstimatedPrice(150);
    } finally {
      setIsEstimating(false);
    }
  };

  const handleRequestPickup = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!pickup || !dropoff) return;
    try {
      const loadId = 'load-' + Date.now();
      const initialBid = estimatedPrice || 500;
      const requiredVolume = estimatedVolume || (rideMode === 'solo' ? 100 : 50);

      // In real app, we'd pass scheduled_time to createAuction too
      await api.createAuction(
        loadId,
        initialBid,
        'mock-zone',
        pickup.latitude,
        pickup.longitude,
        dropoff.latitude,
        dropoff.longitude,
        requiredVolume
      );
      router.push(`/(customer)/auction?loadId=${loadId}`);
    } catch (err) {
      console.error('Failed to create auction:', err);
      router.push('/(customer)/auction');
    }
  };

  const handleLogout = () => {
    logout();
    router.replace('/(auth)/login');
  };

  const selectPlace = (place: any) => {
    isTypingRef.current = false;
    if (activeInput === 'pickup') {
      setPickup({ latitude: place.latitude, longitude: place.longitude }, place.title);
      setPickupQuery(place.title);
    } else {
      setDropoff({ latitude: place.latitude, longitude: place.longitude }, place.title);
      setDropoffQuery(place.title);
    }
    setPlaces([]); // Hide suggestions after selection
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handlePickupChange = async (point: any) => {
    isTypingRef.current = false;
    setPickup(point, 'Loading address...');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const res = await api.getReverseGeocode(point.latitude, point.longitude);
      setPickup(point, res.title || 'Selected Pickup');
    } catch (e) {
      setPickup(point, 'Selected Pickup');
    }
  };

  const handleDropoffChange = async (point: any) => {
    isTypingRef.current = false;
    setDropoff(point, 'Loading address...');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const res = await api.getReverseGeocode(point.latitude, point.longitude);
      setDropoff(point, res.title || 'Selected Dropoff');
    } catch (e) {
      setDropoff(point, 'Selected Dropoff');
    }
  };

  const renderRequestForm = () => (
    <ScrollView style={styles.formContainer} contentContainerStyle={styles.formContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.formTitle}>Request a ride</Text>
      
      {/* Location Inputs */}
      <View style={[styles.inputGroup, { zIndex: 10 }]}>
        <View style={styles.locationVisual}>
          <View style={styles.dot} />
          <View style={styles.line} />
          <View style={styles.square} />
        </View>
        <View style={styles.inputs}>
          <View style={[
            styles.inputWrapper,
            activeInput === 'pickup' ? styles.inputWrapperActive : styles.inputWrapperInactive
          ]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Enter location</Text>
              <TextInput 
                style={styles.input} 
                placeholder="Where from?" 
                placeholderTextColor="#757575"
                value={pickupQuery}
                onChangeText={(text) => { isTypingRef.current = true; setPickupQuery(text); setActiveInput('pickup'); }}
                onFocus={() => setActiveInput('pickup')}
              />
            </View>
            {pickupQuery ? (
              <TouchableOpacity onPress={() => { setPickupQuery(''); setPlaces([]); }}>
                <Text style={styles.clearIcon}>✖</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          <View style={[
            styles.inputWrapper, 
            { marginTop: SPACING.sm },
            activeInput === 'dropoff' ? styles.inputWrapperActive : styles.inputWrapperInactive
          ]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Enter destination</Text>
              <TextInput 
                style={styles.input} 
                placeholder="Where to?" 
                placeholderTextColor="#757575"
                value={dropoffQuery}
                onChangeText={(text) => { isTypingRef.current = true; setDropoffQuery(text); setActiveInput('dropoff'); }}
                onFocus={() => setActiveInput('dropoff')}
              />
            </View>
            {dropoffQuery ? (
              <TouchableOpacity onPress={() => { setDropoffQuery(''); setPlaces([]); }}>
                <Text style={styles.clearIcon}>✖</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Absolute Dropdown for Suggestions */}
          {places.length > 0 && (
            <ScrollView style={styles.suggestionsDropdown} keyboardShouldPersistTaps="handled">
              {places.map(place => (
                <TouchableOpacity key={place.id} style={styles.suggestionItem} onPress={() => selectPlace(place)}>
                  <View style={styles.suggestionIconWrapper}>
                    <Text style={styles.suggestionIcon}>📍</Text>
                  </View>
                  <View style={{flex: 1}}>
                    <Text style={styles.suggestionTitle} numberOfLines={1}>{place.title}</Text>
                    <Text style={styles.suggestionDesc} numberOfLines={1}>{place.description}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </View>

      {/* Date / Time Row */}
      <View style={[styles.dateTimeRow, { zIndex: 1 }]}>
        <TouchableOpacity style={styles.dateTimeItem} onPress={() => setDateModalVisible(true)}>
          <Text style={styles.dateTimeLabel}>Date</Text>
          <View style={styles.dateTimeInput}>
            <Text style={styles.dateTimeIcon}>📅</Text>
            <Text style={styles.dateTimeText}>{selectedDate}</Text>
            <Text style={styles.dropdownIcon}>▼</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dateTimeItem} onPress={() => setTimeModalVisible(true)}>
          <Text style={styles.dateTimeLabel}>Time</Text>
          <View style={styles.dateTimeInput}>
            <Text style={styles.dateTimeIcon}>🕒</Text>
            <Text style={styles.dateTimeText}>{selectedTime}</Text>
            <Text style={styles.dropdownIcon}>▼</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Price / Action Button */}
      {estimatedPrice && estimatedPrice > 0 ? (
        <View style={styles.priceContainer}>
          <Text style={styles.estimatedPrice}>Est. ₹{estimatedPrice.toLocaleString('en-IN')}</Text>
          <TouchableOpacity style={styles.actionBtn} onPress={handleRequestPickup}>
            <Text style={styles.actionBtnText}>Request a ride</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity 
          style={pickup && dropoff ? styles.actionBtn : styles.actionBtnDisabled} 
          disabled={!pickup || !dropoff || isEstimating}
          onPress={handleSeePrices}
        >
          {isEstimating ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.actionBtnText}>See prices</Text>
          )}
        </TouchableOpacity>
      )}
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {/* Modals */}
      <Modal visible={isDateModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Date</Text>
            {['Today', 'Tomorrow', 'In 2 Days'].map(d => (
              <TouchableOpacity key={d} style={styles.modalOption} onPress={() => { setSelectedDate(d); setDateModalVisible(false); }}>
                <Text style={styles.modalOptionText}>{d}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setDateModalVisible(false)}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={isTimeModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Time</Text>
            {['Now', 'In 30 mins', 'In 1 hour'].map(t => (
              <TouchableOpacity key={t} style={styles.modalOption} onPress={() => { setSelectedTime(t); setTimeModalVisible(false); }}>
                <Text style={styles.modalOptionText}>{t}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setTimeModalVisible(false)}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Header Overlay */}
      {showHeader && (
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
      )}

      {isDesktop ? (
        <View style={styles.desktopLayout}>
          <View style={styles.leftPane}>
            <View style={styles.logoRow}>
              <Text style={styles.uberLogo}>Ride</Text>
            </View>
            {renderRequestForm()}
          </View>
          <View style={styles.rightPane}>
            <MapPinSelector
              pickup={pickup}
              dropoff={dropoff}
              routeCoords={routeCoords}
              onPickupChange={handlePickupChange}
              onDropoffChange={handleDropoffChange}
              style={styles.map}
            />
          </View>
        </View>
      ) : (
        <View style={styles.mobileLayout}>
          <View style={{ flex: 1, paddingBottom: '30%' }}>
            <MapPinSelector
              pickup={pickup}
              dropoff={dropoff}
              routeCoords={routeCoords}
              onPickupChange={handlePickupChange}
              onDropoffChange={handleDropoffChange}
              style={styles.map}
            />
          </View>
          <BottomSheet
            ref={bottomSheetRef}
            index={1}
            snapPoints={snapPoints}
            enablePanDownToClose={false}
            backgroundStyle={styles.sheetBackground}
            handleIndicatorStyle={{ backgroundColor: '#E0E0E0' }}
          >
            <BottomSheetView style={styles.sheetContent}>
              {renderRequestForm()}
            </BottomSheetView>
          </BottomSheet>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  desktopLayout: {
    flex: 1,
    flexDirection: 'row',
  },
  leftPane: {
    width: 450,
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderRightColor: '#E0E0E0',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING['3xl'],
    zIndex: 1,
  },
  logoRow: {
    marginBottom: SPACING['2xl'],
  },
  uberLogo: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000000',
  },
  rightPane: {
    flex: 1,
    padding: SPACING.md,
  },
  mobileLayout: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
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
  userInfo: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#000000', alignItems: 'center', justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  avatarText: { color: '#FFF', fontWeight: FONT_WEIGHT.bold, fontSize: FONT_SIZE.md },
  greeting: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.bold, color: '#000' },
  subGreeting: { fontSize: FONT_SIZE.xs, color: '#555' },
  logoutBtn: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs,
    backgroundColor: '#FFF', borderRadius: RADIUS.md, borderWidth: 1, borderColor: '#CCC',
  },
  logoutText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: '#000' },
  
  sheetBackground: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: RADIUS['2xl'],
    borderTopRightRadius: RADIUS['2xl'],
    ...SHADOW.lg,
  },
  sheetContent: { flex: 1, paddingHorizontal: SPACING.xl, paddingTop: SPACING.sm },
  
  // Form styles
  formContainer: { flex: 1 },
  formContent: { paddingBottom: SPACING['3xl'] },
  formTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: '#000',
    marginBottom: SPACING['2xl'],
  },
  inputGroup: {
    flexDirection: 'row',
    marginBottom: SPACING.xl,
  },
  locationVisual: {
    width: 30,
    alignItems: 'center',
    paddingTop: 15,
    paddingBottom: 15,
  },
  dot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#000',
  },
  line: {
    width: 2, flex: 1, backgroundColor: '#000', marginVertical: 4,
  },
  square: {
    width: 8, height: 8, backgroundColor: '#000',
  },
  inputs: {
    flex: 1,
    position: 'relative',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
    height: 56,
  },
  inputWrapperActive: {
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#000',
  },
  inputWrapperInactive: {
    backgroundColor: '#EEEEEE',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  inputLabel: {
    fontSize: 11,
    color: '#757575',
    fontWeight: '500',
  },
  input: {
    flex: 1,
    fontSize: FONT_SIZE.base,
    color: '#000',
    fontWeight: '500',
    paddingVertical: 2,
  },
  clearIcon: {
    fontSize: 14,
    color: '#000',
    padding: 8,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  dateTimeItem: {
    flex: 1,
  },
  dateTimeLabel: {
    fontSize: FONT_SIZE.sm,
    color: '#555',
    marginBottom: SPACING.xs,
    fontWeight: '500',
  },
  dateTimeInput: {
    backgroundColor: '#F3F3F3',
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    height: 48,
  },
  dateTimeIcon: {
    fontSize: 16,
    marginRight: SPACING.sm,
  },
  dateTimeText: {
    flex: 1,
    fontSize: FONT_SIZE.base,
    color: '#000',
    fontWeight: '500',
  },
  dropdownIcon: {
    fontSize: 12,
    color: '#000',
  },
  sectionTitle: {
    fontSize: FONT_SIZE.base,
    fontWeight: '600',
    color: '#000',
    marginBottom: SPACING.md,
  },
  suggestionsDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    borderRadius: RADIUS.md,
    marginTop: SPACING.xs,
    maxHeight: 250,
    ...SHADOW.md,
    zIndex: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F3F3',
  },
  suggestionIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EEEEEE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  suggestionIcon: {
    fontSize: 14,
    color: '#000',
  },
  suggestionTitle: {
    fontSize: FONT_SIZE.base,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  suggestionDesc: {
    fontSize: FONT_SIZE.xs,
    color: '#555',
  },
  priceContainer: {
    marginTop: SPACING.xl,
    alignItems: 'center',
  },
  estimatedPrice: {
    fontSize: FONT_SIZE.lg,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: SPACING.md,
  },
  actionBtn: {
    backgroundColor: '#000',
    borderRadius: RADIUS.md,
    paddingVertical: 16,
    alignItems: 'center',
    width: '100%',
    marginTop: SPACING.xl,
  },
  actionBtnDisabled: {
    backgroundColor: '#E0E0E0',
    borderRadius: RADIUS.md,
    paddingVertical: 16,
    alignItems: 'center',
    width: '100%',
    marginTop: SPACING.xl,
  },
  actionBtnText: {
    color: '#FFF',
    fontSize: FONT_SIZE.base,
    fontWeight: '600',
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: 300,
    backgroundColor: '#FFF',
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    ...SHADOW.lg,
  },
  modalTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: 'bold',
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  modalOption: {
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F3F3',
  },
  modalOptionText: {
    fontSize: FONT_SIZE.base,
    textAlign: 'center',
    color: '#000',
  },
  modalCloseBtn: {
    marginTop: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  modalCloseText: {
    fontSize: FONT_SIZE.base,
    color: '#EF4444',
    textAlign: 'center',
    fontWeight: '600',
  },
});
