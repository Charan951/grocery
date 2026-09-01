import 'package:flutter/material.dart';

/// A one-shot entrance animation: fades in while sliding up a few pixels.
/// Use with a staggered [delay] to choreograph a column of elements.
///
/// The delay is baked into the animation curve (an [Interval]) rather than a
/// `Future.delayed` — so it never leaves a pending timer in widget tests.
class FadeSlideIn extends StatefulWidget {
  final Widget child;
  final Duration delay;
  final Duration duration;
  final double offsetY;

  const FadeSlideIn({
    super.key,
    required this.child,
    this.delay = Duration.zero,
    this.duration = const Duration(milliseconds: 450),
    this.offsetY = 18,
  });

  @override
  State<FadeSlideIn> createState() => _FadeSlideInState();
}

class _FadeSlideInState extends State<FadeSlideIn> with SingleTickerProviderStateMixin {
  late final Duration _total = widget.delay + widget.duration;
  late final AnimationController _c = AnimationController(vsync: this, duration: _total);
  late final Animation<double> _curve = CurvedAnimation(
    parent: _c,
    curve: Interval(
      _total.inMicroseconds == 0 ? 0.0 : widget.delay.inMicroseconds / _total.inMicroseconds,
      1.0,
      curve: Curves.easeOutCubic,
    ),
  );

  @override
  void initState() {
    super.initState();
    _c.forward();
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _curve,
      builder: (context, child) => Opacity(
        opacity: _curve.value.clamp(0.0, 1.0),
        child: Transform.translate(
          offset: Offset(0, (1 - _curve.value) * widget.offsetY),
          child: child,
        ),
      ),
      child: widget.child,
    );
  }
}
