import { defineStore } from 'pinia';
import type { TemplateService } from '~/modules/template';
import { TemplateServiceImpl } from '~/modules/template';

const service: TemplateService = new TemplateServiceImpl();

const useTemplateStore = defineStore('template', {
  actions: {
    addRecipient: service.addRecipient.bind(service),
  },
});

export default useTemplateStore;