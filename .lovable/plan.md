# First-login tour, stretch details, and doctor profiles

## What will change
- Add a four-step first-login walkthrough covering Home, Stretch, Doctors, and Profile.
- Provide Next, Back, and Skip controls; remember completion for each signed-in user so it does not repeat.
- Keep a visible stretch filter bar, expand the video library from three to five clips, and move illustrated step-by-step guidance into each clip’s details.
- Add a clear Details action for each stretch, while keeping “Do this exercise” as the separate action that starts the timed points flow.
- Add the three attached doctor photos to the Doctors screen and present each doctor as a selectable profile with specialty and next availability.

## Technical details
- Store walkthrough completion locally under the signed-in user ID; no private health data or database changes are involved.
- Reuse the standalone illustrated guide component inside the selected video detail dialog, with each clip mapped to the closest matching movement guide.
- Upload the provided photos through the project asset flow and reference their CDN pointers.
- Preserve the existing state-driven tab navigation, booking behavior, exercise timer, and points rules.

## Verification
- Test walkthrough navigation and Skip on phone, tablet, and desktop widths.
- Test filtering, all five clip cards, video details, hidden step images until details open, and exercise start behavior.
- Test doctor photo loading, doctor selection, and appointment booking controls.
- Run the existing route tests and confirm the preview has no build or runtime errors.
