# Razorpay checkout — keep SDK + reflection targets if R8/proguard is enabled.
# If you set `minifyEnabled true` in android/app/build.gradle, add:
#   proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
-keep class com.razorpay.** { *; }
-keep class proguard.annotation.** { *; }
-dontwarn com.razorpay.**
-keepattributes JavascriptInterface
-keepclassmembers class * { @android.webkit.JavascriptInterface <methods>; }
-optimizations !method/inlining/*
-keepclasseswithmembers class * { public void onPayment*(...); }
