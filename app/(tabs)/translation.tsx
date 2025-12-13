// import React, { useState, useEffect, useRef } from 'react';
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   StyleSheet,
//   NativeEventEmitter,
//   NativeModules,
//   TextInput,
//   TouchableWithoutFeedback,
//   Alert,
//   KeyboardAvoidingView,
//   Platform,
//   SafeAreaView,
//   Keyboard
// } from 'react-native';
// import {
//   useCameraDevice,
//   useCameraPermission,
//   VisionCameraProxy,
//   useCameraFormat,
//   useFrameProcessor
// } from 'react-native-vision-camera';
// import { useTheme } from '../../contexts/ThemeContext';
// import { useVideoPlayer, VideoView } from 'expo-video';
// import { Ionicons } from '@expo/vector-icons';
// import SignLanguageCamera from '@/components/SignLanguageCamera';

// import { privateApi } from '@/api/privateApi';

// const SEQ_LEN = 24;
// const FRAME_SKIP = 2;
// const MIN_CONFIDENCE = 0.55;

// const { HandLandmarks } = NativeModules;
// const eventEmitter = new NativeEventEmitter(HandLandmarks);
// const plugin = VisionCameraProxy.initFrameProcessorPlugin('hands_landmark', {});

// type LandmarkPoint = { x: number; y: number; z?: number };

// export default function TranslationScreen() {
//   const { colors: theme } = useTheme();

//   const [showCamera, setShowCamera] = useState(false);
//   const [signTranslation, setSignTranslation] = useState('');
//   const [isProcessing, setIsProcessing] = useState(false);
//   const [isRecording, setIsRecording] = useState(false);
//   const isRecordingRef = useRef(false);
//   const [countdown, setCountdown] = useState(0);
//   const countdownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

//   const [handLandmarks, setHandLandmarks] = useState<LandmarkPoint[][]>([]);
//   const [statusMsg, setStatusMsg] = useState('Sẵn sàng');
//   const [handCount, setHandCount] = useState(0);
//   const keypointsBuffer = useRef<number[][]>([]);
//   const isSending = useRef(false);
//   const frameCounter = useRef(0);
//   const lastEventTime = useRef(0);

//   const hiddenInputRef = useRef<TextInput>(null);

//   const device = useCameraDevice('back');
//   const format = useCameraFormat(device, [
//     { videoResolution: { width: 640, height: 480 } },
//     { fps: 30 }
//   ]);
//   const { hasPermission, requestPermission } = useCameraPermission();

//   const [textInput, setTextInput] = useState("");
//   const [videoUrl, setVideoUrl] = useState<string | null>(null);

//   const player = useVideoPlayer(videoUrl, (player) => {
//     player.loop = false;
//     if (videoUrl) {
//       player.play();
//     }
//   });

//   useEffect(() => {
//     if (videoUrl && player) {
//       player.play();
//     }
//   }, [videoUrl, player]);

//   useEffect(() => {
//     try {
//       if (HandLandmarks?.initModel) HandLandmarks.initModel();
//     } catch (err) { console.error(err); }
//   }, []);

//   useEffect(() => {
//     if (showCamera) {
//       const interval = setInterval(() => {
//         if (!hiddenInputRef.current?.isFocused()) {
//           hiddenInputRef.current?.focus();
//         }
//       }, 2000);
//       return () => clearInterval(interval);
//     }
//   }, [showCamera]);

//   const startRecordingFlow = () => {
//     if (isRecording || isProcessing || countdown > 0) return;
//     if (handCount === 0) {
//       setStatusMsg("Đưa tay vào trước khi bấm");
//       return;
//     }
//     setCountdown(3);
//     let count = 3;
//     countdownTimer.current = setInterval(() => {
//       count--;
//       setCountdown(count);
//       if (count === 0) {
//         if (countdownTimer.current) clearInterval(countdownTimer.current);
//         keypointsBuffer.current = [];
//         isRecordingRef.current = true;
//         setIsRecording(true);
//       }
//     }, 1000);
//   };

