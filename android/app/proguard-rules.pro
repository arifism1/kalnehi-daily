# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.

# ── Debugging ────────────────────────────────────────────────────────────────
# Keep source file names and line numbers so crash stack traces are readable.
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# ── Capacitor ────────────────────────────────────────────────────────────────
# Capacitor bridges between JS and Java; reflective method calls require keeps.
-keep class com.getcapacitor.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keepclassmembers class * extends com.getcapacitor.Plugin {
    @com.getcapacitor.annotation.PluginMethod public *;
}

# ── Firebase / Google Services ────────────────────────────────────────────────
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.firebase.**
-dontwarn com.google.android.gms.**

# ── WebView JS interface ──────────────────────────────────────────────────────
# Required if the app registers any @JavascriptInterface classes (Capacitor does).
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# ── AndroidX / Support library ────────────────────────────────────────────────
-keep class androidx.** { *; }
-dontwarn androidx.**

# ── Kotlin ────────────────────────────────────────────────────────────────────
-keep class kotlin.** { *; }
-dontwarn kotlin.**
-keepclassmembers class **$WhenMappings { <fields>; }

# ── Serialisation / Reflection ────────────────────────────────────────────────
# Required for any class using Gson, Moshi, or kotlinx.serialization.
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes Exceptions
