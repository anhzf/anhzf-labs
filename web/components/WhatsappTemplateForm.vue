<script lang="ts" setup>
import { pick } from 'valibot';
import type { FormSubmitEvent } from '#ui/types';
import type { InTemplate } from '~/modules/template/interfaces';
import { TemplateSchema } from '~/modules/template/schemas';
import useTemplateStore from '~/stores/template';

interface Emits {
  (event: 'finish'): void;
}

const emit = defineEmits<Emits>();

const schema = pick(TemplateSchema, ['message']);

const store = useTemplateStore();
await store.ensureTemplate();

const fields = reactive({
  message: store.template!.message,
});

const toast = useToast();
const [isLoading, loading] = useLoading();

const onSubmit = async (ev: FormSubmitEvent<InTemplate>) => {
  try {
    await loading(store.update(ev.data));
    toast.add({ title: 'Template updated' });
  } finally {
    emit('finish');
  }
};
</script>

<template>
  <u-form
    :state="fields"
    :schema="schema"
    @submit="onSubmit"
  >
    <u-card>
      <u-form-group
        label="Message Template"
        name="message"
        required
      >
        <u-textarea
          v-model="fields.message"
          :rows="5"
          autoresize
        />
      </u-form-group>

      <template #footer>
        <u-button
          type="submit"
          label="Save"
          :loading="isLoading"
        />
      </template>
    </u-card>
  </u-form>
</template>
