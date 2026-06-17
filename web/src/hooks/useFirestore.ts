import type {
  CollectionReference,
  DocumentReference,
  QueryConstraint,
} from 'firebase/firestore'
import { onSnapshot, query } from 'firebase/firestore'
import { useEffect, useState } from 'react'

/**
 * Custom hook for real-time Firestore document subscription
 */
export function useDocument<T = Record<string, any>>(
  docRef: DocumentReference | null,
) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!docRef) {
      setLoading(false)
      return
    }

    setLoading(true)
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setData({ id: snapshot.id, ...snapshot.data() } as T)
        } else {
          setData(null)
        }
        setLoading(false)
        setError(null)
      },
      (err) => {
        setError(err)
        setLoading(false)
      },
    )

    return () => unsubscribe()
  }, [docRef])

  return { data, loading, error }
}

/**
 * Custom hook for real-time Firestore collection subscription
 */
export function useCollection<T = Record<string, any>>(
  collectionRef: CollectionReference | null,
  ...queryConstraints: QueryConstraint[]
) {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!collectionRef) {
      setLoading(false)
      return
    }

    setLoading(true)
    const q = query(collectionRef, ...queryConstraints)

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() }) as T,
        )
        setData(docs)
        setLoading(false)
        setError(null)
      },
      (err) => {
        setError(err)
        setLoading(false)
      },
    )

    return () => unsubscribe()
  }, [collectionRef, ...queryConstraints])

  return { data, loading, error }
}
