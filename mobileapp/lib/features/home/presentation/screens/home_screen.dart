import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/constants/app_radius.dart';
import 'package:freshcart/core/utils/web_link.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/core/widgets/category_card.dart';
import 'package:freshcart/core/widgets/feedback_states.dart';
import 'package:freshcart/core/widgets/app_toast.dart';
import 'package:freshcart/core/widgets/smart_image.dart';
import 'package:freshcart/core/services/location_permission.dart';
import 'package:freshcart/features/authentication/presentation/controllers/auth_controller.dart';
import 'package:freshcart/features/cart/presentation/controllers/cart_controller.dart';
import 'package:freshcart/features/categories/data/models/category_model.dart';
import 'package:freshcart/features/home/presentation/controllers/catalog_providers.dart';
import 'package:freshcart/features/home/presentation/widgets/home_header.dart';
import 'package:freshcart/features/home/presentation/widgets/super_category_icon.dart';
import 'package:freshcart/features/home/presentation/widgets/product_rail.dart';
import 'package:freshcart/features/home/presentation/widgets/category_shelf_section.dart';
import 'package:freshcart/features/products/data/models/product_model.dart';
import '../utils/festival_theme_resolver.dart';
import '../widgets/festival_campaign_section.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  final ScrollController _scrollController = ScrollController();
  // The scrolling location + search block; once it's scrolled fully away the
  // super-category strip is pinned.
  final GlobalKey _topBarKey = GlobalKey();
  bool _isScrolledPastFestival = false;

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
    // Ask for real-time location permission right after login (fresh OTP or
    // a resumed session) — Home mounts exactly once per app session (it's an
    // IndexedStack branch), so this fires once, not on every tab switch. Runs
    // post-frame and is fire-and-forget so a slow/unavailable location plugin
    // can never block first paint.
    WidgetsBinding.instance.addPostFrameCallback((_) => _maybeAskLocation());
  }

  Future<void> _maybeAskLocation() async {
    if (!mounted) return;
    if (ref.read(authProvider).locationPermissionGranted) return;
    try {
      await LocationPermissionService.ensureWithUi(context);
    } catch (_) {
      return; // no location plugin available (e.g. a test host) — stay silent
    }
    if (!mounted) return;
    await ref.read(authProvider.notifier).refreshLocationPermission();
  }

  void _onScroll() {
    if (_scrollController.hasClients) {
      // Drop the festival tint the moment the strip pins (same as web).
      final pinAt = _topBarKey.currentContext?.size?.height ?? 110.0;
      final isPast = _scrollController.offset >= pinAt;
      if (isPast != _isScrolledPastFestival) {
        setState(() {
          _isScrolledPastFestival = isPast;
        });
      }
    }
  }

  @override
  void dispose() {
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    super.dispose();
  }

  void _refresh() {
    ref.invalidate(bannersProvider);
    ref.invalidate(productSalesProvider);
    ref.invalidate(categoriesProvider);
    ref.invalidate(specialGroupsProvider);
    ref.invalidate(allProductsProvider);
    ref.invalidate(activeFestivalCampaignProvider);
    ref.invalidate(superCategoriesProvider);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final auth = ref.watch(authProvider);
    final cartCount = ref.watch(cartProvider.select((c) => c.totalItemsCount));

    final categoriesAsync = ref.watch(categoriesProvider);
    final productsAsync = ref.watch(allProductsProvider);

    final selectedSuperCat = ref.watch(selectedSuperCategoryProvider);
    final campaign = ref.watch(activeFestivalCampaignProvider).valueOrNull;

    final isFestivalActive =
        campaign != null &&
        campaign.isCurrentlyActive &&
        campaign.appliesToSuperCategory(selectedSuperCat);

    final festivalTheme = isFestivalActive
        ? FestivalThemeResolver.resolve(campaign)
        : null;

    final superCats =
        ref.watch(superCategoriesProvider).valueOrNull ?? const [];

    final (
      filteredCategories,
      filteredProducts,
      currentSuperCat,
      trendingCategories,
    ) = _filterCatalog(
      selectedSuperCat,
      superCats,
      categoriesAsync.valueOrNull ?? const <CategoryModel>[],
      productsAsync.valueOrNull ?? const <ProductModel>[],
    );

    final address =
        auth.user?.selectedAddress?['addressLine'] as String? ??
        'Select a delivery address';

    final isFestivalHeaderActive = isFestivalActive && !_isScrolledPastFestival;

    // The status-bar inset is owned by the pinned shield sliver below, so the
    // location row drops its own SafeArea top padding.
    final locationHeader = MediaQuery.removePadding(
      context: context,
      removeTop: true,
      child: LocationHeader(
        addressLine: address,
        onAddressTap: () => context.push('/location_select'),
        onProfileTap: () => context.go('/account'),
        onNotificationsTap: () => context.push('/notifications'),
        backgroundColor: isFestivalActive ? Colors.transparent : null,
      ),
    );

    final searchHeader = SearchBarHeader(
      cartCount: cartCount,
      onSearchTap: () => context.push('/search_detail'),
      onCartTap: () => context.push('/cart'),
      backgroundColor: isFestivalActive ? Colors.transparent : null,
    );

    final superCatNav = _SuperCategoryNav(
      isFestivalActive: isFestivalHeaderActive,
    );

    // A sliver in every branch so the home body can live directly in the
    // CustomScrollView (the content branch is a lazy SliverList).
    Widget bodyContent;
    if (categoriesAsync.isLoading && productsAsync.isLoading) {
      bodyContent = const SliverToBoxAdapter(child: _HomeSkeleton());
    } else if (categoriesAsync.hasError && productsAsync.hasError) {
      bodyContent = SliverToBoxAdapter(child: ErrorState(onRetry: _refresh));
    } else {
      if (filteredCategories.isEmpty && filteredProducts.isEmpty) {
        bodyContent = SliverToBoxAdapter(
          child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 20),
          child: Column(
            children: [
              const Icon(Icons.grid_off_rounded, size: 56, color: Colors.grey),
              const SizedBox(height: 12),
              Text(
                filteredCategories.isEmpty && filteredProducts.isEmpty
                    ? 'Store is being stocked'
                    : 'No products in ${currentSuperCat?['name'] ?? selectedSuperCat}',
                style: AppTypography.h3(
                  isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'Admin is adding new items and categories here. Check back soon or view all products.',
                textAlign: TextAlign.center,
                style: AppTypography.bodySmall(
                  isDark
                      ? AppColors.textSecondaryDark
                      : AppColors.textSecondary,
                ),
              ),
              const SizedBox(height: 16),
              ElevatedButton.icon(
                onPressed: () {
                  ref.read(selectedSuperCategoryProvider.notifier).state =
                      'all';
                },
                icon: const Icon(Icons.grid_view_rounded, size: 18),
                label: const Text('View All Categories'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(20),
                  ),
                ),
              ),
            ],
          ),
          ),
        );
      } else {
        bodyContent = _HomeContent(
          categories: filteredCategories,
          trendingCategories: trendingCategories,
          products: filteredProducts,
          selectedSuperCategory: currentSuperCat,
          selectedSlug: selectedSuperCat,
          onOpenProduct: (p) => context.push('/product/${p.id}'),
          onOpenCategory: (id) => context.push(
            selectedSuperCat != 'all' && selectedSuperCat.isNotEmpty
                ? '/category/$id?superCategory=${Uri.encodeComponent(selectedSuperCat)}'
                : '/category/$id',
          ),
          onAdd: (p) {
            final added = ref.read(cartProvider.notifier).addToCart(p);
            if (added) {
              AppToast.success('${p.name} added to cart');
            } else {
              AppToast.info('You can add up to $kMaxQtyPerItem of an item');
            }
          },
        );
      }
    }

    final surfaceColor = isDark ? AppColors.surfaceDark : AppColors.surface;

    final statusBarHeight = MediaQuery.paddingOf(context).top;

    Color? festivalTopColor;
    LinearGradient? topBarGradient;
    LinearGradient? headerNavGradient;
    LinearGradient? festivalSectionGradient;

    if (isFestivalActive && festivalTheme != null) {
      final bg = festivalTheme.backgroundGradient;
      final gStart = bg.colors.first;
      final gEnd = bg.colors.last;

      festivalTopColor = gStart;
      topBarGradient = LinearGradient(
        colors: [gStart, Color.lerp(gStart, gEnd, 0.27)!],
        begin: bg.begin,
        end: bg.end,
      );
      headerNavGradient = LinearGradient(
        colors: [
          Color.lerp(gStart, gEnd, 0.27)!,
          Color.lerp(gStart, gEnd, 0.38)!,
        ],
        begin: bg.begin,
        end: bg.end,
      );
      festivalSectionGradient = LinearGradient(
        colors: [Color.lerp(gStart, gEnd, 0.38)!, gEnd],
        begin: bg.begin,
        end: bg.end,
      );
    }

    return Scaffold(
      resizeToAvoidBottomInset: false,
      backgroundColor: isDark ? AppColors.backgroundDark : AppColors.background,
      body: RefreshIndicator(
        color: AppColors.primary,
        onRefresh: () async => _refresh(),
        child: CustomScrollView(
          controller: _scrollController,
          physics: const AlwaysScrollableScrollPhysics(
            parent: BouncingScrollPhysics(),
          ),
          slivers: [
            // 0. Status-bar shield — pinned so content never scrolls under
            //    the system status bar once the top bar has scrolled away.
            if (statusBarHeight > 0)
              SliverPersistentHeader(
                pinned: true,
                delegate: _HeaderNavSliverDelegate(
                  height: statusBarHeight,
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    color: isFestivalHeaderActive && festivalTopColor != null
                        ? festivalTopColor
                        : surfaceColor,
                  ),
                ),
              ),

            // 1. Location row then search bar — plain box, so scrolling down
            //    hides the location first and the search bar right after
            //    (and reveals them in reverse on the way back up).
            SliverToBoxAdapter(
              child: Container(
                key: _topBarKey,
                decoration: isFestivalActive && topBarGradient != null
                    ? BoxDecoration(gradient: topBarGradient)
                    : BoxDecoration(color: surfaceColor),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [locationHeader, searchHeader],
                ),
              ),
            ),

            // 2. Super Category Navigation — the only part pinned at the top.
            SliverPersistentHeader(
              pinned: true,
              delegate: _HeaderNavSliverDelegate(
                height: 59.0,
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  decoration:
                      isFestivalHeaderActive && headerNavGradient != null
                      ? BoxDecoration(gradient: headerNavGradient)
                      : BoxDecoration(color: surfaceColor),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      superCatNav,
                      if (!isFestivalHeaderActive)
                        Divider(
                          height: 1,
                          thickness: 1,
                          color: isDark
                              ? AppColors.dividerDark
                              : AppColors.divider,
                        ),
                    ],
                  ),
                ),
              ),
            ),

            // 3. Festival Campaign Section (Festival title, banner, Blinkit group cards, scallop arch) — NOT pinned!
            if (isFestivalActive && festivalTheme != null)
              SliverToBoxAdapter(
                child: Container(
                  decoration: BoxDecoration(gradient: festivalSectionGradient),
                  child: FestivalCampaignSection(
                    campaign: campaign,
                    onOpenCategory: (catId) => context.push('/category/$catId'),
                  ),
                ),
              ),

            // 4. Normal Home Sections below festival section (lazy SliverList
            //    in the content branch, so tabs switch without building the
            //    whole page up front).
            bodyContent,
          ],
        ),
      ),
    );
  }

  (
    List<CategoryModel>,
    List<ProductModel>,
    Map<String, dynamic>?,
    List<CategoryModel>,
  )
  _filterCatalog(
    String selectedSlug,
    List<Map<String, dynamic>> superCats,
    List<CategoryModel> allCategories,
    List<ProductModel> allProducts,
  ) {
    if (selectedSlug == 'all' || selectedSlug.isEmpty) {
      return (allCategories, allProducts, null, allCategories);
    }

    Map<String, dynamic>? currentSc;
    for (final sc in superCats) {
      final slug = (sc['slug'] ?? sc['id'] ?? '').toString().toLowerCase();
      final id = (sc['id'] ?? '').toString().toLowerCase();
      final sel = selectedSlug.toLowerCase();
      if (slug == sel || id == sel || id == 'sc_$sel' || slug == 'sc_$sel') {
        currentSc = sc;
        break;
      }
    }

    final scCats =
        (currentSc?['categories'] as List?)
            ?.map((e) => e.toString().toLowerCase())
            .toSet() ??
        {};
    final scSubCats =
        (currentSc?['subCategories'] as List?)
            ?.map((e) => e.toString().toLowerCase())
            .toSet() ??
        {};
    final scProds =
        (currentSc?['products'] as List?)?.map((e) => e.toString()).toSet() ??
        {};

    final matchedCategories = allCategories.where((c) {
      final catId = c.id.toLowerCase();
      final catName = c.name.toLowerCase();

      // Explicit Admin mapping
      if (scCats.contains(catId) || scCats.contains(catName)) return true;

      if (scSubCats.isNotEmpty) {
        final hasSub = c.subCategories.any(
          (sub) => scSubCats.contains(sub.toLowerCase()),
        );
        if (hasSub) return true;
      }

      if (scProds.isNotEmpty) {
        final hasProd = allProducts.any(
          (p) =>
              scProds.contains(p.id) && (p.categoryId.toLowerCase() == catId),
        );
        if (hasProd) return true;
      }

      // Predefined slug keyword matchers — only used as a fallback when the
      // admin hasn't explicitly configured this super category yet, so a
      // configured tab shows exactly the same categories as the web (which
      // has no keyword heuristics), instead of extra guessed matches.
      if (scCats.isNotEmpty || scSubCats.isNotEmpty || scProds.isNotEmpty) {
        return false;
      }
      final sel = selectedSlug.toLowerCase();
      if (sel == 'cafe' || sel == 'sc_cafe') {
        return catId.contains('dairy') ||
            catId.contains('bread') ||
            catId.contains('egg') ||
            catId.contains('bakery') ||
            catId.contains('biscuit') ||
            catId.contains('snack') ||
            catId.contains('beverage') ||
            catId.contains('tea') ||
            catId.contains('coffee') ||
            catId.contains('drink');
      } else if (sel == 'decor' || sel == 'sc_decor' || sel == 'home' || sel == 'sc_home') {
        return catId.contains('decor') ||
            catId.contains('home') ||
            catId.contains('cleaning') ||
            catId.contains('household') ||
            catId.contains('kitchen') ||
            catId.contains('atta') ||
            catId.contains('rice') ||
            catId.contains('oil') ||
            catId.contains('dals') ||
            catId.contains('grocery');
      } else if (sel == 'pharmacy' || sel == 'sc_pharmacy') {
        return catId.contains('pharmacy') ||
            catId.contains('medicine') ||
            catId.contains('health') ||
            catId.contains('care') ||
            catId.contains('wellness') ||
            catId.contains('baby');
      } else if (sel == 'electronics' || sel == 'sc_electronics') {
        return catId.contains('electronic') ||
            catId.contains('gadget') ||
            catId.contains('appliance') ||
            catId.contains('audio');
      } else if (sel == 'fresh' || sel == 'sc_fresh') {
        return catId.contains('fruit') ||
            catId.contains('veg') ||
            catId.contains('fresh') ||
            catId.contains('meat') ||
            catId.contains('fish');
      } else if (sel == 'beauty' || sel == 'sc_beauty') {
        return catId.contains('beauty') ||
            catId.contains('personal') ||
            catId.contains('care') ||
            catId.contains('skincare');
      } else if (sel == 'fashion' || sel == 'sc_fashion') {
        return catId.contains('fashion') ||
            catId.contains('clothing') ||
            catId.contains('wear');
      }

      return false;
    }).toList();

    final matchedCatIds = matchedCategories
        .map((c) => c.id.toLowerCase())
        .toSet();

    final matchedProducts = allProducts.where((p) {
      if (scProds.contains(p.id)) return true;
      final pCat = p.categoryId.toLowerCase();
      return matchedCatIds.contains(pCat);
    }).toList();

    // Whole categories explicitly assigned by the admin (as opposed to a
    // category pulled in only because one of its subcategories was picked).
    // This is what the "Trending Now" / category circles row shows — it must
    // match the web, which only ever shows explicit whole-category picks.
    final explicitCategories = scCats.isNotEmpty
        ? matchedCategories.where((c) {
            final catId = c.id.toLowerCase();
            final catName = c.name.toLowerCase();
            return scCats.contains(catId) || scCats.contains(catName);
          }).toList()
        : matchedCategories;

    return (matchedCategories, matchedProducts, currentSc, explicitCategories);
  }
}

