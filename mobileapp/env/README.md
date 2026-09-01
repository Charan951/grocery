# Build-time configuration

`AppConfig` (`lib/core/config/app_config.dart`) reads three `--dart-define`s:

| key | default | used by |
|---|---|---|
| `ENV` | `development` | `AppConfig.env` / `isProduction` |
| `API_BASE_URL` | `http://<10.0.2.2 or localhost>:5000/api` | `ApiService` |
| `SOCKET_URL` | `http://<10.0.2.2 or localhost>:5000` | `SocketService` |

## Run / build against an environment

```bash
# local (defaults — no flags needed)
flutter run

# staging / prod via a define file
flutter run  --dart-define-from-file=env/staging.json
flutter build apk --release --dart-define-from-file=env/prod.json
```

Create `env/prod.json` (git-ignored) with the real production URLs. `staging.json`
here is a placeholder — replace the host before use.
