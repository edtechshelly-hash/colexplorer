# Lincoln Audit Explorer — Version 1.1

A responsive, read-only public web application that turns Lincoln audit evidence into plain-language questions, topic summaries, timelines, and workbook evidence references.

## Open it

Because the app loads `data.json`, serve the folder with a small web server.

### Windows / Mac / Linux with Python

1. Open a terminal in this folder.
2. Run:

   python -m http.server 8080

3. Open `http://localhost:8080`.

## Deploy it

This is a dependency-free static site. Copy these files to any static web host, including a Synology Web Station folder:

- index.html
- styles.css
- app.js
- data.json

## Evidence model

`data.json` is the presentation dataset. It does not replace the Excel workbook.

Each topic contains:
- plain-language title and summary
- status and risk
- documented fact
- supported interpretation
- improvement and remaining-attention statements
- timeline
- workbook evidence locators

## Important prototype limitation

This first build is seeded with the major recurring findings and resident questions drawn from the completed Phase 2B workbook. Before public launch, every sentence should receive a final editorial/evidence check and source-document links should be added where public URLs are available.


## Version 1.1 changes

- The homepage now starts with resident questions rather than search.
- Added a five-part visual timeline showing the overall audit story.
- Added icons and friendlier topic labels.
- Moved search below the main content.
- Changed “Ongoing” public wording to “Still needs attention.”
- Added clearer “Why should residents care?” sections.
- Added “Want to dig deeper?” navigation inside answers.


## Version 1.2
- Larger app branding
- Stronger tagline
- Hero headline updated
- Improved visual hierarchy
- Larger question cards


## Version 1.6 changes

- Returned to the clean Version 1.4 question cards
- Replaced question and topic pop-up dialogs with dedicated in-app pages
- Added direct hash routes for shareable question and topic views
- Added breadcrumbs and browser Back support
- Added full question pages with short answer, explanation, evidence, related topics, and related questions
- Added full topic pages with status, risk, timeline, evidence, and related questions
- Preserved the existing homepage design


## Version 1.7 changes

- Redesigned the dedicated topic page
- Added a visual topic overview with status, icon, and risk level
- Added three clear resident-focused summary cards
- Improved fact-versus-interpretation presentation
- Rebuilt the topic timeline into a visual step-by-step story
- Replaced the plain evidence list with traceable evidence cards
- Added a stronger related-questions section and final evidence note


## Version 1.8 changes

- Converted every topic evidence card into a clickable workbook evidence record
- Added dedicated evidence pages with workbook, worksheet, and cell/row locators
- Added a direct Open Authoritative Workbook button
- Added Copy Workbook Locator
- Added automatic workbook connection status
- Added clear instructions for finding each source in Excel
- Preserved the rule that the workbook remains authoritative

## Install the authoritative workbook

Place this file inside the app's `evidence` folder:

`Lincoln_Evidence_Matrix_2016_2025_Phase2B_COMPLETE_FORMATTED.xlsx`

The workbook was identified as the completed, formatted Phase 2B master. It is not recreated or replaced by the app.


## Version 2.0 changes

- Removed the duplicate short-answer block from question pages
- Removed emotionally loaded wording such as “scandals”
- Separated independent audit history from later public-record updates
- Limited audit timelines to completed audits through 2022–23
- Added separate 2024 and 2025 post-audit update sections
- Replaced public-facing workbook, worksheet, and Excel terminology
- Redesigned evidence pages around Supporting Public Records
- Added evidence collection, public-record category, evidence section, and internal reference fields
- Added resident guidance for locating original public records and City Council meeting videos
- Preserved the independent-project disclaimer


## Version 2.3.1

- Restored the complete Version 2.2.1 landing page unchanged
- Changed only the Supporting Public Records detail page
- Removed metadata, file links, copy buttons, and connection messages from that page
- Verified JavaScript syntax before packaging


## Version 2.4 changes

- Added resident-language search aliases
- “Missing money,” “stolen money,” “corruption,” and “failed audit” now return useful results
- Added calm, evidence-based guidance for sensitive searches
- Search suggestions now use everyday language
- Related questions and topics are surfaced automatically
