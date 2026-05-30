import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react'

import { useAuth } from './context/AuthContext'
import type { Expense, ExpenseInput, ExpenseUpdateInput } from './types'
import {
  createExpenseOnServer,
  deleteExpenseOnServer,
  EXPENSES_CACHE_KEY,
  EXPENSES_QUEUE_KEY,
  fetchAllExpenses,
  getWebSocketUrl,
  isBrowserOnline,
  mergeExpensesById,
  optimizeQueue,
  parseFakerExpensesMessage,
  readLocalJson,
  type QueuedExpenseAction,
  updateExpenseOnServer,
  writeLocalJson,
} from './utils/expenseSync'
import { validateExpense } from './validation'

const isTestRuntime = (): boolean => typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'test'

interface ExpensesContextValue {
  expenses: Expense[]
  isOnline: boolean
  isSyncing: boolean
  pendingActions: number
  addExpense: (expense: ExpenseInput) => Expense
  updateExpense: (id: string, updates: ExpenseUpdateInput) => Expense | null
  deleteExpense: (id: string) => boolean
  getExpenseById: (id: string) => Expense | undefined
  clearExpenses: () => void
}

const ExpensesContext = createContext<ExpensesContextValue | null>(null)

const createExpenseId = (): string =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

const remapQueuedActionId = (
  action: QueuedExpenseAction,
  sourceId: string,
  targetId: string,
): QueuedExpenseAction => {
  if (action.type === 'delete') {
    return action.id === sourceId ? { ...action, id: targetId } : action
  }

  if (action.expense.id !== sourceId) {
    return action
  }

  return {
    ...action,
    expense: {
      ...action.expense,
      id: targetId,
    },
  }
}

