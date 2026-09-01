import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useTheme } from '../../context/ThemeContext';

type CameraStatus = 'online' | 'connecting' | 'offline';

interface CameraConfig {
  id: string;
  title: string;
  penId: string;
  ipAddress: string;
  streamPort?: number;
}

export default function LiveFeedScreen() {
  const { theme } = useTheme();
  const [selectedCamera, setSelectedCamera] = useState<CameraConfig | null>(null);

  const farrowingConfig: CameraConfig = {
    id: 'farrowing',
    title: 'Farrowing Area',
    penId: 'Pen 01',
    ipAddress: '192.168.1.179',
    streamPort: 80,
  };

  const broodingConfig: CameraConfig = {
    id: 'brooding',
    title: 'Brooding Area',
    penId: 'Pen 02',
    ipAddress: '192.168.1.101',
    streamPort: 80,
  };

  return (
    <View style={[styles.mainContainer, { backgroundColor: theme.background || '#FCF3F5' }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.headerText || '#111111' }]}>
            Live Monitoring
          </Text>
          <Text style={styles.headerSubtitle}>
            Monitor the Farrowing and Brooding areas in real time.
          </Text>
        </View>

        <CameraFeedCard
          config={farrowingConfig}
          onPressExpand={() => setSelectedCamera(farrowingConfig)}
        />

        <CameraFeedCard
          config={broodingConfig}
          onPressExpand={() => setSelectedCamera(broodingConfig)}
        />

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {selectedCamera && (
        <FullscreenStreamModal
          config={selectedCamera}
          visible={!!selectedCamera}
          onClose={() => setSelectedCamera(null)}
        />
      )}
    </View>
  );
}

