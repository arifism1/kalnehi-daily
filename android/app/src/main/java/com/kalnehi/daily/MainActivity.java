package com.kalnehi.daily;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Razorpay no longer runs inside the WebView — payments open in Chrome
        // Custom Tabs via @capacitor/browser. No WebView payment configuration
        // is needed here.
    }

    /**
     * Handle deep links that arrive while the app is already in the foreground.
     * Capacitor's App plugin fires appUrlOpen for these; CapacitorDeepLinkHandler.tsx
     * handles the navigation on the JS side. This override ensures the intent is
     * forwarded to the bridge.
     */
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);

        // If this is an App Link (https://kalnehi.com/*), pass it to the bridge
        // so the @capacitor/app appUrlOpen event fires on the JS side.
        Uri data = intent.getData();
        if (data != null) {
            getBridge().triggerJSEvent("appUrlOpen", "window",
                    "{\"url\": \"" + data.toString() + "\"}");
        }
    }
}
