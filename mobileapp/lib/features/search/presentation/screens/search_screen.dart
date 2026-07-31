import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/core/widgets/search_bar.dart';
import 'package:freshcart/core/widgets/product_card.dart';
import 'package:freshcart/core/widgets/feedback_states.dart';
import 'package:freshcart/core/services/mock_data_service.dart';
import 'package:freshcart/features/cart/presentation/controllers/cart_controller.dart';
import 'package:freshcart/features/products/data/models/product_model.dart';

class SearchScreen extends ConsumerStatefulWidget {
  const SearchScreen({super.key});

  @override
  ConsumerState<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends ConsumerState<SearchScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _query = '';
  List<ProductModel> _results = [];
  bool _isSearching = false;

  final List<String> _trendingSearches = [
    'Avocado',
    'Baby Spinach',
    'Greek Yogurt',
    'Sourdough',
    'Milk',
    'Blueberries',
  ];

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _onSearch(String text) async {
    setState(() {
      _query = text;
      _isSearching = true;
    });

    // Simulate search network latency
    await Future.delayed(const Duration(milliseconds: 300));

    if (text.isEmpty) {
      setState(() {
        _results = [];
        _isSearching = false;
      });
      return;
    }

    final queryLower = text.toLowerCase();
    final matches = MockDataService.products.where((p) {
      return p.name.toLowerCase().contains(queryLower) ||
          p.brand.toLowerCase().contains(queryLower) ||
          p.description.toLowerCase().contains(queryLower);
    }).toList();

    setState(() {
      _results = matches;
      _isSearching = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final cartNotifier = ref.read(cartProvider.notifier);

    return Scaffold(
      backgroundColor: isDark ? AppColors.backgroundDark : AppColors.background,
      appBar: AppBar(
        title: const Text('Search Products'),
        centerTitle: false,
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 12),
              CustomSearchBar(
                controller: _searchController,
                onChanged: _onSearch,
                onSubmitted: _onSearch,
              ),
              const SizedBox(height: 20),
              
              if (_query.isEmpty) ...[
                // Trending searches header
                Text(
                  'Trending Searches',
                  style: AppTypography.h3(
                    isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 12),
                
                // Wrap chips
                Wrap(
                  spacing: 10,
                  runSpacing: 10,
                  children: _trendingSearches.map((term) {
                    return GestureDetector(
                      onTap: () {
                        _searchController.text = term;
                        _onSearch(term);
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                        decoration: BoxDecoration(
                          color: isDark ? Colors.white10 : Colors.white,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                            color: isDark ? Colors.white12 : AppColors.divider,
                          ),
                        ),
                        child: Text(
                          term,
                          style: AppTypography.labelMedium(
                            isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ] else ...[
                // Search status
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Search Results for "$_query"',
                      style: AppTypography.title(
                        isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                      ),
                    ),
                    Text(
                      '${_results.length} found',
                      style: AppTypography.bodySmall(
                        isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                
                Expanded(
                  child: _isSearching
                      ? const Center(
                          child: CircularProgressIndicator(color: AppColors.primary),
                        )
                      : _results.isEmpty
                          ? const EmptyState(
                              title: 'No Matches Found',
                              description: 'We couldn\'t find any products matching your query. Try checking spelling or search another item.',
                              icon: Icons.search_off_rounded,
                            )
                          : GridView.builder(
                              physics: const BouncingScrollPhysics(),
                              padding: const EdgeInsets.only(bottom: 100),
                              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                                crossAxisCount: 2,
                                crossAxisSpacing: 14,
                                mainAxisSpacing: 14,
                                childAspectRatio: 0.64,
                              ),
                              itemCount: _results.length,
                              itemBuilder: (context, index) {
                                final prod = _results[index];
                                return ProductCard(
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
                                );
                              },
                            ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
class SearchDetailScreen extends StatelessWidget {
  const SearchDetailScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const SearchScreen();
  }
}
