import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/error/api_exception.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/core/widgets/app_scaffold.dart';
import 'package:freshcart/core/widgets/app_toast.dart';
import 'package:freshcart/core/widgets/buttons.dart';
import 'package:freshcart/core/widgets/feedback_states.dart';
import 'package:freshcart/core/widgets/smart_image.dart';
import 'package:freshcart/features/home/presentation/controllers/catalog_providers.dart' show apiServiceProvider;
import 'package:freshcart/features/orders/presentation/controllers/orders_controller.dart' show orderDetailProvider;
import 'package:freshcart/features/returns/data/return_models.dart';
import 'package:freshcart/features/returns/presentation/returns_providers.dart';
import 'package:freshcart/features/returns/presentation/widgets/order_returns_section.dart' show inr;

/// Raise a return or exchange for a delivered order. Two steps, same as the
/// web sheet: (1) type + items, (2) issue, description, photos, refund method.
class ReturnRequestScreen extends ConsumerStatefulWidget {
  final String orderId;
  const ReturnRequestScreen({super.key, required this.orderId});

  @override
  ConsumerState<ReturnRequestScreen> createState() => _ReturnRequestScreenState();
}

class _ReturnRequestScreenState extends ConsumerState<ReturnRequestScreen> {
  int _step = 1;
  String _type = 'return';
  final Map<String, int> _qty = {};
  String _reasonCode = '';
  final _comment = TextEditingController();
  final List<Uint8List> _photos = [];
  String? _refundMethod;
  bool _busy = false;

  @override
  void dispose() {
    _comment.dispose();
    super.dispose();
  }

  Future<void> _addPhoto(ImageSource source, int max) async {
    if (_photos.length >= max) return;
    try {
      final img = await ImagePicker().pickImage(source: source, imageQuality: 60, maxWidth: 1280);
      if (img == null) return;
      final bytes = await img.readAsBytes();
      if (mounted) setState(() => _photos.add(bytes));
    } catch (_) {
      AppToast.error('Could not open the camera. Check app permissions.');
    }
  }

