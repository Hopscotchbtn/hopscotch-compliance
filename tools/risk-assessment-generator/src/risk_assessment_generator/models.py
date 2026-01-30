"""Data models for risk assessments."""

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional
from datetime import date


class Severity(Enum):
    """Risk severity levels."""
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"


class Likelihood(Enum):
    """Likelihood of hazard occurring."""
    UNLIKELY = "Unlikely"
    POSSIBLE = "Possible"
    LIKELY = "Likely"


class AgeGroup(Enum):
    """Age groups in early years settings."""
    BABY = "0-12 months"
    TODDLER = "1-2 years"
    PRESCHOOL = "2-3 years"
    PRE_KINDERGARTEN = "3-4 years"
    RECEPTION = "4-5 years"
    ALL = "All ages"


@dataclass
class Hazard:
    """A potential hazard identified for an activity."""
    description: str
    severity: Severity
    likelihood: Likelihood
    who_at_risk: str

    @property
    def risk_level(self) -> str:
        """Calculate overall risk level from severity and likelihood."""
        severity_scores = {Severity.LOW: 1, Severity.MEDIUM: 2, Severity.HIGH: 3}
        likelihood_scores = {Likelihood.UNLIKELY: 1, Likelihood.POSSIBLE: 2, Likelihood.LIKELY: 3}

        score = severity_scores[self.severity] * likelihood_scores[self.likelihood]

        if score <= 2:
            return "Low"
        elif score <= 4:
            return "Medium"
        else:
            return "High"


@dataclass
class MitigationStrategy:
    """A control measure to reduce risk."""
    action: str
    responsible_person: str = "Nursery Staff"


@dataclass
class HazardWithMitigation:
    """A hazard paired with its mitigation strategies."""
    hazard: Hazard
    existing_controls: list[str] = field(default_factory=list)
    additional_controls: list[MitigationStrategy] = field(default_factory=list)
    residual_risk: str = "Low"


@dataclass
class RiskAssessment:
    """Complete risk assessment for an activity."""
    activity_name: str
    activity_description: str
    location: str
    age_groups: list[AgeGroup]
    hazards: list[HazardWithMitigation]
    assessment_date: date = field(default_factory=date.today)
    assessor_name: str = ""
    review_date: Optional[date] = None
    additional_notes: str = ""

    @property
    def overall_risk_level(self) -> str:
        """Determine overall risk level based on highest hazard risk."""
        if not self.hazards:
            return "Low"

        risk_order = ["Low", "Medium", "High"]
        max_risk = max(
            self.hazards,
            key=lambda h: risk_order.index(h.hazard.risk_level)
        )
        return max_risk.hazard.risk_level
