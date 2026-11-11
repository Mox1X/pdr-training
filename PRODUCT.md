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
Ukrainian interface. Catalogue: 42 signs across seven groups, including supplementary plates. Learning and mistake review: up to 10 unique signs from selected categories, immediate feedback, one answer per question, manual progression. Exam: 20 uniformly random unique signs from all groups, feedback only on completion. Problem signs have fourfold selection weight in learning. Mastery requires three consecutive correct answers in distinct sessions; an error resets mastery. Local browser persistence, no accounts or backend. Learning answers saved immediately; exam saved only when completed. Refresh discards the active quiz, preserving saved progress. Statistics show mastery by group, errors and recurring directional confusions. Confirmed reset deletes local progress.

## Evidence on Hand
Official Ukrainian road rules and Appendix 1 from zakon.rada.gov.ua. Locally bundled original sign images. Each catalogue entry records its source. Explanations are short learning summaries, linked to the official rule.

## Product Principles
- Make the sign and answers the focus.
- Explain mistakes immediately without rushing the learner.
- Keep official terminology accurate and sourceable.
- Keep the first version small and extendable.
