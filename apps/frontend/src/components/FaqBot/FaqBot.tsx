import { useState, useRef, useEffect, useCallback } from 'react'
import { trpc } from '../../lib/trpc'
import styles from './FaqBot.module.css'

interface Question {
  id: string
  q: string
  a: string
}

interface Topic {
  id: string
  topic: string
  icon: string
  questions: Question[]
}

interface ChatMessage {
  role: 'user' | 'bot'
  text: string
  timestamp: Date
}

const FAQ_DATA: Topic[] = [
  {
    id: 'committee',
    topic: 'מדריך ועד הבניין',
    icon: '🏛️',
    questions: [
      { id: 'c1', q: 'מה תפקיד נציג הועד?', a: 'נציג הועד הוא הגורם המרכזי שמייצג את כל דיירי הבניין מול היזם, עורך הדין והרשויות. תפקידו: לאסוף חתימות, לנהל סקרים, לתאם ישיבות ולוודא שזכויות כל הדיירים מוגנות לאורך כל התהליך.' },
      { id: 'c2', q: 'שלב 1 — איך מתחילים?', a: '🏁 השלב הראשון הוא ארגון הדיירים וקבלת ייצוג. שתף את כל הדיירים בקבוצת הבניין, הצג את עצמך כנציג ועד, וקבל הסכמה ב-60% מהדיירים לפחות.' },
      { id: 'c3', q: 'שלב 2 — בחירת עורך דין', a: '⚖️ לאחר ארגון הדיירים, חיוני לבחור עורך דין שמייצג את הדיירים (לא את היזם). עורך הדין יגן על זכויותיכם ויבדוק את ההסכמות.' },
    ]
  },
  {
    id: '1', topic: 'יסודות', icon: '🏗️',
    questions: [
      { id: '1a', q: 'מה זה פינוי בינוי?', a: 'פינוי בינוי הוא תהליך של הריסת בניין ישן ובניית בניין חדש במקומו. הדיירים מפנים את דירותיהם באופן זמני ומקבלים דירות חדשות וגדולות יותר.' },
      { id: '1b', q: 'מה ההבדל בין מסלול מיסוי למסלול רשויות?', a: 'במסלול מיסוי — יזם פרטי מקדם. במסלול רשויות — המדינה מכריזה על אזור ומקדמת בצורה מרוכזת.' },
      { id: '1c', q: 'כמה זמן לוקח?', a: 'בדרך כלל 7–15 שנים מתחילת התהליך ועד קבלת המפתח.' },
    ]
  },
  {
    id: '2', topic: 'התהליך', icon: '📋',
    questions: [
      { id: '2a', q: 'מאיפה מתחילים?', a: 'ארגון דיירים → בחירת עו"ד → איסוף חתימות (66%+) → מכרז יזמים → בחירת יזם → חתימת חוזה → הגשת תוכניות → היתר → פינוי → מסירה.' },
      { id: '2b', q: 'כמה הסכמה צריך?', a: 'נדרש רוב של 66% מבעלי הדירות. לרוב מנסים להגיע ל-80-100%.' },
    ]
  },
  {
    id: '3', topic: 'מה מקבלים', icon: '💰',
    questions: [
      { id: '3a', q: 'מה מקבל הדייר?', a: 'דירה חדשה גדולה יותר (12-25% יותר), מרפסת, חניה, ממ"ד, מחסן, דיור חלופי בזמן הבנייה, וכיסוי כל ההוצאות — ללא תשלום.' },
      { id: '3b', q: 'כמה גדולה תהיה הדירה?', a: 'בממוצע 12-25% יותר. דירת 70 מ"ר הופכת ל-85-90 מ"ר בערך.' },
    ]
  },
  {
    id: '4', topic: 'זכויות', icon: '⚖️',
    questions: [
      { id: '4a', q: 'מה הזכויות שלי?', a: 'ייצוג משפטי, מידע שקוף, הצבעה, ביטול בתקופת צינון, ערבויות בנקאיות, דיור חלופי, פיצוי על עיכובים.' },
      { id: '4b', q: 'מה זה דייר סרבן?', a: 'דייר שמסרב לחתום אחרי ש-66%+ הסכימו. ניתן בנסיבות מסוימות לפנות לבית המשפט.' },
    ]
  },
]

type ViewMode = 'topics' | 'questions' | 'answer' | 'chat' | 'notFound'

