"""A number on the advice (services/amounts_service.py).

Some advice has an amount that the rules which raised it can be run backwards to
give: how far a loss is from break-even, the loan payments that would bring the
pressure under the 30% line, the household payments that fit half of the
household's income, and how far the money in hand is below the app's cash mark.
The amount is never inside the sentence: it travels beside it, in
`advisory["amounts"]`, keyed by the sentence's translation code. A sentence with
a digit in it would be left out of the read-aloud and of the written plan, and
the sentence is the advice, so it stays exactly as it was.

The limits come from the SAME functions the page's figures come from, searched
whole rupee by whole rupee. Exact arithmetic would disagree at the edges (30,000
of 100,001 is 29.9997%, which the page prints as 30% and calls moderate), and a
limit the page then contradicts is worse than no limit.
"""

import copy
import math
from itertools import product

from fastapi.testclient import TestClient

from app.main import app
from app.services.advisory_service import CASH_RESERVE_RUPEES, generate_advice
from app.services.amounts_service import build_advice_amounts
from app.services.analysis_service import run_unified_analysis
from app.services.plan_service import build_context
from app.services.risk_service import calculate_repayment_pressure
from plan_fixtures import analyse


client = TestClient(app)


# A tailor in Lucknow who can pay for the plan herself and earns 12,000 a month
# after costs, with no loan. Each test changes what it is about.
BASE = dict(
    business_category="tailoring",
    state="Uttar Pradesh",
    district="Lucknow",
    available_capital=50000,
    monthly_expenses=8000,
    expected_monthly_revenue=20000,
    monthly_emi=0,
    initial_investment=40000,
    monthly_operating_expenses=6000,
)


def run(**changes):
    return run_unified_analysis(**{**BASE, **changes})


def _pressure(surplus, payments, gap=0, income=None):
    return calculate_repayment_pressure(surplus, payments, gap, income)


# --- how far a loss is from break-even --------------------------------------


def test_a_loss_is_told_how_far_it_is_from_break_even():
    result = run(expected_monthly_revenue=10000, monthly_expenses=12500)

    amounts = result["advisory"]["amounts"]
    assert result["financial_analysis"]["monthly_profit"] == -2500
    assert amounts["adv.reduceExpenses"] == {"kind": "break_even", "shortfall": 2500}
    assert amounts["nxt.reviewExpenses"] == {"kind": "break_even", "shortfall": 2500}


def test_the_shortfall_is_rounded_up_so_that_cutting_that_much_is_enough():
    result = run(expected_monthly_revenue=10000, monthly_expenses=12500.25)

    assert result["advisory"]["amounts"]["adv.reduceExpenses"]["shortfall"] == 2501


def test_a_business_that_exactly_breaks_even_has_nothing_to_cut():
    result = run(expected_monthly_revenue=8000, monthly_expenses=8000)

    assert result["financial_analysis"]["financial_status"] == "break_even"
    assert result["mvp_summary"]["next_step_code"] == "nxt.reviewExpenses"
    assert result["advisory"]["amounts"] == {}


# --- the loan payments that keep the pressure under 30% ---------------------


def test_the_loan_payments_that_keep_the_pressure_under_30_percent():
    # Of a surplus of 12,000 the payments must stay under 3,600, and 3,600 itself
    # is already "moderate" (the band is "under 30").
    result = run(monthly_emi=9000)

    assert result["risk_analysis"]["risk_level"] == "high"
    assert result["mvp_summary"]["next_step_code"] == "nxt.reducePressure"
    assert result["advisory"]["amounts"]["nxt.reducePressure"] == {
        "kind": "loan_payments",
        "now": 9000,
        "limit": 3599,
        "cut": 5401,
        "with_new_loan": False,
    }
    assert _pressure(12000, 3599)["risk_level"] == "low"
    assert _pressure(12000, 3600)["risk_level"] == "moderate"


