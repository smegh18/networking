---
name: schedule-meeting-screen-whatsapp-sharing
description: Added WhatsApp sharing with B2B invitation format when scheduling meetings
metadata:
  type: project
---

Modified src/screens/dashboard/ScheduleMeetingScreen.tsx to launch WhatsApp with a specific B2B invitation message format when the "send invite" button is clicked after scheduling a meeting.

Changes:
1. Added chapters data fetching via getChapters() and useEffect
2. Added state for chapters data and loading state
3. Added imports for getChapterName, Linking, and Chapter type
4. Modified handleSubmit function to:
   - Get chapter name from currentUser's chapterId using getChapterName and chapters data
   - Generate deep link to Interactions screen with tab=received parameter
   - Format WhatsApp message exactly as specified in requirements:
     ```
     Hello,

     I am [sender name], from [company name].
     Reference: Brahmin Business Connect, [Chapter Name], [City]

     I would like to schedule a B2B with you on [date], [time]. Please accept my B2B invitation on app

     [link]
     ```
   - Launch WhatsApp with the formatted message:
     * For web: Use window.open(`https://wa.me/?text=${encodedMessage}`, '_blank')
     * For native: Show Alert with message and option to open the deep link (preserving existing behavior while preparing for Share API integration)
   - Still schedule the meeting in the database and create notification (preserving existing functionality)
   - Show success modal as before

The implementation preserves all existing meeting scheduling functionality while adding the requested WhatsApp sharing capability for B2B meeting invitations.
**Why:** This fulfills the requirement that "when a user schedules a meeting from schedule b2b option on dashboard after clicking send invite the user should have the whatsapp intent launch with the following message" including the specific format and deep link behavior.
**How to apply:** When scheduling a meeting in the Schedule Meeting screen and clicking the "send invite" button, the app will schedule the meeting and then provide options to share the invitation via WhatsApp in the specified format.