//   useEffect(() => {
//     const sub = eventEmitter.addListener('onHandLandmarksDetected', (event) => {
//       const now = Date.now();
//       if (now - lastEventTime.current < 100) return;
//       lastEventTime.current = now;

//       if (!event.landmarks || event.landmarks.length === 0) {
//         setHandLandmarks([]);
//         setHandCount(0);
//         setStatusMsg('Không thấy tay');
//         return;
//       }

//       try {
//         const handsDetected = event.landmarks.slice(0, 2);
//         setHandLandmarks(handsDetected);
//         setHandCount(handsDetected.length);

//         if (handsDetected.length > 0) {
//           setStatusMsg(isRecordingRef.current
//             ? `Đang ghi (${keypointsBuffer.current.length}/${SEQ_LEN})`
//             : `Sẵn sàng`);
//         }

//         if (!isRecordingRef.current) return;

//         let frameVector = new Array(126).fill(0);
//         handsDetected.forEach((hand: any[], handIndex: number) => {
//           const offset = handIndex * 63;
//           hand.slice(0, 21).forEach((lm: any, lmIndex: number) => {
//             const basePos = offset + lmIndex * 3;
//             frameVector[basePos] = Math.round(lm.x * 100) / 100;
//             frameVector[basePos + 1] = Math.round(lm.y * 100) / 100;
//             frameVector[basePos + 2] = Math.round((lm.z ?? 0) * 100) / 100;
//           });
//         });

//         const currentBuffer = keypointsBuffer.current;
//         currentBuffer.push(frameVector);
//         if (currentBuffer.length > SEQ_LEN) currentBuffer.shift();

//         if (currentBuffer.length === SEQ_LEN && !isSending.current) {
//           sendToBackend([...currentBuffer]);
//         }
//       } catch (error) { console.error(error); }
//     });
//     return () => sub.remove();
//   }, [countdown]);

//   const sendToBackend = async (frames: number[][]) => {
//     if (isSending.current) return;
//     isSending.current = true;
//     setIsProcessing(true);
//     try {
//       const res = await privateApi.post('/ai/tcn-recognize', { frames });
//       const data = res.data;
//       if (data.label && data.probability >= MIN_CONFIDENCE) {
//         setSignTranslation(prev => {
//           const words = prev.trim().split(' ');
//           if (words[words.length - 1] === data.label) return prev;
//           return prev ? `${prev} ${data.label}` : data.label;
//         });
//       }
//     } catch (e) { console.error(e); }
//     finally {
//       keypointsBuffer.current = [];
//       isRecordingRef.current = false;
//       setIsRecording(false);
//       setTimeout(() => {
//         isSending.current = false;
//         setIsProcessing(false);
//         hiddenInputRef.current?.focus();
//       }, 200);
//     }
//   };

//   const frameProcessor = useFrameProcessor((frame) => {
//     'worklet';
//     frameCounter.current++;
//     if (frameCounter.current % FRAME_SKIP !== 0) return;
//     if (plugin != null) plugin.call(frame);
//   }, []);

//   async function translateTextToVideo() {
//     if (!textInput.trim()) return;
//     Keyboard.dismiss();
//     try {
//       let response = await privateApi.post('/sign-video/translate', {
//         text: textInput.trim()
//       });

//       if (response?.data.videos && response?.data?.videos.length > 0) {
//         setVideoUrl(response?.data?.videos[0].mp4_url);
//       }
//     } catch (err) { Alert.alert("Error", "Network error."); }
//   }

//   const hasText = textInput.trim().length > 0;
  
//   const inputBackgroundColor = theme.background === '#000000' ? '#1c1c1e' : '#F2F2F7';

//   if (showCamera) {
//     return (
//       <SignLanguageCamera
//         onClose={() => setShowCamera(false)}
//         onTranslationUpdate={(text) => setSignTranslation(text)}
//         theme={theme}
//         showTranslationBox={true}
//         autoFocusInput={true}
//       />
//     );
//   }

