# Reference values for tools/verify/offer-lib-test.mjs.
# 60-digit Decimal arithmetic, a plain loop that sums the discounted payments one by one
# (no closed-form annuity factor), and bisection on the rate. The JS module uses the closed
# form with log1p/expm1, so the two cannot share a mistake.
from decimal import Decimal as D, getcontext

getcontext().prec = 60


def present_value(rate, instalment, payments):
    total = D(0)
    factor = D(1)
    one = D(1) + rate
    for _ in range(payments):
        factor = factor / one
        total += instalment * factor
    return total


def solve_rate(received, instalment, payments):
    low, high = D(0), D(instalment) / D(received)
    for _ in range(400):
        mid = (low + high) / 2
        if present_value(mid, D(instalment), payments) > D(received):
            low = mid
        else:
            high = mid
    return (low + high) / 2


def payment_at(rate_per_year_percent, received, payments, per_year):
    rate = D(rate_per_year_percent) / D(100) / D(per_year)
    # the instalment that makes the payments worth `received` today at `rate` each period
    unit = present_value(rate, D(1), payments)
    return D(received) / unit


CASES = [
    # received, instalment, payments, per_year, label
    (1000, 1100, 1, 12, "one payment"),
    (10000, 889, 12, 12, "monthly 12"),
    (5000, 500, 12, 52, "weekly 12"),
    (5000, 100, 60, 365, "daily 60"),
    (100000, 4000, 36, 12, "monthly 36"),
    (20000, 700, 30, 52, "weekly 30"),
    (1500, 100, 16, 52, "weekly 16"),
    (999999999, 1000000000, 1, 12, "one rupee over, at the largest payment the page takes"),
    (7, 1000000000, 1, 365, "absurd daily"),
]

print("--- solved rates")
for received, instalment, payments, per_year, label in CASES:
    r = solve_rate(received, instalment, payments)
    yearly = r * per_year * 100
    print(f"{label}: r={float(r)!r} yearly%={float(yearly)!r} total={instalment * payments}")

print("--- instalment and total at the assumed rate (12% a year)")
for received, payments, per_year in [(10000, 12, 12), (5000, 12, 52), (5000, 60, 365), (100000, 36, 12)]:
    a = payment_at(12, received, payments, per_year)
    print(f"{received} over {payments} at {per_year}/yr: instalment={float(a)!r} total={float(a * payments)!r}")

# The offers typed in by tools/verify/offer-ui.mjs, with what the page has to print: the total
# paid, the yearly cost, and the total at the assumed 12% a year, rounded to a whole rupee
# (half up) the way the page prints it.
GATE_CASES = [
    # received, instalment, payments, per_year
    (10000, 889, 12, 12),
    (5000, 500, 12, 52),
    (5000, 100, 60, 365),
    (5000, 100, 60, 12),
    (5000, 100, 60, 52),
    (100000, 4000, 36, 12),
    (1000, 1100, 1, 12),
    (20000, 700, 30, 52),
    (1000000000, 1000000000, 3650, 365),
]

print("--- cases of offer-ui.mjs: received instalment payments per_year | total | yearly% | assumed total (rounded)")
for received, instalment, payments, per_year in GATE_CASES:
    yearly = solve_rate(received, instalment, payments) * per_year * 100
    assumed = payment_at(12, received, payments, per_year) * payments
    rounded = int(assumed.quantize(D(1), rounding="ROUND_HALF_UP"))
    print(f"{received} {instalment} {payments} {per_year} | {instalment * payments} | {float(yearly)!r} | {float(assumed)!r} -> {rounded}")
