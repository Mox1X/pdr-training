# ПДР Практика
<!-- impeccable:product-schema 1 -->

## Platform
web

## Stack
React + TypeScript + Vite, confirmed by the user.

## Users
People learning Ukrainian road signs on a phone or computer.

## Product Purpose
Short practice sessions for recognizing road signs: an image and four possible names.

## Capabilities and Constraints
Ukrainian interface. Catalogue: all 369 official numbered signs across seven groups, including supplementary plates, with 389 original illustrations; edition 14.10.2026 verified 11.11.2026. Official names remain separate from learner-facing variant labels. Multiple illustrations of one number share progress. Learning and mistake review: up to 10 unique signs from selected categories, immediate feedback, one answer per question, manual progression. Exam: 20 uniformly random unique signs from all groups, feedback only on completion. Problem signs have fourfold selection weight in learning. Mastery requires successful due reviews after 1, 3 and 7 elapsed days; weekly maintenance follows. Early correct answers cannot advance the schedule; errors reset it. Separate due-today review and name/image/recall formats are available outside exams. Dynamic distractors consider visual families and personal confusions. Explanations follow every practice answer and every exam answer after completion. Progress v2 starts fresh without migration. Local browser persistence, no accounts or backend. Learning answers saved immediately; exam saved only when completed. Refresh discards the active quiz, preserving saved progress. Statistics show mastery by group, errors and recurring directional confusions. Confirmed reset deletes local progress.

## Evidence on Hand
Official Ukrainian road rules and Appendix 1 from zakon.rada.gov.ua. Locally bundled original sign images. Each catalogue entry records its source. Explanations are short learning summaries, linked to the official rule.

## Product Principles
- Make the sign and answers the focus.
- Explain mistakes immediately without rushing the learner.
- Keep official terminology accurate and sourceable.
- Keep the first version small and extendable.

Image failures block grading until recovered. Retry preserves questions; penalty-free skips draw unused replacements and do not update progress. Exhaustion produces an explicitly incomplete result. Screens and persistence/session hooks are separated. Content provenance checks and an AI-assisted content review register cover all 369 positions; they are not independent legal certification.
