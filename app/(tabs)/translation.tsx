import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, NativeEventEmitter, NativeModules } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission, useSkiaFrameProcessor } from 'react-native-vision-camera';
import { VisionCameraProxy } from 'react-native-vision-camera';
import { Ionicons } from '@expo/vector-icons';

const { HandLandmarks } = NativeModules;
const eventEmitter = new NativeEventEmitter(HandLandmarks);

export default function TranslationScreen() {
  const [showCamera, setShowCamera] = useState(false);
  const [signTranslation, setSignTranslation] = useState('');
  const [keypointsBuffer, setKeypointsBuffer] = useState<number[][][]>([]);
  const SEQ_LEN = 30; // Điều chỉnh theo model
  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();

  const handLandmarkPlugin = VisionCameraProxy.initFrameProcessorPlugin('hands_landmark', {});

  useEffect(() => {
    HandLandmarks.initModel();
  }, []);

  useEffect(() => {
    const sub = eventEmitter.addListener('onHandLandmarksDetected', (event) => {
      if (event.landmarks && event.landmarks.length > 0) {
        const hand = event.landmarks[0];
        const frameKeypoints: number[][] = hand.map((lm: any) => [lm.x, lm.y, lm.z]);

        setKeypointsBuffer(prev => {
          const buffer = [...prev, frameKeypoints].slice(-SEQ_LEN);
          if (buffer.length === SEQ_LEN) {
            sendToBackend(buffer);
          }
          return buffer;
        });
      }
    });
    return () => sub.remove();
  }, []);

  const sendToBackend = async (frames: number[][][]) => {
    try {
      const res = await fetch('http://YOUR_BACKEND_IP:PORT/ai/alphabet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frames })
      });
      const data = await res.json();
      if (data.label) {
        setSignTranslation(prev => prev + data.label);
      }
    } catch (e) {
      console.log('Backend error:', e);
    }
  };

  const frameProcessor = useSkiaFrameProcessor((frame) => {
    'worklet';
    if (handLandmarkPlugin) {
      (handLandmarkPlugin as any).detectHand(frame);
    }
  }, []);

  if (!hasPermission) {
    return <TouchableOpacity onPress={requestPermission}><Text>Request Camera</Text></TouchableOpacity>;
  }

  if (showCamera && device) {
    return (
      <View style={{ flex: 1 }}>
        <Camera style={{ flex: 1 }} device={device} isActive={true} frameProcessor={frameProcessor} />
        <View style={{ position: 'absolute', bottom: 40, left: 20, right: 20, backgroundColor: '#0008', padding: 15, borderRadius: 12 }}>
          <ScrollView><Text style={{ color: 'white', fontSize: 18 }}>{signTranslation}</Text></ScrollView>
        </View>
        <TouchableOpacity onPress={() => setShowCamera(false)} style={{ position: 'absolute', top: 40, right: 20 }}>
          <Ionicons name="close" size={34} color="white" />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <TouchableOpacity onPress={() => setShowCamera(true)} style={{ padding: 20, backgroundColor: '#007AFF', borderRadius: 12 }}>
        <Ionicons name="camera-outline" size={32} color="white" />
      </TouchableOpacity>
    </View>
  );
}