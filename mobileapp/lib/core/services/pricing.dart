import 'package:freshcart/core/utils/parse.dart';

/// Pricing rules sourced from `GET /api/settings`. Defaults mirror the backend
/// `Settings` schema until the real values load.
class PricingConfig {
  final double taxPercent; // e.g. 5  -> 5% GST
  final double deliveryFee; // flat fee charged below the free threshold
  final double freeDeliveryThreshold; // subtotal at/above which delivery is free
  final double platformFee; // backend has no field for this; kept client-side

  const PricingConfig({
    this.taxPercent = 5,
    this.deliveryFee = 40,
    this.freeDeliveryThreshold = 499,
    this.platformFee = 5,
  });

  factory PricingConfig.fromSettings(Map<String, dynamic> s) {
    return PricingConfig(
      taxPercent: asDouble(s['taxPercent'], fallback: 5),
      deliveryFee: asDouble(s['deliveryFeeRule'], fallback: 40),
      freeDeliveryThreshold: asDouble(s['freeDeliveryThreshold'], fallback: 499),
      platformFee: asDouble(s['platformFee'], fallback: 5),
    );
  }
}

/// Line item: (unit price, unit MRP, quantity).
class PriceLine {
  final double price;
  final double mrp;
  final int qty;
  const PriceLine(this.price, this.mrp, this.qty);
}

class PriceBreakdown {
  final double itemTotalMrp;
  final double subtotal; // sum of price*qty (pre-coupon)
  final double itemSavings; // mrp - price savings
  final double couponDiscount;
  final double deliveryFee;
  final double platformFee;
  final double tax;
  final double total;

  const PriceBreakdown({
    required this.itemTotalMrp,
    required this.subtotal,
    required this.itemSavings,
    required this.couponDiscount,
    required this.deliveryFee,
    required this.platformFee,
    required this.tax,
    required this.total,
  });

  double get totalSavings => itemSavings + couponDiscount;
}

class PricingService {
  const PricingService._();

  static PriceBreakdown compute({
    required List<PriceLine> lines,
    required PricingConfig config,
    double couponDiscount = 0,
  }) {
    if (lines.isEmpty) {
      return const PriceBreakdown(
        itemTotalMrp: 0, subtotal: 0, itemSavings: 0, couponDiscount: 0,
        deliveryFee: 0, platformFee: 0, tax: 0, total: 0,
      );
    }

    double subtotal = 0, mrpTotal = 0;
    for (final l in lines) {
      subtotal += l.price * l.qty;
      mrpTotal += l.mrp * l.qty;
    }

    final coupon = couponDiscount.clamp(0, subtotal).toDouble();
    final taxable = (subtotal - coupon).clamp(0, double.infinity).toDouble();
    final delivery = subtotal >= config.freeDeliveryThreshold ? 0.0 : config.deliveryFee;
    final tax = taxable * config.taxPercent / 100;
    final total = (taxable + delivery + config.platformFee + tax)
        .clamp(0, double.infinity)
        .toDouble();

    return PriceBreakdown(
      itemTotalMrp: mrpTotal,
      subtotal: subtotal,
      itemSavings: (mrpTotal - subtotal).clamp(0, double.infinity).toDouble(),
      couponDiscount: coupon,
      deliveryFee: delivery,
      platformFee: config.platformFee,
      tax: tax,
      total: total,
    );
  }
}
