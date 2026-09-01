import 'package:flutter/material.dart';
import 'package:freshcart/core/constants/app_colors.dart';

/// Global page layout for full-screen (non-tab-shell) routes.
///
/// Standardises: themed background, safe-area handling, an optional flat app bar
/// with a consistent back button, and optional horizontal body padding. Tab
/// screens render inside `MainScaffold` and don't need this.
class AppScaffold extends StatelessWidget {
  final Widget body;
  final String? title;
  final List<Widget>? actions;
  final Widget? leading;
  final bool showBack;
  final VoidCallback? onBack;
  final Widget? bottomNavigationBar;
  final Widget? floatingActionButton;
  final bool resizeToAvoidBottomInset;

  /// Applies 16px horizontal padding around [body].
  final bool padded;

  /// Wrap [body] in a [SafeArea] (default true).
  final bool useSafeArea;
  final bool safeAreaTop;
  final bool safeAreaBottom;

  final Color? backgroundColor;

  const AppScaffold({
    super.key,
    required this.body,
    this.title,
    this.actions,
    this.leading,
    this.showBack = true,
    this.onBack,
    this.bottomNavigationBar,
    this.floatingActionButton,
    this.resizeToAvoidBottomInset = true,
    this.padded = false,
    this.useSafeArea = true,
    this.safeAreaTop = true,
    this.safeAreaBottom = true,
    this.backgroundColor,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bg = backgroundColor ??
        (isDark ? AppColors.backgroundDark : AppColors.background);

    final hasAppBar = title != null || actions != null || leading != null || showBack;

    Widget content = body;
    if (padded) {
      content = Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        child: content,
      );
    }
    if (useSafeArea) {
      content = SafeArea(
        top: safeAreaTop && !hasAppBar,
        bottom: safeAreaBottom,
        child: content,
      );
    }

    return Scaffold(
      backgroundColor: bg,
      resizeToAvoidBottomInset: resizeToAvoidBottomInset,
      appBar: hasAppBar
          ? AppBar(
              backgroundColor: bg,
              surfaceTintColor: Colors.transparent,
              elevation: 0,
              scrolledUnderElevation: 0,
              centerTitle: false,
              titleSpacing: 0,
              automaticallyImplyLeading: false,
              leading: leading ??
                  (showBack
                      ? IconButton(
                          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
                          onPressed: onBack ?? () => Navigator.of(context).maybePop(),
                        )
                      : null),
              title: title == null ? null : Text(title!),
              actions: actions,
              bottom: PreferredSize(
                preferredSize: const Size.fromHeight(1),
                child: Container(
                  height: 1,
                  color: isDark ? AppColors.dividerDark : AppColors.divider,
                ),
              ),
            )
          : null,
      bottomNavigationBar: bottomNavigationBar,
      floatingActionButton: floatingActionButton,
      body: content,
    );
  }
}