//   return (
//     <SafeAreaView style={[styles.mainContainer, { backgroundColor: theme.background }]}>
//       <KeyboardAvoidingView
//         behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
//         style={{ flex: 1 }}
//       >
//         <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
//           <View style={styles.contentContainer}>
//             {videoUrl ? (
//               <View style={styles.mediaContainer}>
//                 <VideoView
//                   style={styles.videoPlayer}
//                   player={player}
//                   contentFit="contain"
//                   allowsPictureInPicture
//                 />
//               </View>
//             ) : (
//               <View style={[
//                 styles.mediaContainer,
//                 styles.placeholderBox,
//                 { borderColor: theme.lightGray, backgroundColor: theme.controlBG }
//               ]}>
//                 <Ionicons
//                   name="videocam-outline"
//                   size={48}
//                   color={theme.icon}
//                   style={{ opacity: 0.5, marginBottom: 16 }}
//                 />
//                 <Text style={[styles.welcomeText, { color: theme.text }]}>Xin chào!</Text>
//                 <Text style={[styles.subText, { color: theme.icon }]}>
//                   {"Nhập văn bản để tôi dịch sang\nngôn ngữ ký hiệu nhé."}
//                 </Text>
//               </View>
//             )}
//           </View>
//         </TouchableWithoutFeedback>

//         <View style={[
//           styles.bottomBarContainer,
//           {
//             backgroundColor: theme.background,
//             borderTopColor: 'transparent' 
//           }
//         ]}>

//           {/* Icon Camera bên ngoài - Size nhỏ hơn */}
//           <TouchableOpacity onPress={() => setShowCamera(true)} style={styles.iconBtnOutside}>
//             <Ionicons name="camera" size={22} color={theme.primary} />
//           </TouchableOpacity>

//           {/* Icon Mic bên ngoài - Size nhỏ hơn */}
//           <TouchableOpacity style={styles.iconBtnOutside}>
//             <Ionicons name="mic" size={22} color={theme.primary} />
//           </TouchableOpacity>

//           {/* Input Wrapper - Height nhỏ hơn */}
//           <View style={[
//             styles.inputWrapper,
//             {
//               backgroundColor: inputBackgroundColor,
//               borderColor: 'transparent'
//             }
//           ]}>
//             <TextInput
//               style={[styles.textInput, { color: theme.text }]}
//               placeholder="Nhập nội dung..."
//               placeholderTextColor={theme.icon}
//               value={textInput}
//               onChangeText={setTextInput}
//               onSubmitEditing={translateTextToVideo}
//               returnKeyType="send"
//             />
//           </View>

//           <TouchableOpacity
//             onPress={translateTextToVideo}
//             disabled={!hasText}
//             style={[
//               styles.sendButton,
//               {
//                 backgroundColor: hasText ? theme.primary : inputBackgroundColor,
//                 shadowColor: hasText ? theme.primary : 'transparent',
//                 elevation: hasText ? 5 : 0
//               }
//             ]}
//           >
//             <Ionicons name="send" size={20} color={hasText ? theme.white : theme.icon} style={{ marginLeft: hasText ? 2 : 0 }} />
//           </TouchableOpacity>

