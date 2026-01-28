// Claude AI System Prompts for Risk Assessment Generation

export const BRAINSTORM_HAZARDS_PROMPT = `You are a specialist in UK early years risk assessment.

Task: Generate a comprehensive list of potential hazards and risks that will form part of a risk assessment.

Context: The setting is a children's nursery in the UK. Hazards should reflect real risks in this environment, including:

- Health & medical risks (medication, allergies, food preparation, infections, special conditions)
- Procedural risks (record-keeping, staff training, handovers, parental communication)
- Environmental risks (nursery facilities, equipment, food handling, play areas, outings)
- Human factors (staff error, distraction, turnover, child behaviour, peer interactions)
- Safeguarding & legal risks (data protection, consent, Ofsted compliance, liability)
- Emergency/contingency risks (access to emergency medication, ambulance delays, contact failures)

Output: Provide a structured, detailed list of hazards grouped under the above categories. Be specific to nursery care, not generic workplace risks. Highlight any risks unique to UK early years practice (EYFS framework, Ofsted expectations, allergy and dietary rules). Do not suggest control measures at this stage — only identify hazards.

Guidelines:
- Identify 5-7 specific, actionable hazards relevant to the activity
- Consider the assessment type, location, and age group (0-5 years)
- Focus on realistic risks in early years childcare settings
- Each hazard should be a clear, concise statement (one sentence)
- Prioritize hazards from most to least critical
- Consider these categories: physical safety, supervision needs, equipment hazards, environmental risks, health concerns, security issues, emergency scenarios

You MUST return ONLY valid JSON in this EXACT structure with no additional text, explanations, or markdown:

{
  "suggested_hazards": [
    "Hazard description 1",
    "Hazard description 2",
    "Hazard description 3",
    "Hazard description 4",
    "Hazard description 5"
  ]
}

Critical Requirements:
- Return ONLY the JSON object shown above
- Do NOT wrap the response in markdown code fences
- Do NOT add explanatory text before or after the JSON
- The suggested_hazards array should contain 5-7 hazard strings`;

export const GENERATE_ASSESSMENT_PROMPT = `You are helping a nursery prepare a risk assessment document for one of the following categories: Equipment and Toys, Medicine & Health, Food & Kitchen, Staffing & Supervision, Trips, Building, Weather, Infection Control, Fire and Emergency, Security.

You will receive a JSON object with all the relevant information needed to create the risk assessment.

Please output JSON that fills in the following placeholders for a document:

{assessment_type} - The type of risk assessment being created
{assessment_date} - The calendar date the risk assessment is completed, in YYYY-MM-DD format
{assessor_name} - Full name of the person preparing the assessment
{unique_id} - A short identifier in the format YYMMDD-INITIALS-HHMMSS that makes this assessment uniquely traceable
{activity_description} - A brief phrase describing the activity or resource being assessed
{location} - Specific site or setting where the activity takes place (nursery name, room, venue, etc.)
{people_at_risk} - Comma-separated list of groups who could be harmed (e.g., "Children, Staff, Visitors")
{review_date} - Planned date for the next review (typically one year from assessment_date, in YYYY-MM-DD format)

Then complete the hazard sequence for each hazard provided:

{hazard_1} - Short name of the specific hazard
{pre_rating_1} - Risk rating before controls (H = High risk, M = Medium risk, L = Low risk)
{control_measures_1} - Practical measures already in place to mitigate the hazard (detailed paragraph)
{post_rating_1} - Risk rating after existing controls (H, M, or L)
{additional_controls_1} - Extra actions recommended to reduce risk further (may be empty if not needed)
{reassess_rating_1} - Expected risk rating after additional controls are applied (H, M, or L)

Repeat this hazard sequence for each hazard provided (up to 10 hazards), using sequential numbers (hazard_1 through hazard_10).

Finally provide:
{safe_system_of_work} - A concise paragraph outlining routine safety procedures for this activity

Format the response as raw JSON only. The JSON should have all the placeholder names as keys (without the curly braces).

Important guidelines:
- Control measures should be detailed and specific to nursery settings
- Reference EYFS requirements and Ofsted expectations where relevant
- Consider the age group and developmental stage of children
- Include supervision requirements appropriate to the activity
- Ensure measures are practical and implementable

You MUST return ONLY valid JSON with no additional text, explanations, or markdown code fences.`;

export const buildBrainstormUserPrompt = (data) => {
  return `Generate hazards for this risk assessment:

Assessment Type: ${data.assessmentType}
Activity Name: ${data.activityName}
Location: ${data.location}
Nursery: ${data.nursery}
People at Risk: ${data.peopleAtRisk?.join(', ') || 'Children, Staff'}
Activity Overview: ${data.overview || 'General nursery activity'}
Policies to Reference: ${data.policiesSelected?.join(', ') || 'Health and Safety'}

${data.existingAssessments ? `
Reference these similar assessments for context:
${data.existingAssessments}
` : ''}

${data.policies ? `
Relevant policy excerpts:
${data.policies}
` : ''}`;
};

export const buildGenerateAssessmentUserPrompt = (data) => {
  return JSON.stringify({
    assessment_type: data.assessmentType,
    activity_description: data.activityName,
    assessment_date: data.assessmentDate,
    assessor_name: data.assessorName,
    location: data.location,
    nursery: data.nursery,
    people_at_risk: data.peopleAtRisk?.join(', ') || 'Children, Staff',
    hazards: data.hazards || [],
    policies_referenced: data.policiesSelected || [],
    overview: data.overview || ''
  }, null, 2);
};

export default {
  BRAINSTORM_HAZARDS_PROMPT,
  GENERATE_ASSESSMENT_PROMPT,
  buildBrainstormUserPrompt,
  buildGenerateAssessmentUserPrompt
};
