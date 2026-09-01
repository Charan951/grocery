import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

/// Exercises the navigation *architecture* the app uses: full-screen routes
/// stacked above a [StatefulShellRoute.indexedStack] tab shell, per-branch
/// stacks that survive tab switches, deep push/pop, and Android back handling
/// (non-home tab -> home, nested page -> pop).
///
/// This mirrors `lib/core/routes/app_router.dart` + `MainScaffold` without
/// booting DI, so it stays a fast, hermetic unit test.

class _MiniShell extends StatefulWidget {
  final StatefulNavigationShell shell;
  const _MiniShell(this.shell);
  @override
  State<_MiniShell> createState() => _MiniShellState();
}

class _MiniShellState extends State<_MiniShell> {
  bool _handleBack() {
    if (widget.shell.currentIndex != 0) {
      widget.shell.goBranch(0);
      return false;
    }
    return true; // allow exit
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (didPop) return;
        if (_handleBack()) Navigator.of(context).maybePop();
      },
      child: Scaffold(
        body: widget.shell,
        bottomNavigationBar: Row(
          children: [
            for (var i = 0; i < 3; i++)
              Expanded(
                child: TextButton(
                  key: ValueKey('tab$i'),
                  onPressed: () => widget.shell.goBranch(
                    i,
                    initialLocation: i == widget.shell.currentIndex,
                  ),
                  child: Text('tab$i'),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

Widget _screen(String label, {String? pushTo}) => Scaffold(
      body: Center(
        child: Builder(
          builder: (context) => Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(label),
              if (pushTo != null)
                TextButton(
                  onPressed: () => context.push(pushTo),
                  child: Text('push $pushTo'),
                ),
            ],
          ),
        ),
      ),
    );

GoRouter _buildRouter() => GoRouter(
      initialLocation: '/',
      routes: [
        GoRoute(path: '/full', builder: (_, _) => _screen('FULL')),
        GoRoute(path: '/detail', builder: (_, _) => _screen('DETAIL', pushTo: '/detail2')),
        GoRoute(path: '/detail2', builder: (_, _) => _screen('DETAIL2')),
        StatefulShellRoute.indexedStack(
          builder: (_, _, shell) => _MiniShell(shell),
          branches: [
            StatefulShellBranch(routes: [
              GoRoute(path: '/', builder: (_, _) => _screen('HOME', pushTo: '/detail')),
              GoRoute(path: '/home/sub', builder: (_, _) => _screen('HOME_SUB')),
            ]),
            StatefulShellBranch(routes: [
              GoRoute(path: '/cats', builder: (_, _) => _screen('CATS', pushTo: '/cats/sub')),
              GoRoute(path: '/cats/sub', builder: (_, _) => _screen('CATS_SUB')),
            ]),
            StatefulShellBranch(routes: [
              GoRoute(path: '/account', builder: (_, _) => _screen('ACCOUNT')),
            ]),
          ],
        ),
      ],
    );

Future<void> _back(WidgetTester tester) async {
  await tester.binding.handlePopRoute();
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('starts on Home tab', (tester) async {
    await tester.pumpWidget(MaterialApp.router(routerConfig: _buildRouter()));
    await tester.pumpAndSettle();
    expect(find.text('HOME'), findsOneWidget);
  });

  testWidgets('each tab keeps its own navigation stack across switches',
      (tester) async {
    await tester.pumpWidget(MaterialApp.router(routerConfig: _buildRouter()));
    await tester.pumpAndSettle();

    // Dive into Categories tab's nested page.
    await tester.tap(find.byKey(const ValueKey('tab1')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('push /cats/sub'));
    await tester.pumpAndSettle();
    expect(find.text('CATS_SUB'), findsOneWidget);

    // Jump to Account, then back to Categories — its stack is preserved.
    await tester.tap(find.byKey(const ValueKey('tab2')));
    await tester.pumpAndSettle();
    expect(find.text('ACCOUNT'), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('tab1')));
    await tester.pumpAndSettle();
    expect(find.text('CATS_SUB'), findsOneWidget);
  });

  testWidgets('re-tapping the active tab pops it to its root', (tester) async {
    await tester.pumpWidget(MaterialApp.router(routerConfig: _buildRouter()));
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const ValueKey('tab1')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('push /cats/sub'));
    await tester.pumpAndSettle();
    expect(find.text('CATS_SUB'), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('tab1'))); // same tab again
    await tester.pumpAndSettle();
    expect(find.text('CATS'), findsOneWidget);
    expect(find.text('CATS_SUB'), findsNothing);
  });

  testWidgets('nested push/pop above the shell returns to the originating tab',
      (tester) async {
    await tester.pumpWidget(MaterialApp.router(routerConfig: _buildRouter()));
    await tester.pumpAndSettle();

    await tester.tap(find.text('push /detail'));
    await tester.pumpAndSettle();
    expect(find.text('DETAIL'), findsOneWidget);

    await tester.tap(find.text('push /detail2'));
    await tester.pumpAndSettle();
    expect(find.text('DETAIL2'), findsOneWidget);

    await _back(tester);
    expect(find.text('DETAIL'), findsOneWidget);

    await _back(tester);
    expect(find.text('HOME'), findsOneWidget);
  });

  testWidgets('Android back on a non-home tab returns to Home instead of exiting',
      (tester) async {
    await tester.pumpWidget(MaterialApp.router(routerConfig: _buildRouter()));
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const ValueKey('tab2')));
    await tester.pumpAndSettle();
    expect(find.text('ACCOUNT'), findsOneWidget);

    await _back(tester);
    expect(find.text('HOME'), findsOneWidget);
  });
}