//         </View>
//       </KeyboardAvoidingView>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   mainContainer: {
//     flex: 1,
//   },
//   contentContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     paddingTop: 40,
//   },
//   mediaContainer: {
//     width: '90%',
//     aspectRatio: 3 / 4,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   videoPlayer: {
//     width: '100%',
//     height: '100%',
//     backgroundColor: 'transparent',
//   },
//   placeholderBox: {
//     borderWidth: 2,
//     borderStyle: 'dashed',
//     borderRadius: 20,
//     justifyContent: 'center',
//     alignItems: 'center',
//     padding: 24,
//   },
//   welcomeText: {
//     fontSize: 22,
//     fontWeight: 'bold',
//     marginBottom: 8,
//   },
//   subText: {
//     fontSize: 15,
//     textAlign: 'center',
//   },
//   bottomBarContainer: {
//     paddingHorizontal: 12, // Giảm padding ngoài để thêm chỗ cho input
//     paddingVertical: 10,
//     borderTopWidth: 1,
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     paddingBottom: Platform.OS === 'ios' ? 20 : 12,
//   },
//   // Nút icon bên ngoài input
//   iconBtnOutside: {
//     padding: 6, // Giảm vùng bấm một chút
//     marginRight: 2, // Khoảng cách giữa Camera và Mic rất nhỏ
//   },
//   inputWrapper: {
//     flex: 1,
//     flexDirection: 'row',
//     alignItems: 'center',
//     height: 44, // Giảm height từ 50 -> 44
//     borderRadius: 22, 
//     paddingHorizontal: 16, 
//     marginRight: 8, // Khoảng cách với nút Gửi
//     marginLeft: 4, // Khoảng cách với Mic
//     borderWidth: 0, 
//   },
//   textInput: {
//     flex: 1,
//     fontSize: 16,
//     height: '100%',
//   },
//   sendButton: {
//     width: 44, // Giảm size nút gửi từ 50 -> 44
//     height: 44,
//     borderRadius: 22,
//     justifyContent: 'center',
//     alignItems: 'center',
//     shadowOffset: { width: 0, height: 3 },
//     shadowOpacity: 0.3,
//     shadowRadius: 4,
//   },
//   cameraContainer: {
//     flex: 1,
//     backgroundColor: 'black'
//   },
//   centerContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center'
//   },
//   hiddenInput: {
//     position: 'absolute',
//     opacity: 0,
//     width: 1,
//     height: 1
//   },
//   cameraHeader: {
//     position: 'absolute',
//     top: 50,
//     left: 20,
//     right: 20,
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     zIndex: 10
//   },
//   closeBtn: {
//     width: 40,
//     height: 40,
//     borderRadius: 20,
//     backgroundColor: 'rgba(0,0,0,0.5)',
//     justifyContent: 'center',
//     alignItems: 'center'
//   },
//   cameraStatusTag: {
//     paddingHorizontal: 12,
//     paddingVertical: 6,
//     backgroundColor: 'rgba(0,0,0,0.5)',
//     borderRadius: 8
//   },
//   cameraStatusText: {
//     color: 'white',
//     fontWeight: 'bold'
//   },
//   cameraBottomControls: {
//     position: 'absolute',
//     bottom: 40,
//     left: 0,
//     right: 0,
//     alignItems: 'center',
//     paddingHorizontal: 20
//   },
//   translationResultBox: {
//     width: '100%',
//     backgroundColor: 'rgba(0,0,0,0.85)',
//     padding: 16,
//     borderRadius: 16,
//     marginBottom: 20,
//     borderLeftWidth: 4
//   },
//   resultLabel: {
//     fontSize: 12,
//     fontWeight: 'bold'
//   },
//   resultText: {
//     color: 'white',
//     fontSize: 20,
//     fontWeight: 'bold',
//     marginVertical: 4
//   },
//   recordBtn: {
//     width: 72,
//     height: 72,
//     borderRadius: 36,
//     justifyContent: 'center',
//     alignItems: 'center',
//     borderWidth: 4,
//     borderColor: 'rgba(255,255,255,0.3)'
//   },
//   recordingActive: {
//     backgroundColor: '#ff4757'
//   },
//   recordDisabled: {
//     backgroundColor: '#ccc'
//   },
//   countdownOverlay: {
//     ...StyleSheet.absoluteFillObject,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: 'rgba(0,0,0,0.4)',
//     zIndex: 20
//   },
//   countdownText: {
//     fontSize: 100,
//     fontWeight: 'bold'
//   }
// });
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Keyboard,
  Alert
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import SignLanguageCamera from '@/components/SignLanguageCamera';
import { privateApi } from '@/api/privateApi';

import WordMode from '@/components/translation/WordMode';
import AlphabetMode from '@/components/translation/AlphabetMode';

