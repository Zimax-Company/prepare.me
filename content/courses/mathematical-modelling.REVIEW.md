# Mathematical Modelling: review notes

The modules follow the detailed curriculum exactly. Level 8's six modules are split into one lesson per bullet topic, numbered 8.1.1 to 8.6.10.

All 152 lessons and 908 questions are AI-drafted. They pass the structural, answer-key, KaTeX and stray-`$` checks, and every page renders without maths errors. The drafters recomputed their numbers with scripts. Level 6's Python snippets were executed and their quoted output is real. A subject expert should still review the course before it is published. It ships with `"published": false`.

## Applies across the course
- **Example figures are invented.** Scenarios use made-up numbers (prices, rates, parameters) presented as examples, not real statistics. No papers are cited.
- **Short answers are matched as text.** Each short-answer question lists its accepted spellings (e.g. "1210", "1,210", "£1,210"), but other spellings will be marked wrong. For example, Level 6 accepts only "1.105" in 6.9 and only "0.109" in 6.14.
- **Multiple-answer questions now vary** between 2 of 4, 3 of 4, 2 of 5 and 4 of 5 correct, so learners can't game them by ticking a fixed number of boxes.

## Level 1
- History dates and attributions are from general knowledge: Newton 1687; Malthus 1798; Verhulst 1838; Lotka–Volterra in the 1920s; Richardson 1922; Kermack–McKendrick 1927; the ENIAC forecast in 1950; Lorenz 1963; and the 1999 Mars Climate Orbiter units error.
- 1.10's remark about the 2008 crisis is deliberately soft ("effectively assumed").
- 1.7 treats a two-rate tariff as nonlinear. Strictly that's correct, but some texts say "piecewise linear".

## Level 2
- 2.13's confidence interval uses the large-sample z-interval (1.96·s/√n, n = 36), not a t-interval.
- 2.11 writes Markov transition matrices column-wise. Many textbooks write them row-wise.

## Level 3
- Some scenarios are deliberately reused across lessons: the furniture LP (3.11 → 3.14), the phone-case break-even (3.8 → 3.14), the coffee market (3.9 → 3.10) and the chairs/tables system (3.4 → 3.5).
- 3.15 defines dominant strategies with weak dominance ("at least as good").

## Level 4
- Some figures are stated without derivation: the SIR final size of about 94% for R₀ = 3 (I verified this numerically), typical Bass parameters (p ≈ 0.03, q ≈ 0.38) and the hare–lynx cycle of about 10 years.
- 4.6 treats monthly switching percentages as continuous rates, and says so.
- 4.15's commodity price–inventory model is stylised, not calibrated.

## Level 5
- 5.6 uses a normal approximation (P(Z > 0.90) ≈ 0.18).
- 5.13 introduces SDEs through geometric Brownian motion.
- One diagram in 5.9 reads more like a list than a flow.

## Level 6
- The MATLAB snippet in 6.3 wasn't executed (Octave isn't installed). It mirrors the Python version, which was run.
- The seeded Monte Carlo and agent-based outputs (6.13, 6.14) may differ in the last digits on other NumPy versions.

## Level 7
- 7.8 gives the network R₀ formula as the standard configuration-model approximation.
- 7.10's consensus step-size condition is sufficient, not exact.
- 7.6 states Pontryagin's principle in minimum form, with a note on sign conventions.

## Level 8
- **8.1–8.2:** textbook parameter values are assumed (drag, beam stiffness, river dispersion, Vasicek and Merton parameters). 8.2.4 gives B(τ) in the Vasicek bond price but not A(τ).
- **8.3–8.4:** CLV counts the first margin at t = 0, and the end-of-period form is also shown. The nurse LP's 26-nurse optimum is proved by a lower-bound argument, and other optimal schedules exist.
- **8.5–8.6:**
  - The bias–variance example (8.5.1) and the two-feature Shapley example are illustrative set-ups.
  - Standard reference values are quoted without derivation: χ² and z critical values.
  - The Beta(32, 78) interval in 8.5.6 uses a normal approximation.
  - 8.6.1 and 8.6.9 have the minimum of 5 questions.
