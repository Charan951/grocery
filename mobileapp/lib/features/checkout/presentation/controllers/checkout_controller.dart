import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:freshcart/core/error/api_exception.dart';
import 'package:freshcart/core/services/api_service.dart';
import 'package:freshcart/core/services/payment_service.dart';
import 'package:freshcart/features/authentication/presentation/controllers/auth_controller.dart';
import 'package:freshcart/features/cart/presentation/controllers/cart_controller.dart';
import 'package:freshcart/features/home/presentation/controllers/catalog_providers.dart' show apiServiceProvider;
import 'package:freshcart/features/orders/presentation/controllers/orders_controller.dart';

enum PaymentMethod { razorpay, wallet, cod }

enum CheckoutStatus { idle, processing, success, failed }

class CheckoutState {
  final CheckoutStatus status;
  final String stage; // human-readable step, shown in the overlay
  final String? error;
  final String? placedOrderId;

  const CheckoutState({
    this.status = CheckoutStatus.idle,
    this.stage = '',
    this.error,
    this.placedOrderId,
  });

  bool get isProcessing => status == CheckoutStatus.processing;

  CheckoutState copyWith({
    CheckoutStatus? status,
    String? stage,
    String? error,
    bool clearError = false,
    String? placedOrderId,
  }) {
    return CheckoutState(
      status: status ?? this.status,
      stage: stage ?? this.stage,
      error: clearError ? null : (error ?? this.error),
      placedOrderId: placedOrderId ?? this.placedOrderId,
    );
  }
}

/// Swappable so tests can inject a fake gateway.
final paymentGatewayProvider = Provider<PaymentGateway>((ref) => RazorpayGateway());

class CheckoutController extends StateNotifier<CheckoutState> {
  final Ref _ref;
  CheckoutController(this._ref) : super(const CheckoutState());

  ApiService get _api => _ref.read(apiServiceProvider);

  void reset() => state = const CheckoutState();

  Future<void> submit({
    required PaymentMethod method,
    required String address,
  }) async {
    if (state.isProcessing) return;

    final cart = _ref.read(cartProvider);
    final auth = _ref.read(authProvider);
    if (cart.items.isEmpty) {
      state = state.copyWith(status: CheckoutStatus.failed, error: 'Your cart is empty.');
      return;
    }

    final total = cart.totalPayableAmount;
    final user = auth.user;
    state = const CheckoutState(status: CheckoutStatus.processing, stage: 'Starting checkout…');

    try {
      String paymentLabel;
      bool paid;
      String? paymentId;
      String? paymentRef;

      switch (method) {
        case PaymentMethod.cod:
          paymentLabel = 'Cash on Delivery';
          paid = false;
          break;

        case PaymentMethod.wallet:
          paymentLabel = 'FreshCart Wallet';
          if ((user?.walletBalance ?? 0) < total) {
            _fail('Insufficient wallet balance.');
            return;
          }
          state = state.copyWith(stage: 'Paying from wallet…');
          final newBalance = await _api.walletDebit(amount: total);
          _ref.read(authProvider.notifier).setWalletBalance(newBalance);
          paid = true;
          paymentId = 'wallet';
          break;

        case PaymentMethod.razorpay:
          state = state.copyWith(stage: 'Creating payment order…');
          final rzp = await _api.createRazorpayOrder(amount: total);
          final key = (rzp['key'] ?? '').toString();
          final rzpOrderId = (rzp['orderId'] ?? '').toString();
          final testMode = rzp['testMode'] == true;

          final gateway = (testMode && key.isEmpty)
              ? SimulatedGateway()
              : _ref.read(paymentGatewayProvider);

          state = state.copyWith(stage: 'Opening payment…');
          final result = await gateway.pay(PaymentRequest(
            keyId: key,
            razorpayOrderId: rzpOrderId,
            amountPaise: (total * 100).round(),
            name: 'FreshCart',
            description: 'Grocery order',
            contact: user?.phone ?? '',
            email: user?.email ?? '',
          ));

          if (result is PaymentFailure) {
            _fail(result.cancelled ? 'Payment cancelled.' : result.message);
            return;
          }
          final ok = result as PaymentSuccess;

          state = state.copyWith(stage: 'Verifying payment…');
          final verify = await _api.verifyPayment(
            razorpayOrderId: ok.razorpayOrderId,
            paymentId: ok.paymentId,
            signature: ok.signature,
          );
          if (verify['verified'] != true) {
            _fail('We could not verify your payment. You have not been charged for an order.');
            return;
          }

          paymentLabel = 'Razorpay';
          paid = true;
          paymentId = ok.paymentId;
          paymentRef = ok.razorpayOrderId;
          break;
      }

      state = state.copyWith(stage: 'Placing your order…');
      final orderId = await _ref.read(ordersProvider.notifier).placeOrder(
            items: cart.items,
            subtotal: cart.subtotal,
            deliveryFee: cart.deliveryFee,
            platformFee: cart.platformFee,
            discount: cart.couponDiscount,
            tax: cart.taxAmount,
            total: total,
            address: address,
            paymentMethod: paymentLabel,
            paid: paid,
            paymentId: paymentId,
            paymentRef: paymentRef,
          );

      _ref.read(cartProvider.notifier).clearCart();
      state = state.copyWith(status: CheckoutStatus.success, placedOrderId: orderId, stage: 'Done');
    } on ApiException catch (e) {
      _fail(e.message);
    } catch (e) {
      _fail('Something went wrong. Please try again.');
    }
  }

  void _fail(String msg) {
    state = state.copyWith(status: CheckoutStatus.failed, error: msg, stage: '');
  }
}

final checkoutControllerProvider =
    StateNotifierProvider<CheckoutController, CheckoutState>((ref) {
  return CheckoutController(ref);
});
