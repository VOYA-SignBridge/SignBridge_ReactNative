import React from 'react';
import { View, TextInput, TouchableOpacity, Image, StyleSheet, Text, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';

export default function TranslationScreen() {
  const [textInput, setTextInput] = React.useState("");
  const [videoUrl, setVideoUrl] = React.useState<string | null>(null);

  const videoRef = React.useRef<Video>(null);
  const [videoKey, setVideoKey] = React.useState(0);

  async function translate() {
    try {
      let data = await fetch("https://voya-signbridge-backend.fly.dev/sign-video/translate", {
        method: "POST",
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: textInput })
      });

      if (!data.ok) {
        return Alert.alert("Error", "Translation request failed.");
      }

      let json = await data.json();
      console.log(json);

      if (json.videos && json.videos.length > 0) {
        const url = json.videos[0].mp4_url;
        setVideoUrl(url); // lưu URL video vào state
        setVideoKey(prev => prev + 1);
      }
    } catch (err) {
      Alert.alert("Error", "Network error.");
    }
  }

  return (
    <View style={styles.container}>

      {/* === TOP: VIDEO PREVIEW AREA === */}
      <View style={styles.videoContainer}>
        {videoUrl ? (
          <Video
            key={videoKey}
            ref={videoRef}
            source={{ uri: videoUrl }}
            style={styles.videoPlayer}
            useNativeControls
            resizeMode={ResizeMode.STRETCH}
            shouldPlay
          />
        ) : (
          <View style={styles.videoPlaceholder}>
            <Ionicons name="play-circle-outline" size={60} color="#ccc" />
          </View>
        )}
      </View>

      {/* === BOTTOM: INPUT AREA === */}
      <View style={styles.bottomContainer}>
        <View style={styles.inputWrapper}>
          <TextInput
            onChangeText={(value) => setTextInput(value)}
            placeholder="Type to translate..."
            placeholderTextColor="#888"
            style={styles.textInput}
          />

          <TouchableOpacity style={styles.micButton}>
            <Ionicons name="mic-outline" size={22} color="#00bcd4" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.enterButton} onPress={translate}>
          <Text style={{ fontWeight: 'bold', fontSize: 25, color: "white" }}>Enter</Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },

  videoContainer: {
    marginTop: 30,
    flex: 5,
    justifyContent: "center",
    alignItems: "center",
  },

  videoPlaceholder: {
    width: "85%",
    height: "90%",
    backgroundColor: "#f5f5f5",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },

  videoPlayer: {
    width: "80%",
    height: "90%",
    borderRadius: 16,
    backgroundColor: "#000",
  },

  bottomContainer: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 20,
  },

  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    backgroundColor: "#f3f3f3",
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 10,
  },

  textInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: "#333",
  },

  micButton: {
    paddingHorizontal: 8,
  },

  enterButton: {
    marginTop: 10,
    width: "100%",
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: "#00bcd4"
  }
});
