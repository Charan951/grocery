import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:freshcart/core/theme/app_theme.dart';
import 'package:freshcart/core/widgets/app_bottom_sheet.dart';
import 'package:freshcart/core/widgets/app_modal.dart';
import 'package:freshcart/core/widgets/app_scaffold.dart';
import 'package:freshcart/core/widgets/app_text_field.dart';
import 'package:freshcart/core/widgets/app_toast.dart';
import 'package:freshcart/core/widgets/loading_overlay.dart';
import 'package:freshcart/core/widgets/skeletons.dart';

Widget _host(Widget child) => MaterialApp(
      theme: AppTheme.lightTheme,
      scaffoldMessengerKey: AppToast.messengerKey,
      home: child,
    );

void main() {
  testWidgets('AppTextField shows label, error, and toggles obscure', (tester) async {
    await tester.pumpWidget(_host(
      const Scaffold(
        body: AppTextField(label: 'Email', errorText: 'Required', obscureText: true),
      ),
    ));

    expect(find.text('Email'), findsOneWidget);
    expect(find.text('Required'), findsOneWidget);

    expect(find.byIcon(Icons.visibility_off_rounded), findsOneWidget);
    await tester.tap(find.byIcon(Icons.visibility_off_rounded));
    await tester.pump();
    expect(find.byIcon(Icons.visibility_rounded), findsOneWidget);
  });

  testWidgets('AppModal.confirm returns true / false', (tester) async {
    late bool result;
    await tester.pumpWidget(_host(
      Scaffold(
        body: Builder(
          builder: (context) => TextButton(
            onPressed: () async {
              result = await AppModal.confirm(context,
                  title: 'Remove item', message: 'Are you sure?');
            },
            child: const Text('open'),
          ),
        ),
      ),
    ));

    await tester.tap(find.text('open'));
    await tester.pumpAndSettle();
    expect(find.text('Remove item'), findsOneWidget);

    await tester.tap(find.text('Confirm'));
    await tester.pumpAndSettle();
    expect(result, isTrue);
  });

  testWidgets('AppBottomSheet shows a drag handle and title, dismisses on drag',
      (tester) async {
    await tester.pumpWidget(_host(
      Scaffold(
        body: Builder(
          builder: (context) => TextButton(
            onPressed: () => AppBottomSheet.show(
              context,
              title: 'Filters',
              child: const SizedBox(height: 120, child: Text('sheet body')),
            ),
            child: const Text('open'),
          ),
        ),
      ),
    ));

    await tester.tap(find.text('open'));
    await tester.pumpAndSettle();
    expect(find.text('Filters'), findsOneWidget);
    expect(find.text('sheet body'), findsOneWidget);

    await tester.drag(find.text('sheet body'), const Offset(0, 400));
    await tester.pumpAndSettle();
    expect(find.text('sheet body'), findsNothing);
  });

  testWidgets('AppToast.success surfaces a floating snackbar', (tester) async {
    await tester.pumpWidget(_host(const Scaffold(body: SizedBox())));
    AppToast.success('Saved');
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.text('Saved'), findsOneWidget);
  });

  testWidgets('LoadingOverlay blocks and shows a spinner when loading', (tester) async {
    await tester.pumpWidget(_host(
      const Scaffold(
        body: LoadingOverlay(
          isLoading: true,
          child: SizedBox.expand(child: Text('content')),
        ),
      ),
    ));
    expect(find.byType(CircularProgressIndicator), findsOneWidget);
    expect(
      find.byWidgetPredicate((w) => w is AbsorbPointer && w.absorbing),
      findsOneWidget,
    );
  });

  testWidgets('SkeletonList / SkeletonGrid build without overflow', (tester) async {
    await tester.pumpWidget(_host(
      const Scaffold(
        body: SingleChildScrollView(
          child: Column(children: [SkeletonList(itemCount: 3), SkeletonGrid(itemCount: 4)]),
        ),
      ),
    ));
    expect(tester.takeException(), isNull);
  });

  testWidgets('AppScaffold renders a back button that pops', (tester) async {
    await tester.pumpWidget(_host(
      Builder(
        builder: (context) => Scaffold(
          body: Center(
            child: TextButton(
              onPressed: () => Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => const AppScaffold(title: 'Details', body: Text('page2')),
                ),
              ),
              child: const Text('go'),
            ),
          ),
        ),
      ),
    ));

    await tester.tap(find.text('go'));
    await tester.pumpAndSettle();
    expect(find.text('page2'), findsOneWidget);

    await tester.tap(find.byIcon(Icons.arrow_back_rounded));
    await tester.pumpAndSettle();
    expect(find.text('page2'), findsNothing);
    expect(find.text('go'), findsOneWidget);
  });
}
