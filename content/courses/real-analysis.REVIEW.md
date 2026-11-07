# Real Analysis: review notes

All 105 lessons and 639 questions in `real-analysis.json` are AI-drafted. They pass the structural and KaTeX checks, and the answer keys were self-checked by the drafters. A subject expert should still review them before the course is published. The course ships with `"published": false`.

These are the decisions and caveats the drafters flagged, by level.

## Conventions used throughout
- $\mathbb{N}=\{1,2,3,\dots\}$.
- "Increasing" and "decreasing" are non-strict; "strictly" is written out where it's meant.
- Limits are defined only at limit points of the domain, with the punctured condition $0<|x-c|$. Continuity is defined only at points of the domain, so $1/x$ counts as continuous, and every $f:\mathbb{N}\to\mathbb{R}$ is continuous.
- Integration uses Darboux upper and lower sums throughout, with Riemann's ε-criterion as the main tool.

## Lessons that refer to later lessons (keep the current order)
- 1.9 uses "n² even ⇒ n even" (proved in 1.10) and prime factorisation (proved in 1.7).
- Level 2 uses the Archimedean property (2.11) in 2.6, 2.9 and 2.10, and 2.1 defers the existence of √2 to 2.10.
- 3.3 states the ε-N definition briefly; 3.4 treats it in full.
- 4.4, 4.6, 4.9 and 4.10 mention comparison, the alternating series test and absolute convergence before those lessons.
- 6.2 uses the derivative limit theorem, which is proved in 6.9.

## Results stated without proof, or only sketched
- **Level 2:** well-ordering of ℕ, the irrationality of π, and the countability of ℚ.
- **Level 4:** the sums π²/6, ln 2, π/4, e−1 and e²−1; the bounds ln(n+1) < Hₙ ≤ 1+ln n; Cauchy–Hadamard; and the ratio/root inequality chain. A true/false question in 4.10 depends on that chain.
- **Level 5:** the converse of the sequential criterion; that a continuous injection is monotone (5.13); and the converse of the Heine–Cantor corollary.
- **Level 6:** the Weierstrass nowhere-differentiable function (a true/false question depends on it); convex ⇒ continuous; the Leibniz rule; and the ∞/∞ and x→±∞ cases of L'Hôpital.
- **Level 7:**
  - finitely many discontinuities ⇒ integrable (7.6)
  - $fg$ integrable (7.8)
  - Lebesgue's criterion, the Cantor set having measure zero, and an interval not having measure zero (7.12)
  
  Questions in 7.6 and 7.12 depend on these.
- **Level 8:** Dini's theorem; the derivative-interchange theorem; Arzelà–Ascoli (a five-step sketch only); and the uniform-convergence integral theorem in the general Riemann case.

## Items that go slightly beyond the outline (cut if out of scope)
- **2.3:** a question treats {0,1} with arithmetic mod 2 as a field.
- **3.12:** a true/false question says that, in an Archimedean ordered field, Cauchy completeness ⇔ the least-upper-bound property.
- **5.8:** a reveal mentions Baire category.
- **8.5 and 8.6:** a full proof that [0,1] is connected, and the Banach fixed point theorem.
- **8.15 and 8.16:** "$\{f>a\}$ measurable for all rational $a$"; and $\sin x/x$ is not Lebesgue integrable on $[1,\infty)$.

## Points where textbooks differ
- **5.8, discontinuity types:** removable, jump, and essential (blow-up counts as essential).
- **2.11:** "the standard proof of the Archimedean property uses completeness" is marked true. That's right for the axiomatic approach this course takes.
- **7.9, FTC part II:** assumes $F$ is differentiable on $[a,b]$ and $F'$ is integrable.
- **7.10:** the open-interval form of the integral MVT is proved in the question's explanation.
- **4.10:** the "most direct test" match pairs $\sum 3^n/n!$ with the ratio test, although the root test also works.

## Spot-checked by the integrating session
- **Level 1:** 30031 = 59 · 509, and n² − n + 41 is first composite at n = 41.
- **Level 3:** the short answers 101, 3 and ½.
- **Level 4:** $H_n$ first exceeds 10 at $n=12367$, and the ratio-test counterexample $2^{-n+(-1)^n}$.
- **Level 6:** the Taylor bound $R_3(1)<\tfrac18$.
