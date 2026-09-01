import 'package:flutter/material.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/core/widgets/app_scaffold.dart';
import 'package:freshcart/features/legal/legal_content.dart';

/// Terms of Use / Privacy Notice — bundled static content (mirrors web `Legal.tsx`).
/// `/legal?tab=terms` (default) or `/legal?tab=privacy`.
class LegalScreen extends StatefulWidget {
  final String initialTab; // 'terms' | 'privacy'
  const LegalScreen({super.key, this.initialTab = 'terms'});

  @override
  State<LegalScreen> createState() => _LegalScreenState();
}

class _LegalScreenState extends State<LegalScreen> {
  late bool _terms = widget.initialTab != 'privacy';

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textColor = isDark ? AppColors.textPrimaryDark : AppColors.textPrimary;
    final subColor = isDark ? AppColors.textSecondaryDark : AppColors.textSecondary;
    final doc = _terms ? kTermsDoc : kPrivacyDoc;

    return AppScaffold(
      title: 'Legal',
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
            child: SegmentedButton<bool>(
              segments: const [
                ButtonSegment(value: true, label: Text('Terms of Use')),
                ButtonSegment(value: false, label: Text('Privacy')),
              ],
              selected: {_terms},
              showSelectedIcon: false,
              onSelectionChanged: (s) => setState(() => _terms = s.first),
              style: ButtonStyle(
                textStyle: WidgetStatePropertyAll(AppTypography.labelMedium(textColor)),
              ),
            ),
          ),
          Expanded(
            child: ListView(
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
            ),
          ),
        ],
      ),
    );
  }
}
