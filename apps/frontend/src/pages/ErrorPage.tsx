import { useNavigate } from 'react-router-dom'

interface Props {
  code?: number
  title?: string
  message?: string
}

export default function ErrorPage({
  code = 500,
  title = 'שגיאת שרת',
  message = 'אירעה שגיאה פנימית. אנא נסה שוב מאוחר יותר.',
}: Props) {
  const navigate = useNavigate()

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 text-center"
      dir="rtl"
    >
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-10 space-y-5">
        <div className="text-7xl font-black text-red-500">{code}</div>
        <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
        <p className="text-gray-500">{message}</p>
        <div className="flex flex-col gap-2 pt-2">
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
          >
            נסה שוב
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full border border-gray-300 hover:bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium transition-colors"
          >
            דף הבית
          </button>
        </div>
      </div>
    </div>
  )
}
