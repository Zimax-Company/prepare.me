# Lesson style guide

How to write a prepare.me lesson. The model lesson is Real Analysis 1.1 (`1-1-introduction-to-mathematical-reasoning`): read it before writing or revising a lesson.

The aim is balance. Explain enough that a student never meets a term they can't use, but don't pad. Every new idea is explained, shown with examples and drilled before the lesson moves on.

## Assume little

- Assume only what earlier lessons in the course have taught. If a lesson relies on something from much earlier, remind the student in one line.
- Explain every symbol the first time it appears in the course, in plain words: "$k \in \mathbb{Z}$ is read '$k$ is an integer'".
- If you must mention something taught later, say so and say where: "quantifiers are covered in lesson 1.3".

## Teach one idea at a time

For each new term or result:

1. **Why it matters.** One or two sentences of motivation, or a concrete problem it solves.
2. **Plain words first**, then the formal definition or statement.
3. **Examples.** At least two, including an edge case students get wrong (zero, negatives, the empty set, a boundary value).
4. **A non-example** where it helps: something that looks like it qualifies but doesn't, and why. This is often where the definition clicks.
5. **A drill straight away.** A `check`, `match` or `order` block on that idea before the next idea starts.

Keep `text` blocks short: one idea each, roughly 120–350 words. Never put the whole lesson in one block.

## Lesson shape

A typical lesson runs 15–22 blocks:

| Part | Blocks |
|---|---|
| Opening | `callout` (info): what you will learn, and what you need to know first |
| Motivation | `text` with a concrete problem, often followed by a `callout` (warning) with a classic trap |
| For each idea | `text`, then a drill (`check`, `match` or `order`) |
| Vocabulary review | `flashcards`, then a scenario `check` |
| Worked method | `steps` for a fully worked proof or calculation, with a `check` on why a key step is done |
| Practice | `order` (rebuild a solution) and `example` ("Your turn": problem first, hidden solution with a self-check list) |
| Wrap-up | `reveal` (common questions and misconceptions), then a `callout` (success) of 4–6 key points |

## Blocks

- **Flashcards.** The front is the term. The back is a short definition, then a blank line, then `*Example:* …`. Put a key word in **bold**. Keep the back under about 35 words.
- **Checks.** Prefer scenario questions ("You prove X only so you can use it to prove Y. What is X called?") over recall of a definition. Wrong options should be real mistakes students make. Always give an explanation that says why each wrong option is wrong.
- **Steps.** Each step's title says what the step does ("Unpack the definition"). Point out the subtle move inside the step ("we use different letters because…").
- **Example.** Use the problem-first "Your turn" form for practice. End the solution with what to check in your own answer.
- **Reveal.** Real student questions and misconceptions, answered concretely. Avoid generic answers like "rigour requires it".
- **Diagram.** Only for a genuine sequence or flow.
- Avoid numbered headings ("6. Why…"); they break when blocks are reordered.

## Questions

- 10–14 per lesson, covering every idea taught. Mix `single`, `multiple`, `true_false` and `short`.
- Write all maths in KaTeX (`$x^2$`), including in options and explanations.
- `short` answers must have one clear form, such as a number. Matching ignores case and extra spaces but not missing spaces, so `2k+2` and `2k + 2` differ. List common variants (`-5`, `−5`).
- **Revising an existing lesson: keep existing question prompts word for word.** A question is matched by its prompt, so a reworded prompt becomes a new question and its answer history is lost. Fix options, answers or explanations freely; add new questions alongside.
- Vary the number of correct options in `multiple` questions (the checker enforces this).

## Style

- Sentence case for titles. Short sentences. Talk to the student ("you").
- British spelling, matching the rest of the content.
- Plain words over formal ones: "use" not "utilise", "show" not "demonstrate".
- Set `est_minutes` honestly: about 1 minute per 100 words of reading, plus 1–2 minutes per drill.

## Check before merging

```bash
node scripts/drafts.mjs check content/drafts/<course>/level-<n>.json --course=content/courses/<course>.json --section=<n>
```
