import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';
import 'package:mapcn_flutter/mapcn_flutter.dart';
import 'package:geolocator/geolocator.dart';
import 'package:dio/dio.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/constants/app_radius.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/core/services/location_permission.dart';
import 'package:freshcart/core/widgets/app_toast.dart';
import 'package:freshcart/features/authentication/presentation/controllers/auth_controller.dart';

class LocationSelectScreen extends ConsumerStatefulWidget {
  const LocationSelectScreen({super.key});

  @override
  ConsumerState<LocationSelectScreen> createState() => _LocationSelectScreenState();
}

class _LocationSelectScreenState extends ConsumerState<LocationSelectScreen> with TickerProviderStateMixin {
  late final MapcnController _mapController;
  final TextEditingController _searchController = TextEditingController();
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _phoneController = TextEditingController();
  final TextEditingController _houseNoController = TextEditingController();
  final TextEditingController _landmarkController = TextEditingController();

  LatLng _currentCenter = const LatLng(17.4842, 78.3888);
  String _areaName = 'KPHB COLONY';
  String _pincode = '500072';
  String _fullAddressText = 'Balaji Nagar, KPHB Colony, Kukatpally mandal, Hyderabad, Telangana, 500072, India';
  String _selectedLabel = 'Home';
  String? _nameError;

  LocationPermState? _permState;
  bool _promptedOnce = false;

