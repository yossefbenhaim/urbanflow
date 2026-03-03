import { useState, useRef, useEffect } from 'react'
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

const FAQ_DATA: Topic[] = [
  {
    id: '1', topic: 'יסודות', icon: '🏗️',
    questions: [
      { id: '1a', q: 'מה זה פינוי בינוי?', a: 'פינוי בינוי הוא תהליך של הריסת בניין ישן ובניית בניין חדש במקומו. הדיירים הקיימים מפנים את דירותיהם באופן זמני ומקבלים דירות חדשות, גדולות יותר, בבניין החדש. התהליך מאפשר ניצול יעיל יותר של הקרקע, שדרוג תשתיות ישנות ושיפור איכות החיים. בישראל מוסדר הנושא בחוק התחדשות עירונית ומפוקח על ידי הרשות הממשלתית להתחדשות עירונית.' },
      { id: '1b', q: 'מה ההבדל בין מסלול מיסוי למסלול רשויות?', a: 'במסלול מיסוי (ביוזמה פרטית) — יזם פרטי יוזם את הפרויקט, מקדם אותו מול הוועדה המחוזית ומממן אותו עצמאית. במסלול רשויות — המדינה או הרשות המקומית מכריזה על אזור כ"מתחם פינוי בינוי" ומקדמת את הפרויקט בצורה מרוכזת, לרוב עם הטבות מס נוספות.' },
      { id: '1c', q: 'כמה זמן לוקח תהליך פינוי בינוי?', a: 'תהליך פינוי בינוי בישראל נמשך בדרך כלל בין 7 ל-15 שנים מרגע הרצון הראשוני ועד קבלת המפתח. קידום תוכניות מול הוועדות (2-4 שנים), קבלת היתר בנייה (1-3 שנים), ובנייה בפועל (3-5 שנים). ממשלת ישראל פועלת להאצת התהליכים אך הביורוקרטיה עדיין מאטה.' },
      { id: '1d', q: 'מה זה תמ"א 38?', a: 'תמ"א 38 היא תכנית מתאר ארצית לחיזוק מבנים מפני רעידות אדמה. נחקקה ב-2005 ובוטלה ב-2024 לאחר כמעט 20 שנה. התכנית אפשרה ליזמים לחזק בניינים ישנים ובתמורה לקבל זכויות בנייה. היו שני מסלולים: 38/1 (חיזוק + תוספות) ו-38/2 (הריסה ובנייה מחדש). פרויקטים שהחלו לפני הביטול ממשיכים.' },
    ]
  },
  {
    id: '2', topic: 'התהליך', icon: '📋',
    questions: [
      { id: '2a', q: 'מאיפה מתחילים?', a: 'השלב הראשון הוא ארגון הדיירים — לרוב נציג דיירים פעיל או גורם מלווה מתחיל לאסוף עניין. לאחר מכן: 1) בחירת עורך דין לדיירים, 2) איסוף חתימות (נדרש 66% לפחות), 3) פרסום מכרז בין יזמים, 4) בחירת יזם, 5) חתימת חוזה, 6) הגשת תוכניות, 7) היתר בנייה, 8) פינוי ובנייה, 9) מסירה.' },
      { id: '2b', q: 'כמה הסכמה צריך מהדיירים?', a: 'לפי חוק התחדשות עירונית, נדרש רוב של 66% מבעלי הדירות לצורך קידום הפרויקט. לאחר שמגיעים ל-66%, ניתן בתנאים מסוימים לכפות על ה-34% הנותרים להצטרף (דרך בית משפט, בכפוף לתנאים מחמירים). ברוב המקרים מנסים להגיע לקונצנזוס של 80-100%.' },
      { id: '2c', q: 'מה תפקיד מנהלת ההתחדשות העירונית?', a: 'המנהלת היא גוף מקצועי ניטרלי שמסייע לדיירים בתהליך — ללא עלות לדיירים (משולם על ידי היזם או הרשות). תפקידה: ליווי משפטי, הנחיה בבחירת יזם, ניהול פגישות, תיאום בין הגורמים ופיקוח על קיום ההתחייבויות. בחלק מהרשויות המקומיות יש מנהלת עירונית.' },
    ]
  },
  {
    id: '3', topic: 'מה מקבלים', icon: '💰',
    questions: [
      { id: '3a', q: 'מה מקבל הדייר בתמורה?', a: 'הדייר מקבל: (1) דירה חדשה גדולה יותר מהדירה הנוכחית (12-25% יותר שטח בממוצע), (2) מרפסת, חניה, ממ"ד ומחסן, (3) דיור חלופי + תשלום שכירות מלא בזמן הבנייה, (4) כיסוי הוצאות מעבר (לוגיסטיקה, אחסון), (5) כיסוי הוצאות משפטיות, (6) ערבויות בנקאיות. כל אלה ללא תשלום מהדייר.' },
      { id: '3b', q: 'כמה גדולה תהיה הדירה החדשה?', a: 'בממוצע הדיירים מקבלים דירה גדולה ב-12-25% מהדירה הנוכחית. למשל, דירת 70 מ"ר הופכת ל-85-90 מ"ר. הגודל המדויק תלוי בחוזה ובזכויות הבנייה. חשוב לוודא שהחוזה מגדיר במפורש את השטח הבטוח, ולא רק "שטח בנוי".' },
      { id: '3c', q: 'מי משלם על השכירות הזמנית?', a: 'היזם מחויב לשלם את דמי השכירות הזמנית עבור הדיירים בזמן הבנייה. היזם משלם שכירות בשוק (לפי מדד שכר דירה עדכני), עלויות מעבר כפולות (מהדירה ולחזרה), ולרוב גם "תשלום הסתגלות" חד-פעמי. אין הוצאה מכיס הדייר.' },
      { id: '3d', q: 'האם ניתן לקבל כסף במקום דירה?', a: 'לרוב לא — החוק מאפשר ליזם לתת דירה חדשה, לא כסף. עם זאת, לדיירים מבוגרים (מעל גיל מסוים, לפי חוק הקשיש) יש אפשרות לבחור בין דירה חדשה, דירה חלופית מוכנה, או פיצוי כספי. בנוסף, בחלק מהחוזים ניתן לסכם על תוספת כספית מעבר לדירה.' },
    ]
  },
  {
    id: '4', topic: 'זכויות וחובות', icon: '⚖️',
    questions: [
      { id: '4a', q: 'מה הזכויות שלי כדייר?', a: 'זכויותיך כדייר: (1) ייצוג משפטי על חשבון היזם, (2) לקבל מידע מלא ושקוף על הפרויקט, (3) להצביע ולהשתתף בהחלטות, (4) לבטל בתקופת הצינון, (5) לקבל ערבויות בנקאיות, (6) לקבל דיור חלופי ראוי, (7) לקבל פיצוי על עיכובים, (8) לפנות לגורמי בקרה ואכיפה.' },
      { id: '4b', q: 'מה זה דייר סרבן?', a: 'דייר סרבן הוא דייר שמסרב לחתום על הסכם פינוי בינוי אחרי שרוב מוחלט של הדיירים הסכים. לפי חוק, כאשר 66-75%+ הסכימו, ניתן בנסיבות מסוימות להגיש תביעה נגד הדייר הסרבן לבית המשפט. אין כפייה פיזית, אך הדייר עלול לשאת בנזקים כלכליים אם בית המשפט פסק לטובת הפרויקט.' },
      { id: '4c', q: 'מה קורה לי אם אני מעל גיל 70?', a: 'חוק הקשיש מעניק הגנות מיוחדות: (1) שמאי מוקדם חובה להערכת שווי הנכס הנוכחי, (2) אפשרות לבחור בין 3 חלופות: דירה חדשה / דירה חלופית מוכנה (לא צריך לחכות לבנייה) / פיצוי כספי, (3) דרישות מיוחדות לדיור חלופי בזמן הבנייה (מיקום, נגישות), (4) הגנה מפני כפייה.' },
    ]
  },
  {
    id: '5', topic: 'ערבויות', icon: '🔐',
    questions: [
      { id: '5a', q: 'מה הערבויות שהיזם חייב לתת?', a: 'לפי חוק המכר (דירות), היזם חייב להעמיד: (1) ערבות בנקאית חוק מכר — מבטיחה החזר כספי אם הפרויקט לא יושלם, (2) ערבות שכירות — מכסה שכ"ד זמני לכל תקופת הבנייה, (3) ערבות מיסים — מכסה תשלומי מס שבח ורכישה, (4) ערבות גמר — מבטיחה רישום הדירה ע"ש הדייר, (5) ביטוח מבנה בזמן הבנייה.' },
      { id: '5b', q: 'מה קורה אם היזם פושט רגל?', a: 'הערבויות הבנקאיות קיימות בדיוק לתרחיש הזה. אם היזם פשט רגל: (1) ניתן לממש את ערבות חוק המכר ולקבל פיצוי כספי, (2) בנק מלווה (אם קיים) ממשיך לנהל את הפרויקט, (3) ניתן למנות כונס נכסים לסיום הפרויקט. לכן חשוב לוודא שהעורך דין בדק את כל הערבויות לפני החתימה.' },
    ]
  },
  {
    id: '6', topic: 'מה אם...', icon: '🔄',
    questions: [
      { id: '6a', q: 'האם אני יכול להתחרט אחרי שחתמתי?', a: 'יש "תקופת צינון" של 7 ימים ממועד החתימה על הסכם ראשוני (לפי חוק). לאחר מכן, ביטול אפשרי אך מסובך ועלול לגרור פיצויים ליזם. ישנם מקרים בהם בית המשפט יאשר ביטול (שינוי נסיבות מהותי, הפרת חוזה ע"י היזם, הטעיה). מומלץ להתייעץ עם עורך דין לפני כל החלטה.' },
      { id: '6b', q: 'מה קורה במקרה של ירושה או גירושין?', a: 'במקרה ירושה — היורשים נכנסים לנעלי המוריש ומקבלים את זכויותיו בפרויקט. נדרש עדכון רישום בחוזה. במקרה גירושין — נדרש הסכם בין בני הזוג על חלוקת הזכויות בדירה החדשה, ולרוב שניהם צריכים לחתום על מסמכי הפרויקט.' },
      { id: '6c', q: 'יש לי חנות / נכס מסחרי — מה קורה?', a: 'בעלי נכסים מסחריים זכאים לפיצוי מיוחד שכולל: דירה/נכס חדש במקום הישן (לפי תוכנית), פיצוי על הפסד הכנסה בזמן הבנייה, כיסוי עלויות הובלה ואחסון, ולעיתים פיצוי על אובדן לקוחות. חשוב לוודא שהחוזה מתייחס ספציפית לנכס המסחרי.' },
      { id: '6d', q: 'אני גר בחו"ל — האם אני חייב להגיע?', a: 'לא חייב להגיע פיזית. ניתן לייפות כוח לנציג בישראל (עורך דין, בן משפחה) שיפעל בשמך. חתימות על מסמכים יכולות להיות מרחוק עם אפוסטיל, ניתן לנהל את כל ההתכתבות ב-email. חשוב להיות מחובר ולעדכן כתובת תקינה לקבלת מסמכים חשובים.' },
    ]
  },
  {
    id: '7', topic: 'הגורמים', icon: '🤝',
    questions: [
      { id: '7a', q: 'מי הגורמים המעורבים בפרויקט?', a: 'הגורמים המרכזיים בפרויקט פינוי בינוי: (1) דיירים/בעלי נכסים, (2) נציגות הדיירים, (3) עורך דין הדיירים, (4) שמאי מוסכם, (5) יזם/קבלן, (6) מנהלת/גורם מלווה, (7) ועדה מחוזית, (8) רשות מקומית, (9) בנק מלווה, (10) אדריכל ומהנדס.' },
      { id: '7b', q: 'מה תפקיד עורך דין הדיירים?', a: 'עורך הדין של הדיירים הוא אחד הגורמים החשובים ביותר — והיזם משלם את שכר טרחתו. תפקידיו: ניסוח וסקירת החוזה, בדיקת הערבויות, ייצוג הדיירים מול היזם, ייעוץ בהחלטות חשובות, פיקוח על עמידה בהתחייבויות, וטיפול בסכסוכים. חשוב שיהיה עצמאי ולא קשור ליזם.' },
      { id: '7c', q: 'מה תפקיד השמאי?', a: 'השמאי מעריך את שווי הדירות הקיימות וכדאיות הפרויקט. תפקידיו: הערכת שווי נכס נוכחי, בדיקת כדאיות כלכלית, הערכת הדירות החדשות, ובמקרה של דייר קשיש — שמאות מקדימה חובה. חשוב שהשמאי יהיה מוסמך ובלתי תלוי.' },
      { id: '7d', q: 'מי בוחר את היזם?', a: 'הדיירים (דרך נציגותם ועורך הדין) הם שבוחרים את היזם — לא להיפך. הדרך הנכונה: פרסום מכרז בין מספר יזמים, קבלת הצעות, השוואה (ניסיון, מוניטין, הצעה כלכלית, ערבויות), ולבסוף הצבעה או קבלת החלטה בנציגות. אין להתחייב ליזם לפני שיש ייצוג משפטי מסודר.' },
    ]
  },
]

