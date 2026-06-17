import { FIRESTORE_MAX_OPERATIONS } from '#/constants/firebase'
import type { Firestore } from 'firebase/firestore'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import type { Recipient, Template } from './interfaces'

// Utility function to chunk arrays
function chunks<T>(array: T[], size: number): T[][] {
  const result: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size))
  }
  return result
}

export interface TemplateService {
  update: (id: string, data: Pick<Template, 'message'>) => Promise<void>
  addRecipient: (
    id: string,
    ...data: [Recipient, ...Recipient[]]
  ) => Promise<string[]>
  updateRecipient: (
    id: string,
    recipientId: string,
    data: Partial<Recipient>,
  ) => Promise<void>
  deleteRecipient: (id: string, recipientId: string) => Promise<void>
}

export class TemplateServiceImpl implements TemplateService {
  constructor(private db: Firestore) {}

  async update(id: string, data: Pick<Template, 'message'>) {
    const docRef = doc(this.db, 'labs/whatsapp-template/templates', id)
    return updateDoc(
      docRef,
      ...(Object.entries(data).flat() as [string, unknown, ...unknown[]]),
    )
  }

  async addRecipient(
    id: string,
    ...[one, ...data]: [Recipient, ...Recipient[]]
  ): Promise<string[]> {
    const root = collection(
      this.db,
      'labs/whatsapp-template/templates',
      id,
      'recipients',
    )

    if (data.length) {
      const chunksIds = await Promise.all(
        chunks([one].concat(data), FIRESTORE_MAX_OPERATIONS).map(
          async (chunk) => {
            const batch = writeBatch(this.db)
            const chunkIds = chunk.map((d) => {
              const docRef = doc(root)
              batch.set(docRef, d)
              return docRef.path
            })
            await batch.commit()
            return chunkIds
          },
        ),
      )

      return chunksIds.flat()
    }

    const result = await addDoc(root, one)
    return [result.path]
  }

  async updateRecipient(
    id: string,
    recipientId: string,
    data: Partial<Recipient>,
  ) {
    const root = doc(
      this.db,
      'labs/whatsapp-template/templates',
      id,
      'recipients',
      recipientId,
    )
    const updates = Object.entries(data).flat() as [
      string,
      unknown,
      ...unknown[],
    ]
    if (updates.length === 0) return
    await updateDoc(root, ...updates)
  }

  async deleteRecipient(id: string, recipientId: string) {
    const root = doc(
      this.db,
      'labs/whatsapp-template/templates',
      id,
      'recipients',
      recipientId,
    )
    return deleteDoc(root)
  }
}

// Singleton instance
let serviceInstance: TemplateServiceImpl | null = null

export function getTemplateService(db: Firestore): TemplateServiceImpl {
  if (!serviceInstance) {
    serviceInstance = new TemplateServiceImpl(db)
  }
  return serviceInstance
}
