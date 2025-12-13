import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions, ActivityIndicator, Text } from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  VisionCameraProxy,
  useFrameProcessor
} from 'react-native-vision-camera';
import { NativeEventEmitter, NativeModules } from 'react-native';
import HandLandmarksCanvas from '@/components/HandLandmarksCanvas';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const FRAME_SKIP = 2; 

const { HandLandmarks } = NativeModules;
const eventEmitter = new NativeEventEmitter(HandLandmarks);
const plugin = VisionCameraProxy.initFrameProcessorPlugin('hands_landmark', {});

type LandmarkPoint = { x: number; y: number; z?: number };

interface SignLanguageCameraProps {
  theme: any; 
}

export default function SignLanguageCamera({ theme }: SignLanguageCameraProps) {
  const { hasPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  
  // State chỉ dùng để vẽ Canvas
  const [handLandmarks, setHandLandmarks] = useState<LandmarkPoint[][]>([]);

  // Init Model khi mount
  useEffect(() => {
    try {
      if (HandLandmarks?.initModel) HandLandmarks.initModel();
    } catch (err) { 
      console.error(err); 
    }
  }, []);

  // Lắng nghe sự kiện để vẽ Canvas
  useEffect(() => {
    const sub = eventEmitter.addListener('onHandLandmarksDetected', (event) => {
      if (event.landmarks) {
         setHandLandmarks(event.landmarks);
      } else {
         setHandLandmarks([]);
      }
    });
    return () => sub.remove();
  }, []);

  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    // Logic frame skip để giảm tải CPU
    // frame.counter chưa có sẵn, ta dùng random hoặc biến global bên ngoài nếu cần thiết
    // Ở đây gọi plugin liên tục, plugin native sẽ tự handle skip hoặc device fps thấp
    if (plugin != null) plugin.call(frame);
  }, []);

  if (!hasPermission || !device) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={{ color: theme.text, marginTop: 10 }}>Đang khởi tạo Camera...</Text>
      </View>
    );
  }

  return (
    <View style={styles.cameraContainer}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        frameProcessor={frameProcessor}
        pixelFormat="yuv"
        resizeMode="cover"
      />

      <HandLandmarksCanvas 
        landmarks={handLandmarks} 
        width={SCREEN_WIDTH} 
        height={SCREEN_HEIGHT} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  cameraContainer: {
    flex: 1,
    backgroundColor: 'black'
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
});