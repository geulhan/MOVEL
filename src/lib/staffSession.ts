const TRAINER_KEY = 'mobel_trainer_id'
const TRAINER_NAME_KEY = 'mobel_trainer_name'

export type TrainerSession = {
  trainerId: string
  trainerName: string
}

export function saveTrainerSession(trainerId: string, trainerName: string): void {
  sessionStorage.setItem(TRAINER_KEY, trainerId)
  sessionStorage.setItem(TRAINER_NAME_KEY, trainerName)
}

export function getTrainerSession(): TrainerSession | null {
  const trainerId = sessionStorage.getItem(TRAINER_KEY)
  const trainerName = sessionStorage.getItem(TRAINER_NAME_KEY)
  if (!trainerId || !trainerName) return null
  return { trainerId, trainerName }
}

export function clearTrainerSession(): void {
  sessionStorage.removeItem(TRAINER_KEY)
  sessionStorage.removeItem(TRAINER_NAME_KEY)
}
