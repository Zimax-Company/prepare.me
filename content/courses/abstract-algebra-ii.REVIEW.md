# Abstract Algebra II: review notes

The modules follow the curriculum exactly: 7 levels, 96 lessons. All lessons and their 579 questions are AI-drafted. They pass the structural, answer-key, KaTeX and stray-`$` checks, every page renders (6,696 formulas with no errors), and multiple-answer questions vary their number of correct options. A subject expert should still review the course before it is published. It ships with `"published": false`.

**Difficulty mapping:** Levels 1–2 Beginner, 3–4 Intermediate, 5–7 Advanced. The course assumes Abstract Algebra I: groups, cosets, Lagrange, normal subgroups, quotients, homomorphisms and the isomorphism theorems, plus basic rings.

## Conventions (stated in the lessons)
- $D_n$ has order $2n$, and the lessons warn that some books write $D_{2n}$.
- Permutations and automorphisms compose right to left. Level 7's ten fixed fields of $\mathbb{Q}(\sqrt[4]{2}, i)$ depend on this.
- An "extension with normal subgroup $N$ and quotient $Q$" puts $N$ first, and the lessons note that conventions vary.
- Rings have a $1$, subrings share it, and homomorphisms send $1 \mapsto 1$. So $2\mathbb{Z}$ is not a subring, and a homomorphism $\mathbb{Z}_m \to \mathbb{Z}_n$ exists iff $n \mid m$.
- Rings are commutative unless stated. Level 3's left/right ideals lesson uses matrix rings.
- "Zero divisor" means a nonzero zero divisor; the $\mathbb{Z}_{12}$ question depends on this.
- Modules are unital left modules. Torsion is defined over integral domains. Companion matrices have 1s on the subdiagonal; Jordan blocks have 1s on the superdiagonal.
- A polynomial is separable when its roots are distinct. $\operatorname{Gal}(L/K)$ means $\operatorname{Aut}(L/K)$ for any finite extension. Level 7 works in characteristic 0 unless stated.

## Results stated without proof, or only sketched (flagged in the text)
- **Level 1:** simplicity of $A_n$ for $n \ge 5$ (only $A_5$ is proved); the classification of finite simple groups; Jordan–Hölder; Burnside's $p^aq^b$ theorem; Feit–Thompson; the classifications of groups of orders 8, 12 and 16. The three Sylow theorems, orbit–stabiliser, the class equation and Cauchy's theorem are proved in full.
- **Level 2:** uniqueness of reduced words in free groups; Nielsen–Schreier; Novikov–Boone; presentations of $A_4$, $S_4$ and $A_5$; $\operatorname{Aut}(Q_8) \cong S_4$; Schur–Zassenhaus; the 7 frieze and 17 wallpaper groups. Uniqueness in the finite Abelian classification is sketched.
- **Level 3:** Krull's theorem (via Zorn); nilradical = intersection of primes (one direction sketched); the Hilbert basis theorem; the second and third isomorphism theorems.
- **Level 4:** $\mathbb{Z}[\tfrac{1+\sqrt{-19}}{2}]$ is a PID but not an ED; the fundamental theorem of algebra; PID ⇒ UFD and $R$ UFD ⇒ $R[x]$ UFD are sketched.
- **Level 5:** invariant basis number; submodules of $R^n$ over a PID are free; $V_A \cong F[x]^n/\operatorname{im}(xI - A)$. The structure theorem is proved via a Smith normal form sketch.
- **Level 6:** transcendence of $e$ and $\pi$; existence and uniqueness of algebraic closures; the primitive element theorem; the Möbius count of irreducible polynomials; the characterisation of constructible numbers.
- **Level 7:** Artin's theorem and Galois' solvability theorem are sketched. Irreducibility of $\Phi_n$ is proved only for prime $n$. Also stated: the transitive subgroups of $S_4$, the casus irreducibilis, and the "only if" direction of Gauss–Wantzel.

## Ordering notes
- Level 2 avoids Sylow theory (its writer assumed it came later), although Sylow is Level 1. Nothing is wrong as a result; it just misses chances to use Sylow.
- Some forward references are marked in the text: 3.5 relies on quotient rings from Abstract Algebra I before 3.7, and 6.5 and 6.10 use the tower law proved in 6.11.

## Beyond the outline (light additions)
- Burnside's lemma (Levels 1–2); characteristic subgroups and $\operatorname{Out}(G)$; Smith normal form as a computing tool from Level 2.
- The correspondence theorem; local rings and $\mathbb{Z}_{(p)}$; $\mathbb{Z}[\sqrt{-19}]$ as a non-UFD; the rational root and mod-$p$ criteria.
- Baer–Specker and rings with $R \cong R^2$ (asides only).
- The inseparable example $\mathbb{F}_p(s,t)/\mathbb{F}_p(s^p,t^p)$; primitive polynomials; $\mathbb{F}_{16}$.
- Cardano worked through on $x^3 - 6x - 9$; $x^5 - 5x + 12$ having Galois group of order 10; the subfields of $\mathbb{Q}(\zeta_5)$.

## Spot-checked by the integrating session
- **Levels 3–4:** the CRT answer 23 mod 105; $\gcd(11+3i, 1+8i)$ is an associate of $1-2i$; $\mathbb{Z}_{12}$ has 7 nonzero zero divisors.
- **Level 5:** Smith forms of $\begin{pmatrix}2&4\\6&8\end{pmatrix}$ = (2, 4) and $\begin{pmatrix}6&4\\4&6\end{pmatrix}$ = (2, 10); there are 6 Abelian groups of order 72.
- **Levels 6–7:** $x^2+x+2$ is primitive over $\mathbb{F}_3$ but $x^2+1$ isn't; $x^5-4x+2$ has exactly 3 real roots; 3 is a root of $x^3-6x-9$.
