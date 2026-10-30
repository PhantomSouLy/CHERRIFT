# CHERRIFT event modules

Create `event/<slug>/event.json`, where `id` equals the folder name. Run `npm run events:build` and commit the resulting `event/catalog.json` along with the module. After publishing the repository, choose **Event Management → Sync repository** in the Admin Center. New modules are disabled until a manager publishes them.

```json
{
  "id": "sakura-festival",
  "name": "Sakura Festival",
  "category": "limited",
  "renderer": "content",
  "description": "A seasonal celebration.",
  "sections": [{"title": "Welcome", "body": "Event details go here."}]
}
```

Categories: `limited` and `permanent`. Content is plain text, never executable HTML or remote JavaScript. Custom gameplay renderers must be implemented and reviewed in code; `closed-beta` is the existing rewards module.

Managers can enable, disable, reorder, and schedule modules. Limited events require an end date. Server time determines visibility: inclusive start, exclusive end. Permanent events may omit both dates. A removed repository module is disabled on the next explicit sync. Re-adding it preserves its old schedule but leaves it disabled. Visible numbering is recalculated per category without gaps.

The client revalidates while open, at every upcoming transition, when regaining focus and after reconnecting. Changes made by managers arrive within 60 seconds. A failed feed closes event access until a successful refresh; there is no cached offline publication. Existing Closed Beta rewards retain their pre-existing game implementation; this menu is a publication system, not a new reward authorization service.
