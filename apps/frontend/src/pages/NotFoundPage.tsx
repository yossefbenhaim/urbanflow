import { useNavigate } from 'react-router-dom'

export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 text-center"
      dir="rtl"
    >
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-10 space-y-5">
        <div className="text-7xl font-black text-blue-600">404</div>
        <h1 className="text-2xl font-bold text-gray-800">הדף לא נמצא</h1>
        <p className="text-gray-500">
          הדף שחיפשת לא קיים או שה-URL שגוי.
        </p>
        <div className="flex flex-col gap-2 pt-2">
          <button
            onClick={() => navigate(-1)}
            className="w-full border border-gray-300 hover:bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium transition-colors"
          >
            חזור אחורה
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
          >
            דף הבית
          </button>
        </div>
      </div>
    </div>
  )
}
