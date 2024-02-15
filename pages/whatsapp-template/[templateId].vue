<script lang="ts" setup>
import type { Input } from 'valibot';
import { collection } from 'firebase/firestore';
import { OnClickOutside } from '@vueuse/components';
import type { FormSubmitEvent } from '#ui/types';
import { RecipientSchema } from '~/modules/template/schemas';
import { buildWhatsAppLink } from '~/modules/template/utils';
import type { InTemplate } from '~/modules/template/interfaces';
import useTemplateStore from '~/stores/template';
import { useLoading } from '~/composables/useLoading';

const store = useTemplateStore();

if (!store.template) throw createError({ statusCode: 404 });

const columns = [
  {
    key: 'number',
    label: '#',
  },
  {
    key: 'name',
    label: 'Name',
  },
  {
    key: 'contactNumber',
    label: 'Contact Number',
  },
  {
    key: 'id',
    label: 'Actions',
  },
];

const recipientsRoot = computed(() => (store.ref ? collection(store.ref, 'recipients') : null));
const recipients = useCollection(recipientsRoot);
const rows = computed(() => recipients.value.map((recipient, index) => ({
  ...recipient,
  number: index + 1,
  id: recipient.id,
})));

const { isLoading, loading } = useLoading();

const templateFields = reactive({
  message: store.template.message,
});

const recipientFields = reactive({
  name: '',
  contactNumber: '',
});

const onTemplateSubmit = (ev: FormSubmitEvent<Pick<InTemplate, 'message'>>) => {
  loading(store.update(ev.data));
};

const onRecipientSubmit = (ev: FormSubmitEvent<Input<typeof RecipientSchema>>) => {
  loading(store.addRecipient(ev.data));
};
</script>

<template>
  <div class="flex flex-col">
    <h1 class="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
      {{ store.template?.title }}
    </h1>

    <div class="flex flex-col">
      <div class="flex gap-6">
        <u-form
          :state="templateFields"
          class="grow"
          @submit="onTemplateSubmit"
        >
          <u-form-group
            label="Message Template"
            name="message"
          >
            <u-textarea
              v-model="templateFields.message"
              :rows="5"
            />
          </u-form-group>

          <u-button
            type="submit"
            icon="i-heroicons-check"
            :loading="isLoading"
          >
            Save
          </u-button>
        </u-form>

        <u-form
          :state="recipientFields"
          :schema="RecipientSchema"
          class="grow max-w-lg"
          @submit="onRecipientSubmit"
        >
          <u-form-group
            label="Name"
            name="name"
          >
            <u-input v-model="recipientFields.name" />
          </u-form-group>

          <u-form-group
            label="Contact Number"
            name="contactNumber"
          >
            <u-input
              v-model="recipientFields.contactNumber"
              type="tel"
            />
          </u-form-group>

          <u-button
            type="submit"
            icon="i-heroicons-plus"
            :loading="isLoading"
          >
            Add Recipient
          </u-button>
        </u-form>
      </div>

      <u-table
        :columns="columns"
        :rows="rows"
      >
        <template #contactNumber-data="{row}">
          <define-state
            :val="false"
            #="{state: showContact, setState}"
          >
            <on-click-outside @trigger="setState(false)">
              <div class="flex items-center gap-2">
                <div>
                  {{ [
                    row.contactNumber.slice(0, 3),
                    showContact ? row.contactNumber.slice(3, 6) : '***',
                    row.contactNumber.slice(6),
                  ].join('-') }}
                </div>
                <u-button
                  :icon="showContact ? 'i-heroicons-eye-slash':'i-heroicons-eye'"
                  variant="ghost"
                  square
                  dynamic
                  @click="setState(!showContact)"
                />
              </div>
            </on-click-outside>
          </define-state>
        </template>

        <template #id-data="{row}">
          <div class="flex gap-4">
            <u-button
              icon="i-mdi-whatsapp"
              :to="buildWhatsAppLink(row.contactNumber, store.template!.message, {...row.labels, name: row.name})"
              target="_blank"
            >
              Send
            </u-button>
          </div>
        </template>
      </u-table>
    </div>
  </div>
</template>