  Future<void> _pickSource(int max) async {
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      showDragHandle: true,
      builder: (c) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.photo_camera_outlined),
              title: const Text('Take a photo'),
              onTap: () => Navigator.pop(c, ImageSource.camera),
            ),
            ListTile(
              leading: const Icon(Icons.photo_library_outlined),
              title: const Text('Choose from gallery'),
              onTap: () => Navigator.pop(c, ImageSource.gallery),
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
    if (source != null) await _addPhoto(source, max);
  }

  Future<void> _submit(OrderReturns data, List<ReturnableItem> picked) async {
    setState(() => _busy = true);
    try {
      await ref.read(apiServiceProvider).createReturn(
            widget.orderId,
            type: _type,
            items: [for (final i in picked) {'key': i.key, 'quantity': _qty[i.key]}],
            reasonCode: _reasonCode,
            comment: _comment.text,
            photos: [for (final p in _photos) 'data:image/jpeg;base64,${base64Encode(p)}'],
            refundMethod: _type == 'return' ? (_refundMethod ?? data.refundMethods.first) : null,
          );
      ref.invalidate(orderReturnsProvider(widget.orderId));
      ref.invalidate(orderDetailProvider(widget.orderId));
      AppToast.success(_type == 'return'
          ? 'Return requested — a partner will pick it up soon'
          : 'Exchange requested — a partner will bring your replacement');
      if (mounted) context.pop();
    } on ApiException catch (e) {
      AppToast.error(e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final dataAsync = ref.watch(orderReturnsProvider(widget.orderId));
    final configAsync = ref.watch(returnConfigProvider);

    return PopScope(
      canPop: _step == 1,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) setState(() => _step = 1);
      },
      child: AppScaffold(
        title: _step == 1 ? 'Return or exchange' : 'What went wrong?',
        body: dataAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => ErrorState(onRetry: () => ref.invalidate(orderReturnsProvider(widget.orderId))),
          data: (data) {
            if (!data.eligible) {
              return EmptyState(
                icon: Icons.assignment_return_outlined,
                title: 'Not available',
                description: data.reason.isEmpty ? 'This order can’t be returned right now.' : data.reason,
              );
            }
            final config = configAsync.valueOrNull;
            final items = data.items.where((i) => i.returnableQty > 0).toList();
            final picked = items.where((i) => (_qty[i.key] ?? 0) > 0).toList();
            final count = picked.fold<int>(0, (s, i) => s + (_qty[i.key] ?? 0));
            final refundTotal = picked.fold<num>(0, (s, i) => s + i.price * (_qty[i.key] ?? 0));
            final reasons = (config?.reasons ?? const <ReturnReason>[]).where((r) => r.types.contains(_type)).toList();
            final reason = reasons.where((r) => r.code == _reasonCode).firstOrNull;
            final commentMissing = (reason?.requiresComment ?? false) && _comment.text.trim().length < 5;
            final maxPhotos = config?.maxPhotos ?? 4;

            return Column(
              children: [
                _StepBar(step: _step, isDark: isDark),
                Expanded(
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
                    children: _step == 1
                        ? _stepOne(items, isDark)
                        : _stepTwo(data, reasons, reason, maxPhotos, refundTotal, isDark),
                  ),
                ),
                SafeArea(
                  top: false,
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                    child: _step == 1
                        ? PrimaryButton(
                            text: count == 0 ? 'Select at least one item' : 'Continue with $count item${count == 1 ? '' : 's'}',
                            onPressed: count == 0 ? null : () => setState(() => _step = 2),
                          )
                        : PrimaryButton(
                            text: 'Request ${_type == 'return' ? 'return' : 'exchange'} pickup',
                            isLoading: _busy,
                            onPressed: (_reasonCode.isEmpty || commentMissing || _busy) ? null : () => _submit(data, picked),
                          ),
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  List<Widget> _stepOne(List<ReturnableItem> items, bool isDark) {
    final primary = isDark ? AppColors.textPrimaryDark : AppColors.textPrimary;
    final secondary = isDark ? AppColors.textSecondaryDark : AppColors.textSecondary;
    return [
      Row(
        children: [
          Expanded(child: _TypeCard(
            selected: _type == 'return', icon: Icons.assignment_return_outlined, title: 'Return', subtitle: 'Get a refund', isDark: isDark,
            onTap: () => setState(() { _type = 'return'; _reasonCode = ''; }),
          )),
          const SizedBox(width: 10),
          Expanded(child: _TypeCard(
            selected: _type == 'exchange', icon: Icons.swap_horiz_rounded, title: 'Exchange', subtitle: 'Get a replacement', isDark: isDark,
            onTap: () => setState(() { _type = 'exchange'; _reasonCode = ''; }),
          )),
        ],
      ),
      const SizedBox(height: 20),
      Text('SELECT ITEMS', style: _label(primary)),
      const SizedBox(height: 8),
      Container(
        decoration: BoxDecoration(
          color: isDark ? AppColors.surfaceDark : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: isDark ? AppColors.dividerDark : const Color(0xFFE5E7EB)),
        ),
        child: Column(
          children: [
            for (var idx = 0; idx < items.length; idx++) ...[
              if (idx > 0) Divider(height: 1, color: isDark ? AppColors.dividerDark : const Color(0xFFF3F4F6)),
              Padding(
                padding: const EdgeInsets.all(12),
                child: Row(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(10),
                      child: SizedBox(
                        width: 46,
                        height: 46,
                        child: smartImage(
                          url: items[idx].image,
                          errorBuilder: (_) => Container(color: isDark ? const Color(0xFF242426) : const Color(0xFFF3F4F6)),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(items[idx].name, maxLines: 2, overflow: TextOverflow.ellipsis,
                              style: AppTypography.labelMedium(primary).copyWith(fontWeight: FontWeight.w700)),
                          const SizedBox(height: 2),
                          Text('${inr(items[idx].price)} · ${items[idx].returnableQty} eligible', style: AppTypography.captionSmall(secondary)),
                        ],
                      ),
                    ),
                    _QtyControl(
                      value: _qty[items[idx].key] ?? 0,
                      max: items[idx].returnableQty,
                      name: items[idx].name,
                      onChanged: (v) => setState(() => _qty[items[idx].key] = v),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    ];
  }

  List<Widget> _stepTwo(OrderReturns data, List<ReturnReason> reasons, ReturnReason? reason, int maxPhotos, num refundTotal, bool isDark) {
    final primary = isDark ? AppColors.textPrimaryDark : AppColors.textPrimary;
    final secondary = isDark ? AppColors.textSecondaryDark : AppColors.textSecondary;
    final border = isDark ? AppColors.dividerDark : const Color(0xFFE5E7EB);
    final selectedBg = isDark ? const Color(0xFF1E2922) : const Color(0xFFF0FDF4);

    Widget choice({required bool selected, required Widget child, required VoidCallback onTap}) => Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Material(
            color: selected ? selectedBg : (isDark ? AppColors.surfaceDark : Colors.white),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14),
              side: BorderSide(color: selected ? AppColors.primary : border, width: selected ? 1.5 : 1),
            ),
            child: InkWell(
              borderRadius: BorderRadius.circular(14),
              onTap: onTap,
              child: Padding(padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13), child: child),
            ),
          ),
        );

    return [
      Text('SELECT THE ISSUE', style: _label(primary)),
      const SizedBox(height: 8),
      if (reasons.isEmpty) const Center(child: Padding(padding: EdgeInsets.all(16), child: CircularProgressIndicator())),
      for (final r in reasons)
        choice(
          selected: _reasonCode == r.code,
          onTap: () => setState(() => _reasonCode = r.code),
          child: Row(
            children: [
              Icon(_reasonCode == r.code ? Icons.radio_button_checked : Icons.radio_button_off,
                  size: 20, color: _reasonCode == r.code ? AppColors.primary : secondary),
              const SizedBox(width: 12),
              Expanded(child: Text(r.label, style: AppTypography.labelLarge(primary).copyWith(fontWeight: FontWeight.w700))),
            ],
          ),
        ),
      const SizedBox(height: 12),
      Text(reason?.requiresComment == true ? 'DESCRIBE THE ISSUE' : 'ANYTHING ELSE? (OPTIONAL)', style: _label(primary)),
      const SizedBox(height: 8),
      TextField(
        controller: _comment,
        maxLength: 500,
        maxLines: 3,
        onChanged: (_) => setState(() {}),
        decoration: InputDecoration(
          hintText: 'e.g. The milk packet was leaking when it arrived',
          filled: true,
          fillColor: isDark ? AppColors.surfaceDark : Colors.white,
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide(color: border)),
          enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide(color: border)),
          focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: AppColors.primary, width: 1.5)),
        ),
      ),
      const SizedBox(height: 8),
      Text('PHOTOS (HELPS US APPROVE FASTER)', style: _label(primary)),
      const SizedBox(height: 8),
      Wrap(
        spacing: 10,
        runSpacing: 10,
        children: [
          for (var i = 0; i < _photos.length; i++)
            Stack(
              clipBehavior: Clip.none,
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: Image.memory(_photos[i], width: 68, height: 68, fit: BoxFit.cover),
                ),
                Positioned(
                  top: -8,
                  right: -8,
                  child: IconButton(
                    tooltip: 'Remove photo',
                    visualDensity: VisualDensity.compact,
                    style: IconButton.styleFrom(backgroundColor: AppColors.textPrimary, foregroundColor: Colors.white, minimumSize: const Size(26, 26), padding: EdgeInsets.zero),
                    iconSize: 14,
                    onPressed: () => setState(() => _photos.removeAt(i)),
                    icon: const Icon(Icons.close_rounded),
                  ),
                ),
              ],
            ),
          if (_photos.length < maxPhotos)
            Semantics(
              button: true,
              label: 'Add photo',
              child: InkWell(
                borderRadius: BorderRadius.circular(12),
                onTap: () => _pickSource(maxPhotos),
                child: Container(
                  width: 68,
                  height: 68,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: secondary.withOpacity(0.5), width: 1.5),
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.add_a_photo_outlined, color: secondary, size: 20),
                      const SizedBox(height: 2),
                      Text('ADD', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w900, color: secondary)),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
      if (_type == 'return') ...[
        const SizedBox(height: 20),
        Text('REFUND TO', style: _label(primary)),
        const SizedBox(height: 8),
        for (final m in data.refundMethods)
          choice(
            selected: (_refundMethod ?? data.refundMethods.first) == m,
            onTap: () => setState(() => _refundMethod = m),
            child: Row(
              children: [
                Icon(m == 'wallet' ? Icons.account_balance_wallet_outlined : Icons.credit_card_rounded, size: 20, color: secondary),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(m == 'wallet' ? 'FreshCart wallet' : 'Original payment method',
                      style: AppTypography.labelLarge(primary).copyWith(fontWeight: FontWeight.w700)),
                ),
                if ((_refundMethod ?? data.refundMethods.first) == m)
                  const Icon(Icons.check_circle_rounded, color: AppColors.primary, size: 20),
              ],
            ),
          ),
      ],
      const SizedBox(height: 12),
      Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF242426) : const Color(0xFFF9FAFB),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _Promise(Icons.local_shipping_outlined, 'A partner nearby will pick up the item(s) from your door', primary),
            _Promise(Icons.lock_outline_rounded, 'Share your pickup code only after handing over', primary),
            _type == 'return'
                ? _Promise(Icons.schedule_rounded, 'Refund of ${inr(refundTotal)} within ${data.refundDelayHours} hours of pickup', primary)
                : _Promise(Icons.check_circle_outline_rounded, 'The partner brings your replacement on the same visit', primary),
          ],
        ),
      ),
    ];
  }

  TextStyle _label(Color c) => TextStyle(fontSize: 11.5, fontWeight: FontWeight.w900, letterSpacing: 0.5, color: c);
}

