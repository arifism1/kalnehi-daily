package com.kalnehi.daily;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.webkit.PermissionRequest;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebView;
import androidx.appcompat.app.AppCompatDelegate;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;
import com.getcapacitor.BridgeWebViewClient;
import java.util.ArrayList;
import java.util.List;

public class MainActivity extends BridgeActivity {

    private static final int REQUEST_MEDIA_PERMISSIONS = 1001;

    // Held across the async permission dialog so we can grant it after the
    // user responds to the OS "Allow microphone?" prompt.
    private PermissionRequest pendingWebViewPermissionRequest;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM);
        super.onCreate(savedInstanceState);

        // Catch WebView renderer crashes (e.g. during audio capture) so the
        // whole app doesn't die — just reload the bridge instead.
        getBridge().getWebView().setWebViewClient(
            new BridgeWebViewClient(getBridge()) {
                @Override
                public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                    getBridge().reload();
                    return true;
                }
            }
        );

        getBridge().getWebView().setWebChromeClient(
            new BridgeWebChromeClient(getBridge()) {
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

                    boolean audioGranted = ContextCompat.checkSelfPermission(
                            MainActivity.this, Manifest.permission.RECORD_AUDIO)
                        == PackageManager.PERMISSION_GRANTED;
                    boolean videoGranted =
                        ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.CAMERA)
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
                        REQUEST_MEDIA_PERMISSIONS
                    );
                }
            }
        );
    }

    @Override
    public void onRequestPermissionsResult(
        int requestCode,
        String[] permissions,
        int[] grantResults
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);

        if (requestCode == REQUEST_MEDIA_PERMISSIONS && pendingWebViewPermissionRequest != null) {
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
                    || ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.RECORD_AUDIO)
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
    }
}
