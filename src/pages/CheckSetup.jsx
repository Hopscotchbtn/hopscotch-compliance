import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Header } from '../components/Header'
import { Card } from '../components/ui/Card'
import { Select } from '../components/ui/Select'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { checkTypes } from '../data/checklists'
import { nurseries } from '../data/nurseries'
import { rooms } from '../data/rooms'
import { storage } from '../lib/storage'
import { formatDate, formatTime } from '../lib/utils'

export function CheckSetup() {
  const { checkTypeId } = useParams()
  const navigate = useNavigate()
  const checkType = checkTypes[checkTypeId]

  const [nursery, setNursery] = useState(() => storage.getLastNursery())
  const [room, setRoom] = useState(checkType?.autoRoom || '')
  const [name, setName] = useState(() => storage.getUserName())

  useEffect(() => {
    if (checkType?.autoRoom) {
      setRoom(checkType.autoRoom)
    }
  }, [checkType])

  if (!checkType) {
    navigate('/')
    return null
  }

  const isValid = nursery && room && name.trim()
  const isRoomDisabled = !!checkType.autoRoom

  const handleStartCheck = () => {
    storage.setUserName(name.trim())
    storage.setLastNursery(nursery)

    navigate(`/check/${checkTypeId}/checklist`, {
      state: {
        nursery,
        room,
        completedBy: name.trim(),
        checkType: checkTypeId,
      },
    })
  }

  return (
    <div className="min-h-screen bg-hop-pebble">
      <Header title={checkType.name} showBack />

      <div className="px-4 py-6 max-w-md mx-auto">
        {/* Date and time */}
        <div className="text-center mb-6">
          <p className="text-hop-forest font-medium">{formatDate()}</p>
          <p className="text-gray-500">{formatTime()}</p>
        </div>

        <Card className="space-y-5">
          <Select
            label="Select nursery"
            value={nursery}
            onChange={setNursery}
            options={nurseries}
            placeholder="Choose a nursery"
            required
          />

          <Select
            label="Select room"
            value={room}
            onChange={setRoom}
            options={rooms}
            placeholder="Choose a room"
            required
            disabled={isRoomDisabled}
          />

          <Input
            label="Your name"
            value={name}
            onChange={setName}
            placeholder="Enter your name"
            required
          />

          <div className="pt-2">
            <Button
              color="forest"
              size="large"
              fullWidth
              disabled={!isValid}
              onClick={handleStartCheck}
            >
              Start Check
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
