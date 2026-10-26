function SearchMessage({ title, children }) {
  return (
    <section className="search-message" role="status">
      {title && <h2>{title}</h2>}
      <p>{children}</p>
    </section>
  )
}

export default SearchMessage
