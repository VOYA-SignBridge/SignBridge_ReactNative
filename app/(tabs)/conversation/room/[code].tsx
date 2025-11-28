import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, TextInput, TouchableOpacity, Dimensions } from "react-native";
import { privateApi } from "@/src/api/privateApi";
import { Video, ResizeMode } from "expo-av";

import AsyncStorage from "@react-native-async-storage/async-storage";
export default function RoomScreen() {
  const { code, participant_id, role, display_name, wsUrl } = useLocalSearchParams();
  
  const [participants, setParticipants] = useState<Record<string, any>>({});
  const [messages, setMessages] = useState<any[]>([]);
  const [ws, setWs] = useState<WebSocket | null>(null);
const memberNames = Object.values(participants).map(p => p.display_name);
const memberText = memberNames.join(", ");

  const [text, setText] = useState("");
  console.log("RoomScreen mounted");

  type Participant = {
  participant_id: number;
  user_id: number | string | null;
  display_name: string;
  role: string;
  joined_at: string;
};
const SCREEN_WIDTH = Dimensions.get("window").width;
const VIDEO_WIDTH = SCREEN_WIDTH * 0.5;          // 50% màn hình
const VIDEO_HEIGHT = VIDEO_WIDTH * (16 / 9);     // tỉ lệ dọc gần 9:16

useEffect(() => {
  async function loadParticipants() {
    const res = await privateApi.get(`/rooms/${code}/participants`);

    const map: Record<string, Participant> = {};
    console.log("Participants loaded:", res.data);
    (res.data as Participant[]).forEach((p) => {
      map[String(p.participant_id)] = p;  
    });

    setParticipants(map);
  }

  loadParticipants();
}, []);




  useEffect(() => {
  let socket: WebSocket | null = null;

  const connect = async () => {
    const token = await AsyncStorage.getItem("access_token");

    if (!token) {
      console.log("No token found!");
      return;
    }

    // mở websocket + gửi token qua subprotocol
    socket = new WebSocket(wsUrl as string, ["jwt", token]);
    setWs(socket);

    socket.onopen = () => {
      console.log("WS Connected");

      if (!participant_id) return;

      setParticipants((prev) => ({
        ...prev,
        [participant_id]: {
          participant_id,
          display_name,
          role,
        },
      }));
    };

    socket.onmessage = (e) => {
      const msg = JSON.parse(e.data);

      // --- Presence Join ---
      if (msg.type === "presence.join") {
        setParticipants((prev) => ({
          ...prev,
          [msg.participant_id]: msg,
        }));
      }

      // --- Presence Leave ---
      if (msg.type === "presence.leave") {
        setParticipants((prev) => {
          const cp = { ...prev };
          delete cp[msg.participant_id];
          return cp;
        });
      }

      // --- Chat message ---
      if (msg.type === "chat.message") {
        setMessages((prev) => [...prev, msg]);
      }
    };

    socket.onclose = () => {
      console.log("WS Closed");
    };
  };

  connect();

  return () => {
    if (socket) socket.close();
  };
}, []);


  // ---- SEND MESSAGE ----
  const sendMessage = () => {
    if (!ws || ws.readyState !== 1) return;

    const msg = {
      type: "chat.message",
      text,
      no_echo: true,
    };

    ws.send(JSON.stringify(msg));
    setText("");
  };

  return (
  <View style={styles.container}>
    <View style={styles.header}>
  <Text style={styles.headerName}>
    Members ({Object.keys(participants).length})
  </Text>

  <Text style={styles.headerSub}>
    {Object.values(participants)
      .map((p: any) => p.display_name)
      .join(", ")}
  </Text>
</View>


    {/* --- MESSAGES --- */}
    <FlatList
  style={styles.chatContainer}
  data={messages}
  showsVerticalScrollIndicator={false}
  keyExtractor={(_, i) => i.toString()}
  renderItem={({ item }) => {
    const sender = item.sender || {};
    const isMe = String(sender.participant_id) === String(participant_id);

    return (
      <View style={isMe ? styles.bubbleRight : styles.bubbleLeft}>
        {/* Tên + role */}
        <Text style={{ fontSize: 12, fontWeight: "600", marginBottom: 4 }}>
          {sender.display_name ?? "Unknown"} ({sender.role ?? "normal"})
        </Text>

        {/* TEXT */}
        <Text style={styles.bubbleText}>{item.text}</Text>

        {/* SIGN VIDEOS (nếu có) */}
        {Array.isArray(item.videos) && item.videos.length > 0 && (
  <View style={{ marginTop: 8, width: "100%", alignItems: isMe ? "flex-end" : "flex-start" }}>
    {item.videos.map((v: any) => (
      <View
        key={`${v.sign_id}-${v.key}`}
        style={{ marginBottom: 8, alignItems: "center" }}
      >
        <Video
          source={{ uri: v.url }}
          style={{
            width: VIDEO_WIDTH,
            height: VIDEO_HEIGHT,
            backgroundColor: "#000",
          }}
          useNativeControls
          resizeMode={ResizeMode.CONTAIN}
          isLooping
          shouldPlay={false}     // user bấm play
          onError={(e) => console.log("VIDEO ERROR", e)}
        />
        <Text style={{ fontSize: 11, marginTop: 4, paddingHorizontal: 4, backgroundColor: "#eee" }}>
          {v.key}
        </Text>
      </View>
    ))}
  </View>
)}


        {/* TIME */}
        <Text style={styles.timeText}>
          {new Date(item.timestamp * 1000).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      </View>
    );
  }}
/>



    <View style={styles.inputRow}>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Type message..."
        style={styles.input}
      />

      <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
        <Text style={styles.sendIcon}>➤</Text>
      </TouchableOpacity>
    </View>

  </View>
);

}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: "700" },
  sub: { marginBottom: 10 },
  section: { marginTop: 15, fontWeight: "600" },
 
  

  container: { flex: 1, backgroundColor: "#F6F6F6" },

  header: {
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  headerName: { fontSize: 20, fontWeight: "700" },
  headerSub: { color: "#888" },

  chatContainer: {
    flex: 1,
    padding: 15,
  },

  bubbleLeft: {
  maxWidth: "90%",             // 🔼 rộng hơn
  backgroundColor: "white",
  padding: 12,
  borderRadius: 16,
  borderTopLeftRadius: 0,
  marginBottom: 10,
  alignSelf: "flex-start",
  alignItems: "flex-start",     // text/video thẳng lề trái
},

bubbleRight: {
  maxWidth: "90%",             // 🔼 rộng hơn
  backgroundColor: "#D1F7F2",
  padding: 12,
  borderRadius: 16,
  borderTopRightRadius: 0,
  marginBottom: 10,
  alignSelf: "flex-end",
  alignItems: "flex-end",       // text/video thẳng lề phải
},


  bubbleText: {
    fontSize: 15,
    color: "#222",
  },

  timeText: {
    fontSize: 11,
    color: "#666",
    marginTop: 4,
    alignSelf: "flex-end",
  },

  inputRow: {
    flexDirection: "row",
    padding: 10,
    alignItems: "center",
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#DDD",
  },
  input: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 25,
    backgroundColor: "#FAFAFA",
  },
  sendBtn: {
    marginLeft: 10,
    padding: 12,
    backgroundColor: "#25CCC5",
    borderRadius: 50,
  },
  sendIcon: {
    color: "white",
    fontWeight: "800",
  },

});
