package com.mmnghi.VOYA_App

import android.content.Context
import android.util.Log
import com.facebook.react.bridge.*
import com.google.mediapipe.tasks.core.BaseOptions
import com.google.mediapipe.tasks.vision.core.RunningMode
import com.google.mediapipe.tasks.vision.handlandmarker.HandLandmarker
import com.google.mediapipe.tasks.vision.handlandmarker.HandLandmarkerResult
import com.facebook.react.modules.core.DeviceEventManagerModule

class HandLandmarksModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    // --- PHẦN THÊM MỚI QUAN TRỌNG ---
    companion object {
        init {
            try {
                // Ép hệ thống tải thư viện Native ngay khi App khởi động
                System.loadLibrary("mediapipe_tasks_vision_jni")
                Log.d("HandLandmarks", "MediaPipe library loaded successfully")
            } catch (e: UnsatisfiedLinkError) {
                // Nếu lỗi (thường do máy ảo x86), log ra để biết
                Log.e("HandLandmarks", "FAILED to load MediaPipe library: ${e.message}")
            }
        }
    }
    // --------------------------------

    override fun getName() = "HandLandmarks"

    private fun sendEvent(eventName: String, params: WritableMap) {
        // Kiểm tra null để tránh crash nếu React Context chưa sẵn sàng
        if (reactApplicationContext.hasActiveCatalystInstance()) {
            reactApplicationContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(eventName, params)
        }
    }

    @ReactMethod
    fun initModel() {
        // Nếu biến static đã được khởi tạo ở đâu đó (cần class Holder)
        // Lưu ý: Bạn cần đảm bảo class HandLandmarkerHolder đã được tạo ở file khác
        if (HandLandmarkerHolder.handLandmarker != null) {
            sendEvent("onHandLandmarksStatus", Arguments.createMap().apply { putString("status", "already_initialized") })
            return
        }

        try {
            val context: Context = reactApplicationContext
            
            // QUAN TRỌNG: Đảm bảo file "hand_landmarker.task" đã nằm trong android/app/src/main/assets/
            val baseOptions = BaseOptions.builder()
                .setModelAssetPath("hand_landmarker.task")
                .build()

            val options = HandLandmarker.HandLandmarkerOptions.builder()
                .setBaseOptions(baseOptions)
                .setNumHands(1)
                .setRunningMode(RunningMode.LIVE_STREAM)
                .setResultListener { result, _ -> processResult(result) }
                .build()

            HandLandmarkerHolder.handLandmarker = HandLandmarker.createFromOptions(context, options)

            sendEvent("onHandLandmarksStatus", Arguments.createMap().apply { putString("status", "initialized") })
        } catch (e: Exception) {
            Log.e("HandLandmarks", "Init failed", e)
            sendEvent("onHandLandmarksError", Arguments.createMap().apply { putString("error", e.message) })
        }
    }

    private fun processResult(result: HandLandmarkerResult) {
        if (result.landmarks().isEmpty()) return

        val landmarksArray = Arguments.createArray()
        for (hand in result.landmarks()) {
            val handArray = Arguments.createArray()
            for ((i, lm) in hand.withIndex()) {
                val map = Arguments.createMap()
                map.putInt("index", i)
                map.putDouble("x", lm.x().toDouble())
                map.putDouble("y", lm.y().toDouble())
                map.putDouble("z", lm.z().toDouble())
                handArray.pushMap(map)
            }
            landmarksArray.pushArray(handArray)
        }

        val params = Arguments.createMap()
        params.putArray("landmarks", landmarksArray)
        sendEvent("onHandLandmarksDetected", params)
    }
}