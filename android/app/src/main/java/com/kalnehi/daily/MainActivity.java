package com.kalnehi.daily;

import android.os.Bundle;
import android.webkit.PermissionRequest;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Replace Capacitor's default WebChromeClient with a subclass that
        // explicitly grants RESOURCE_AUDIO_CAPTURE and RESOURCE_VIDEO_CAPTURE.
        // Without this override, Android's WebView silently denies getUserMedia()
        // even after the user grants RECORD_AUDIO / CAMERA at the OS level.
        // BridgeWebChromeClient is used as the base so all other Capacitor bridge
        // functionality (file chooser, geolocation, JS console) is fully preserved.
        getBridge().getWebView().setWebChromeClient(
            new BridgeWebChromeClient(getBridge()) {
                @Override
                public void onPermissionRequest(final PermissionRequest request) {
                    // Grant every resource the WebView page requests
                    // (RESOURCE_AUDIO_CAPTURE, RESOURCE_VIDEO_CAPTURE, RESOURCE_MIDI_SYSEX).
                    request.grant(request.getResources());
                }
            }
        );
    }
}
