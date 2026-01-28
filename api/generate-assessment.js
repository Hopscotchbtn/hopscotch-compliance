import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
)

// FSMS Policy Guidance (Hopscotch Food Safety Management System - HACCP based, V2 Jan 2024)
const FSMS_GUIDANCE = {
  'fsms-haccp': `FSMS HACCP Control Measures (apply to Food & Kitchen assessments):
CCP1 - Receiving Cold Food:
- Probe temperature check on arrival (critical limit: ≤8°C)
- If >8°C and <2hrs since packing: refrigerate immediately or serve
- If >8°C and >2hrs: reject and return to supplier or dispose
- Random checks on packed lunches; advise parents to use freezer blocks
- Record on HOP06 Daily Food Safety Diary

CCP2 - Receiving Hot Food:
- Probe temperature check on arrival (critical limit: ≥63°C)
- Little Tums packs at ≥75°C in insulated Polyboxes with heat pads
- If <63°C and <2hrs since packing: serve immediately or reheat
- If <63°C and >2hrs: reject/dispose
- Share temperature records with Little Tums when required

CCP3/4 - Opening/Distributing Food:
- Time check when opening Polyboxes (critical limit: within 2 hours of delivery)
- If >2hrs: recheck temperature before serving
- Cold food must still be ≤8°C; hot food must still be ≥63°C
- Food outside limits must be disposed

CCP5 - Reheating:
- Reheat to ≥75°C core temperature (packed lunch items)
- Cover food in microwave, stir/turn during heating
- Check with calibrated probe before serving
- If not achieved: continue reheating until correct temperature

CCP6 - Bottle Sterilising:
- Use only Tommee Tippee electric steam or microwave sterilisers
- Steam temperature 121-132°C kills microorganisms
- Contents remain sterile 24 hours if unopened
- Wash hands before handling sterilised items
- Descale equipment as per manufacturer instructions

General Controls:
- Daily Food Safety Diary (HOP06) for all temperature/time records
- Supplier verification (Little Tums Approval UK/AR009)
- Quarterly management reviews (HOP13)
- Staff food hygiene training (HOP08 Training Tracker)`,

  'fsms-allergens': `FSMS Allergen Control Measures - CCP7 (apply to all food service):
Before Service:
- Check Children's Information Board in each room at start of day
- Verify all children on day register have allergies clearly identified
- Access HOP05 Health Care Plan if any information unclear
- Check Allergen Identity Tables (HOP12) against menu items

During Service:
- Never serve food containing known allergens to allergic child
- Use separate preparation areas/equipment for allergen-free meals
- Clear labelling of all prepared foods with allergen information
- Staff member confirms allergen check before each meal service

If Food Served in Error:
- Withdraw food immediately
- Do NOT move the child
- Assign dedicated staff member to closely monitor child
- Follow emergency medication protocols if reaction occurs
- Record incident on HOP06 Daily Food Safety Diary

Documentation:
- HOP01 Registration Form captures initial allergy info
- HOP02 Medical & Allergy Decision Tree for assessment
- HOP04 Settling In Form confirms medical conditions
- HOP05 Health Care Plan for detailed management
- HOP12 Allergen Identity Tables for menu reference`,

  'fsms-temperature': `FSMS Temperature Control Measures (specific limits):
Receiving Temperatures:
- Cold food from Little Tums: ≤8°C (target 5°C)
- Hot food from Little Tums: ≥63°C (dispatched at ≥75°C)
- Packed lunches: visual check, refrigerate immediately
- Shopping: probe check, refrigerate within 2 hours

Storage Temperatures:
- Fridge: 0-5°C, check and record daily
- Food in Polyboxes: serve within 2 hours of delivery

Service Temperatures:
- Hot food holding: minimum 63°C
- Cold food out of fridge: maximum 4 hours cumulative in danger zone

Reheating Temperatures:
- Core temperature must reach ≥75°C
- Use calibrated probe thermometer to verify
- Allow food to continue warming after microwave removal

Corrective Actions:
- Cold food >8°C after >2hrs: dispose
- Hot food <63°C after >2hrs: dispose
- Reheating not reaching 75°C: continue heating
- Document all corrective actions on HOP06

Equipment:
- Calibrated probe thermometers required
- Insert into middle/thickest part of food
- Clean and disinfect probe between uses`,

  'fsms-choking': `FSMS Choking Prevention Measures:
High-Risk Foods (restrict or modify):
- Hard sweets/candy (leading cause of choking)
- Whole grapes, cherry tomatoes (cut lengthwise)
- Raw carrots (grate or cook until soft)
- Nuts and seeds (avoid for young children)
- Popcorn, hard crisps/chips
- Chunks of meat, cheese, hot dogs (cut small)
- Bones (remove completely)
- Whole sausages (cut lengthwise then slice)

Age-Appropriate Preparation:
- Under 2s: puree or very soft foods, tiny pieces
- 2-3 years: soft foods cut into small pieces
- 3-5 years: age-appropriate portions, supervised

Formula/Breast Milk:
- Also presents choking hazard for infants
- Proper feeding position required
- Never leave infant unattended while feeding

Controls:
- Supervise all eating - staff present throughout mealtimes
- Children seated properly in appropriate chairs
- No rushing meals
- Staff trained in paediatric choking first aid
- Emergency response procedures displayed in eating areas

Communication:
- Restricted food list provided to parents for packed lunches
- Food activity risk assessments completed before cooking/tasting activities
- Refer to FSMS Section 4.16 Food Related Choking Hazards`,

  'fsms-sops': `FSMS Pre-Requisite SOP Control Measures (apply to Food & Kitchen assessments):

Permitted Foods Controls (SOP1):
- Pre-authorised shopping list from head office
- No raw meat, fish or seafood on premises
- Only occasional frozen foods (ice, seasonal ice cream)
- Food activities require separate risk assessment
- Messy play ingredients from approved list only

Children's Food Information Controls (SOP2):
- HOP1 Registration captures initial allergy info
- HOP2 Medical & Allergy Decision Tree guides assessment
- HOP4 Settling In Form confirms conditions
- HOP5 Health Care Plan for detailed management (Likelihood x Severity scoring)
- Children's Information Board checked at every briefing
- Colour coding: Medical=BLUE, Allergens=RED, Dietary=GREEN

Supplier Controls (SOP3):
- Check FSA Food Hygiene Ratings before using suppliers
- Minimum rating 4 (Good) or 5 (Very Good)
- HOP7 Suppliers List maintained with accreditation docs
- Little Tums menus have Allergen Identity Tables

Training Controls (SOP4):
- Level 2 Food Hygiene: all food handlers within 1 month
- Level 3 Food Hygiene: managers within 1 month
- FSA Allergen training: all food handlers immediately
- Refresher every 3 years
- HOP15 Induction Checklist signed off
- HOP8 Training Tracker maintained

Premises & Maintenance Controls (SOP5):
- Daily opening/closing checks on HOP6
- Quarterly reviews on HOP13
- Dedicated Maintenance Person weekly visits
- Equipment manuals kept in office
- Defective equipment removed from use immediately

Pest Control (SOP6):
- Daily visual checks all areas including bins/perimeter
- Council Pest Control on call-out only
- Insect killer UV bulbs changed as needed
- Deliveries checked for pest damage
- Thorough clean after any pest treatment

Complaints Procedure (SOP7):
- HOP9 Food Complaint Form for all incidents
- Managing Director notified immediately
- Foreign body: photograph with ruler, bag and refrigerate if organic
- Share info with Little Tums same day
- Outcome letter to complainants

Traceability Controls (SOP8):
- Sign up to FSA Alerts service
- Short supply chain through branded supermarkets
- Nursery Register enables recall if needed
- Notify Environmental Health if food safety issue

Temperature & Cold Chain Controls (SOP9):
- Danger zone 5°C-63°C - keep food out
- Cold storage ≤5°C, check daily
- Hot holding ≥63°C
- Max 20 minutes at room temperature
- All temps recorded on HOP6

Probe Thermometer Controls (SOP10):
- Digital penetration probes in every room/kitchen
- Clean with EN 13727 wipes before each use
- Monthly calibration: iced water -1 to 1°C, boiling 99-101°C
- Calibration recorded on HOP6
- Spare probes and batteries in office

Food Preparation Controls (SOP11):
- Eggs: British Lion mark, stored separately, fully cooked
- Dirty vegetables: wash in sanitised sink with colander
- White boards for vegetables/salads, Green for fruit
- All utensils through dishwasher
- Knives used for single ingredient then washed

Labelling Controls (SOP12):
- Day dot labels: MADE ON / OPENED ON date
- Prepared foods in fridge: max 3 days including day made
- Messy play items: 1 day maximum
- Never exceed manufacturer Use By dates
- No foods without labels accepted

Personal Hygiene Controls (SOP13):
- Clean uniform daily, washed at 60°C
- Disposable aprons for food prep/service
- No jewellery except plain band ring, stud earrings
- No nail varnish, false nails, excessive makeup
- 48 hours symptom-free after D&V
- Blue plasters from kitchen first aid box
- HOP10 Health Statement on starting
- HOP11 Return to Work Interview after illness

Allergen Management Controls (SOP14):
- Check Children's Information Board before every meal
- Red bowls/cups = allergies; Green = intolerances/preferences
- Allergen-free meals prepared first, separate equipment
- Clean apron between allergen/non-allergen prep
- Individual supervision for allergic children
- No food sharing between children
- HOP12 Allergen Identity Tables for all menus
- Protein residue swab testing validates cleaning

Choking Prevention Controls (SOP16):
- Cut grapes/cherry tomatoes lengthwise then halve
- Grate raw carrots or cook soft
- No whole nuts, popcorn, raw jelly cubes, hard sweets
- Staff present throughout mealtimes
- Children seated properly, no rushing
- Staff trained in paediatric choking response

Foreign Body Controls (SOP17):
- Minimise glass in kitchens, decant to plastic
- No wooden chopping boards
- No wire scourers - use plastic brushes/green pads
- Check eggs for shells, fruit for pips/stones
- Report issues on HOP6, investigate immediately

Chemical Controls (SOP19):
- Sanell Antibacterial Sanitiser EN 1276 in all settings
- 30 second contact time for bacteria
- Hand soap EN 1499, probe wipes EN 13727
- No bleach on food contact surfaces
- COSHH records filed with chemical index
- Never mix chemicals

Cleaning Controls (SOP20):
- Two-step cleaning: detergent then sanitiser
- Dishwasher minimum 60°C cycle
- Colour-coded mops/equipment by area
- J-cloths in kitchen thrown away daily
- Under 2s: single-use flannel per child, wash 60°C
- Tea towels washed daily at 60°C
- HOP14 Cleaning Schedule displayed

Waste Controls (SOP21):
- Lidded bins lined with disposable sacks
- Empty when full and end of day
- External bins away from windows, lids closed
- Clinical waste (nappies) in yellow-lidded bins
- Wash hands after handling any waste`,

  'fsms-monitoring': `FSMS Monitoring & Recording Control Measures:
Daily Records (HOP06 Daily Food Safety Diary):
- Record all delivery temperatures with time received
- Log fridge temperatures at start and end of day
- Document time of Polybox opening for each delivery
- Record any corrective actions taken (disposal, reheating, etc.)
- Note any incidents or near-misses

Pre-Service Checks:
- Children's Information Board verified in each room daily
- Day register cross-referenced with allergy records
- Menu checked against Allergen Identity Tables (HOP12)
- Staff briefed on any new allergies or dietary requirements

Documentation System:
- HOP01 Registration Form: captures initial allergy/medical info
- HOP02 Medical & Allergy Decision Tree: assessment pathway
- HOP04 Settling In Form: confirms medical conditions
- HOP05 Health Care Plan: detailed management plans
- HOP08 Staff Training Tracker: food hygiene certification records
- HOP12 Allergen Identity Tables: menu allergen cross-reference
- HOP13 Quarterly Management Review: FSMS effectiveness review
- HOP15 CCP Decision Tree: hazard analysis methodology

Review Schedule:
- Daily: temperature logs, allergy boards, incident recording
- Weekly: review of corrective actions, stock rotation
- Quarterly: management review (HOP13), trend analysis
- Annually: full FSMS review, external audit by SFBB Systems

Control Measures for Risk Assessment:
- Ensure staff trained in record-keeping procedures
- Calibrated thermometers available and in working order
- HOP06 diaries accessible in each food preparation area
- Corrective action procedures displayed near recording points
- Management review findings actioned within agreed timeframes`
}

