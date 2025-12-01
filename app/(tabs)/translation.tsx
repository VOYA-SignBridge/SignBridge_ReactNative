// import React, { useState, useEffect } from 'react';
// import { 
//   View, 
//   Text, 
//   TouchableOpacity, 
//   ScrollView, 
//   StyleSheet, 
//   NativeEventEmitter, 
//   NativeModules,
//   Dimensions 
// } from 'react-native';
// import { 
//   Camera, 
//   useCameraDevice, 
//   useCameraPermission, 
//   useFrameProcessor, 
//   VisionCameraProxy 
// } from 'react-native-vision-camera';

// const { HandLandmarks } = NativeModules;
// const eventEmitter = new NativeEventEmitter(HandLandmarks);

// const plugin = VisionCameraProxy.initFrameProcessorPlugin('hands_landmark', {});

// export default function TranslationScreen() {
//   const [showCamera, setShowCamera] = useState(false);
//   const [signTranslation, setSignTranslation] = useState('');
  
//   const device = useCameraDevice('back') || useCameraDevice('front');
//   const { hasPermission, requestPermission } = useCameraPermission();

//   const SEQ_LEN = 30; 
//   const keypointsBuffer = React.useRef<number[][][]>([]); 

//   // --- INIT MODEL ---
//   useEffect(() => {
//     try {
//       if (HandLandmarks && HandLandmarks.initModel) {
//         HandLandmarks.initModel();
//         console.log("Model initialized signal sent");
//       } else {
//         console.error("HandLandmarks module not found!");
//       }
//     } catch (err) {
//       console.error("Error init model:", err);
//     }
//   }, []);

//   // --- LISTEN EVENTS ---
//   useEffect(() => {
//     const sub = eventEmitter.addListener('onHandLandmarksDetected', (event) => {
//       // console.log("Received landmarks:", event.landmarks?.length); 

//       if (event.landmarks && event.landmarks.length > 0) {
//         const hand = event.landmarks[0];
//         const frameKeypoints = hand.map((lm: any) => [lm.x, lm.y, lm.z]);


//         const currentBuffer = keypointsBuffer.current;
//         currentBuffer.push(frameKeypoints);

//         if (currentBuffer.length > SEQ_LEN) {
//           currentBuffer.shift();
//         }

//         if (currentBuffer.length === SEQ_LEN) {
//           sendToBackend([...currentBuffer]);
//           // Tùy chọn: Clear buffer hoặc giữ lại trượt cửa sổ (Sliding Window)
//           // keypointsBuffer.current = []; 
//         }
//       }
//     });

//     return () => sub.remove();
//   }, []);

//   const sendToBackend = async (frames: any) => {
//     try {
//       // console.log("Sending to backend...");
//       const res = await fetch('http://192.168.1.21:8000/ai/tcn-recognize', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ frames })
//       });
//       const data = await res.json();
//       if (data.label) {
//         console.log("Prediction:", data.label);
//         setSignTranslation(prev => prev + data.label);
//       }
//     } catch (e) {
//       console.log('Backend error:', e);
//     }
//   };

//   // --- FRAME PROCESSOR ---
//   const frameProcessor = useFrameProcessor((frame) => {
//     'worklet';
//     if (plugin != null) {
//       // Gọi plugin native để xử lý frame
//       plugin.call(frame); 
//     }
//   }, []);

//   // --- RENDER ---

//   // 1. Chưa cấp quyền
//   if (!hasPermission) {
//     return (
//       <View style={styles.centerContainer}>
//         <Text style={styles.textInfo}>Cần quyền truy cập Camera</Text>
//         <TouchableOpacity onPress={requestPermission} style={styles.buttonPrimary}>
//           <Text style={styles.buttonText}>Cấp quyền Camera</Text>
//         </TouchableOpacity>
//       </View>
//     );
//   }

