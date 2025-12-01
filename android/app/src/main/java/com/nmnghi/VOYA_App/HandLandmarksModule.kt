package com.nmnghi.VOYA_App

import android.content.Context
import android.util.Log
import com.facebook.react.bridge.*
import com.google.mediapipe.tasks.core.BaseOptions
import com.google.mediapipe.tasks.vision.core.RunningMode
import com.google.mediapipe.tasks.vision.handlandmarker.HandLandmarker
import com.google.mediapipe.tasks.vision.handlandmarker.HandLandmarkerResult
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.util.concurrent.atomic.AtomicBoolean

class HandLandmarksModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val THROTTLE_INTERVAL_MS = 50L // Chỉ xử lý mỗi 100ms (10 FPS)
        
        init {
            try {
                System.loadLibrary("mediapipe_tasks_vision_jni")
                Log.d("HandLandmarks", "MediaPipe library loaded successfully")
            } catch (e: UnsatisfiedLinkError) {
                Log.e("HandLandmarks", "FAILED to load MediaPipe library: ${e.message}")
            }
        }
    }

    private var lastProcessedTime = 0L
    private val isProcessing = AtomicBoolean(false)

    override fun getName() = "HandLandmarks"

    private fun sendEvent(eventName: String, params: WritableMap) {
        if (reactApplicationContext.hasActiveCatalystInstance()) {
            reactApplicationContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(eventName, params)
        }
    }

    @ReactMethod
    fun initModel() {
        if (HandLandmarkerHolder.handLandmarker != null) {
            sendEvent("onHandLandmarksStatus", Arguments.createMap().apply { 
                putString("status", "already_initialized") 
            })
            return
        }

        try {
            val context: Context = reactApplicationContext
            val baseOptions = BaseOptions.builder()
                .setModelAssetPath("hand_landmarker.task")
                .build()

            val options = HandLandmarker.HandLandmarkerOptions.builder()
                .setBaseOptions(baseOptions)
                .setNumHands(2)
                .setMinHandDetectionConfidence(0.3f)
                .setMinHandPresenceConfidence(0.3f)
                .setMinTrackingConfidence(0.3f)
                .setRunningMode(RunningMode.LIVE_STREAM)
                .setResultListener { result, _ -> 
                    // Throttle processing
                    val currentTime = System.currentTimeMillis()
                    if (currentTime - lastProcessedTime >= THROTTLE_INTERVAL_MS && 
                        !isProcessing.get()) {
                        lastProcessedTime = currentTime
                        processResult(result)
                    }
                }
                .build()

            HandLandmarkerHolder.handLandmarker = HandLandmarker.createFromOptions(context, options)

            sendEvent("onHandLandmarksStatus", Arguments.createMap().apply { 
                putString("status", "initialized") 
            })
        } catch (e: Exception) {
            Log.e("HandLandmarks", "Init failed", e)
            sendEvent("onHandLandmarksError", Arguments.createMap().apply { 
                putString("error", e.message) 
            })
        }
    }

    private fun processResult(result: HandLandmarkerResult) {
            Log.d("HandLandmarks", "Detected hands: ${result.landmarks().size}")

        if (isProcessing.getAndSet(true)) return
        
        try {
            if (result.landmarks().isEmpty()) {
                // Gửi event "không có tay" để UI xóa landmarks cũ
                sendEvent("onHandLandmarksDetected", Arguments.createMap().apply {
                    putArray("landmarks", Arguments.createArray())
                })
                return
            }

            // Chỉ gửi landmarks quan trọng (tip points + wrist)
            val landmarksArray = Arguments.createArray()
for (hand in result.landmarks()) {
    val handArray = Arguments.createArray()
    hand.forEachIndexed { idx, lm ->
        val map = Arguments.createMap()
        map.putInt("index", idx)
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
        } finally {
            isProcessing.set(false)
        }
    }

    @ReactMethod
    fun setThrottleInterval(intervalMs: Int) {
        // Cho phép điều chỉnh từ React Native
        // lastProcessedTime sẽ sử dụng intervalMs này
    }

    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        HandLandmarkerHolder.handLandmarker?.close()
        HandLandmarkerHolder.handLandmarker = null
    }
}