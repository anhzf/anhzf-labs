import type { Firestore } from 'firebase/firestore';
import {
  addDoc, collection, deleteDoc, doc, updateDoc, writeBatch,
} from 'firebase/firestore';
import type { InRecipient, InTemplate, TemplateService } from './interfaces';
import { FIRESTORE_MAX_OPERATIONS } from '~/lib/constants';

export default class TemplateServiceImpl implements TemplateService {
  constructor(
    private db: Firestore,
  ) { }

  async update(id: string, data: Pick<InTemplate, 'message'>) {
    const docRef = doc(this.db, 'labs/whatsapp-template/templates', id);
    return updateDoc(docRef, ...Object.entries(data).flat() as [string, unknown, ...unknown[]]);
  }

  async addRecipient(id: string, ...[one, ...data]: [InRecipient, ...InRecipient[]]): Promise<string[]> {
    const root = collection(this.db, 'labs/whatsapp-template/templates', id, 'recipients');
    if (data.length) {
      const chunksIds = await Promise.all(chunks(data, FIRESTORE_MAX_OPERATIONS)
        .map(async (chunk) => {
          const batch = writeBatch(this.db);
          const chunkIds = chunk.map((d) => {
            const docRef = doc(root);
            batch.set(docRef, d);
            return docRef.path;
          });
          await batch.commit();
          return chunkIds;
        }));

      return chunksIds.flat();
    }
    const result = await addDoc(root, one);
    return [result.path];
  }

  async updateRecipient(id: string, recipientId: string, data: Partial<InRecipient>) {
    const root = doc(this.db, 'labs/whatsapp-template/templates', id, 'recipients', recipientId);
    const updates = Object.entries(data).flat() as [string, unknown, ...unknown[]];
    if (updates.length === 0) return;
    await updateDoc(root, ...updates);
  }

  async deleteRecipient(id: string, recipientId: string) {
    const root = doc(this.db, 'labs/whatsapp-template/templates', id, 'recipients', recipientId);
    return deleteDoc(root);
  }
}
