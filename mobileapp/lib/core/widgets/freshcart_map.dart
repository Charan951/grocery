import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:freshcart/core/constants/app_colors.dart';

/// FreshCart high-performance interactive map.
///
/// Features:
/// - Clean, high-performance OpenStreetMap raster tiles (no API key required, zero watermarks)
/// - Dark mode styling via high-efficiency color matrix filter
/// - Automated route framing and zoom centering (`fitCoordinates`)
/// - Smooth camera animations with cubic curves
/// - Dual-layer glowing route polyline
/// - Interactive zoom in / out / recenter controls
class FreshCartMap extends StatefulWidget {
  final LatLng initialCenter;
  final double initialZoom;
  final double minZoom;
  final double maxZoom;
  final bool isDark;
  final FreshCartMapController? controller;
  final List<LatLng> points;
  final List<LatLng> routePoints;
  final Color routeColor;
  final double routeWidth;
  final List<Marker> markers;
  final void Function(MapCamera camera, bool hasGesture)? onCameraMove;
  final void Function()? onMapReady;
  final bool showAttribution;
  final bool showPulseMarker;
  final bool showControls;
  final EdgeInsets fitPadding;
  final double fitMinZoom;
  final double fitMaxZoom;

  const FreshCartMap({
    super.key,
    required this.initialCenter,
    this.initialZoom = 15.5,
    this.minZoom = 3.0,
    this.maxZoom = 19.0,
    this.isDark = false,
    this.controller,
    this.points = const [],
    this.routePoints = const [],
    this.routeColor = AppColors.primary,
    this.routeWidth = 4.5,
    this.markers = const [],
    this.onCameraMove,
    this.onMapReady,
    this.showAttribution = true,
    this.showPulseMarker = true,
    this.showControls = true,
    this.fitPadding = const EdgeInsets.fromLTRB(32, 28, 32, 54),
    this.fitMinZoom = 14.5,
    this.fitMaxZoom = 17.5,
  });

  @override
  State<FreshCartMap> createState() => _FreshCartMapState();
}

class _FreshCartMapState extends State<FreshCartMap> with SingleTickerProviderStateMixin {
  late final MapController _mapController;
  late final AnimationController _pulseAnim;

  // Dark mode color matrix (inverts and darkens tiles for sleek dark themes)
  static const List<double> _darkModeMatrix = [
    -0.25, -0.65, -0.10, 0, 235,
    -0.25, -0.65, -0.10, 0, 235,
    -0.25, -0.65, -0.10, 0, 235,
     0,     0,     0,    1, 0,
  ];

