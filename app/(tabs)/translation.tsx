import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, SafeAreaView, Platform, Alert, Image, Keyboard, TouchableWithoutFeedback, KeyboardAvoidingView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';

export default function TranslationScreen() {
  const [textToTranslate, setTextToTranslate] = useState('');
  
  const { colors } = useTheme(); 
  
  const styles = getStyles(colors);

  const handleVoiceInput = () => {
    Alert.alert('Voice Input', 'Chức năng nhập liệu giọng nói sẽ được tích hợp.');
  };
  const handleCameraInput = () => {
    Alert.alert('Camera Input', 'Chức năng nhập liệu qua camera sẽ được tích hợp.');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.flexContainer} 
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <LinearGradient 
          colors={[colors.background, colors.background]} 
          style={styles.container} 
        >
          <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
            </View>

            <View style={styles.centerContent}>
              <View style={styles.threeDModelPlaceholder}>
                <Text style={styles.threeDText}>3D Avatar Placeholder</Text>
              </View>

              {/* <View style={styles.controlButtonsContainer}>
                <TouchableOpacity style={styles.controlButton}>
                  <Ionicons name="add-outline" size={30} color={colors.white} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.controlButton}>
                  <Text style={styles.controlButtonText}>1.0</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.controlButton}>
                  <Ionicons name="list-outline" size={30} color={colors.white} />
                </TouchableOpacity>
              </View> */}
            </View>

            {/* <View style={styles.languageSelection}>
              <TouchableOpacity style={styles.languageButton}>
                <Ionicons name="add-outline" size={24} color={colors.darkGray} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.languageButton, {backgroundColor: colors.lightGray}]}>
                <Image 
                  source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/a/a4/Flag_of_the_United_States.svg' }} 
                  style={styles.flagIcon} 
                />
              </TouchableOpacity>
            </View> */}

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                placeholder="Type to translate"
                placeholderTextColor={colors.mediumGray}
                value={textToTranslate}
                onChangeText={setTextToTranslate}
              />
              <TouchableOpacity onPress={handleCameraInput} style={styles.iconButton}>
                <Ionicons name="camera-outline" size={28} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleVoiceInput} style={styles.iconButton}>
                <Ionicons name="mic-outline" size={28} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const getStyles = (colors) => 
  StyleSheet.create({
    flexContainer: {
      flex: 1,
    },
    container: {
      flex: 1,
    },
    safeArea: {
      flex: 1,
      paddingTop: Platform.OS === 'android' ? 30 : 0,
    },
    header: {
      height: 60,
      justifyContent: 'center',
      paddingHorizontal: 15,
    },
    centerContent: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative',
    },
    threeDModelPlaceholder: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.controlBG, 
      marginHorizontal: 20,
      borderRadius: 10,
      height: '80%',
    },
    threeDText: {
      color: colors.text, 
      fontSize: 22,
      fontWeight: 'bold',
      textAlign: 'center',
    },
    threeDSubText: {
      color: colors.lightGray,
      fontSize: 14,
      marginTop: 5,
      textAlign: 'center',
    },
    controlButtonsContainer: {
      position: 'absolute',
      right: 20,
      top: '20%',
      backgroundColor: colors.darkGray, 
      borderRadius: 15,
      overflow: 'hidden',
      paddingVertical: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    controlButton: {
      padding: 10,
      alignItems: 'center',
    },
    controlButtonText: {
      color: colors.white, 
      fontSize: 18,
      fontWeight: 'bold',
    },
    languageSelection: {
      position: 'absolute',
      left: 20,
      bottom: 120,
      backgroundColor: colors.darkGray, 
      borderRadius: 15,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
      paddingVertical: 10,
    },
    languageButton: {
      padding: 10,
      alignItems: 'center',
      justifyContent: 'center',
      width: 50,
      height: 50,
      borderRadius: 10,
      marginBottom: 5,
    },
    flagIcon: {
      width: 40,
      height: 30,
      resizeMode: 'contain',
      borderRadius: 5,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background, 
      paddingHorizontal: 15,
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: colors.textInputBG,
      paddingBottom: Platform.OS === 'ios' ? 20 : 10, 
    },
    textInput: {
      flex: 1,
      backgroundColor: colors.textInputBG,
      borderRadius: 25,
      paddingHorizontal: 20,
      paddingVertical: 12,
      fontSize: 16,
      color: colors.text, 
      marginRight: 10,
    },
    iconButton: {
      padding: 8,
      borderRadius: 20,
    },
  });