import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/constants/app_radius.dart';
import 'package:freshcart/core/error/api_exception.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/core/widgets/app_modal.dart';
import 'package:freshcart/core/widgets/app_toast.dart';
import 'package:freshcart/features/home/presentation/controllers/catalog_providers.dart' show apiServiceProvider;
import 'package:freshcart/features/returns/data/return_models.dart';
import 'package:freshcart/features/returns/presentation/returns_providers.dart';

/// Account → Bank & UPI details. Saved accounts a return refund can be paid
/// to instead of the FreshCart wallet. Mirrors web `RefundAccounts.tsx`.
class RefundAccountsScreen extends ConsumerWidget {
  const RefundAccountsScreen({super.key});

  Future<void> _run(BuildContext context, WidgetRef ref, Future<void> Function() fn) async {
    try {
      await fn();
      ref.invalidate(refundAccountsProvider);
    } on ApiException catch (e) {
      AppToast.error(e.message);
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textColor = isDark ? AppColors.textPrimaryDark : AppColors.textPrimary;
    final subColor = isDark ? AppColors.textSecondaryDark : AppColors.textSecondary;
    final divider = isDark ? AppColors.dividerDark : AppColors.divider;
    final accounts = ref.watch(refundAccountsProvider);
    final api = ref.read(apiServiceProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Bank & UPI details'),
        centerTitle: false,
        scrolledUnderElevation: 0,
        bottom: PreferredSize(preferredSize: const Size.fromHeight(1), child: Container(height: 1, color: divider)),
      ),
      body: ListView(
        padding: EdgeInsets.fromLTRB(16, 16, 16, 32 + MediaQuery.paddingOf(context).bottom),
        children: [
          Text(
            'When you return an item you can choose to get the refund in your FreshCart wallet or in one of these accounts.',
            style: AppTypography.bodyMedium(subColor),
          ),
          const SizedBox(height: 16),
          accounts.when(
            loading: () => const Padding(
              padding: EdgeInsets.all(24),
              child: Center(child: CircularProgressIndicator()),
            ),
            error: (e, _) => Text(e is ApiException ? e.message : 'Could not load your accounts', style: AppTypography.bodyMedium(AppColors.errorText)),
            data: (list) => Column(
              children: [
                for (final a in list)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Material(
                      color: isDark ? AppColors.surfaceDark : AppColors.surface,
                      shape: RoundedRectangleBorder(borderRadius: AppRadius.brMd, side: BorderSide(color: divider)),
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(16, 14, 8, 6),
                        child: Column(
                          children: [
                            Row(
                              children: [
                                CircleAvatar(
                                  radius: 20,
                                  backgroundColor: AppColors.primary.withOpacity(0.12),
                                  child: Icon(a.isBank ? Icons.account_balance_outlined : Icons.phone_android_rounded,
                                      color: AppColors.primaryText, size: 20),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(a.isBank ? 'A/c ••••${a.accountLast4}' : a.upiId,
                                          style: AppTypography.labelLarge(textColor).copyWith(fontWeight: FontWeight.w800),
                                          overflow: TextOverflow.ellipsis),
                                      Text(a.isBank ? '${a.holderName} · ${a.ifsc}' : 'UPI ID',
                                          style: AppTypography.bodySmall(subColor), overflow: TextOverflow.ellipsis),
                                    ],
                                  ),
                                ),
                                if (a.isDefault)
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                    margin: const EdgeInsets.only(right: 8),
                                    decoration: BoxDecoration(
                                      color: AppColors.primary.withOpacity(0.12),
                                      borderRadius: AppRadius.brPill,
                                    ),
                                    child: Text('DEFAULT',
                                        style: AppTypography.labelSmall(AppColors.primaryText).copyWith(fontWeight: FontWeight.w900)),
                                  ),
                              ],
                            ),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.end,
                              children: [
                                if (!a.isDefault)
                                  TextButton(
                                    onPressed: () => _run(context, ref, () => api.setDefaultRefundAccount(a.id)),
                                    style: TextButton.styleFrom(foregroundColor: AppColors.primaryText),
                                    child: const Text('Make default'),
                                  ),
                                TextButton.icon(
                                  onPressed: () async {
                                    final ok = await AppModal.confirm(
                                      context,
                                      title: 'Remove this account?',
                                      message: 'Refunds already on their way to it are not affected.',
                                      confirmLabel: 'Remove',
                                      destructive: true,
                                    );
                                    if (ok && context.mounted) await _run(context, ref, () => api.deleteRefundAccount(a.id));
                                  },
                                  icon: const Icon(Icons.delete_outline_rounded, size: 18),
                                  label: const Text('Remove'),
                                  style: TextButton.styleFrom(foregroundColor: AppColors.errorText),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 4),
          _AddTile(label: 'Add bank account', onTap: () => context.push('/refund-accounts/add?type=bank')),
          const SizedBox(height: 12),
          _AddTile(label: 'Add UPI ID', onTap: () => context.push('/refund-accounts/add?type=upi')),
        ],
      ),
    );
  }
}

class _AddTile extends StatelessWidget {
  final String label;
  final VoidCallback onTap;
  const _AddTile({required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) => Material(
        color: Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: AppRadius.brMd,
          side: BorderSide(color: AppColors.primary.withOpacity(0.45), width: 1.5),
        ),
        child: InkWell(
          borderRadius: AppRadius.brMd,
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
            child: Row(
              children: [
                const Icon(Icons.add_rounded, color: AppColors.primaryText),
                const SizedBox(width: 12),
                Text(label, style: AppTypography.labelLarge(AppColors.primaryText).copyWith(fontWeight: FontWeight.w800)),
              ],
            ),
          ),
        ),
      );
}

/// "My bank details" / "Add UPI ID" form. Pops with the saved [RefundAccount]
/// so the return flow can select it straight away.
class AddRefundAccountScreen extends ConsumerStatefulWidget {
  final String type; // bank | upi
  const AddRefundAccountScreen({super.key, this.type = 'bank'});

  @override
  ConsumerState<AddRefundAccountScreen> createState() => _AddRefundAccountScreenState();
}

class _AddRefundAccountScreenState extends ConsumerState<AddRefundAccountScreen> {
  // Basic shape only — the server decides how strict to be (it accepts dummy
  // details while bank payouts are simulated) and its message is shown on submit.
  static final _ifscRe = RegExp(r'^[A-Z0-9]{4,11}$');
  static final _acctRe = RegExp(r'^\d{4,18}$');
  static final _upiRe = RegExp(r'^[a-z0-9._-]{2,256}@[a-z]{2,64}$');

  final _ifsc = TextEditingController();
  final _acct = TextEditingController();
  final _confirm = TextEditingController();
  final _holder = TextEditingController();
  final _upi = TextEditingController();
  bool _agree = true;
  bool _saving = false;

  bool get _isBank => widget.type != 'upi';

  @override
  void initState() {
    super.initState();
    for (final c in [_ifsc, _acct, _confirm, _holder, _upi]) {
      c.addListener(() => setState(() {}));
    }
  }

  @override
  void dispose() {
    for (final c in [_ifsc, _acct, _confirm, _holder, _upi]) {
      c.dispose();
    }
    super.dispose();
  }

  /// Why Submit is disabled — shown above the button so it never looks stuck.
  String? get _blocker {
    if (!_isBank) {
      if (_upi.text.isEmpty) return 'Enter your UPI ID';
      return _upiRe.hasMatch(_upi.text.trim().toLowerCase()) ? null : 'Enter a UPI ID like name@okhdfcbank';
    }
    if (!_ifscRe.hasMatch(_ifsc.text)) return 'Enter the IFSC code (e.g. HDFC0001234)';
    if (!_acctRe.hasMatch(_acct.text)) return 'Enter your account number';
    if (_confirm.text != _acct.text) {
      return _confirm.text.isEmpty ? 'Re-enter your account number to confirm' : 'Account numbers do not match';
    }
    if (_holder.text.trim().length < 2) return "Enter the account holder's name";
    if (!_agree) return 'Accept the Privacy Policy to continue';
    return null;
  }

  String? get _confirmError =>
      _confirm.text.isNotEmpty && _confirm.text != _acct.text ? 'Account numbers do not match' : null;

  Future<void> _submit() async {
    setState(() => _saving = true);
    try {
      final json = await ref.read(apiServiceProvider).addRefundAccount(_isBank
          ? {
              'type': 'bank',
              'ifsc': _ifsc.text,
              'accountNumber': _acct.text,
              'confirmAccountNumber': _confirm.text,
              'holderName': _holder.text.trim(),
            }
          : {'type': 'upi', 'upiId': _upi.text.trim().toLowerCase()});
      ref.invalidate(refundAccountsProvider);
      AppToast.success(_isBank ? 'Bank account saved' : 'UPI ID saved');
      if (mounted) context.pop(RefundAccount.fromJson(json));
    } on ApiException catch (e) {
      AppToast.error(e.message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textColor = isDark ? AppColors.textPrimaryDark : AppColors.textPrimary;
    final divider = isDark ? AppColors.dividerDark : AppColors.divider;

    InputDecoration deco(String label, {String? hint, String? error}) => InputDecoration(
          labelText: label,
          hintText: hint,
          errorText: error,
          filled: false,
          contentPadding: const EdgeInsets.symmetric(vertical: 10),
          border: UnderlineInputBorder(borderSide: BorderSide(color: divider)),
          enabledBorder: UnderlineInputBorder(borderSide: BorderSide(color: divider)),
          focusedBorder: const UnderlineInputBorder(borderSide: BorderSide(color: AppColors.primaryText, width: 2)),
          floatingLabelStyle: const TextStyle(color: AppColors.primaryText, fontWeight: FontWeight.w700),
        );

    return Scaffold(
      appBar: AppBar(
        title: Text(_isBank ? 'MY BANK DETAILS' : 'ADD UPI ID'),
        centerTitle: false,
        scrolledUnderElevation: 0,
        bottom: PreferredSize(preferredSize: const Size.fromHeight(1), child: Container(height: 1, color: divider)),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
        children: [
          if (_isBank) ...[
            TextField(
              controller: _ifsc,
              autofocus: true,
              textCapitalization: TextCapitalization.characters,
              inputFormatters: [
                FilteringTextInputFormatter.allow(RegExp('[A-Za-z0-9]')),
                LengthLimitingTextInputFormatter(11),
                TextInputFormatter.withFunction((o, n) => n.copyWith(text: n.text.toUpperCase())),
              ],
              decoration: deco('IFSC Code', hint: 'e.g. HDFC0001234'),
            ),
            const SizedBox(height: 18),
            TextField(
              controller: _acct,
              obscureText: true,
              keyboardType: TextInputType.number,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(18)],
              decoration: deco('Account Number'),
            ),
            const SizedBox(height: 18),
            TextField(
              controller: _confirm,
              keyboardType: TextInputType.number,
              enableInteractiveSelection: false, // no paste — make them re-type it
              inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(18)],
              decoration: deco('Confirm Account Number', error: _confirmError),
            ),
            const SizedBox(height: 18),
            TextField(
              controller: _holder,
              textCapitalization: TextCapitalization.words,
              inputFormatters: [LengthLimitingTextInputFormatter(80)],
              decoration: deco("Account Holder's Name"),
            ),
          ] else
            TextField(
              controller: _upi,
              autofocus: true,
              keyboardType: TextInputType.emailAddress,
              autocorrect: false,
              decoration: deco('UPI ID', hint: 'e.g. name@okhdfcbank'),
            ),
          const SizedBox(height: 20),
          InkWell(
            onTap: () => setState(() => _agree = !_agree),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Checkbox(
                  value: _agree,
                  activeColor: AppColors.primaryText,
                  onChanged: (v) => setState(() => _agree = v ?? false),
                ),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.only(top: 12),
                    child: Text.rich(
                      TextSpan(
                        text: 'By continuing, you agree with the handling of your data as per our ',
                        children: [
                          WidgetSpan(
                            alignment: PlaceholderAlignment.baseline,
                            baseline: TextBaseline.alphabetic,
                            child: GestureDetector(
                              onTap: () => context.push('/legal?tab=privacy'),
                              child: Text('Privacy Policy',
                                  style: AppTypography.bodyMedium(AppColors.primaryText).copyWith(fontWeight: FontWeight.w700)),
                            ),
                          ),
                        ],
                      ),
                      style: AppTypography.bodyMedium(textColor),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              color: AppColors.primary.withOpacity(isDark ? 0.14 : 0.08),
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
              child: Row(
                children: [
                  const Icon(Icons.verified_user_outlined, color: AppColors.primaryText, size: 28),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Text(
                      "Please enter the ${_isBank ? 'bank details' : 'UPI ID'} carefully and don't worry, it is 100% safe!",
                      style: AppTypography.bodyMedium(textColor),
                    ),
                  ),
                ],
              ),
            ),
            if (_blocker != null && _confirmError == null)
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 10, 16, 0),
                child: Text(_blocker!,
                    style: AppTypography.bodySmall(isDark ? AppColors.textSecondaryDark : AppColors.textSecondary)),
              ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
              child: SizedBox(
                width: double.infinity,
                height: 52,
                child: FilledButton(
                  onPressed: _blocker == null && !_saving ? _submit : null,
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.primaryText,
                    shape: const RoundedRectangleBorder(borderRadius: AppRadius.brSm),
                  ),
                  child: _saving
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Text('Submit', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
