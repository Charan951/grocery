import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/features/authentication/presentation/controllers/auth_controller.dart';

class LocationScreen extends ConsumerStatefulWidget {
  const LocationScreen({super.key});

  @override
  ConsumerState<LocationScreen> createState() => _LocationScreenState();
}

class _LocationScreenState extends ConsumerState<LocationScreen> with SingleTickerProviderStateMixin {
  bool _isPreciseSelected = true;
  late final AnimationController _animationController;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat();
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Scaffold(
      backgroundColor: Colors.black54, // Overlay style background
      body: Center(
        child: SingleChildScrollView(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 40.0),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 32.0),
              decoration: BoxDecoration(
                color: const Color(0xFF2C2C2E), // Custom dark theme dialog color
                borderRadius: BorderRadius.circular(32),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.4),
                    blurRadius: 30,
                    offset: const Offset(0, 10),
                  ),
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Location Pin Icon
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.05),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.location_on_outlined,
                      color: Colors.white70,
                      size: 28,
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Permission Query Title
                  Text(
                    'Allow freshcart to access this\ndevice\'s location?',
                    textAlign: TextAlign.center,
                    style: AppTypography.title(Colors.white).copyWith(
                      fontWeight: FontWeight.bold,
                      height: 1.3,
                      fontSize: 20,
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Warning/Information Banner
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.03),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.white10),
                    ),
                    child: Row(
                      children: [
                        const Icon(
                          Icons.shield_outlined,
                          color: Colors.white70,
                          size: 20,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            'This app stated it may share location data with third parties',
                            style: AppTypography.bodySmall(Colors.white70).copyWith(height: 1.3),
                          ),
                        ),
                        const Icon(
                          Icons.keyboard_arrow_right_rounded,
                          color: Colors.white70,
                          size: 18,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 28),

                  // Location Choice Selector (Precise vs Approximate)
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      // Precise Choice
                      GestureDetector(
                        onTap: () {
                          setState(() {
                            _isPreciseSelected = true;
                          });
                        },
                        child: Column(
                          children: [
                            Container(
                              width: 120,
                              height: 120,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                border: Border.all(
                                  color: _isPreciseSelected 
                                      ? const Color(0xFF1E88E5) 
                                      : Colors.white24,
                                  width: _isPreciseSelected ? 4.0 : 1.5,
                                ),
                              ),
                              child: ClipRRect(
                                borderRadius: BorderRadius.circular(60),
                                child: IgnorePointer(
                                  child: AnimatedBuilder(
                                    animation: _animationController,
                                    builder: (context, child) {
                                      return CustomPaint(
                                        painter: MockMapPainter(
                                          animationValue: _animationController.value,
                                          isPrecise: true,
                                          isDark: isDark,
                                        ),
                                      );
                                    },
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(height: 12),
                            Text(
                              'Precise',
                              style: AppTypography.labelLarge(
                                _isPreciseSelected ? const Color(0xFF1E88E5) : Colors.white70,
                              ).copyWith(fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                      ),

                      // Approximate Choice
                      GestureDetector(
                        onTap: () {
                          setState(() {
                            _isPreciseSelected = false;
                          });
                        },
                        child: Column(
                          children: [
                            Container(
                              width: 120,
                              height: 120,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                border: Border.all(
                                  color: !_isPreciseSelected 
                                      ? const Color(0xFF1E88E5) 
                                      : Colors.white24,
                                  width: !_isPreciseSelected ? 4.0 : 1.5,
                                ),
                              ),
                              child: ClipRRect(
                                borderRadius: BorderRadius.circular(60),
                                child: IgnorePointer(
                                  child: AnimatedBuilder(
                                    animation: _animationController,
                                    builder: (context, child) {
                                      return CustomPaint(
                                        painter: MockMapPainter(
                                          animationValue: _animationController.value,
                                          isPrecise: false,
                                          isDark: isDark,
                                        ),
                                      );
                                    },
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(height: 12),
                            Text(
                              'Approximate',
                              style: AppTypography.labelLarge(
                                !_isPreciseSelected ? const Color(0xFF1E88E5) : Colors.white70,
                              ).copyWith(fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 36),

                  // Option Buttons
                  InkWell(
                    onTap: () {
                      ref.read(authProvider.notifier).grantLocationPermission();
                      context.go('/');
                    },
                    borderRadius: BorderRadius.circular(16),
                    child: Container(
                      width: double.infinity,
                      alignment: Alignment.center,
                      padding: const EdgeInsets.symmetric(vertical: 16.0),
                      child: Text(
                        'While using the app',
                        style: AppTypography.labelLarge(const Color(0xFF1E88E5)).copyWith(
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 4),
                  
                  InkWell(
                    onTap: () {
                      ref.read(authProvider.notifier).grantLocationPermission();
                      context.go('/');
                    },
                    borderRadius: BorderRadius.circular(16),
                    child: Container(
                      width: double.infinity,
                      alignment: Alignment.center,
                      padding: const EdgeInsets.symmetric(vertical: 16.0),
                      child: Text(
                        'Only this time',
                        style: AppTypography.labelLarge(const Color(0xFF1E88E5)).copyWith(
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 4),

                  InkWell(
                    onTap: () {
                      // Reject permission state stays false
                      context.go('/');
                    },
                    borderRadius: BorderRadius.circular(16),
                    child: Container(
                      width: double.infinity,
                      alignment: Alignment.center,
                      padding: const EdgeInsets.symmetric(vertical: 16.0),
                      child: Text(
                        'Don\'t allow',
                        style: AppTypography.labelLarge(const Color(0xFF1E88E5)).copyWith(
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class MockMapPainter extends CustomPainter {
  final double animationValue;
  final bool isPrecise;
  final bool isDark;

  MockMapPainter({
    required this.animationValue,
    required this.isPrecise,
    required this.isDark,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final backgroundPaint = Paint()
      ..color = isDark ? const Color(0xFF1C1C1E) : const Color(0xFFF2F2F7)
      ..style = PaintingStyle.fill;
    
    // Draw background
    canvas.drawRect(Rect.fromLTWH(0, 0, size.width, size.height), backgroundPaint);

    // Draw Roads (Grid lines)
    final roadPaint = Paint()
      ..color = isDark ? Colors.white.withOpacity(0.08) : Colors.black.withOpacity(0.06)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 6.0
      ..strokeCap = StrokeCap.round;

    final path = Path();
    // Some stylized intersecting roads
    path.moveTo(0, size.height * 0.3);
    path.quadraticBezierTo(size.width * 0.4, size.height * 0.25, size.width, size.height * 0.5);

    path.moveTo(size.width * 0.2, 0);
    path.quadraticBezierTo(size.width * 0.5, size.height * 0.5, size.width * 0.8, size.height);

    path.moveTo(0, size.height * 0.8);
    path.lineTo(size.width, size.height * 0.7);

    canvas.drawPath(path, roadPaint);

    // Now draw location indicators
    if (isPrecise) {
      // Precise location: pulsing waves + solid core
      final pulseRadius = 24.0 * animationValue;
      final pulseOpacity = (1.0 - animationValue).clamp(0.0, 1.0);
      
      // Expanding pulse wave 1
      final wavePaint = Paint()
        ..color = const Color(0xFF1E88E5).withOpacity(pulseOpacity * 0.4)
        ..style = PaintingStyle.fill;
      canvas.drawCircle(center, pulseRadius, wavePaint);

      // Expanding pulse wave 2 (offset)
      final wave2Value = (animationValue + 0.5) % 1.0;
      final wave2Radius = 24.0 * wave2Value;
      final wave2Opacity = (1.0 - wave2Value).clamp(0.0, 1.0);
      final wave2Paint = Paint()
        ..color = const Color(0xFF1E88E5).withOpacity(wave2Opacity * 0.2)
        ..style = PaintingStyle.fill;
      canvas.drawCircle(center, wave2Radius, wave2Paint);

      // Core dot
      final corePaint = Paint()
        ..color = const Color(0xFF1E88E5)
        ..style = PaintingStyle.fill;
      canvas.drawCircle(center, 6.0, corePaint);

      // Core white accent
      final accentPaint = Paint()
        ..color = Colors.white
        ..style = PaintingStyle.fill;
      canvas.drawCircle(center, 2.0, accentPaint);
    } else {
      // Approximate location: large approximate area circle + radar sweep
      final approxRadius = 36.0;
      
      // Draw approximate boundary circle
      final boundaryPaint = Paint()
        ..color = const Color(0xFF1E88E5).withOpacity(0.15)
        ..style = PaintingStyle.fill;
      canvas.drawCircle(center, approxRadius, boundaryPaint);

      final strokePaint = Paint()
        ..color = const Color(0xFF1E88E5).withOpacity(0.4)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.5;
      canvas.drawCircle(center, approxRadius, strokePaint);

      // Radar sweep line inside the boundary
      final angle = animationValue * 2 * math.pi;
      final radarSweepPaint = Paint()
        ..color = const Color(0xFF1E88E5).withOpacity(0.5)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2.0;
      
      final lineEnd = Offset(
        center.dx + approxRadius * math.cos(angle),
        center.dy + approxRadius * math.sin(angle),
      );
      canvas.drawLine(center, lineEnd, radarSweepPaint);

      // Core dot (approximate)
      final corePaint = Paint()
        ..color = const Color(0xFF1E88E5)
        ..style = PaintingStyle.fill;
      canvas.drawCircle(center, 4.0, corePaint);
    }
  }

  @override
  bool shouldRepaint(covariant MockMapPainter oldDelegate) {
    return oldDelegate.animationValue != animationValue ||
           oldDelegate.isPrecise != isPrecise ||
           oldDelegate.isDark != isDark;
  }
}
