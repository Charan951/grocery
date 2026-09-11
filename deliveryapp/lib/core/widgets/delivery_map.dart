import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:freshcart_delivery/core/theme.dart';

/// Embedded store → drop route map for the delivery partner's order screen.
/// Auto-fits and zooms in on the two points instead of leaving the partner
/// to eyeball a zoomed-out city view.
class DeliveryMap extends StatefulWidget {
  final LatLng origin;
  final LatLng destination;
  final String originLabel;
  final String destinationLabel;

  const DeliveryMap({
    super.key,
    required this.origin,
    required this.destination,
    this.originLabel = 'Store',
    this.destinationLabel = 'Drop',
  });

  @override
  State<DeliveryMap> createState() => _DeliveryMapState();
}

class _DeliveryMapState extends State<DeliveryMap> {
  late final MapController _map = MapController();

  static const _fitPadding = EdgeInsets.fromLTRB(32, 28, 32, 40);
  static const _fitMinZoom = 14.5;
  static const _fitMaxZoom = 17.5;

  void _fit() {
    final points = [widget.origin, widget.destination];
    final first = points.first;
    final allSame = points.every(
      (p) => (p.latitude - first.latitude).abs() < 0.0001 && (p.longitude - first.longitude).abs() < 0.0001,
    );
    if (allSame) {
      _map.move(first, _fitMaxZoom);
      return;
    }
    _map.fitCamera(CameraFit.coordinates(
      coordinates: points,
      padding: _fitPadding,
      minZoom: _fitMinZoom,
      maxZoom: _fitMaxZoom,
    ));
  }

  @override
  void didUpdateWidget(covariant DeliveryMap old) {
    super.didUpdateWidget(old);
    if (old.origin != widget.origin || old.destination != widget.destination) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _fit());
    }
  }

  @override
  Widget build(BuildContext context) {
    return FlutterMap(
      mapController: _map,
      options: MapOptions(
        initialCenter: widget.origin,
        initialZoom: _fitMaxZoom,
        minZoom: 4,
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
        ),
        PolylineLayer(polylines: [
          Polyline(
            points: [widget.origin, widget.destination],
            color: kGreen.withValues(alpha: 0.85),
            strokeWidth: 4,
            strokeCap: StrokeCap.round,
          ),
        ]),
        MarkerLayer(markers: [
          Marker(
            point: widget.origin,
            width: 64,
            height: 54,
            alignment: Alignment.topCenter,
            child: _Pin(label: widget.originLabel, color: const Color(0xFF1B5E20), icon: Icons.storefront_rounded),
          ),
          Marker(
            point: widget.destination,
            width: 56,
            height: 54,
            alignment: Alignment.topCenter,
            child: _Pin(label: widget.destinationLabel, color: kRed, icon: Icons.home_rounded),
          ),
        ]),
        Align(
          alignment: Alignment.bottomRight,
          child: Container(
            margin: const EdgeInsets.all(6),
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.75), borderRadius: BorderRadius.circular(4)),
            child: const Text('© OpenStreetMap', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w600, color: Colors.black87)),
          ),
        ),
      ],
    );
  }
}

class _Pin extends StatelessWidget {
  final String label;
  final Color color;
  final IconData icon;
  const _Pin({required this.label, required this.color, required this.icon});

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
            boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.18), blurRadius: 4, offset: const Offset(0, 1))],
          ),
          child: Text(label, style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: Colors.white)),
        ),
        const SizedBox(height: 2),
        Container(
          width: 30,
          height: 30,
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
            border: Border.all(color: Colors.white, width: 2),
            boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.2), blurRadius: 6, offset: const Offset(0, 2))],
          ),
          child: Icon(icon, color: Colors.white, size: 16),
        ),
      ],
    );
  }
}
