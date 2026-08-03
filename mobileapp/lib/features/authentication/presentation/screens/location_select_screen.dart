import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';
import 'package:mapcn_flutter/mapcn_flutter.dart';
import 'package:geolocator/geolocator.dart';
import 'package:dio/dio.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/features/authentication/presentation/controllers/auth_controller.dart';

final List<Map<String, dynamic>> popularLocations = [
  {'name': 'HITEC City (Hyderabad)', 'lat': 17.4474, 'lng': 78.3762, 'area': 'HITEC CITY', 'pin': '500081'},
  {'name': 'Kukatpally (Hyderabad)', 'lat': 17.4842, 'lng': 78.3888, 'area': 'KPHB COLONY', 'pin': '500072'},
  {'name': 'Indiranagar (Bengaluru)', 'lat': 12.9784, 'lng': 77.6408, 'area': 'INDIRANAGAR', 'pin': '560038'},
  {'name': 'HSR Layout (Bengaluru)', 'lat': 12.9121, 'lng': 77.6446, 'area': 'HSR LAYOUT', 'pin': '560102'},
];

class LocationSelectScreen extends ConsumerStatefulWidget {
  const LocationSelectScreen({super.key});

  @override
  ConsumerState<LocationSelectScreen> createState() => _LocationSelectScreenState();
}

class _LocationSelectScreenState extends ConsumerState<LocationSelectScreen> with TickerProviderStateMixin {
  late final MapcnController _mapController;
  final TextEditingController _searchController = TextEditingController();
  final TextEditingController _houseNoController = TextEditingController();
  final TextEditingController _landmarkController = TextEditingController();

  LatLng _currentCenter = const LatLng(17.4842, 78.3888);
  String _areaName = 'KPHB COLONY';
  String _pincode = '500072';
  String _fullAddressText = 'Balaji Nagar, KPHB Colony, Kukatpally mandal, Hyderabad, Telangana, 500072, India';
  String _selectedLabel = 'Home';

  @override
  void initState() {
    super.initState();
    _mapController = MapcnController(vsync: this);
  }

  @override
  void dispose() {
    _searchController.dispose();
    _houseNoController.dispose();
    _landmarkController.dispose();
    super.dispose();
  }