class _HeaderNavSliverDelegate extends SliverPersistentHeaderDelegate {
  final Widget child;
  final double height;

  _HeaderNavSliverDelegate({required this.child, required this.height});

  @override
  Widget build(
    BuildContext context,
    double shrinkOffset,
    bool overlapsContent,
  ) {
    return SizedBox.expand(child: child);
  }

  @override
  double get maxExtent => height;

  @override
  double get minExtent => height;

  @override
  bool shouldRebuild(covariant _HeaderNavSliverDelegate oldDelegate) {
    return oldDelegate.height != height || oldDelegate.child != child;
  }
}

class _HomeContent extends ConsumerWidget {
  final List<CategoryModel> categories;
  final List<CategoryModel>? trendingCategories;
  final List<ProductModel> products;
  final Map<String, dynamic>? selectedSuperCategory;
  final String selectedSlug;
  final ValueChanged<ProductModel> onOpenProduct;
  final ValueChanged<String> onOpenCategory;
  final ValueChanged<ProductModel> onAdd;

  const _HomeContent({
    required this.categories,
    this.trendingCategories,
    required this.products,
    this.selectedSuperCategory,
    this.selectedSlug = 'all',
    required this.onOpenProduct,
    required this.onOpenCategory,
    required this.onAdd,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sections = _sections(context, ref);
    // Lazy sliver list — sections below the fold don't build / lay out / decode
    // their images until they scroll into view. This is what keeps a super-
    // category tab switch cheap and stops the "blank until you scroll" gap.
    return SliverList(
      delegate: SliverChildBuilderDelegate(
        (context, i) => sections[i],
        childCount: sections.length,
        addAutomaticKeepAlives: false,
        addRepaintBoundaries: true,
      ),
    );
  }

  List<Widget> _sections(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final banners = ref.watch(bannersProvider).valueOrNull ?? const [];
    final groups = ref.watch(specialGroupsProvider).valueOrNull ?? const [];

    final fresh = products.where((p) => p.isFreshPick).take(10).toList();
    final organic = products.where((p) => p.isOrganic).take(10).toList();
    final bestSellers = products.where((p) => p.isBestSeller).take(10).toList();

    // Admin-managed special groups for the current tab (Home = 'all', or a
    // super category), filtered by position.
    String norm(String v) => v.toLowerCase().replaceFirst(RegExp(r'^sc_'), '');
    final page = norm(selectedSlug.isEmpty ? 'all' : selectedSlug);
    bool targetsThisPage(Map<String, dynamic> g) {
      final t = (g['superCategories'] as List?)?.map((e) => norm('$e')).toList() ?? const [];
      return (t.isEmpty ? const ['all'] : t).contains(page);
    }

    List<Widget> groupsAt(bool Function(int position) test) {
      return [
        for (final g in groups)
          if (g['active'] != false &&
              ((g['items'] as List?)?.isNotEmpty ?? false) &&
              targetsThisPage(g) &&
              test(((g['insertAfterSubCategoryIndex'] as num?)?.toInt() ?? 0)))
            _SpecialGroup(group: Map<String, dynamic>.from(g)),
      ];
    }

    ProductRail rail(
      String title,
      String? sub,
      List<ProductModel> items, [
      String? catId,
    ]) => ProductRail(
      title: title,
      subtitle: sub,
      products: items,
      onOpen: onOpenProduct,
      onAdd: onAdd,
      onSeeAll: catId == null ? null : () => onOpenCategory(catId),
    );

    final shelfCategories = [
      for (final c in categories)
        if (products.any((p) => p.categoryId == c.id)) c,
    ];
    final categoryShelfCount = shelfCategories.length;
    final categoryBlocks = <Widget>[
      for (var i = 0; i < shelfCategories.length; i++) ...[
        rail(
          shelfCategories[i].name,
          null,
          products.where((p) => p.categoryId == shelfCategories[i].id).take(12).toList(),
          shelfCategories[i].id,
        ),
        ...groupsAt((n) => n == i + 1),
      ],
    ];

    final bannerUrl = selectedSuperCategory?['banner'] as String?;

    return <Widget>[
        // Optional Super Category Banner when admin uploads a banner for a super category
        if (bannerUrl != null && bannerUrl.trim().isNotEmpty) ...[
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
            child: ClipRRect(
              borderRadius: AppRadius.brLg,
              child: SizedBox(
                height: 130,
                width: double.infinity,
                child: smartImage(
                  url: bannerUrl,
                  fit: BoxFit.cover,
                  errorBuilder: (_) => const SizedBox.shrink(),
                ),
              ),
            ),
          ),
        ],

        // Special groups placed at the top (position 0 / unset). On a super
        // category tab they appear right after the banner, before the
        // category circles row, matching the web super-category layout. On
        // the main Home ("all") tab they instead appear after "Shop by
        // category" + "Bestsellers" below.
        if (selectedSlug != 'all') ...groupsAt((n) => n <= 0),

        // Shop by category — uses only the admin's explicit whole-category
        // picks for this super category (not categories pulled in only
        // because one of their subcategories was picked), matching the web.
        if ((trendingCategories ?? categories).isNotEmpty) ...[
          const SizedBox(height: 16),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Text(
              selectedSlug == 'all' ? 'Shop by category' : 'Trending Now',
              style: AppTypography.sectionHeading(
                isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
              ),
            ),
          ),
          const SizedBox(height: 12),
          Builder(
            builder: (context) {
              final gridCategories = trendingCategories ?? categories;
              final screenW = MediaQuery.of(context).size.width;
              final availableW = screenW - 32;
              final isMultiRow = gridCategories.length > 4;

              final int numCols;
              if (!isMultiRow) {
                numCols = gridCategories.length;
              } else {
                final fullBlocks = gridCategories.length ~/ 8;
                final rem = gridCategories.length % 8;
                final extraCols = rem == 0 ? 0 : (rem <= 4 ? rem : 4);
                numCols = fullBlocks * 4 + extraCols;
              }

              final itemW = (availableW - (3 * 10)) / 4;
              final rowH = isMultiRow ? 82.0 : 86.0;
              final gridH = isMultiRow ? 174.0 : 86.0;
              final aspect = rowH / itemW;

              return SizedBox(
                height: gridH,
                child: GridView.builder(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  physics: const BouncingScrollPhysics(),
                  itemCount: isMultiRow ? numCols * 2 : gridCategories.length,
                  gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: isMultiRow ? 2 : 1,
                    mainAxisSpacing: 10,
                    crossAxisSpacing: 10,
                    childAspectRatio: aspect,
                  ),
                  itemBuilder: (context, i) {
                    final int catIndex;
                    if (isMultiRow) {
                      final col = i ~/ 2;
                      final row = i % 2;
                      final block = col ~/ 4;
                      final colInBlock = col % 4;
                      catIndex = row == 0
                          ? (block * 8) + colInBlock
                          : (block * 8) + 4 + colInBlock;
                    } else {
                      catIndex = i;
                    }

                    if (catIndex >= gridCategories.length) {
                      return const SizedBox.shrink();
                    }

                    return CategoryCard(
                      category: gridCategories[catIndex],
                      onTap: () => onOpenCategory(gridCategories[catIndex].id),
                    );
                  },
                ),
              );
            },
          ),
        ],