// Helper function to build bulletproof HTML for ESP32-CAM streaming
const getStreamHtml = (ipAddress: string, streamPort: number, fitMode: 'cover' | 'contain') => {
  const streamUrl = `http://${ipAddress}:${streamPort}/stream`;
  const captureUrl = `http://${ipAddress}:${streamPort}/capture`;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>
          * { margin: 0; padding: 0; background-color: #000; overflow: hidden; }
          body, html { width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; }
          img { width: 100%; height: 100%; object-fit: ${fitMode}; display: block; }
        </style>
      </head>
      <body>
        <img id="streamView" src="${streamUrl}" />
        <script>
          const img = document.getElementById('streamView');
          let isFallbackActive = false;

          // If stream hangs or fails on iOS WebKit, fallback to continuous snapshot polling
          function triggerFallback() {
            if (isFallbackActive) return;
            isFallbackActive = true;
            
            function pollFrame() {
              const nextImg = new Image();
              nextImg.onload = function() {
                img.src = this.src;
                setTimeout(pollFrame, 50); // ~20fps fallback
              };
              nextImg.onerror = function() {
                setTimeout(pollFrame, 500);
              };
              nextImg.src = "${captureUrl}?" + new Date().getTime();
            }
            pollFrame();
          }

          // Timeout trigger if MJPEG stream stays pitch black or fails to load within 2.5s
          const loadTimeout = setTimeout(() => {
            if (!img.complete || img.naturalWidth === 0) {
              triggerFallback();
            }
          }, 2500);

          img.onerror = function() {
            clearTimeout(loadTimeout);
            triggerFallback();
          };
        </script>
      </body>
    </html>
  `;
};

// =========================================================
// 1. CAMERA FEED CARD COMPONENT
// =========================================================
interface FeedCardProps {
  config: CameraConfig;
  onPressExpand?: () => void;
}

function CameraFeedCard({ config, onPressExpand }: FeedCardProps) {
  const { title, penId, ipAddress, streamPort = 80 } = config;

  const [status, setStatus] = useState<CameraStatus>('connecting');
  const [lastSeen, setLastSeen] = useState<string>('Checking status...');

  const pingUrl = `http://${ipAddress}:${streamPort}`;

  const checkCameraConnection = useCallback(async () => {
    setStatus((prev) => (prev === 'offline' ? 'connecting' : prev));

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    try {
      const response = await fetch(pingUrl, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok || response.status === 200) {
        setStatus('online');
        setLastSeen('Updated just now');
      } else {
        setStatus('offline');
      }
    } catch (error) {
      clearTimeout(timeoutId);
      setStatus('offline');
    }
  }, [pingUrl]);

  useEffect(() => {
    checkCameraConnection();
    const interval = setInterval(() => {
      checkCameraConnection();
    }, 10000);

    return () => clearInterval(interval);
  }, [checkCameraConnection]);

  const renderStatusBadge = () => {
    switch (status) {
      case 'online':
        return (
          <View style={[styles.statusBadge, styles.badgeOnline]}>
            <View style={[styles.badgeDot, { backgroundColor: '#2E7D32' }]} />
            <Text style={[styles.statusText, { color: '#2E7D32' }]}>Online</Text>
          </View>
        );
      case 'connecting':
        return (
          <View style={[styles.statusBadge, styles.badgeConnecting]}>
            <View style={[styles.badgeDot, { backgroundColor: '#B78103' }]} />
            <Text style={[styles.statusText, { color: '#B78103' }]}>Connecting</Text>
          </View>
        );
      case 'offline':
        return (
          <View style={[styles.statusBadge, styles.badgeOffline]}>
            <View style={[styles.badgeDot, { backgroundColor: '#D32F2F' }]} />
            <Text style={[styles.statusText, { color: '#D32F2F' }]}>Offline</Text>
          </View>
        );
    }
  };

  const renderContent = () => {
    if (status === 'online') {
      return (
        <View style={styles.mediaWrapper}>
          <WebView
            source={{ html: getStreamHtml(ipAddress, streamPort, 'cover') }}
            style={styles.webViewStream}
            scrollEnabled={false}
            originWhitelist={['*']}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            allowingReadAccessToURL="*"
            mixedContentMode="always"
            allowsInlineMediaPlayback={true}
            onError={() => setStatus('offline')}
          />

          <View style={styles.liveTag}>
            <View style={styles.liveRedDot} />
            <Text style={styles.liveTagText}>LIVE</Text>
          </View>

          <TouchableOpacity style={styles.expandIconBtn} onPress={onPressExpand}>
            <MaterialCommunityIcons name="crop-free" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      );
    }

    if (status === 'connecting') {
      return (
        <View style={styles.statePlaceholderConnecting}>
          <ActivityIndicator size="large" color="#D87588" style={{ marginBottom: 12 }} />
          <Text style={styles.stateTitle}>Connecting to camera...</Text>
          <Text style={styles.stateDescription}>
            Establishing link to {penId} ({ipAddress}).
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.statePlaceholderOffline}>
        <MaterialCommunityIcons name="satellite-variant" size={38} color="#9E9E9E" style={{ marginBottom: 10 }} />
        <Text style={styles.stateTitle}>Camera temporarily unavailable</Text>
        <Text style={styles.stateDescription}>
          Check power and local Wi-Fi connection.
        </Text>
        <TouchableOpacity style={styles.retryBtn} onPress={checkCameraConnection}>
          <Text style={styles.retryBtnText}>Retry Connection</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.feedCard}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={styles.cameraIconBg}>
            <MaterialCommunityIcons name="video-outline" size={22} color="#C0536A" />
          </View>
          <View>
            <Text style={styles.cardTitle}>{title}</Text>
            <Text style={styles.deviceSubtext}>ESP32-CAM · {penId}</Text>
          </View>
        </View>
        {renderStatusBadge()}
      </View>

      {renderContent()}

      <View style={styles.cardFooter}>
        <MaterialCommunityIcons name="clock-outline" size={14} color="#A0A0A0" style={{ marginRight: 5 }} />
        <Text style={styles.footerTimeText}>{lastSeen}</Text>
      </View>
    </View>
  );
}

// =========================================================
// 2. FULLSCREEN LANDSCAPE MODAL COMPONENT
// =========================================================
interface FullscreenModalProps {
  config: CameraConfig;
  visible: boolean;
  onClose: () => void;
}

function FullscreenStreamModal({ config, visible, onClose }: FullscreenModalProps) {
  const { title, penId, ipAddress, streamPort = 80 } = config;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      supportedOrientations={['landscape', 'landscape-left', 'landscape-right']}
      onRequestClose={onClose}
    >
      <StatusBar hidden={visible} />
      <View style={styles.modalContainer}>
        <WebView
          source={{ html: getStreamHtml(ipAddress, streamPort, 'contain') }}
          style={styles.fullscreenWebView}
          scrollEnabled={false}
          originWhitelist={['*']}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          allowingReadAccessToURL="*"
          mixedContentMode="always"
          allowsInlineMediaPlayback={true}
        />

        <View style={styles.modalOverlayHeader}>
          <View style={styles.modalTitleBadge}>
            <View style={styles.liveRedDot} />
            <Text style={styles.modalTitleText}>
              {title} ({penId})
            </Text>
          </View>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <MaterialCommunityIcons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// =========================================================
// 3. STYLES
// =========================================================
const styles = StyleSheet.create({
  mainContainer: { flex: 1 },
  scrollContent: { padding: 20, paddingTop: 60 },
  header: { marginBottom: 24 },
  headerTitle: { fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, color: '#8A8A8E', marginTop: 4, lineHeight: 20 },
  bottomSpacer: { height: 40 },
  feedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
  cameraIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FDECF0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  deviceSubtext: { fontSize: 12, color: '#8E8E93', marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  badgeDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  statusText: { fontSize: 12, fontWeight: '700' },
  badgeOnline: { backgroundColor: '#E8F5E9' },
  badgeConnecting: { backgroundColor: '#FFF8E1' },
  badgeOffline: { backgroundColor: '#FFEBEE' },
  mediaWrapper: {
    position: 'relative',
    width: '100%',
    height: 200,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#000000',
  },
  webViewStream: { width: '100%', height: '100%', backgroundColor: '#000000' },
  liveTag: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  liveRedDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF3B30', marginRight: 6 },
  liveTagText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  expandIconBtn: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0, 0, 0, 0.4)', padding: 8, borderRadius: 10 },
  statePlaceholderConnecting: {
    width: '100%',
    height: 190,
    backgroundColor: '#FDECF0',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  statePlaceholderOffline: {
    width: '100%',
    height: 200,
    backgroundColor: '#F4F4F6',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  stateTitle: { fontSize: 15, fontWeight: '700', color: '#2C2C2C', marginBottom: 6, textAlign: 'center' },
  stateDescription: { fontSize: 12, color: '#7C7C80', textAlign: 'center', lineHeight: 18 },
  retryBtn: { marginTop: 12, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#E0536C', borderRadius: 12 },
  retryBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  cardFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  footerTimeText: { fontSize: 12, color: '#A0A0A0' },
  modalContainer: { flex: 1, backgroundColor: '#000000' },
  fullscreenWebView: { flex: 1, backgroundColor: '#000000' },
  modalOverlayHeader: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  modalTitleText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  closeBtn: { backgroundColor: 'rgba(0, 0, 0, 0.6)', padding: 10, borderRadius: 20 },
});