import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/core/widgets/glass_card.dart';
import 'package:freshcart/core/widgets/product_card.dart';
import 'package:freshcart/features/authentication/presentation/controllers/auth_controller.dart';
import 'package:freshcart/features/cart/presentation/controllers/cart_controller.dart';
import 'package:freshcart/features/home/presentation/controllers/catalog_providers.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _headerAnimController;
  late Animation<double> _headerAnimation;
  String _activeCategory = 'All';

  @override
  void initState() {
    super.initState();
    _headerAnimController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 4),
    )..repeat(reverse: true);
    _headerAnimation = CurvedAnimation(
      parent: _headerAnimController,
      curve: Curves.easeInOut,
    );
  }

  @override
  void dispose() {
    _headerAnimController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final cartNotifier = ref.read(cartProvider.notifier);
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final userAddress =
        authState.user?.selectedAddress?['addressLine'] ??
        'Grant Location Access';

    final bannersAsync = ref.watch(bannersProvider);
    final categoriesAsync = ref.watch(categoriesProvider);
    final specialGroupsAsync = ref.watch(specialGroupsProvider);
    final productsAsync = ref.watch(
      productsProvider(const {'categoryId': 'All', 'subCategory': 'All'}),
    );

    return Scaffold(
      backgroundColor: isDark
          ? AppColors.backgroundDark
          : const Color(0xFFF9FAFB),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(bannersProvider);
          ref.invalidate(categoriesProvider);
          ref.invalidate(specialGroupsProvider);
          ref.invalidate(
            productsProvider(const {'categoryId': 'All', 'subCategory': 'All'}),
          );
        },
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(
            parent: BouncingScrollPhysics(),
          ),
          slivers: [
            // 1. Header Bar with Dynamic Categories Filter
            SliverToBoxAdapter(
              child: AnimatedBuilder(
                animation: _headerAnimation,
                builder: (context, child) {
                  return Container(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment(
                          -1.5 + _headerAnimation.value * 1.5,
                          -1.0,
                        ),
                        end: Alignment(1.5 - _headerAnimation.value * 1.5, 1.0),
                        colors: const [
                          Color(0xFF0F153F),
                          Color(0xFF1E2863),
                          Color(0xFF090D2C),
                        ],
                      ),
                      borderRadius: const BorderRadius.vertical(
                        bottom: Radius.circular(32),
                      ),
                    ),
                    child: SafeArea(
                      bottom: false,
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 18.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const SizedBox(height: 12),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Container(
                                  decoration: BoxDecoration(
                                    color: const Color(
                                      0xFFC0FF00,
                                    ).withOpacity(0.15),
                                    borderRadius: BorderRadius.circular(16),
                                    border: Border.all(
                                      color: const Color(
                                        0xFFC0FF00,
                                      ).withOpacity(0.3),
                                      width: 1,
                                    ),
                                  ),
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 10,
                                    vertical: 6,
                                  ),
                                  child: const Row(
                                    children: [
                                      Icon(
                                        Icons.flash_on_rounded,
                                        color: Color(0xFFC0FF00),
                                        size: 16,
                                      ),
                                      SizedBox(width: 4),
                                      Text(
                                        '8 mins',
                                        style: TextStyle(
                                          color: Colors.white,
                                          fontWeight: FontWeight.w900,
                                          fontSize: 13,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                Expanded(
                                  child: Padding(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 8.0,
                                    ),
                                    child: GestureDetector(
                                      onTap: () =>
                                          context.push('/location_select'),
                                      child: Row(
                                        mainAxisAlignment:
                                            MainAxisAlignment.center,
                                        children: [
                                          const Icon(
                                            Icons.location_on_rounded,
                                            color: Colors.white,
                                            size: 14,
                                          ),
                                          const SizedBox(width: 4),
                                          Flexible(
                                            child: Text(
                                              userAddress,
                                              style: const TextStyle(
                                                color: Colors.white,
                                                fontSize: 12,
                                                fontWeight: FontWeight.bold,
                                              ),
                                              maxLines: 1,
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                          ),
                                          const Icon(
                                            Icons.keyboard_arrow_down_rounded,
                                            color: Colors.white,
                                            size: 14,
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                ),
                                GestureDetector(
                                  onTap: () => context.push('/profile'),
                                  child: Container(
                                    width: 36,
                                    height: 36,
                                    decoration: BoxDecoration(
                                      color: Colors.white.withOpacity(0.15),
                                      shape: BoxShape.circle,
                                    ),
                                    child: const Center(
                                      child: Icon(
                                        Icons.person_rounded,
                                        color: Colors.white,
                                        size: 20,
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 16),

                            Row(
                              children: [
                                Expanded(
                                  child: GlassCard(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 14,
                                    ),
                                    height: 48,
                                    borderRadius: 24,
                                    color: Colors.white.withOpacity(0.1),
                                    borderColor: Colors.white.withOpacity(0.15),
                                    child: Row(
                                      children: [
                                        const Icon(
                                          Icons.search_rounded,
                                          color: Colors.white70,
                                          size: 18,
                                        ),
                                        const SizedBox(width: 8),
                                        Expanded(
                                          child: TextField(
                                            readOnly: true,
                                            onTap: () =>
                                                context.push('/search_detail'),
                                            style: const TextStyle(
                                              color: Colors.white,
                                              fontSize: 13,
                                            ),
                                            decoration: const InputDecoration(
                                              hintText:
                                                  "Search for 'fruits, vegetables, milk'",
                                              hintStyle: TextStyle(
                                                color: Colors.white54,
                                                fontSize: 13,
                                              ),
                                              border: InputBorder.none,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 10),
                                GestureDetector(
                                  onTap: () => context.push('/cart'),
                                  child: Container(
                                    width: 44,
                                    height: 44,
                                    decoration: const BoxDecoration(
                                      color: Colors.white,
                                      shape: BoxShape.circle,
                                    ),
                                    child: const Icon(
                                      Icons.shopping_bag_outlined,
                                      color: Colors.black87,
                                      size: 20,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 16),

                            // Dynamic Categories Bar
                            categoriesAsync.when(
                              data: (categories) {
                                return SizedBox(
                                  height: 44,
                                  child: ListView.builder(
                                    scrollDirection: Axis.horizontal,
                                    physics: const BouncingScrollPhysics(),
                                    itemCount: categories.length + 1,
                                    itemBuilder: (context, index) {
                                      if (index == 0) {
                                        final isSelected =
                                            _activeCategory == 'All';
                                        return Padding(
                                          padding: const EdgeInsets.only(
                                            right: 8.0,
                                          ),
                                          child: ChoiceChip(
                                            label: const Text(
                                              'All Categories',
                                              style: TextStyle(
                                                fontWeight: FontWeight.bold,
                                                fontSize: 12,
                                              ),
                                            ),
                                            selected: isSelected,
                                            selectedColor: const Color(
                                              0xFF00A86B,
                                            ),
                                            labelStyle: TextStyle(
                                              color: isSelected
                                                  ? Colors.white
                                                  : Colors.white70,
                                            ),
                                            backgroundColor: Colors.white
                                                .withOpacity(0.1),
                                            onSelected: (_) => setState(
                                              () => _activeCategory = 'All',
                                            ),
                                          ),
                                        );
                                      }
                                      final cat = categories[index - 1];
                                      final isSelected =
                                          _activeCategory == cat.id;

                                      return Padding(
                                        padding: const EdgeInsets.only(
                                          right: 8.0,
                                        ),
                                        child: ChoiceChip(
                                          avatar: Icon(
                                            _getCategoryIconData(cat.icon),
                                            size: 16,
                                            color: isSelected
                                                ? Colors.white
                                                : cat.color,
                                          ),
                                          label: Text(
                                            cat.name,
                                            style: const TextStyle(
                                              fontWeight: FontWeight.bold,
                                              fontSize: 12,
                                              color: Colors.white,
                                            ),
                                          ),
                                          selected: isSelected,
                                          selectedColor: const Color(
                                            0xFF00A86B,
                                          ),
                                          backgroundColor: Colors.white
                                              .withOpacity(0.1),
                                          onSelected: (_) {
                                            setState(
                                              () => _activeCategory = cat.id,
                                            );
                                            context.push('/category/${cat.id}');
                                          },
                                        ),
                                      );
                                    },
                                  ),
                                );
                              },
                              loading: () => const SizedBox(
                                height: 44,
                                child: Center(
                                  child: CircularProgressIndicator(
                                    color: Colors.white,
                                  ),
                                ),
                              ),
                              error: (err, stack) => const SizedBox.shrink(),
                            ),
                            const SizedBox(height: 16),
                          ],
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),

            // 2. Promotional Banners Carousel
            bannersAsync.when(
              data: (banners) {
                if (banners.isEmpty) {
                  return const SliverToBoxAdapter(child: SizedBox.shrink());
                }
                return SliverToBoxAdapter(
                  child: Container(
                    margin: const EdgeInsets.only(top: 12),
                    height: 140,
                    child: PageView.builder(
                      controller: PageController(viewportFraction: 0.92),
                      itemCount: banners.length,
                      itemBuilder: (context, index) {
                        final banner = banners[index];
                        final imgUrl = banner['imageUrl'] as String? ?? '';
                        final linkUrl =
                            banner['linkUrl'] as String? ?? '/products';

                        return GestureDetector(
                          onTap: () => context.push(linkUrl),
                          child: Container(
                            margin: const EdgeInsets.symmetric(horizontal: 4),
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(20),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withOpacity(0.08),
                                  blurRadius: 10,
                                ),
                              ],
                            ),
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(20),
                              child: Stack(
                                fit: StackFit.expand,
                                children: [
                                  Image.network(
                                    imgUrl,
                                    fit: BoxFit.cover,
                                    errorBuilder: (context, error, stack) =>
                                        Container(color: Colors.grey.shade300),
                                  ),
                                  Container(
                                    decoration: BoxDecoration(
                                      gradient: LinearGradient(
                                        colors: [
                                          Colors.black.withOpacity(0.75),
                                          Colors.transparent,
                                        ],
                                        begin: Alignment.centerLeft,
                                        end: Alignment.centerRight,
                                      ),
                                    ),
                                  ),
                                  Padding(
                                    padding: const EdgeInsets.all(16.0),
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      mainAxisAlignment:
                                          MainAxisAlignment.center,
                                      children: [
                                        Container(
                                          padding: const EdgeInsets.symmetric(
                                            horizontal: 8,
                                            vertical: 3,
                                          ),
                                          decoration: BoxDecoration(
                                            color: const Color(0xFF00A86B),
                                            borderRadius: BorderRadius.circular(
                                              6,
                                            ),
                                          ),
                                          child: Text(
                                            banner['tag'] as String? ?? 'OFFER',
                                            style: const TextStyle(
                                              color: Colors.white,
                                              fontWeight: FontWeight.w900,
                                              fontSize: 9,
                                            ),
                                          ),
                                        ),
                                        const SizedBox(height: 6),
                                        Text(
                                          banner['title'] as String? ?? '',
                                          style: const TextStyle(
                                            color: Colors.white,
                                            fontWeight: FontWeight.w900,
                                            fontSize: 16,
                                          ),
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          banner['subtitle'] as String? ?? '',
                                          style: const TextStyle(
                                            color: Colors.white70,
                                            fontSize: 11,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                );
              },
              loading: () => const SliverToBoxAdapter(
                child: SizedBox(
                  height: 140,
                  child: Center(child: CircularProgressIndicator()),
                ),
              ),
              error: (err, stack) =>
                  const SliverToBoxAdapter(child: SizedBox.shrink()),
            ),

            // 3. Special Subcategory Category Groups Grid (Non-blocking fluid Wrap layout)
            specialGroupsAsync.when(
              data: (groups) {
                if (groups.isEmpty) {
                  return const SliverToBoxAdapter(child: SizedBox.shrink());
                }
                final items = (groups[0]['items'] as List? ?? []);
                if (items.isEmpty) {
                  return const SliverToBoxAdapter(child: SizedBox.shrink());
                }

                return SliverToBoxAdapter(
                  child: Container(
                    margin: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 12,
                    ),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF1C1C1E) : Colors.white,
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(
                        color: isDark
                            ? Colors.white10
                            : Colors.black.withOpacity(0.06),
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          (groups[0]['title'] as String?) ??
                              'Explore Special Subcategories',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w900,
                            color: isDark
                                ? Colors.white
                                : AppColors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 12),
                        LayoutBuilder(
                          builder: (context, constraints) {
                            final tileWidth = (constraints.maxWidth - 24) / 4;
                            return Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              children: items.map((itemObj) {
                                final item = Map<String, dynamic>.from(
                                  itemObj as Map,
                                );
                                final name = item['name'] as String? ?? '';
                                final img = item['image'] as String? ?? '';
                                final link =
                                    item['link'] as String? ??
                                    '/category/cat_veg';

                                return GestureDetector(
                                  onTap: () => context.push(link),
                                  child: Container(
                                    width: tileWidth,
                                    height: tileWidth * 1.25,
                                    decoration: BoxDecoration(
                                      color: isDark
                                          ? Colors.white10
                                          : const Color(0xFFF3F4F6),
                                      borderRadius: BorderRadius.circular(14),
                                    ),
                                    clipBehavior: Clip.antiAlias,
                                    child: Column(
                                      mainAxisAlignment:
                                          MainAxisAlignment.spaceBetween,
                                      children: [
                                        Expanded(
                                          child: Padding(
                                            padding: const EdgeInsets.all(4.0),
                                            child: Image.network(
                                              img,
                                              fit: BoxFit.contain,
                                              errorBuilder:
                                                  (context, error, stack) =>
                                                      Icon(
                                                        Icons.category_rounded,
                                                        size: 24,
                                                        color: isDark
                                                            ? Colors.white54
                                                            : Colors.black38,
                                                      ),
                                            ),
                                          ),
                                        ),
                                        Container(
                                          width: double.infinity,
                                          color: Colors.black.withOpacity(0.75),
                                          padding: const EdgeInsets.symmetric(
                                            vertical: 3,
                                            horizontal: 2,
                                          ),
                                          child: Text(
                                            name,
                                            textAlign: TextAlign.center,
                                            style: const TextStyle(
                                              fontSize: 9,
                                              fontWeight: FontWeight.bold,
                                              color: Colors.white,
                                            ),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                );
                              }).toList(),
                            );
                          },
                        ),
                      ],
                    ),
                  ),
                );
              },
              loading: () => const SliverToBoxAdapter(child: SizedBox.shrink()),
              error: (err, stack) =>
                  const SliverToBoxAdapter(child: SizedBox.shrink()),
            ),

            // 4. Dynamic Subcategories & Categories Feed (Fluid CustomScrollView integration)
            categoriesAsync.when(
              data: (categories) {
                return productsAsync.when(
                  data: (allProducts) {
                    final filteredCategories = _activeCategory == 'All'
                        ? categories
                        : categories
                              .where((c) => c.id == _activeCategory)
                              .toList();

                    return SliverList(
                      delegate: SliverChildBuilderDelegate((context, catIndex) {
                        final cat = filteredCategories[catIndex];
                        final catProducts = allProducts
                            .where((p) => p.categoryId == cat.id)
                            .toList();
                        if (catProducts.isEmpty) return const SizedBox.shrink();

                        return Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Padding(
                              padding: const EdgeInsets.fromLTRB(
                                18,
                                16,
                                18,
                                10,
                              ),
                              child: Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                children: [
                                  Row(
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.all(8),
                                        decoration: BoxDecoration(
                                          color: cat.color.withOpacity(0.12),
                                          borderRadius: BorderRadius.circular(
                                            12,
                                          ),
                                        ),
                                        child: Icon(
                                          _getCategoryIconData(cat.icon),
                                          color: cat.color,
                                          size: 20,
                                        ),
                                      ),
                                      const SizedBox(width: 10),
                                      Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            cat.name,
                                            style:
                                                AppTypography.title(
                                                  isDark
                                                      ? Colors.white
                                                      : AppColors.textPrimary,
                                                ).copyWith(
                                                  fontWeight: FontWeight.w900,
                                                  fontSize: 18,
                                                ),
                                          ),
                                          Text(
                                            '${catProducts.length} items delivered in 10 mins',
                                            style: const TextStyle(
                                              fontSize: 11,
                                              color: Colors.grey,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                  GestureDetector(
                                    onTap: () =>
                                        context.push('/category/${cat.id}'),
                                    child: const Row(
                                      children: [
                                        Text(
                                          'See All',
                                          style: TextStyle(
                                            color: Color(0xFF00A86B),
                                            fontWeight: FontWeight.w800,
                                            fontSize: 13,
                                          ),
                                        ),
                                        Icon(
                                          Icons.chevron_right_rounded,
                                          color: Color(0xFF00A86B),
                                          size: 18,
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            SizedBox(
                              height: 265,
                              child: ListView.builder(
                                physics: const BouncingScrollPhysics(),
                                scrollDirection: Axis.horizontal,
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 14,
                                ),
                                itemCount: catProducts.length,
                                itemBuilder: (context, index) {
                                  final prod = catProducts[index];
                                  return Padding(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 4,
                                    ),
                                    child: ProductCard(
                                      product: prod,
                                      onTap: () =>
                                          context.push('/product/${prod.id}'),
                                      onAdd: () {
                                        cartNotifier.addToCart(prod);
                                        ScaffoldMessenger.of(
                                          context,
                                        ).showSnackBar(
                                          SnackBar(
                                            content: Text(
                                              'Added ${prod.name} to Cart',
                                            ),
                                            duration: const Duration(
                                              seconds: 1,
                                            ),
                                            behavior: SnackBarBehavior.floating,
                                            backgroundColor: const Color(
                                              0xFF00A86B,
                                            ),
                                          ),
                                        );
                                      },
                                    ),
                                  );
                                },
                              ),
                            ),
                          ],
                        );
                      }, childCount: filteredCategories.length),
                    );
                  },
                  loading: () => const SliverToBoxAdapter(
                    child: Padding(
                      padding: EdgeInsets.all(32.0),
                      child: Center(
                        child: CircularProgressIndicator(
                          color: AppColors.primary,
                        ),
                      ),
                    ),
                  ),
                  error: (err, stack) =>
                      const SliverToBoxAdapter(child: SizedBox.shrink()),
                );
              },
              loading: () => const SliverToBoxAdapter(child: SizedBox.shrink()),
              error: (err, stack) =>
                  const SliverToBoxAdapter(child: SizedBox.shrink()),
            ),

            const SliverToBoxAdapter(child: SizedBox(height: 120)),
          ],
        ),
      ),
    );
  }

  IconData _getCategoryIconData(String iconName) {
    switch (iconName.toLowerCase()) {
      case 'organic':
      case 'leaf':
      case 'carrot':
        return Icons.eco_rounded;
      case 'dairy':
      case 'milk':
        return Icons.water_drop_rounded;
      case 'wheat':
      case 'bakery':
        return Icons.grain_rounded;
      case 'beef':
      case 'meat':
        return Icons.kebab_dining_rounded;
      case 'spices':
        return Icons.local_fire_department_rounded;
      case 'snacks':
      case 'cookie':
        return Icons.cookie_rounded;
      case 'cupsoda':
      case 'beverages':
        return Icons.local_drink_rounded;
      default:
        return Icons.shopping_basket_rounded;
    }
  }
}
