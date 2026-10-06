# Legacy default Hosting site → production redirect

The project's default Hosting site (`eha-transfer-1785622025.web.app` / `.firebaseapp.com`)
served an old app build against production data, with no update check. Since 6 Oct 2026 it only
redirects (301, path and query kept) to https://eha-transfer.web.app. Production sign-in uses
`eha-transfer.web.app` as its auth domain, so nothing depends on this site.

Not part of the CI deploy (the main `firebase.json` targets the `eha-transfer` site only).
Redeploy by hand if ever needed:

    cd ops/legacy-site-redirect && firebase deploy --only hosting --project eha-transfer-1785622025