type ViewMode = 'topics' | 'questions' | 'answer' | 'notFound'

interface ChatState {
  mode: ViewMode
  selectedTopic: Topic | null
  selectedQuestion: Question | null
  freeText: string
  email: string
  submitted: boolean
}

export default function FaqBot() {
  const [isOpen, setIsOpen] = useState(false)
  const [showTooltip, setShowTooltip] = useState(true)
  useEffect(() => {
    const t = setTimeout(() => setShowTooltip(false), 3000)
    return () => clearTimeout(t)
  }, [])
  const [state, setState] = useState<ChatState>({
    mode: 'topics',
    selectedTopic: null,
    selectedQuestion: null,
    freeText: '',
    email: '',
    submitted: false,
  })
  const messagesRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight
    }
  }, [state.mode, state.selectedTopic, state.selectedQuestion])

  const goToTopics = () =>
    setState(s => ({ ...s, mode: 'topics', selectedTopic: null, selectedQuestion: null, freeText: '', submitted: false }))

  const goToQuestions = (topic: Topic) =>
    setState(s => ({ ...s, mode: 'questions', selectedTopic: topic, selectedQuestion: null }))

  const goToAnswer = (question: Question) =>
    setState(s => ({ ...s, mode: 'answer', selectedQuestion: question }))

  const handleFreeTextSearch = (text: string) => {
    const lower = text.toLowerCase()
    for (const topic of FAQ_DATA) {
      for (const q of topic.questions) {
        if (q.q.toLowerCase().includes(lower) || q.a.toLowerCase().includes(lower)) {
          setState(s => ({ ...s, mode: 'answer', selectedQuestion: q, selectedTopic: topic }))
          return
        }
      }
    }
    setState(s => ({ ...s, mode: 'notFound', freeText: text }))
  }

  const handleSubmitQuestion = () => {
    // TODO: replace with trpc.faq.submitQuestion.mutate({ question: state.freeText, email: state.email })
    console.log('Submit question:', state.freeText, 'email:', state.email)
    setState(s => ({ ...s, submitted: true }))
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
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                <div className={styles.botStatus}>מענה על שאלות פינוי בינוי</div>
              </div>
            </div>
            <button className={styles.closeBtn} onClick={() => setIsOpen(false)} aria-label="סגור">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className={styles.messages} ref={messagesRef}>
            {state.mode === 'topics' && (
              <div>
                <div className={styles.botMessage}>
                  <p>שלום! אני כאן לענות על שאלות בנושא פינוי בינוי 🏗️</p>
                  <p>בחר נושא שמעניין אותך:</p>
                </div>
                <div className={styles.chips}>
                  {FAQ_DATA.map(topic => (
                    <button
                      key={topic.id}
                      className={styles.chip}
                      onClick={() => goToQuestions(topic)}
                    >
                      <span>{topic.icon}</span>
                      <span>{topic.topic}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {state.mode === 'questions' && state.selectedTopic && (
              <div>
                <button className={styles.backBtn} onClick={goToTopics}>← חזרה לתפריט</button>
                <div className={styles.botMessage}>
                  <strong>{state.selectedTopic.icon} {state.selectedTopic.topic}</strong>
                  <p>בחר שאלה:</p>
                </div>
                <div className={styles.questionList}>
                  {state.selectedTopic.questions.map(q => (
                    <button
                      key={q.id}
                      className={styles.questionBtn}
                      onClick={() => goToAnswer(q)}
                    >
                      {q.q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {state.mode === 'answer' && state.selectedQuestion && (
              <div>
                <button
                  className={styles.backBtn}
                  onClick={() => state.selectedTopic ? goToQuestions(state.selectedTopic) : goToTopics()}
                >
                  ← חזרה לנושא
                </button>
                <div className={styles.botMessage}>
                  <strong className={styles.questionTitle}>{state.selectedQuestion.q}</strong>
                  <p className={styles.answerText}>{state.selectedQuestion.a}</p>
                </div>
                <div className={styles.afterAnswer}>
                  <p className={styles.moreHelp}>יש לך שאלות נוספות?</p>
                  <button className={styles.chip} onClick={goToTopics}>🏠 חזרה לתפריט הראשי</button>
                </div>
              </div>
            )}

            {state.mode === 'notFound' && (
              <div>
                <button className={styles.backBtn} onClick={goToTopics}>← חזרה לתפריט</button>
                <div className={styles.botMessage}>
                  <p>לא מצאתי תשובה מדויקת לשאלתך.</p>
                  <p>רוצה לשלוח לנו את השאלה?</p>
                </div>
                {!state.submitted ? (
                  <div className={styles.submitForm}>
                    <input
                      className={styles.emailInput}
                      type="email"
                      placeholder="אימייל (אופציונלי)"
                      value={state.email}
                      onChange={e => setState(s => ({ ...s, email: e.target.value }))}
                      dir="ltr"
                    />
                    <button className={styles.submitBtn} onClick={handleSubmitQuestion}>
                      שלח שאלה ✉️
                    </button>
                  </div>
                ) : (
                  <div className={styles.botMessage}>
                    <p>✅ תודה! השאלה נשלחה. נחזור אליך בהקדם.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className={styles.inputArea}>
            <input
              className={styles.textInput}
              type="text"
              placeholder="חפש שאלה חופשית..."
              dir="rtl"
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  const val = (e.target as HTMLInputElement).value.trim()
                  if (val) {
                    handleFreeTextSearch(val);
                    (e.target as HTMLInputElement).value = ''
                  }
                }
              }}
            />
            <button
              className={styles.sendBtn}
              onClick={e => {
                const input = (e.currentTarget.previousSibling as HTMLInputElement)
                const val = input.value.trim()
                if (val) {
                  handleFreeTextSearch(val)
                  input.value = ''
                }
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  )
}
