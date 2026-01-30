"""Command-line interface for the Risk Assessment Generator."""

import argparse
import sys

from .hazard_identifier import HazardIdentifier
from .models import AgeGroup


def parse_age_groups(age_str: str) -> list[AgeGroup]:
    """Parse age group string into list of AgeGroup enums."""
    age_map = {
        "baby": AgeGroup.BABY,
        "toddler": AgeGroup.TODDLER,
        "preschool": AgeGroup.PRESCHOOL,
        "pre-k": AgeGroup.PRE_KINDERGARTEN,
        "reception": AgeGroup.RECEPTION,
        "all": AgeGroup.ALL,
    }

    groups = []
    for part in age_str.lower().split(","):
        part = part.strip()
        if part in age_map:
            groups.append(age_map[part])

    return groups if groups else [AgeGroup.ALL]


def print_risk_assessment(assessment):
    """Print a formatted risk assessment to stdout."""
    print("\n" + "=" * 60)
    print(f"RISK ASSESSMENT: {assessment.activity_name.upper()}")
    print("=" * 60)

    print(f"\nActivity: {assessment.activity_name}")
    print(f"Description: {assessment.activity_description}")
    print(f"Location: {assessment.location}")
    print(f"Age Groups: {', '.join(ag.value for ag in assessment.age_groups)}")
    print(f"Assessment Date: {assessment.assessment_date}")
    print(f"Overall Risk Level: {assessment.overall_risk_level}")

    print("\n" + "-" * 60)
    print("IDENTIFIED HAZARDS")
    print("-" * 60)

    for i, hwm in enumerate(assessment.hazards, 1):
        h = hwm.hazard
        print(f"\n{i}. {h.description}")
        print(f"   Severity: {h.severity.value} | Likelihood: {h.likelihood.value} | Risk: {h.risk_level}")
        print(f"   Who at risk: {h.who_at_risk}")

        if hwm.existing_controls:
            print("   Existing controls:")
            for ctrl in hwm.existing_controls:
                print(f"     • {ctrl}")

        if hwm.additional_controls:
            print("   Additional controls needed:")
            for ctrl in hwm.additional_controls:
                print(f"     • {ctrl.action} ({ctrl.responsible_person})")

        print(f"   Residual risk after controls: {hwm.residual_risk}")

    if assessment.additional_notes:
        print("\n" + "-" * 60)
        print("ADDITIONAL NOTES")
        print("-" * 60)
        print(assessment.additional_notes)

    print("\n" + "=" * 60 + "\n")


def main():
    """Main entry point for CLI."""
    parser = argparse.ArgumentParser(
        description="Generate risk assessments for nursery activities"
    )
    parser.add_argument(
        "activity",
        help="Name of the activity (e.g., 'Water Play')"
    )
    parser.add_argument(
        "-d", "--description",
        required=True,
        help="Description of the activity"
    )
    parser.add_argument(
        "-l", "--location",
        default="Nursery",
        help="Location of the activity (default: Nursery)"
    )
    parser.add_argument(
        "-a", "--ages",
        default="all",
        help="Age groups (comma-separated): baby, toddler, preschool, pre-k, reception, all"
    )

    args = parser.parse_args()

    try:
        identifier = HazardIdentifier()
    except ValueError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

    age_groups = parse_age_groups(args.ages)

    print(f"Analyzing hazards for '{args.activity}'...")

    try:
        assessment = identifier.identify_hazards(
            activity_name=args.activity,
            activity_description=args.description,
            location=args.location,
            age_groups=age_groups,
        )
    except Exception as e:
        print(f"Error analyzing activity: {e}", file=sys.stderr)
        sys.exit(1)

    print_risk_assessment(assessment)


if __name__ == "__main__":
    main()