  @override
  void initState() {
    super.initState();
    _mapController = MapcnController(vsync: this);
    final user = ref.read(authProvider).user;
    _nameController.text = user?.name ?? '';
    _phoneController.text = user?.phone ?? '';
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
    _nameController.dispose();
    _phoneController.dispose();
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
    final name = _nameController.text.trim();
    final houseNo = _houseNoController.text.trim();
    if (name.isEmpty || houseNo.isEmpty) {
      setState(() => _nameError = name.isEmpty ? 'Enter your name' : null);
      AppToast.error(houseNo.isEmpty
          ? 'Please enter your house / flat number.'
          : 'Please enter your name.');
      return;
    }
    setState(() => _nameError = null);

    final landmark = _landmarkController.text.trim();
    final finalFullAddress =
        '${houseNo.isNotEmpty ? '$houseNo, ' : ''}${landmark.isNotEmpty ? '$landmark, ' : ''}$_fullAddressText';

    final auth = ref.read(authProvider.notifier);
    auth.grantLocationPermission();

    final body = {
      'label': _selectedLabel,
      'name': _selectedLabel,
      'receiverName': name,
      'receiverPhone': _phoneController.text.trim(),
      'houseNo': houseNo,
      'landmark': landmark,
      'area': _areaName,
      'fullAddress': finalFullAddress,
      'pincode': _pincode,
      'lat': _currentCenter.latitude,
      'lng': _currentCenter.longitude,
    };

    setState(() => _saving = true);
    // A guest has no account for `POST /customers/me/addresses` to attach
    // to — it would always 401. Save locally only, skip the doomed call.
    if (ref.read(authProvider).isAuthenticated) {
      try {
        // Persist via the real API (POST /customers/me/addresses).
        await auth.addAddressRemote(body);
      } catch (_) {
        // First-run must not be blocked by a transient network error — keep
        // it locally and let the next profile refresh reconcile.
        auth.addAddress({
          'id': 'addr_${DateTime.now().millisecondsSinceEpoch}',
          ...body,
          'addressLine': finalFullAddress,
          'isDefault': true,
        });
      }
    } else {
      auth.addAddress({
        'id': 'addr_${DateTime.now().millisecondsSinceEpoch}',
        ...body,
        'addressLine': finalFullAddress,
        'isDefault': true,
      });
    }
    if (mounted) setState(() => _saving = false);

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
  ///
  /// Guarded with `mounted` because this can be reached twice in a row (the
  /// AppBar back button plus a saved-address tap, or a fast double-tap) —
  /// popping an already-popped route throws a go_router assertion
  /// (`'index != -1'`) since its match is no longer on the stack.
  void _leave() {
    if (!mounted) return;
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
        borderRadius: AppRadius.brSm,
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

  // ---- shared field chrome (mirrors the web storefront's address form) ----

  Widget _fieldLabel(BuildContext context, IconData icon, String text, bool isDark) {
    final sub = isDark ? AppColors.textSecondaryDark : AppColors.textSecondary;
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 13, color: sub),
          const SizedBox(width: 4),
          Text(
            text,
            style: AppTypography.labelSmall(sub).copyWith(letterSpacing: 0.6, fontWeight: FontWeight.w800),
          ),
        ],
      ),
    );
  }

  Widget _field({
    required TextEditingController controller,
    required String hint,
    bool isDark = false,
    TextInputType? keyboardType,
    String? errorText,
  }) {
    return TextField(
      controller: controller,
      keyboardType: keyboardType,
      style: AppTypography.bodySmall(isDark ? Colors.white : AppColors.textPrimary).copyWith(fontWeight: FontWeight.w700),
      decoration: InputDecoration(
        hintText: hint,
        errorText: errorText,
        hintStyle: AppTypography.bodySmall(isDark ? AppColors.textSecondaryDark : AppColors.textTertiary),
        filled: true,
        fillColor: isDark ? Colors.white.withOpacity(0.05) : AppColors.background,
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        border: OutlineInputBorder(
          borderRadius: AppRadius.brSm,
          borderSide: BorderSide(color: isDark ? AppColors.dividerDark : AppColors.divider),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: AppRadius.brSm,
          borderSide: BorderSide(color: isDark ? AppColors.dividerDark : AppColors.divider),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: AppRadius.brSm,
          borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final authState = ref.watch(authProvider);
    final savedAddresses = authState.user?.addresses ?? [];
    final sub = isDark ? AppColors.textSecondaryDark : AppColors.textSecondary;
    final divider = isDark ? AppColors.dividerDark : AppColors.divider;

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
          child: Container(height: 1, color: divider),
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

                // Search bar + Locate Me, in an outer surface card like web.
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.surfaceDark : AppColors.surface,
                    borderRadius: AppRadius.brMd,
                    border: Border.all(color: divider),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Container(
                          height: 44,
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          decoration: BoxDecoration(
                            color: isDark ? Colors.white.withOpacity(0.05) : AppColors.background,
                            borderRadius: AppRadius.brSm,
                            border: Border.all(color: divider),
                          ),
                          child: Row(
                            children: [
                              Icon(Icons.search_rounded, color: sub, size: 18),
                              const SizedBox(width: 8),
                              Expanded(
                                child: TextField(
                                  controller: _searchController,
                                  style: AppTypography.bodySmall(isDark ? Colors.white : AppColors.textPrimary)
                                      .copyWith(fontWeight: FontWeight.w600),
                                  decoration: InputDecoration(
                                    hintText: 'Type area, landmark or street',
                                    hintStyle: AppTypography.bodySmall(sub),
                                    border: InputBorder.none,
                                    isDense: true,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      SizedBox(
                        height: 44,
                        child: ElevatedButton.icon(
                          onPressed: _locateUser,
                          icon: const Icon(Icons.navigation_rounded, size: 15, color: Colors.white),
                          label: Text('Locate Me', style: AppTypography.labelSmall(Colors.white).copyWith(fontWeight: FontWeight.w800)),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            padding: const EdgeInsets.symmetric(horizontal: 14),
                            shape: RoundedRectangleBorder(borderRadius: AppRadius.brSm),
                            elevation: 0,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // Interactive map — real draggable map (vs. web's static-iframe
                // + tap-to-pin hack), so it keeps its own live-position marker
                // instead of a fixed overlay pin.
                Container(
                  height: 224,
                  decoration: BoxDecoration(
                    borderRadius: AppRadius.brMd,
                    border: Border.all(color: divider),
                  ),
                  child: ClipRRect(
                    borderRadius: AppRadius.brMd,
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
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              color: (isDark ? AppColors.surfaceDark : AppColors.surface).withOpacity(0.95),
                              borderRadius: AppRadius.brPill,
                              border: Border.all(color: divider),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.info_outline_rounded, size: 13, color: sub),
                                const SizedBox(width: 6),
                                Text(
                                  'Drag map to pin location',
                                  style: AppTypography.labelSmall(sub).copyWith(fontWeight: FontWeight.w700),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                // Address details card — plain surface card like web (no
                // green tint), receiver name/phone, house/landmark, label.
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.surfaceDark : AppColors.surface,
                    borderRadius: AppRadius.brXl,
                    border: Border.all(color: divider),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            width: 32,
                            height: 32,
                            margin: const EdgeInsets.only(top: 2),
                            decoration: BoxDecoration(
                              color: AppColors.primary.withOpacity(0.1),
                              borderRadius: AppRadius.brSm,
                            ),
                            child: const Icon(Icons.location_on_rounded, color: AppColors.primaryText, size: 18),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Expanded(
                                      child: Text(
                                        _areaName,
                                        style: AppTypography.labelSmall(AppColors.primaryText)
                                            .copyWith(fontWeight: FontWeight.w900, letterSpacing: 0.6),
                                      ),
                                    ),
                                    if (_pincode.isNotEmpty)
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: isDark ? Colors.white.withOpacity(0.05) : AppColors.background,
                                          borderRadius: AppRadius.brXs,
                                          border: Border.all(color: divider),
                                        ),
                                        child: Text(
                                          'PIN: $_pincode',
                                          style: AppTypography.labelSmall(sub).copyWith(fontWeight: FontWeight.w700),
                                        ),
                                      ),
                                  ],
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  _fullAddressText,
                                  style: AppTypography.bodySmall(isDark ? AppColors.textPrimaryDark : AppColors.textPrimary)
                                      .copyWith(fontWeight: FontWeight.w600, height: 1.35),
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      Divider(height: 1, color: divider),
                      const SizedBox(height: 16),

                      _fieldLabel(context, Icons.person_outline_rounded, 'YOUR NAME *', isDark),
                      _field(controller: _nameController, hint: 'e.g. Full name', isDark: isDark, errorText: _nameError),
                      const SizedBox(height: 14),

                      _fieldLabel(context, Icons.call_outlined, 'MOBILE NUMBER', isDark),
                      _field(
                        controller: _phoneController,
                        hint: 'e.g. 98765 43210',
                        isDark: isDark,
                        keyboardType: TextInputType.phone,
                      ),
                      const SizedBox(height: 14),

                      _fieldLabel(context, Icons.home_work_outlined, 'HOUSE / FLAT / DOOR NO *', isDark),
                      _field(controller: _houseNoController, hint: 'e.g. Flat 402, Sunshine Apts', isDark: isDark),
                      const SizedBox(height: 14),

                      _fieldLabel(context, Icons.signpost_outlined, 'LANDMARK (OPTIONAL)', isDark),
                      _field(controller: _landmarkController, hint: 'e.g. Near Metro Station', isDark: isDark),
                      const SizedBox(height: 16),
                      Divider(height: 1, color: divider),
                      const SizedBox(height: 14),

                      Row(
                        children: [
                          Text('SAVE AS', style: AppTypography.labelSmall(sub).copyWith(fontWeight: FontWeight.w800, letterSpacing: 0.6)),
                          const SizedBox(width: 10),
                          Expanded(
                            child: SingleChildScrollView(
                              scrollDirection: Axis.horizontal,
                              child: Row(
                                children: [
                                  for (final entry in const {
                                    'Home': Icons.home_rounded,
                                    'Work': Icons.work_rounded,
                                    'Other': Icons.label_rounded,
                                  }.entries)
                                    Padding(
                                      padding: const EdgeInsets.only(right: 8),
                                      child: _labelChip(entry.key, entry.value, isDark),
                                    ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 18),

                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          TextButton(
                            onPressed: _saving ? null : _leave,
                            child: Text(
                              'Cancel',
                              style: AppTypography.labelMedium(sub).copyWith(fontWeight: FontWeight.w800),
                            ),
                          ),
                          ElevatedButton.icon(
                            onPressed: _saving ? null : _confirmAndDeliver,
                            icon: _saving
                                ? const SizedBox(
                                    width: 14,
                                    height: 14,
                                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                  )
                                : const Icon(Icons.check_rounded, size: 18, color: Colors.white),
                            label: Text(
                              _saving ? 'Saving…' : 'Save & Deliver Here',
                              style: AppTypography.labelMedium(Colors.white).copyWith(fontWeight: FontWeight.w800),
                            ),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.primary,
                              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                              shape: RoundedRectangleBorder(borderRadius: AppRadius.brPill),
                              elevation: 0,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                if (savedAddresses.isNotEmpty) ...[
                  Text(
                    'SAVED ADDRESSES',
                    style: AppTypography.labelSmall(isDark ? AppColors.textTertiary : AppColors.textTertiary)
                        .copyWith(fontWeight: FontWeight.w800, letterSpacing: 0.8),
                  ),
                  const SizedBox(height: 8),
                  ...savedAddresses.map((addr) {
                    final tag = (addr['tag'] ?? addr['label'] ?? 'Home') as String;
                    final icon = tag == 'Home'
                        ? Icons.home_rounded
                        : (tag == 'Work' ? Icons.work_rounded : Icons.label_rounded);
                    final line = (addr['addressLine'] ?? '') as String;
                    final isSelected = authState.user?.selectedAddress?['id'] == addr['id'];

                    return Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      child: InkWell(
                        onTap: () {
                          ref.read(authProvider.notifier).selectAddress(addr['id'] as String);
                          _leave();
                        },
                        borderRadius: AppRadius.brMd,
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: isDark ? AppColors.surfaceDark : AppColors.surface,
                            borderRadius: AppRadius.brMd,
                            border: Border.all(color: isSelected ? AppColors.primaryText : divider),
                          ),
                          child: Row(
                            children: [
                              Container(
                                width: 36,
                                height: 36,
                                decoration: BoxDecoration(
                                  color: AppColors.primary.withOpacity(0.1),
                                  borderRadius: AppRadius.brSm,
                                ),
                                alignment: Alignment.center,
                                child: Icon(icon, size: 17, color: AppColors.primaryText),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(tag,
                                        style: AppTypography.bodySmall(isDark ? Colors.white : AppColors.textPrimary)
                                            .copyWith(fontWeight: FontWeight.w800)),
                                    const SizedBox(height: 2),
                                    Text(line,
                                        style: AppTypography.labelSmall(sub),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis),
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
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _labelChip(String label, IconData icon, bool isDark) {
    final isSelected = _selectedLabel == label;
    return ChoiceChip(
      avatar: Icon(icon, size: 14, color: isSelected ? Colors.white : (isDark ? Colors.white70 : AppColors.textSecondary)),
      label: Text(
        label,
        style: AppTypography.labelSmall(isSelected ? Colors.white : (isDark ? Colors.white70 : AppColors.textSecondary))
            .copyWith(fontWeight: FontWeight.w700),
      ),
      selected: isSelected,
      selectedColor: AppColors.primary,
      backgroundColor: isDark ? Colors.white.withOpacity(0.05) : AppColors.background,
      side: BorderSide(color: isSelected ? AppColors.primary : (isDark ? AppColors.dividerDark : AppColors.divider)),
      shape: RoundedRectangleBorder(borderRadius: AppRadius.brPill),
      onSelected: (_) => setState(() => _selectedLabel = label),
    );
  }
}
