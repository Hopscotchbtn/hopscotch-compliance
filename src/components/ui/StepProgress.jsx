export function StepProgress({ currentStep, totalSteps, stepName }) {
  const percentage = (currentStep / totalSteps) * 100

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-hop-forest">
          Step {currentStep} of {totalSteps}: {stepName}
        </span>
        <span className="text-sm text-gray-500">{Math.round(percentage)}%</span>
      </div>
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-hop-forest rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
