<script lang="ts" setup>
import { camelCase } from 'change-case';
import type { FormSubmitEvent } from '#ui/types';
import type { InRecipient } from '~/modules/template/interfaces';
import { RecipientSchema } from '~/modules/template/schemas';
import useTemplateStore from '~/stores/template';

interface Props {
  /** If undefined then it's a new recipient */
  id?: string;
  value?: InRecipient;
  title?: string;
}

interface Emits {
  (event: 'finish'): void;
}

const props = withDefaults(defineProps<Props>(), {
  value: () => ({
    name: '',
  }),
  id: undefined,
  title: undefined,
});
const emit = defineEmits<Emits>();

const store = useTemplateStore();

const fields = ref(props.value);

const toast = useToast();
const [isLoading, loading] = useLoading();

const onSubmit = async (ev: FormSubmitEvent<InRecipient>) => {
  try {
    if (props.id) await loading(store.updateRecipient(props.id, ev.data));
    else await loading(store.addRecipient(ev.data));

    toast.add({ title: props.id ? 'Recipient updated' : 'Recipient added' });
  } finally {
    emit('finish');
  }
};
</script>

<template>
  <u-form
    :state="fields"
    :schema="RecipientSchema"
    @submit="onSubmit"
  >
    <u-card class="max-w-lg">
      <template #header>
        {{ props.title || `${id ? 'Edit' : 'Add'} Recipient` }}
      </template>

      <div class="space-y-2">
        <u-form-group
          label="Person Name or Group Name"
          name="name"
          required
        >
          <u-input v-model="fields.name" />
        </u-form-group>

        <u-form-group
          label="Contact Number"
          name="contactNumber"
        >
          <u-input
            v-model="fields.contactNumber"
            type="tel"
            placeholder="Required for person"
          />
        </u-form-group>

        <u-form-group
          v-for="(v, k, i) in {...fields.labels, '': ''}"
          :key="i"
          :label="`Label ${i + 1}`"
          :name="camelCase(`label ${i + 1}`)"
          required
        >
          <div class="flex gap-2">
            <u-input
              :model-value="k"
              :model-modifiers="{lazy: true}"
              :placeholder="`Key of Label ${i + 1}`"
              class="grow"
              @update:model-value="fields.labels = { ...fields.labels, [$event]: v }"
            />
            <u-input
              :model-value="v"
              :placeholder="`Value of Label ${i + 1}`"
              class="grow"
              :disabled="!k"
              @update:model-value="fields.labels = { ...fields.labels, [k]: $event }"
            />
          </div>
        </u-form-group>
      </div>

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
