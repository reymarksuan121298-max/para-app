import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

interface DispatchSoundNotifierProps {
  play: boolean;
}

const SOUND_HTML = `
<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="background:transparent;margin:0;padding:0;">
    <script>
      var bookingAlertInterval = null;
      var audioCtx = null;

      function getAudioContext() {
        if (!audioCtx) {
          audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
          audioCtx.resume();
        }
        return audioCtx;
      }

      function playToneSequence(ctx) {
        var notes = [
          { freq: 659.25, time: 0.00 }, // E5
          { freq: 880.00, time: 0.12 }, // A5
          { freq: 1108.73, time: 0.24 }, // C#6
          { freq: 1318.51, time: 0.36 }  // E6
        ];

        notes.forEach(function(item) {
          var osc = ctx.createOscillator();
          var gain = ctx.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(item.freq, ctx.currentTime + item.time);

          gain.gain.setValueAtTime(0, ctx.currentTime + item.time);
          gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + item.time + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + item.time + 0.35);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(ctx.currentTime + item.time);
          osc.stop(ctx.currentTime + item.time + 0.4);
        });
      }

      function startBookingNotification() {
        if (bookingAlertInterval) return; // Prevent duplicate loops

        var ctx = getAudioContext();

        function triggerAlert() {
          try {
            playToneSequence(ctx);
          } catch(e) {}

          if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            try {
              navigator.vibrate([100, 50, 250]);
            } catch(e) {}
          }
        }

        // Immediate first alert
        triggerAlert();

        // Repeat every 2 seconds
        bookingAlertInterval = setInterval(triggerAlert, 2000);
      }

      function stopBookingNotification() {
        if (bookingAlertInterval) {
          clearInterval(bookingAlertInterval);
          bookingAlertInterval = null;
        }

        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try {
            navigator.vibrate(0);
          } catch(e) {}
        }
      }

      function handleMessage(event) {
        var msg = event.data;
        if (msg === 'start' || msg === 'play') {
          startBookingNotification();
        } else if (msg === 'stop') {
          stopBookingNotification();
        }
      }

      window.addEventListener('message', handleMessage);
      document.addEventListener('message', handleMessage);
    </script>
  </body>
</html>
`;

export const DispatchSoundNotifier: React.FC<DispatchSoundNotifierProps> = ({ play }) => {
  const webViewRef = useRef<any>(null);

  // Track the latest intent so it can be replayed once the page has loaded.
  const playRef = useRef(play);
  playRef.current = play;

  useEffect(() => {
    if (webViewRef.current) {
      try {
        webViewRef.current.postMessage(play ? 'start' : 'stop');
      } catch {}
    }
    return () => {
      if (webViewRef.current) {
        try {
          webViewRef.current.postMessage('stop');
        } catch {}
      }
    };
  }, [play]);

  // Messages sent before the WebView finished loading are lost, which left the
  // dispatch alert silent for requests that opened during startup.
  const handleLoad = () => {
    try {
      webViewRef.current?.postMessage(playRef.current ? 'start' : 'stop');
    } catch {}
  };

  const WebViewComponent: any = WebView;

  return (
    <View style={styles.hiddenContainer} pointerEvents="none">
      <WebViewComponent
        ref={webViewRef}
        source={{ html: SOUND_HTML }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        originWhitelist={['*']}
        onLoad={handleLoad}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        style={styles.hiddenWebview}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  hiddenContainer: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
    overflow: 'hidden',
  },
  hiddenWebview: {
    width: 1,
    height: 1,
  },
});
