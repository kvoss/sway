# How Sway learns preferences

[User guide](USER_GUIDE.md) · [Project overview](../README.md) · [Verification record](../REVIEW.md)

## What the model estimates

Each entity has a hidden utility: a real number representing its position on one preference scale. The model learns from judgments, estimates uncertainty, and converts plausible utility orderings to percentiles within the current list.

This is a personal exploration model. Its response scale and uncertainty intervals have not been calibrated in a study of human participants. Stable, transitive preferences and conditionally independent judgments are assumptions, not properties guaranteed by the app.

## Judgments and likelihoods

Let `d = S_i − S_j`, where `i` is the displayed left item. The fixed link precision is `γ = 1`. It is not estimated from the user's judgments.

### Quick pick

For a binary response `z`, choosing the left item means `z = 1`; choosing the right means `z = 0`.

```text
p = sigmoid(d) = 1 / (1 + exp(−d))
P(z | d) = p^z × (1 − p)^(1 − z)
```

This is the binary Bradley–Terry likelihood. A quick pick expresses direction, without a separate strength parameter for that judgment.

### Fine tune and explicit ties

A continuous response `y` lies in `[-1, 1]`: positive favors the left item, negative favors the right, and zero expresses indifference. The slider's visual value is converted with the opposite sign so moving left favors the left entity.

Set `t = (y + 1)/2`, so `t` lies in `[0, 1]`. Sway uses a normalized continuous Bernoulli density:

```text
f(t | d) = exp(d × t) / Z(d)
Z(d)     = (exp(d) − 1) / d, when d ≠ 0
Z(0)     = 1
```

The density is uniform at `d = 0`. It is finite at both response endpoints. If `A(d) = log Z(d)`, then `E[t | d] = A′(d)` and `E[y | d] = 2A′(d) − 1`. The expected slider response is not `2 × sigmoid(d) − 1`.

The normalization term matters: applying binary cross-entropy to a fractional slider response alone would define a different, unnormalized continuous likelihood. See the [continuous Bernoulli research paper](https://papers.neurips.cc/paper_files/paper/2019/hash/f82798ec8909d23e55679ee26bb26437-Abstract.html).

The interface has 201 slider positions, spaced by 0.01 in `y`. The engine interprets them as point observations from this density; it does not model rounding bins or user-specific response precision. Quick picks and fine-tuned judgments therefore have different likelihoods and information content. Their labels are not calibrated psychological units.

**Equal preference** uses the continuous likelihood with `y = 0`, even in Quick pick mode. **Skip** adds no likelihood term. **Undo** removes the latest observation before refitting.

## Prior and posterior approximation

Utilities start with independent standard normal priors:

```text
S_i ~ Normal(0, 1)
```

The prior regularizes sparse data and keeps the Hessian invertible. It also anchors disconnected groups, but between-group positions then depend on that prior rather than direct comparisons. The pairing engine explicitly tries to connect such groups.

After every recorded judgment, Sway refits **all current evidence**. It aggregates per-pair binary counts/wins and continuous counts/response totals, then minimizes the negative log posterior with damped Newton steps. The previous fit is only a starting point; earlier approximate posteriors are not repeatedly treated as new priors.

At the fitted mode `μ`, the approximation is:

```text
q(S) = Normal(μ, Σ)
Σ    = inverse of the negative-log-posterior Hessian at μ
```

This is a full-covariance Laplace approximation. Its Gaussian mean is the fitted mode, which need not equal the exact posterior mean. Full covariance preserves dependencies learned through shared comparisons. Cholesky solves, stable likelihood evaluation near zero, line search, and convergence checks guard the numerical update.

An update commits only after the numerical worker returns successfully. A failed fit leaves the previous accepted session intact. A fresh fit of the same evidence should agree to numerical tolerance regardless of judgment chronology. This fixes the earlier sequential approximation's strong order bias; it is not a claim of exact Bayesian inference.

## Percentiles and intervals

### Transforming an exact order

Within one utility sample, the least-preferred item has percentile 0 and the most-preferred has 100. If `r_i` is the ascending rank starting at 1:

```text
P_i = 100 × (r_i − 1) / (N − 1)
```

Exact utility ties within a sample use their midrank. The division by `N − 1` makes both endpoints reachable. No normal-distribution percentile transform is imposed on the list's utility values; normality is the posterior approximation used for uncertainty about those values.

### Expected position without sampling noise

For a continuous Gaussian posterior, expected rank can be written as a sum of pairwise order probabilities:

```text
v_ij   = Σ_ii + Σ_jj − 2Σ_ij
E[P_i] = 100/(N − 1) × sum over j ≠ i of Φ((μ_i − μ_j) / sqrt(v_ij))
```

Here `Φ` is the standard normal cumulative distribution function, evaluated numerically. These expected positions are analytic under the Gaussian approximation, subject to numerical precision. Their values do not depend on the Monte Carlo seed. The mean percentile across the complete list is 50.

### Approximate 95% rank intervals

Sway generates 1,000 joint Gaussian samples, transforms each to rank percentiles, and uses the 2.5th and 97.5th sample quantiles. Cholesky sampling retains cross-item covariance. Antithetic pairs reuse each base normal vector with its negative; the 1,000 draws are not 1,000 independent samples. A fixed session seed supplies common random numbers across updates, reducing interval flicker.

Rank positions are discrete. Near ties can leave rank intervals wide even when utility differences are tightly concentrated around zero. With two items, sampled percentiles are only 0 and 100. Approximate interval width is not guaranteed to decrease after each observation.

The UI and CSV use one-decimal display precision and shared tie numbering. Uncompared items are shown after compared items without numeric estimates; the posterior still includes them when calculating positions within the complete list.

## Choosing the next comparison

1. **Introduce items:** compare unseen items against already introduced ones until recorded judgments connect the list. Skips do not establish a graph edge.
2. **Bridge disconnected histories:** when all items have been compared but separate groups remain, select an across-group pair.
3. **Learn or explore:** once the graph is connected, select a graph-exploration step with probability 0.10. Otherwise maximize approximate expected information gain for the selected input mode.

Expected information gain is mutual information between the hypothetical response and the compared utilities under the current approximation. The difference utility is Gaussian; Sway uses 20-point Gaussian quadrature, plus 64-point quadrature over continuous responses when needed. In Quick pick mode, the calculation assumes a binary response; the separate Equal action is not included in that hypothetical response distribution.

Exploration favors low comparison counts and little-compared pairs. The engine randomizes presentation sides and avoids an immediately repeated unordered pair when alternatives are available. Repeated pairs later in the session are allowed. There is no guaranteed `O(N log N)` convergence rate or fixed comparison count for a useful ordering.

## What verification establishes

The [model tests](../tests/model.test.cjs) check normalization, derivatives, chronology invariance, presentation reversal, item permutations, covariance, deterministic sampling, graph connectivity, exports, and numerical stability. A one-dimensional numerical integration reference checks selected two-item posterior probabilities against the Laplace approximation with a 0.035 absolute tolerance; it integrates the same likelihood rather than providing an independent implementation of that likelihood.

The recorded simulation used 120 datasets, each with five standard-normal utilities and 60 binary judgments on randomly selected pairs. Its intervals contained 594 of 600 true item ranks. Items within each dataset are dependent, and the test has a coarse coverage floor of 88%. This is a regression smoke check under matching model assumptions, not validation of nominal 95% coverage, continuous-response calibration, adaptive sampling, or real-world users.

Useful next research includes human response calibration, repeated-answer correlation, changing preferences, nontransitive choices, and interval behavior under those departures. See the [review record](../REVIEW.md) for the measured scope and remaining gaps.
