import type { TemplateService } from './interfaces';

export default class TemplateServiceImpl implements TemplateService {
  get(id: string): Promise<{ message: string; title: string; createdAt: Date; }> {
    throw new Error('Method not implemented.');
  }
  addRecipient(id: string, data: { name: string; contactNumber: string; labels: { [x: string]: string; }; }): Promise<{ name: string; contactNumber: string; labels: { [x: string]: string; }; }> {
    throw new Error('Method not implemented.');
  }
}