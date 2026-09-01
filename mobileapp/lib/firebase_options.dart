// Firebase project: grocery-76b84. Values from google-services.json /
// GoogleService-Info.plist for the com.freshcart.app.freshcart apps.
import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart' show defaultTargetPlatform, TargetPlatform, kIsWeb;

class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) throw UnsupportedError('FreshCart has no web target.');
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
        return ios;
      default:
        throw UnsupportedError('Unsupported platform: $defaultTargetPlatform');
    }
  }

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyCvnhc6V6_-O8MScMALYgmukaV66DAtz_s',
    appId: '1:1014188060345:android:4c2931cf4ce40dc9b77568',
    messagingSenderId: '1014188060345',
    projectId: 'grocery-76b84',
    storageBucket: 'grocery-76b84.firebasestorage.app',
  );

  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'AIzaSyBtRlJGJsbUtSZr88Bjoja5fv-c3S4P-1s',
    appId: '1:1014188060345:ios:5673da4a42a58639b77568',
    messagingSenderId: '1014188060345',
    projectId: 'grocery-76b84',
    storageBucket: 'grocery-76b84.firebasestorage.app',
    iosBundleId: 'com.freshcart.app.freshcart',
  );
}
