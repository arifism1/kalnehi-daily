package com.kalnehi.daily;

import android.content.Context;
import android.net.Uri;
import android.util.Log;
import android.webkit.MimeTypeMap;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;

import org.json.JSONObject;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;

/**
 * Serves bundled kalnehi-cache-seed assets for www.kalnehi.com GET requests when offline.
 */
public final class KalnehiCacheSeedLoader {

    private static final String TAG = "KalnehiCacheSeed";
    private static final String ASSET_PREFIX = "kalnehi-cache-seed/";
    private static final Set<String> ALLOWED_HOSTS = new HashSet<>(
            Arrays.asList("www.kalnehi.com", "kalnehi.com"));

    private KalnehiCacheSeedLoader() {}

    public static WebResourceResponse serve(Context context, WebResourceRequest request) {
        if (request == null || !"GET".equalsIgnoreCase(request.getMethod())) {
            return null;
        }
        Uri uri = request.getUrl();
        if (uri == null || !ALLOWED_HOSTS.contains(uri.getHost())) {
            return null;
        }
        String path = uri.getPath();
        if (path == null) {
            return null;
        }
        if (path.startsWith("/api/") || path.startsWith("/checkout")) {
            return null;
        }

        String assetPath = resolveAssetPath(path);
        if (assetPath == null) {
            return null;
        }

        try {
            InputStream in = context.getAssets().open(assetPath);
            String mime = guessMimeType(path);
            return new WebResourceResponse(mime, "UTF-8", in);
        } catch (Exception e) {
            Log.d(TAG, "miss " + path + " (" + assetPath + ")");
            return null;
        }
    }

    public static int readBundledVersionCode(Context context) {
        try {
            InputStream in = context.getAssets().open(ASSET_PREFIX + "manifest.json");
            byte[] buf = new byte[in.available()];
            int read = in.read(buf);
            in.close();
            String json = new String(buf, 0, read, StandardCharsets.UTF_8);
            JSONObject obj = new JSONObject(json);
            return obj.optInt("versionCode", 0);
        } catch (Exception e) {
            return 0;
        }
    }

    private static String resolveAssetPath(String path) {
        if (path.startsWith("/_next/static/")) {
            return ASSET_PREFIX + path.substring(1);
        }
        if (path.endsWith(".png")
                || path.endsWith(".ico")
                || path.endsWith(".svg")
                || path.endsWith(".webmanifest")
                || path.endsWith(".js")
                || path.endsWith(".css")
                || path.endsWith(".woff2")) {
            String clean = path.startsWith("/") ? path.substring(1) : path;
            return ASSET_PREFIX + "paths/" + clean;
        }
        if ("/".equals(path)) {
            return ASSET_PREFIX + "paths/index";
        }
        String clean = path.startsWith("/") ? path.substring(1) : path;
        return ASSET_PREFIX + "paths/" + clean;
    }

    private static String guessMimeType(String path) {
        if (path.endsWith(".webmanifest")) {
            return "application/manifest+json";
        }
        if (path.endsWith(".js")) {
            return "application/javascript";
        }
        if (path.endsWith(".css")) {
            return "text/css";
        }
        if (path.endsWith(".html") || path.equals("/") || path.equals("/home") || path.equals("/auth")) {
            return "text/html";
        }
        String ext = MimeTypeMap.getFileExtensionFromUrl(path);
        if (ext != null) {
            String mime = MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext.toLowerCase(Locale.US));
            if (mime != null) {
                return mime;
            }
        }
        return "text/html";
    }

    /** Minimal offline shell when no seeded HTML exists for a path. */
    public static WebResourceResponse offlineFallback() {
        String html =
                "<!DOCTYPE html><html lang=\"en\"><head><meta charset=\"utf-8\"/>"
                        + "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"/>"
                        + "<title>Kalnehi Daily</title></head><body style=\"font-family:system-ui;"
                        + "padding:2rem;text-align:center;background:#FAF7F2;color:#334155\">"
                        + "<h1>You're offline</h1><p>Open Kalnehi once on Wi‑Fi to load the latest app, "
                        + "or try again when connected.</p></body></html>";
        return new WebResourceResponse(
                "text/html",
                "UTF-8",
                new ByteArrayInputStream(html.getBytes(StandardCharsets.UTF_8)));
    }
}
