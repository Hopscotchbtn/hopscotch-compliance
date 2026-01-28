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
  'fsms-haccp': `FSMS HACCP Guidance (Hopscotch):
- Four hazard types: Microbial (bacteria/viruses), Chemical (cleaning materials), Physical (foreign bodies from 4 P's: premises, people, pests, products), Allergenic (14 main allergens)
- Seven Critical Control Points (CCPs):
  CCP1: Receiving cold food - must be ≤8°C (Little Tums, packed lunches, shopping)
  CCP2: Receiving hot food - must be ≥63°C (Little Tums hot meals)
  CCP3: Opening/distributing cold food - serve within 2 hours of delivery
  CCP4: Opening/distributing hot food - serve within 2 hours of delivery
  CCP5: Reheating food - must reach ≥75°C core temperature
  CCP6: Bottle washing & sterilising - steam at 121-132°C (Tommee Tippee equipment)
  CCP7: Food service for allergies - check Children's Information Board before serving
- Danger Zone: 5°C to 63°C - bacteria multiply rapidly, max 4 hours cumulative
- Five food operations: Specialist meals (Little Tums UK/AR009), Packed lunches (parents), Cold snacks (Hopscotch prepared), Formula/breast milk, Food activities/messy play
- No raw meat, fish or seafood on premises
- Cross-contamination prevention: separate equipment, handwashing, clean surfaces
- Record all checks on HOP06 Daily Food Safety Diary`,

  'fsms-allergens': `FSMS Allergen Management (Hopscotch) - CCP7:
- 14 declarable allergens: Celery, Cereals (gluten), Crustaceans, Eggs, Fish, Lupin, Milk, Molluscs, Mustard, Nuts, Peanuts, Sesame, Soya, Sulphur dioxide
- CRITICAL: Check Children's Information Board in each room BEFORE any meal/snack/food activity
- If information unclear, access child's HOP05 Health Care Plan before serving
- Children's allergy info established at registration (HOP02 Medical & Allergy Decision Tree, HOP04 Settling In Form)
- Check Allergen Identity Tables (HOP12) against food from Little Tums and Hopscotch kitchen
- Cross-contamination controls: separate preparation areas, dedicated equipment, clear labelling
- If food served in error: withdraw immediately, do not move child, monitor closely with dedicated staff member
- Staff must be trained in allergen awareness and emergency medication protocols`,

  'fsms-temperature': `FSMS Temperature Control (Hopscotch) - CCPs 1-5:
- CCP1 Cold food receiving: ≤8°C critical limit (probe check every delivery from Little Tums)
  - If >8°C and packed <2 hours: serve immediately or refrigerate
  - If >8°C and packed >2 hours: reject/dispose
- CCP2 Hot food receiving: ≥63°C critical limit (Little Tums hot meals)
  - If <63°C and packed <2 hours: serve immediately or reheat
  - If <63°C and packed >2 hours: reject/dispose
- CCP3/4 Distribution: serve within 2 hours of delivery (food held in Polyboxes)
  - If >2 hours: recheck temp, only serve if still within limits
- CCP5 Reheating (packed lunch items): ≥75°C core temperature
  - Use microwave, cover food, stir/turn during heating
  - If not achieved: reheat longer until correct temp reached
- Fridge storage: 0-5°C, check and record daily
- Use calibrated probe thermometers, record on HOP06 Daily Food Safety Diary`,

  'fsms-choking': `FSMS Choking Hazards (Hopscotch):
- Children's windpipe is approximately diameter of a drinking straw
- High-risk foods: hard sweets (leading cause), whole grapes, cherry tomatoes, raw carrots, nuts, popcorn, chunks of meat/cheese, whole sausages/hot dogs, bones, seeds, hard crisps
- Formula milk and breast milk are also choking hazards for babies/infants
- Controls: cut food age-appropriately (grapes lengthwise), supervise all eating, appropriate portion sizes
- Staff must be trained in paediatric choking first aid response
- Certain foods restricted or banned in packed lunches - guidance provided to parents
- Food activities and messy play must assess choking risks before proceeding
- Refer to Section 4.16 Food Related Choking Hazards in FSMS`,

  'fsms-sops': `FSMS Pre-Requisite SOPs (Hopscotch) - Key Hazards to Consider:
Food Types at Hopscotch (SOP1):
- Snacks prepared in-house (fruit, vegetables, cheese, cereals, bread products)
- External meals from Little Tums (hot lunches, hot/cold teas)
- Packed lunches/snack boxes from parents
- Formula milk (Aptamil) and breast milk
- Food for activities and messy play (smoothies, baking, playdough, gloop)

Children's Information (SOP2):
- Food allergies, intolerances, dietary preferences must be established via HOP forms
- Children's Information Board in each room shows allergies (RED pen), medical (BLUE), dietary (GREEN)
- Daily team briefings include allergen reminders
- Information reviewed annually minimum

Supplier Controls (SOP3):
- Supermarkets must have Food Hygiene Rating 4 or 5
- Little Tums holds approval UK/AR009
- HOP7 Suppliers List maintained

Training Requirements (SOP4):
- All food handlers: Level 2 Food Hygiene within 1 month
- Managers: Level 3 Food Hygiene within 1 month
- All staff: FSA Food Allergy & Intolerance training
- Refresher training every 3 years
- HOP15 Staff Induction Checklist, HOP8 Training Tracker

Premises & Equipment (SOP5):
- Kitchens designed for minimal cross-contamination
- Dedicated Hopscotch Maintenance Person visits weekly
- Equipment repairs on call-out basis
- Annual: boiler service, PAT testing, fire extinguishers
- HOP6 Daily Food Safety Diary for issues

Pest Control (SOP6):
- Daily checks for signs of pests
- Council Pest Control Services on call-out
- Insect killer units maintained
- No pest control chemicals stored on site

Food Complaints (SOP7):
- HOP9 Food Complaint Form for all incidents
- Foreign bodies: photograph, report to Little Tums, retain evidence
- Investigation within 48 hours

Separation Controls (SOP11):
- No raw meat, fish or seafood on premises
- Eggs stored separately, British Lion mark required
- Dirty vegetables treated as contaminated, washed in sanitised sinks
- White boards: vegetables/salads; Green boards: fruit
- Separate equipment for allergen-free meal prep

Labelling & Shelf Life (SOP12):
- Day dot labels for opened/prepared foods
- Prepared foods: max 3 days Use By
- Messy play items: 1 day Use By
- Manufacturer Use By dates strictly observed

Personal Hygiene (SOP13):
- Red shirts, black trousers (under 2s: black tunic)
- Disposable aprons for food handling
- No nail varnish, false nails, excessive makeup
- 48 hours symptom-free after D&V before return
- Blue plasters for cuts when handling food
- HOP10 Health Statement, HOP11 Return to Work Form

Allergen Controls (SOP14):
- 14 declarable allergens
- Red bowls/cups for allergies, Green for intolerances/preferences
- HOP12 Allergen Identity Tables for all menus
- Children with allergies get individual meal supervision
- Allergen-free meals prepared first

Choking Prevention (SOP16):
- Cut grapes/cherry tomatoes lengthwise then halve
- No whole nuts for under 5s
- No raw jelly cubes, hard sweets, popcorn
- Supervise all eating
- Staff trained in paediatric choking first aid

Foreign Body Controls (SOP17):
- No glass utensils where possible
- No wooden chopping boards
- No wire scourers
- Check eggs for shells, fruit for stones/pips

Chemicals (SOP19):
- Sanell Antibacterial Sanitiser (EN 1276) - 30 second contact time
- Hand soap must be EN 1499
- Probe wipes must be EN 13727
- COSHH records maintained
- No bleach on food contact surfaces

Cleaning (SOP20):
- Two-step cleaning: clean then disinfect
- Dishwasher at 60°C minimum
- Colour-coded equipment by area
- Single-use flannels for under 2s face wiping
- HOP14 Cleaning Schedule

Waste (SOP21):
- Lidded bins in all areas
- Clinical waste (nappies) in yellow-lidded bins
- Weekly trade waste collection`,

  'fsms-monitoring': `FSMS Monitoring & Recording (Hopscotch):
Documentation Forms (HOP series):
- HOP01: Registration Form - initial allergy/medical info collection
- HOP02: Medical & Allergy Decision Tree - assessment pathway
- HOP04: Settling In Form - confirms medical conditions
- HOP05: Health Care Plan - detailed management for specific conditions
- HOP06: Daily Food Safety Diary - temperature/time records, incidents
- HOP08: Staff Training Tracker - food hygiene certification
- HOP12: Allergen Identity Tables - menu allergen reference
- HOP13: Quarterly Management Review - FSMS effectiveness review
- HOP15: CCP Decision Tree - hazard analysis methodology

Daily Monitoring:
- Temperature checks recorded on HOP06 for every delivery
- Fridge temperatures checked and logged daily
- Time of Polybox opening recorded
- Any corrective actions documented immediately
- Children's Information Board checked each room, each day

Periodic Reviews:
- Quarterly management review using HOP13
- Annual FSMS review and update
- Staff training records maintained on HOP08
- External audit by SFBB Systems annually

Record Retention:
- Daily records kept minimum 12 months
- Incident records kept minimum 3 years
- Training records kept for duration of employment + 3 years`
}