  @override
  void initState() {
    super.initState();
    _mapController = widget.controller?.mapController ?? MapController();
    widget.controller?._bind(this, _mapController);

    _pulseAnim = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1800),
    )..repeat();
  }

  @override
  void didUpdateWidget(covariant FreshCartMap oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.controller != oldWidget.controller && widget.controller != null) {
      widget.controller!._bind(this, _mapController);
    }
  }

  @override
  void dispose() {
    _pulseAnim.dispose();
    if (widget.controller == null) {
      _mapController.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final allMarkers = <Marker>[
      ...widget.markers,
      if (widget.showPulseMarker)
        for (final p in widget.points)
          Marker(
            point: p,
            width: 44,
            height: 44,
            child: AnimatedBuilder(
              animation: _pulseAnim,
              builder: (context, child) {
                final v = _pulseAnim.value;
                return Stack(
                  alignment: Alignment.center,
                  children: [
                    Container(
                      width: 14 + (28 * v),
                      height: 14 + (28 * v),
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: widget.routeColor.withOpacity(math.max(0.0, 0.4 * (1 - v))),
                      ),
                    ),
                    Container(
                      width: 16,
                      height: 16,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: Colors.white,
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.2),
                            blurRadius: 4,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      width: 10,
                      height: 10,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: widget.routeColor,
                      ),
                    ),
                  ],
                );
              },
            ),
          ),
    ];

    final coordinatesToFit = widget.routePoints.length >= 2
        ? widget.routePoints
        : (widget.points.length >= 2 ? widget.points : const <LatLng>[]);

    final initialFit = coordinatesToFit.length >= 2
        ? CameraFit.coordinates(
            coordinates: coordinatesToFit,
            padding: widget.fitPadding,
            maxZoom: widget.fitMaxZoom,
            minZoom: widget.fitMinZoom,
          )
        : null;

    final tileLayer = TileLayer(
      urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      userAgentPackageName: 'com.speshway.freshcart',
      maxZoom: widget.maxZoom,
      keepBuffer: 4,
      panBuffer: 1,
    );

    return Stack(
      children: [
        FlutterMap(
          mapController: _mapController,
          options: MapOptions(
            initialCameraFit: initialFit,
            initialCenter: widget.initialCenter,
            initialZoom: widget.initialZoom,
            minZoom: widget.minZoom,
            maxZoom: widget.maxZoom,
            backgroundColor: widget.isDark ? const Color(0xFF1E1E20) : const Color(0xFFF3F4F6),
            onMapReady: widget.onMapReady,
            onPositionChanged: (camera, hasGesture) {
              widget.onCameraMove?.call(camera, hasGesture);
            },
          ),
          children: [
            // 1. Clean OpenStreetMap tiles (with dark-mode matrix filter if dark)
            if (widget.isDark)
              ColorFiltered(
                colorFilter: const ColorFilter.matrix(_darkModeMatrix),
                child: tileLayer,
              )
            else
              tileLayer,

            // 2. Route polyline (glowing backdrop + crisp primary route)
            if (widget.routePoints.length >= 2) ...[
              PolylineLayer(
                polylines: [
                  Polyline(
                    points: widget.routePoints,
                    color: widget.routeColor.withOpacity(0.28),
                    strokeWidth: widget.routeWidth + 6,
                    strokeCap: StrokeCap.round,
                    strokeJoin: StrokeJoin.round,
                  ),
                ],
              ),
              PolylineLayer(
                polylines: [
                  Polyline(
                    points: widget.routePoints,
                    color: widget.routeColor,
                    strokeWidth: widget.routeWidth,
                    strokeCap: StrokeCap.round,
                    strokeJoin: StrokeJoin.round,
                  ),
                ],
              ),
            ],

            // 3. Markers
            if (allMarkers.isNotEmpty) MarkerLayer(markers: allMarkers),

            // 4. Subtle attribution badge
            if (widget.showAttribution)
              Align(
                alignment: Alignment.bottomRight,
                child: Container(
                  margin: const EdgeInsets.all(6),
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: (widget.isDark ? Colors.black : Colors.white).withOpacity(0.7),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    '© OpenStreetMap',
                    style: TextStyle(
                      fontSize: 9,
                      fontWeight: FontWeight.w600,
                      color: widget.isDark ? Colors.white70 : Colors.black87,
                    ),
                  ),
                ),
              ),
          ],
        ),

        // 5. Floating Zoom & Recenter Controls
        if (widget.showControls)
          Positioned(
            top: 10,
            right: 10,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                _MapControlButton(
                  icon: Icons.add_rounded,
                  tooltip: 'Zoom in',
                  isDark: widget.isDark,
                  onTap: () {
                    final nextZoom = (_mapController.camera.zoom + 1).clamp(widget.minZoom, widget.maxZoom);
                    widget.controller?.flyTo(_mapController.camera.center, zoom: nextZoom);
                  },
                ),
                const SizedBox(height: 6),
                _MapControlButton(
                  icon: Icons.remove_rounded,
                  tooltip: 'Zoom out',
                  isDark: widget.isDark,
                  onTap: () {
                    final nextZoom = (_mapController.camera.zoom - 1).clamp(widget.minZoom, widget.maxZoom);
                    widget.controller?.flyTo(_mapController.camera.center, zoom: nextZoom);
                  },
                ),
                if (coordinatesToFit.isNotEmpty) ...[
                  const SizedBox(height: 6),
                  _MapControlButton(
                    icon: Icons.crop_free_rounded,
                    tooltip: 'Fit route',
                    isDark: widget.isDark,
                    onTap: () {
                      widget.controller?.fitCoordinates(
                        coordinatesToFit,
                        padding: widget.fitPadding,
                        maxZoom: widget.fitMaxZoom,
                        minZoom: widget.fitMinZoom,
                      );
                    },
                  ),
                ],
              ],
            ),
          ),
      ],
    );
  }
}

