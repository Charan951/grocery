import 'package:flutter_test/flutter_test.dart';
import 'package:freshcart/core/services/pricing.dart';

void main() {
  group('PricingConfig.fromSettings', () {
    test('reads backend Settings shape', () {
      final c = PricingConfig.fromSettings({'taxPercent': 5, 'deliveryFeeRule': 40});
      expect(c.taxPercent, 5);
      expect(c.deliveryFee, 40);
      expect(c.freeDeliveryThreshold, 499); // default
      expect(c.platformFee, 5); // default
    });

    test('tolerates missing / string values', () {
      final c = PricingConfig.fromSettings({'taxPercent': '12'});
      expect(c.taxPercent, 12);
      expect(c.deliveryFee, 40);
    });
  });

  group('PricingService.compute', () {
    const cfg = PricingConfig(taxPercent: 5, deliveryFee: 40, freeDeliveryThreshold: 499, platformFee: 5);

    test('empty cart -> all zero', () {
      final b = PricingService.compute(lines: const [], config: cfg);
      expect(b.total, 0);
      expect(b.subtotal, 0);
    });

    test('below free-delivery threshold: delivery + platform + 5% tax', () {
      // 2 x ₹100 (mrp ₹120) = subtotal 200, savings 40
      final b = PricingService.compute(
        lines: const [PriceLine(100, 120, 2)],
        config: cfg,
      );
      expect(b.subtotal, 200);
      expect(b.itemSavings, 40);
      expect(b.deliveryFee, 40);
      expect(b.platformFee, 5);
      expect(b.tax, closeTo(10, 0.001)); // 5% of 200
      expect(b.total, closeTo(255, 0.001)); // 200 + 40 + 5 + 10
    });

    test('at/above threshold: delivery is free', () {
      final b = PricingService.compute(
        lines: const [PriceLine(500, 500, 1)],
        config: cfg,
      );
      expect(b.deliveryFee, 0);
      expect(b.total, closeTo(500 + 0 + 5 + 25, 0.001));
    });

    test('coupon reduces the taxable base and is capped at subtotal', () {
      final b = PricingService.compute(
        lines: const [PriceLine(100, 100, 3)], // subtotal 300
        config: cfg,
        couponDiscount: 400, // more than subtotal
      );
      expect(b.couponDiscount, 300); // clamped
      expect(b.tax, 0); // taxable base is 0
      expect(b.total, closeTo(0 + 40 + 5 + 0, 0.001));
    });
  });
}