def test_the_limit_follows_the_rounded_figure_the_page_prints_not_exact_30_percent():
    # 30,000 of 100,001 is 29.9997%: the page prints "30" and calls it moderate.
    # The highest payment it still calls low is 29,995.
    result = run(expected_monthly_revenue=150001, monthly_expenses=50000, monthly_emi=80000)

    assert result["financial_analysis"]["monthly_profit"] == 100001
    assert result["advisory"]["amounts"]["nxt.reducePressure"]["limit"] == 29995
    assert _pressure(100001, 30000)["risk_level"] == "moderate"
    assert _pressure(100001, 29995)["risk_level"] == "low"
    assert _pressure(100001, 29996)["risk_level"] == "moderate"


def test_a_payment_with_paise_is_cut_by_a_whole_amount_that_is_enough():
    result = run(monthly_emi=9000.5)

    entry = result["advisory"]["amounts"]["nxt.reducePressure"]
    assert entry["limit"] == 3599
    assert entry["cut"] == 5402
    assert 9000.5 - entry["cut"] <= entry["limit"]


def test_a_loan_for_the_funding_gap_is_counted_inside_the_limit():
    # A gap of 10,000 priced at 12% over 60 months is 222 a month, so of the 3,599
    # the pressure line allows, 3,377 is left for the loans already being paid.
    result = run(available_capital=30000, initial_investment=40000, monthly_emi=8000)

    risk = result["risk_analysis"]
    assert risk["estimated_new_emi"] == 222
    assert risk["risk_level"] == "high"
    assert risk["risk_level_without_new_loan"] == "high"
    assert result["mvp_summary"]["next_step_code"] == "nxt.reducePressure"
    assert result["advisory"]["amounts"]["nxt.reducePressure"] == {
        "kind": "loan_payments",
        "now": 8000,
        "limit": 3377,
        "cut": 4623,
        "with_new_loan": True,
    }
    assert _pressure(12000, 3377, 10000)["risk_level"] == "low"
    assert _pressure(12000, 3378, 10000)["risk_level"] == "moderate"


def test_no_limit_is_given_when_the_loan_for_the_gap_alone_is_already_too_heavy():
    # A gap of 2 lakh is 4,449 a month: more than 30% of 12,000 before a single
    # other loan is counted, so no cut to the payments being made reaches the line.
    result = run(available_capital=0, initial_investment=200000, monthly_emi=8000)

    assert result["mvp_summary"]["next_step_code"] == "nxt.reducePressure"
    assert _pressure(12000, 0, 200000)["risk_level"] == "moderate"
    assert "nxt.reducePressure" not in result["advisory"]["amounts"]


# --- the household payments that fit half the household's income ------------


def test_the_household_payments_that_stay_within_half_the_household_income():
    # 10,000 a month is 62.5% of 16,000. Half is 8,000; 8,001 is 50.01% and over.
    result = run(
        expected_monthly_revenue=50000,
        monthly_expenses=10000,
        monthly_emi=10000,
        household_monthly_income=16000,
    )

    assert result["risk_analysis"]["risk_level"] == "low"
    assert result["risk_analysis"]["household_check"] == "over_limit"
    assert result["mvp_summary"]["next_step_code"] == "nxt.householdOverLimit"

    entry = {"kind": "household_payments", "now": 10000, "limit": 8000, "cut": 2000}
    amounts = result["advisory"]["amounts"]
    assert amounts["nxt.householdOverLimit"] == entry
    assert amounts["adv.householdAlreadyOver"] == entry
    assert _pressure(40000, 8000, 0, 16000)["household_check"] == "within_limit"
    assert _pressure(40000, 8001, 0, 16000)["household_check"] == "over_limit"


def test_no_household_amount_when_there_is_no_income_to_take_half_of():
    result = run(monthly_emi=3000, household_monthly_income=0)

    assert result["risk_analysis"]["household_check"] == "over_limit"
    assert "adv.householdAlreadyOver" in result["advisory"]["recommendation_codes"]
    assert result["advisory"]["amounts"] == {}