function getFsmsGuidance(policiesSelected) {
  if (!policiesSelected || !Array.isArray(policiesSelected)) return ''

  // If 'fsms' is selected, include all FSMS guidance
  if (policiesSelected.includes('fsms')) {
    const allFsmsContent = Object.values(FSMS_GUIDANCE).join('\n\n')
    return `\n\nApply these Hopscotch FSMS control measures where relevant:\n${allFsmsContent}`
  }

  // Otherwise check for individual FSMS policy selections (legacy support)
  const fsmsContent = policiesSelected
    .filter(id => FSMS_GUIDANCE[id])
    .map(id => FSMS_GUIDANCE[id])
    .join('\n\n')

  return fsmsContent ? `\n\nApply these Hopscotch FSMS control measures where relevant:\n${fsmsContent}` : ''
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const {
      assessmentType,
      activityName,
      assessmentDate,
      assessorName,
      location,
      nursery,
      peopleAtRisk,
      hazards,
      policiesSelected,
      overview
    } = req.body

    if (!assessmentType || !activityName || !hazards || hazards.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Fetch similar assessments for context
    let existingAssessments = ''
    try {
      const { data: documents } = await supabase
        .from('documents')
        .select('content')
        .textSearch('content', assessmentType.replace(/[&]/g, ' '))
        .limit(5)

      if (documents && documents.length > 0) {
        existingAssessments = documents.map(d => d.content.substring(0, 1000)).join('\n---\n')
      }
    } catch (err) {
      console.log('Could not fetch existing assessments:', err.message)
    }

    const systemPrompt = `You are helping a nursery prepare a risk assessment document for one of the following categories: Equipment and Toys, Medicine & Health, Food & Kitchen, Staffing & Supervision, Trips, Building, Weather, Infection Control, Fire and Emergency, Security.

You will receive a JSON object with all the relevant information needed to create the risk assessment.

Please output JSON that fills in the following fields for a document:

- assessment_type: The type of risk assessment being created
- assessment_date: The calendar date (use the date provided)
- assessor_name: Full name of the person preparing the assessment
- unique_id: A short identifier in the format YYMMDD-INITIALS-HHMMSS
- activity_description: A brief phrase describing the activity or resource being assessed
- location: Specific site or setting where the activity takes place
- people_at_risk: Comma-separated list of groups who could be harmed
- review_date: One year from assessment_date, in YYYY-MM-DD format

Then for each hazard (up to 10), provide:
- hazard_N: Short name of the specific hazard
- pre_rating_N: Risk rating before controls (H = High, M = Medium, L = Low)
- control_measures_N: Detailed practical measures to mitigate the hazard (2-3 sentences)
- post_rating_N: Risk rating after existing controls (H, M, or L)
- additional_controls_N: Extra actions recommended to reduce risk further (or empty string)
- reassess_rating_N: Expected risk rating after additional controls (H, M, or L)

Finally provide:
- safe_system_of_work: A concise paragraph outlining routine safety procedures (3-4 sentences)

Important guidelines:
- Control measures should be detailed and specific to nursery settings
- Reference EYFS requirements and Ofsted expectations where relevant
- Consider the age group and developmental stage of children
- Include supervision requirements appropriate to the activity
- Ensure measures are practical and implementable
- Pre-ratings should generally be H or M, post-ratings M or L, reassess ratings should be L

You MUST return ONLY valid JSON with no additional text, explanations, or markdown code fences.`

    // Generate unique ID
    const date = new Date(assessmentDate || new Date())
    const initials = assessorName ? assessorName.split(' ').map(n => n[0]).join('').toUpperCase() : 'XX'
    const dateStr = date.toISOString().slice(2, 10).replace(/-/g, '')
    const timeStr = new Date().toTimeString().slice(0, 8).replace(/:/g, '')
    const uniqueId = `${dateStr}-${initials}-${timeStr}`

    // Calculate review date (1 year from assessment)
    const reviewDate = new Date(date)
    reviewDate.setFullYear(reviewDate.getFullYear() + 1)
    const reviewDateStr = reviewDate.toISOString().split('T')[0]

    const userPrompt = `Create a complete risk assessment with these details:

${JSON.stringify({
  assessment_type: assessmentType,
  activity_description: activityName,
  assessment_date: assessmentDate || new Date().toISOString().split('T')[0],
  assessor_name: assessorName || 'Not specified',
  unique_id: uniqueId,
  location: location || 'Hopscotch Nursery',
  nursery: nursery || 'Hopscotch Children\'s Nursery',
  people_at_risk: Array.isArray(peopleAtRisk) ? peopleAtRisk.join(', ') : peopleAtRisk || 'Children, Staff',
  review_date: reviewDateStr,
  hazards_to_assess: hazards,
  policies_referenced: policiesSelected || [],
  activity_overview: overview || ''
}, null, 2)}

${existingAssessments ? `
Reference these similar assessments for guidance on control measures and formatting:
${existingAssessments}
` : ''}
${getFsmsGuidance(policiesSelected)}

Generate the complete risk assessment JSON with all hazard details filled in.`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    })

    const responseText = message.content[0].text

    // Parse JSON response
    let assessment
    try {
      // Clean any markdown code fences if present
      const cleaned = responseText.replace(/```json\s*|\s*```/g, '').trim()
      assessment = JSON.parse(cleaned)
    } catch (parseErr) {
      console.error('Failed to parse assessment response:', parseErr)
      console.error('Raw response:', responseText.substring(0, 500))
      return res.status(500).json({ error: 'Failed to parse AI response' })
    }

    // Ensure all hazard fields exist (fill empty ones for hazards 1-10)
    for (let i = 1; i <= 10; i++) {
      if (!assessment[`hazard_${i}`]) {
        assessment[`hazard_${i}`] = ''
        assessment[`pre_rating_${i}`] = ''
        assessment[`control_measures_${i}`] = ''
        assessment[`post_rating_${i}`] = ''
        assessment[`additional_controls_${i}`] = ''
        assessment[`reassess_rating_${i}`] = ''
      }
    }

    return res.status(200).json(assessment)
  } catch (error) {
    console.error('Generate assessment error:', error)
    return res.status(500).json({ error: 'Failed to generate assessment' })
  }
}
