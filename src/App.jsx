import { Routes, Route } from 'react-router-dom'
import { Home } from './pages/Home'
import { Summary } from './pages/Summary'
import { RoomProgress } from './pages/RoomProgress'
import { SwipeChecklist } from './pages/SwipeChecklist'
import { History } from './pages/History'
import { RequestRecords } from './pages/RequestRecords'
import { PasswordGate } from './components/PasswordGate'
// Kitchen Food Safety pages
import { KitchenSafety } from './pages/KitchenSafety'
import { KitchenSection } from './pages/KitchenSection'
// IncidentIQ pages
import { IncidentDashboard } from './pages/incidents/IncidentDashboard'
import { IncidentTypeSelect } from './pages/incidents/IncidentTypeSelect'
import { IncidentForm } from './pages/incidents/IncidentForm'
import { IncidentConfirmation } from './pages/incidents/IncidentConfirmation'
import { IncidentList } from './pages/incidents/IncidentList'
import { IncidentDetail } from './pages/incidents/IncidentDetail'
// Risk Assessment pages
import { RiskAssessmentDashboard } from './pages/riskAssessment/RiskAssessmentDashboard'
import { RiskAssessmentWizard } from './pages/riskAssessment/RiskAssessmentWizard'
import { RiskValidationScreen } from './pages/riskAssessment/RiskValidationScreen'
import { RiskConfirmation } from './pages/riskAssessment/RiskConfirmation'

function App() {
  return (
    <PasswordGate>
      <div className="font-body">
        <Routes>
          {/* Daily Checks - New swipe flow for all check types */}
          <Route path="/" element={<Home />} />
          <Route path="/check/:checkTypeId" element={<RoomProgress />} />
          <Route path="/check/:checkTypeId/room/:roomName" element={<SwipeChecklist />} />
          <Route path="/summary" element={<Summary />} />
          <Route path="/history" element={<History />} />
          <Route path="/history/request" element={<RequestRecords />} />

          {/* Kitchen Food Safety */}
          <Route path="/kitchen-safety" element={<KitchenSafety />} />
          <Route path="/kitchen-safety/:sectionId" element={<KitchenSection />} />

          {/* IncidentIQ */}
          <Route path="/incidents" element={<IncidentDashboard />} />
          <Route path="/incidents/new" element={<IncidentTypeSelect />} />
          <Route path="/incidents/new/:typeId/details" element={<IncidentForm />} />
          <Route path="/incidents/confirmation" element={<IncidentConfirmation />} />
          <Route path="/incidents/list" element={<IncidentList />} />
          <Route path="/incidents/:id" element={<IncidentDetail />} />

          {/* Risk Assessment */}
          <Route path="/risk-assessment" element={<RiskAssessmentDashboard />} />
          <Route path="/risk-assessment/new" element={<RiskAssessmentWizard />} />
          <Route path="/risk-assessment/review" element={<RiskValidationScreen />} />
          <Route path="/risk-assessment/confirmation" element={<RiskConfirmation />} />
        </Routes>
      </div>
    </PasswordGate>
  )
}

export default App
