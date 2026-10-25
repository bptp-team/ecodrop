function PointHours({ hours }) {
  if (typeof hours !== 'string' || !hours.trim()) {
    return null
  }

  return (
    <p>
      <strong>Horário:</strong> {hours}
    </p>
  )
}

export default PointHours