class _MapControlButton extends StatelessWidget {
  final IconData icon;
  final String tooltip;
  final bool isDark;
  final VoidCallback onTap;

  const _MapControlButton({
    required this.icon,
    required this.tooltip,
    required this.isDark,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: (isDark ? const Color(0xFF1E1E20) : Colors.white).withOpacity(0.92),
      borderRadius: BorderRadius.circular(10),
      elevation: 3,
      shadowColor: Colors.black26,
      child: InkWell(
        borderRadius: BorderRadius.circular(10),
        onTap: onTap,
        child: Tooltip(
          message: tooltip,
          child: Container(
            width: 32,
            height: 32,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                color: isDark ? AppColors.dividerDark : const Color(0xFFE5E7EB),
              ),
            ),
            child: Icon(
              icon,
              size: 18,
              color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
            ),
          ),
        ),
      ),
    );
  }
}

/// Controller providing smooth animated camera moves and route-fitting for [FreshCartMap].
class FreshCartMapController {
  final TickerProvider vsync;
  MapController? _internal;
  State? _state;
  AnimationController? _activeAnim;

  FreshCartMapController({required this.vsync});

  MapController get mapController {
    _internal ??= MapController();
    return _internal!;
  }

  void _bind(State state, MapController controller) {
    _state = state;
    _internal = controller;
  }

  MapCamera get camera => mapController.camera;
  LatLng get center => mapController.camera.center;
  double get zoom => mapController.camera.zoom;

  /// Smoothly animates camera to [target] with easing curve.
  void flyTo(
    LatLng target, {
    double zoom = 15.5,
    Duration duration = const Duration(milliseconds: 750),
    Curve curve = Curves.fastOutSlowIn,
  }) {
    if (_state?.mounted != true) {
      mapController.move(target, zoom);
      return;
    }

    _activeAnim?.stop();
    _activeAnim?.dispose();

    final anim = AnimationController(vsync: vsync, duration: duration);
    _activeAnim = anim;

    final startCenter = mapController.camera.center;
    final startZoom = mapController.camera.zoom;

    final latTween = Tween<double>(begin: startCenter.latitude, end: target.latitude);
    final lngTween = Tween<double>(begin: startCenter.longitude, end: target.longitude);
    final zoomTween = Tween<double>(begin: startZoom, end: zoom);

    final curved = CurvedAnimation(parent: anim, curve: curve);

    anim.addListener(() {
      final lat = latTween.evaluate(curved);
      final lng = lngTween.evaluate(curved);
      final z = zoomTween.evaluate(curved);
      mapController.move(LatLng(lat, lng), z);
    });

    anim.addStatusListener((status) {
      if (status == AnimationStatus.completed || status == AnimationStatus.dismissed) {
        anim.dispose();
        if (_activeAnim == anim) _activeAnim = null;
      }
    });

    anim.forward();
  }

  /// Automatically zooms in and fits the camera around [points] (the delivery route).
  void fitCoordinates(
    List<LatLng> points, {
    EdgeInsets padding = const EdgeInsets.fromLTRB(32, 28, 32, 54),
    double maxZoom = 16.5,
    double minZoom = 13.5,
    Duration duration = const Duration(milliseconds: 750),
  }) {
    if (points.isEmpty) return;
    if (points.length == 1) {
      flyTo(points.first, zoom: maxZoom, duration: duration);
      return;
    }

    final first = points.first;
    final allSame = points.every(
      (p) => (p.latitude - first.latitude).abs() < 0.0001 &&
             (p.longitude - first.longitude).abs() < 0.0001,
    );
    if (allSame) {
      flyTo(first, zoom: maxZoom, duration: duration);
      return;
    }

    final cameraFit = CameraFit.coordinates(
      coordinates: points,
      padding: padding,
      maxZoom: maxZoom,
      minZoom: minZoom,
    );

    try {
      final fittedCamera = cameraFit.fit(mapController.camera);
      flyTo(fittedCamera.center, zoom: fittedCamera.zoom, duration: duration);
    } catch (_) {
      mapController.fitCamera(cameraFit);
    }
  }

  /// Instantly repositions without animation.
  void move(LatLng target, double zoom) {
    mapController.move(target, zoom);
  }

  void dispose() {
    _activeAnim?.stop();
    _activeAnim?.dispose();
    _activeAnim = null;
  }
}