        // Bestsellers: only products that have actually sold, ranked live.
        // Only shown on the main Home ("all") tab — super category pages
        // don't need it, matching the web layout.
        if (selectedSlug == 'all')
          CategoryShelfSection(
            title: 'Bestsellers',
            categories: categories,
            products: products,
            productSales: ref.watch(productSalesProvider).valueOrNull ?? const {},
          ),

        // Special groups placed at the top (position 0 / unset) — on Home,
        // these render after "Shop by category" + "Bestsellers" above.
        if (selectedSlug == 'all') ...groupsAt((n) => n <= 0),

        // Promotional banners (Only on All tab or when banners exist)
        if (selectedSlug == 'all' && banners.isNotEmpty)
          _BannerCarousel(banners: banners),

        // Curated shelves
        if (fresh.isNotEmpty)
          rail(
            'Fresh today',
            'Picked this morning, delivered in minutes',
            fresh,
          ),
        if (organic.isNotEmpty)
          rail('Organic collection', 'Certified chemical-free', organic),
        if (bestSellers.isNotEmpty)
          rail(
            'Best sellers',
            'What customers are buying this week',
            bestSellers,
          ),

        // Per-category shelves; a special group with position N appears right
        // after the Nth shelf (same rule as the web), anything beyond the last
        // shelf (e.g. 99) goes at the bottom.
        ...categoryBlocks,
        ...groupsAt((n) => n > categoryShelfCount),

