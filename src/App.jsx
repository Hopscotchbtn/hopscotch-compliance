import { Routes, Route } from 'react-router-dom'
import { Home } from './pages/Home'
import { CheckSetup } from './pages/CheckSetup'
import { Checklist } from './pages/Checklist'
import { Confirmation } from './pages/Confirmation'
import { Summary } from './pages/Summary'
import { RoomProgress } from './pages/RoomProgress'
import { SwipeChecklist } from './pages/SwipeChecklist'
import { History } from './pages/History'
import { RequestRecords } from './pages/RequestRecords'
import { PasswordGate } from './components/PasswordGate'
// IncidentIQ pages
import { IncidentDashboard } from './pages/incidents/IncidentDashboard'
import { IncidentTypeSelect } from './pages/incidents/IncidentTypeSelect'
import { IncidentForm } from './pages/incidents/IncidentForm'
import { IncidentConfirmation } from './pages/incidents/IncidentConfirmation'
import { IncidentList } from './pages/incidents/IncidentList'

function App() {
  return (
    <PasswordGate>
      <div className="font-body">
        <Routes>
          {/* Daily Checks - New swipe flow for opening checks */}
          <Route path="/" element={<Home />} />
          <Route path="/check/roomOpening" element={<RoomProgress />} />
          <Route path="/check/roomOpening/room/:roomName" element={<SwipeChecklist />} />

          {/* Daily Checks - Legacy flow for other check types */}
          <Route path="/check/:checkTypeId" element={<CheckSetup />} />
          <Route path="/check/:checkTypeId/checklist" element={<Checklist />} />
          <Route path="/check/:checkTypeId/confirmation" element={<Confirmation />} />
          <Route path="/summary" element={<Summary />} />
          <Route path="/history" element={<History />} />
          <Route path="/history/request" element={<RequestRecords />} />

          {/* IncidentIQ */}
          <Route path="/incidents" element={<IncidentDashboard />} />
          <Route path="/incidents/new" element={<IncidentTypeSelect />} />
          <Route path="/incidents/new/:typeId/details" element={<IncidentForm />} />
          <Route path="/incidents/confirmation" element={<IncidentConfirmation />} />
          <Route path="/incidents/list" element={<IncidentList />} />
        </Routes>
      </div>
    </PasswordGate>
  )
}

export default App