def test_no_household_amount_when_the_loan_for_the_gap_is_what_tips_it_over():
    # The loans already being paid are within half the income; the estimated loan
    # for the gap is not: 7,000 plus 1,335 for a gap of 60,000 is 8,335 of 16,000.
    # That advice is about the size of a new loan, which the loan options already
    # answer, so there is nothing to cut from today's payments.
    result = run(
        expected_monthly_revenue=50000,
        monthly_expenses=10000,
        monthly_emi=7000,
        available_capital=10000,
        initial_investment=70000,
        household_monthly_income=16000,
    )

    risk = result["risk_analysis"]
    assert risk["estimated_new_emi"] == 1335
    assert risk["household_check_without_new_loan"] == "within_limit"
    assert risk["household_check"] == "over_limit"
    assert result["mvp_summary"]["next_step_code"] == "nxt.householdNewLoanOver"
    assert "adv.householdOverLimit" in result["advisory"]["recommendation_codes"]
    assert result["advisory"]["amounts"] == {}


# --- how far the money in hand is below the app's cash mark -----------------


def test_money_in_hand_below_the_cash_mark_says_how_far_below():
    result = run(available_capital=4000, initial_investment=3000)

    assert result["advisory"]["amounts"] == {
        "adv.cashReserve": {
            "kind": "cash_reserve",
            "have": 4000,
            "target": 10000,
            "short": 6000,
        }
    }


def test_the_amount_short_of_the_cash_mark_is_rounded_up():
    result = run(available_capital=9999.5, initial_investment=3000)

    assert result["advisory"]["amounts"]["adv.cashReserve"]["short"] == 1


def test_money_in_hand_at_the_cash_mark_has_no_amount():
    result = run(available_capital=10000, initial_investment=3000)

    assert "adv.cashReserve" not in result["advisory"]["recommendation_codes"]
    assert result["advisory"]["amounts"] == {}


def test_the_cash_mark_is_the_one_the_advice_is_raised_on():
    below = generate_advice("profitable", 20, CASH_RESERVE_RUPEES - 1)
    at = generate_advice("profitable", 20, CASH_RESERVE_RUPEES)

    assert CASH_RESERVE_RUPEES == 10000
    assert "adv.cashReserve" in below["recommendation_codes"]
    assert "adv.cashReserve" not in at["recommendation_codes"]


# --- what the amounts leave alone -------------------------------------------


def test_it_is_a_function_of_the_analysis_it_is_given_and_changes_nothing():
    result = run(
        available_capital=4000,
        initial_investment=3000,
        expected_monthly_revenue=10000,
        monthly_expenses=12500,
    )
    before = copy.deepcopy(result)

    again = build_advice_amounts(
        result["financial_analysis"],
        result["risk_analysis"],
        result["advisory"],
        result["mvp_summary"],
    )

    assert again == result["advisory"]["amounts"]
    assert len(again) == 3
    assert result == before


def test_no_amount_reaches_the_written_plan():
    # The model is sent the rules' sentences and never a figure. An amount sits
    # beside a sentence, so it must not be able to find its way into the context.
    answers, analysis = analyse(available_capital=4000, monthly_expenses=35000)
    assert len(analysis["advisory"]["amounts"]) == 3

    without = copy.deepcopy(analysis)
    del without["advisory"]["amounts"]

    assert build_context(answers, analysis) == build_context(answers, without)


def test_the_route_carries_the_amounts():
    payload = {
        "business_category": "tailoring",
        "state": "Uttar Pradesh",
        "available_capital": 50000,
        "monthly_expenses": 12500,
        "expected_monthly_revenue": 10000,
        "monthly_emi": 0,
        "initial_investment": 40000,
        "monthly_operating_expenses": 6000,
    }

    response = client.post("/api/analysis/run", json=payload)

    assert response.status_code == 200
    amounts = response.json()["advisory"]["amounts"]
    assert amounts["adv.reduceExpenses"] == {"kind": "break_even", "shortfall": 2500}


# --- the real pipeline ------------------------------------------------------


