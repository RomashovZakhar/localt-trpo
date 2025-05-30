// Компонент use-toast.tsx 
import { ReactNode, createContext, useContext, useState } from "react"

import type {
  ToastActionElement,
  ToastProps,
} from "@/components/ui/toast"

const TOAST_LIMIT = 5
const TOAST_REMOVE_DELAY = 5000

type ToasterToast = ToastProps & {
  id: string
  title?: ReactNode
  description?: ReactNode
  action?: ToastActionElement
}

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_VALUE
  return count.toString()
}

type ActionType = typeof actionTypes

type Action =
  | {
      type: ActionType["ADD_TOAST"]
      toast: ToasterToast
    }
  | {
      type: ActionType["UPDATE_TOAST"]
      toast: Partial<ToasterToast>
    }
  | {
      type: ActionType["DISMISS_TOAST"]
      toastId?: ToasterToast["id"]
    }
  | {
      type: ActionType["REMOVE_TOAST"]
      toastId?: ToasterToast["id"]
    }

interface ToastContextProps {
  toasts: ToasterToast[]
  addToast: (props: Omit<ToasterToast, "id">) => string
  updateToast: (id: string, props: Partial<ToasterToast>) => void
  dismissToast: (id: string) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextProps | null>(null)

export function useToast() {
  const context = useContext(ToastContext)

  if (!context) {
    throw new Error("useToast must be used within a ToastProvider")
  }

  return {
    toasts: context.toasts,
    toast: (props: Omit<ToasterToast, "id">) => {
      const id = context.addToast(props)
      
      setTimeout(() => {
        context.dismissToast(id)
      }, props.duration || TOAST_REMOVE_DELAY)

      return id
    },
    dismiss: context.dismissToast,
    update: context.updateToast,
  }
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToasterToast[]>([])

  const addToast = (props: Omit<ToasterToast, "id">) => {
    const id = genId()
    
    setToasts((prevToasts) => {
      const newToasts = [...prevToasts]
      
      if (newToasts.length >= TOAST_LIMIT) {
        newToasts.shift()
      }
      
      newToasts.push({ id, ...props })
      return newToasts
    })
    
    return id
  }

  const updateToast = (id: string, props: Partial<ToasterToast>) => {
    setToasts((prevToasts) =>
      prevToasts.map((toast) =>
        toast.id === id ? { ...toast, ...props } : toast
      )
    )
  }

  const dismissToast = (id: string) => {
    setToasts((prevToasts) =>
      prevToasts.map((toast) =>
        toast.id === id ? { ...toast, open: false } : toast
      )
    )
    
    setTimeout(() => {
      removeToast(id)
    }, 300)
  }

  const removeToast = (id: string) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id))
  }

  return (
    <ToastContext.Provider
      value={{
        toasts,
        addToast,
        updateToast,
        dismissToast,
        removeToast,
      }}
    >
      {children}
    </ToastContext.Provider>
  )
} 