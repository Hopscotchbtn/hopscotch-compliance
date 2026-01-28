// Risk Assessment Types for Hopscotch Nurseries

export const assessmentTypes = [
  {
    id: 'equipment-toys',
    name: 'Equipment and Toys',
    description: 'Assessment of play equipment, toys, and resources used by children',
    icon: 'Blocks'
  },
  {
    id: 'medicine-health',
    name: 'Medicine & Health',
    description: 'Administration of medication, allergies, and health-related procedures',
    icon: 'Heart'
  },
  {
    id: 'food-kitchen',
    name: 'Food & Kitchen',
    description: 'Food preparation, serving, allergies, and kitchen safety',
    icon: 'UtensilsCrossed'
  },
  {
    id: 'staffing-supervision',
    name: 'Staffing & Supervision',
    description: 'Staff ratios, deployment, and supervision arrangements',
    icon: 'Users'
  },
  {
    id: 'trips',
    name: 'Trips',
    description: 'Outings, excursions, and off-site activities',
    icon: 'Bus'
  },
  {
    id: 'building',
    name: 'Building',
    description: 'Premises, facilities, and indoor environment safety',
    icon: 'Building2'
  },
  {
    id: 'weather',
    name: 'Weather',
    description: 'Outdoor activities in various weather conditions',
    icon: 'CloudSun'
  },
  {
    id: 'infection-control',
    name: 'Infection Control',
    description: 'Illness prevention, hygiene, and outbreak management',
    icon: 'ShieldCheck'
  },
  {
    id: 'fire-emergency',
    name: 'Fire and Emergency',
    description: 'Fire safety, evacuation, and emergency procedures',
    icon: 'Flame'
  },
  {
    id: 'security',
    name: 'Security',
    description: 'Site security, access control, and safeguarding',
    icon: 'Lock'
  }
];

export const peopleAtRiskOptions = [
  { id: 'children-0-2', label: 'Children (Under 2s)' },
  { id: 'children-2-3', label: 'Children (2-3 years)' },
  { id: 'children-3-5', label: 'Children (3-5 years)' },
  { id: 'staff', label: 'Staff' },
  { id: 'visitors', label: 'Visitors' },
  { id: 'parents', label: 'Parents/Carers' },
  { id: 'contractors', label: 'Contractors' }
];

export const policyOptions = [
  { id: 'safeguarding', label: 'Safeguarding Policy' },
  { id: 'health-and-safety', label: 'Health & Safety Policy' },
  { id: 'caring-for-children', label: 'Caring for Children Policy' },
  { id: 'employee-guide', label: 'Employee Guide' }
];

export const riskRatings = [
  { value: 'H', label: 'High', color: 'red' },
  { value: 'M', label: 'Medium', color: 'amber' },
  { value: 'L', label: 'Low', color: 'green' }
];

export default assessmentTypes;