def test_every_amount_holds_against_the_real_rules_and_every_kind_is_reachable():
    """A sweep through run_unified_analysis, not a unit call.

    Each amount is checked with the rules' own functions, not with the arithmetic
    that produced it: the limit passes, one rupee more does not, and the cut
    reaches the limit. A sentence the page shows has no amount only where the
    rules cannot give an honest one.
    """
    kinds = set()
    codes = set()
    new_loan_flags = set()

    for capital, revenue, expenses, emi, investment, income in product(
        [0, 4000, 50000],
        [0, 12000, 20000, 50000],
        [8000, 15000, 25000],
        [0, 3000, 9000, 15000],
        [3000, 40000],
        [None, 0, 6000, 16000, 60000],
    ):
        result = run(
            available_capital=capital,
            expected_monthly_revenue=revenue,
            monthly_expenses=expenses,
            monthly_emi=emi,
            initial_investment=investment,
            household_monthly_income=income,
        )
        financial = result["financial_analysis"]
        risk = result["risk_analysis"]
        advisory = result["advisory"]
        summary = result["mvp_summary"]
        amounts = advisory["amounts"]
        profit = financial["monthly_profit"]
        gap = financial["funding_gap"]
        shown = set(advisory["recommendation_codes"]) | {summary["next_step_code"]}

        # The advice itself is untouched: no sentence has gained a digit.
        for sentence in [*advisory["recommendations"], summary["next_step"], summary["simple_message"]]:
            assert not any(character.isdigit() for character in sentence), sentence

        # Only a sentence the page shows has an amount.
        assert set(amounts) <= shown

        for code, entry in amounts.items():
            codes.add(code)
            kinds.add(entry["kind"])

            if entry["kind"] == "break_even":
                assert code in {"adv.reduceExpenses", "nxt.reviewExpenses"}
                assert profit + entry["shortfall"] >= 0 > profit + entry["shortfall"] - 1

            elif entry["kind"] == "loan_payments":
                assert code == "nxt.reducePressure"
                limit = entry["limit"]
                assert entry["now"] == emi
                assert _pressure(profit, limit, gap)["risk_level"] == "low"
                assert _pressure(profit, limit + 1, gap)["risk_level"] != "low"
                assert entry["cut"] >= 1
                assert limit + entry["cut"] == math.ceil(emi)
                assert entry["with_new_loan"] == (risk["estimated_new_emi"] > 0)
                new_loan_flags.add(entry["with_new_loan"])

            elif entry["kind"] == "household_payments":
                assert code in {"adv.householdAlreadyOver", "nxt.householdOverLimit"}
                limit = entry["limit"]
                assert entry["now"] == emi
                assert income is not None and income > 0
                assert _pressure(profit, limit, 0, income)["household_check"] != "over_limit"
                assert _pressure(profit, limit + 1, 0, income)["household_check"] == "over_limit"
                assert entry["cut"] >= 1
                assert limit + entry["cut"] == math.ceil(emi)

            else:
                assert entry["kind"] == "cash_reserve"
                assert code == "adv.cashReserve"
                assert entry["have"] == capital
                assert entry["target"] == CASH_RESERVE_RUPEES
                assert capital + entry["short"] >= CASH_RESERVE_RUPEES > capital + entry["short"] - 1

        # And where a sentence has none, it is because the rules have none to give.
        for code in ("adv.reduceExpenses", "nxt.reviewExpenses"):
            if code in shown:
                assert (code in amounts) == (profit < 0)
        if "nxt.reducePressure" in shown:
            assert ("nxt.reducePressure" in amounts) == (_pressure(profit, 0, gap)["risk_level"] == "low")
        for code in ("adv.householdAlreadyOver", "nxt.householdOverLimit"):
            if code in shown:
                assert (code in amounts) == (income is not None and income > 0)
        if "adv.cashReserve" in shown:
            assert "adv.cashReserve" in amounts

    assert kinds == {"break_even", "loan_payments", "household_payments", "cash_reserve"}
    assert codes == {
        "adv.reduceExpenses",
        "nxt.reviewExpenses",
        "nxt.reducePressure",
        "adv.householdAlreadyOver",
        "nxt.householdOverLimit",
        "adv.cashReserve",
    }
    assert new_loan_flags == {True, False}
