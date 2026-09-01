import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';
import 'package:mapcn_flutter/mapcn_flutter.dart';
import 'package:geolocator/geolocator.dart';
import 'package:dio/dio.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/core/services/location_permission.dart';
import 'package:freshcart/core/widgets/app_toast.dart';
import 'package:freshcart/core/widgets/buttons.dart';
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

  LocationPermState? _permState;
  bool _promptedOnce = false;

  @override
  void initState() {
    super.initState();
    _mapController = MapcnController(vsync: this);
    // Ask for location permission as soon as the screen opens (post-login flow).
    WidgetsBinding.instance.addPostFrameCallback((_) => _ensurePermission(prompt: true));
  }

  Future<void> _ensurePermission({required bool prompt}) async {
    final doPrompt = prompt && !_promptedOnce;
    _promptedOnce = _promptedOnce || prompt;

    LocationPermState state;
    if (doPrompt) {
      if (!mounted) return;
      state = await LocationPermissionService.ensureWithUi(context);
    } else {
      state = await LocationPermissionService.check();
    }
    if (!mounted) return;
    setState(() => _permState = state);
    if (state.ok) {
      ref.read(authProvider.notifier).grantLocationPermission();
      _locateUser();
    }
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
      final perm = await LocationPermissionService.ensureWithUi(context);
      if (!mounted) return;
      setState(() => _permState = perm);
      if (!perm.ok) return;
      ref.read(authProvider.notifier).grantLocationPermission();

      Position position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.best,
      );

      final userLatLng = LatLng(position.latitude, position.longitude);
      setState(() {
        _currentCenter = userLatLng;
      });

      _mapController.flyTo(userLatLng, zoom: 15.0);
      await _reverseGeocode(userLatLng);
    } catch (_) {
      if (mounted) {
        AppToast.error("Couldn't get your location. Search or pick a spot on the map.");
      }
    }
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
    } catch (_) {
      // Non-fatal: the pin is still usable, we just couldn't name the area.
      if (mounted) {
        AppToast.info("Couldn't look up the address — you can still type it in.");
      }
    }
  }

  bool _saving = false;

  Future<void> _confirmAndDeliver() async {
    if (_saving) return;
    final houseNo = _houseNoController.text.trim();
    final landmark = _landmarkController.text.trim();
    final finalFullAddress =
        '${houseNo.isNotEmpty ? '$houseNo, ' : ''}${landmark.isNotEmpty ? '$landmark, ' : ''}$_fullAddressText';

    final auth = ref.read(authProvider.notifier);
    auth.grantLocationPermission();

    final body = {
      'label': _selectedLabel,
      'name': _selectedLabel,
      'houseNo': houseNo,
      'landmark': landmark,
      'area': _areaName,
      'fullAddress': finalFullAddress,
      'pincode': _pincode,
      'lat': _currentCenter.latitude,
      'lng': _currentCenter.longitude,
    };

    setState(() => _saving = true);
    try {
      // Persist via the real API (POST /customers/me/addresses).
      await auth.addAddressRemote(body);
    } catch (_) {
      // First-run must not be blocked by a transient network error — keep it
      // locally and let the next profile refresh reconcile.
      auth.addAddress({
        'id': 'addr_${DateTime.now().millisecondsSinceEpoch}',
        ...body,
        'addressLine': finalFullAddress,
        'isDefault': true,
      });
    } finally {
      if (mounted) setState(() => _saving = false);
    }

    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Delivering to $finalFullAddress'),
        behavior: SnackBarBehavior.floating,
        backgroundColor: AppColors.primary,
      ),
    );
    _leave();
  }

  /// This screen is opened both as a step in the sign-in flow (via `go`, no
  /// back stack) and later from inside the app (via `push`). Pop when we can,
  /// otherwise land on Home.
  void _leave() {
    if (context.canPop()) {
      context.pop();
    } else {
      context.go('/');
    }
  }

  Widget _permissionBanner(bool isDark) {
    final s = _permState!;
    final label = switch (s) {
      LocationPermState.serviceDisabled => 'Turn on GPS',
      LocationPermState.deniedForever => 'Open settings',
      _ => 'Allow',
    };
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.warning.withValues(alpha: isDark ? 0.14 : 0.10),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.warning.withValues(alpha: 0.4)),
      ),
      child: Row(
        children: [
          const Icon(Icons.location_off_rounded, size: 18, color: AppColors.warningText),
          const SizedBox(width: 10),
          Expanded(
            child: Text(s.message,
                style: AppTypography.bodySmall(isDark ? AppColors.textPrimaryDark : AppColors.textPrimary)),
          ),
          TextButton(onPressed: _retryPermission, child: Text(label)),
        ],
      ),
    );
  }

  Future<void> _retryPermission() async {
    final s = _permState;
    if (s == LocationPermState.deniedForever) {
      await LocationPermissionService.openAppSettings();
    } else if (s == LocationPermState.serviceDisabled) {
      await LocationPermissionService.openLocationSettings();
    } else {
      final r = await LocationPermissionService.request();
      if (!mounted) return;
      setState(() => _permState = r);
      if (r.ok) {
        ref.read(authProvider.notifier).grantLocationPermission();
        _locateUser();
      }
      return;
    }
    // returned from a settings screen — re-check silently
    await _ensurePermission(prompt: false);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final authState = ref.watch(authProvider);
    final savedAddresses = authState.user?.addresses ?? [];

    return Scaffold(
      backgroundColor: isDark ? AppColors.backgroundDark : AppColors.background,
      appBar: AppBar(
        backgroundColor: isDark ? AppColors.backgroundDark : AppColors.background,
        surfaceTintColor: Colors.transparent,
        scrolledUnderElevation: 0,
        elevation: 0,
        titleSpacing: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, size: 20),
          onPressed: _leave,
        ),
        title: Text(
          'Select delivery location',
          style: AppTypography.h3(isDark ? AppColors.textPrimaryDark : AppColors.textPrimary),
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(height: 1, color: isDark ? AppColors.dividerDark : AppColors.divider),
        ),
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: isDark ? AppColors.surfaceDark : AppColors.surface,
          border: Border(top: BorderSide(color: isDark ? AppColors.dividerDark : AppColors.divider)),
        ),
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 10),
        child: SafeArea(
          top: false,
          child: PrimaryButton(
            text: _saving ? 'Saving…' : 'Confirm & deliver here',
            isLoading: _saving,
            onPressed: _saving ? null : _confirmAndDeliver,
          ),
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
                if (_permState != null && !_permState!.ok) _permissionBanner(isDark),
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
                        backgroundColor: AppColors.primaryText,
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
                      Text('POPULAR:', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: isDark ? Colors.white38 : Colors.grey)),
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
                          accentColor: AppColors.primaryText,
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
                    border: Border.all(color: AppColors.primary.withOpacity(0.3)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: [
                              const Icon(Icons.location_on_rounded, color: AppColors.primaryText, size: 18),
                              const SizedBox(width: 6),
                              Text(
                                _areaName,
                                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.primaryText, letterSpacing: 0.5),
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
                          const Text('SAVE AS:', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Colors.grey)),
                          const SizedBox(width: 8),
                          ...['Home', 'Work', 'Other'].map((lbl) {
                            final isSelected = _selectedLabel == lbl;
                            final iconStr = lbl == 'Home' ? '🏠' : (lbl == 'Work' ? '💼' : '📍');
                            return Padding(
                              padding: const EdgeInsets.only(right: 6.0),
                              child: ChoiceChip(
                                label: Text('$iconStr $lbl', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: isSelected ? Colors.white : Colors.black87)),
                                selected: isSelected,
                                selectedColor: AppColors.primaryText,
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
                  Text('SAVED ADDRESSES', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: isDark ? Colors.white38 : Colors.grey, letterSpacing: 0.8)),
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
                          _leave();
                        },
                        borderRadius: BorderRadius.circular(16),
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: isDark ? Colors.white.withOpacity(0.04) : Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: isSelected ? AppColors.primaryText : (isDark ? Colors.white10 : Colors.black.withOpacity(0.06))),
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
                                const Icon(Icons.check_circle_rounded, color: AppColors.primaryText, size: 20),
                            ],
                          ),
                        ),
                      ),
                    );
                  }),
                  const SizedBox(height: 16),
                ],

                const SizedBox(height: 8),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
