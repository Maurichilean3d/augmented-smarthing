/*
  XRMobileObjectSandbox ESP32 sender

  Goal:
  - Send one JSON packet by UDP to the WebXR Node bridge.
  - Works as a sandbox without real UWB/BMI libraries.
  - Replace readImuQuaternion() and readUwbRanges() with your real BMI/UWB code.

  Packet target:
  WebXR backend UDP bridge on port 7777.
*/

#include <WiFi.h>
#include <WiFiUdp.h>

const char* WIFI_SSID = "YOUR_WIFI";
const char* WIFI_PASS = "YOUR_PASS";

IPAddress WEBXR_BRIDGE_IP(192, 168, 1, 50); // PC/server running backend/server.js
const uint16_t WEBXR_BRIDGE_PORT = 7777;

const char* OBJECT_ID = "mobile_object_001";
const char* PROFILE_ID = "hotwheels"; // change to "blender" or any profile in Unity
const char* TRACKING_MODE = "Free3D";  // "Planar2D" or "Free3D"

WiFiUDP udp;
uint32_t lastSendMs = 0;
const uint32_t SEND_INTERVAL_MS = 33; // ~30 Hz

struct Quat {
  float x, y, z, w;
};

struct Range {
  const char* anchorId;
  float meters;
  float quality;
};

Quat readImuQuaternion() {
  // Sandbox fake rotation. Replace with BMI sensor fusion output if available.
  // If your BMI is 6-axis only, run a complementary/Madgwick/Mahony filter on ESP32 or in Unity.
  float t = millis() * 0.001f;
  float halfYaw = sinf(t * 0.8f) * 0.5f;

  Quat q;
  q.x = 0.0f;
  q.y = sinf(halfYaw);
  q.z = 0.0f;
  q.w = cosf(halfYaw);
  return q;
}

void readUwbRanges(Range* ranges, int& count) {
  // Sandbox fake ranges. Replace with distances from your UWB tag to anchors.
  // In real hardware, these values come from ranging against anchors A/B/C/D/E/F.
  float t = millis() * 0.001f;

  count = 4;
  ranges[0] = {"A", 1.20f + 0.08f * sinf(t),       1.0f};
  ranges[1] = {"B", 1.55f + 0.06f * cosf(t * 0.9f), 1.0f};
  ranges[2] = {"C", 1.35f + 0.05f * sinf(t * 0.7f), 1.0f};
  ranges[3] = {"D", 1.70f + 0.07f * cosf(t * 1.1f), 1.0f};

  // Add E/F in Unity if you have more anchors:
  // ranges[4] = {"E", measuredDistanceE, 1.0f};
  // count = 5;
}

float readBatteryPercent() {
  return 87.0f;
}

float readVibration01() {
  float t = millis() * 0.001f;
  return fabsf(sinf(t * 5.0f)) * 0.35f;
}

float readSpeedState() {
  return 0.0f;
}

String buildPacketJson() {
  Quat q = readImuQuaternion();

  Range ranges[6];
  int rangeCount = 0;
  readUwbRanges(ranges, rangeCount);

  String json;
  json.reserve(768);

  json += "{";
  json += "\"objectId\":\"" + String(OBJECT_ID) + "\",";
  json += "\"profileId\":\"" + String(PROFILE_ID) + "\",";
  json += "\"trackingMode\":\"" + String(TRACKING_MODE) + "\",";
  json += "\"timestampMs\":" + String((uint32_t)millis()) + ",";

  json += "\"ranges\":[";
  for (int i = 0; i < rangeCount; i++) {
    if (i > 0) json += ",";
    json += "{";
    json += "\"anchorId\":\"" + String(ranges[i].anchorId) + "\",";
    json += "\"meters\":" + String(ranges[i].meters, 3) + ",";
    json += "\"quality\":" + String(ranges[i].quality, 2);
    json += "}";
  }
  json += "],";

  json += "\"imu\":{";
  json += "\"x\":" + String(q.x, 6) + ",";
  json += "\"y\":" + String(q.y, 6) + ",";
  json += "\"z\":" + String(q.z, 6) + ",";
  json += "\"w\":" + String(q.w, 6);
  json += "},";

  json += "\"accel\":{\"x\":0.0,\"y\":0.0,\"z\":9.81},";
  json += "\"gyro\":{\"x\":0.0,\"y\":0.0,\"z\":0.0},";
  json += "\"vibration\":" + String(readVibration01(), 3) + ",";
  json += "\"battery\":" + String(readBatteryPercent(), 1) + ",";
  json += "\"speed\":" + String(readSpeedState(), 1) + ",";
  json += "\"state\":\"sandbox\"";
  json += "}";

  return json;
}

void setup() {
  Serial.begin(115200);
  delay(200);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  Serial.print("Connecting WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(300);
    Serial.print(".");
  }
  Serial.println();
  Serial.print("ESP32 IP: ");
  Serial.println(WiFi.localIP());

  udp.begin(WEBXR_BRIDGE_PORT);
}

void loop() {
  uint32_t now = millis();
  if (now - lastSendMs < SEND_INTERVAL_MS) return;
  lastSendMs = now;

  String json = buildPacketJson();
  udp.beginPacket(WEBXR_BRIDGE_IP, WEBXR_BRIDGE_PORT);
  udp.write((const uint8_t*)json.c_str(), json.length());
  udp.endPacket();

  Serial.println(json);
}
