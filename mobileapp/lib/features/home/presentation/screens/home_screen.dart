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
import 'package:freshcart/features/orders/data/models/order_model.dart';
import 'package:freshcart/features/orders/presentation/controllers/orders_controller.dart';
import 'package:freshcart/features/products/data/models/product_model.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  void _refresh(WidgetRef ref) {
    ref.invalidate(bannersProvider);
    ref.invalidate(categoriesProvider);
    ref.invalidate(specialGroupsProvider);
    ref.invalidate(allProductsProvider);
    ref.invalidate(activeFestivalCampaignProvider);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final auth = ref.watch(authProvider);
    final cartCount = ref.watch(cartProvider.select((c) => c.totalItemsCount));

    final categoriesAsync = ref.watch(categoriesProvider);
    final productsAsync = ref.watch(allProductsProvider);

    final address = auth.user?.selectedAddress?['addressLine'] as String? ??
        'Select a delivery address';

    final header = HomeHeader(
      addressLine: address,
      cartCount: cartCount,
      onAddressTap: () => context.push('/location_select'),
      onProfileTap: () => context.go('/account'),
      onSearchTap: () => context.push('/search_detail'),
      onCartTap: () => context.push('/cart'),
      onNotificationsTap: () => context.push('/notifications'),
    );

    Widget body;
    if (categoriesAsync.isLoading && productsAsync.isLoading) {
      body = const _HomeSkeleton();
    } else if (categoriesAsync.hasError && productsAsync.hasError) {
      body = ErrorState(onRetry: () => _refresh(ref));
    } else {
      final categories = categoriesAsync.valueOrNull ?? const <CategoryModel>[];
      final products = productsAsync.valueOrNull ?? const <ProductModel>[];
      if (categories.isEmpty && products.isEmpty) {
        body = const EmptyState(
          icon: Icons.storefront_outlined,
          title: 'Store is being stocked',
          description: 'Fresh products are on their way. Pull down to refresh in a moment.',
        );
      } else {
        body = _HomeContent(
          categories: categories,
          products: products,
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

    return Scaffold(
      backgroundColor: isDark ? AppColors.backgroundDark : AppColors.background,
      body: Column(
        children: [
          header,
          Container(height: 1, color: isDark ? AppColors.dividerDark : AppColors.divider),
          Expanded(
            child: RefreshIndicator(
              color: AppColors.primary,
              onRefresh: () async => _refresh(ref),
              child: body,
            ),
          ),
        ],
      ),
    );
  }
}

class _HomeContent extends ConsumerWidget {
  final List<CategoryModel> categories;
  final List<ProductModel> products;
  final ValueChanged<ProductModel> onOpenProduct;
  final ValueChanged<String> onOpenCategory;
  final ValueChanged<ProductModel> onAdd;

  const _HomeContent({
    required this.categories,
    required this.products,
    required this.onOpenProduct,
    required this.onOpenCategory,
    required this.onAdd,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final banners = ref.watch(bannersProvider).valueOrNull ?? const [];
    final groups = ref.watch(specialGroupsProvider).valueOrNull ?? const [];
    final campaign = ref.watch(activeFestivalCampaignProvider).valueOrNull;

    // Only look for a live order once the customer is signed in — keeps Home
    // free of the orders API (and its getIt dependency) for guests/tests.
    OrderModel? activeOrder;
    if (ref.watch(authProvider.select((s) => s.isAuthenticated))) {
      for (final o in ref.watch(ordersProvider).valueOrNull ?? const <OrderModel>[]) {
        if (o.isActive) {
          activeOrder = o;
          break;
        }
      }
    }

    final fresh = products.where((p) => p.isFreshPick).take(10).toList();
    final organic = products.where((p) => p.isOrganic).take(10).toList();
    final bestSellers = products.where((p) => p.isBestSeller).take(10).toList();

    ProductRail rail(String title, String? sub, List<ProductModel> items, [String? catId]) => ProductRail(
          title: title,
          subtitle: sub,
          products: items,
          onOpen: onOpenProduct,
          onAdd: onAdd,
          onSeeAll: catId == null ? null : () => onOpenCategory(catId),
        );

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
      padding: EdgeInsets.zero,
      children: [
        if (campaign != null) _FestivalHero(campaign: campaign),
        if (activeOrder != null) _ActiveOrderBanner(order: activeOrder, isDark: isDark),

        // Shop by category
        if (categories.isNotEmpty) ...[
          const SizedBox(height: 16),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Text('Shop by category', style: AppTypography.h3(
              isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
            )),
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

        // Promotional banners
        if (banners.isNotEmpty) _BannerCarousel(banners: banners),

        // Special groups (real images from the CMS)
        for (final g in groups) _SpecialGroup(group: Map<String, dynamic>.from(g as Map)),

        // Curated shelves
        rail('Fresh today', 'Picked this morning, delivered in minutes', fresh),
        rail('Organic collection', 'Certified chemical-free', organic),
        rail('Best sellers', 'What customers are buying this week', bestSellers),

        // Per-category shelves
        for (final c in categories)
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

Color? _hex(dynamic v) {
  final s = (v is String) ? v.trim().replaceFirst('#', '') : '';
  if (s.length == 6) return Color(int.parse('FF$s', radix: 16));
  if (s.length == 8) return Color(int.parse(s, radix: 16));
  return null;
}

class _FestivalHero extends StatelessWidget {
  final Map<String, dynamic> campaign;
  const _FestivalHero({required this.campaign});

  @override
  Widget build(BuildContext context) {
    final title = (campaign['title'] ?? campaign['name'] ?? '').toString();
    if (title.isEmpty) return const SizedBox.shrink();
    final subtitle =
        (campaign['subtitle'] ?? campaign['featuredBannerTitle'] ?? '').toString();
    final bgType = (campaign['backgroundType'] ?? 'solid').toString();
    final imageUrl = (campaign['backgroundImage'] is Map)
        ? (campaign['backgroundImage']['url'] ?? '').toString()
        : '';

    final solid = _hex(campaign['backgroundColor']) ?? AppColors.primary;
    final gStart = _hex(campaign['gradientStart']) ?? solid;
    final gEnd = _hex(campaign['gradientEnd']) ?? AppColors.primary;

    BoxDecoration deco;
    if (bgType == 'image' && imageUrl.startsWith('http')) {
      deco = BoxDecoration(
        borderRadius: AppRadius.brLg,
        image: DecorationImage(
          image: CachedNetworkImageProvider(imageUrl),
          fit: BoxFit.cover,
          colorFilter: ColorFilter.mode(Colors.black.withValues(alpha: 0.35), BlendMode.darken),
        ),
      );
    } else if (bgType == 'gradient') {
      deco = BoxDecoration(
        borderRadius: AppRadius.brLg,
        gradient: LinearGradient(colors: [gStart, gEnd], begin: Alignment.topLeft, end: Alignment.bottomRight),
      );
    } else {
      deco = BoxDecoration(borderRadius: AppRadius.brLg, color: solid);
    }

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
      child: Container(
        width: double.infinity,
        decoration: deco,
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title,
                style: AppTypography.h3(Colors.white).copyWith(fontWeight: FontWeight.w900)),
            if (subtitle.isNotEmpty) ...[
              const SizedBox(height: 4),
              Text(subtitle,
                  style: AppTypography.bodySmall(Colors.white.withValues(alpha: 0.92))),
            ],
          ],
        ),
      ),
    );
  }
}

class _ActiveOrderBanner extends StatelessWidget {
  final OrderModel order;
  final bool isDark;
  const _ActiveOrderBanner({required this.order, required this.isDark});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
      child: Material(
        color: AppColors.primary.withValues(alpha: isDark ? 0.16 : 0.08),
        borderRadius: AppRadius.brLg,
        child: InkWell(
          borderRadius: AppRadius.brLg,
          onTap: () => context.push('/tracking/${order.id}'),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(9),
                  decoration: const BoxDecoration(color: AppColors.primary, shape: BoxShape.circle),
                  child: const Icon(Icons.delivery_dining_rounded, color: Colors.white, size: 18),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(order.statusText,
                          style: AppTypography.labelLarge(
                            isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                          )),
                      const SizedBox(height: 2),
                      Text('Order #${order.id} · tap to track',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: AppTypography.bodySmall(
                            isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
                          )),
                    ],
                  ),
                ),
                const Icon(Icons.chevron_right_rounded, color: AppColors.primary),
              ],
            ),
          ),
        ),
      ),
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
    return Padding(
      padding: const EdgeInsets.only(top: 16),
      child: Column(
        children: [
          SizedBox(
            height: 150,
            child: PageView.builder(
              controller: _controller,
              onPageChanged: (i) => setState(() => _page = i),
              itemCount: widget.banners.length,
              itemBuilder: (context, i) {
                final b = Map<String, dynamic>.from(widget.banners[i] as Map);
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
                    child: img.startsWith('http')
                        ? CachedNetworkImage(imageUrl: img, fit: BoxFit.cover)
                        : const SizedBox.shrink(),
                  ),
                );
              },
            ),
          ),
          if (widget.banners.length > 1) ...[
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(widget.banners.length, (i) {
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
        border: Border.all(color: isDark ? AppColors.dividerDark : AppColors.divider),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: AppTypography.title(
            isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
          )),
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
                                  errorWidget: (_, _, _) =>
                                      const Icon(Icons.category_outlined, size: 20),
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
                        isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
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
        border: Border.all(color: isDark ? AppColors.dividerDark : AppColors.divider),
      ),
      child: Row(
        children: [
          for (final (icon, title, sub) in items)
            Expanded(
              child: Column(
                children: [
                  Icon(icon, color: AppColors.primary, size: 22),
                  const SizedBox(height: 6),
                  Text(title, textAlign: TextAlign.center, style: AppTypography.labelMedium(
                    isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                  )),
                  const SizedBox(height: 2),
                  Text(sub, textAlign: TextAlign.center, style: AppTypography.labelSmall(
                    isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
                  ).copyWith(fontWeight: FontWeight.w400)),
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
    return ListView(
      physics: const NeverScrollableScrollPhysics(),
      children: const [
        SizedBox(height: 24),
        ProductRailSkeleton(),
        ProductRailSkeleton(),
        ProductRailSkeleton(),
      ],
    );
  }
}
