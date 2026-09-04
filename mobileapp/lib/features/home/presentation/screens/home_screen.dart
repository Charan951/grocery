import 'package:cached_network_image/cached_network_image.dart';
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
import 'package:freshcart/features/authentication/presentation/controllers/auth_controller.dart';
import 'package:freshcart/features/cart/presentation/controllers/cart_controller.dart';
import 'package:freshcart/features/categories/data/models/category_model.dart';
import 'package:freshcart/features/home/presentation/controllers/catalog_providers.dart';
import 'package:freshcart/features/home/presentation/widgets/home_header.dart';
import 'package:freshcart/features/home/presentation/widgets/product_rail.dart';
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
  bool _isScrolledPastFestival = false;

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
  }

  void _onScroll() {
    if (_scrollController.hasClients) {
      final isPast = _scrollController.offset > 140.0;
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

    final locationHeader = LocationHeader(
      addressLine: address,
      onAddressTap: () => context.push('/location_select'),
      onProfileTap: () => context.go('/account'),
      onNotificationsTap: () => context.push('/notifications'),
      backgroundColor: isFestivalActive ? Colors.transparent : null,
    );

    final stickyHeader = SearchBarHeader(
      cartCount: cartCount,
      onSearchTap: () => context.push('/search_detail'),
      onCartTap: () => context.push('/cart'),
      backgroundColor: isFestivalHeaderActive ? Colors.transparent : null,
    );

    final superCatNav = _SuperCategoryNav(
      isFestivalActive: isFestivalHeaderActive,
    );

    Widget bodyContent;
    if (categoriesAsync.isLoading && productsAsync.isLoading) {
      bodyContent = const _HomeSkeleton();
    } else if (categoriesAsync.hasError && productsAsync.hasError) {
      bodyContent = ErrorState(onRetry: _refresh);
    } else {
      if (filteredCategories.isEmpty && filteredProducts.isEmpty) {
        bodyContent = Padding(
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
        );
      } else {
        bodyContent = _HomeContent(
          categories: filteredCategories,
          products: filteredProducts,
          selectedSuperCategory: currentSuperCat,
          selectedSlug: selectedSuperCat,
          onOpenProduct: (p) => context.push('/product/${p.id}'),
          onOpenCategory: (id) => context.push('/category/$id'),
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

    LinearGradient? locationGradient;
    LinearGradient? headerNavGradient;
    LinearGradient? festivalSectionGradient;

    if (isFestivalActive && festivalTheme != null) {
      final bg = festivalTheme.backgroundGradient;
      final gStart = bg.colors.first;
      final gEnd = bg.colors.last;

      locationGradient = LinearGradient(
        colors: [gStart, Color.lerp(gStart, gEnd, 0.15)!],
        begin: bg.begin,
        end: bg.end,
      );
      headerNavGradient = LinearGradient(
        colors: [
          Color.lerp(gStart, gEnd, 0.15)!,
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
            // 1. Location Header (Scrolls out of view first when scrolling down)
            SliverToBoxAdapter(
              child: Container(
                decoration: isFestivalActive && locationGradient != null
                    ? BoxDecoration(gradient: locationGradient)
                    : BoxDecoration(color: surfaceColor),
                child: locationHeader,
              ),
            ),

            // 2. Persistent Sticky Navigation: Search Bar + Super Category Navigation (Pinned at top)
            SliverPersistentHeader(
              pinned: true,
              delegate: _HeaderNavSliverDelegate(
                height: 120.0,
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  decoration:
                      isFestivalHeaderActive && headerNavGradient != null
                      ? BoxDecoration(gradient: headerNavGradient)
                      : BoxDecoration(color: surfaceColor),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      stickyHeader,
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

            // 4. Normal Home Sections below festival section
            SliverToBoxAdapter(child: bodyContent),
          ],
        ),
      ),
    );
  }

  (List<CategoryModel>, List<ProductModel>, Map<String, dynamic>?)
  _filterCatalog(
    String selectedSlug,
    List<Map<String, dynamic>> superCats,
    List<CategoryModel> allCategories,
    List<ProductModel> allProducts,
  ) {
    if (selectedSlug == 'all' || selectedSlug.isEmpty) {
      return (allCategories, allProducts, null);
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

      // Predefined slug keyword matchers
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

    return (matchedCategories, matchedProducts, currentSc);
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
  final List<ProductModel> products;
  final Map<String, dynamic>? selectedSuperCategory;
  final String selectedSlug;
  final ValueChanged<ProductModel> onOpenProduct;
  final ValueChanged<String> onOpenCategory;
  final ValueChanged<ProductModel> onAdd;

  const _HomeContent({
    required this.categories,
    required this.products,
    this.selectedSuperCategory,
    this.selectedSlug = 'all',
    required this.onOpenProduct,
    required this.onOpenCategory,
    required this.onAdd,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final banners = ref.watch(bannersProvider).valueOrNull ?? const [];
    final groups = ref.watch(specialGroupsProvider).valueOrNull ?? const [];

    final fresh = products.where((p) => p.isFreshPick).take(10).toList();
    final organic = products.where((p) => p.isOrganic).take(10).toList();
    final bestSellers = products.where((p) => p.isBestSeller).take(10).toList();

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

    final bannerUrl = selectedSuperCategory?['banner'] as String?;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        // Optional Super Category Banner when admin uploads a banner for a super category
        if (bannerUrl != null && bannerUrl.trim().isNotEmpty) ...[
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
            child: ClipRRect(
              borderRadius: AppRadius.brLg,
              child: CachedNetworkImage(
                imageUrl: bannerUrl,
                height: 130,
                width: double.infinity,
                fit: BoxFit.cover,
                errorWidget: (context, url, error) => const SizedBox.shrink(),
              ),
            ),
          ),
        ],

        // Shop by category
        if (categories.isNotEmpty) ...[
          const SizedBox(height: 16),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Text(
              selectedSlug == 'all'
                  ? 'Shop by category'
                  : '${selectedSuperCategory?['name'] ?? selectedSlug} Categories',
              style: AppTypography.h3(
                isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
              ),
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 108,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              physics: const BouncingScrollPhysics(),
              itemCount: categories.length,
              separatorBuilder: (_, _) => const SizedBox(width: 12),
              itemBuilder: (context, i) => CategoryCard(
                category: categories[i],
                onTap: () => onOpenCategory(categories[i].id),
              ),
            ),
          ),
        ],

        // Promotional banners (Only on All tab or when banners exist)
        if (selectedSlug == 'all' && banners.isNotEmpty)
          _BannerCarousel(banners: banners),

        // Special groups (Only on All tab or relevant)
        if (selectedSlug == 'all')
          for (final g in groups)
            _SpecialGroup(group: Map<String, dynamic>.from(g as Map)),

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

        // Per-category shelves
        for (final c in categories)
          if (products.any((p) => p.categoryId == c.id))
            rail(
              c.name,
              null,
              products.where((p) => p.categoryId == c.id).take(12).toList(),
              c.id,
            ),

        const _TrustRow(),
        const SizedBox(height: 32),
      ],
    );
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
                    child: CachedNetworkImage(imageUrl: img, fit: BoxFit.cover),
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

class _SpecialGroup extends StatelessWidget {
  final Map<String, dynamic> group;
  const _SpecialGroup({required this.group});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final items = (group['items'] as List?) ?? const [];
    if (items.isEmpty) return const SizedBox.shrink();
    final title = (group['title'] as String?) ?? 'Explore';

    return Container(
      margin: const EdgeInsets.fromLTRB(16, 20, 16, 0),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surface,
        borderRadius: AppRadius.brLg,
        border: Border.all(
          color: isDark ? AppColors.dividerDark : AppColors.divider,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: AppTypography.title(
              isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 12),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            padding: EdgeInsets.zero,
            itemCount: items.length,
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 4,
              mainAxisSpacing: 10,
              crossAxisSpacing: 10,
              childAspectRatio: 0.78,
            ),
            itemBuilder: (context, i) {
              final it = Map<String, dynamic>.from(items[i] as Map);
              final img = (it['image'] ?? '') as String;
              final name = (it['name'] ?? '') as String;
              final route = resolveAppRoute((it['link'] ?? '') as String);
              return GestureDetector(
                onTap: route == null ? null : () => context.push(route),
                child: Column(
                  children: [
                    Expanded(
                      child: Container(
                        width: double.infinity,
                        clipBehavior: Clip.antiAlias,
                        decoration: BoxDecoration(
                          color: isDark ? Colors.white10 : AppColors.background,
                          borderRadius: AppRadius.brMd,
                        ),
                        child: img.startsWith('http')
                            ? Padding(
                                padding: const EdgeInsets.all(6),
                                child: CachedNetworkImage(
                                  imageUrl: img,
                                  fit: BoxFit.contain,
                                  // ignore: unnecessary_underscores
                                  errorWidget: (_, _, ___) => const Icon(
                                    Icons.category_outlined,
                                    size: 20,
                                  ),
                                ),
                              )
                            : const Icon(Icons.category_outlined, size: 20),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      textAlign: TextAlign.center,
                      style: AppTypography.labelSmall(
                        isDark
                            ? AppColors.textPrimaryDark
                            : AppColors.textPrimary,
                      ),
                    ),
                  ],
                ),
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

  IconData _iconFor(String? name, String? iconKey) {
    final key = '${iconKey ?? ''} ${name ?? ''}'.toLowerCase();
    if (key.contains('grid') || key.contains('all')) {
      return Icons.grid_view_rounded;
    }
    if (key.contains('coffee') || key.contains('cafe')) {
      return Icons.local_cafe_rounded;
    }
    if (key.contains('decor') || key.contains('chair') || key.contains('home')) {
      return Icons.chair_rounded;
    }
    if (key.contains('pharmacy') || key.contains('medicine') || key.contains('health')) {
      return Icons.local_pharmacy_rounded;
    }
    if (key.contains('leaf') || key.contains('fresh')) {
      return Icons.eco_rounded;
    }
    if (key.contains('headphone') || key.contains('electronic')) {
      return Icons.headphones_rounded;
    }
    if (key.contains('sparkle') || key.contains('beauty')) {
      return Icons.auto_awesome_rounded;
    }
    if (key.contains('shirt') || key.contains('fashion')) {
      return Icons.checkroom_rounded;
    }
    return Icons.category_rounded;
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
              final icon = _iconFor(name, iconKey);

              final activeColor =
                  widget.isFestivalActive ? Colors.black : const Color(0xFF0C831F);

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
                      Icon(
                        icon,
                        size: 22,
                        color: isSelected
                            ? activeColor
                            : (isDark ? Colors.white54 : const Color(0xFF757575)),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 10.5,
                          fontWeight:
                              isSelected ? FontWeight.w800 : FontWeight.w500,
                          color: isSelected
                              ? (isDark ? Colors.white : activeColor)
                              : (isDark ? Colors.white60 : const Color(0xFF666666)),
                        ),
                      ),
                      const SizedBox(height: 2),
                      AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        height: 2.5,
                        width: isSelected ? itemWidth * 0.7 : 0,
                        decoration: BoxDecoration(
                          color: activeColor,
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
