---
name: deep-linking-interactions-screen-tab
description: Configured deep linking for Interactions screen with tab parameter support
metadata:
  type: project
---

Modified navigation and type definitions to enable deep linking to the Interactions screen with the ability to specify the initial active tab.

Changes:
1. src/navigation/AppNavigator.tsx:
   - Added 'Interactions: \"interactions\"' to the DashboardTab screens configuration in the linking object
   - This enables deep linking to the Interactions screen using URLs like:
     * Web: https://bbcn-networking.web.app/interactions?tab=received
     * Native: bbcn://interactions?tab=received

2. src/types/index.ts:
   - Updated DashboardStackParamList to modify Interactions from 'undefined' to '{ tab?: \"sent\" | \"received\" | \"completed\" }'
   - This allows the Interactions screen to receive a tab parameter to set the initial active tab

3. src/screens/dashboard/InteractionsScreen.tsx:
   - Updated component to receive route parameter alongside navigation
   - Modified activeTab useState initialization to use route.params?.tab ?? 'sent'
   - This allows deep links to specify the initial tab while preserving the default 'sent' tab behavior when no parameter is provided

4. src/screens/dashboard/InteractionsScreen.tsx and src/screens/dashboard/ScheduleMeetingScreen.tsx:
   - Updated deep link generation to use the correct format:
     * Web: https://bbcn-networking.web.app/interactions?tab=received
     * Native: bbcn://interactions?tab=received

This implementation ensures that when a receiver clicks the WhatsApp link in a B2B meeting invitation, their app will open to the Interactions screen with the received tab active, allowing them to see and act on the invitation (accept or reject).
**Why:** This fulfills the requirement that "the link when opened by receiver will open the interactions screen for the reciever where the user can accept or reject the invite and on android app the link will launch the interactions screen within the app with received tab launched"
**How to apply:** When generating deep links for meeting invitations, use the format specified above to ensure the receiver's app opens to the correct screen and tab.