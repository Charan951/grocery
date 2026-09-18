import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:freshcart_delivery/core/theme.dart';

/// Embedded store → drop route map for the delivery partner's order screen.
/// Auto-fits and zooms in on origin, destination, and the delivery partner's
/// live vehicle location.
class DeliveryMap extends StatefulWidget {
  final LatLng origin;
  final LatLng destination;
  final LatLng? driverLocation;
  final String originLabel;
  final String destinationLabel;
  final String driverLabel;
  final String vehicleType;

  const DeliveryMap({
    super.key,
    required this.origin,
    required this.destination,
    this.driverLocation,
    this.originLabel = 'Store',
    this.destinationLabel = 'Drop',
    this.driverLabel = 'Rider',
    this.vehicleType = 'bike',
  });

  @override
  State<DeliveryMap> createState() => _DeliveryMapState();
}

class _DeliveryMapState extends State<DeliveryMap> {
  late final MapController _map = MapController();

  static const _fitPadding = EdgeInsets.fromLTRB(32, 28, 32, 28);
  static const _fitMinZoom = 3.0;
  static const _fitMaxZoom = 16.5;

  void _fit() {
    final points = [
      widget.origin,
      widget.destination,
      if (widget.driverLocation != null) widget.driverLocation!,
    ];
    final first = points.first;
    final allSame = points.every(
      (p) => (p.latitude - first.latitude).abs() < 0.0001 && (p.longitude - first.longitude).abs() < 0.0001,
    );
    if (allSame) {
      _map.move(first, 15.0);
      return;
    }
    _map.fitCamera(CameraFit.coordinates(
      coordinates: points,
      padding: _fitPadding,
      minZoom: _fitMinZoom,
      maxZoom: _fitMaxZoom,
    ));
  }

  void _zoomIn() {
    final currentZoom = _map.camera.zoom;
    _map.move(_map.camera.center, (currentZoom + 1.0).clamp(3.0, 19.0));
  }

  void _zoomOut() {
    final currentZoom = _map.camera.zoom;
    _map.move(_map.camera.center, (currentZoom - 1.0).clamp(3.0, 19.0));
  }

  IconData _getVehicleIcon(String vehicleType) {
    final vt = vehicleType.toLowerCase();
    if (vt.contains('scooter') || vt.contains('moped') || vt.contains('bike')) {
      return Icons.two_wheeler_rounded;
    }
    if (vt.contains('cycle') || vt.contains('bicycle')) {
      return Icons.pedal_bike_rounded;
    }
    if (vt.contains('auto') || vt.contains('car') || vt.contains('van')) {
      return Icons.directions_car_rounded;
    }
    return Icons.delivery_dining_rounded;
  }