//   // 2. Không tìm thấy Camera
//   if (device == null) {
//     return (
//       <View style={styles.centerContainer}>
//         <Text style={styles.textError}>Không tìm thấy Camera trên thiết bị này!</Text>
//       </View>
//     );
//   }

//   // 3. Màn hình Camera
//   if (showCamera) {
//     return (
//       <View style={styles.container}>
//         <Camera
//           style={StyleSheet.absoluteFill}
//           device={device}
//           isActive={true}
//           frameProcessor={frameProcessor}
//           pixelFormat="yuv" // Android Mediapipe thường thích YUV
//         />
        
//         {/* Nút Đóng Camera */}
//         <TouchableOpacity 
//           onPress={() => setShowCamera(false)} 
//           style={styles.closeButton}
//         >
//           <Text style={styles.closeButtonText}>Đóng</Text>
//         </TouchableOpacity>

//         {/* Khung hiển thị kết quả dịch */}
//         <View style={styles.translationBox}>
//           <Text style={styles.translationLabel}>Dịch:</Text>
//           <ScrollView horizontal>
//             <Text style={styles.translationText}>{signTranslation || "Đang chờ..."}</Text>
//           </ScrollView>
//         </View>
//       </View>
//     );
//   }

//   // 4. Màn hình Chính (Nút Mở Camera)
//   return (
//     <View style={styles.centerContainer}>
//       <Text style={styles.title}>Dịch Ngôn Ngữ Ký Hiệu</Text>
      
//       <TouchableOpacity 
//         onPress={() => setShowCamera(true)} 
//         style={styles.bigButton}
//       >
//         {/* Dùng Text thay vì Icon để chắc chắn hiển thị */}
//         <Text style={styles.bigButtonText}>📷 MỞ CAMERA</Text>
//       </TouchableOpacity>

//       <Text style={{marginTop: 20, color: '#666'}}>
//          Nhấn vào nút trên để bắt đầu
//       </Text>
//     </View>
//   );
// }

// // --- STYLES ---
// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: 'black',
//   },
//   centerContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: 'white', // Quan trọng: cần màu nền để thấy nút
//   },
//   title: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     marginBottom: 40,
//     color: '#333',
//   },
//   textInfo: {
//     fontSize: 18,
//     marginBottom: 20,
//   },
//   textError: {
//     fontSize: 18,
//     color: 'red',
//   },
//   buttonPrimary: {
//     backgroundColor: '#007AFF',
//     paddingVertical: 12,
//     paddingHorizontal: 24,
//     borderRadius: 8,
//   },
//   buttonText: {
//     color: 'white',
//     fontSize: 16,
//     fontWeight: '600',
//   },
//   bigButton: {
//     width: 200,
//     height: 200,
//     backgroundColor: '#007AFF',
//     borderRadius: 100, // Hình tròn
//     justifyContent: 'center',
//     alignItems: 'center',
//     elevation: 5, // Shadow Android
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.25,
//     shadowRadius: 3.84,
//   },
//   bigButtonText: {
//     color: 'white',
//     fontSize: 20,
//     fontWeight: 'bold',
//   },
//   closeButton: {
//     position: 'absolute',
//     top: 50,
//     right: 20,
//     backgroundColor: 'rgba(0,0,0,0.5)',
//     padding: 10,
//     borderRadius: 20,
//     zIndex: 10,
//   },
//   closeButtonText: {
//     color: 'white',
//     fontWeight: 'bold',
//   },
//   translationBox: {
//     position: 'absolute',
//     bottom: 30,
//     left: 20,
//     right: 20,
//     backgroundColor: 'rgba(0, 0, 0, 0.7)',
//     padding: 15,
//     borderRadius: 12,
//   },
//   translationLabel: {
//     color: '#aaa',
//     fontSize: 12,
//     marginBottom: 5,
//   },
//   translationText: {
//     color: 'white',
//     fontSize: 22,
//     fontWeight: 'bold',
//   },
// });