        const _TrustRow(),
        const SizedBox(height: 32),
      ];
  }
}

class _BannerCarousel extends StatefulWidget {
  final List<dynamic> banners;
  const _BannerCarousel({required this.banners});

  @override
  State<_BannerCarousel> createState() => _BannerCarouselState();
}

class _BannerCarouselState extends State<_BannerCarousel> {
  final _controller = PageController(viewportFraction: 0.9);
  int _page = 0;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final activeBanners = widget.banners.where((item) {
      if (item is! Map) return false;
      final b = Map<String, dynamic>.from(item);
      final active = b['active'] ?? b['isActive'];
      if (active == false || active == 0) return false;
      final img = (b['imageUrl'] ?? b['image'] ?? '').toString().trim();
      return img.isNotEmpty && img.startsWith('http');
    }).toList();

    if (activeBanners.isEmpty) return const SizedBox.shrink();

    return Padding(
      padding: const EdgeInsets.only(top: 16),
      child: Column(
        children: [
          SizedBox(
            height: 150,
            child: PageView.builder(
              controller: _controller,
              onPageChanged: (i) => setState(() => _page = i),
              itemCount: activeBanners.length,
              itemBuilder: (context, i) {
                final b = Map<String, dynamic>.from(activeBanners[i] as Map);
                final img = (b['imageUrl'] ?? b['image'] ?? '') as String;
                final route = resolveAppRoute((b['linkUrl'] ?? '') as String);
                return GestureDetector(
                  onTap: route == null ? null : () => context.push(route),
                  child: Container(
                    margin: const EdgeInsets.symmetric(horizontal: 6),
                    clipBehavior: Clip.antiAlias,
                    decoration: BoxDecoration(
                      borderRadius: AppRadius.brLg,
                      color: Colors.black12,
                    ),
                    child: smartImage(
                      url: img,
                      fit: BoxFit.cover,
                      errorBuilder: (_) => const SizedBox.shrink(),
                    ),
                  ),
                );
              },
            ),
          ),
          if (activeBanners.length > 1) ...[
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(activeBanners.length, (i) {
                final active = i == _page;
                return AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  margin: const EdgeInsets.symmetric(horizontal: 3),
                  width: active ? 16 : 6,
                  height: 6,
                  decoration: BoxDecoration(
                    color: active ? AppColors.primary : Colors.black26,
                    borderRadius: BorderRadius.circular(3),
                  ),
                );
              }),
            ),
          ],
        ],
      ),
    );
  }
}

