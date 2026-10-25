function PointMaterials({ materials }) {
  if (!Array.isArray(materials) || materials.length === 0) {
    return null
  }

  return (
    <>
      <p>
        <strong>Recebe:</strong>
      </p>
      <ul>
        {materials.map((material, index) => (
          <li key={`${material}-${index}`}>{material}</li>
        ))}
      </ul>
    </>
  )
}

export default PointMaterials