import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  StyleSheet, 
  NativeEventEmitter, 
  NativeModules,
  Alert
} from 'react-native';
import { 
  Camera, 
  useCameraDevice, 
  useCameraPermission, 
  useFrameProcessor, 
  VisionCameraProxy,
  useCameraFormat
} from 'react-native-vision-camera';
import { privateApi } from '@/src/api/privateApi';
import HandOverlay, { HandStatus } from '@/src/components/HandOverlay';


const SEQ_LEN = 30;
const FRAME_SKIP = 2; // Chỉ xử lý 1 frame trong 3 frames (10 FPS nếu camera 30 FPS)

const { HandLandmarks } = NativeModules;
const eventEmitter = new NativeEventEmitter(HandLandmarks);
const plugin = VisionCameraProxy.initFrameProcessorPlugin('hands_landmark', {});

export default function TranslationScreen() {
  const [showCamera, setShowCamera] = useState(false);
  const [signTranslation, setSignTranslation] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // ⭐ NEW: ghi 1 đoạn 30 frames
  const [isRecording, setIsRecording] = useState(false);
  const isRecordingRef = useRef(false);      // để dùng trong listener

  const device = useCameraDevice('back') || useCameraDevice('front');
  const format = useCameraFormat(device, [{ fps: 30 }]);
  const { hasPermission, requestPermission } = useCameraPermission();

  const keypointsBuffer = useRef<number[][]>([]); 
  const isSending = useRef(false);
  const frameCounter = useRef(0);
  const lastEventTime = useRef(0);

  // ⭐ trạng thái overlay
  const [handStatus, setHandStatus] = useState<HandStatus>('none');
  const [statusMsg, setStatusMsg] = useState('Đưa tay vào khung hình');

  useEffect(() => {
    try {
      if (HandLandmarks && HandLandmarks.initModel) {
        HandLandmarks.initModel();
        console.log("Model initialized signal sent");
      } else {
        console.error("HandLandmarks module not found!");
        Alert.alert("Lỗi", "Không tìm thấy module nhận diện tay.");
      }
    } catch (err) {
      console.error("Error init model:", err);
    }
  }, []);

  useEffect(() => {
  const sub = eventEmitter.addListener('onHandLandmarksDetected', (event) => {
    const now = Date.now();
    if (now - lastEventTime.current < 100) return;
    lastEventTime.current = now;

    if (!event.landmarks || event.landmarks.length === 0) {
      setHandStatus('none');
      setStatusMsg('Không thấy tay – đưa tay vào khung');
      return;
    }

    try {
      // Tối đa 2 tay
      const handsDetected = event.landmarks.slice(0, 2);

      // ==== TÍNH VÙNG AN TOÀN ====
      let minX = 1, maxX = 0, minY = 1, maxY = 0;
      handsDetected.forEach((hand: any[]) => {
        hand.forEach((lm: any) => {
          const x = lm.x ?? 0;
          const y = lm.y ?? 0;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        });
      });

      const SAFE_MIN = 0.2;
      const SAFE_MAX = 0.8;
      const inSafeArea =
        minX > SAFE_MIN &&
        maxX < SAFE_MAX &&
        minY > SAFE_MIN &&
        maxY < SAFE_MAX;

      if (!inSafeArea) {
        setHandStatus('bad');
        setStatusMsg('Đưa tay vào giữa khung để nhận diện chính xác');
      } else {
        setHandStatus('ok');
        setStatusMsg(
          isRecordingRef.current
            ? '✅ Đang ghi – giữ tay trong khung'
            : handsDetected.length === 2
            ? '✅ Đã thấy 2 tay – sẵn sàng ghi'
            : '✅ Tay trong vùng an toàn – có thể bấm ghi'
        );
      }

      // Nếu chưa bấm Ghi thì chỉ hiển thị overlay, không thu frame
      if (!isRecordingRef.current) return;

      // ==== BUILD VECTOR 126 CHIỀU ====
      let frameVector = new Array(126).fill(0);
      handsDetected.forEach((hand: any[], handIndex: number) => {
        const offset = handIndex * 63;
        hand.slice(0, 21).forEach((lm: any, lmIndex: number) => {
          const basePos = offset + lmIndex * 3;
          frameVector[basePos] = lm.x ?? 0;
          frameVector[basePos + 1] = lm.y ?? 0;
          frameVector[basePos + 2] = lm.z ?? 0;
        });
      });

      if (handsDetected.length > 0 && inSafeArea) {
        const currentBuffer = keypointsBuffer.current;
        currentBuffer.push(frameVector);
        if (currentBuffer.length > SEQ_LEN) currentBuffer.shift();

        if (currentBuffer.length === SEQ_LEN && !isSending.current) {
          sendToBackend([...currentBuffer]);
        }
      }
    } catch (error) {
      console.error('Error processing landmarks:', error);
    }
  });

  return () => sub.remove();
}, []);


  const sendToBackend = async (frames: number[][]) => {
    if (isSending.current) return;
    
    isSending.current = true;
    setIsProcessing(true);

    try {
      const res = await privateApi.post('/ai/tcn-recognize', { frames });
      console.log("Response from backend:", res.data.label);
      const data = res.data;

      if (data.label) {
        console.log("Kết quả:", data.label, " (confidence:", data.probability, ")");
        if(data.probability < 0.5){
          console.log("Độ tin cậy thấp, bỏ qua.");
          return;
        }
        setSignTranslation(prev => {
          const words = prev.trim().split(' ');
          const lastWord = words[words.length - 1];
          if (lastWord === data.label) return prev;
          return prev ? `${prev} ${data.label}` : data.label;
        });
      }
    } catch (e) {
      console.log('Lỗi kết nối:', e);
    } finally {
      // Sau khi gửi xong 1 đoạn → reset
      keypointsBuffer.current = [];
      isRecordingRef.current = false;
      setIsRecording(false);          // B: dừng ghi sau 1 đoạn

      setTimeout(() => {
        isSending.current = false;
        setIsProcessing(false);
      }, 500);
    }
  };

  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    frameCounter.current++;
    if (frameCounter.current % FRAME_SKIP !== 0) {
      return;
    }

    if (plugin != null) {
      try {
        plugin.call(frame); 
      } catch (error) {
        console.log('Frame processing error:', error);
      }
    }
  }, []);

  if (!hasPermission) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.textInfo}>Cần quyền truy cập Camera</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.buttonPrimary}>
          <Text style={styles.buttonText}>Cấp quyền</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (device == null) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.textError}>Không tìm thấy Camera!</Text>
      </View>
    );
  }

  if (showCamera) {
    return (
      <View style={styles.container}>
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          format={format}
          fps={format?.maxFps ?? 30}
          isActive={true}
          frameProcessor={frameProcessor}
          pixelFormat="yuv"
        />
        
        
        {/* Đóng camera */}
        <TouchableOpacity 
          onPress={() => {
            setShowCamera(false);
            keypointsBuffer.current = [];
            frameCounter.current = 0;
            isRecordingRef.current = false;
            setIsRecording(false);
          }} 
          style={styles.closeButton}
        >
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>

        {/* Nút GHI 1 ĐOẠN */}
        <View style={styles.recordContainer}>
          <TouchableOpacity
            disabled={(isProcessing || isRecording) }
            onPress={() => {
              // C: chỉ bắt đầu thu khi bấm nút
              keypointsBuffer.current = [];
              isRecordingRef.current = true;
              setIsRecording(true);
            }}
            style={[
              styles.recordButton,
              (isProcessing || isRecording) && styles.recordButtonDisabled,
            ]}
          >
            <Text style={styles.recordButtonText}>
              {isRecording ? 'ĐANG GHI 30 FRAMES...' : '🎬 GHI 1 ĐOẠN (30 FRAMES)'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.recordHint}>
            Đưa tay vào khung hình sau khi bấm ghi
          </Text>
        </View>

        {/* Processing indicator */}
        {isProcessing && (
          <View style={styles.processingIndicator}>
            <Text style={styles.processingText}>🤖 Đang xử lý...</Text>
          </View>
        )}

        {/* Buffer indicator */}
        {isRecording && (
          <View style={styles.bufferIndicator}>
            <View style={styles.bufferBar}>
              <View 
                style={[
                  styles.bufferFill, 
                  { width: `${(keypointsBuffer.current.length / SEQ_LEN) * 100}%` }
                ]} 
              />
            </View>
            <Text style={styles.bufferText}>
              {keypointsBuffer.current.length}/{SEQ_LEN} frames
            </Text>
          </View>
        )}

        <View style={styles.translationBox}>
          <Text style={styles.translationLabel}>AI Đang dịch:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Text style={styles.translationText}>
              {signTranslation || "Bấm ghi và đưa tay vào khung hình..."}
            </Text>
          </ScrollView>
          <TouchableOpacity 
            onPress={() => {
              setSignTranslation('');
              keypointsBuffer.current = [];
            }} 
            style={{alignSelf: 'flex-end', marginTop: 5}}
          >
             <Text style={{color: '#4dabf7', fontSize: 13}}>Xóa tất cả</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.centerContainer}>
      <Text style={styles.title}>Dịch Ngôn Ngữ Ký Hiệu</Text>
      
      <TouchableOpacity 
        onPress={() => setShowCamera(true)} 
        style={styles.bigButton}
      >
        <Text style={styles.bigButtonText}>📷 BẮT ĐẦU</Text>
      </TouchableOpacity>

      <Text style={styles.guideText}>
         Vào camera, bấm "Ghi 1 đoạn (30 frames)" để thu ký hiệu
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  centerContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white',
  },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 40, color: '#333' },
  textInfo: { fontSize: 18, marginBottom: 20, color: '#333' },
  textError: { fontSize: 18, color: 'red' },
  guideText: { marginTop: 20, color: '#666', fontSize: 16 },
  buttonPrimary: {
    backgroundColor: '#007AFF', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8,
  },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  bigButton: {
    width: 180, height: 180, backgroundColor: '#007AFF', borderRadius: 90,
    justifyContent: 'center', alignItems: 'center', elevation: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 5,
  },
  bigButtonText: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  closeButton: {
    position: 'absolute', top: 50, right: 20,
    backgroundColor: 'rgba(0,0,0,0.7)', width: 40, height: 40,
    borderRadius: 20, justifyContent: 'center', alignItems: 'center', zIndex: 10,
  },
  closeButtonText: { color: 'white', fontWeight: 'bold', fontSize: 20 },

  // ⭐ NEW styles
  recordContainer: {
    position: 'absolute',
    bottom: 140,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  recordButton: {
    backgroundColor: '#ff4d4f',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
  },
  recordButtonDisabled: {
    opacity: 0.6,
  },
  recordButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  recordHint: {
    marginTop: 6,
    color: '#eee',
    fontSize: 12,
  },

  processingIndicator: {
    position: 'absolute',
    top: 50,
    left: 20,
    backgroundColor: 'rgba(0,122,255,0.9)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    zIndex: 10,
  },
  processingText: { color: 'white', fontSize: 14, fontWeight: '600' },
  bufferIndicator: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 10,
    zIndex: 10,
  },
  bufferBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  bufferFill: { height: '100%', backgroundColor: '#4dabf7' },
  bufferText: { color: 'white', fontSize: 12, marginTop: 5, textAlign: 'center' },
  translationBox: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  translationLabel: {
    color: '#aaa',
    fontSize: 12,
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  translationText: { color: 'white', fontSize: 24, fontWeight: 'bold' },
});
