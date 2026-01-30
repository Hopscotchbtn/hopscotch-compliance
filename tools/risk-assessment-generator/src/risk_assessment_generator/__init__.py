"""Risk Assessment Generator package."""

__version__ = "0.1.0"

from .models import (
    AgeGroup,
    Hazard,
    HazardWithMitigation,
    Likelihood,
    MitigationStrategy,
    RiskAssessment,
    Severity,
)
from .hazard_identifier import HazardIdentifier

__all__ = [
    "AgeGroup",
    "Hazard",
    "HazardIdentifier",
    "HazardWithMitigation",
    "Likelihood",
    "MitigationStrategy",
    "RiskAssessment",
    "Severity",
]
