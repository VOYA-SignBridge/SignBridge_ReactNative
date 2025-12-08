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
  TouchableWithoutFeedback,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Keyboard
} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  VisionCameraProxy,
  useCameraFormat,
  useFrameProcessor
} from 'react-native-vision-camera';
import { useTheme } from '../../contexts/ThemeContext';
import { useVideoPlayer, VideoView } from 'expo-video';
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

export default function TranslationScreen() {
  const { colors: theme } = useTheme();

  const [showCamera, setShowCamera] = useState(false);
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
  const { hasPermission, requestPermission } = useCameraPermission();

  const [textInput, setTextInput] = useState("");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const player = useVideoPlayer(videoUrl, (player) => {
    player.loop = false;
    if (videoUrl) {
      player.play();
    }
  });

  useEffect(() => {
    if (videoUrl && player) {
      player.play();
    }
  }, [videoUrl, player]);

  useEffect(() => {
    try {
      if (HandLandmarks?.initModel) HandLandmarks.initModel();
    } catch (err) { console.error(err); }
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
      } catch (error) { console.error(error); }
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
    } catch (e) { console.error(e); }
    finally {
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
    if (plugin != null) plugin.call(frame);
  }, []);

  async function translateTextToVideo() {
    if (!textInput.trim()) return;
    Keyboard.dismiss();
    try {
      let data = await fetch("https://voya-signbridge-backend.fly.dev/sign-video/translate", {
        method: "POST",
        headers: { 'accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textInput })
      });

      if (!data.ok) return Alert.alert("Error", "Translation failed.");
      let json = await data.json();

      if (json.videos && json.videos.length > 0) {
        setVideoUrl(json.videos[0].mp4_url);
      }
    } catch (err) { Alert.alert("Error", "Network error."); }
  }

  if (showCamera) {
    if (!hasPermission || !device) return <View style={[styles.centerContainer, { backgroundColor: theme.background }]}><Text style={{ color: theme.text }}>Đang tải Camera...</Text></View>;

    return (
      <View style={styles.cameraContainer}>
        <TextInput
          ref={hiddenInputRef}
          style={styles.hiddenInput}
          autoFocus={true}
          showSoftInputOnFocus={false}
          onSubmitEditing={startRecordingFlow}
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
        />
        <HandLandmarksCanvas landmarks={handLandmarks} width={SCREEN_WIDTH} height={SCREEN_HEIGHT} />

        <View style={styles.cameraHeader}>
          <TouchableOpacity onPress={() => setShowCamera(false)} style={styles.closeBtn}>
            <Ionicons name="close" size={28} color={theme.white} />
          </TouchableOpacity>
          <View style={styles.cameraStatusTag}>
            <Text style={styles.cameraStatusText}>{statusMsg}</Text>
          </View>
        </View>

        {countdown > 0 && (
          <View style={styles.countdownOverlay}>
            <Text style={[styles.countdownText, { color: theme.primary }]}>{countdown}</Text>
          </View>
        )}

        <View style={styles.cameraBottomControls}>
          <View style={[styles.translationResultBox, { borderLeftColor: theme.primary }]}>
            <Text style={[styles.resultLabel, { color: theme.primary }]}>DỊCH:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Text style={styles.resultText}>{signTranslation || "..."}</Text>
            </ScrollView>
            <TouchableOpacity onPress={() => setSignTranslation('')} style={{ alignSelf: 'flex-end' }}>
              <Text style={{ color: theme.primary, fontSize: 12 }}>Xóa</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={startRecordingFlow}
            disabled={isProcessing || isRecording || countdown > 0}
            style={[
              styles.recordBtn,
              { backgroundColor: theme.primary },
              isRecording && styles.recordingActive,
              handCount === 0 && styles.recordDisabled
            ]}
          >
            {isProcessing ? (
              <ActivityIndicator color={theme.white} />
            ) : (
              <Ionicons name={isRecording ? "stop" : "videocam"} size={32} color={theme.white} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.mainContainer, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.contentContainer}>
            {videoUrl ? (
              <View style={styles.mediaContainer}>
                <VideoView
                  style={styles.videoPlayer}
                  player={player}
                  contentFit="contain"
                  allowsPictureInPicture
                />
              </View>
            ) : (
              <View style={[
                styles.mediaContainer,
                styles.placeholderBox,
                { borderColor: theme.lightGray, backgroundColor: theme.controlBG }
              ]}>
                <Ionicons
                  name="videocam-outline"
                  size={48}
                  color={theme.icon}
                  style={{ opacity: 0.5, marginBottom: 16 }}
                />
                <Text style={[styles.welcomeText, { color: theme.text }]}>Xin chào!</Text>
                <Text style={[styles.subText, { color: theme.icon }]}>Nhập văn bản để tôi dịch sang ngôn ngữ ký hiệu nhé.</Text>
              </View>
            )}
          </View>
        </TouchableWithoutFeedback>

        <View style={[
          styles.bottomBarContainer,
          {
            backgroundColor: theme.background,
            borderTopColor: theme.lightGray
          }
        ]}>

          <View style={[
            styles.inputWrapper,
            {
              backgroundColor: theme.white,
              borderColor: theme.lightGray
            }
          ]}>
            <TextInput
              style={[styles.textInput, { color: theme.text }]}
              placeholder="Nhập nội dung..."
              placeholderTextColor={theme.icon}
              value={textInput}
              onChangeText={setTextInput}
              onSubmitEditing={translateTextToVideo}
              returnKeyType="search"
            />

            <TouchableOpacity onPress={() => setShowCamera(true)} style={styles.cameraIconBtn}>
              <Ionicons name="camera" size={24} color={theme.icon} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.micButton,
              {
                backgroundColor: theme.primary,
                shadowColor: theme.primary
              }
            ]}
          >
            <Ionicons name="mic" size={26} color={theme.white} />
          </TouchableOpacity>

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
  mediaContainer: {
    width: '90%',
    aspectRatio: 3 / 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlayer: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
  placeholderBox: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subText: {
    fontSize: 15,
    textAlign: 'center',
  },
  bottomBarContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: Platform.OS === 'ios' ? 20 : 12,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderRadius: 30,
    paddingHorizontal: 20,
    marginRight: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  cameraIconBtn: {
    padding: 5,
    marginLeft: 5,
  },
  micButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
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
    height: 1
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
    backgroundColor: 'rgba(0,0,0,0.85)',
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
    backgroundColor: '#ff4757'
  },
  recordDisabled: {
    backgroundColor: '#ccc'
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