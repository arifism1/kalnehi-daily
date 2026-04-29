package com.kalnehi.daily;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.webkit.PermissionRequest;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebView;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;
import com.getcapacitor.BridgeWebViewClient;

public class MainActivity extends BridgeActivity {

    private static final int REQUEST_MEDIA_PERMISSIONS = 1001;

    // Held across the async permission dialog so we can grant it after the
    // user responds to the OS "Allow microphone?" prompt.
    private PermissionRequest pendingWebViewPermissionRequest;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
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

                    boolean audioGranted = ContextCompat.checkSelfPermission(
                        MainActivity.this, Manifest.permission.RECORD_AUDIO
                    ) == PackageManager.PERMISSION_GRANTED;

                    if (audioGranted) {
                        // OS permission already granted — hand off to WebView immediately.
                        request.grant(request.getResources());
                        pendingWebViewPermissionRequest = null;
                    } else {
                        // Show the OS "Allow microphone / camera?" dialog.
                        // onRequestPermissionsResult will complete the WebView grant.
                        ActivityCompat.requestPermissions(
                            MainActivity.this,
                            new String[]{
                                Manifest.permission.RECORD_AUDIO,
                                Manifest.permission.CAMERA
                            },
                            REQUEST_MEDIA_PERMISSIONS
                        );
                    }
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
            // Grant the WebView request so getUserMedia() can proceed.
            // The OS-level restriction already applies if the user denied above.
            pendingWebViewPermissionRequest.grant(
                pendingWebViewPermissionRequest.getResources()
            );
            pendingWebViewPermissionRequest = null;
        }
    }
}
