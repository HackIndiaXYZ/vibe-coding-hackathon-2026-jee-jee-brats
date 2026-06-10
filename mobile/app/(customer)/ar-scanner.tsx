/**
 * LoadKaro AR Scanner (Customer)
 * Uses expo-camera to scan cargo and estimate volume
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Camera, CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import Button from '../../components/ui/Button';
import {
  CUSTOMER_COLORS,
  FONT_SIZE,
  FONT_WEIGHT,
  SPACING,
  RADIUS,
} from '../../lib/constants';

export default function ARScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{ volume: number; confidence: number } | null>(null);
  const cameraRef = useRef<CameraView>(null);

  const scanLineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isScanning) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanLineAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(scanLineAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      scanLineAnim.stopAnimation();
    }
  }, [isScanning]);

  const handleCapture = async () => {
    if (!cameraRef.current) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsScanning(true);

    try {
      // In a real app, we'd capture the image and send to backend ML model
      // const photo = await cameraRef.current.takePictureAsync({ base64: true });
      
      // Mocking ML processing delay
      setTimeout(() => {
        setIsScanning(false);
        setScanResult({
          volume: 2.5, // cubic meters
          confidence: 0.92,
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }, 2500);
    } catch (error) {
      setIsScanning(false);
      console.error(error);
    }
  };

  const handleReset = () => {
    setScanResult(null);
  };

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <Text style={styles.permissionTitle}>Camera Access Required</Text>
        <Text style={styles.permissionDesc}>
          We need your camera to scan cargo and estimate volume accurately.
        </Text>
        <Button title="Grant Permission" onPress={requestPermission} />
      </SafeAreaView>
    );
  }

  const translateY = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 250],
  });

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} ref={cameraRef} />
      <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>AR Load Scanner</Text>
            <Text style={styles.headerSubtitle}>
              {scanResult ? 'Scan Complete' : 'Point camera at the cargo'}
            </Text>
          </View>

          {/* Scanner Reticle */}
          {!scanResult && (
            <View style={styles.reticleContainer}>
              <View style={styles.reticle}>
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
                
                {isScanning && (
                  <Animated.View
                    style={[styles.scanLine, { transform: [{ translateY }] }]}
                  />
                )}
              </View>
            </View>
          )}

          {/* Result Card */}
          {scanResult && (
            <View style={styles.resultCard}>
              <Text style={styles.resultTitle}>Estimated Volume</Text>
              <Text style={styles.resultVolume}>{scanResult.volume} m³</Text>
              <Text style={styles.resultConfidence}>
                Confidence: {(scanResult.confidence * 100).toFixed(0)}%
              </Text>
              <View style={styles.actionRow}>
                <Button
                  title="Retake"
                  onPress={handleReset}
                  variant="secondary"
                  style={{ flex: 1, marginRight: SPACING.sm }}
                />
                <Button
                  title="Use Estimate"
                  onPress={() => {
                    // Update store and go back to map
                  }}
                  variant="primary"
                  style={{ flex: 1, marginLeft: SPACING.sm }}
                />
              </View>
            </View>
          )}

          {/* Capture Button */}
          {!scanResult && (
            <View style={styles.controls}>
              <TouchableOpacity
                style={[styles.captureBtn, isScanning && styles.captureBtnActive]}
                onPress={handleCapture}
                disabled={isScanning}
              >
                <View style={styles.captureBtnInner} />
              </TouchableOpacity>
              {isScanning && (
                <Text style={styles.scanningText}>Analyzing volume...</Text>
              )}
            </View>
          )}
        </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    paddingTop: SPACING.xl,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: FONT_SIZE.sm,
    marginTop: 4,
  },
  reticleContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reticle: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: CUSTOMER_COLORS.primary,
    borderWidth: 4,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  scanLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: CUSTOMER_COLORS.primary,
    shadowColor: CUSTOMER_COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 5,
  },
  controls: {
    alignItems: 'center',
    paddingBottom: SPACING['3xl'],
  },
  captureBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFF',
  },
  captureBtnActive: {
    borderColor: CUSTOMER_COLORS.primary,
  },
  captureBtnInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFF',
  },
  scanningText: {
    color: '#FFF',
    marginTop: SPACING.md,
    fontWeight: FONT_WEIGHT.medium,
  },
  resultCard: {
    backgroundColor: CUSTOMER_COLORS.surface,
    margin: SPACING.xl,
    padding: SPACING.xl,
    borderRadius: RADIUS.xl,
    alignItems: 'center',
  },
  resultTitle: {
    fontSize: FONT_SIZE.sm,
    color: CUSTOMER_COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  resultVolume: {
    fontSize: 48,
    fontWeight: FONT_WEIGHT.extrabold,
    color: CUSTOMER_COLORS.primary,
    marginVertical: SPACING.sm,
  },
  resultConfidence: {
    fontSize: FONT_SIZE.sm,
    color: CUSTOMER_COLORS.success,
    marginBottom: SPACING.xl,
  },
  actionRow: {
    flexDirection: 'row',
    width: '100%',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
    backgroundColor: CUSTOMER_COLORS.background,
  },
  permissionTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    marginBottom: SPACING.md,
  },
  permissionDesc: {
    textAlign: 'center',
    color: CUSTOMER_COLORS.textSecondary,
    marginBottom: SPACING.xl,
  },
});
