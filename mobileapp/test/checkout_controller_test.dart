import 'package:flutter_test/flutter_test.dart';
import 'package:freshcart/core/services/payment_service.dart';
import 'package:freshcart/features/checkout/presentation/controllers/checkout_controller.dart';

// Full-flow CheckoutController tests would need the real cart/orders/auth
// providers (getIt-backed). These cover the payment result handling + the
// checkout state machine, which is where the logic risk is.

void main() {
  test('SimulatedGateway completes a payment without a real sheet', () async {
    final r = await SimulatedGateway().pay(const PaymentRequest(
      keyId: '',
      razorpayOrderId: 'o1',
      amountPaise: 5000,
      name: 'x',
      description: 'y',
      contact: '',
      email: '',
    ));
    expect(r, isA<PaymentSuccess>());
    expect((r as PaymentSuccess).paymentId, startsWith('pay_sim_'));
    expect(r.razorpayOrderId, 'o1');
  });

  test('PaymentFailure carries the cancelled flag', () {
    const cancelled = PaymentFailure('Payment cancelled', cancelled: true);
    expect(cancelled.cancelled, isTrue);

    const failed = PaymentFailure('Card declined');
    expect(failed.cancelled, isFalse);
    expect(failed.message, 'Card declined');
  });

  test('CheckoutState transitions and copyWith', () {
    var s = const CheckoutState();
    expect(s.isProcessing, isFalse);
    expect(s.status, CheckoutStatus.idle);

    s = s.copyWith(status: CheckoutStatus.processing, stage: 'Verifying payment…');
    expect(s.isProcessing, isTrue);
    expect(s.stage, 'Verifying payment…');

    s = s.copyWith(status: CheckoutStatus.failed, error: 'nope');
    expect(s.error, 'nope');

    s = s.copyWith(clearError: true);
    expect(s.error, isNull);

    s = s.copyWith(status: CheckoutStatus.success, placedOrderId: 'PN123');
    expect(s.placedOrderId, 'PN123');
  });
}
