import 'package:flutter/material.dart';

class AppSpacing {
  AppSpacing._();

  static const double xxs = 4.0;
  static const double xs = 8.0;
  static const double sm = 12.0;
  static const double md = 16.0;
  static const double lg = 20.0;
  static const double xl = 24.0;
  static const double xxl = 32.0;
  static const double xxxl = 40.0;
  static const double huge = 48.0;
  static const double massive = 64.0;

  // Custom gap heights
  static const SizedBox gapH4 = SizedBox(height: xxs);
  static const SizedBox gapH8 = SizedBox(height: xs);
  static const SizedBox gapH12 = SizedBox(height: sm);
  static const SizedBox gapH16 = SizedBox(height: md);
  static const SizedBox gapH20 = SizedBox(height: lg);
  static const SizedBox gapH24 = SizedBox(height: xl);
  static const SizedBox gapH32 = SizedBox(height: xxl);
  static const SizedBox gapH40 = SizedBox(height: xxxl);
  static const SizedBox gapH48 = SizedBox(height: huge);
  static const SizedBox gapH64 = SizedBox(height: massive);

  // Custom gap widths
  static const SizedBox gapW4 = SizedBox(width: xxs);
  static const SizedBox gapW8 = SizedBox(width: xs);
  static const SizedBox gapW12 = SizedBox(width: sm);
  static const SizedBox gapW16 = SizedBox(width: md);
  static const SizedBox gapW20 = SizedBox(width: lg);
  static const SizedBox gapW24 = SizedBox(width: xl);
  static const SizedBox gapW32 = SizedBox(width: xxl);
  static const SizedBox gapW40 = SizedBox(width: xxxl);
  static const SizedBox gapW48 = SizedBox(width: huge);
  static const SizedBox gapW64 = SizedBox(width: massive);

  // Padding helper profiles
  static const EdgeInsets paddingAll4 = EdgeInsets.all(xxs);
  static const EdgeInsets paddingAll8 = EdgeInsets.all(xs);
  static const EdgeInsets paddingAll12 = EdgeInsets.all(sm);
  static const EdgeInsets paddingAll16 = EdgeInsets.all(md);
  static const EdgeInsets paddingAll20 = EdgeInsets.all(lg);
  static const EdgeInsets paddingAll24 = EdgeInsets.all(xl);
  static const EdgeInsets paddingAll32 = EdgeInsets.all(xxl);

  static const EdgeInsets paddingH16 = EdgeInsets.symmetric(horizontal: md);
  static const EdgeInsets paddingV16 = EdgeInsets.symmetric(vertical: md);
  static const EdgeInsets paddingH24 = EdgeInsets.symmetric(horizontal: xl);
  static const EdgeInsets paddingV24 = EdgeInsets.symmetric(vertical: xl);
  
  static const EdgeInsets paddingH16V8 = EdgeInsets.symmetric(horizontal: md, vertical: xs);
  static const EdgeInsets paddingH20V12 = EdgeInsets.symmetric(horizontal: lg, vertical: sm);
}
