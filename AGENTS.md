<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- UniStretch stores user-owned wellness records in Lovable Cloud tables with RLS; keep client writes scoped to the signed-in user so private data stays separated.
- Keep all viewport experiences as state-driven tab screens within the main route so timer and form state persist while switching tabs.
- Reward browsing is presentation-only until a redemption service is requested; never deduct saved points for preview actions.
- Keep illustrated movement instructions in a standalone presentation component; selecting a guide must not start or complete the points timer.
- Keep first-login walkthrough completion in browser storage scoped to the signed-in user ID, so the frontend tour does not change private wellness records.
- Keep video filtering and detail browsing separate from exercise start actions, so opening instructions never starts the points timer.
