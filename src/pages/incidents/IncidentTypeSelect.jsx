import { useNavigate } from 'react-router-dom'
import { Header } from '../../components/Header'
import { Card } from '../../components/ui/Card'
import { incidentTypes } from '../../data/incident/incidentTypes'

export function IncidentTypeSelect() {
  const navigate = useNavigate()

  const handleSelect = (typeId) => {
    navigate(`/incidents/new/${typeId}/details`)
  }

  const typeList = Object.values(incidentTypes)

  return (
    <div className="min-h-screen bg-hop-pebble">
      <Header title="New Incident" subtitle="What type of incident?" showBack />

      <div className="px-4 py-6 max-w-lg mx-auto">
        <p className="text-gray-600 mb-6 text-center">
          Select the type of incident you are recording
        </p>

        <div className="space-y-3">
          {typeList.map((type) => (
            <button
              key={type.id}
              onClick={() => handleSelect(type.id)}
              className="w-full text-left"
            >
              <Card className={`border-l-4 hover:shadow-md transition-shadow`} style={{ borderLeftColor: type.color === 'hop-marmalade' ? '#fd884a' : type.color === 'hop-freshair' ? '#b1c8f6' : type.color === 'hop-marmalade-dark' ? '#fa541f' : '#fbee57' }}>
                <h3 className="font-semibold text-hop-forest text-lg">{type.name}</h3>
                <p className="text-gray-500 text-sm mt-1">{type.description}</p>
              </Card>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