  @override
  void didUpdateWidget(covariant DeliveryMap old) {
    super.didUpdateWidget(old);
    if (old.origin != widget.origin ||
        old.destination != widget.destination ||
        old.driverLocation != widget.driverLocation) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _fit());
    }
  }

  @override
  Widget build(BuildContext context) {
    final driverPos = widget.driverLocation;
    final vehicleIcon = _getVehicleIcon(widget.vehicleType);

    return Stack(
      children: [
        FlutterMap(
          mapController: _map,
          options: MapOptions(
            initialCenter: driverPos ?? widget.origin,
            initialZoom: 14.0,
            minZoom: 3,
            maxZoom: 19,
            backgroundColor: const Color(0xFFF3F4F6),
            onMapReady: _fit,
            interactionOptions: const InteractionOptions(
              flags: InteractiveFlag.pinchZoom | InteractiveFlag.drag | InteractiveFlag.doubleTapZoom,
            ),
          ),
          children: [
            TileLayer(
              urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
              userAgentPackageName: 'com.freshcart.delivery',
              maxZoom: 19,
              keepBuffer: 4,
              panBuffer: 1,
            ),
            PolylineLayer(polylines: [
              if (driverPos != null) ...[
                // Rider to Store leg
                Polyline(
                  points: [driverPos, widget.origin],
                  color: const Color(0xFF2563EB).withValues(alpha: 0.3),
                  strokeWidth: 8,
                  strokeCap: StrokeCap.round,
                  strokeJoin: StrokeJoin.round,
                ),
                Polyline(
                  points: [driverPos, widget.origin],
                  color: const Color(0xFF2563EB),
                  strokeWidth: 3.5,
                  strokeCap: StrokeCap.round,
                  strokeJoin: StrokeJoin.round,
                ),
              ],
              // Store to Destination leg
              Polyline(
                points: [widget.origin, widget.destination],
                color: kGreen.withValues(alpha: 0.28),
                strokeWidth: 10,
                strokeCap: StrokeCap.round,
                strokeJoin: StrokeJoin.round,
              ),
              Polyline(
                points: [widget.origin, widget.destination],
                color: kGreen,
                strokeWidth: 4.5,
                strokeCap: StrokeCap.round,
                strokeJoin: StrokeJoin.round,
              ),
            ]),
            MarkerLayer(markers: [
              // Store Marker
              Marker(
                point: widget.origin,
                width: 64,
                height: 54,
                alignment: Alignment.topCenter,
                child: _Pin(
                  label: widget.originLabel,
                  color: const Color(0xFF1B5E20),
                  icon: Icons.storefront_rounded,
                ),
              ),

              // Destination / Drop Marker
              Marker(
                point: widget.destination,
                width: 56,
                height: 54,
                alignment: Alignment.topCenter,
                child: _Pin(
                  label: widget.destinationLabel,
                  color: kRed,
                  icon: Icons.home_rounded,
                ),
              ),

              // Rider Vehicle Live Location Marker
              if (driverPos != null)
                Marker(
                  point: driverPos,
                  width: 68,
                  height: 58,
                  alignment: Alignment.topCenter,
                  child: _Pin(
                    label: widget.driverLabel,
                    color: const Color(0xFF2563EB),
                    icon: vehicleIcon,
                    isVehicle: true,
                  ),
                ),
            ]),
            Align(
              alignment: Alignment.bottomRight,
              child: Container(
                margin: const EdgeInsets.all(6),
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.85),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: const Text(
                  '© OpenStreetMap',
                  style: TextStyle(fontSize: 8.5, fontWeight: FontWeight.w600, color: Colors.black87),
                ),
              ),
            ),
          ],
        ),
        Positioned(
          top: 8,
          right: 8,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              _ControlButton(icon: Icons.add_rounded, tooltip: 'Zoom in', onTap: _zoomIn),
              const SizedBox(height: 4),
              _ControlButton(icon: Icons.remove_rounded, tooltip: 'Zoom out', onTap: _zoomOut),
              const SizedBox(height: 4),
              _ControlButton(icon: Icons.my_location_rounded, tooltip: 'Recenter route', onTap: _fit),
            ],
          ),
        ),
      ],
    );
  }
}

class _ControlButton extends StatelessWidget {
  final IconData icon;
  final String tooltip;
  final VoidCallback onTap;

  const _ControlButton({required this.icon, required this.tooltip, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      elevation: 2,
      shape: const CircleBorder(),
      child: InkWell(
        onTap: onTap,
        customBorder: const CircleBorder(),
        child: Tooltip(
          message: tooltip,
          child: Padding(
            padding: const EdgeInsets.all(7),
            child: Icon(icon, size: 18, color: kGreen),
          ),
        ),
      ),
    );
  }
}

class _Pin extends StatelessWidget {
  final String label;
  final Color color;
  final IconData icon;
  final bool isVehicle;

  const _Pin({
    required this.label,
    required this.color,
    required this.icon,
    this.isVehicle = false,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(6),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.18),
                blurRadius: 4,
                offset: const Offset(0, 1),
              ),
            ],
          ),
          child: Text(
            label,
            style: const TextStyle(
              fontSize: 9,
              fontWeight: FontWeight.w800,
              color: Colors.white,
            ),
          ),
        ),
        const SizedBox(height: 2),
        Container(
          width: isVehicle ? 32 : 30,
          height: isVehicle ? 32 : 30,
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
            border: Border.all(color: Colors.white, width: 2),
            boxShadow: [
              BoxShadow(
                color: color.withValues(alpha: 0.35),
                blurRadius: 6,
                spreadRadius: 1,
              ),
            ],
          ),
          child: Icon(icon, color: Colors.white, size: isVehicle ? 18 : 16),
        ),
      ],
    );
  }
}