class _StepBar extends StatelessWidget {
  final int step;
  final bool isDark;
  const _StepBar({required this.step, required this.isDark});

  @override
  Widget build(BuildContext context) {
    final off = isDark ? AppColors.dividerDark : const Color(0xFFE5E7EB);
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
      child: Row(
        children: [
          Expanded(child: Container(height: 4, decoration: BoxDecoration(color: AppColors.primary, borderRadius: BorderRadius.circular(4)))),
          const SizedBox(width: 6),
          Expanded(child: Container(height: 4, decoration: BoxDecoration(color: step == 2 ? AppColors.primary : off, borderRadius: BorderRadius.circular(4)))),
          const SizedBox(width: 10),
          Text('Step $step of 2', style: AppTypography.captionSmall(isDark ? AppColors.textSecondaryDark : AppColors.textSecondary)),
        ],
      ),
    );
  }
}

class _TypeCard extends StatelessWidget {
  final bool selected;
  final IconData icon;
  final String title;
  final String subtitle;
  final bool isDark;
  final VoidCallback onTap;
  const _TypeCard({required this.selected, required this.icon, required this.title, required this.subtitle, required this.isDark, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final primary = isDark ? AppColors.textPrimaryDark : AppColors.textPrimary;
    return Semantics(
      selected: selected,
      button: true,
      child: Material(
        color: selected ? (isDark ? const Color(0xFF1E2922) : const Color(0xFFF0FDF4)) : (isDark ? AppColors.surfaceDark : Colors.white),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(18),
          side: BorderSide(color: selected ? AppColors.primary : (isDark ? AppColors.dividerDark : const Color(0xFFE5E7EB)), width: 2),
        ),
        child: InkWell(
          borderRadius: BorderRadius.circular(18),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(icon, color: selected ? AppColors.primaryText : (isDark ? AppColors.textSecondaryDark : AppColors.textSecondary)),
                const SizedBox(height: 8),
                Text(title, style: AppTypography.labelLarge(primary).copyWith(fontWeight: FontWeight.w900)),
                Text(subtitle, style: AppTypography.captionSmall(isDark ? AppColors.textSecondaryDark : AppColors.textSecondary)),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _QtyControl extends StatelessWidget {
  final int value;
  final int max;
  final String name;
  final ValueChanged<int> onChanged;
  const _QtyControl({required this.value, required this.max, required this.name, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    if (value == 0) {
      return OutlinedButton(
        onPressed: () => onChanged(1),
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.primaryText,
          side: const BorderSide(color: AppColors.primary),
          minimumSize: const Size(72, 36),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
        child: const Text('Select', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 12.5)),
      );
    }
    return Container(
      decoration: BoxDecoration(color: AppColors.primary, borderRadius: BorderRadius.circular(10)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          IconButton(
            tooltip: 'Fewer $name',
            onPressed: () => onChanged(value - 1),
            icon: const Icon(Icons.remove_rounded, color: Colors.white, size: 18),
            constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
            padding: EdgeInsets.zero,
          ),
          Text('$value', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900)),
          IconButton(
            tooltip: 'More $name',
            onPressed: value >= max ? null : () => onChanged(value + 1),
            icon: Icon(Icons.add_rounded, color: Colors.white.withOpacity(value >= max ? 0.4 : 1), size: 18),
            constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
            padding: EdgeInsets.zero,
          ),
        ],
      ),
    );
  }
}

class _Promise extends StatelessWidget {
  final IconData icon;
  final String text;
  final Color color;
  const _Promise(this.icon, this.text, this.color);

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 3),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, size: 16, color: AppColors.primaryText),
            const SizedBox(width: 8),
            Expanded(child: Text(text, style: AppTypography.labelMedium(color).copyWith(fontWeight: FontWeight.w700))),
          ],
        ),
      );
}
