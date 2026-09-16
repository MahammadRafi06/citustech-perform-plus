# Dashboard: Where to focus next

Local browser verification at http://localhost:3000/overview.

- `before.jpg`: original bar list, 1920 × 937 desktop viewport.
- `after.jpg`: interactive opportunity map, matching 1920 × 937 viewport.
- `after-1440.jpg`: final layout at 1440 × 900.

The largest possible-addition categories use proportional blocks. Smaller groups remain readable as labeled rows. Possible overcoding and data issues have separate summaries. Counts and percentages come from the existing filtered analytics response; they represent conditions, not unique members.

Verified in Chrome after the page finished rendering:

- Missing diagnosis code: 840 on the dashboard → 840 filtered records.
- Possible overcoding: 151 → 151 filtered records.
- Contract H1234: 9 findings, including 8 possible additions → 8 filtered records; contract preserved in the destination URL.
- Member 360 profiles remain first in that filtered list: Maria Santos, Ellen Brooks, Robert Klein, James Patel, Anne Foster.
- No horizontal overflow or clipped opportunity blocks at either desktop viewport.
- TypeScript check and final Next.js production build passed; `git diff --check` passed.

Updated UI is running locally. No remote push or cluster deployment was performed for this change.
