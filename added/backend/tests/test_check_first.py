"""
The "check these before you go" lines on a scheme card (Row 7, "might not fit").

The app collects twelve answers and none of them is an age, a sex, a community, a
trade, a membership or a registration, so it cannot tell a reader whether a scheme
fits them. What it can do is name the few of the scheme's own eligibility lines that
decide that, so the reader checks them before the trip. gen_schemes.py holds the
list (CHECK_FIRST, by eligibility code), schemes.json carries it as
check_first_codes, and match_schemes() sends the matching sentences beside it as
check_first / check_first_codes. Nothing here evaluates a rule.
"""

import sys
from pathlib import Path

import pytest

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import gen_schemes  # noqa: E402

from app.services.analysis_service import run_unified_analysis  # noqa: E402
from app.services.scheme_service import load_schemes, match_schemes  # noqa: E402

# Lines the matcher already decides before a card is shown: the state list, and the
# kind-of-place gate (LOCATION_TYPES in gen_schemes.py). Telling the reader to check
# one would ask them to confirm something the list was already cut by.
DECIDED_BY_A_GATE = {"elig.unnati.where", "elig.common.ruralArea", "elig.common.urbanArea"}

NO_NOTE = {"pmmy", "dic", "tehsil_certificates", "blbc", "gp_licence"}


def _by_id():
    return {scheme["id"]: scheme for scheme in load_schemes()}


def test_every_scheme_carries_the_list_and_only_five_leave_it_empty():
    # Five schemes name nobody in particular: the Mudra bands are priced by the
    # loan size, and the four offices take anyone who walks in. Pinned so that
    # adding or removing a note is a decision, not an accident of the table.
    empty = {sid for sid, scheme in _by_id().items() if scheme["check_first_codes"] == []}

    assert empty == NO_NOTE


def test_every_tagged_code_is_one_the_scheme_carries_once():
    for sid, scheme in _by_id().items():
        codes = scheme["check_first_codes"]

        assert len(set(codes)) == len(codes), sid
        assert set(codes) <= set(scheme["eligibility_codes"]), sid
        # Never the whole list: a card that says "check all of these" says nothing.
        assert len(codes) < len(scheme["eligibility_codes"]), sid


def test_no_note_repeats_what_a_gate_already_decided():
    tagged = {code for scheme in load_schemes() for code in scheme["check_first_codes"]}

    assert not tagged & DECIDED_BY_A_GATE


def test_the_generator_refuses_a_code_the_scheme_does_not_carry(monkeypatch):
    # Without this a typo'd code would ship as a note with no sentence behind it.
    monkeypatch.setitem(gen_schemes.CHECK_FIRST, "rseti", ["elig.no.such.line"])

    with pytest.raises(SystemExit, match="CHECK_FIRST"):
        gen_schemes.build()


def test_the_generator_refuses_a_scheme_id_it_does_not_know(monkeypatch):
    monkeypatch.setitem(gen_schemes.CHECK_FIRST, "no_such_scheme", ["elig.common.age18"])

    with pytest.raises(SystemExit, match="unknown scheme id"):
        gen_schemes.build()


def test_the_generator_refuses_the_same_code_twice(monkeypatch):
    monkeypatch.setitem(gen_schemes.CHECK_FIRST, "rseti", ["elig.common.age18to45"] * 2)

    with pytest.raises(SystemExit, match="CHECK_FIRST"):
        gen_schemes.build()


def _expected_sentences(scheme):
    rules = dict(zip(scheme["eligibility_codes"], scheme["eligibility_rules"]))
    return [rules[code] for code in scheme["check_first_codes"]]


def test_a_match_carries_the_sentences_that_go_with_its_codes():
    by_id = _by_id()
    seen = 0

    for category in ("tailoring", "dairy", "agriculture", "food processing", "retail"):
        for state in ("Uttar Pradesh", "Karnataka", "Assam", "Delhi"):
            for match in match_schemes(business_category=category, state=state, location_type="rural"):
                scheme = by_id[match["scheme_id"]]

                assert match["check_first_codes"] == scheme["check_first_codes"], scheme["id"]
                assert match["check_first"] == _expected_sentences(scheme), scheme["id"]
                assert len(match["check_first"]) == len(match["check_first_codes"]), scheme["id"]
                seen += bool(match["check_first"])

    # A sweep over matches with no note would pass on an empty field.
    assert seen > 20


def test_a_scheme_added_without_the_field_still_matches(monkeypatch):
    # An old schemes.json, or a scheme added by hand, has no check_first_codes. It
    # must still render, with no note, exactly as it does without translation codes.
    from app.services import scheme_service

    stripped = [
        {key: value for key, value in scheme.items() if key != "check_first_codes"}
        for scheme in load_schemes()
    ]
    monkeypatch.setattr(scheme_service, "load_schemes", lambda: stripped)
    scheme_service._scheme_index.cache_clear()
    try:
        matches = match_schemes(business_category="tailoring", state="Uttar Pradesh", location_type="rural")
    finally:
        monkeypatch.undo()
        scheme_service._scheme_index.cache_clear()

    assert matches
    assert all(match["check_first"] == [] and match["check_first_codes"] == [] for match in matches)


def test_the_notes_reach_the_unified_analysis():
    result = run_unified_analysis(
        business_category="tailoring",
        state="Uttar Pradesh",
        available_capital=50000,
        monthly_expenses=15000,
        expected_monthly_revenue=40000,
        monthly_emi=0,
        initial_investment=200000,
        monthly_operating_expenses=12000,
        location_type="rural",
    )
    by_id = {match["scheme_id"]: match for match in result["scheme_matches"]}

    assert by_id["up_myuva"]["check_first_codes"] == [
        "elig.common.age21to40",
        "elig.common.class8",
        "elig.common.residentState",
    ]
    assert by_id["up_myuva"]["check_first"][0] == "The applicant must generally be between 21 and 40 years of age."
    assert by_id["pmmy"]["check_first"] == []
