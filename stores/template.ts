import { doc } from 'firebase/firestore';
import { defineStore } from 'pinia';
import type { InRecipient, InTemplate, TemplateService } from '~/modules/template/interfaces';
import TemplateServiceImpl from '~/modules/template/service';
import ValidateTemplate from '~/modules/template/validator';

const useTemplateStore = defineStore('template', () => {
  const route = useRoute();
  const router = useRouter();
  const db = useFirestore();
  const service = shallowRef<TemplateService>();

  const currentId = computed<string>({
    get: () => route.params.templateId as string,
    set: (id) => router.replace({ params: { ...route.params, templateId: id } }),
  });

  const templateRef = computed(() => (currentId.value ? doc(db, 'labs/whatsapp-template/templates', currentId.value) : null));
  const template = useDocument(templateRef, { reset: true });

  onMounted(() => {
    service.value = new TemplateServiceImpl(db);
  });

  const ensureService = () => {
    if (!service.value) throw createError({ cause: ['system'], message: 'Service not available', fatal: true });
    return service.value;
  };

  const ensureTemplate = async () => {
    await template.promise.value;

    if (!template.value) throw createError({ cause: ['client'], statusCode: 404 });
    return template.value;
  };

  const update = (payload: Pick<InTemplate, 'message'>) => {
    if (!currentId.value) throw createError({ cause: ['client'], statusCode: 400 });
    const s = ensureService();
    const validated = ValidateTemplate.update(payload);
    return s.update(currentId.value, validated);
  };

  const addRecipient = (...[one, ...payload]: [InRecipient, ...InRecipient[]]) => {
    if (!currentId.value) throw createError({ cause: ['client'], statusCode: 400 });
    const s = ensureService();

    if (payload.length) {
      const validated = payload.map((p) => ValidateTemplate.createRecipient(p));
      return s.addRecipient(currentId.value, one, ...validated);
    }

    const validated = ValidateTemplate.createRecipient(one);
    return s.addRecipient(currentId.value, validated);
  };

  const updateRecipient = (recipientId: string, payload: Partial<InRecipient>) => {
    if (!currentId.value) throw createError({ cause: ['client'], statusCode: 400 });
    const s = ensureService();
    const validated = ValidateTemplate.updateRecipient(payload);
    return s.updateRecipient(currentId.value, recipientId, validated);
  };

  const deleteRecipient = (recipientId: string) => {
    if (!currentId.value) throw createError({ cause: ['client'], statusCode: 400 });
    const s = ensureService();
    return s.deleteRecipient(currentId.value, recipientId);
  };

  return {
    template,
    ref: templateRef,
    update,
    addRecipient,
    updateRecipient,
    deleteRecipient,
    ensureTemplate,
  };
});

export default useTemplateStore;
