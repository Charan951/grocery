import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/core/utils/launch.dart';
import 'package:freshcart/core/widgets/app_scaffold.dart';
import 'package:freshcart/features/legal/legal_content.dart';

enum _LegalTab { terms, privacy, delete }

/// Terms of Use / Privacy Notice / Delete Account — Terms & Privacy are
/// bundled static content (mirrors web `Legal.tsx`); Delete Account opens
/// the equivalent web page (freshcart.com/delete-account) via url_launcher,
/// so the two copies of the deletion instructions never drift apart.
/// `/legal?tab=terms` (default), `/legal?tab=privacy` or `/legal?tab=delete`.
class LegalScreen extends StatefulWidget {
  final String initialTab; // 'terms' | 'privacy' | 'delete'
  const LegalScreen({super.key, this.initialTab = 'terms'});

  @override
  State<LegalScreen> createState() => _LegalScreenState();
}

class _LegalScreenState extends State<LegalScreen> {
  late _LegalTab _tab = switch (widget.initialTab) {
    'privacy' => _LegalTab.privacy,
    'delete' => _LegalTab.delete,
    _ => _LegalTab.terms,
  };

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textColor = isDark ? AppColors.textPrimaryDark : AppColors.textPrimary;
    final subColor = isDark ? AppColors.textSecondaryDark : AppColors.textSecondary;

    return AppScaffold(
      title: 'Legal',
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
            child: SegmentedButton<_LegalTab>(
              segments: const [
                ButtonSegment(value: _LegalTab.terms, label: Text('Terms')),
                ButtonSegment(value: _LegalTab.privacy, label: Text('Privacy')),
                ButtonSegment(value: _LegalTab.delete, label: Text('Delete Account')),
              ],
              selected: {_tab},
              showSelectedIcon: false,
              onSelectionChanged: (s) => setState(() => _tab = s.first),
              style: ButtonStyle(
                textStyle: WidgetStatePropertyAll(AppTypography.labelMedium(textColor)),
              ),
            ),
          ),
          Expanded(
            child: _tab == _LegalTab.delete
                ? _DeleteAccountTab(isDark: isDark, textColor: textColor, subColor: subColor)
                : _DocTab(
                    doc: _tab == _LegalTab.terms ? kTermsDoc : kPrivacyDoc,
                    textColor: textColor,
                    subColor: subColor,
                  ),
          ),
        ],
      ),
    );
  }
}

class _DocTab extends StatelessWidget {
  final LegalDoc doc;
  final Color textColor;
  final Color subColor;
  const _DocTab({required this.doc, required this.textColor, required this.subColor});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 32),
      children: [
        Text(doc.title, style: AppTypography.h2(textColor)),
        const SizedBox(height: 4),
        Text('${doc.version} · ${doc.updated}', style: AppTypography.bodySmall(subColor)),
        const SizedBox(height: 12),
        Text(kLegalPreamble, style: AppTypography.bodySmall(subColor).copyWith(height: 1.5)),
        const SizedBox(height: 20),
        for (final s in doc.sections) ...[
          Text(s.heading, style: AppTypography.title(textColor)),
          const SizedBox(height: 6),
          for (final p in s.paragraphs)
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Text(p, style: AppTypography.bodyMedium(subColor).copyWith(height: 1.55)),
            ),
          const SizedBox(height: 12),
        ],
        Divider(color: isDark ? AppColors.dividerDark : AppColors.divider),
        const SizedBox(height: 12),
        Text(
          '© ${DateTime.now().year} FreshCart Marketplace Private Limited. All rights reserved.',
          textAlign: TextAlign.center,
          style: AppTypography.labelSmall(subColor).copyWith(fontWeight: FontWeight.w400),
        ),
      ],
    );
  }
}

/// Short in-app summary + a link out to the full web instructions
/// (freshcart.com/delete-account) so both platforms document exactly the
/// same process without duplicating the legal copy.
class _DeleteAccountTab extends StatelessWidget {
  final bool isDark;
  final Color textColor;
  final Color subColor;
  const _DeleteAccountTab({required this.isDark, required this.textColor, required this.subColor});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 32),
      children: [
        Text('Delete Your Account', style: AppTypography.h2(textColor)),
        const SizedBox(height: 12),
        Text(
          'You can permanently delete your FreshCart account and personal data at any time. '
          'This removes your profile, saved addresses, wallet balance and reviews, and cannot be undone.',
          style: AppTypography.bodyMedium(subColor).copyWith(height: 1.55),
        ),
        const SizedBox(height: 20),
        Text('From this app', style: AppTypography.title(textColor)),
        const SizedBox(height: 6),
        Text(
          'Go to Account → scroll to the bottom → tap "Delete account" and confirm.',
          style: AppTypography.bodyMedium(subColor).copyWith(height: 1.55),
        ),
        const SizedBox(height: 12),
        OutlinedButton.icon(
          onPressed: () => context.push('/profile'),
          icon: const Icon(Icons.person_outline_rounded, size: 18),
          label: const Text('Go to Account'),
        ),
        const SizedBox(height: 24),
        Divider(color: isDark ? AppColors.dividerDark : AppColors.divider),
        const SizedBox(height: 16),
        Text('Full instructions & data policy', style: AppTypography.title(textColor)),
        const SizedBox(height: 6),
        Text(
          'Read the complete deletion process — including what data is retained for legal/tax '
          'reasons and how to request deletion without signing in — on freshcart.com.',
          style: AppTypography.bodyMedium(subColor).copyWith(height: 1.55),
        ),
        const SizedBox(height: 12),
        FilledButton.icon(
          onPressed: () => openUrl('https://www.freshcart.com/delete-account'),
          icon: const Icon(Icons.open_in_new_rounded, size: 18),
          label: const Text('View on freshcart.com'),
        ),
      ],
    );
  }
}