export default function FaqBot() {
  const [isOpen, setIsOpen] = useState(false)
  const [showTooltip, setShowTooltip] = useState(true)
  const [mode, setMode] = useState<ViewMode>('topics')
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null)
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [email, setEmail] = useState('')
  const messagesRef = useRef<HTMLDivElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)

  const askAI = trpc.faq.askAI.useMutation()

  useEffect(() => {
    const handler = () => { setIsOpen(true); setShowTooltip(false) }
    const committeeHandler = () => {
      setIsOpen(true)
      setShowTooltip(false)
      const t = FAQ_DATA.find(t => t.id === 'committee') || null
      setSelectedTopic(t)
      setMode('questions')
    }
    window.addEventListener('open-faqbot', handler)
    window.addEventListener('open-faqbot-committee', committeeHandler)
    return () => {
      window.removeEventListener('open-faqbot', handler)
      window.removeEventListener('open-faqbot-committee', committeeHandler)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setShowTooltip(false), 3000)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight
    }
  }, [mode, selectedTopic, selectedQuestion, chatMessages])

  const goToTopics = () => {
    setMode('topics')
    setSelectedTopic(null)
    setSelectedQuestion(null)
    setSubmitted(false)
  }

  const goToQuestions = (topic: Topic) => {
    setSelectedTopic(topic)
    setMode('questions')
  }

  const goToAnswer = (question: Question) => {
    setSelectedQuestion(question)
    setMode('answer')
  }

  const handleFreeTextSearch = (text: string) => {
    const lower = text.toLowerCase()
    for (const topic of FAQ_DATA) {
      for (const q of topic.questions) {
        if (q.q.toLowerCase().includes(lower) || q.a.toLowerCase().includes(lower)) {
          setSelectedQuestion(q)
          setSelectedTopic(topic)
          setMode('answer')
          return
        }
      }
    }
    // No FAQ match — switch to AI chat mode
    setMode('chat')
    handleAIChat(text)
  }

  const handleAIChat = useCallback(async (question: string) => {
    setChatMessages(prev => [...prev, { role: 'user', text: question, timestamp: new Date() }])
    setIsAiLoading(true)
    try {
      const result = await askAI.mutateAsync({ question })
      setChatMessages(prev => [...prev, {
        role: 'bot',
        text: result.answer,
        timestamp: new Date(),
      }])
    } catch {
      setChatMessages(prev => [...prev, {
        role: 'bot',
        text: 'מצטער, אירעה שגיאה. נסה שוב.',
        timestamp: new Date(),
      }])
    }
    setIsAiLoading(false)
  }, [askAI])

  const handleSend = () => {
    const text = inputText.trim()
    if (!text) return
    setInputText('')
    if (mode === 'chat') {
      handleAIChat(text)
    } else {
      handleFreeTextSearch(text)
    }
  }

  // Voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      const chunks: BlobPart[] = []

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data)
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        // For now, we can't do speech-to-text client-side easily
        // Show a message that voice input was captured
        setMode('chat')
        setChatMessages(prev => [...prev, {
          role: 'user',
          text: '🎤 [הודעה קולית — בקרוב תמלול אוטומטי]',
          timestamp: new Date(),
        }])
        setChatMessages(prev => [...prev, {
          role: 'bot',
          text: 'קיבלתי את ההקלטה! כרגע תמלול קולי בפיתוח. בינתיים, שאל אותי בטקסט ואשמח לעזור 😊',
          timestamp: new Date(),
        }])
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start()
      setIsRecording(true)
    } catch {
      alert('לא ניתן לגשת למיקרופון. אנא אשר הרשאה.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    setIsRecording(false)
  }

  // Text-to-speech
  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'he-IL'
      utterance.rate = 0.9
      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend = () => setIsSpeaking(false)
      utterance.onerror = () => setIsSpeaking(false)
      window.speechSynthesis.speak(utterance)
    }
  }

  const stopSpeaking = () => {
    window.speechSynthesis.cancel()
    setIsSpeaking(false)
  }

  return (
    <>
      <div className={styles.fabWrap}>
        {showTooltip && !isOpen && (
          <div className={styles.tooltip}>
            <span className={styles.wave}>👋</span>
            <span>יש לך שאלה? אני כאן!</span>
          </div>
        )}
        <button
          className={styles.floatBtn}
          onClick={() => setIsOpen(o => !o)}
          aria-label="פתח בוט שאלות ותשובות"
        >
          {isOpen ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          )}
        </button>
      </div>

      {isOpen && (
        <div className={styles.panel}>
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <span className={styles.botAvatar}>🤖</span>
              <div>
                <div className={styles.botName}>Silver Castle Bot</div>
                <div className={styles.botStatus}>
                  {mode === 'chat' ? '💬 מצב AI — שאל מה שתרצה' : 'מענה על שאלות פינוי בינוי'}
                </div>
              </div>
            </div>
            <button className={styles.closeBtn} onClick={() => setIsOpen(false)} aria-label="סגור">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className={styles.messages} ref={messagesRef}>
            {mode === 'topics' && (
              <div>
                <div className={styles.botMessage}>
                  <p>שלום! אני כאן לענות על שאלות בנושא פינוי בינוי 🏗️</p>
                  <p>בחר נושא, או שאל אותי חופשי:</p>
                </div>
                <div className={styles.chips}>
                  {FAQ_DATA.map(topic => (
                    <button key={topic.id} className={styles.chip} onClick={() => goToQuestions(topic)}>
                      <span>{topic.icon}</span><span>{topic.topic}</span>
                    </button>
                  ))}
                  <button className={styles.chip} onClick={() => setMode('chat')} style={{ borderColor: '#7c3aed', color: '#7c3aed' }}>
                    <span>🤖</span><span>שאל את ה-AI</span>
                  </button>
                </div>
              </div>
            )}

            {mode === 'questions' && selectedTopic && (
              <div>
                <button className={styles.backBtn} onClick={goToTopics}>← חזרה לתפריט</button>
                <div className={styles.botMessage}>
                  <strong>{selectedTopic.icon} {selectedTopic.topic}</strong>
                  <p>בחר שאלה:</p>
                </div>
                <div className={styles.questionList}>
                  {selectedTopic.questions.map(q => (
                    <button key={q.id} className={styles.questionBtn} onClick={() => goToAnswer(q)}>
                      {q.q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {mode === 'answer' && selectedQuestion && (
              <div>
                <button className={styles.backBtn} onClick={() => selectedTopic ? goToQuestions(selectedTopic) : goToTopics()}>
                  ← חזרה לנושא
                </button>
                <div className={styles.botMessage}>
                  <strong className={styles.questionTitle}>{selectedQuestion.q}</strong>
                  <p className={styles.answerText}>{selectedQuestion.a}</p>
                </div>
                <div className={styles.afterAnswer}>
                  {/* Speaker button */}
                  <button
                    className={styles.speakerBtn}
                    onClick={() => isSpeaking ? stopSpeaking() : speakText(selectedQuestion.a)}
                    title={isSpeaking ? 'עצור השמעה' : 'השמע תשובה'}
                  >
                    {isSpeaking ? '🔇 עצור' : '🔊 השמע'}
                  </button>
                  <p className={styles.moreHelp}>יש לך שאלות נוספות?</p>
                  <div className={styles.chips}>
                    <button className={styles.chip} onClick={goToTopics}>🏠 תפריט ראשי</button>
                    <button className={styles.chip} onClick={() => setMode('chat')} style={{ borderColor: '#7c3aed', color: '#7c3aed' }}>
                      🤖 שאל את ה-AI
                    </button>
                  </div>
                </div>
              </div>
            )}

            {mode === 'chat' && (
              <div>
                <button className={styles.backBtn} onClick={goToTopics}>← חזרה לתפריט</button>
                {chatMessages.length === 0 && (
                  <div className={styles.botMessage}>
                    <p>💬 אני כאן לעזור! שאל אותי כל שאלה בנושא פינוי בינוי.</p>
                    <p style={{ fontSize: '0.8rem', color: '#64748b' }}>אני עונה בשפה פשוטה, בלי מונחים מסובכים.</p>
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} className={msg.role === 'user' ? styles.userMessage : styles.botMessage}>
                    <p>{msg.text}</p>
                    {msg.role === 'bot' && (
                      <button
                        className={styles.speakerBtnSmall}
                        onClick={() => isSpeaking ? stopSpeaking() : speakText(msg.text)}
                        title="השמע"
                      >
                        {isSpeaking ? '🔇' : '🔊'}
                      </button>
                    )}
                  </div>
                ))}
                {isAiLoading && (
                  <div className={styles.botMessage}>
                    <div className={styles.typingIndicator}>
                      <span /><span /><span />
                    </div>
                  </div>
                )}
              </div>
            )}

            {mode === 'notFound' && (
              <div>
                <button className={styles.backBtn} onClick={goToTopics}>← חזרה לתפריט</button>
                <div className={styles.botMessage}>
                  <p>לא מצאתי תשובה. רוצה לשלוח שאלה?</p>
                </div>
                {!submitted ? (
                  <div className={styles.submitForm}>
                    <input
                      className={styles.emailInput}
                      type="email"
                      placeholder="אימייל (אופציונלי)"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      dir="ltr"
                    />
                    <button className={styles.submitBtn} onClick={() => setSubmitted(true)}>שלח ✉️</button>
                  </div>
                ) : (
                  <div className={styles.botMessage}><p>✅ תודה! נחזור אליך בהקדם.</p></div>
                )}
              </div>
            )}
          </div>

          <div className={styles.inputArea}>
            {/* Microphone button */}
            <button
              className={`${styles.micBtn} ${isRecording ? styles.micRecording : ''}`}
              onClick={isRecording ? stopRecording : startRecording}
              title={isRecording ? 'עצור הקלטה' : 'הקלט שאלה'}
            >
              {isRecording ? '⏹️' : '🎤'}
            </button>
            <input
              className={styles.textInput}
              type="text"
              placeholder={mode === 'chat' ? 'שאל את ה-AI...' : 'חפש שאלה חופשית...'}
              dir="rtl"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSend() }}
            />
            <button className={styles.sendBtn} onClick={handleSend}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  )
}
