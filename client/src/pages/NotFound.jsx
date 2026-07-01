import { useNavigate } from "react-router-dom"
  import "../styles/NotFound.css"

  const NotFound = () => {
    const navigate = useNavigate()

    return (
      <div className="not-found-container">
        <h1 className="not-found-code">404</h1>
        <h2 className="not-found-title">Page Not Found</h2>
        <p className="not-found-message">
          The page you're looking for doesn't exist or has been secured.
        </p>
        <button
          className="not-found-button"
          onClick={() => navigate('/')}
        >
          Go Home
        </button>
      </div>
    )
  }

  export default NotFound