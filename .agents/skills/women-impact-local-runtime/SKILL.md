---
name: women-impact-local-runtime
description: Run the Women Impact web admin and Android member app against local Supabase and validate access-control behavior.
---

# Local runtime

- Source `~/.nvm/nvm.sh`; dependencies live at both repo root and `admin/`.
- Inspect existing listeners and `docker ps -a` before starting duplicates. Local Supabase API is normally port 54321 and the DB container is `supabase_db_WomenImpactClub`. Existing persistent database data can survive process restarts; inspect profiles and gates rather than blindly reseeding.
- Run `npm run dev -- --host 0.0.0.0` in `admin/`; verify Vite's actual port (normally 5173).
- Read the public anon key from `admin/.env.local` without printing it. Start Metro from repo root with `EXPO_PUBLIC_SUPABASE_URL=http://10.0.2.2:54321` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` set, using `npx expo start --dev-client --port 8081`.
- Put `$HOME/Android/sdk/platform-tools` on PATH. Start available AVD `pixel7` using `$HOME/Android/sdk/emulator/emulator -avd pixel7 -no-snapshot-load -gpu swiftshader_indirect` if it is not running.
- Run `adb reverse tcp:8081 tcp:8081` and `adb reverse tcp:54321 tcp:54321`. The installed package is `com.womenimpactclub.app`; `adb shell am start -n com.womenimpactclub.app/.MainActivity` works when an Expo development-client deep link is not registered.
- Verify the app shows native authentication/membership screens, not website WebView fallback.
- Desktop clipboard typing may not enter emulator text. Focus the visible field, use `adb shell input text` (`%s` for spaces), and Tab between fields. Hide the keyboard with `adb shell input keyevent 4`.
- Metro's small overlay near the bottom may obscure tab hit targets; dismiss it before testing navigation.

# Test discipline

- Use public-anon-key SDK clients with explicit test credentials for hostile-client RLS/RPC checks. Do not use browser-extracted sessions. Admin clients may create and clean clearly named local fixtures.
- Record both persisted database values and app behavior when changing feature permissions. Compare tab navigation, Home refresh, and app relaunch separately: a relaunch succeeding does not prove immediate refresh.
- Test member/admin mutations on named throwaways; restore original permission rows, demo levels/status/admin flags, and profile edits afterward.
- Verify account deletion in both Auth and profiles, plus failed password sign-in.
- Real email/push assertions require configured providers. Local in-app notification rows and target isolation can be tested independently.
- For post-restart continuation, retain valid prior screenshots and completed assertions; restart recordings only after services and sessions are ready.

## Devin Secrets Needed

None for the seeded local environment when user-provided demo/admin credentials and `admin/.env.local` are present. A separately provisioned Supabase environment requires its own supplied credentials; never assume local credentials apply there.
