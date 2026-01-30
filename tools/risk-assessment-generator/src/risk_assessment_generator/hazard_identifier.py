"""Hazard identification using Anthropic Claude API."""

import json
import os
from typing import Optional

import anthropic

from .models import (
    AgeGroup,
    Hazard,
    HazardWithMitigation,
    Likelihood,
    MitigationStrategy,
    RiskAssessment,
    Severity,
)

SYSTEM_PROMPT = """You are an expert in early years childcare health and safety in the UK, with comprehensive knowledge of the Statutory Framework for the Early Years Foundation Stage (EYFS) 2024.

Your risk assessments must align with EYFS 2024 requirements, specifically:

SAFEGUARDING AND WELFARE REQUIREMENTS (Section 3):
- 3.4: Providers must take all reasonable steps to ensure children are not exposed to risks
- 3.54: Risk assessments must identify aspects of the environment that need to be checked regularly
- 3.55: Providers must determine where it is helpful to make written risk assessments
- 3.64: For outings, a risk assessment must include the required adult to child ratio

STAFF:CHILD RATIOS (3.39-3.46):
- Children under 2: 1 adult to 3 children
- Children aged 2: 1 adult to 4 children
- Children aged 3+: 1 adult to 8 children (or 1:13 with a qualified teacher)

KEY SAFETY AREAS TO CONSIDER:
- Choking hazards: Items under 4.5cm diameter are choking risks for under-3s
- Strangulation: Cords, strings, ribbons over 22cm
- Supervision: Appropriate for age and activity type
- Allergies: Must have systems to obtain allergy information and act on it
- First aid: Paediatric first aider must be available
- Food safety: Fresh drinking water must always be available
- Hygiene: Handwashing, nappy changing procedures, illness exclusion
- Premises safety: Indoor space of 3.5m² per child (under 2s), 2.5m² (2-3s), 2.3m² (3-5s)
- Outdoor safety: Weather appropriate clothing, sun protection, equipment checks
- Equipment: Must be suitable for age and stage, regularly inspected

When identifying hazards, always consider:
1. The specific developmental stage and capabilities of the age group
2. Required supervision levels and staff ratios
3. Practical, proportionate control measures
4. Both physical and emotional wellbeing"""

HAZARD_ANALYSIS_PROMPT = """Analyze the following nursery activity and identify potential hazards in accordance with EYFS 2024 statutory requirements.

Activity: {activity_name}
Description: {activity_description}
Location: {location}
Age Groups: {age_groups}

Provide a comprehensive risk assessment in JSON format with the following structure:
{{
    "hazards": [
        {{
            "description": "Clear description of the hazard",
            "severity": "Low" | "Medium" | "High",
            "likelihood": "Unlikely" | "Possible" | "Likely",
            "who_at_risk": "Who could be harmed (e.g., Children, Staff, Both)",
            "existing_controls": ["Control measures typically already in place"],
            "additional_controls": [
                {{
                    "action": "Specific action to take",
                    "responsible_person": "Who should do this (e.g., Room Leader, All Staff, Manager)"
                }}
            ],
            "residual_risk": "Low" | "Medium" | "High"
        }}
    ],
    "additional_notes": "Any important notes including relevant EYFS ratio requirements and supervision guidance for this activity"
}}

Requirements:
- Identify 4-8 relevant hazards, prioritizing those most significant for the specified age groups
- Consider EYFS staff:child ratios and whether enhanced supervision is needed
- Include age-specific risks (e.g., mouthing objects for under-2s, climbing for toddlers)
- Focus on practical, actionable control measures appropriate for a UK nursery setting
- Ensure controls are proportionate - don't over-complicate low-risk activities
- Reference specific EYFS requirements where relevant (e.g., ratio requirements, first aid)"""


class HazardIdentifier:
    """Identifies hazards for nursery activities using Claude API."""

    def __init__(self, api_key: Optional[str] = None):
        """Initialize with Anthropic API key.

        Args:
            api_key: Anthropic API key. If not provided, reads from
                    ANTHROPIC_API_KEY environment variable.
        """
        self.api_key = api_key or os.environ.get("ANTHROPIC_API_KEY")
        if not self.api_key:
            raise ValueError(
                "Anthropic API key required. Set ANTHROPIC_API_KEY environment "
                "variable or pass api_key parameter."
            )
        self.client = anthropic.Anthropic(api_key=self.api_key)

    def identify_hazards(
        self,
        activity_name: str,
        activity_description: str,
        location: str = "Nursery",
        age_groups: Optional[list[AgeGroup]] = None,
    ) -> RiskAssessment:
        """Analyze an activity and identify potential hazards.

        Args:
            activity_name: Name of the activity (e.g., "Water Play")
            activity_description: Detailed description of what the activity involves
            location: Where the activity takes place
            age_groups: List of age groups participating

        Returns:
            Complete RiskAssessment with identified hazards and mitigations
        """
        if age_groups is None:
            age_groups = [AgeGroup.ALL]

        age_groups_str = ", ".join(ag.value for ag in age_groups)

        prompt = HAZARD_ANALYSIS_PROMPT.format(
            activity_name=activity_name,
            activity_description=activity_description,
            location=location,
            age_groups=age_groups_str,
        )

        response = self.client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=2000,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}],
        )

        response_text = response.content[0].text
        assessment_data = self._parse_response(response_text)

        hazards_with_mitigation = []
        for hazard_data in assessment_data.get("hazards", []):
            hazard = Hazard(
                description=hazard_data["description"],
                severity=Severity(hazard_data["severity"]),
                likelihood=Likelihood(hazard_data["likelihood"]),
                who_at_risk=hazard_data["who_at_risk"],
            )

            additional_controls = [
                MitigationStrategy(
                    action=ctrl["action"],
                    responsible_person=ctrl.get("responsible_person", "Nursery Staff"),
                )
                for ctrl in hazard_data.get("additional_controls", [])
            ]

            hazard_with_mitigation = HazardWithMitigation(
                hazard=hazard,
                existing_controls=hazard_data.get("existing_controls", []),
                additional_controls=additional_controls,
                residual_risk=hazard_data.get("residual_risk", "Low"),
            )
            hazards_with_mitigation.append(hazard_with_mitigation)

        return RiskAssessment(
            activity_name=activity_name,
            activity_description=activity_description,
            location=location,
            age_groups=age_groups,
            hazards=hazards_with_mitigation,
            additional_notes=assessment_data.get("additional_notes", ""),
        )

    def _parse_response(self, response_text: str) -> dict:
        """Parse JSON from Claude's response.

        Handles cases where response may include markdown code blocks.
        """
        text = response_text.strip()

        if text.startswith("```"):
            lines = text.split("\n")
            start_idx = 1 if lines[0].startswith("```") else 0
            end_idx = len(lines)
            for i, line in enumerate(lines[1:], 1):
                if line.strip() == "```":
                    end_idx = i
                    break
            text = "\n".join(lines[start_idx:end_idx])

        return json.loads(text)
