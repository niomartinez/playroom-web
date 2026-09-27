# September 27: combined GGR counts losing sites as zero

Nio confirmed that individual sites must keep their actual negative GGR, while
the combined report total adds positive site results only. This follows the
earlier Wayne/WeeHu request about the revenue-share base.

The reports page now derives its headline and footer GGR from the existing
per-site results for the selected period. It floors each site's whole-period
GGR at zero before adding, including when viewing providers or tables. The
summary and By Table footer honor the selected site; By Site and By System
Provider continue to show all sites. CSV summary GGR uses the same calculation.
The page, export and admin manual explain the total's meaning.

Individual row GGR, payouts, hold percentages, NGR, bets and the mock planner
are unchanged. The backend API's signed `ggr` remains the actual wager-minus-
payout figure; this change is limited to the combined totals in the admin
report. No database write or historical repair is needed.

Missing site data displays an unknown total rather than zero, and CSV export
is disabled while the report is refreshing or its site data is unavailable.

Validation: nine calculation tests (three failed against the original netting
calculation before the fix) and the Next.js production build passed.
