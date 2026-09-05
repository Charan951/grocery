import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/core/widgets/app_toast.dart';
import 'package:freshcart/core/widgets/feedback_states.dart';
import 'package:freshcart/core/widgets/product_card.dart';
import 'package:freshcart/core/widgets/search_bar.dart';
import 'package:freshcart/core/widgets/skeletons.dart';
import 'package:freshcart/features/cart/presentation/controllers/cart_controller.dart';
import 'package:freshcart/features/cart/presentation/widgets/catalog_cart_bar.dart';
import 'package:freshcart/features/home/presentation/controllers/catalog_providers.dart';
import 'package:freshcart/features/search/presentation/controllers/search_controller.dart';

class SearchScreen extends ConsumerStatefulWidget {
  final bool autofocus;
  const SearchScreen({super.key, this.autofocus = false});

  @override
  ConsumerState<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends ConsumerState<SearchScreen> {
  final _controller = TextEditingController();
  String _query = '';
  Timer? _debounce;

  @override
  void dispose() {
    _debounce?.cancel();
    _controller.dispose();
    super.dispose();
  }

  void _onChanged(String text) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 350), () {
      if (mounted) setState(() => _query = text.trim());
    });
  }

  void _run(String term) {
    _controller.text = term;
    _controller.selection = TextSelection.collapsed(offset: term.length);
    _debounce?.cancel();
    setState(() => _query = term.trim());
    if (term.trim().isNotEmpty) ref.read(recentSearchesProvider.notifier).add(term.trim());
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppColors.backgroundDark : AppColors.background,
      appBar: AppBar(
        title: const Text('Search'),
        centerTitle: false,
        scrolledUnderElevation: 0,
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(height: 1, color: isDark ? AppColors.dividerDark : AppColors.divider),
        ),
      ),
      bottomNavigationBar: const CatalogCartBar(),
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
              child: CustomSearchBar(
                controller: _controller,
                autofocus: widget.autofocus,
                hintText: 'Search for atta, dal, coke and more',
                onChanged: _onChanged,
                onSubmitted: _run,
                trailing: _query.isEmpty && _controller.text.isEmpty
                    ? null
                    : IconButton(
                        icon: Icon(Icons.close_rounded,
                            size: 20,
                            color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondary),
                        onPressed: () {
                          _controller.clear();
                          setState(() => _query = '');
                        },
                      ),
              ),
            ),
            Expanded(
              child: _query.isEmpty
                  ? _Discovery(onTerm: _run)
                  : _Results(query: _query),
            ),
          ],
        ),
      ),
    );
  }
}

class _Discovery extends ConsumerWidget {
  final ValueChanged<String> onTerm;
  const _Discovery({required this.onTerm});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final recents = ref.watch(recentSearchesProvider);
    final categories = ref.watch(categoriesProvider).valueOrNull ?? const [];

    final trending = <String>{
      for (final c in categories) ...[c.name, ...c.subCategories],
    }.take(14).toList();

    Widget chip(String label, {IconData? icon}) => ActionChip(
          avatar: icon == null ? null : Icon(icon, size: 15),
          label: Text(label),
          labelStyle: AppTypography.labelMedium(
            isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
          ).copyWith(fontWeight: FontWeight.w500),
          backgroundColor: isDark ? Colors.white10 : AppColors.surface,
          side: BorderSide(color: isDark ? AppColors.dividerDark : AppColors.divider),
          shape: const StadiumBorder(),
          onPressed: () => onTerm(label),
        );

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
      children: [
        if (recents.isNotEmpty) ...[
          Row(
            children: [
              Expanded(child: Text('Recent', style: AppTypography.h3(
                isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
              ))),
              TextButton(
                onPressed: () => ref.read(recentSearchesProvider.notifier).clear(),
                child: Text('Clear', style: AppTypography.labelMedium(AppColors.primaryText)),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Wrap(spacing: 8, runSpacing: 8, children: [
            for (final r in recents) chip(r, icon: Icons.history_rounded),
          ]),
          const SizedBox(height: 24),
        ],
        if (trending.isNotEmpty) ...[
          Text('Trending', style: AppTypography.h3(
            isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
          )),
          const SizedBox(height: 12),
          Wrap(spacing: 8, runSpacing: 8, children: [for (final t in trending) chip(t)]),
        ],
      ],
    );
  }
}

class _Results extends ConsumerWidget {
  final String query;
  const _Results({required this.query});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final resultsAsync = ref.watch(searchProductsProvider(query));

    return resultsAsync.when(
      loading: () => const SkeletonGrid(itemCount: 6, childAspectRatio: 0.62),
      error: (e, _) => ErrorState(onRetry: () => ref.invalidate(searchProductsProvider(query))),
      data: (results) {
        if (results.isEmpty) {
          return const EmptyState(
            icon: Icons.search_off_rounded,
            title: 'No matches found',
            description: "We couldn't find anything for that. Check the spelling or try a different term.",
          );
        }
        return CustomScrollView(
          physics: const BouncingScrollPhysics(),
          slivers: [
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
                child: Text(
                  '${results.length} ${results.length == 1 ? 'result' : 'results'} for "$query"',
                  style: AppTypography.bodySmall(
                    isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
                  ),
                ),
              ),
            ),
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
              sliver: SliverGrid(
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                  childAspectRatio: 0.62,
                ),
                delegate: SliverChildBuilderDelegate(
                  (context, i) {
                    final p = results[i];
                    return ProductCard(
                      product: p,
                      heroTag: 'product_image_${p.id}',
                      width: double.infinity,
                      onTap: () => context.push('/product/${p.id}'),
                      onAdd: () {
                        ref.read(cartProvider.notifier).addToCart(p)
                            ? AppToast.success('${p.name} added to cart')
                            : AppToast.info('You can add up to $kMaxQtyPerItem of an item');
                      },
                    );
                  },
                  childCount: results.length,
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}

/// Full-screen search route (opened from the Home search pill) — autofocuses.
class SearchDetailScreen extends StatelessWidget {
  const SearchDetailScreen({super.key});

  @override
  Widget build(BuildContext context) => const SearchScreen(autofocus: true);
}
