# Capacitor & Android WebView ProGuard / R8 Rules
-keep class com.getcapacitor.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keepclassmembers class * {
    @com.getcapacitor.PluginMethod <methods>;
    @android.webkit.JavascriptInterface <methods>;
}
-keepclassmembers class * extends com.getcapacitor.Plugin {
    public <init>(...);
}
-dontwarn com.google.errorprone.annotations.**
