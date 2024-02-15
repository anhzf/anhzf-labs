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
  const template = useDocument(templateRef, { reset: true, once: true });

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

  const addRecipient = (payload: InRecipient) => {
    if (!currentId.value) throw createError({ cause: ['client'], statusCode: 400 });
    const s = ensureService();
    const validated = ValidateTemplate.createRecipient(payload);
    return s.addRecipient(currentId.value, validated);
  };

  return {
    template,
    ref: templateRef,
    update,
    addRecipient,
    ensureTemplate,
  };
});

export default useTemplateStore;