export function ExpensesProvider({ children }: PropsWithChildren) {
  const { user } = useAuth()
  const [expenses, setExpenses] = useState<Expense[]>(() =>
    readLocalJson<Expense[]>(EXPENSES_CACHE_KEY, []),
  )
  const [pendingQueue, setPendingQueue] = useState<QueuedExpenseAction[]>(() =>
    readLocalJson<QueuedExpenseAction[]>(EXPENSES_QUEUE_KEY, []),
  )
  const [isOnline, setIsOnline] = useState<boolean>(() => isBrowserOnline())
  const [isSyncing, setIsSyncing] = useState(false)

  const expensesRef = useRef(expenses)
  const queueRef = useRef(pendingQueue)
  const isOnlineRef = useRef(isOnline)
  const isSyncingRef = useRef(false)
  const userRef = useRef(user)

  useEffect(() => {
    expensesRef.current = expenses
    writeLocalJson(EXPENSES_CACHE_KEY, expenses)
  }, [expenses])

  useEffect(() => {
    queueRef.current = pendingQueue
    writeLocalJson(EXPENSES_QUEUE_KEY, pendingQueue)
  }, [pendingQueue])

  useEffect(() => {
    isOnlineRef.current = isOnline
  }, [isOnline])

  useEffect(() => {
    userRef.current = user
  }, [user])

  const enqueueAction = useCallback((action: QueuedExpenseAction) => {
    setPendingQueue((currentQueue) => {
      const nextQueue = optimizeQueue(currentQueue, action)
      queueRef.current = nextQueue
      return nextQueue
    })
  }, [])

  const flushQueue = useCallback(async () => {
    if (isSyncingRef.current || queueRef.current.length === 0) {
      return
    }

    isSyncingRef.current = true
    setIsSyncing(true)

    try {
      let workingQueue = queueRef.current

      while (queueRef.current.length > 0) {
        const action = workingQueue[0]
        const userId = userRef.current?.id

        try {
          if (action.type === 'create') {
            const createdOnServer = await createExpenseOnServer(action.expense, userId)

            setExpenses((currentExpenses) =>
              currentExpenses.map((expense) =>
                expense.id === action.expense.id ? createdOnServer : expense,
              ),
            )

            const remaining = workingQueue
              .slice(1)
              .map((queuedAction) =>
                remapQueuedActionId(queuedAction, action.expense.id, createdOnServer.id),
              )

            workingQueue = remaining
            queueRef.current = remaining
            setPendingQueue(remaining)

            continue
          }

          if (action.type === 'update') {
            await updateExpenseOnServer(action.expense, userId)
          } else {
            await deleteExpenseOnServer(action.id, userId)
          }

          const remaining = workingQueue.slice(1)
          workingQueue = remaining
          queueRef.current = remaining
          setPendingQueue(remaining)
        } catch {
          break
        }
      }
    } finally {
      isSyncingRef.current = false
      setIsSyncing(false)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const handleOnline = () => {
      setIsOnline(true)
    }

    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [flushQueue])

  useEffect(() => {
    if (!isOnline) {
      return
    }

    const flushTimer = window.setTimeout(() => {
      void flushQueue()
    }, 0)

    if (pendingQueue.length > 0) {
      return () => window.clearTimeout(flushTimer)
    }

    if (isTestRuntime()) {
      return () => window.clearTimeout(flushTimer)
    }

    let isMounted = true

    const loadExpenses = async () => {
      try {
        const userId = userRef.current?.id
        const serverExpenses = await fetchAllExpenses(userId)

        if (!isMounted) {
          return
        }

        setExpenses((currentExpenses) =>
          currentExpenses.length === 0 ? serverExpenses : mergeExpensesById(currentExpenses, serverExpenses),
        )
      } catch {
        // Keep local state when network fetch fails.
      }
    }

    void loadExpenses()

    return () => {
      isMounted = false
      window.clearTimeout(flushTimer)
    }
  }, [isOnline, pendingQueue.length, flushQueue])

  useEffect(() => {
    if (!isOnline || typeof WebSocket === 'undefined') {
      return
    }

    const socket = new WebSocket(getWebSocketUrl())

    socket.onmessage = (event: MessageEvent) => {
      const rawData = typeof event.data === 'string' ? event.data : ''
      const incomingExpenses = parseFakerExpensesMessage(rawData)

      if (incomingExpenses.length === 0) {
        return
      }

      setExpenses((currentExpenses) => mergeExpensesById(currentExpenses, incomingExpenses))
    }

    socket.onerror = () => {
      // Keep the app resilient if ws backend is unavailable.
    }

    return () => {
      socket.close()
    }
  }, [isOnline])

  const addExpense = useCallback((expenseInput: ExpenseInput): Expense => {
    const validation = validateExpense(expenseInput)

    if (!validation.isValid) {
      throw new Error(validation.errors.join(' '))
    }

    const createdExpense: Expense = {
      ...expenseInput,
      id: createExpenseId(),
    }

    setExpenses((currentExpenses) => [...currentExpenses, createdExpense])
    enqueueAction({ type: 'create', expense: createdExpense })

    if (isOnlineRef.current) {
      void flushQueue()
    }

    return createdExpense
  }, [enqueueAction, flushQueue])

  const updateExpense = useCallback(
    (id: string, updates: ExpenseUpdateInput): Expense | null => {
      const currentExpense = expensesRef.current.find((expense) => expense.id === id)

      if (!currentExpense) {
        return null
      }

      const nextExpense: Expense = { ...currentExpense, ...updates }
      const validation = validateExpense(nextExpense)

      if (!validation.isValid) {
        throw new Error(validation.errors.join(' '))
      }

      setExpenses((currentExpenses) =>
        currentExpenses.map((expense) => (expense.id === id ? nextExpense : expense)),
      )
      enqueueAction({ type: 'update', expense: nextExpense })

      if (isOnlineRef.current) {
        void flushQueue()
      }

      return nextExpense
    },
    [enqueueAction, flushQueue],
  )

  const deleteExpense = useCallback(
    (id: string): boolean => {
      const exists = expensesRef.current.some((expense) => expense.id === id)

      if (!exists) {
        return false
      }

      setExpenses((currentExpenses) =>
        currentExpenses.filter((expense) => expense.id !== id),
      )
      enqueueAction({ type: 'delete', id })

      if (isOnlineRef.current) {
        void flushQueue()
      }

      return true
    },
    [enqueueAction, flushQueue],
  )

  const getExpenseById = useCallback(
    (id: string): Expense | undefined => expenses.find((expense) => expense.id === id),
    [expenses],
  )

  const clearExpenses = useCallback(() => {
    setExpenses([])
    setPendingQueue([])
  }, [])

  const value = useMemo(
    () => ({
      expenses,
      isOnline,
      isSyncing,
      pendingActions: pendingQueue.length,
      addExpense,
      updateExpense,
      deleteExpense,
      getExpenseById,
      clearExpenses,
    }),
    [
      expenses,
      isOnline,
      isSyncing,
      pendingQueue.length,
      addExpense,
      updateExpense,
      deleteExpense,
      getExpenseById,
      clearExpenses,
    ],
  )

  return createElement(ExpensesContext.Provider, { value }, children)
}

export function useExpenses(): ExpensesContextValue {
  const context = useContext(ExpensesContext)

  if (!context) {
    throw new Error('useExpenses must be used within an ExpensesProvider.')
  }

  return context
}
