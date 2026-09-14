# Synthetic browser attachment fixtures

Use only for demonstration/testing. These files contain fictional data and no clinical recommendations.

- `invalid-columns.csv`: intentionally missing required score-import columns.
- `scores.csv`: one valid Casey score and one missing score to verify explicit exceptions. Use rating period `2026`, synthetic input enabled, and declared producer/model/coverage metadata.
- `intake-preview.txt` / `intake-preview.pdf`: verify local intake preview and close. These files must not publish clinical evidence or alter eligibility.

For automated Chrome attachment, the ChatGPT extension requires **Allow access to file URLs**. Ordinary users can use their browser's file picker. Intake is preview-only; external CSV scores use the separate validated import flow.
