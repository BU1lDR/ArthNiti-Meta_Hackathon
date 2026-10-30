import math

from app.services.advisory_service import CASH_RESERVE_RUPEES
from app.services.risk_service import calculate_repayment_pressure

# A number for the advice that has one. This module has no rule of its own: it runs
# the rules that raised a sentence backwards, to say how far from its line the
# reader is. The sentence is never touched. A sentence with a digit in it would be
# dropped from the read-aloud and from the written plan, and the sentence is the
# advice, so the amount travels beside it in advisory["amounts"], keyed by the
# sentence's translation code, and is drawn from there.
#
# Every limit is found with the function that made the figure the page prints
# (calculate_repayment_pressure), over whole rupees, never with the exact
# arithmetic. The two disagree at the edges: 30,000 of 100,001 is 29.9997%, which
# is printed as 30% and called moderate, so exact arithmetic would offer a limit
# the page then contradicts. Payments are searched in whole rupees and amounts are
# rounded the safe way, so doing what an amount says is always enough.
#
# Where the rules have no honest number to give, there is no entry: nothing to
# cut, no income to take half of, or a line that cannot be reached by cutting
# the payments being made.


def _largest_that_fits(fits, ceiling: int):
    # fits(0) is true and fits(ceiling) is false. A bigger payment is never
    # lighter, so once one is too heavy every bigger one is: that is what makes a
    # binary search valid (options_service searches loan sizes the same way).
    low, high = 0, ceiling
    while high - low > 1:
        middle = (low + high) // 2
        if fits(middle):
            low = middle
        else:
            high = middle
    return low


def _cut(fits, now: float):
    # How far the payments being made have to come down to fit. `top` is `now`
    # rounded up to a whole rupee, so a cut of `top - limit` is always enough even
    # when `now` has paise in it.
    top = math.ceil(now)
    if not fits(0) or fits(top):
        return None
    limit = _largest_that_fits(fits, top)
    return {"now": now, "limit": limit, "cut": top - limit}


def _break_even(financial_analysis: dict, risk_analysis: dict):
    # Rounded up: cutting this much from the spending is enough to break even.
    shortfall = math.ceil(-financial_analysis["monthly_profit"])
    if shortfall < 1:
        return None
    return {"kind": "break_even", "shortfall": shortfall}


def _loan_payments(financial_analysis: dict, risk_analysis: dict):
    # The payments being made, with the estimated loan for the funding gap counted
    # in as the pressure figure counts it, that still read "low". `with_new_loan`
    # tells the page to say so, because then the limit is lower than the line.
    surplus = financial_analysis["monthly_profit"]
    if surplus <= 0:
        return None

    def fits(payments):
        pressure = calculate_repayment_pressure(
            surplus, payments, financial_analysis["funding_gap"]
        )
        return pressure["risk_level"] == "low"

    cut = _cut(fits, risk_analysis["monthly_emi"])
    if cut is None:
        return None
    return {
        "kind": "loan_payments",
        **cut,
        "with_new_loan": risk_analysis["estimated_new_emi"] > 0,
    }


def _household_payments(financial_analysis: dict, risk_analysis: dict):
    # The payments being made that the household check does not call over its
    # limit. With no income, or an income of 0, there is no half to name.
    income = risk_analysis["household_monthly_income"]
    if income is None or income <= 0:
        return None

    def fits(payments):
        check = calculate_repayment_pressure(
            financial_analysis["monthly_profit"], payments, 0, income
        )
        return check["household_check"] != "over_limit"

    cut = _cut(fits, risk_analysis["monthly_emi"])
    if cut is None:
        return None
    return {"kind": "household_payments", **cut}


def _cash_reserve(financial_analysis: dict, risk_analysis: dict):
    have = financial_analysis["available_capital"]
    short = math.ceil(CASH_RESERVE_RUPEES - have)
    if short < 1:
        return None
    return {
        "kind": "cash_reserve",
        "have": have,
        "target": CASH_RESERVE_RUPEES,
        "short": short,
    }


# Translation code -> the maker of its amount. A next-step code and the advice code
# that says the same thing share a maker, so the hero and the list agree. The advice
# about the size of a NEW loan (adv.householdOverLimit, nxt.householdNewLoanOver,
# nxt.gapTooLarge) is not here: the loan options already give that number.
_MAKERS = {
    "adv.reduceExpenses": _break_even,
    "nxt.reviewExpenses": _break_even,
    "nxt.reducePressure": _loan_payments,
    "adv.householdAlreadyOver": _household_payments,
    "nxt.householdOverLimit": _household_payments,
    "adv.cashReserve": _cash_reserve,
}


def build_advice_amounts(
    financial_analysis: dict,
    risk_analysis: dict,
    advisory: dict,
    mvp_summary: dict,
):
    """
    An amount for each sentence of advice and next step the page will show that
    has one, keyed by the sentence's translation code. A sentence without one is
    simply absent; the page draws what is here and nothing else.
    """
    shown = [*advisory["recommendation_codes"], mvp_summary["next_step_code"]]

    amounts = {}
    for code in dict.fromkeys(shown):
        make = _MAKERS.get(code)
        entry = make(financial_analysis, risk_analysis) if make else None
        if entry is not None:
            amounts[code] = entry
    return amounts
