package com.kalnehi.daily;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private boolean offlineWebViewClientInstalled;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Razorpay no longer runs inside the WebView — payments open in Chrome
        // Custom Tabs via @capacitor/browser. No WebView payment configuration
        // is needed here.
    }

    @Override
    public void onStart() {
        super.onStart();
        installOfflineCacheWebViewClient();
    }

    /**
     * Wrap Capacitor's WebViewClient so GETs to kalnehi.com can be served from the
     * APK cache seed when the device has no validated network (cold-start offline).
     */
    private void installOfflineCacheWebViewClient() {
        if (offlineWebViewClientInstalled) {
            return;
        }
        Bridge bridge = getBridge();
        if (bridge == null) {
            return;
        }
        WebView webView = bridge.getWebView();
        if (webView == null) {
            return;
        }
        WebViewClient existing = webView.getWebViewClient();
        if (existing instanceof KalnehiOfflineWebViewClient) {
            offlineWebViewClientInstalled = true;
            return;
        }
        webView.setWebViewClient(new KalnehiOfflineWebViewClient(this, existing));
        offlineWebViewClientInstalled = true;
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
