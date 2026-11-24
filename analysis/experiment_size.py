"""Illustrative sample sizes per arm for two equally sized independent groups."""

from math import ceil, sqrt
from statistics import NormalDist

normal = NormalDist()


def superiority_size(control, treatment, alpha=0.05, power=0.80):
    """Normal approximation for a two-sided comparison of proportions."""
    pooled = (control + treatment) / 2
    pooled_sd = sqrt(2 * pooled * (1 - pooled))
    alternative_sd = sqrt(control * (1 - control) + treatment * (1 - treatment))
    distance = abs(treatment - control)
    z_alpha = normal.inv_cdf(1 - alpha / 2)
    z_power = normal.inv_cdf(power)
    return ceil(((z_alpha * pooled_sd + z_power * alternative_sd) / distance) ** 2)


def payment_noninferiority_size(baseline, margin, alpha=0.05, power=0.80):
    """Approximation assuming equal true payment rates in the two arms."""
    z_alpha = normal.inv_cdf(1 - alpha)
    z_power = normal.inv_cdf(power)
    variance = 2 * baseline * (1 - baseline)
    return ceil((z_alpha + z_power) ** 2 * variance / margin**2)


if __name__ == "__main__":
    print("Illustrative assumptions only. Counts are per arm.")
    for control, treatment in ((0.30, 0.31), (0.30, 0.32), (0.30, 0.33), (0.05, 0.06)):
        print(f"{control:.0%} -> {treatment:.0%}: {superiority_size(control, treatment):,}")
    print(f"Payment: 20% baseline, 1 pp margin: {payment_noninferiority_size(0.20, 0.01):,}")
