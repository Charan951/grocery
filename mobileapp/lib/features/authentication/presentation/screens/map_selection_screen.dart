import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';
import 'package:mapcn_flutter/mapcn_flutter.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/core/widgets/buttons.dart';
import 'package:freshcart/core/widgets/glass_card.dart';
import 'package:freshcart/features/authentication/presentation/controllers/auth_controller.dart';
import 'package:geolocator/geolocator.dart';
import 'package:dio/dio.dart';

class MapSelectionScreen extends ConsumerStatefulWidget {
  final bool autoLocate;
  const MapSelectionScreen({super.key, this.autoLocate = false});

  @override
  ConsumerState<MapSelectionScreen> createState() => _MapSelectionScreenState();
}

class _MapSelectionScreenState extends ConsumerState<MapSelectionScreen> with TickerProviderStateMixin {
  late final MapcnController _mapController;
  final TextEditingController _searchController = TextEditingController();
  final TextEditingController _houseDetailsController = TextEditingController();
  final TextEditingController _areaController = TextEditingController();
  final TextEditingController _cityController = TextEditingController();
  final TextEditingController _pincodeController = TextEditingController();
  
  LatLng _currentCenter = const LatLng(12.9716, 77.5946); // Bangalore center
  String _selectedAddressLine = '';
  String _selectedCity = '';
  String _selectedPincode = '';
  String _addressTag = 'Home'; // Home, Work, Other
  bool _isLocating = false;
  
  MapcnStyle _currentMapStyle = MapcnStyle.normal; // Colourful style by default
  Timer? _debounceTimer;

  // Mock search suggestions
  final List<Map<String, dynamic>> _mockSuggestions = [
    {
      'addressLine': 'Sai Asha Residency, Outer Ring Road, Kadubeesanahalli',
      'city': 'Bengaluru',
      'pincode': '560103',
      'lat': 12.9716,
      'lng': 77.5946,
    },
    {
      'addressLine': 'Prestige Tech Park, Marathahalli - Sarjapur Outer Ring Rd',
      'city': 'Bengaluru',
      'pincode': '560103',
      'lat': 12.9366,
      'lng': 77.6897,
    },
    {
      'addressLine': 'Indiranagar Metro Station, 100 Feet Rd',
      'city': 'Bengaluru',
      'pincode': '560038',
      'lat': 12.9784,
      'lng': 77.6385,
    },
  ];

