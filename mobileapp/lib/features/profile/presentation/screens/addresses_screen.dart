import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/constants/app_radius.dart';
import 'package:freshcart/core/error/api_exception.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/core/widgets/app_bottom_sheet.dart';
import 'package:freshcart/core/widgets/app_modal.dart';
import 'package:freshcart/core/widgets/app_scaffold.dart';
import 'package:freshcart/core/widgets/app_text_field.dart';
import 'package:freshcart/core/widgets/app_toast.dart';
import 'package:freshcart/core/widgets/buttons.dart';
import 'package:freshcart/core/widgets/feedback_states.dart';
import 'package:freshcart/core/widgets/loading_overlay.dart';
import 'package:freshcart/features/authentication/presentation/controllers/auth_controller.dart';

class AddressesScreen extends ConsumerStatefulWidget {
  const AddressesScreen({super.key});

  @override
  ConsumerState<AddressesScreen> createState() => _AddressesScreenState();
}

class _AddressesScreenState extends ConsumerState<AddressesScreen> {
  bool _busy = false;

  Future<void> _addFlow() async {
    final result = await AppBottomSheet.show<Map<String, dynamic>>(
      context,
      title: 'Add address',
      showClose: true,
      child: const _AddressForm(),
    );
    if (result == null) return;
    setState(() => _busy = true);
    try {
      await ref.read(authProvider.notifier).addAddressRemote(result);
      if (mounted) AppToast.success('Address saved');
    } on ApiException catch (e) {
      if (mounted) AppToast.error(e.message);
    } catch (_) {
      if (mounted) AppToast.error('Could not save the address');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _delete(Map<String, dynamic> addr) async {
    final ok = await AppModal.confirm(
      context,
      title: 'Delete address?',
      message: (addr['addressLine'] ?? '').toString(),
      confirmLabel: 'Delete',
      destructive: true,
    );
    if (!ok) return;
    setState(() => _busy = true);
    try {
      await ref.read(authProvider.notifier).removeAddress(addr['id'] as String);
      if (mounted) AppToast.info('Address removed');
    } on ApiException catch (e) {
      if (mounted) AppToast.error(e.message);
    } catch (_) {
      if (mounted) AppToast.error('Could not remove the address');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final auth = ref.watch(authProvider);
    final addresses = auth.user?.addresses ?? const [];
    final selectedId = auth.user?.selectedAddress?['id'];

    return LoadingOverlay(
      isLoading: _busy,
      child: AppScaffold(
        title: 'Saved addresses',
        bottomNavigationBar: Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
          child: SafeArea(
            top: false,
            child: PrimaryButton(text: 'Add new address', onPressed: _addFlow),
          ),
        ),
        body: addresses.isEmpty
            ? EmptyState(
                icon: Icons.location_off_outlined,
                title: 'No saved addresses',
                description: 'Add a delivery address to check out faster next time.',
                actionText: 'Add address',
                onAction: _addFlow,
              )
            : ListView.separated(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
                itemCount: addresses.length,
                separatorBuilder: (_, _) => const SizedBox(height: 12),
                itemBuilder: (context, i) {
                  final addr = Map<String, dynamic>.from(addresses[i]);
                  final id = addr['id'] as String;
                  final selected = selectedId == id;
                  final label = (addr['name'] ?? addr['label'] ?? 'Address').toString();
                  return GestureDetector(
                    onTap: () {
                      ref.read(authProvider.notifier).selectAddress(id);
                      AppToast.success('Delivering to "$label"');
                    },
                    child: Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: selected
                            ? AppColors.primary.withOpacity(0.08)
                            : (isDark ? AppColors.surfaceDark : AppColors.surface),
                        borderRadius: AppRadius.brMd,
                        border: Border.all(
                          color: selected
                              ? AppColors.primary
                              : (isDark ? AppColors.dividerDark : AppColors.divider),
                        ),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            label.toLowerCase() == 'work'
                                ? Icons.work_outline_rounded
                                : label.toLowerCase() == 'home'
                                    ? Icons.home_outlined
                                    : Icons.location_on_outlined,
                            color: selected ? AppColors.primary : AppColors.textSecondary,
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Text(label, style: AppTypography.labelLarge(
                                      isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                                    )),
                                    if (selected) ...[
                                      const SizedBox(width: 6),
                                      Text('· Selected',
                                          style: AppTypography.labelSmall(AppColors.primaryText)),
                                    ],
                                  ],
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  (addr['addressLine'] ?? '').toString(),
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                  style: AppTypography.bodySmall(
                                    isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.delete_outline_rounded, color: AppColors.error, size: 20),
                            onPressed: () => _delete(addr),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
      ),
    );
  }
}

class _AddressForm extends StatefulWidget {
  const _AddressForm();

  @override
  State<_AddressForm> createState() => _AddressFormState();
}

class _AddressFormState extends State<_AddressForm> {
  final _formKey = GlobalKey<FormState>();
  final _house = TextEditingController();
  final _line = TextEditingController();
  final _city = TextEditingController();
  final _pin = TextEditingController();
  String _label = 'Home';

  @override
  void dispose() {
    _house.dispose();
    _line.dispose();
    _city.dispose();
    _pin.dispose();
    super.dispose();
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) return;
    final house = _house.text.trim();
    final line = _line.text.trim();
    final city = _city.text.trim();
    final full = [
      if (house.isNotEmpty) house,
      line,
      if (city.isNotEmpty) city,
    ].join(', ');
    Navigator.of(context).pop(<String, dynamic>{
      'label': _label,
      'name': _label,
      'houseNo': house,
      'area': line,
      'fullAddress': full,
      'pincode': _pin.text.trim(),
    });
  }

  @override
  Widget build(BuildContext context) {
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Wrap(
            spacing: 8,
            children: ['Home', 'Work', 'Other'].map((l) {
              final sel = _label == l;
              return ChoiceChip(
                label: Text(l),
                selected: sel,
                showCheckmark: false,
                selectedColor: AppColors.primary,
                labelStyle: AppTypography.labelMedium(sel ? Colors.white : AppColors.textPrimary),
                onSelected: (_) => setState(() => _label = l),
              );
            }).toList(),
          ),
          const SizedBox(height: 16),
          AppTextField(
            controller: _house,
            label: 'House / flat / floor',
            hintText: 'e.g. Flat 402, Sunrise Apartments',
            textInputAction: TextInputAction.next,
          ),
          const SizedBox(height: 12),
          AppTextField(
            controller: _line,
            label: 'Area / street / landmark',
            hintText: 'e.g. 12th Main, Indiranagar',
            textInputAction: TextInputAction.next,
            validator: (v) => (v == null || v.trim().length < 4) ? 'Enter the area' : null,
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: AppTextField(
                  controller: _city,
                  label: 'City',
                  textInputAction: TextInputAction.next,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: AppTextField(
                  controller: _pin,
                  label: 'Pincode',
                  keyboardType: TextInputType.number,
                  maxLength: 6,
                  validator: (v) =>
                      (v != null && v.trim().length == 6) ? null : '6-digit pincode',
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          PrimaryButton(text: 'Save address', onPressed: _submit),
        ],
      ),
    );
  }
}
