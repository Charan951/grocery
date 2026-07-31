import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/core/widgets/glass_card.dart';
import 'package:freshcart/core/widgets/product_card.dart';
import 'package:freshcart/core/services/mock_data_service.dart';
import 'package:freshcart/features/authentication/presentation/controllers/auth_controller.dart';
import 'package:freshcart/features/cart/presentation/controllers/cart_controller.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> with SingleTickerProviderStateMixin {
  late AnimationController _headerAnimController;
  late Animation<double> _headerAnimation;
  String _activeTab = 'All';

  // Category Tab Items
  final List<Map<String, dynamic>> _tabs = [
    {'name': 'All', 'icon': Icons.shopping_basket_rounded},
    {'name': 'Fresh', 'icon': Icons.spa_rounded},
    {'name': 'Grocery', 'icon': Icons.local_grocery_store_rounded},
    {'name': 'Electronics', 'icon': Icons.headphones_rounded},
    {'name': 'Monsoon', 'icon': Icons.umbrella_rounded},
  ];

  // Quick Links items
  final List<Map<String, dynamic>> _quickLinks = [
    {
      'title': 'After Hours\nKickoff',
      'image': 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=150&auto=format&fit=crop',
      'gradient': [const Color(0xFF0F172A), const Color(0xFF1E293B)],
    },
    {
      'title': 'Matchday\nmunchies',
      'image': 'https://images.unsplash.com/photo-1599490659213-e2b9527ec087?w=150&auto=format&fit=crop',
      'gradient': [const Color(0xFFFAF5FF), const Color(0xFFE8D5FF)],
    },
    {
      'title': 'Beverages\n& mixers',
      'image': 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=150&auto=format&fit=crop',
      'gradient': [const Color(0xFFF0F9FF), const Color(0xFFBAE6FD)],
    },
    {
      'title': 'Instant\nfood',
      'image': 'https://images.unsplash.com/photo-1612966608997-30d9cb655e02?w=150&auto=format&fit=crop',
      'gradient': [const Color(0xFFF0FDF4), const Color(0xFFBBF7D0)],
    },
    {
      'title': 'Frozen\nsnacks',
      'image': 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=150&auto=format&fit=crop',
      'gradient': [const Color(0xFFFAF5FF), const Color(0xFFE8D5FF)],
    },
  ];

  // Big Value Days Categories
  final List<Map<String, String>> _bigValueCategories = [
    {
      'title': 'Kitchen & crockery',
      'image': 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=150&auto=format&fit=crop',
      'discount': 'UP TO 80% OFF',
    },
    {
      'title': 'Home & cleaning',
      'image': 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=150&auto=format&fit=crop',
      'discount': 'UP TO 70% OFF',
    },
    {
      'title': 'Toys & stationery',
      'image': 'https://images.unsplash.com/photo-1537655780520-1e392edd816a?w=150&auto=format&fit=crop',
      'discount': 'UP TO 70% OFF',
    },
    {
      'title': 'Sports & travel',
      'image': 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=150&auto=format&fit=crop',
      'discount': 'MIN. 30% OFF',
    },
    {
      'title': 'Earbuds & more',
      'image': 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=150&auto=format&fit=crop',
      'discount': 'UP TO 80% OFF',
    },
    {
      'title': 'Kettles, irons & more',
      'image': 'https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=150&auto=format&fit=crop',
      'discount': 'UP TO 80% OFF',
    },
    {
      'title': 'Makeup & fragrances',
      'image': 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=150&auto=format&fit=crop',
      'discount': 'MIN. 40% OFF',
    },
    {
      'title': 'Skin & hair care',
      'image': 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=150&auto=format&fit=crop',
      'discount': 'MIN. 30% OFF',
    },
  ];

  @override
  void initState() {
    super.initState();
    // Shifting gradient animation controller
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

    final userAddress = authState.user?.selectedAddress?['addressLine'] ?? 'Grant Location Access';

    // Filter products dynamically based on selected category tab
    final List<dynamic> allProducts = MockDataService.products;
    final List<dynamic> filteredProducts = allProducts.where((p) {
      if (_activeTab == 'All') return true;
      if (_activeTab == 'Fresh') {
        return p.categoryId == 'cat_organic' || p.categoryId == 'cat_veg' || p.categoryId == 'cat_fruits';
      }
      if (_activeTab == 'Grocery') {
        return p.categoryId == 'cat_dairy' || p.categoryId == 'cat_bakery' || p.categoryId == 'cat_snacks' || p.categoryId == 'cat_drinks';
      }
      if (_activeTab == 'Electronics') {
        return p.categoryId == 'cat_electronics'; // mock coming soon
      }
      return false;
    }).toList();

    return Scaffold(
      backgroundColor: isDark ? AppColors.backgroundDark : AppColors.background,
      body: CustomScrollView(
        physics: const BouncingScrollPhysics(),
        slivers: [
          // Animated Premium Header
          SliverToBoxAdapter(
            child: AnimatedBuilder(
              animation: _headerAnimation,
              builder: (context, child) {
                return Container(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment(-1.5 + _headerAnimation.value * 1.5, -1.0),
                      end: Alignment(1.5 - _headerAnimation.value * 1.5, 1.0),
                      colors: const [
                        Color(0xFF0F153F), // Deep blue-indigo
                        Color(0xFF1E2863), // Shifting indigo
                        Color(0xFF090D2C), // Dark midnight blue
                      ],
                    ),
                    borderRadius: const BorderRadius.vertical(
                      bottom: Radius.circular(32),
                    ),
                  ),
                  child: SafeArea(
                    bottom: false,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 20.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const SizedBox(height: 12),
                          // Delivery Banner Speed + Location Dropdown + Profile Icon
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              // 8 Mins Bolt Badge
                              Container(
                                decoration: BoxDecoration(
                                  color: const Color(0xFFC0FF00).withOpacity(0.15),
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(color: const Color(0xFFC0FF00).withOpacity(0.3), width: 1),
                                ),
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                child: const Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(Icons.flash_on_rounded, color: Color(0xFFC0FF00), size: 16),
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
                              // Location Dropper Selector
                              Expanded(
                                child: Padding(
                                  padding: const EdgeInsets.symmetric(horizontal: 8.0),
                                  child: GestureDetector(
                                    onTap: () => context.push('/location_select'),
                                    child: Row(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        const Icon(Icons.location_on_rounded, color: Colors.white, size: 14),
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
                                        const Icon(Icons.keyboard_arrow_down_rounded, color: Colors.white, size: 14),
                                      ],
                                    ),
                                  ),
                                ),
                              ),
                              // Profile Icon Button
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
                                    child: Icon(Icons.person_rounded, color: Colors.white, size: 20),
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),
                          // Search Box and Pill Actions Row
                          Row(
                            children: [
                              // Glassmorphic Search box
                              Expanded(
                                child: GlassCard(
                                  padding: const EdgeInsets.symmetric(horizontal: 14),
                                  height: 48,
                                  borderRadius: 24,
                                  color: Colors.white.withOpacity(0.1),
                                  borderColor: Colors.white.withOpacity(0.15),
                                  child: Row(
                                    children: [
                                      const Icon(Icons.search_rounded, color: Colors.white70, size: 18),
                                      const SizedBox(width: 8),
                                      Expanded(
                                        child: TextField(
                                          readOnly: true,
                                          onTap: () => context.push('/search_detail'),
                                          style: const TextStyle(color: Colors.white, fontSize: 13),
                                          decoration: const InputDecoration(
                                            hintText: "Search for 'vegetables'",
                                            hintStyle: TextStyle(color: Colors.white54, fontSize: 13),
                                            border: InputBorder.none,
                                          ),
                                        ),
                                      ),
                                      const Icon(Icons.mic_none_rounded, color: Colors.white70, size: 18),
                                    ],
                                  ),
                                ),
                              ),
                              const SizedBox(width: 10),
                              // List / Cart Button
                              GestureDetector(
                                onTap: () => context.push('/cart'),
                                child: Container(
                                  width: 44,
                                  height: 44,
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    shape: BoxShape.circle,
                                    border: Border.all(color: Colors.white12),
                                  ),
                                  child: const Icon(Icons.list_alt_rounded, color: Colors.black87, size: 18),
                                ),
                              ),
                              const SizedBox(width: 8),
                              // Heart / Wishlist Button
                              GestureDetector(
                                onTap: () => context.push('/wishlist'),
                                child: Container(
                                  width: 44,
                                  height: 44,
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    shape: BoxShape.circle,
                                    border: Border.all(color: Colors.white12),
                                  ),
                                  child: const Icon(Icons.favorite_border_rounded, color: Colors.black87, size: 18),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 18),
                          // Category Tabs List
                          SizedBox(
                            height: 44,
                            child: ListView.builder(
                              scrollDirection: Axis.horizontal,
                              physics: const BouncingScrollPhysics(),
                              itemCount: _tabs.length,
                              itemBuilder: (context, index) {
                                final tab = _tabs[index];
                                final isSelected = _activeTab == tab['name'];

                                return Padding(
                                  padding: const EdgeInsets.only(right: 10.0),
                                  child: GestureDetector(
                                    onTap: () {
                                      if (tab['name'] == 'All') {
                                        setState(() {
                                          _activeTab = 'All';
                                        });
                                      } else {
                                        context.push('/category/${tab['name']}');
                                      }
                                    },
                                    child: AnimatedContainer(
                                      duration: const Duration(milliseconds: 250),
                                      decoration: BoxDecoration(
                                        color: isSelected
                                            ? Colors.white
                                            : Colors.white.withOpacity(0.08),
                                        borderRadius: BorderRadius.circular(22),
                                        border: Border.all(
                                          color: isSelected ? Colors.transparent : Colors.white24,
                                          width: 1,
                                        ),
                                      ),
                                      padding: const EdgeInsets.symmetric(horizontal: 16),
                                      child: Row(
                                        children: [
                                          Icon(
                                            tab['icon'] as IconData,
                                            color: isSelected ? const Color(0xFF2E7D32) : Colors.white,
                                            size: 16,
                                          ),
                                          const SizedBox(width: 6),
                                          Text(
                                            tab['name'] as String,
                                            style: TextStyle(
                                              color: isSelected ? const Color(0xFF2E7D32) : Colors.white,
                                              fontWeight: FontWeight.bold,
                                              fontSize: 12,
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
                          const SizedBox(height: 18),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
          ),

          // First Basket Perks Promo Banner
          SliverToBoxAdapter(
            child: Container(
              margin: const EdgeInsets.fromLTRB(16, 16, 16, 4),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFFE6F9F3), Color(0xFFC3F3E3)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: const Color(0xFF34C759).withOpacity(0.15)),
              ),
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  // Perk bag illustration mockup
                  Container(
                    width: 50,
                    height: 50,
                    decoration: const BoxDecoration(
                      color: Colors.white,
                      shape: BoxShape.circle,
                    ),
                    child: const Center(
                      child: Icon(Icons.wallet_giftcard_rounded, color: Color(0xFF1E88E5), size: 24),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Your first basket comes with perks',
                          style: TextStyle(
                            color: Color(0xFF1B5E20),
                            fontWeight: FontWeight.w900,
                            fontSize: 13,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            _buildPerkBadge('₹50 OFF'),
                            const SizedBox(width: 4),
                            _buildPerkBadge('₹150 OFF'),
                            const SizedBox(width: 4),
                            _buildPerkBadge('Free Delivery'),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Horizontal Quick Link Category Gradients
          SliverToBoxAdapter(
            child: SizedBox(
              height: 140,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                physics: const BouncingScrollPhysics(),
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                itemCount: _quickLinks.length,
                itemBuilder: (context, index) {
                  final link = _quickLinks[index];
                  final List<Color> gradients = link['gradient'] as List<Color>;
                  final isDarkBg = gradients[0].computeLuminance() < 0.3;

                  return GestureDetector(
                    onTap: () => context.push('/category/${link['title']}'),
                    child: Container(
                      width: 110,
                      margin: const EdgeInsets.symmetric(horizontal: 4),
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: gradients,
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(18),
                      ),
                      clipBehavior: Clip.antiAlias,
                      child: Stack(
                        children: [
                          // Details Text
                          Padding(
                            padding: const EdgeInsets.all(10.0),
                            child: Text(
                              link['title'] as String,
                              style: TextStyle(
                                color: isDarkBg ? Colors.white : Colors.black87,
                                fontWeight: FontWeight.w900,
                                fontSize: 11,
                                height: 1.15,
                              ),
                            ),
                          ),
                          // Floating item image aligning bottom right
                          Positioned(
                            right: -10,
                            bottom: -10,
                            child: Image.network(
                              link['image'] as String,
                              width: 68,
                              height: 68,
                              fit: BoxFit.cover,
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
          ),

          // BIG VALUE DAYS soft purple container section
          SliverToBoxAdapter(
            child: Container(
              margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0xFFF3E8FF), // Soft purple card
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: const Color(0xFFE9D5FF), width: 1),
              ),
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Stylized Header text
                  Center(
                    child: Text(
                      'BIG VALUE DAYS',
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 1.2,
                        foreground: Paint()
                          ..style = PaintingStyle.stroke
                          ..strokeWidth = 2.5
                          ..color = const Color(0xFF6B21A8), // dark purple outline
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  // Grid of 8 category cards
                  GridView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 4,
                      crossAxisSpacing: 8,
                      mainAxisSpacing: 8,
                      childAspectRatio: 0.76,
                    ),
                    itemCount: _bigValueCategories.length,
                    itemBuilder: (context, index) {
                      final cat = _bigValueCategories[index];

                      return GestureDetector(
                        onTap: () => context.push('/category/${cat['title']}'),
                        child: Container(
                          decoration: BoxDecoration(
                            color: isDark ? const Color(0xFF2C2C2E) : Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withOpacity(0.04),
                                blurRadius: 8,
                              ),
                            ],
                          ),
                          clipBehavior: Clip.antiAlias,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              // Title
                              Padding(
                                padding: const EdgeInsets.fromLTRB(6, 6, 6, 2),
                                child: Text(
                                  cat['title']!,
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                    color: isDark ? Colors.white70 : Colors.black87,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 9,
                                    height: 1.1,
                                  ),
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              // Image
                              Expanded(
                                child: Padding(
                                  padding: const EdgeInsets.symmetric(horizontal: 4.0),
                                  child: Image.network(
                                    cat['image']!,
                                    fit: BoxFit.cover,
                                  ),
                                ),
                              ),
                              // Discount Purple Badge at the bottom
                              Container(
                                color: const Color(0xFF6200EE), // Soft purple
                                padding: const EdgeInsets.symmetric(vertical: 3),
                                alignment: Alignment.center,
                                child: Text(
                                  cat['discount']!,
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.w900,
                                    fontSize: 7.5,
                                    letterSpacing: 0.2,
                                  ),
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
            ),
          ),

          // Section Title for Filtered Products feed
          if (_activeTab == 'All') ...[
            for (final category in MockDataService.categories) ...[
              if (MockDataService.products.where((p) => p.categoryId == category.id).isNotEmpty) ...[
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 12),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          category.name,
                          style: AppTypography.display(
                            isDark ? Colors.white : AppColors.textPrimary,
                          ).copyWith(fontSize: 20, fontWeight: FontWeight.bold),
                        ),
                        GestureDetector(
                          onTap: () => context.push('/category/${category.id}'),
                          child: const Row(
                            children: [
                              Text(
                                'See all',
                                style: TextStyle(
                                  color: Color(0xFF2E7D32),
                                  fontWeight: FontWeight.bold,
                                  fontSize: 14,
                                ),
                              ),
                              Icon(
                                Icons.chevron_right_rounded,
                                color: Color(0xFF2E7D32),
                                size: 18,
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                SliverToBoxAdapter(
                  child: SizedBox(
                    height: 290,
                    child: ListView.builder(
                      physics: const BouncingScrollPhysics(),
                      scrollDirection: Axis.horizontal,
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      itemCount: MockDataService.products
                          .where((p) => p.categoryId == category.id)
                          .take(3)
                          .length,
                      itemBuilder: (context, index) {
                        final prod = MockDataService.products
                            .where((p) => p.categoryId == category.id)
                            .toList()[index];
                        return Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 6),
                          child: ProductCard(
                            product: prod,
                            onTap: () => context.push('/product/${prod.id}'),
                            onAdd: () {
                              cartNotifier.addToCart(prod);
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text('Added ${prod.name} to Cart'),
                                  duration: const Duration(seconds: 1),
                                  behavior: SnackBarBehavior.floating,
                                ),
                              );
                            },
                          ),
                        );
                      },
                    ),
                  ),
                ),
              ],
            ],
          ] else ...[
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 12),
                child: Text(
                  'Featured $_activeTab',
                  style: AppTypography.display(
                    isDark ? Colors.white : AppColors.textPrimary,
                  ).copyWith(fontSize: 20, fontWeight: FontWeight.bold),
                ),
              ),
            ),
            filteredProducts.isEmpty
                ? SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 40.0),
                      child: Center(
                        child: Column(
                          children: [
                            const Icon(Icons.shopping_bag_outlined, size: 64, color: Colors.grey),
                            const SizedBox(height: 12),
                            Text(
                              'Featured items coming soon!',
                              style: AppTypography.bodyMedium(Colors.grey),
                            ),
                          ],
                        ),
                      ),
                    ),
                  )
                : SliverToBoxAdapter(
                    child: SizedBox(
                      height: 290,
                      child: ListView.builder(
                        physics: const BouncingScrollPhysics(),
                        scrollDirection: Axis.horizontal,
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        itemCount: filteredProducts.length,
                        itemBuilder: (context, index) {
                          final prod = filteredProducts[index];
                          return Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 6),
                            child: ProductCard(
                              product: prod,
                              onTap: () => context.push('/product/${prod.id}'),
                              onAdd: () {
                                cartNotifier.addToCart(prod);
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text('Added ${prod.name} to Cart'),
                                    duration: const Duration(seconds: 1),
                                    behavior: SnackBarBehavior.floating,
                                  ),
                                );
                              },
                            ),
                          );
                        },
                      ),
                    ),
                  ),
          ],

          // Extra spacing to prevent overlap with floating widgets
          const SliverToBoxAdapter(
            child: SizedBox(height: 120),
          ),
        ],
      ),
    );
  }

  Widget _buildPerkBadge(String label) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFFC0FF00),
        borderRadius: BorderRadius.circular(6),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 4,
          ),
        ],
      ),
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
      child: Text(
        label,
        style: const TextStyle(
          color: Colors.black,
          fontWeight: FontWeight.w900,
          fontSize: 9,
        ),
      ),
    );
  }
}