  @override
  void initState() {
    super.initState();
    _mapController = MapcnController(vsync: this);
    
    _areaController.text = _selectedAddressLine;
    _cityController.text = _selectedCity;
    _pincodeController.text = _selectedPincode;
    
    if (widget.autoLocate) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _locateUser();
      });
    }
  }

  @override
  void dispose() {
    _debounceTimer?.cancel();
    _searchController.dispose();
    _houseDetailsController.dispose();
    _areaController.dispose();
    _cityController.dispose();
    _pincodeController.dispose();
    super.dispose();
  }

  void _onSearchQuery(String value) {
    if (value.isEmpty) return;
    // Simple mock search matching
    final match = _mockSuggestions.firstWhere(
      (s) => s['addressLine'].toString().toLowerCase().contains(value.toLowerCase()),
      orElse: () => _mockSuggestions.first,
    );
    
    setState(() {
      _currentCenter = LatLng(match['lat'] as double, match['lng'] as double);
      _selectedAddressLine = match['addressLine'] as String;
      _selectedCity = match['city'] as String;
      _selectedPincode = match['pincode'] as String;
      
      _areaController.text = _selectedAddressLine;
      _cityController.text = _selectedCity;
      _pincodeController.text = _selectedPincode;
    });

    // Animate map camera to search result
    _mapController.flyTo(
      _currentCenter,
      zoom: 15.0,
      duration: const Duration(milliseconds: 800),
    );
  }

  void _saveLocation() {
    final houseDetails = _houseDetailsController.text.trim();
    final area = _areaController.text.trim();
    final city = _cityController.text.trim();
    final pincode = _pincodeController.text.trim();

    if (houseDetails.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter Flat / House No. / Building Name.'),
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    if (area.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter Street / Area / Landmark.'),
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    if (city.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter City.'),
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    if (pincode.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter Pincode.'),
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }
    
    final addresses = ref.read(authProvider).user?.addresses ?? [];
    final id = 'addr_${addresses.length + 1}';
    final finalAddressLine = '$houseDetails, $area';

    final newAddress = {
      'id': id,
      'tag': _addressTag,
      'receiverName': ref.read(authProvider).user?.name ?? 'John Doe',
      'addressLine': finalAddressLine,
      'city': city,
      'pincode': pincode,
      'phone': ref.read(authProvider).user?.phone ?? '+91 9876543210',
      'isDefault': false,
    };

    ref.read(authProvider.notifier).grantLocationPermission();
    ref.read(authProvider.notifier).addAddress(newAddress);
    ref.read(authProvider.notifier).selectAddress(id);
    
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Address added and selected: $finalAddressLine'),
        duration: const Duration(seconds: 2),
        behavior: SnackBarBehavior.floating,
      ),
    );

    context.pop();
  }

  void _onMapCameraMove(LatLng newCenter) {
    setState(() {
      _currentCenter = newCenter;
    });
    
    // Debounce the reverse geocoding to prevent Nominatim rate-limiting/slowness
    _debounceTimer?.cancel();
    _debounceTimer = Timer(const Duration(milliseconds: 600), () {
      _reverseGeocode(newCenter);
    });
  }

  void _onMapTapped(TapUpDetails details) {
    if (!_mapController.isReady) return;
    final latLng = _mapController.camera.screenOffsetToLatLng(details.localPosition);
    
    setState(() {
      _currentCenter = latLng;
    });

    // Fly camera to tapped coordinates
    _mapController.flyTo(
      latLng,
      zoom: _mapController.zoom,
      duration: const Duration(milliseconds: 650),
    );

    // Debounce reverse geocoding
    _debounceTimer?.cancel();
    _debounceTimer = Timer(const Duration(milliseconds: 400), () {
      _reverseGeocode(latLng);
    });
  }

  Future<void> _reverseGeocode(LatLng position) async {
    setState(() {
      _isLocating = true;
    });

    try {
      String fetchedPlace = '';
      String fetchedCity = '';
      String fetchedPincode = '';

      final dio = Dio();
      dio.options.headers['User-Agent'] = 'FreshCartApp/1.0';
      dio.options.connectTimeout = const Duration(seconds: 4);
      dio.options.receiveTimeout = const Duration(seconds: 4);
      
      final response = await dio.get(
        'https://nominatim.openstreetmap.org/reverse',
        queryParameters: {
          'format': 'json',
          'lat': position.latitude,
          'lon': position.longitude,
          'zoom': 18,
          'addressdetails': 1,
        },
      );

      if (response.statusCode == 200 && response.data != null) {
        final data = response.data as Map<String, dynamic>;
        final address = data['address'] as Map<String, dynamic>?;
        if (address != null) {
          final road = address['road'] ?? address['pedestrian'] ?? address['suburb'] ?? address['neighbourhood'] ?? '';
          final city = address['city'] ?? address['town'] ?? address['village'] ?? address['county'] ?? '';
          final state = address['state'] ?? '';
          final postcode = address['postcode'] ?? '';

          List<String> segments = [];
          if (road.toString().isNotEmpty) segments.add(road.toString());
          
          fetchedPlace = segments.isNotEmpty ? segments.join(', ') : (data['display_name'] ?? 'Selected Location');
          
          if (fetchedPlace.length > 50) {
            fetchedPlace = fetchedPlace.split(',').take(2).join(',').trim();
          }
          
          fetchedCity = city.toString().isNotEmpty ? city.toString() : state.toString();
          fetchedPincode = postcode.toString();
        } else {
          fetchedPlace = data['display_name'] ?? 'Selected Location';
          if (fetchedPlace.length > 50) {
            fetchedPlace = fetchedPlace.split(',').take(2).join(',').trim();
          }
        }
      }

      setState(() {
        _selectedAddressLine = fetchedPlace.isNotEmpty ? fetchedPlace : 'Selected Location';
        _selectedCity = fetchedCity;
        _selectedPincode = fetchedPincode;
        
        _areaController.text = _selectedAddressLine;
        _cityController.text = fetchedCity;
        _pincodeController.text = fetchedPincode;
        
        _isLocating = false;
      });

    } catch (e) {
      debugPrint('Error reverse geocoding: $e');
      setState(() {
        _isLocating = false;
      });
    }
  }

  Future<void> _locateUser() async {
    _debounceTimer?.cancel(); // Cancel any pending debounces
    
    setState(() {
      _isLocating = true;
    });

    try {
      // 1. Check if location services are enabled
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        setState(() {
          _isLocating = false;
        });
        if (!mounted) return;
        _showLocationServiceDisabledDialog();
        return;
      }

      // 2. Check permission status
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          setState(() {
            _isLocating = false;
          });
          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Location permission denied.'),
              behavior: SnackBarBehavior.floating,
            ),
          );
          return;
        }
      }

      if (permission == LocationPermission.deniedForever) {
        setState(() {
          _isLocating = false;
        });
        if (!mounted) return;
        _showPermissionPermanentlyDeniedDialog();
        return;
      }

      // 3. Fetch current position using best accuracy for accurate result
      Position position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.best,
      );

      final userLatLng = LatLng(position.latitude, position.longitude);

      setState(() {
        _currentCenter = userLatLng;
      });

      // Animate map camera to the user's location
      _mapController.flyTo(
        userLatLng,
        zoom: 15.0,
        duration: const Duration(milliseconds: 800),
      );

      // Instantly run reverse geocode for fast/accurate update
      await _reverseGeocode(userLatLng);

    } catch (e) {
      setState(() {
        _isLocating = false;
      });
      debugPrint('Error locating user: $e');
    }
  }

  void _showLocationServiceDisabledDialog() {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          backgroundColor: const Color(0xFF2C2C2E),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: Text(
            'Location Services Disabled',
            style: AppTypography.title(Colors.white).copyWith(fontWeight: FontWeight.bold),
          ),
          content: Text(
            'GPS/Location services are turned off on your device. Please enable them to fetch your current location.',
            style: AppTypography.bodyMedium(Colors.white70),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text(
                'Cancel',
                style: AppTypography.labelLarge(Colors.white54),
              ),
            ),
            ElevatedButton(
              onPressed: () {
                Navigator.pop(context);
                Geolocator.openLocationSettings();
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              child: Text(
                'Open Settings',
                style: AppTypography.labelLarge(Colors.white).copyWith(fontWeight: FontWeight.bold),
              ),
            ),
          ],
        );
      },
    );
  }

  void _showPermissionPermanentlyDeniedDialog() {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          backgroundColor: const Color(0xFF2C2C2E),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: Text(
            'Permission Permanently Denied',
            style: AppTypography.title(Colors.white).copyWith(fontWeight: FontWeight.bold),
          ),
          content: Text(
            'Location permission is permanently denied in settings. Please enable it in Settings.',
            style: AppTypography.bodyMedium(Colors.white70),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text(
                'Cancel',
                style: AppTypography.labelLarge(Colors.white54),
              ),
            ),
            ElevatedButton(
              onPressed: () {
                Navigator.pop(context);
                Geolocator.openAppSettings();
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              child: Text(
                'Open Settings',
                style: AppTypography.labelLarge(Colors.white).copyWith(fontWeight: FontWeight.bold),
              ),
            ),
          ],
        );
      },
    );
  }

  void _showStyleSelectionDialog() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    
    final styles = [
      {'name': 'Normal (Colourful)', 'value': MapcnStyle.normal, 'icon': Icons.map_rounded},
      {'name': 'Sunset (Warm)', 'value': MapcnStyle.sunset, 'icon': Icons.wb_sunny_rounded},
      {'name': 'Ocean (Blue)', 'value': MapcnStyle.ocean, 'icon': Icons.water_drop_rounded},
      {'name': 'Midnight (Dark)', 'value': MapcnStyle.midnight, 'icon': Icons.dark_mode_rounded},
      {'name': 'Emerald (Forest)', 'value': MapcnStyle.emerald, 'icon': Icons.forest_rounded},
      {'name': 'Sepia (Classic)', 'value': MapcnStyle.sepia, 'icon': Icons.camera_roll_rounded},
      {'name': 'Dark (AMOLED)', 'value': MapcnStyle.dark, 'icon': Icons.opacity_rounded},
    ];

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1C1C1E) : Colors.white,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: isDark ? Colors.white24 : Colors.black12,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'Select Map Theme',
                style: AppTypography.h2(
                  isDark ? Colors.white : AppColors.textPrimary,
                ).copyWith(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 16),
              Flexible(
                child: ListView.builder(
                  shrinkWrap: true,
                  physics: const BouncingScrollPhysics(),
                  itemCount: styles.length,
                  itemBuilder: (context, index) {
                    final item = styles[index];
                    final styleValue = item['value'] as MapcnStyle;
                    final isSelected = _currentMapStyle == styleValue;

                    return ListTile(
                      onTap: () {
                        setState(() {
                          _currentMapStyle = styleValue;
                        });
                        Navigator.pop(context);
                      },
                      leading: Icon(
                        item['icon'] as IconData,
                        color: isSelected ? AppColors.primary : (isDark ? Colors.white70 : Colors.black54),
                      ),
                      title: Text(
                        item['name'] as String,
                        style: AppTypography.bodyMedium(
                          isDark ? Colors.white : AppColors.textPrimary,
                        ).copyWith(
                          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                          color: isSelected ? AppColors.primary : (isDark ? Colors.white : AppColors.textPrimary),
                        ),
                      ),
                      trailing: isSelected
                          ? const Icon(Icons.check_circle_rounded, color: AppColors.primary)
                          : null,
                    );
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppColors.backgroundDark : AppColors.background,
      body: Stack(
        children: [
          // The Premium mapcn map widget
          Positioned.fill(
            child: GestureDetector(
              behavior: HitTestBehavior.translucent,
              onTapUp: _onMapTapped,
              child: Mapcn(
                controller: _mapController,
                initialCenter: _currentCenter,
                initialZoom: 14,
                style: _currentMapStyle,
                accentColor: AppColors.primary,
                onCameraMove: (camera, hasGesture) {
                  if (hasGesture) {
                    _onMapCameraMove(camera.center);
                  }
                },
                markerConfig: MarkerConfig(
                  style: MarkerStyle.pulse,
                  coreRadius: 8,
                  pulseRadius: 35,
                  glowIntensity: 0.35,
                  showShadow: true,
                ),
                points: [
                  _currentCenter,
                ],
              ),
            ),
          ),

          // Header Search Bar + Back button
          Positioned(
            top: MediaQuery.of(context).padding.top + 16,
            left: 20,
            right: 20,
            child: Row(
              children: [
                // Circular back button
                GestureDetector(
                  onTap: () => context.pop(),
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF1C1C1E) : Colors.white,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.08),
                          blurRadius: 15,
                        )
                      ],
                    ),
                    child: Icon(
                      Icons.arrow_back_ios_new_rounded,
                      size: 16,
                      color: isDark ? Colors.white : AppColors.textPrimary,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                
                // Glassmorphic Search box
                Expanded(
                  child: GlassCard(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    height: 52,
                    borderRadius: 26,
                    color: isDark ? Colors.black.withOpacity(0.4) : Colors.white.withOpacity(0.85),
                    borderColor: isDark ? Colors.white10 : Colors.black.withOpacity(0.06),
                    child: Row(
                      children: [
                        Icon(
                          Icons.search_rounded,
                          color: isDark ? Colors.white54 : Colors.black38,
                          size: 20,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: TextField(
                            controller: _searchController,
                            style: AppTypography.bodyMedium(
                              isDark ? Colors.white : AppColors.textPrimary,
                            ),
                            decoration: InputDecoration(
                              hintText: 'Search landmark or street...',
                              hintStyle: AppTypography.bodyMedium(
                                isDark ? Colors.white30 : Colors.black38,
                              ),
                              border: InputBorder.none,
                            ),
                            textInputAction: TextInputAction.search,
                            onSubmitted: _onSearchQuery,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Bottom Glass Card for address details configuration
          Positioned(
            bottom: 24,
            left: 20,
            right: 20,
            child: GlassCard(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              borderRadius: 30,
              color: isDark ? const Color(0xFF1C1C1E).withOpacity(0.9) : Colors.white.withOpacity(0.92),
              borderColor: isDark ? Colors.white10 : Colors.black.withOpacity(0.05),
              child: ConstrainedBox(
                constraints: BoxConstraints(
                  maxHeight: MediaQuery.of(context).size.height * 0.42,
                ),
                child: SingleChildScrollView(
                  physics: const BouncingScrollPhysics(),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: AppColors.primary.withOpacity(0.12),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(
                              Icons.location_on_rounded,
                              color: AppColors.primary,
                              size: 20,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      'Selected Location',
                                      style: AppTypography.labelSmall(
                                        isDark ? Colors.white54 : Colors.black45,
                                      ),
                                    ),
                                    GestureDetector(
                                      onTap: _locateUser,
                                      child: Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          const Icon(
                                            Icons.my_location_rounded,
                                            color: AppColors.primary,
                                            size: 14,
                                          ),
                                          const SizedBox(width: 4),
                                          Text(
                                            'Locate Me',
                                            style: AppTypography.labelSmall(AppColors.primary).copyWith(
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  _selectedAddressLine.isEmpty 
                                      ? 'Move map, search, or tap Locate Me' 
                                      : _selectedAddressLine,
                                  style: AppTypography.labelLarge(
                                    isDark ? Colors.white : AppColors.textPrimary,
                                  ).copyWith(height: 1.2),
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      
                      // Flat / House details input
                      TextField(
                        controller: _houseDetailsController,
                        style: AppTypography.bodyMedium(
                          isDark ? Colors.white : AppColors.textPrimary,
                        ),
                        decoration: InputDecoration(
                          labelText: 'Flat / House No. / Building Name',
                          labelStyle: AppTypography.bodySmall(
                            isDark ? Colors.white54 : Colors.black45,
                          ),
                          floatingLabelBehavior: FloatingLabelBehavior.always,
                          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(14),
                            borderSide: BorderSide(
                              color: isDark ? Colors.white24 : AppColors.divider,
                            ),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(14),
                            borderSide: BorderSide(
                              color: isDark ? Colors.white10 : AppColors.divider,
                            ),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(14),
                            borderSide: const BorderSide(color: AppColors.primary),
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      
                      // Street / Area / Landmark input
                      TextField(
                        controller: _areaController,
                        style: AppTypography.bodyMedium(
                          isDark ? Colors.white : AppColors.textPrimary,
                        ),
                        decoration: InputDecoration(
                          labelText: 'Street / Area / Landmark',
                          labelStyle: AppTypography.bodySmall(
                            isDark ? Colors.white54 : Colors.black45,
                          ),
                          floatingLabelBehavior: FloatingLabelBehavior.always,
                          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(14),
                            borderSide: BorderSide(
                              color: isDark ? Colors.white24 : AppColors.divider,
                            ),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(14),
                            borderSide: BorderSide(
                              color: isDark ? Colors.white10 : AppColors.divider,
                            ),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(14),
                            borderSide: const BorderSide(color: AppColors.primary),
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),

                      // City and Pincode row
                      Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: _cityController,
                              style: AppTypography.bodyMedium(
                                isDark ? Colors.white : AppColors.textPrimary,
                              ),
                              decoration: InputDecoration(
                                labelText: 'City',
                                labelStyle: AppTypography.bodySmall(
                                  isDark ? Colors.white54 : Colors.black45,
                                ),
                                floatingLabelBehavior: FloatingLabelBehavior.always,
                                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(14),
                                  borderSide: BorderSide(
                                    color: isDark ? Colors.white24 : AppColors.divider,
                                  ),
                                ),
                                enabledBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(14),
                                  borderSide: BorderSide(
                                    color: isDark ? Colors.white10 : AppColors.divider,
                                  ),
                                ),
                                focusedBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(14),
                                  borderSide: const BorderSide(color: AppColors.primary),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: TextField(
                              controller: _pincodeController,
                              style: AppTypography.bodyMedium(
                                isDark ? Colors.white : AppColors.textPrimary,
                              ),
                              decoration: InputDecoration(
                                labelText: 'Pincode',
                                labelStyle: AppTypography.bodySmall(
                                  isDark ? Colors.white54 : Colors.black45,
                                ),
                                floatingLabelBehavior: FloatingLabelBehavior.always,
                                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(14),
                                  borderSide: BorderSide(
                                    color: isDark ? Colors.white24 : AppColors.divider,
                                  ),
                                ),
                                enabledBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(14),
                                  borderSide: BorderSide(
                                    color: isDark ? Colors.white10 : AppColors.divider,
                                  ),
                                ),
                                focusedBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(14),
                                  borderSide: const BorderSide(color: AppColors.primary),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      
                      // Address Tag Selector (Home / Work / Other)
                      Row(
                        children: [
                          Text(
                            'Tag As: ',
                            style: AppTypography.labelMedium(
                              isDark ? Colors.white70 : AppColors.textPrimary,
                            ),
                          ),
                          const SizedBox(width: 12),
                          ...['Home', 'Work', 'Other'].map((tag) {
                            final isSelected = _addressTag == tag;
                            return Padding(
                              padding: const EdgeInsets.only(right: 8.0),
                              child: InkWell(
                                onTap: () => setState(() => _addressTag = tag),
                                borderRadius: BorderRadius.circular(12),
                                child: AnimatedContainer(
                                  duration: const Duration(milliseconds: 200),
                                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                                  decoration: BoxDecoration(
                                    color: isSelected 
                                        ? AppColors.primary 
                                        : (isDark ? Colors.white.withOpacity(0.04) : Colors.black.withOpacity(0.03)),
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(
                                      color: isSelected 
                                          ? AppColors.primary 
                                          : (isDark ? Colors.white10 : Colors.black.withOpacity(0.05)),
                                    ),
                                  ),
                                  child: Text(
                                    tag,
                                    style: AppTypography.labelSmall(
                                      isSelected ? Colors.white : (isDark ? Colors.white70 : AppColors.textPrimary),
                                    ).copyWith(fontWeight: FontWeight.bold),
                                  ),
                                ),
                              ),
                            );
                          }),
                        ],
                      ),
                      const SizedBox(height: 16),
                      
                      // Confirm button
                      PrimaryButton(
                        text: 'Confirm Location & Proceed',
                        onPressed: _saveLocation,
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
          
          // Floating Map Style/Theme Button
          Positioned(
            bottom: MediaQuery.of(context).size.height * 0.42 + 96,
            right: 20,
            child: FloatingActionButton(
              onPressed: _showStyleSelectionDialog,
              mini: true,
              backgroundColor: isDark ? const Color(0xFF1C1C1E) : Colors.white,
              foregroundColor: AppColors.primary,
              elevation: 4,
              child: const Icon(Icons.layers_rounded, size: 20),
            ),
          ),
          
          // Floating Current Location Button
          Positioned(
            bottom: MediaQuery.of(context).size.height * 0.42 + 42,
            right: 20,
            child: FloatingActionButton(
              onPressed: _locateUser,
              mini: true,
              backgroundColor: isDark ? const Color(0xFF1C1C1E) : Colors.white,
              foregroundColor: AppColors.primary,
              elevation: 4,
              child: const Icon(Icons.my_location_rounded, size: 20),
            ),
          ),

          // Locating HUD Loader
          if (_isLocating)
            Container(
              color: Colors.black45,
              child: Center(
                child: GlassCard(
                  width: 140,
                  height: 140,
                  color: isDark ? const Color(0xFF1C1C1E).withOpacity(0.9) : Colors.white.withOpacity(0.9),
                  borderColor: AppColors.primary.withOpacity(0.2),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const CircularProgressIndicator(
                        color: AppColors.primary,
                        strokeWidth: 3.5,
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'Locating you...',
                        style: AppTypography.bodySmall(
                          isDark ? Colors.white70 : AppColors.textPrimary,
                        ).copyWith(fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
