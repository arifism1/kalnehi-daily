package com.kalnehi.daily;

import android.content.Context;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/**
 * Wraps Capacitor's WebViewClient: network-first when online; bundled cache seed when offline.
 */
public class KalnehiOfflineWebViewClient extends WebViewClient {

    private final Context appContext;
    private final WebViewClient delegate;

    public KalnehiOfflineWebViewClient(Context context, WebViewClient delegate) {
        this.appContext = context.getApplicationContext();
        this.delegate = delegate;
    }

    private boolean isNetworkAvailable() {
        ConnectivityManager cm =
                (ConnectivityManager) appContext.getSystemService(Context.CONNECTIVITY_SERVICE);
        if (cm == null) {
            return false;
        }
        Network network = cm.getActiveNetwork();
        if (network == null) {
            return false;
        }
        NetworkCapabilities caps = cm.getNetworkCapabilities(network);
        return caps != null
                && caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                && caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED);
    }

    @Override
    public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
        if (!isNetworkAvailable()) {
            WebResourceResponse seeded = KalnehiCacheSeedLoader.serve(appContext, request);
            if (seeded != null) {
                return seeded;
            }
            if (request.isForMainFrame()) {
                String path = request.getUrl() != null ? request.getUrl().getPath() : "";
                if (path != null
                        && (path.equals("/home")
                                || path.equals("/auth")
                                || path.equals("/")
                                || path.equals("/offline.html"))) {
                    return KalnehiCacheSeedLoader.offlineFallback();
                }
            }
        }
        if (delegate != null) {
            return delegate.shouldInterceptRequest(view, request);
        }
        return super.shouldInterceptRequest(view, request);
    }

    @Override
    public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
        if (delegate != null) {
            return delegate.shouldOverrideUrlLoading(view, request);
        }
        return super.shouldOverrideUrlLoading(view, request);
    }

    @Override
    public void onPageFinished(WebView view, String url) {
        if (delegate != null) {
            delegate.onPageFinished(view, url);
        } else {
            super.onPageFinished(view, url);
        }
    }
}
