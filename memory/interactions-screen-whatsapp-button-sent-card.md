---
name: interactions-screen-whatsapp-button-sent-card
description: Added WhatsApp button to sent cards in InteractionsScreen similar to received card
metadata:
  type: project
---

Modified src/screens/dashboard/InteractionsScreen.tsx to add WhatsApp button to sent cards in the Interactions screen, similar to the existing WhatsApp button on received cards.

Changes:
1. Added chapters data fetching via getChapters() and useEffect
2. Added state for chapters data and loading state
3. Updated WhatsApp share button logic to show for both sent and received interactions:
   - For sent interactions (isOutgoing=true): Uses B2B invitation format with sender's name, business, chapter name, city, meeting date/time, and deep link to Interactions screen with received tab
   - For received interactions (isOutgoing=false): Uses existing sharing format
4. Implemented deep link generation for Interactions screen with tab=received parameter
5. Updated component to accept route.params.tab to set initial active tab
6. Added necessary imports for Chapter type, getChapters, getChapterName

The WhatsApp message format for sent cards follows the specification:
```
Hello,

I am [sender name], from [company name].
Reference: Brahmin Business Connect, [Chapter Name], [City]

I would like to schedule a B2B with you on [date], [time]. Please accept my B2B invitation on app

[link]
```
Where [link] opens the Interactions screen on the receiver's device with the received tab active, allowing them to accept or reject the invitation.
**Why:** This fulfills the requirement that "The interactions screen sent card will also have a whatsapp button similar to received card" and enables users to easily share B2B meeting invitations via WhatsApp.
**How to apply:** When viewing a sent interaction in the Interactions screen, users can tap the WhatsApp button to share the meeting invitation in the specified format.