# ПДР Практика — design system

## Direction
A calm Ukrainian learning tool, focused on one road sign and a deliberate answer.
Warm daylight surfaces, forest green controls, original official signs, clear type.
No decorative imagery or invented road signs. Product screens use code-first implementation.

## Tokens
- Canvas: `#f5f5ef`; text: `#27352b`; secondary: `#626c61`.
- Primary action: `#294b36` with white text.
- Soft accent: `#d9edb4`; rule: `#daddd1`; sign stage: white.
- Correct answer: `#e5eed9` / `#305021`; incorrect answer: `#f7e9e0` / `#874625`.
- Font: self-hosted Manrope Variable, Ukrainian and Latin coverage.
- Content width: 1136px, shell max-width 1240px including gutters.
- Desktop gutters 52px, tablet 32px, mobile 22px.
- Controls radius 8px, sign stage radius 14px; minimum control height 52px.

## Composition
Start: concise introduction beside a collection of three actual signs; format notes and a flat catalogue summary below.
Quiz: progress and question above a large sign stage and a vertical answer list. Feedback appears directly after the answers.
Result: score and restart action above a flat list of errors with sign images and source links.
At 680px and below layouts stack into a single column.

## Interaction and accessibility
Answer once, then read the explanation and continue manually. No timed transitions.
Always combine answer colors with text and check/cross icons. Provide visible keyboard focus,
a skip link, focus on new questions and result headings, an accessible progress bar, and neutral image alt text before answering.
Use reduced motion preference; animate only progress fill for orientation.

## Practice controls and statistics
Use native radio buttons for modes and checkboxes for categories, with forest-green accents and visible focus. Exam selections use a neutral green selection state without correctness hints. Statistics use flat rows, sign thumbnails and explicit counts. Storage errors appear as readable notices. Destructive reset uses an inline confirmation with a cancel action.
