package com.kalnehi.daily;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.PermissionRequest;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.appcompat.app.AppCompatDelegate;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;
import com.getcapacitor.BridgeWebViewClient;
import java.util.ArrayList;
import java.util.List;

public class MainActivity extends BridgeActivity {

    private static final int REQUEST_MEDIA_PERMISSIONS = 1001;

    private boolean offlineWebViewClientInstalled;
    private PermissionRequest pendingWebViewPermissionRequest;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM);
        super.onCreate(savedInstanceState);

        Bridge bridge = getBridge();
        if (bridge == null) {
            return;
        }

        WebView webView = bridge.getWebView();
        if (webView == null) {
            return;
        }

        webView.setWebChromeClient(
            new BridgeWebChromeClient(bridge) {
                @Override
                public void onPermissionRequest(final PermissionRequest request) {
                    pendingWebViewPermissionRequest = request;

                    boolean wantsAudio = false;
                    boolean wantsVideo = false;
                    for (String res : request.getResources()) {
                        if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(res)) {
                            wantsAudio = true;
                        }
                        if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(res)) {
                            wantsVideo = true;
                        }
                    }

                    boolean audioGranted =
                        ContextCompat.checkSelfPermission(
                                MainActivity.this, Manifest.permission.RECORD_AUDIO)
                            == PackageManager.PERMISSION_GRANTED;
                    boolean videoGranted =
                        ContextCompat.checkSelfPermission(
                                MainActivity.this, Manifest.permission.CAMERA)
                            == PackageManager.PERMISSION_GRANTED;

                    boolean needMic = wantsAudio && !audioGranted;
                    boolean needCam = wantsVideo && !videoGranted;

                    if (!needMic && !needCam) {
                        boolean canGrantMic = wantsAudio ? audioGranted : true;
                        boolean canGrantCam = wantsVideo ? videoGranted : true;
                        if (canGrantMic && canGrantCam) {
                            request.grant(request.getResources());
                            pendingWebViewPermissionRequest = null;
                        }
                        return;
                    }

                    List<String> perms = new ArrayList<>();
                    if (needMic) perms.add(Manifest.permission.RECORD_AUDIO);
                    if (needCam) perms.add(Manifest.permission.CAMERA);
                    ActivityCompat.requestPermissions(
                        MainActivity.this,
                        perms.toArray(new String[0]),
                        REQUEST_MEDIA_PERMISSIONS);
                }
            });
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

        WebViewClient delegate =
            existing != null
                ? existing
                : new BridgeWebViewClient(bridge) {
                    @Override
                    public boolean onRenderProcessGone(
                        WebView view, RenderProcessGoneDetail detail) {
                        bridge.reload();
                        return true;
                    }
                };

        webView.setWebViewClient(new KalnehiOfflineWebViewClient(this, delegate));
        offlineWebViewClientInstalled = true;
    }

    @Override
    public void onRequestPermissionsResult(
        int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);

        if (requestCode != REQUEST_MEDIA_PERMISSIONS || pendingWebViewPermissionRequest == null) {
            return;
        }

        PermissionRequest pr = pendingWebViewPermissionRequest;

        boolean wantsAudio = false;
        boolean wantsVideo = false;
        for (String res : pr.getResources()) {
            if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(res)) {
                wantsAudio = true;
            }
            if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(res)) {
                wantsVideo = true;
            }
        }

        boolean audioOk =
            !wantsAudio
                || ContextCompat.checkSelfPermission(
                        MainActivity.this, Manifest.permission.RECORD_AUDIO)
                    == PackageManager.PERMISSION_GRANTED;
        boolean videoOk =
            !wantsVideo
                || ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.CAMERA)
                    == PackageManager.PERMISSION_GRANTED;

        if (audioOk && videoOk) {
            pr.grant(pr.getResources());
        } else {
            pr.deny();
        }
        pendingWebViewPermissionRequest = null;
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);

        Uri data = intent.getData();
        if (data != null) {
            getBridge()
                .triggerJSEvent(
                    "appUrlOpen",
                    "window",
                    "{\"url\": \"" + data.toString() + "\"}");
        }
    }
}
