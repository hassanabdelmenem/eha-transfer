---
name: Full Sync Workflow
description: Defines the expected behavior when the user requests a "full sync" in this repository.
---

# Full Sync Workflow

When the user requests a "full sync" in this repository, they expect the local state to be synchronized across GitHub, Firebase, Google Cloud, and the live application.

The `sevensn` branch has been deprecated; `main` is the default authoritative branch.

To perform a full sync, execute the following commands sequentially:

1. **GitHub Sync**: Push all committed changes to the main branch.
   ```bash
   git push origin main
   ```

2. **Local Build**: Build the production assets using Vite.
   ```bash
   npm run build
   ```

3. **Firebase & Google Cloud Sync**: Deploy the built assets and Firestore rules/indexes to the live Firebase environment. 
   *(Note: Exclude functions unless the project is upgraded to the Blaze plan.)*
   ```bash
   npx firebase deploy --only firestore,hosting
   ```
