# CHERRIFT v0.3.1 Level-Up Freeze Fix

## Fixed
- Level-up modal could be hidden by the gameplay CSS while the game mode was already `level`.
- This caused the run to appear frozen because the game paused for an upgrade choice but the buttons were invisible.
- Level-up modal now always appears above gameplay.
- Skill button is hidden during level-up choice.
- Upgrade buttons remain clickable/tappable on mobile.
- Multiple level-ups in the same frame are queued correctly instead of overwriting the modal.

## Reason
Earlier CSS hid `body.is-playing .modal:not(#stageClearModal)`, which also hid `#levelModal`.
