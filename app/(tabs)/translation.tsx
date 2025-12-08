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
  TouchableWithoutFeedback
} from 'react-native';
import { 
  Camera, 
  useCameraDevice, 
  useCameraPermission, 
  VisionCameraProxy,
  useCameraFormat,
  useFrameProcessor
} from 'react-native-vision-camera';
import { privateApi } from '@/api/privateApi';
import HandLandmarksCanvas from '@/components/HandLandmarksCanvas';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const SEQ_LEN = 24;
const FRAME_SKIP = 2;
const MIN_CONFIDENCE = 0.55;

const { HandLandmarks } = NativeModules;
const eventEmitter = new NativeEventEmitter(HandLandmarks);
const plugin = VisionCameraProxy.initFrameProcessorPlugin('hands_landmark', {});

type LandmarkPoint = { x: number; y: number; z?: number };

export default function TranslationScreen() {
  const [showCamera, setShowCamera] = useState(false);
  const [signTranslation, setSignTranslation] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const isRecordingRef = useRef(false);

  const [countdown, setCountdown] = useState(0); 
  const countdownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const hiddenInputRef = useRef<TextInput>(null);

  const [handLandmarks, setHandLandmarks] = useState<LandmarkPoint[][]>([]);
  const [statusMsg, setStatusMsg] = useState('Sẵn sàng');
  const [handCount, setHandCount] = useState(0);

  const device = useCameraDevice('back');
  
  const format = useCameraFormat(device, [
    { videoResolution: { width: 640, height: 480 } },
    { fps: 30 } 
  ]);
  
  const { hasPermission, requestPermission } = useCameraPermission();

  const keypointsBuffer = useRef<number[][]>([]); 
  const isSending = useRef(false);
  const frameCounter = useRef(0);
  const lastEventTime = useRef(0);

  useEffect(() => {
    try {
      if (HandLandmarks && HandLandmarks.initModel) {
        HandLandmarks.initModel();
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    if (showCamera) {
      const interval = setInterval(() => {
        if (!hiddenInputRef.current?.isFocused()) {
          hiddenInputRef.current?.focus();
        }
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [showCamera]);

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
    return () => {
      if (countdownTimer.current) clearInterval(countdownTimer.current);
    };
  }, []);

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
          setStatusMsg(
            isRecordingRef.current 
              ? `Đang ghi (${keypointsBuffer.current.length}/${SEQ_LEN})`
              : countdown > 0 
                ? `Chuẩn bị ${countdown}`
                : `Sẵn sàng`
          );
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
        setSignTranslation(prev => {
          const words = prev.trim().split(' ');
          if (words[words.length - 1] === data.label) return prev;
          return prev ? `${prev} ${data.label}` : data.label;
        });
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
        hiddenInputRef.current?.focus(); 
      }, 200);
    }
  };

  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    frameCounter.current++;
    if (frameCounter.current % FRAME_SKIP !== 0) return;

    if (plugin != null) {
      try {
        plugin.call(frame); 
      } catch (error) {
        console.log(error);
      }
    }
  }, []);

  if (!hasPermission) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.textInfo}>Cần quyền Camera</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.buttonPrimary}>
          <Text style={styles.buttonText}>Cấp quyền</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={[styles.textInfo, { marginTop: 10 }]}>Đang khởi tạo...</Text>
      </View>
    );
  }

  if (showCamera) {
    return (
      <TouchableWithoutFeedback onPress={() => hiddenInputRef.current?.focus()}>
        <View style={styles.container}>
          <TextInput
            ref={hiddenInputRef}
            style={styles.hiddenInput}
            autoFocus={true}
            showSoftInputOnFocus={false}
            blurOnSubmit={false}
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

          <Camera
            style={StyleSheet.absoluteFill}
            device={device}
            format={format}
            fps={30} 
            isActive={true}
            frameProcessor={frameProcessor}
            pixelFormat="yuv"
            resizeMode="cover"
            videoStabilizationMode="off"
          />
          
          <HandLandmarksCanvas 
            landmarks={handLandmarks}
            width={SCREEN_WIDTH}
            height={SCREEN_HEIGHT}
          />

          {countdown > 0 && (
            <View style={styles.countdownOverlay}>
              <Text style={styles.countdownText}>{countdown}</Text>
            </View>
          )}

          <View style={styles.statusBar}>
            <Text style={styles.statusText}>
              {handCount} tay | {statusMsg}
            </Text>
          </View>
          
          <TouchableOpacity 
            onPress={() => {
              setShowCamera(false);
              keypointsBuffer.current = [];
              setHandLandmarks([]);
              isRecordingRef.current = false;
              setIsRecording(false);
              if (countdownTimer.current) clearInterval(countdownTimer.current);
              setCountdown(0);
            }} 
            style={styles.closeButton}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>

          <View style={styles.recordContainer}>
            <TouchableOpacity
              disabled={isProcessing || isRecording || countdown > 0}
              onPress={startRecordingFlow}
              style={[
                styles.recordButton,
                (isProcessing || isRecording || countdown > 0) && styles.recordButtonDisabled,
                handCount === 0 && { backgroundColor: '#888' }
              ]}
            >
              <Text style={styles.recordButtonText}>
                {countdown > 0 
                  ? `${countdown}...` 
                  : isRecording 
                  ? `GHI ${keypointsBuffer.current.length}/${SEQ_LEN}` 
                  : handCount === 0
                  ? 'CHƯA THẤY TAY'
                  : 'BẮT ĐẦU'} 
              </Text>
            </TouchableOpacity>
          </View>

          {isProcessing && (
            <View style={styles.processingIndicator}>
              <Text style={styles.processingText}>Đang xử lý...</Text>
            </View>
          )}

          <View style={styles.translationBox}>
            <Text style={styles.translationLabel}>KẾT QUẢ:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Text style={styles.translationText}>
                {signTranslation || "..."}
              </Text>
            </ScrollView>
            <TouchableOpacity 
              onPress={() => {
                setSignTranslation('');
                keypointsBuffer.current = [];
              }}
              style={styles.clearButton}
            >
              <Text style={styles.clearButtonText}>Xóa</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableWithoutFeedback>
    );
  }

  return (
    <View style={styles.centerContainer}>
      <Text style={styles.title}>Dịch Ngôn Ngữ Ký Hiệu</Text>
      <TouchableOpacity onPress={() => setShowCamera(true)} style={styles.bigButton}>
        <Text style={styles.bigButtonText}>BẮT ĐẦU</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: 'black' 
  },
  centerContainer: {
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: 'white', 
    padding: 20,
  },
  title: { 
    fontSize: 26, 
    fontWeight: 'bold', 
    marginBottom: 30, 
    color: '#333', 
    textAlign: 'center' 
  },
  textInfo: { 
    fontSize: 18, 
    marginBottom: 20, 
    color: '#333' 
  },
  textError: { 
    fontSize: 18, 
    color: 'red' 
  },
  buttonPrimary: { 
    backgroundColor: '#007AFF', 
    paddingVertical: 12, 
    paddingHorizontal: 24, 
    borderRadius: 8 
  },
  buttonText: { 
    color: 'white', 
    fontSize: 16, 
    fontWeight: '600' 
  },
  bigButton: {
    width: 180, 
    height: 180, 
    backgroundColor: '#007AFF', 
    borderRadius: 90, 
    justifyContent: 'center', 
    alignItems: 'center', 
    elevation: 10, 
    marginBottom: 30,
  },
  bigButtonText: { 
    color: 'white', 
    fontSize: 20, 
    fontWeight: 'bold' 
  },
  closeButton: {
    position: 'absolute', 
    top: 50, 
    right: 20, 
    backgroundColor: 'rgba(0,0,0,0.7)', 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    justifyContent: 'center', 
    alignItems: 'center', 
    zIndex: 10,
  },
  closeButtonText: { 
    color: 'white', 
    fontWeight: 'bold', 
    fontSize: 20 
  },
  statusBar: {
    position: 'absolute', 
    top: 50, 
    left: 20, 
    backgroundColor: 'rgba(0,0,0,0.7)', 
    paddingVertical: 10, 
    paddingHorizontal: 16, 
    borderRadius: 10,
  },
  statusText: { 
    color: 'white', 
    fontSize: 14, 
    fontWeight: '600' 
  },
  recordContainer: { 
    position: 'absolute', 
    bottom: 140, 
    left: 20, 
    right: 20, 
    alignItems: 'center' 
  },
  recordButton: {
    backgroundColor: '#ff4d4f', 
    paddingVertical: 16, 
    paddingHorizontal: 32, 
    borderRadius: 30, 
    minWidth: 220,
  },
  recordButtonDisabled: { 
    opacity: 0.5, 
    backgroundColor: '#666' 
  },
  recordButtonText: { 
    color: 'white', 
    fontSize: 16, 
    fontWeight: '700', 
    textAlign: 'center' 
  },
  processingIndicator: {
    position: 'absolute', 
    top: 110, 
    left: 20, 
    backgroundColor: 'rgba(0,122,255,0.9)', 
    paddingVertical: 8, 
    paddingHorizontal: 16, 
    borderRadius: 20,
  },
  processingText: { 
    color: 'white', 
    fontSize: 14, 
    fontWeight: '600' 
  },
  translationBox: {
    position: 'absolute', 
    bottom: 30, 
    left: 20, 
    right: 20, 
    backgroundColor: 'rgba(0, 0, 0, 0.85)', 
    padding: 16, 
    borderRadius: 16, 
    borderWidth: 2, 
    borderColor: '#4dabf7',
  },
  translationLabel: { 
    color: '#4dabf7', 
    fontSize: 12, 
    marginBottom: 5, 
    fontWeight: '700' 
  },
  translationText: { 
    color: 'white', 
    fontSize: 20, 
    fontWeight: 'bold', 
    minHeight: 28 
  },
  clearButton: { 
    marginTop: 8, 
    alignSelf: 'flex-end' 
  },
  clearButtonText: { 
    color: '#4dabf7', 
    fontSize: 13, 
    fontWeight: '600' 
  },
  hiddenInput: { 
    position: 'absolute', 
    opacity: 0, 
    width: 1, 
    height: 1 
  },
  countdownOverlay: {
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0, 
    justifyContent: 'center', 
    alignItems: 'center', 
    zIndex: 20,
  },
  countdownText: {
    fontSize: 120, 
    fontWeight: 'bold', 
    color: '#00e676', 
    textShadowColor: 'rgba(0, 0, 0, 0.75)', 
    textShadowOffset: { width: 2, height: 2 }, 
    textShadowRadius: 10,
  }
});