// Admin-uploaded group item images may be a normal http(s) URL, or a raw
// `data:image/...;base64,` URI when the CDN upload failed and the web admin
// fell back to storing the picked file inline — same fallback the web uses
// (SpecialGroupBlock.tsx) so a group item without a usable image still shows
// a real photo instead of a bare icon glyph.
const _kGroupItemImageFallback =
    'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=300&auto=format&fit=crop';

Widget _groupItemImage(String img) {
  final usable = img.trim().isEmpty ? _kGroupItemImageFallback : img;
  return smartImage(
    url: usable,
    fit: BoxFit.cover,
    errorBuilder: (_) => const Icon(Icons.category_outlined, size: 20),
  );
}

class _SpecialGroup extends StatelessWidget {
  final Map<String, dynamic> group;
  const _SpecialGroup({required this.group});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final items = (group['items'] as List?) ?? const [];
    if (items.isEmpty) return const SizedBox.shrink();
    final title = (group['title'] as String?) ?? 'Explore';

    // Blinkit style: no card around the group — heading, then a plain 4-column
    // grid of tinted rounded tiles with the name underneath.
    final textColor = isDark ? AppColors.textPrimaryDark : AppColors.textPrimary;
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 24, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: AppTypography.sectionHeading(textColor)),
          const SizedBox(height: 12),
          LayoutBuilder(
            builder: (context, c) {
              const gap = 10.0;
              final tile = (c.maxWidth - gap * 3) / 4;
              return GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                padding: EdgeInsets.zero,
                itemCount: items.length,
                gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 4,
                  mainAxisSpacing: 16,
                  crossAxisSpacing: gap,
                  mainAxisExtent: tile + 6 + 32, // tile + gap + two label lines
                ),
                itemBuilder: (context, i) {
                  final it = Map<String, dynamic>.from(items[i] as Map);
                  final img = (it['image'] ?? '') as String;
                  final name = (it['name'] ?? '') as String;
                  final route = resolveAppRoute((it['link'] ?? '') as String);
                  return GestureDetector(
                    onTap: route == null ? null : () => context.push(route),
                    behavior: HitTestBehavior.opaque,
                    child: Column(
                      children: [
                        Container(
                          width: tile,
                          height: tile,
                          clipBehavior: Clip.antiAlias,
                          decoration: BoxDecoration(
                            color: isDark ? const Color(0xFF1E2A2E) : const Color(0xFFEAF4F7),
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: _groupItemImage(img),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          name,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 12,
                            height: 1.25,
                            fontWeight: FontWeight.w600,
                            color: textColor,
                          ),
                        ),
                      ],
                    ),
                  );
                },
              );
            },
          ),
        ],
      ),
    );
  }
}