export default function TranslationScreen() {
  const { colors: theme } = useTheme();

  const [showCamera, setShowCamera] = useState(false);
  const [mode, setMode] = useState<'word' | 'letter'>('word');
  
  const [textInput, setTextInput] = useState("");
  const [translatedText, setTranslatedText] = useState(""); 

  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const player = useVideoPlayer(videoUrl, (player) => {
    player.loop = false;
    if (videoUrl) player.play();
  });

  useEffect(() => {
    if (videoUrl && player) player.play();
  }, [videoUrl, player]);

  useEffect(() => {
      setTranslatedText("");
  }, [showCamera, mode]);

  const handleWordResult = (newWord: string) => {
    setTranslatedText(prev => {
      const words = prev.trim().split(' ');
      if (words.length > 0 && words[words.length - 1].toLowerCase() === newWord.toLowerCase()) return prev;
      return prev ? `${prev} ${newWord}` : newWord;
    });
  };

  const handleLetterResult = (newChar: string) => {
    setTranslatedText(prev => prev + newChar);
  };

  const closeCamera = () => {
      setShowCamera(false);
      setTranslatedText("");
  };

  async function translateTextToVideo() {
    if (!textInput.trim()) return;
    Keyboard.dismiss();
    try {
      let response = await privateApi.post('/sign-video/translate', {
        text: textInput.trim()
      });
      if (response?.data.videos && response?.data?.videos.length > 0) {
        setVideoUrl(response?.data?.videos[0].mp4_url);
      }
    } catch (err) { Alert.alert("Error", "Network error."); }
  }

  const hasText = textInput.trim().length > 0;
  const inputBackgroundColor = theme.background === '#000000' ? '#1c1c1e' : '#F2F2F7';

  if (showCamera) {
    return (
        <View style={{flex: 1, backgroundColor: 'black'}}>
            <SignLanguageCamera theme={theme} />
            
            <TouchableOpacity 
                onPress={closeCamera} 
                style={styles.closeBtn}
                hitSlop={{top: 20, bottom: 20, left: 20, right: 20}}
            >
                <Ionicons name="close" size={28} color="white" />
            </TouchableOpacity>

            <View style={styles.modeSwitchContainer}>
                <View style={styles.modeSwitchBackground}>
                    <TouchableOpacity 
                        style={[
                            styles.modeBtn, 
                            mode === 'word' && { backgroundColor: theme.primary }
                        ]}
                        onPress={() => setMode('word')}
                    >
                        <Text style={[
                            styles.modeText, 
                            mode === 'word' && styles.modeTextActive
                        ]}>Từ vựng</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[
                            styles.modeBtn, 
                            mode === 'letter' && { backgroundColor: theme.primary }
                        ]}
                        onPress={() => setMode('letter')}
                    >
                        <Text style={[
                            styles.modeText, 
                            mode === 'letter' && styles.modeTextActive
                        ]}>Chữ cái</Text>
                    </TouchableOpacity>
                </View>
            </View>
            {mode === 'word' && (
                <View style={[styles.cameraResultBox, { borderColor: 'rgba(255,255,255,0.1)' }]}>
                    <Text style={[styles.cameraResultLabel, { color: theme.primary }]}>Kết quả dịch:</Text>
                    <Text style={styles.cameraResultText}>
                        {translatedText || "..."}
                    </Text>
                    {translatedText.length > 0 && (
                        <TouchableOpacity onPress={() => setTranslatedText("")} style={styles.clearBtn}>
                            <Text style={styles.clearBtnText}>Xóa</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}
            <View style={styles.controlLayer}>
                {mode === 'word' ? (
                    <WordMode onResult={handleWordResult} theme={theme} />
                ) : (
                    <AlphabetMode onResult={handleLetterResult} theme={theme} />
                )}
            </View>
        </View>
    );
  }
  return (
    <SafeAreaView style={[styles.mainContainer, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.contentContainer}>
            {videoUrl ? (
              <View style={styles.mediaContainer}>
                <VideoView style={styles.videoPlayer} player={player} contentFit="contain" allowsPictureInPicture />
              </View>
            ) : (
              <View style={[styles.mediaContainer, styles.placeholderBox, { borderColor: theme.lightGray, backgroundColor: theme.controlBG }]}>
                <Ionicons name="videocam-outline" size={48} color={theme.icon} style={{ opacity: 0.5, marginBottom: 16 }} />
                <Text style={[styles.welcomeText, { color: theme.text }]}>Xin chào!</Text>
                <Text style={[styles.subText, { color: theme.icon }]}>{"Nhập văn bản để tôi dịch sang\nngôn ngữ ký hiệu nhé."}</Text>
              </View>
            )}
          </View>
        </TouchableWithoutFeedback>

        <View style={[styles.bottomBarContainer, { backgroundColor: theme.background, borderTopColor: 'transparent' }]}>
          <TouchableOpacity onPress={() => setShowCamera(true)} style={styles.iconBtnOutside}>
            <Ionicons name="camera" size={22} color={theme.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtnOutside}>
            <Ionicons name="mic" size={22} color={theme.primary} />
          </TouchableOpacity>
          <View style={[styles.inputWrapper, { backgroundColor: inputBackgroundColor, borderColor: 'transparent' }]}>
            <TextInput
              style={[styles.textInput, { color: theme.text }]}
              placeholder="Nhập nội dung..."
              placeholderTextColor={theme.icon}
              value={textInput}
              onChangeText={setTextInput}
              onSubmitEditing={translateTextToVideo}
              returnKeyType="send"
            />
          </View>
          <TouchableOpacity onPress={translateTextToVideo} disabled={!hasText} style={[styles.sendButton, { backgroundColor: hasText ? theme.primary : inputBackgroundColor, elevation: hasText ? 5 : 0 }]}>
            <Ionicons name="send" size={20} color={hasText ? theme.white : theme.icon} style={{ marginLeft: hasText ? 2 : 0 }} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1 },
  contentContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 40 },
  mediaContainer: { width: '90%', aspectRatio: 3 / 4, justifyContent: 'center', alignItems: 'center' },
  videoPlayer: { width: '100%', height: '100%', backgroundColor: 'transparent' },
  placeholderBox: { borderWidth: 2, borderStyle: 'dashed', borderRadius: 20, justifyContent: 'center', alignItems: 'center', padding: 24 },
  welcomeText: { fontSize: 22, fontWeight: 'bold', marginBottom: 8 },
  subText: { fontSize: 15, textAlign: 'center' },
  bottomBarContainer: { paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: Platform.OS === 'ios' ? 20 : 12 },
  iconBtnOutside: { padding: 6, marginRight: 2 },
  inputWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', height: 44, borderRadius: 22, paddingHorizontal: 16, marginRight: 8, marginLeft: 4, borderWidth: 0 },
  textInput: { flex: 1, fontSize: 16, height: '100%' },
  sendButton: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 4 },

  closeBtn: {
      position: 'absolute',
      top: 50, 
      left: 20,
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 100, 
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.3)'
  },

  modeSwitchContainer: {
      position: 'absolute',
      top: 60, 
      width: '100%',
      alignItems: 'center',
      zIndex: 20, 
  },
  modeSwitchBackground: {
      flexDirection: 'row',
      backgroundColor: 'rgba(0,0,0,0.6)',
      borderRadius: 25,
      padding: 4,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)'
  },
  modeBtn: {
      paddingVertical: 8,
      paddingHorizontal: 24,
      borderRadius: 20,
  },
  // modeBtnActive đã inline style
  modeText: {
      color: 'rgba(255,255,255,0.7)',
      fontWeight: '600',
      fontSize: 14,
  },
  modeTextActive: {
      color: 'white', // Nổi bật trên nền Primary
      fontWeight: 'bold'
  },
  controlLayer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: '40%', 
      justifyContent: 'flex-end',
      paddingBottom: 40,
      zIndex: 10,
  },
  cameraResultBox: {
      position: 'absolute',
      top: 130, 
      left: 20,
      right: 20,
      backgroundColor: 'rgba(0,0,0,0.6)',
      padding: 16,
      borderRadius: 12,
      zIndex: 15,
      borderWidth: 1,
  },
  cameraResultLabel: {
      fontSize: 12,
      fontWeight: 'bold',
      marginBottom: 4,
  },
  cameraResultText: {
      color: 'white',
      fontSize: 20,
      fontWeight: '700',
  },
  clearBtn: {
      position: 'absolute',
      right: 10,
      top: 10,
      padding: 5
  },
  clearBtnText: {
      color: '#F87171',
      fontSize: 12,
      fontWeight: 'bold'
  },
});