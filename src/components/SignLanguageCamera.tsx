import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  NativeEventEmitter,
  NativeModules,
  Dimensions,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  VisionCameraProxy,
  useCameraFormat,
  useFrameProcessor
} from 'react-native-vision-camera';
import { Ionicons } from '@expo/vector-icons';
import HandLandmarksCanvas from '@/components/HandLandmarksCanvas';
import { privateApi } from '@/api/privateApi';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SEQ_LEN = 24;
const FRAME_SKIP = 2;
const MIN_CONFIDENCE = 0.55;

const { HandLandmarks } = NativeModules;
const eventEmitter = new NativeEventEmitter(HandLandmarks);
const plugin = VisionCameraProxy.initFrameProcessorPlugin('hands_landmark', {});

type LandmarkPoint = { x: number; y: number; z?: number };

interface SignLanguageCameraProps {
  onClose: () => void;
  onTranslationUpdate: (text: string) => void;
  theme: any;
  showTranslationBox?: boolean;
  autoFocusInput?: boolean;
}

export default function SignLanguageCamera({
  onClose,
  onTranslationUpdate,
  theme,
  showTranslationBox = true,
  autoFocusInput = true
}: SignLanguageCameraProps) {
  const [signTranslation, setSignTranslation] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const isRecordingRef = useRef(false);
  const [countdown, setCountdown] = useState(0);
  const countdownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const [handLandmarks, setHandLandmarks] = useState<LandmarkPoint[][]>([]);
  const [statusMsg, setStatusMsg] = useState('Sẵn sàng');
  const [handCount, setHandCount] = useState(0);
  const keypointsBuffer = useRef<number[][]>([]);
  const isSending = useRef(false);
  const frameCounter = useRef(0);
  const lastEventTime = useRef(0);

  const hiddenInputRef = useRef<TextInput>(null);

  const device = useCameraDevice('back');
  const format = useCameraFormat(device, [
    { videoResolution: { width: 640, height: 480 } },
    { fps: 30 }
  ]);
  const { hasPermission } = useCameraPermission();

  useEffect(() => {
    try {
      if (HandLandmarks?.initModel) HandLandmarks.initModel();
    } catch (err) { 
      console.error(err); 
    }
  }, []);

  useEffect(() => {
    if (autoFocusInput) {
      const interval = setInterval(() => {
        if (!hiddenInputRef.current?.isFocused()) {
          hiddenInputRef.current?.focus();
        }
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [autoFocusInput]);

  const startRecordingFlow = () => {
    if (isRecording || isProcessing || countdown > 0) return;
    
    if (handCount === 0) {
      setStatusMsg("Đưa tay vào trước khi bấm");
      return;
    }

    setCountdown(3);
    let count = 3;
    countdownTimer.current = setInterval(() => {
      count--;
      setCountdown(count);
      if (count === 0) {
        if (countdownTimer.current) clearInterval(countdownTimer.current);
        keypointsBuffer.current = [];
        isRecordingRef.current = true;
        setIsRecording(true);
      }
    }, 1000);
  };

  useEffect(() => {
    const sub = eventEmitter.addListener('onHandLandmarksDetected', (event) => {
      const now = Date.now();
      if (now - lastEventTime.current < 100) return;
      lastEventTime.current = now;

      if (!event.landmarks || event.landmarks.length === 0) {
        setHandLandmarks([]);
        setHandCount(0);
        setStatusMsg('Không thấy tay');
        return;
      }

      try {
        const handsDetected = event.landmarks.slice(0, 2);
        setHandLandmarks(handsDetected);
        setHandCount(handsDetected.length);

        if (handsDetected.length > 0) {
          setStatusMsg(isRecordingRef.current
            ? `Đang ghi (${keypointsBuffer.current.length}/${SEQ_LEN})`
            : countdown > 0 
              ? `Chuẩn bị ${countdown}` 
              : `Sẵn sàng`);
        }

        if (!isRecordingRef.current) return;

        let frameVector = new Array(126).fill(0);
        handsDetected.forEach((hand: any[], handIndex: number) => {
          const offset = handIndex * 63;
          hand.slice(0, 21).forEach((lm: any, lmIndex: number) => {
            const basePos = offset + lmIndex * 3;
            frameVector[basePos] = Math.round(lm.x * 100) / 100;
            frameVector[basePos + 1] = Math.round(lm.y * 100) / 100;
            frameVector[basePos + 2] = Math.round((lm.z ?? 0) * 100) / 100;
          });
        });

        const currentBuffer = keypointsBuffer.current;
        currentBuffer.push(frameVector);
        if (currentBuffer.length > SEQ_LEN) currentBuffer.shift();

        if (currentBuffer.length === SEQ_LEN && !isSending.current) {
          sendToBackend([...currentBuffer]);
        }
      } catch (error) { 
        console.error(error); 
      }
    });
    return () => sub.remove();
  }, [countdown]);

  const sendToBackend = async (frames: number[][]) => {
    if (isSending.current) return;
    isSending.current = true;
    setIsProcessing(true);
    try {
      const res = await privateApi.post('/ai/tcn-recognize', { frames });
      const data = res.data;
      if (data.label && data.probability >= MIN_CONFIDENCE) {
        const newTranslation = signTranslation 
          ? `${signTranslation} ${data.label}` 
          : data.label;
        
        const words = signTranslation.trim().split(' ');
        if (words[words.length - 1] !== data.label) {
          setSignTranslation(newTranslation);
          onTranslationUpdate(newTranslation);
        }
      }
    } catch (e) { 
      console.error(e); 
    } finally {
      keypointsBuffer.current = [];
      isRecordingRef.current = false;
      setIsRecording(false);
      setTimeout(() => {
        isSending.current = false;
        setIsProcessing(false);
        if (autoFocusInput) {
          hiddenInputRef.current?.focus();
        }
      }, 200);
    }
  };

  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    frameCounter.current++;
    if (frameCounter.current % FRAME_SKIP !== 0) return;
    if (plugin != null) plugin.call(frame);
  }, []);

  const handleClearTranslation = () => {
    setSignTranslation('');
    onTranslationUpdate('');
  };

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
      {autoFocusInput && (
        <TextInput
          ref={hiddenInputRef}
          style={styles.hiddenInput}
          autoFocus={true}
          showSoftInputOnFocus={false}
          onSubmitEditing={() => startRecordingFlow()}
          onChangeText={(t) => {
            if(t.length > 0) {
                startRecordingFlow();
                hiddenInputRef.current?.clear();
            }
          }}
          onKeyPress={({ nativeEvent }) => {
            if (nativeEvent.key === ' ' || nativeEvent.key === 'Enter') {
              startRecordingFlow();
            }
          }}
        />
      )}

      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        format={format}
        fps={30}
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

      <View style={styles.cameraHeader}>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Ionicons name="close" size={28} color={theme.white} />
        </TouchableOpacity>
        <View style={styles.cameraStatusTag}>
          <Text style={styles.cameraStatusText}>{statusMsg}</Text>
        </View>
      </View>

      {countdown > 0 && (
        <View style={styles.countdownOverlay}>
          <Text style={[styles.countdownText, { color: theme.primary }]}>
            {countdown}
          </Text>
        </View>
      )}

      <View style={styles.cameraBottomControls}>
        {showTranslationBox && (
          <View style={[styles.translationResultBox, { borderLeftColor: theme.primary }]}>
            <Text style={[styles.resultLabel, { color: theme.primary }]}>DỊCH:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Text style={styles.resultText}>{signTranslation || "..."}</Text>
            </ScrollView>
            <TouchableOpacity 
              onPress={handleClearTranslation} 
              style={{ alignSelf: 'flex-end' }}
            >
              <Text style={{ color: theme.primary, fontSize: 12 }}>Xóa</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          onPress={startRecordingFlow}
          disabled={isProcessing || isRecording || countdown > 0}
          style={[
            styles.recordBtn,
            { backgroundColor: theme.primary },
            (isRecording || countdown > 0) && styles.recordingActive,
            handCount === 0 && styles.recordDisabled
          ]}
        >
          {isProcessing ? (
            <ActivityIndicator color={theme.white} />
          ) : (
            <Ionicons 
              name={isRecording ? "stop" : "videocam"} 
              size={32} 
              color={theme.white} 
            />
          )}
        </TouchableOpacity>
      </View>
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
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
    zIndex: -1
  },
  cameraHeader: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  cameraStatusTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 8
  },
  cameraStatusText: {
    color: 'white',
    fontWeight: 'bold'
  },
  cameraBottomControls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 20
  },
  translationResultBox: {
    width: '100%',
    backgroundColor: 'rgba(65,65,65,0.85)',
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    borderLeftWidth: 4
  },
  resultLabel: {
    fontSize: 12,
    fontWeight: 'bold'
  },
  resultText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 4
  },
  recordBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.3)'
  },
  recordingActive: {
    backgroundColor: '#ff4757',
    borderColor: 'white'
  },
  recordDisabled: {
    backgroundColor: '#ccc',
    borderColor: '#999'
  },
  countdownOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 20
  },
  countdownText: {
    fontSize: 100,
    fontWeight: 'bold'
  }
});