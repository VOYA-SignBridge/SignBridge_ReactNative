import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Dimensions,
  Modal,
  Platform,
  KeyboardAvoidingView,
  StatusBar
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { privateApi } from "@/api/privateApi";
import { API_URL } from "@/config";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SignVideo } from "@/components/SignVideo";
import QRCode from "react-native-qrcode-svg";
import SignLanguageCamera from '@/components/SignLanguageCamera';
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from 'contexts/ThemeContext';

export default function RoomScreen() {
  const { code, participant_id, role, display_name, wsUrl } = useLocalSearchParams();
  const { colors: theme } = useTheme();

  const [participants, setParticipants] = useState<Record<string, any>>({});
  const [messages, setMessages] = useState<any[]>([]);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [text, setText] = useState("");
  const [roomInfo, setRoomInfo] = useState<any>(null);
  const [userInfo, setUserInfo] = useState<any | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  type Participant = {
    participant_id: number;
    user_id: number | string | null;
    display_name: string;
    role: string;
    joined_at: string;
  };

  useEffect(() => {
    async function loadRoomInfo() {
      try {
        const res = await privateApi.get(`/rooms/${code}/room`);
        setRoomInfo(res.data);
      } catch (err) { }
    }
    loadRoomInfo();
  }, [code]);

  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        const raw = await AsyncStorage.getItem("user_info");
        if (raw) {
          const parsed = JSON.parse(raw);
          setUserInfo(parsed);
        }
      } catch (err) { }
    };
    loadUserInfo();
  }, []);

  const SCREEN_WIDTH = Dimensions.get("window").width;
  const isWeb = Platform.OS === 'web';

  const getVideoWidth = () => {
    if (isWeb) {
      if (SCREEN_WIDTH < 768) {
        return SCREEN_WIDTH * 0.45;
      } else {
        return Math.min(SCREEN_WIDTH * 0.25, 250);
      }
    }
    if (SCREEN_WIDTH < 600) {
      return SCREEN_WIDTH * 0.55;
    } else {
      return SCREEN_WIDTH * 0.4;
    }
  };

  const VIDEO_WIDTH = getVideoWidth();
  const VIDEO_HEIGHT = VIDEO_WIDTH * (16 / 9);

  useEffect(() => {
    async function loadParticipants() {
      try {
        const res = await privateApi.get(`/rooms/${code}/participants`);
        const map: Record<string, Participant> = {};
        (res.data as Participant[]).forEach((p) => {
          map[String(p.participant_id)] = p;
        });
        setParticipants(map);
      } catch (err) { }
    }
    loadParticipants();
  }, [code]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  useEffect(() => {
    let socket: WebSocket | null = null;

    const connect = async () => {
      const token = await AsyncStorage.getItem("access_token");

      if (!token) return;
      if (socket && socket.readyState === WebSocket.OPEN) return;

      socket = new WebSocket(wsUrl as string, ["jwt", token]);
      setWs(socket);

      socket.onopen = () => {
        if (!participant_id) return;
        setParticipants((prev) => ({
          ...prev,
          [String(participant_id)]: {
            participant_id,
            display_name,
            role,
          },
        }));
      };

      socket.onmessage = (e) => {
        const msg = JSON.parse(e.data);

        if (msg.type === "presence.join") {
          setParticipants((prev) => ({
            ...prev,
            [msg.participant_id]: msg,
          }));
        }

        if (msg.type === "presence.leave") {
          setParticipants((prev) => {
            const cp = { ...prev };
            delete cp[msg.participant_id];
            return cp;
          });
        }

        if (msg.type === "chat.message") {
          setMessages((prev) => [...prev, msg]);
        }

        if (msg.type === "room.ended") {
          alert("Chủ phòng đã kết thúc phiên.");
          try { socket?.close(); } catch (e) { }
          router.replace("/conversation");
          return;
        }
      };
    };

    connect();

    return () => {
      if (socket) socket.close();
    };
  }, [wsUrl, participant_id, display_name, role]);

  const sendMessage = () => {
    if (!ws || ws.readyState !== 1) return;

    const trimmed = text.trim();
    if (!trimmed) return;

    const msg = {
      type: "chat.message",
      text: trimmed,
      no_echo: true,
    };

    ws.send(JSON.stringify(msg));
    setText("");
  };

  const handleLeaveRoom = async () => {
    try {
      await privateApi.post(`/rooms/${code}/leave`);
    } catch (err) { }
    ws?.close();
    router.replace("/conversation");
  };

  const handleEndRoom = async () => {
    try {
      await privateApi.post(`/rooms/${code}/end`);
    } catch (err) { }
    ws?.close();
    router.replace("/conversation");
  };

  const getInitials = (name: string) => {
    return name ? name.charAt(0).toUpperCase() : "?";
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={theme.background === '#000000' ? 'light-content' : 'dark-content'} />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        
        {/* HEADER */}
        <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.lightGray || '#eee' }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color={theme.text} />
          </TouchableOpacity>
          
          <View style={styles.headerInfo}>
            <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
              {code}
            </Text>
            <Text style={[styles.headerSubtitle, { color: theme.icon }]} numberOfLines={1}>
              {Object.keys(participants).length} thành viên
            </Text>
          </View>

          <View style={styles.headerActions}>
            {/* Nút Mã QR - Màu Primary */}
            <TouchableOpacity 
              style={[styles.headerBtn, { backgroundColor: theme.primary }]} 
              onPress={() => setShowQRModal(true)}
            >
              <Text style={styles.headerBtnText}>Mã QR</Text>
            </TouchableOpacity>

            {/* Nút Kết thúc/Rời phòng */}
            {roomInfo?.owner_id === userInfo?.id ? (
              <TouchableOpacity 
                style={[styles.headerBtn, { backgroundColor: '#EF4444' }]} // Màu đỏ cho nút Kết thúc
                onPress={handleEndRoom}
              >
                <Text style={styles.headerBtnText}>Kết thúc</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={[styles.headerBtn, { backgroundColor: theme.icon || '#999' }]} // Màu xám cho nút Rời
                onPress={handleLeaveRoom}
              >
                <Text style={styles.headerBtnText}>Rời phòng</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* CHAT LIST */}
        <FlatList
          ref={flatListRef}
          style={[styles.chatList, { backgroundColor: theme.controlBG || '#f4f4f5' }]}
          contentContainerStyle={{ paddingVertical: 16 }}
          data={messages}
          showsVerticalScrollIndicator={false}
          keyExtractor={(_, i) => i.toString()}
          renderItem={({ item }) => {
            const sender = item.sender || {};
            const isMe = String(sender.participant_id) === String(participant_id);

            return (
              <View style={[styles.messageRow, isMe ? styles.rowRight : styles.rowLeft]}>
                {!isMe && (
                  <View style={[styles.avatar, { backgroundColor: '#ccc' }]}>
                    <Text style={styles.avatarText}>{getInitials(sender.display_name)}</Text>
                  </View>
                )}

                <View style={[
                  styles.bubble,
                  isMe ? { backgroundColor: theme.primary } : { backgroundColor: theme.background },
                  isMe ? styles.bubbleRight : styles.bubbleLeft
                ]}>
                  {!isMe && (
                    <Text style={[styles.senderName, { color: theme.icon }]}>
                      {sender.display_name}
                    </Text>
                  )}

                  <Text style={[styles.messageText, { color: isMe ? 'white' : theme.text }]}>
                    {item.text}
                  </Text>

                  {Array.isArray(item.videos) && item.videos.length > 0 && (
                    <View style={styles.videoGrid}>
                      {item.videos.map((v: any, idx: number) => (
                        <View key={`${v.sign_id}-${idx}`} style={styles.videoWrapper}>
                          <SignVideo
                            url={v.mp4_url}
                            width={VIDEO_WIDTH}
                            height={VIDEO_HEIGHT}
                            //style={{ borderRadius: 8 }}
                          />
                        </View>
                      ))}
                    </View>
                  )}

                  <Text style={[styles.timestamp, { color: isMe ? 'rgba(255,255,255,0.7)' : theme.icon }]}>
                    {new Date(item.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>
            );
          }}
        />

        {/* INPUT BAR */}
        <View style={[styles.inputContainer, { backgroundColor: theme.background, borderTopColor: theme.lightGray || '#eee' }]}>
          <TouchableOpacity 
            style={styles.cameraButton} 
            onPress={() => setShowCamera(true)}
          >
            <Ionicons name="camera" size={24} color={theme.primary} />
          </TouchableOpacity>

          <View style={[styles.inputWrapper, { backgroundColor: theme.controlBG || '#f4f4f5' }]}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Nhập tin nhắn..."
              placeholderTextColor={theme.icon}
              style={[styles.input, { color: theme.text }]}
              multiline
            />
          </View>

          <TouchableOpacity 
            style={[styles.sendButton, { backgroundColor: text.trim() ? theme.primary : theme.lightGray || '#ccc' }]} 
            onPress={sendMessage}
            disabled={!text.trim()}
          >
            <Ionicons name="send" size={20} color="white" />
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>

      {/* MODALS */}
      <Modal visible={showCamera} animationType="slide" onRequestClose={() => setShowCamera(false)}>
        <SignLanguageCamera
          onClose={() => setShowCamera(false)}
          onTranslationUpdate={(translatedText) => {
            setText(translatedText);
            setShowCamera(false);
          }}
          theme={theme}
          showTranslationBox={false}
          autoFocusInput={false}
        />
      </Modal>

      <Modal visible={showQRModal} transparent animationType="fade" onRequestClose={() => setShowQRModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Mã QR Phòng</Text>
            
            <View style={styles.qrWrapper}>
              <QRCode value={`${API_URL}/join/${code}`} size={180} />
            </View>

            <View style={styles.codeContainer}>
               <Text style={[styles.codeLabel, { color: theme.icon }]}>Mã tham gia:</Text>
               <Text style={[styles.codeValue, { color: theme.primary }]}>{code}</Text>
            </View>

            <TouchableOpacity 
              style={[styles.modalCloseButton, { backgroundColor: theme.lightGray || '#eee' }]}
              onPress={() => setShowQRModal(false)}
            >
              <Text style={[styles.modalCloseText, { color: theme.text }]}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // HEADER
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    paddingRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  // Style cho nút bấm dạng Text trong Header
  headerBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20, // Bo tròn dạng viên thuốc
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBtnText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },

  // CHAT LIST
  chatList: {
    flex: 1,
    paddingHorizontal: 12,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  rowLeft: {
    justifyContent: 'flex-start',
  },
  rowRight: {
    justifyContent: 'flex-end',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 4,
  },
  avatarText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  bubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 18,
    position: 'relative',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  bubbleLeft: {
    borderBottomLeftRadius: 4,
  },
  bubbleRight: {
    borderBottomRightRadius: 4,
  },
  senderName: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
    opacity: 0.7,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  videoGrid: {
    marginTop: 8,
    gap: 8,
  },
  videoWrapper: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
    overflow: 'hidden',
  },

  // INPUT
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  cameraButton: {
    padding: 10,
    marginRight: 8,
  },
  inputWrapper: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 4,
    justifyContent: 'center',
  },
  input: {
    fontSize: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },

  // MODAL
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 24,
  },
  qrWrapper: {
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 16,
    elevation: 3,
    marginBottom: 20,
  },
  codeContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  codeLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  codeValue: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 2,
  },
  modalCloseButton: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: '600',
  },
});