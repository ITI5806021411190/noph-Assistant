# Rollback v70.117 Schedule Multilink Actions

Scope:
- `index.html`: remove style/script blocks with IDs `haos-v70-117-schedule-multilink-style` and `haos-v70-117-schedule-multilink-script`.
- `public.html`: remove helper functions whose names end with `V7117`, restore the `psLink` assignment to the previous single-link renderer if needed.
- `Code.gs.txt`: remove `haosScheduleFirstUrlV7117_`, restore `syncToGoogleCalendar` location fallback to `data.meetingLink`, restore `mergeScheduleFileUrlsV707_` split regex to `/\n|,/`, and remove the `data.fileUrlReplace === true` branch in `updateScheduleV2`.
- `sw.js`: restore the previous `CACHE_NAME`.

Database impact:
- No new sheet or column is created.
- Multi-link values are stored in existing fields as one item per line.
- Detailed labels use `Label || URL`; old single URL values continue to work.