  Future<void> _locateUser() async {
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Please enable GPS/Location services.')),
          );
        }
        return;
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          return;
        }
      }

      Position position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.best,
      );

      final userLatLng = LatLng(position.latitude, position.longitude);
      setState(() {
        _currentCenter = userLatLng;
      });

      _mapController.flyTo(userLatLng, zoom: 15.0);
      await _reverseGeocode(userLatLng);
    } catch (_) {}
  }

  Future<void> _reverseGeocode(LatLng pos) async {
    try {
      final dio = Dio();
      dio.options.headers['User-Agent'] = 'FreshCartApp/1.0';
      final response = await dio.get(
        'https://nominatim.openstreetmap.org/reverse',
        queryParameters: {
          'format': 'json',
          'lat': pos.latitude,
          'lon': pos.longitude,
          'zoom': 18,
          'addressdetails': 1,
        },
      );

      if (response.statusCode == 200 && response.data != null) {
        final data = response.data as Map<String, dynamic>;
        final address = data['address'] as Map<String, dynamic>?;
        if (address != null) {
          final suburb = address['suburb'] ?? address['neighbourhood'] ?? address['road'] ?? 'KPHB COLONY';
          final postcode = address['postcode'] ?? '500072';
          final displayName = data['display_name'] ?? _fullAddressText;

          setState(() {
            _areaName = suburb.toString().toUpperCase();
            _pincode = postcode.toString();
            _fullAddressText = displayName.toString();
          });
        }
      }
    } catch (_) {}
  }

  void _confirmAndDeliver() {
    final houseNo = _houseNoController.text.trim();
    final landmark = _landmarkController.text.trim();

    final finalFullAddress = '${houseNo.isNotEmpty ? '$houseNo, ' : ''}${landmark.isNotEmpty ? '$landmark, ' : ''}$_fullAddressText';

    final auth = ref.read(authProvider);
    final id = 'addr_${DateTime.now().millisecondsSinceEpoch}';

    final newAddr = {
      'id': id,
      'tag': _selectedLabel,
      'receiverName': auth.user?.name ?? 'Customer',
      'addressLine': finalFullAddress,
      'houseNo': houseNo,
      'landmark': landmark,
      'city': _areaName,
      'pincode': _pincode,
      'phone': auth.user?.phone ?? '+91 6305804155',
      'isDefault': true,
    };

    ref.read(authProvider.notifier).grantLocationPermission();
    ref.read(authProvider.notifier).addAddress(newAddr);
    ref.read(authProvider.notifier).selectAddress(id);

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Delivery location updated: $finalFullAddress'),
        behavior: SnackBarBehavior.floating,
        backgroundColor: const Color(0xFF00A86B),
      ),
    );

    context.pop();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final authState = ref.watch(authProvider);
    final savedAddresses = authState.user?.addresses ?? [];

    return Scaffold(
      backgroundColor: isDark ? AppColors.backgroundDark : const Color(0xFFF9FAFB),
      appBar: AppBar(
        backgroundColor: isDark ? const Color(0xFF1C1C1E) : Colors.white,
        elevation: 0.5,
        leading: IconButton(
          icon: const Icon(Icons.close_rounded, size: 22),
          onPressed: () => context.pop(),
        ),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFF00A86B).withOpacity(0.12),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.location_on_rounded, color: Color(0xFF00A86B), size: 20),
            ),
            const SizedBox(width: 12),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Select Delivery Location',
                  style: AppTypography.labelLarge(isDark ? Colors.white : AppColors.textPrimary).copyWith(
                    fontWeight: FontWeight.w900,
                    fontSize: 16,
                  ),
                ),
                Text(
                  'Pin exact location on OpenStreetMap',
                  style: AppTypography.bodySmall(isDark ? Colors.white54 : Colors.black45).copyWith(fontSize: 11),
                ),
              ],
            ),
          ],
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Container(
                        height: 48,
                        padding: const EdgeInsets.symmetric(horizontal: 14),
                        decoration: BoxDecoration(
                          color: isDark ? Colors.white.withOpacity(0.05) : Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: isDark ? Colors.white10 : Colors.black.withOpacity(0.08)),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.search_rounded, color: Colors.grey, size: 20),
                            const SizedBox(width: 8),
                            Expanded(
                              child: TextField(
                                controller: _searchController,
                                style: AppTypography.bodyMedium(isDark ? Colors.white : Colors.black),
                                decoration: const InputDecoration(
                                  hintText: 'Type area, landmark or street...',
                                  hintStyle: TextStyle(fontSize: 12, color: Colors.grey),
                                  border: InputBorder.none,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    ElevatedButton.icon(
                      onPressed: _locateUser,
                      icon: const Icon(Icons.navigation_rounded, size: 16, color: Colors.white),
                      label: const Text('Locate Me', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF00A86B),
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                        elevation: 0,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),

                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  physics: const BouncingScrollPhysics(),
                  child: Row(
                    children: [
                      Text('POPULAR:', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: isDark ? Colors.white38 : Colors.grey)),
                      const SizedBox(width: 8),
                      ...popularLocations.map((loc) {
                        return Padding(
                          padding: const EdgeInsets.only(right: 6.0),
                          child: ActionChip(
                            avatar: const Text('📍', style: TextStyle(fontSize: 12)),
                            label: Text(loc['name'] as String, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                            backgroundColor: isDark ? Colors.white10 : Colors.grey.shade100,
                            onPressed: () {
                              final latLng = LatLng(loc['lat'] as double, loc['lng'] as double);
                              setState(() {
                                _currentCenter = latLng;
                                _areaName = loc['area'] as String;
                                _pincode = loc['pin'] as String;
                                _fullAddressText = '${loc['name']}, India';
                              });
                              _mapController.flyTo(latLng, zoom: 15.0);
                            },
                          ),
                        );
                      }),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                Container(
                  height: 180,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: isDark ? Colors.white10 : Colors.black.withOpacity(0.1)),
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(20),
                    child: Stack(
                      children: [
                        Mapcn(
                          controller: _mapController,
                          initialCenter: _currentCenter,
                          initialZoom: 15,
                          style: isDark ? MapcnStyle.dark : MapcnStyle.normal,
                          accentColor: const Color(0xFF00A86B),
                          onCameraMove: (camera, hasGesture) {
                            if (hasGesture) {
                              setState(() {
                                _currentCenter = camera.center;
                              });
                            }
                          },
                          markerConfig: MarkerConfig(
                            style: MarkerStyle.pulse,
                            coreRadius: 8,
                            pulseRadius: 30,
                            glowIntensity: 0.4,
                          ),
                          points: [_currentCenter],
                        ),
                        Positioned(
                          top: 10,
                          right: 10,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.9),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Text(
                              '💡 Drag map to select location',
                              style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.black87),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFFE8F5E9).withOpacity(isDark ? 0.1 : 0.6),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: const Color(0xFF00A86B).withOpacity(0.3)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: [
                              const Icon(Icons.location_on_rounded, color: Color(0xFF00A86B), size: 18),
                              const SizedBox(width: 6),
                              Text(
                                _areaName,
                                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: Color(0xFF00A86B), letterSpacing: 0.5),
                              ),
                            ],
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(6),
                              border: Border.all(color: Colors.black12),
                            ),
                            child: Text(
                              'PIN: $_pincode',
                              style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(
                        _fullAddressText,
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: isDark ? Colors.white : Colors.black87),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 14),

                      TextField(
                        controller: _houseNoController,
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: isDark ? Colors.white : Colors.black),
                        decoration: InputDecoration(
                          labelText: 'HOUSE / FLAT / DOOR NO',
                          labelStyle: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey),
                          hintText: 'e.g. Flat 402, Sunshine Apts',
                          hintStyle: const TextStyle(fontSize: 12, color: Colors.grey),
                          filled: true,
                          fillColor: isDark ? Colors.white.withOpacity(0.05) : Colors.white,
                          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                        ),
                      ),
                      const SizedBox(height: 10),

                      TextField(
                        controller: _landmarkController,
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: isDark ? Colors.white : Colors.black),
                        decoration: InputDecoration(
                          labelText: 'LANDMARK (OPTIONAL)',
                          labelStyle: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey),
                          hintText: 'e.g. Near Metro Station',
                          hintStyle: const TextStyle(fontSize: 12, color: Colors.grey),
                          filled: true,
                          fillColor: isDark ? Colors.white.withOpacity(0.05) : Colors.white,
                          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                        ),
                      ),
                      const SizedBox(height: 12),

                      Row(
                        children: [
                          const Text('SAVE AS:', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: Colors.grey)),
                          const SizedBox(width: 8),
                          ...['Home', 'Work', 'Other'].map((lbl) {
                            final isSelected = _selectedLabel == lbl;
                            final iconStr = lbl == 'Home' ? '🏠' : (lbl == 'Work' ? '💼' : '📍');
                            return Padding(
                              padding: const EdgeInsets.only(right: 6.0),
                              child: ChoiceChip(
                                label: Text('$iconStr $lbl', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: isSelected ? Colors.white : Colors.black87)),
                                selected: isSelected,
                                selectedColor: const Color(0xFF00A86B),
                                backgroundColor: Colors.white,
                                onSelected: (_) => setState(() => _selectedLabel = lbl),
                              ),
                            );
                          }),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                if (savedAddresses.isNotEmpty) ...[
                  Text('SAVED ADDRESSES', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: isDark ? Colors.white38 : Colors.grey, letterSpacing: 0.8)),
                  const SizedBox(height: 8),
                  ...savedAddresses.map((addr) {
                    final tag = addr['tag'] ?? 'Home';
                    final iconStr = tag == 'Home' ? '🏠' : (tag == 'Work' ? '💼' : '📍');
                    final line = addr['addressLine'] ?? '';
                    final isSelected = authState.user?.selectedAddress?['id'] == addr['id'];

                    return Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      child: InkWell(
                        onTap: () {
                          ref.read(authProvider.notifier).selectAddress(addr['id'] as String);
                          context.pop();
                        },
                        borderRadius: BorderRadius.circular(16),
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: isDark ? Colors.white.withOpacity(0.04) : Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: isSelected ? const Color(0xFF00A86B) : (isDark ? Colors.white10 : Colors.black.withOpacity(0.06))),
                          ),
                          child: Row(
                            children: [
                              Container(
                                width: 36,
                                height: 36,
                                decoration: BoxDecoration(
                                  color: Colors.grey.shade100,
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                alignment: Alignment.center,
                                child: Text(iconStr, style: const TextStyle(fontSize: 16)),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(tag as String, style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: isDark ? Colors.white : Colors.black)),
                                    const SizedBox(height: 2),
                                    Text(line as String, style: const TextStyle(fontSize: 11, color: Colors.grey), maxLines: 1, overflow: TextOverflow.ellipsis),
                                  ],
                                ),
                              ),
                              if (isSelected)
                                const Icon(Icons.check_circle_rounded, color: Color(0xFF00A86B), size: 20),
                            ],
                          ),
                        ),
                      ),
                    );
                  }),
                  const SizedBox(height: 16),
                ],

                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: _confirmAndDeliver,
                    icon: const Icon(Icons.check_rounded, color: Colors.white, size: 20),
                    label: const Text('Confirm & Deliver Here', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: Colors.white)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF00A86B),
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      elevation: 2,
                    ),
                  ),
                ),
                const SizedBox(height: 20),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