function getFsmsGuidance(policiesSelected) {
  if (!policiesSelected || !Array.isArray(policiesSelected)) return ''

  // If 'fsms' is selected, include all FSMS guidance
  if (policiesSelected.includes('fsms')) {
    const allFsmsContent = Object.values(FSMS_GUIDANCE).join('\n\n')
    return `\n\nHopscotch FSMS Policy Requirements:\n${allFsmsContent}`
  }

  // Otherwise check for individual FSMS policy selections (legacy support)
  const fsmsContent = policiesSelected
    .filter(id => FSMS_GUIDANCE[id])
    .map(id => FSMS_GUIDANCE[id])
    .join('\n\n')

  return fsmsContent ? `\n\nHopscotch FSMS Policy Requirements:\n${fsmsContent}` : ''
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { assessmentType, activityName, location, nursery, peopleAtRisk, overview, policiesSelected } = req.body

    if (!assessmentType || !activityName) {
      return res.status(400).json({ error: 'Missing required fields: assessmentType and activityName' })
    }

    // Fetch similar assessments from vector database for context
    let existingAssessments = ''
    try {
      const { data: documents } = await supabase
        .from('documents')
        .select('content')
        .textSearch('content', assessmentType.replace(/[&]/g, ' '))
        .limit(3)

      if (documents && documents.length > 0) {
        existingAssessments = documents.map(d => d.content.substring(0, 500)).join('\n---\n')
      }
    } catch (err) {
      console.log('Could not fetch existing assessments:', err.message)
    }

    const systemPrompt = `You are a specialist in UK early years risk assessment.

Task: Generate a comprehensive list of potential hazards and risks that will form part of a risk assessment.

Context: The setting is a children's nursery in the UK. Hazards should reflect real risks in this environment, including:

- Health & medical risks (medication, allergies, food preparation, infections, special conditions)
- Procedural risks (record-keeping, staff training, handovers, parental communication)
- Environmental risks (nursery facilities, equipment, food handling, play areas, outings)
- Human factors (staff error, distraction, turnover, child behaviour, peer interactions)
- Safeguarding & legal risks (data protection, consent, Ofsted compliance, liability)
- Emergency/contingency risks (access to emergency medication, ambulance delays, contact failures)

Guidelines:
- Identify 5-7 specific, actionable hazards relevant to the activity
- Consider the assessment type, location, and age group (0-5 years)
- Focus on realistic risks in early years childcare settings
- Each hazard should be a clear, concise statement (one sentence)
- Prioritize hazards from most to least critical

You MUST return ONLY valid JSON in this EXACT structure with no additional text, explanations, or markdown:

{
  "suggested_hazards": [
    "Hazard description 1",
    "Hazard description 2",
    "Hazard description 3",
    "Hazard description 4",
    "Hazard description 5"
  ]
}`

    // Get FSMS guidance if relevant policies selected
    const fsmsGuidance = getFsmsGuidance(policiesSelected)

    const userPrompt = `Generate hazards for this risk assessment:

Assessment Type: ${assessmentType}
Activity Name: ${activityName}
Location: ${location || 'Hopscotch Nursery'}
Nursery: ${nursery || 'Hopscotch Children\'s Nursery'}
People at Risk: ${Array.isArray(peopleAtRisk) ? peopleAtRisk.join(', ') : peopleAtRisk || 'Children, Staff'}
Activity Overview: ${overview || 'General nursery activity'}
Policies to Reference: ${Array.isArray(policiesSelected) ? policiesSelected.join(', ') : policiesSelected || 'Health and Safety'}
${fsmsGuidance}
${existingAssessments ? `
Reference these similar assessments for context:
${existingAssessments}
` : ''}`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
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
    let hazards
    try {
      // Clean any markdown code fences if present
      const cleaned = responseText.replace(/```json\s*|\s*```/g, '').trim()
      hazards = JSON.parse(cleaned)
    } catch (parseErr) {
      console.error('Failed to parse hazards response:', parseErr)
      // Return empty array if parsing fails
      hazards = { suggested_hazards: [] }
    }

    return res.status(200).json(hazards)
  } catch (error) {
    console.error('Brainstorm hazards error:', error)
    return res.status(500).json({ error: 'Failed to generate hazards' })
  }
}
