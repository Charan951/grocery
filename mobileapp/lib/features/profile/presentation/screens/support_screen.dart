import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/constants/app_radius.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/core/widgets/app_icon_button.dart';
import 'package:freshcart/core/widgets/app_scaffold.dart';
import 'package:freshcart/features/profile/presentation/controllers/support_controller.dart';

class SupportScreen extends ConsumerStatefulWidget {
  const SupportScreen({super.key});

  @override
  ConsumerState<SupportScreen> createState() => _SupportScreenState();
}

class _SupportScreenState extends ConsumerState<SupportScreen> {
  final _controller = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _send() {
    final text = _controller.text.trim();
    if (text.isEmpty) return;
    ref.read(supportProvider.notifier).sendMessage(text);
    _controller.clear();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final messages = ref.watch(supportProvider);
    final textColor = isDark ? AppColors.textPrimaryDark : AppColors.textPrimary;

    return AppScaffold(
      title: 'Help & support',
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
              physics: const BouncingScrollPhysics(),
              itemCount: messages.length,
              itemBuilder: (context, i) {
                final m = messages[i];
                final mine = m.isUser;
                return Align(
                  alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 10),
                    constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.78),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      color: mine
                          ? AppColors.primary
                          : (isDark ? AppColors.surfaceDark : AppColors.surface),
                      borderRadius: BorderRadius.only(
                        topLeft: const Radius.circular(16),
                        topRight: const Radius.circular(16),
                        bottomLeft: Radius.circular(mine ? 16 : 4),
                        bottomRight: Radius.circular(mine ? 4 : 16),
                      ),
                      border: mine ? null : Border.all(color: isDark ? AppColors.dividerDark : AppColors.divider),
                    ),
                    child: Column(
                      crossAxisAlignment: mine ? CrossAxisAlignment.end : CrossAxisAlignment.start,
                      children: [
                        Text(m.text, style: AppTypography.bodyMedium(mine ? Colors.white : textColor)),
                        const SizedBox(height: 3),
                        Text(
                          '${m.time.hour.toString().padLeft(2, '0')}:${m.time.minute.toString().padLeft(2, '0')}',
                          style: AppTypography.labelSmall(
                            mine ? Colors.white70 : (isDark ? AppColors.textSecondaryDark : AppColors.textSecondary),
                          ).copyWith(fontWeight: FontWeight.w400),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
          Container(
            decoration: BoxDecoration(
              color: isDark ? AppColors.surfaceDark : AppColors.surface,
              border: Border(top: BorderSide(color: isDark ? AppColors.dividerDark : AppColors.divider)),
            ),
            padding: const EdgeInsets.fromLTRB(16, 8, 8, 8),
            child: SafeArea(
              top: false,
              child: Row(
                children: [
                  Expanded(
                    child: Container(
                      decoration: BoxDecoration(
                        color: isDark ? Colors.white10 : AppColors.background,
                        borderRadius: AppRadius.brPill,
                        border: Border.all(color: isDark ? AppColors.dividerDark : AppColors.divider),
                      ),
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: TextField(
                        controller: _controller,
                        onSubmitted: (_) => _send(),
                        textInputAction: TextInputAction.send,
                        style: AppTypography.bodyMedium(textColor),
                        decoration: InputDecoration(
                          hintText: 'Message our support team…',
                          hintStyle: AppTypography.bodyMedium(
                            isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
                          ),
                          border: InputBorder.none,
                          isDense: true,
                          contentPadding: const EdgeInsets.symmetric(vertical: 12),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 4),
                  AppIconButton(
                    icon: Icons.send_rounded,
                    tooltip: 'Send message',
                    onPressed: _send,
                    background: AppColors.primary,
                    color: Colors.white,
                    diameter: 48,
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
