# RHM App Tasks

## Requested Work
- [x] Confirm Expo dev client setup for reusable custom development builds.
- [x] Disable ads for the current build while development work continues.
- [x] Add notification-denied reminders for users who tap "Don't allow".
- [x] Add Home screen video search that filters only cached/loaded videos.
- [x] Keep the Radio screen MREC ad area stable and policy-safe when ads fail or are unavailable.
- [x] Add app usage tracking for active devices, today, 7 days, and 28 days.
- [x] Show usage counts in the admin dashboard.

## Constraints
- User search must never call YouTube or use the YouTube API key.
- Ad changes must avoid accidental clicks, layout shifts, overlays, or disguised ad placement.
- Notification reminders cannot bypass OS permissions; denied users can only be reminded in-app.