class _TrustRow extends StatelessWidget {
  const _TrustRow();

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    const items = [
      (Icons.bolt_rounded, 'Fast delivery', 'In minutes, or it\'s free'),
      (Icons.verified_outlined, 'Direct from farms', 'Sourced fresh, daily'),
      (Icons.replay_rounded, 'Easy returns', 'Refund at the door'),
    ];
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 24, 16, 0),
      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surface,
        borderRadius: AppRadius.brLg,
        border: Border.all(
          color: isDark ? AppColors.dividerDark : AppColors.divider,
        ),
      ),
      child: Row(
        children: [
          for (final (icon, title, sub) in items)
            Expanded(
              child: Column(
                children: [
                  Icon(icon, color: AppColors.primary, size: 22),
                  const SizedBox(height: 6),
                  Text(
                    title,
                    textAlign: TextAlign.center,
                    style: AppTypography.labelMedium(
                      isDark
                          ? AppColors.textPrimaryDark
                          : AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    sub,
                    textAlign: TextAlign.center,
                    style: AppTypography.labelSmall(
                      isDark
                          ? AppColors.textSecondaryDark
                          : AppColors.textSecondary,
                    ).copyWith(fontWeight: FontWeight.w400),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _HomeSkeleton extends StatelessWidget {
  const _HomeSkeleton();

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: const [
        SizedBox(height: 24),
        ProductRailSkeleton(),
        ProductRailSkeleton(),
        ProductRailSkeleton(),
      ],
    );
  }
}

class _SuperCategoryNav extends ConsumerStatefulWidget {
  final bool isFestivalActive;
  const _SuperCategoryNav({this.isFestivalActive = false});

  @override
  ConsumerState<_SuperCategoryNav> createState() => _SuperCategoryNavState();
}

class _SuperCategoryNavState extends ConsumerState<_SuperCategoryNav> {
  final ScrollController _scrollController = ScrollController();

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToIndex(int index, double itemWidth, double screenWidth) {
    if (!_scrollController.hasClients) return;
    final targetOffset = (index * itemWidth) - (screenWidth / 2) + (itemWidth / 2) + 16;
    final maxScroll = _scrollController.position.maxScrollExtent;
    final minScroll = _scrollController.position.minScrollExtent;
    final clampedOffset = targetOffset.clamp(minScroll, maxScroll);
    _scrollController.animateTo(
      clampedOffset,
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeOutCubic,
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final superCatsAsync = ref.watch(superCategoriesProvider);
    final selectedSlug = ref.watch(selectedSuperCategoryProvider);

    final rawSuperCats =
        superCatsAsync.valueOrNull ??
        const [
          {'id': 'sc_all', 'name': 'All', 'slug': 'all', 'icon': 'LayoutGrid'},
          {'id': 'sc_cafe', 'name': 'Cafe', 'slug': 'cafe', 'icon': 'Coffee'},
          {'id': 'sc_decor', 'name': 'Decor', 'slug': 'decor', 'icon': 'Chair'},
          {'id': 'sc_pharmacy', 'name': 'Pharmacy', 'slug': 'pharmacy', 'icon': 'Pharmacy'},
          {'id': 'sc_fresh', 'name': 'Fresh', 'slug': 'fresh', 'icon': 'Leaf'},
          {
            'id': 'sc_electronics',
            'name': 'Electronics',
            'slug': 'electronics',
            'icon': 'Headphones',
          },
          {
            'id': 'sc_beauty',
            'name': 'Beauty',
            'slug': 'beauty',
            'icon': 'Sparkles',
          },
          {
            'id': 'sc_fashion',
            'name': 'Fashion',
            'slug': 'fashion',
            'icon': 'Shirt',
          },
        ];

    final superCats = rawSuperCats.take(10).toList();
    final screenWidth = MediaQuery.of(context).size.width;
    // Show 5 super categories in view + 6th icon peeking (~25% of width)
    final itemWidth = (screenWidth - 32) / 5.25;

    // The festival nav sits transparently over a light pastel gradient
    // (see FestivalThemeResolver) regardless of the app's own light/dark
    // setting, so it must never fall back to dark-mode (white/light) text —
    // that would be invisible against the light festival background.
    final useDarkPalette = isDark && !widget.isFestivalActive;

    return Container(
      color: widget.isFestivalActive
          ? Colors.transparent
          : (isDark ? AppColors.surfaceDark : AppColors.surface),
      height: 58,
      child: Stack(
        alignment: Alignment.bottomCenter,
        children: [
          // Blinkit-style full-width bottom border line
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: Container(
              height: 1,
              color: widget.isFestivalActive
                  ? Colors.black12
                  : (isDark ? AppColors.dividerDark : const Color(0xFFE5E7EB)),
            ),
          ),
          ListView.builder(
            controller: _scrollController,
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            physics: const BouncingScrollPhysics(),
            itemCount: superCats.length,
            itemBuilder: (context, i) {
              final sc = superCats[i];
              final name = (sc['name'] ?? sc['displayName'] ?? 'Category') as String;
              final slug = (sc['slug'] ?? sc['id'] ?? name.toLowerCase()) as String;
              final iconKey = sc['icon'] as String?;
              final isSelected =
                  selectedSlug == slug || (selectedSlug == '' && slug == 'all');
              // Black strip (web parity): the active tab reads through its
              // filled icon + bold label + underline, the rest stay outlined.
              final ink = useDarkPalette ? Colors.white : Colors.black;

              return SizedBox(
                width: itemWidth,
                child: InkWell(
                  onTap: () {
                    ref.read(selectedSuperCategoryProvider.notifier).state = slug;
                    _scrollToIndex(i, itemWidth, screenWidth);
                  },
                  borderRadius: BorderRadius.circular(8),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      SuperCategoryIcon(
                        iconKey: superCatIconKey(name, iconKey),
                        filled: isSelected,
                        color: ink,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight:
                              isSelected ? FontWeight.w800 : FontWeight.w500,
                          color: ink,
                        ),
                      ),
                      const SizedBox(height: 2),
                      AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        height: 2.5,
                        width: isSelected ? 28 : 0,
                        decoration: BoxDecoration(
                          color: ink,
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}
